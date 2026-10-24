import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../database/index.js';
import {
  tableQrTokens,
  diningTables,
  restaurants,
  restaurantSettings,
  tableSessions,
  menuCategories,
  menuItems,
  menuItemVariants,
  addonGroups,
  addons,
  menuItemAddonGroups,
  orders,
  orderItems,
  orderItemAddons,
  orderStatusHistory,
  serviceRequests,
} from '../../database/schema.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { RealtimeEvents } from '../../sockets/index.js';
import crypto from 'crypto';

export const customerPortalRouter = Router();

// GET /api/public/qr/:token - Resolve QR code and load menu
customerPortalRouter.get('/qr/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.params.token as string;

    // 1. Resolve QR token
    const [qrRecord] = await db
      .select()
      .from(tableQrTokens)
      .where(and(eq(tableQrTokens.token, token), eq(tableQrTokens.isRevoked, false)))
      .limit(1);

    if (!qrRecord) {
      res.status(404).json({
        success: false,
        message: 'Invalid or revoked QR code. Please ask the restaurant staff for an updated QR code.',
      });
      return;
    }

    // 2. Fetch Dining Table
    const [table] = await db
      .select()
      .from(diningTables)
      .where(and(eq(diningTables.id, qrRecord.tableId), eq(diningTables.isActive, true)))
      .limit(1);

    if (!table) {
      res.status(404).json({ success: false, message: 'Table not found or inactive.' });
      return;
    }

    // 3. Fetch Restaurant details & settings
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, qrRecord.restaurantId))
      .limit(1);

    if (!restaurant || !restaurant.isOpen || !restaurant.allowOrdering) {
      res.status(403).json({
        success: false,
        message: 'This restaurant is currently closed or not accepting orders.',
      });
      return;
    }

    const [settings] = await db
      .select()
      .from(restaurantSettings)
      .where(eq(restaurantSettings.restaurantId, restaurant.id))
      .limit(1);

    // 4. Resolve or create active table session
    let [session] = await db
      .select()
      .from(tableSessions)
      .where(and(eq(tableSessions.tableId, table.id), eq(tableSessions.status, 'active')))
      .orderBy(desc(tableSessions.openedAt))
      .limit(1);

    if (!session) {
      const sessionToken = 'sess_' + crypto.randomBytes(16).toString('hex');
      const [newSession] = await db
        .insert(tableSessions)
        .values({
          restaurantId: restaurant.id,
          tableId: table.id,
          sessionToken,
          status: 'active',
        })
        .returning();
      session = newSession;
    }

    // 5. Fetch available categories, items, variants & addons
    const categories = await db
      .select()
      .from(menuCategories)
      .where(and(eq(menuCategories.restaurantId, restaurant.id), eq(menuCategories.isActive, true)))
      .orderBy(menuCategories.displayOrder);

    const items = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.restaurantId, restaurant.id), eq(menuItems.isAvailable, true)))
      .orderBy(menuItems.displayOrder);

    const variants = await db
      .select()
      .from(menuItemVariants)
      .where(eq(menuItemVariants.isAvailable, true))
      .orderBy(menuItemVariants.displayOrder);

    const agList = await db
      .select()
      .from(addonGroups)
      .where(eq(addonGroups.restaurantId, restaurant.id));

    const addonsList = await db
      .select()
      .from(addons)
      .where(eq(addons.isAvailable, true))
      .orderBy(addons.displayOrder);

    const itemAddonLinks = await db.select().from(menuItemAddonGroups);

    // Construct customer menu
    const itemsWithDetails = items.map((item) => {
      const itemVariants = variants.filter((v) => v.menuItemId === item.id);
      const linkedGroupIds = itemAddonLinks.filter((l) => l.menuItemId === item.id).map((l) => l.addonGroupId);
      const itemGroups = agList
        .filter((g) => linkedGroupIds.includes(g.id))
        .map((g) => ({
          ...g,
          addons: addonsList.filter((a) => a.addonGroupId === g.id),
        }));

      return {
        ...item,
        variants: itemVariants,
        addonGroups: itemGroups,
      };
    });

    const categoryTree = categories.map((cat) => ({
      ...cat,
      items: itemsWithDetails.filter((i) => i.categoryId === cat.id),
    }));

    res.json({
      success: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        tagline: restaurant.tagline,
        description: restaurant.description,
        logoUrl: restaurant.logoUrl,
        coverUrl: restaurant.coverUrl,
        currencySymbol: restaurant.currencySymbol,
        currencyCode: restaurant.currencyCode,
        taxPercentage: restaurant.taxPercentage,
        serviceChargePercentage: restaurant.serviceChargePercentage,
        openingTime: restaurant.openingTime,
        closingTime: restaurant.closingTime,
      },
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        displayName: table.displayName,
        zone: table.zone,
        capacity: table.capacity,
      },
      session: {
        id: session.id,
        sessionToken: session.sessionToken,
        customerName: session.customerName,
      },
      settings: settings || null,
      categories: categoryTree,
    });
  } catch (error) {
    console.error('Resolve QR error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/public/orders - Submit customer order (with server-side validation & atomic calculation)
customerPortalRouter.post('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const orderSubmissionSchema = z.object({
      qrToken: z.string().min(1),
      sessionToken: z.string().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      customerNotes: z.string().optional(),
      idempotencyKey: z.string().optional(),
      items: z.array(
        z.object({
          menuItemId: z.string().uuid(),
          variantId: z.string().uuid().optional().nullable(),
          quantity: z.number().int().positive(),
          specialInstructions: z.string().optional(),
          addonIds: z.array(z.string().uuid()).optional(),
        })
      ).min(1, 'Cart cannot be empty'),
    });

    const parsed = orderSubmissionSchema.parse(req.body);

    // 1. Verify QR token & resolve table
    const [qrRecord] = await db
      .select()
      .from(tableQrTokens)
      .where(and(eq(tableQrTokens.token, parsed.qrToken), eq(tableQrTokens.isRevoked, false)))
      .limit(1);

    if (!qrRecord) {
      res.status(400).json({ success: false, message: 'Invalid or expired QR session' });
      return;
    }

    const restaurantId = qrRecord.restaurantId;
    const tableId = qrRecord.tableId;

    // Check restaurant ordering status
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (!restaurant || !restaurant.isOpen || !restaurant.allowOrdering) {
      res.status(403).json({ success: false, message: 'Restaurant is currently not accepting orders' });
      return;
    }

    // 2. Resolve Table Session
    let sessionId: string | null = null;
    if (parsed.sessionToken) {
      const [existingSession] = await db
        .select()
        .from(tableSessions)
        .where(eq(tableSessions.sessionToken, parsed.sessionToken))
        .limit(1);
      if (existingSession) {
        sessionId = existingSession.id;
        if (parsed.customerName && !existingSession.customerName) {
          await db
            .update(tableSessions)
            .set({ customerName: parsed.customerName, customerPhone: parsed.customerPhone || null })
            .where(eq(tableSessions.id, sessionId));
        }
      }
    }

    if (!sessionId) {
      const newSessionToken = 'sess_' + crypto.randomBytes(16).toString('hex');
      const [newSess] = await db
        .insert(tableSessions)
        .values({
          restaurantId,
          tableId,
          sessionToken: newSessionToken,
          customerName: parsed.customerName || null,
          customerPhone: parsed.customerPhone || null,
          status: 'active',
        })
        .returning();
      sessionId = newSess.id;
    }

    // 3. Recalculate ALL prices on backend & validate availability
    let subtotalCents = 0; // Using integer cents for bulletproof precision
    const orderItemsToInsert: any[] = [];

    for (const itemInput of parsed.items) {
      const [menuItem] = await db
        .select()
        .from(menuItems)
        .where(and(eq(menuItems.id, itemInput.menuItemId), eq(menuItems.restaurantId, restaurantId)))
        .limit(1);

      if (!menuItem) {
        res.status(400).json({ success: false, message: `Menu item not found or invalid` });
        return;
      }

      if (!menuItem.isAvailable) {
        res.status(400).json({ success: false, message: `Sorry, "${menuItem.name}" is currently sold out.` });
        return;
      }

      let itemUnitPrice = parseFloat(menuItem.basePrice);
      let variantName: string | null = null;

      if (itemInput.variantId) {
        const [variant] = await db
          .select()
          .from(menuItemVariants)
          .where(and(eq(menuItemVariants.id, itemInput.variantId), eq(menuItemVariants.menuItemId, menuItem.id)))
          .limit(1);

        if (variant) {
          variantName = variant.name;
          itemUnitPrice += parseFloat(variant.priceModifier);
        }
      }

      // Check addons
      const selectedAddons: any[] = [];
      if (itemInput.addonIds && itemInput.addonIds.length > 0) {
        const foundAddons = await db
          .select()
          .from(addons)
          .where(inArray(addons.id, itemInput.addonIds));

        for (const add of foundAddons) {
          if (add.isAvailable) {
            itemUnitPrice += parseFloat(add.price);
            selectedAddons.push({
              addonId: add.id,
              addonName: add.name,
              addonPrice: parseFloat(add.price),
            });
          }
        }
      }

      const itemTotal = itemUnitPrice * itemInput.quantity;
      subtotalCents += Math.round(itemTotal * 100);

      orderItemsToInsert.push({
        menuItemId: menuItem.id,
        variantId: itemInput.variantId || null,
        itemNameSnapshot: menuItem.name,
        variantNameSnapshot: variantName,
        unitPriceSnapshot: itemUnitPrice.toFixed(2),
        quantity: itemInput.quantity,
        totalPriceSnapshot: itemTotal.toFixed(2),
        specialInstructions: itemInput.specialInstructions || null,
        addons: selectedAddons,
      });
    }

    const subtotal = subtotalCents / 100;
    const taxRate = parseFloat(restaurant.taxPercentage) / 100;
    const serviceChargeRate = parseFloat(restaurant.serviceChargePercentage) / 100;

    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const serviceChargeAmount = Math.round(subtotal * serviceChargeRate * 100) / 100;
    const totalAmount = subtotal + taxAmount + serviceChargeAmount;

    // Generate Order Number: #CRV-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `#CRV-${randomSuffix}`;

    // Determine initial status based on autoAcceptOrders
    const initialStatus = restaurant.autoAcceptOrders ? 'ACCEPTED' : 'PENDING';

    // 4. Insert Order
    const [createdOrder] = await db
      .insert(orders)
      .values({
        restaurantId,
        tableId,
        sessionId,
        orderNumber,
        status: initialStatus,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        serviceChargeAmount: serviceChargeAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        idempotencyKey: parsed.idempotencyKey || null,
        customerNotes: parsed.customerNotes || null,
      })
      .returning();

    // 5. Insert Order Items & Addons
    for (const oi of orderItemsToInsert) {
      const [insertedItem] = await db
        .insert(orderItems)
        .values({
          orderId: createdOrder.id,
          menuItemId: oi.menuItemId,
          variantId: oi.variantId,
          itemNameSnapshot: oi.itemNameSnapshot,
          variantNameSnapshot: oi.variantNameSnapshot,
          unitPriceSnapshot: oi.unitPriceSnapshot,
          quantity: oi.quantity,
          totalPriceSnapshot: oi.totalPriceSnapshot,
          specialInstructions: oi.specialInstructions,
        })
        .returning();

      for (const add of oi.addons) {
        await db.insert(orderItemAddons).values({
          orderItemId: insertedItem.id,
          addonId: add.addonId,
          addonNameSnapshot: add.addonName,
          addonPriceSnapshot: add.addonPrice.toFixed(2),
        });
      }
    }

    // 6. Record Status History
    await db.insert(orderStatusHistory).values({
      orderId: createdOrder.id,
      fromStatus: null,
      toStatus: initialStatus,
      actorRole: 'customer',
      notes: `Order created via QR table scan by ${parsed.customerName || 'Guest'}`,
    });

    // 7. Mark table as occupied
    await db
      .update(diningTables)
      .set({ status: 'occupied', updatedAt: new Date() })
      .where(eq(diningTables.id, tableId));

    // 8. Fetch Table info for socket event
    const [tableInfo] = await db
      .select({ tableNumber: diningTables.tableNumber, displayName: diningTables.displayName })
      .from(diningTables)
      .where(eq(diningTables.id, tableId))
      .limit(1);

    const fullOrderPayload = {
      ...createdOrder,
      tableNumber: tableInfo?.tableNumber,
      tableDisplayName: tableInfo?.displayName,
      items: orderItemsToInsert,
    };

    // 9. Emit real-time notification
    RealtimeEvents.emitNewOrder(restaurantId, fullOrderPayload);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      status: createdOrder.status,
      totalAmount: createdOrder.totalAmount,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to place order. Please try again.' });
  }
});

// GET /api/public/orders/:orderId - Customer live order tracking
customerPortalRouter.get('/orders/:orderId', async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.orderId as string;

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
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

    const [table] = await db
      .select({ tableNumber: diningTables.tableNumber, displayName: diningTables.displayName })
      .from(diningTables)
      .where(eq(diningTables.id, order.tableId))
      .limit(1);

    const [restaurant] = await db
      .select({ name: restaurants.name, currencySymbol: restaurants.currencySymbol })
      .from(restaurants)
      .where(eq(restaurants.id, order.restaurantId))
      .limit(1);

    res.json({
      success: true,
      order: {
        ...order,
        restaurantName: restaurant?.name,
        currencySymbol: restaurant?.currencySymbol || '₹',
        tableNumber: table?.tableNumber,
        tableDisplayName: table?.displayName,
        items,
        timeline: history,
      },
    });
  } catch (error) {
    console.error('Fetch order tracking error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/public/sessions/:sessionToken/orders - All orders for current table session
customerPortalRouter.get('/sessions/:sessionToken/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = req.params.sessionToken as string;

    const [session] = await db
      .select()
      .from(tableSessions)
      .where(eq(tableSessions.sessionToken, sessionToken))
      .limit(1);

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const sessionOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.sessionId, session.id))
      .orderBy(desc(orders.createdAt));

    const ordersWithItems = await Promise.all(
      sessionOrders.map(async (order) => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return {
          ...order,
          items,
        };
      })
    );

    res.json({
      success: true,
      session,
      orders: ordersWithItems,
    });
  } catch (error) {
    console.error('Fetch session orders error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/public/service-requests - Call waiter, request water/bill/cutlery
customerPortalRouter.post('/service-requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      qrToken: z.string().min(1),
      sessionToken: z.string().optional(),
      type: z.enum(['call_waiter', 'request_water', 'request_cutlery', 'request_bill', 'cleaning']),
      notes: z.string().optional(),
    });

    const parsed = schema.parse(req.body);

    const [qrRecord] = await db
      .select()
      .from(tableQrTokens)
      .where(and(eq(tableQrTokens.token, parsed.qrToken), eq(tableQrTokens.isRevoked, false)))
      .limit(1);

    if (!qrRecord) {
      res.status(400).json({ success: false, message: 'Invalid QR token' });
      return;
    }

    let sessionId: string | null = null;
    if (parsed.sessionToken) {
      const [sess] = await db
        .select()
        .from(tableSessions)
        .where(eq(tableSessions.sessionToken, parsed.sessionToken))
        .limit(1);
      sessionId = sess?.id || null;
    }

    const [newRequest] = await db
      .insert(serviceRequests)
      .values({
        restaurantId: qrRecord.restaurantId,
        tableId: qrRecord.tableId,
        sessionId,
        type: parsed.type,
        notes: parsed.notes || null,
        status: 'pending',
      })
      .returning();

    const [tableInfo] = await db
      .select({ tableNumber: diningTables.tableNumber, displayName: diningTables.displayName })
      .from(diningTables)
      .where(eq(diningTables.id, qrRecord.tableId))
      .limit(1);

    const socketPayload = {
      ...newRequest,
      tableNumber: tableInfo?.tableNumber,
      tableDisplayName: tableInfo?.displayName,
    };

    RealtimeEvents.emitServiceRequest(qrRecord.restaurantId, socketPayload);

    res.status(201).json({
      success: true,
      message: 'Staff has been notified. Someone will assist you shortly!',
      request: socketPayload,
    });
  } catch (error) {
    console.error('Service request error:', error);
    res.status(500).json({ success: false, message: 'Failed to send service request' });
  }
});
