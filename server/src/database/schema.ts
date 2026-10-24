import { pgTable, uuid, varchar, text, boolean, integer, decimal, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  systemRole: varchar('system_role', { length: 30 }).default('user').notNull(), // 'superadmin', 'user'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Restaurants table
export const restaurants = pgTable('restaurants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  tagline: varchar('tagline', { length: 255 }),
  description: text('description'),
  logoUrl: text('logo_url'),
  coverUrl: text('cover_url'),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }).default('India'),
  currencyCode: varchar('currency_code', { length: 10 }).default('INR').notNull(),
  currencySymbol: varchar('currency_symbol', { length: 10 }).default('₹').notNull(),
  taxPercentage: decimal('tax_percentage', { precision: 5, scale: 2 }).default('5.00').notNull(),
  serviceChargePercentage: decimal('service_charge_percentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
  isOpen: boolean('is_open').default(true).notNull(),
  openingTime: varchar('opening_time', { length: 10 }).default('10:00'),
  closingTime: varchar('closing_time', { length: 10 }).default('23:00'),
  allowOrdering: boolean('allow_ordering').default(true).notNull(),
  autoAcceptOrders: boolean('auto_accept_orders').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Restaurant Users (Association & Roles)
export const restaurantUsers = pgTable('restaurant_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // 'owner', 'manager', 'chef', 'waiter', 'cashier'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('unique_restaurant_user').on(table.restaurantId, table.userId),
]);

// 4. Dining Tables
export const diningTables = pgTable('dining_tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  tableNumber: varchar('table_number', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  zone: varchar('zone', { length: 50 }).default('Main Dining').notNull(),
  capacity: integer('capacity').default(4).notNull(),
  status: varchar('status', { length: 30 }).default('available').notNull(), // 'available', 'occupied', 'reserved', 'maintenance'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('unique_table_number_per_restaurant').on(table.restaurantId, table.tableNumber),
]);

// 5. Table QR Tokens (Cryptographic tokens for customer scanning)
export const tableQrTokens = pgTable('table_qr_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  tableId: uuid('table_id').references(() => diningTables.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 128 }).notNull().unique(),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => [
  index('idx_qr_token').on(table.token),
]);

// 6. Menu Categories
export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }).default('Utensils'),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Menu Items
export const menuItems = pgTable('menu_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => menuCategories.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('image_url'),
  dietaryType: varchar('dietary_type', { length: 30 }).default('veg').notNull(), // 'veg', 'non_veg', 'vegan', 'egg'
  isGlutenFree: boolean('is_gluten_free').default(false).notNull(),
  spicinessLevel: integer('spiciness_level').default(0).notNull(), // 0 to 3
  preparationTimeMinutes: integer('preparation_time_minutes').default(15).notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  allergens: text('allergens').array(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Menu Item Variants
export const menuItemVariants = pgTable('menu_item_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  menuItemId: uuid('menu_item_id').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // e.g. "Regular", "Large"
  priceModifier: decimal('price_modifier', { precision: 10, scale: 2 }).default('0.00').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
});

// 9. Addon Groups
export const addonGroups = pgTable('addon_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // e.g. "Choose Dips", "Extra Toppings"
  description: text('description'),
  minSelections: integer('min_selections').default(0).notNull(),
  maxSelections: integer('max_selections').default(1).notNull(),
  isRequired: boolean('is_required').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. Addons
export const addons = pgTable('addons', {
  id: uuid('id').defaultRandom().primaryKey(),
  addonGroupId: uuid('addon_group_id').references(() => addonGroups.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).default('0.00').notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
});

// 11. Menu Item Addon Groups Join
export const menuItemAddonGroups = pgTable('menu_item_addon_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  menuItemId: uuid('menu_item_id').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  addonGroupId: uuid('addon_group_id').references(() => addonGroups.id, { onDelete: 'cascade' }).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
}, (table) => [
  uniqueIndex('unique_item_addon_group').on(table.menuItemId, table.addonGroupId),
]);

// 12. Table Sessions
export const tableSessions = pgTable('table_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  tableId: uuid('table_id').references(() => diningTables.id, { onDelete: 'cascade' }).notNull(),
  sessionToken: varchar('session_token', { length: 128 }).notNull().unique(),
  guestCount: integer('guest_count').default(2).notNull(),
  status: varchar('status', { length: 30 }).default('active').notNull(), // 'active', 'billing', 'closed'
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  customerName: varchar('customer_name', { length: 100 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
});

// 13. Orders
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  tableId: uuid('table_id').references(() => diningTables.id, { onDelete: 'cascade' }).notNull(),
  sessionId: uuid('session_id').references(() => tableSessions.id, { onDelete: 'set null' }),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  status: varchar('status', { length: 30 }).default('PENDING').notNull(), // 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).notNull(),
  serviceChargeAmount: decimal('service_charge_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 128 }),
  customerNotes: text('customer_notes'),
  kitchenNotes: text('kitchen_notes'),
  cancellationReason: text('cancellation_reason'),
  cancelledBy: varchar('cancelled_by', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_orders_restaurant').on(table.restaurantId),
  index('idx_orders_status').on(table.status),
  index('idx_orders_table').on(table.tableId),
]);

// 14. Order Items
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: uuid('menu_item_id').references(() => menuItems.id, { onDelete: 'set null' }),
  variantId: uuid('variant_id').references(() => menuItemVariants.id, { onDelete: 'set null' }),
  itemNameSnapshot: varchar('item_name_snapshot', { length: 150 }).notNull(),
  variantNameSnapshot: varchar('variant_name_snapshot', { length: 100 }),
  unitPriceSnapshot: decimal('unit_price_snapshot', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  totalPriceSnapshot: decimal('total_price_snapshot', { precision: 10, scale: 2 }).notNull(),
  specialInstructions: text('special_instructions'),
  status: varchar('status', { length: 30 }).default('PENDING').notNull(),
});

// 15. Order Item Addons
export const orderItemAddons = pgTable('order_item_addons', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderItemId: uuid('order_item_id').references(() => orderItems.id, { onDelete: 'cascade' }).notNull(),
  addonId: uuid('addon_id').references(() => addons.id, { onDelete: 'set null' }),
  addonNameSnapshot: varchar('addon_name_snapshot', { length: 100 }).notNull(),
  addonPriceSnapshot: decimal('addon_price_snapshot', { precision: 10, scale: 2 }).notNull(),
});

// 16. Order Status History
export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  fromStatus: varchar('from_status', { length: 30 }),
  toStatus: varchar('to_status', { length: 30 }).notNull(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  actorRole: varchar('actor_role', { length: 50 }).default('system').notNull(), // 'customer', 'waiter', 'chef', 'manager', 'system'
  notes: text('notes'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

// 17. Service Requests (Call Waiter, Water, Bill, Cutlery)
export const serviceRequests = pgTable('service_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  tableId: uuid('table_id').references(() => diningTables.id, { onDelete: 'cascade' }).notNull(),
  sessionId: uuid('session_id').references(() => tableSessions.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 50 }).notNull(), // 'call_waiter', 'request_water', 'request_cutlery', 'request_bill', 'cleaning'
  notes: text('notes'),
  status: varchar('status', { length: 30 }).default('pending').notNull(), // 'pending', 'acknowledged', 'resolved'
  assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

// 18. Payments
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  tableId: uuid('table_id').references(() => diningTables.id, { onDelete: 'set null' }),
  sessionId: uuid('session_id').references(() => tableSessions.id, { onDelete: 'set null' }),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
  paymentMethod: varchar('payment_method', { length: 30 }).notNull(), // 'cash', 'card', 'upi', 'online'
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 30 }).default('completed').notNull(), // 'pending', 'completed', 'failed', 'refunded'
  notes: text('notes'),
  receivedByUserId: uuid('received_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 19. Restaurant Settings
export const restaurantSettings = pgTable('restaurant_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull().unique(),
  enableSoundNotifications: boolean('enable_sound_notifications').default(true).notNull(),
  enableCustomerCancellation: boolean('enable_customer_cancellation').default(true).notNull(),
  customerCancellationWindowSeconds: integer('customer_cancellation_window_seconds').default(120).notNull(),
  printKitchenTokenOnAccept: boolean('print_kitchen_token_on_accept').default(false).notNull(),
  taxRegistrationNumber: varchar('tax_registration_number', { length: 100 }),
  receiptFooterText: text('receipt_footer_text').default('Thank you for dining with us! Scan again soon.'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 20. Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(), // e.g. "MENU_ITEM_PRICE_UPDATED", "ORDER_CANCELLED"
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Drizzle Relations
export const restaurantsRelations = relations(restaurants, ({ many, one }) => ({
  tables: many(diningTables),
  categories: many(menuCategories),
  items: many(menuItems),
  orders: many(orders),
  restaurantUsers: many(restaurantUsers),
  settings: one(restaurantSettings, {
    fields: [restaurants.id],
    references: [restaurantSettings.restaurantId],
  }),
}));

export const diningTablesRelations = relations(diningTables, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [diningTables.restaurantId],
    references: [restaurants.id],
  }),
  qrTokens: many(tableQrTokens),
  sessions: many(tableSessions),
  orders: many(orders),
  serviceRequests: many(serviceRequests),
}));

export const tableQrTokensRelations = relations(tableQrTokens, ({ one }) => ({
  table: one(diningTables, {
    fields: [tableQrTokens.tableId],
    references: [diningTables.id],
  }),
  restaurant: one(restaurants, {
    fields: [tableQrTokens.restaurantId],
    references: [restaurants.id],
  }),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [menuCategories.restaurantId],
    references: [restaurants.id],
  }),
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  restaurant: one(restaurants, {
    fields: [menuItems.restaurantId],
    references: [restaurants.id],
  }),
  variants: many(menuItemVariants),
  itemAddonGroups: many(menuItemAddonGroups),
}));

export const menuItemVariantsRelations = relations(menuItemVariants, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [menuItemVariants.menuItemId],
    references: [menuItems.id],
  }),
}));

export const addonGroupsRelations = relations(addonGroups, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [addonGroups.restaurantId],
    references: [restaurants.id],
  }),
  addons: many(addons),
  menuItemAddonGroups: many(menuItemAddonGroups),
}));

export const addonsRelations = relations(addons, ({ one }) => ({
  group: one(addonGroups, {
    fields: [addons.addonGroupId],
    references: [addonGroups.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.id],
  }),
  table: one(diningTables, {
    fields: [orders.tableId],
    references: [diningTables.id],
  }),
  session: one(tableSessions, {
    fields: [orders.sessionId],
    references: [tableSessions.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
  variant: one(menuItemVariants, {
    fields: [orderItems.variantId],
    references: [menuItemVariants.id],
  }),
  addons: many(orderItemAddons),
}));

export const orderItemAddonsRelations = relations(orderItemAddons, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderItemAddons.orderItemId],
    references: [orderItems.id],
  }),
  addon: one(addons, {
    fields: [orderItemAddons.addonId],
    references: [addons.id],
  }),
}));
