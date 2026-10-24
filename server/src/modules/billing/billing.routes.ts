import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../database/index.js';
import { 
  diningTables, 
  tableSessions, 
  orders, 
  orderItems, 
  payments, 
  restaurants,
  orderStatusHistory 
} from '../../database/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.js';
import { AuthenticatedRequest } from '../../shared/types.js';
import { RealtimeEvents } from '../../sockets/index.js';

export const billingRouter = Router();

// GET /api/billing/table/:tableId - Consolidated Bill Calculation
billingRouter.get('/table/:tableId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tableId = req.params.tableId as string;
    const restaurantId = req.user?.restaurantId;

    const [table] = await db
      .select()
      .from(diningTables)
      .where(and(eq(diningTables.id, tableId), eq(diningTables.restaurantId, restaurantId!)))
      .limit(1);

    if (!table) {
      res.status(404).json({ success: false, message: 'Table not found' });
      return;
    }

    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId!))
      .limit(1);

    // Active session
    const [session] = await db
      .select()
      .from(tableSessions)
      .where(and(eq(tableSessions.tableId, tableId), eq(tableSessions.status, 'active')))
      .orderBy(desc(tableSessions.openedAt))
      .limit(1);

    if (!session) {
      res.json({
        success: true,
        hasActiveSession: false,
        message: 'No active dining session on this table',
        table,
      });
      return;
    }

    // Orders for this session
    const sessionOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.sessionId, session.id), sql`${orders.status} != 'CANCELLED'`))
      .orderBy(orders.createdAt);

    // Payments for this session
    const sessionPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.sessionId, session.id));

    const totalPaid = sessionPayments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Summing orders
    let totalSubtotal = 0;
    let totalTax = 0;
    let totalServiceCharge = 0;
    let totalDiscount = 0;
    let grandTotal = 0;

    const ordersWithItems = await Promise.all(
      sessionOrders.map(async (order) => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        totalSubtotal += parseFloat(order.subtotal);
        totalTax += parseFloat(order.taxAmount);
        totalServiceCharge += parseFloat(order.serviceChargeAmount);
        totalDiscount += parseFloat(order.discountAmount);
        grandTotal += parseFloat(order.totalAmount);

        return {
          ...order,
          items,
        };
      })
    );

    const balanceDue = Math.max(0, grandTotal - totalPaid);

    res.json({
      success: true,
      hasActiveSession: true,
      table,
      session,
      restaurant: {
        name: restaurant?.name,
        taxPercentage: restaurant?.taxPercentage,
        serviceChargePercentage: restaurant?.serviceChargePercentage,
        currencySymbol: restaurant?.currencySymbol || '₹',
      },
      orders: ordersWithItems,
      bill: {
        totalOrdersCount: sessionOrders.length,
        subtotal: totalSubtotal.toFixed(2),
        taxAmount: totalTax.toFixed(2),
        serviceChargeAmount: totalServiceCharge.toFixed(2),
        discountAmount: totalDiscount.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
        isFullySettled: balanceDue <= 0.01 && grandTotal > 0,
      },
      payments: sessionPayments,
    });
  } catch (error) {
    console.error('Fetch table bill error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/billing/payments - Record Payment & Settle Table
billingRouter.post('/payments', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const userId = req.user?.userId;

    const paymentSchema = z.object({
      tableId: z.string().uuid(),
      sessionId: z.string().uuid(),
      paymentMethod: z.enum(['cash', 'card', 'upi', 'online']),
      amount: z.number().positive(),
      notes: z.string().optional(),
      closeSession: z.boolean().default(true),
    });

    const parsed = paymentSchema.parse(req.body);

    // Generate unique receipt number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randStr = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${dateStr}-${randStr}`;

    const [paymentRecord] = await db
      .insert(payments)
      .values({
        restaurantId: restaurantId!,
        tableId: parsed.tableId,
        sessionId: parsed.sessionId,
        receiptNumber,
        paymentMethod: parsed.paymentMethod,
        amount: parsed.amount.toFixed(2),
        status: 'completed',
        notes: parsed.notes || null,
        receivedByUserId: userId,
      })
      .returning();

    // If closeSession is requested, mark session closed and complete orders
    if (parsed.closeSession) {
      await db
        .update(tableSessions)
        .set({ status: 'closed', closedAt: new Date() })
        .where(eq(tableSessions.id, parsed.sessionId));

      // Mark uncancelled orders as COMPLETED
      const sessionOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.sessionId, parsed.sessionId), sql`${orders.status} != 'CANCELLED'`));

      for (const o of sessionOrders) {
        await db
          .update(orders)
          .set({ status: 'COMPLETED', updatedAt: new Date() })
          .where(eq(orders.id, o.id));

        await db.insert(orderStatusHistory).values({
          orderId: o.id,
          toStatus: 'COMPLETED',
          actorId: userId,
          actorRole: 'cashier',
          notes: `Settled and completed with receipt #${receiptNumber}`,
        });
      }

      // Mark Table as available
      await db
        .update(diningTables)
        .set({ status: 'available', updatedAt: new Date() })
        .where(eq(diningTables.id, parsed.tableId));
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment: paymentRecord,
      receiptNumber,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// GET /api/billing/payments/history
billingRouter.get('/payments/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;

    const list = await db
      .select({
        id: payments.id,
        receiptNumber: payments.receiptNumber,
        paymentMethod: payments.paymentMethod,
        amount: payments.amount,
        status: payments.status,
        notes: payments.notes,
        createdAt: payments.createdAt,
        tableNumber: diningTables.tableNumber,
      })
      .from(payments)
      .leftJoin(diningTables, eq(payments.tableId, diningTables.id))
      .where(eq(payments.restaurantId, restaurantId!))
      .orderBy(desc(payments.createdAt))
      .limit(50);

    res.json({ success: true, payments: list });
  } catch (error) {
    console.error('Fetch payments history error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
