import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { serviceRequests, diningTables, users } from '../../database/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.js';
import { AuthenticatedRequest } from '../../shared/types.js';
import { RealtimeEvents } from '../../sockets/index.js';

export const serviceRouter = Router();

// GET /api/service-requests (Active assistance requests)
serviceRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ success: false, message: 'Restaurant ID required' });
      return;
    }

    const requests = await db
      .select({
        id: serviceRequests.id,
        tableId: serviceRequests.tableId,
        type: serviceRequests.type,
        notes: serviceRequests.notes,
        status: serviceRequests.status,
        createdAt: serviceRequests.createdAt,
        resolvedAt: serviceRequests.resolvedAt,
        tableNumber: diningTables.tableNumber,
        tableDisplayName: diningTables.displayName,
        zone: diningTables.zone,
        assignedStaffName: users.fullName,
      })
      .from(serviceRequests)
      .innerJoin(diningTables, eq(serviceRequests.tableId, diningTables.id))
      .leftJoin(users, eq(serviceRequests.assignedUserId, users.id))
      .where(
        and(
          eq(serviceRequests.restaurantId, restaurantId),
          sql`${serviceRequests.status} IN ('pending', 'acknowledged')`
        )
      )
      .orderBy(desc(serviceRequests.createdAt));

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Fetch service requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/service-requests/:id/acknowledge
serviceRouter.put('/:id/acknowledge', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;
    const restaurantId = req.user?.restaurantId;

    const [updated] = await db
      .update(serviceRequests)
      .set({
        status: 'acknowledged',
        assignedUserId: userId,
      })
      .where(and(eq(serviceRequests.id, id), eq(serviceRequests.restaurantId, restaurantId!)))
      .returning();

    RealtimeEvents.emitServiceRequestResolved(restaurantId!, updated);

    res.json({ success: true, message: 'Request acknowledged', request: updated });
  } catch (error) {
    console.error('Acknowledge request error:', error);
    res.status(500).json({ success: false, message: 'Failed to update request' });
  }
});

// PUT /api/service-requests/:id/resolve
serviceRouter.put('/:id/resolve', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const restaurantId = req.user?.restaurantId;

    const [updated] = await db
      .update(serviceRequests)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
      })
      .where(and(eq(serviceRequests.id, id), eq(serviceRequests.restaurantId, restaurantId!)))
      .returning();

    RealtimeEvents.emitServiceRequestResolved(restaurantId!, updated);

    res.json({ success: true, message: 'Request marked resolved', request: updated });
  } catch (error) {
    console.error('Resolve request error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve request' });
  }
});
