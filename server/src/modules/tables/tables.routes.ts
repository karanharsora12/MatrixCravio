import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../database/index.js';
import { diningTables, tableQrTokens, tableSessions, orders } from '../../database/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { AuthenticatedRequest } from '../../shared/types.js';
import crypto from 'crypto';

export const tablesRouter = Router();

// GET /api/tables
tablesRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ success: false, message: 'Restaurant ID required' });
      return;
    }

    const tables = await db
      .select()
      .from(diningTables)
      .where(and(eq(diningTables.restaurantId, restaurantId), eq(diningTables.isActive, true)))
      .orderBy(diningTables.tableNumber);

    // Fetch active QR token and active session for each table
    const result = await Promise.all(
      tables.map(async (table) => {
        const [qr] = await db
          .select()
          .from(tableQrTokens)
          .where(and(eq(tableQrTokens.tableId, table.id), eq(tableQrTokens.isRevoked, false)))
          .orderBy(desc(tableQrTokens.createdAt))
          .limit(1);

        const [session] = await db
          .select()
          .from(tableSessions)
          .where(and(eq(tableSessions.tableId, table.id), eq(tableSessions.status, 'active')))
          .orderBy(desc(tableSessions.openedAt))
          .limit(1);

        const activeOrders = await db
          .select({ id: orders.id, status: orders.status, totalAmount: orders.totalAmount, orderNumber: orders.orderNumber })
          .from(orders)
          .where(
            and(
              eq(orders.tableId, table.id),
              eq(orders.restaurantId, restaurantId)
            )
          );

        const pendingOrPrepOrders = activeOrders.filter(
          o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
        );

        return {
          ...table,
          qrToken: qr?.token || null,
          qrExpiresAt: qr?.expiresAt || null,
          activeSession: session || null,
          activeOrdersCount: pendingOrPrepOrders.length,
          orders: pendingOrPrepOrders,
        };
      })
    );

    res.json({ success: true, tables: result });
  } catch (error) {
    console.error('Fetch tables error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/tables
tablesRouter.post(
  '/',
  authenticate,
  authorizeRoles('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        res.status(400).json({ success: false, message: 'No restaurant selected' });
        return;
      }

      const tableSchema = z.object({
        tableNumber: z.string().min(1),
        displayName: z.string().min(1),
        zone: z.string().default('Main Dining'),
        capacity: z.number().int().positive().default(4),
      });

      const parsed = tableSchema.parse(req.body);

      // Check unique table number
      const [existing] = await db
        .select()
        .from(diningTables)
        .where(and(eq(diningTables.restaurantId, restaurantId), eq(diningTables.tableNumber, parsed.tableNumber)))
        .limit(1);

      if (existing) {
        res.status(400).json({ success: false, message: `Table number '${parsed.tableNumber}' already exists.` });
        return;
      }

      const [newTable] = await db
        .insert(diningTables)
        .values({
          restaurantId,
          tableNumber: parsed.tableNumber,
          displayName: parsed.displayName,
          zone: parsed.zone,
          capacity: parsed.capacity,
          status: 'available',
        })
        .returning();

      // Automatically generate a secure unique QR token
      const rawToken = 'crv_' + crypto.randomBytes(16).toString('hex');
      const [qr] = await db
        .insert(tableQrTokens)
        .values({
          restaurantId,
          tableId: newTable.id,
          token: rawToken,
        })
        .returning();

      res.status(201).json({
        success: true,
        message: 'Table created with unique QR token',
        table: {
          ...newTable,
          qrToken: qr.token,
        },
      });
    } catch (error) {
      console.error('Create table error:', error);
      res.status(500).json({ success: false, message: 'Failed to create table' });
    }
  }
);

// PUT /api/tables/:id
tablesRouter.put(
  '/:id',
  authenticate,
  authorizeRoles('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const restaurantId = req.user?.restaurantId;

      const schema = z.object({
        displayName: z.string().optional(),
        zone: z.string().optional(),
        capacity: z.number().int().positive().optional(),
        status: z.enum(['available', 'occupied', 'reserved', 'maintenance']).optional(),
      });

      const parsed = schema.parse(req.body);

      const [updated] = await db
        .update(diningTables)
        .set({
          ...parsed,
          updatedAt: new Date(),
        })
        .where(and(eq(diningTables.id, id), eq(diningTables.restaurantId, restaurantId!)))
        .returning();

      if (!updated) {
        res.status(404).json({ success: false, message: 'Table not found' });
        return;
      }

      res.json({ success: true, message: 'Table updated successfully', table: updated });
    } catch (error) {
      console.error('Update table error:', error);
      res.status(500).json({ success: false, message: 'Failed to update table' });
    }
  }
);

// PUT /api/tables/:id/status (quick status update by waiters or staff)
tablesRouter.put('/:id/status', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const restaurantId = req.user?.restaurantId;

    if (!['available', 'occupied', 'reserved', 'maintenance'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid table status' });
      return;
    }

    const [updated] = await db
      .update(diningTables)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(diningTables.id, id), eq(diningTables.restaurantId, restaurantId!)))
      .returning();

    res.json({ success: true, table: updated });
  } catch (error) {
    console.error('Update table status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update table status' });
  }
});

// POST /api/tables/:id/qr/generate (regenerate QR token)
tablesRouter.post(
  '/:id/qr/generate',
  authenticate,
  authorizeRoles('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const restaurantId = req.user?.restaurantId;

      // Revoke previous tokens
      await db
        .update(tableQrTokens)
        .set({ isRevoked: true, revokedAt: new Date() })
        .where(and(eq(tableQrTokens.tableId, id), eq(tableQrTokens.isRevoked, false)));

      // Generate new token
      const rawToken = 'crv_' + crypto.randomBytes(16).toString('hex');
      const [newQr] = await db
        .insert(tableQrTokens)
        .values({
          restaurantId: restaurantId!,
          tableId: id,
          token: rawToken,
        })
        .returning();

      res.json({
        success: true,
        message: 'New QR code generated successfully. Previous codes revoked.',
        qrToken: newQr.token,
      });
    } catch (error) {
      console.error('Regenerate QR error:', error);
      res.status(500).json({ success: false, message: 'Failed to regenerate QR code' });
    }
  }
);

// POST /api/tables/:id/qr/revoke
tablesRouter.post(
  '/:id/qr/revoke',
  authenticate,
  authorizeRoles('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      await db
        .update(tableQrTokens)
        .set({ isRevoked: true, revokedAt: new Date() })
        .where(eq(tableQrTokens.tableId, id));

      res.json({ success: true, message: 'All QR codes for this table have been revoked.' });
    } catch (error) {
      console.error('Revoke QR error:', error);
      res.status(500).json({ success: false, message: 'Failed to revoke QR code' });
    }
  }
);
