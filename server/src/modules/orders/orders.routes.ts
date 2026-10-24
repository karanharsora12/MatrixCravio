import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../database/index.js';
import { 
  orders, 
  orderItems, 
  orderItemAddons, 
  orderStatusHistory, 
  diningTables, 
  tableSessions, 
  restaurants 
} from '../../database/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.js';
import { AuthenticatedRequest, OrderStatus } from '../../shared/types.js';
import { RealtimeEvents } from '../../sockets/index.js';

export const ordersRouter = Router();

// Order State Machine transition validator
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['SERVED'],
  SERVED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

// GET /api/orders (Staff order management dashboard)
ordersRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ success: false, message: 'Restaurant ID required' });
      return;
    }

    const { status, tableId, limit = '50' } = req.query;

    const baseQuery = db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        subtotal: orders.subtotal,
        taxAmount: orders.taxAmount,
        serviceChargeAmount: orders.serviceChargeAmount,
        discountAmount: orders.discountAmount,
        totalAmount: orders.totalAmount,
        customerNotes: orders.customerNotes,
        kitchenNotes: orders.kitchenNotes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        tableId: orders.tableId,
        tableNumber: diningTables.tableNumber,
        tableDisplayName: diningTables.displayName,
        zone: diningTables.zone,
        customerName: tableSessions.customerName,
      })
      .from(orders)
      .innerJoin(diningTables, eq(orders.tableId, diningTables.id))
      .leftJoin(tableSessions, eq(orders.sessionId, tableSessions.id))
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          status ? eq(orders.status, status as string) : sql`1=1`,
          tableId ? eq(orders.tableId, tableId as string) : sql`1=1`
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(parseInt(limit as string, 10));

    const ordersList = await baseQuery;

    // Fetch line items for each order
    const enrichedOrders = await Promise.all(
      ordersList.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return {
          ...order,
          items,
        };
      })
    );

    res.json({ success: true, orders: enrichedOrders });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/orders/kitchen (KDS specific active queue)
ordersRouter.get('/kitchen/queue', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ success: false, message: 'Restaurant ID required' });
      return;
    }

    // Only orders in PENDING, ACCEPTED, PREPARING, READY
    const activeKitchenOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        customerNotes: orders.customerNotes,
        kitchenNotes: orders.kitchenNotes,
        createdAt: orders.createdAt,
        tableId: orders.tableId,
        tableNumber: diningTables.tableNumber,
        tableDisplayName: diningTables.displayName,
        zone: diningTables.zone,
      })
      .from(orders)
      .innerJoin(diningTables, eq(orders.tableId, diningTables.id))
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          sql`${orders.status} IN ('PENDING', 'ACCEPTED', 'PREPARING', 'READY')`
        )
      )
      .orderBy(orders.createdAt);

    const enriched = await Promise.all(
      activeKitchenOrders.map(async (o) => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
        return {
          ...o,
          items,
        };
      })
    );

    res.json({ success: true, queue: enriched });
  } catch (error) {
    console.error('Fetch kitchen queue error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/orders/:id
ordersRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const restaurantId = req.user?.restaurantId;

    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        subtotal: orders.subtotal,
        taxAmount: orders.taxAmount,
        serviceChargeAmount: orders.serviceChargeAmount,
        discountAmount: orders.discountAmount,
        totalAmount: orders.totalAmount,
        customerNotes: orders.customerNotes,
        kitchenNotes: orders.kitchenNotes,
        cancellationReason: orders.cancellationReason,
        cancelledBy: orders.cancelledBy,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        tableId: orders.tableId,
        tableNumber: diningTables.tableNumber,
        tableDisplayName: diningTables.displayName,
        zone: diningTables.zone,
        customerName: tableSessions.customerName,
      })
      .from(orders)
      .innerJoin(diningTables, eq(orders.tableId, diningTables.id))
      .leftJoin(tableSessions, eq(orders.sessionId, tableSessions.id))
      .where(and(eq(orders.id, id), eq(orders.restaurantId, restaurantId!)))
      .limit(1);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id))
      .orderBy(orderStatusHistory.timestamp);

    res.json({
      success: true,
      order: {
        ...order,
        items,
        timeline: history,
      },
    });
  } catch (error) {
    console.error('Fetch order details error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/orders/:id/status - Controlled State Machine Transition
ordersRouter.put('/:id/status', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const restaurantId = req.user?.restaurantId;
    const { status: targetStatus, notes, kitchenNotes } = req.body as {
      status: OrderStatus;
      notes?: string;
      kitchenNotes?: string;
    };

    const [currentOrder] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.restaurantId, restaurantId!)))
      .limit(1);

    if (!currentOrder) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const currentStatus = currentOrder.status as OrderStatus;

    // Check valid transitions
    const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      res.status(400).json({
        success: false,
        message: `Invalid state transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowedTargets.join(', ')}`,
      });
      return;
    }

    // Update order
    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: targetStatus,
        kitchenNotes: kitchenNotes || currentOrder.kitchenNotes,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Record Status History
    await db.insert(orderStatusHistory).values({
      orderId: id,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      actorId: req.user?.userId || null,
      actorRole: req.user?.role || 'staff',
      notes: notes || `Order status updated to ${targetStatus} by ${req.user?.fullName}`,
    });

    // Fetch table info for socket emit
    const [tableInfo] = await db
      .select({ tableNumber: diningTables.tableNumber, displayName: diningTables.displayName })
      .from(diningTables)
      .where(eq(diningTables.id, currentOrder.tableId))
      .limit(1);

    const payload = {
      ...updatedOrder,
      tableNumber: tableInfo?.tableNumber,
      tableDisplayName: tableInfo?.displayName,
    };

    // Emit real-time update
    RealtimeEvents.emitOrderStatusUpdated(restaurantId!, payload);

    res.json({
      success: true,
      message: `Order transitioned to ${targetStatus}`,
      order: payload,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// POST /api/orders/:id/cancel
ordersRouter.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const restaurantId = req.user?.restaurantId;

    const [currentOrder] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.restaurantId, restaurantId!)))
      .limit(1);

    if (!currentOrder) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (currentOrder.status === 'COMPLETED' || currentOrder.status === 'SERVED') {
      res.status(400).json({ success: false, message: 'Cannot cancel an order that is already served or completed.' });
      return;
    }

    const [cancelledOrder] = await db
      .update(orders)
      .set({
        status: 'CANCELLED',
        cancellationReason: reason || 'Cancelled by staff',
        cancelledBy: req.user?.fullName || 'Staff',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId: id,
      fromStatus: currentOrder.status,
      toStatus: 'CANCELLED',
      actorId: req.user?.userId || null,
      actorRole: req.user?.role || 'staff',
      notes: reason || 'Cancelled by staff',
    });

    RealtimeEvents.emitOrderStatusUpdated(restaurantId!, cancelledOrder);

    res.json({ success: true, message: 'Order cancelled successfully', order: cancelledOrder });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
});
