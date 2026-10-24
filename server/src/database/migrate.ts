import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Karan%40123@localhost:5432/matrix_cravio';

export async function runMigrations() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL for migrations...');

  try {
    // 1. Enable uuid-ossp or pgcrypto if needed (pgcrypto provides gen_random_uuid())
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        phone VARCHAR(30),
        system_role VARCHAR(30) DEFAULT 'user' NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 3. Restaurants
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) UNIQUE NOT NULL,
        tagline VARCHAR(255),
        description TEXT,
        logo_url TEXT,
        cover_url TEXT,
        email VARCHAR(255),
        phone VARCHAR(30),
        address TEXT,
        city VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'India',
        currency_code VARCHAR(10) DEFAULT 'INR' NOT NULL,
        currency_symbol VARCHAR(10) DEFAULT '₹' NOT NULL,
        tax_percentage DECIMAL(5,2) DEFAULT 5.00 NOT NULL,
        service_charge_percentage DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
        is_open BOOLEAN DEFAULT TRUE NOT NULL,
        opening_time VARCHAR(10) DEFAULT '10:00',
        closing_time VARCHAR(10) DEFAULT '23:00',
        allow_ordering BOOLEAN DEFAULT TRUE NOT NULL,
        auto_accept_orders BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 4. Restaurant Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT unique_restaurant_user UNIQUE (restaurant_id, user_id)
      );
    `);

    // 5. Dining Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS dining_tables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        table_number VARCHAR(50) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        zone VARCHAR(50) DEFAULT 'Main Dining' NOT NULL,
        capacity INTEGER DEFAULT 4 NOT NULL,
        status VARCHAR(30) DEFAULT 'available' NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT unique_table_number_per_restaurant UNIQUE (restaurant_id, table_number)
      );
    `);

    // 6. Table QR Tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS table_qr_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE CASCADE,
        token VARCHAR(128) UNIQUE NOT NULL,
        is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        revoked_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_qr_token ON table_qr_tokens (token);
    `);

    // 7. Menu Categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'Utensils',
        display_order INTEGER DEFAULT 0 NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 8. Menu Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        base_price DECIMAL(10,2) NOT NULL,
        image_url TEXT,
        dietary_type VARCHAR(30) DEFAULT 'veg' NOT NULL,
        is_gluten_free BOOLEAN DEFAULT FALSE NOT NULL,
        spiciness_level INTEGER DEFAULT 0 NOT NULL,
        preparation_time_minutes INTEGER DEFAULT 15 NOT NULL,
        is_available BOOLEAN DEFAULT TRUE NOT NULL,
        is_featured BOOLEAN DEFAULT FALSE NOT NULL,
        allergens TEXT[],
        display_order INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 9. Menu Item Variants
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_item_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        price_modifier DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
        is_default BOOLEAN DEFAULT FALSE NOT NULL,
        display_order INTEGER DEFAULT 0 NOT NULL,
        is_available BOOLEAN DEFAULT TRUE NOT NULL
      );
    `);

    // 10. Addon Groups
    await client.query(`
      CREATE TABLE IF NOT EXISTS addon_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        min_selections INTEGER DEFAULT 0 NOT NULL,
        max_selections INTEGER DEFAULT 1 NOT NULL,
        is_required BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 11. Addons
    await client.query(`
      CREATE TABLE IF NOT EXISTS addons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        addon_group_id UUID NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
        is_available BOOLEAN DEFAULT TRUE NOT NULL,
        display_order INTEGER DEFAULT 0 NOT NULL
      );
    `);

    // 12. Menu Item Addon Groups Join
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_item_addon_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        addon_group_id UUID NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
        display_order INTEGER DEFAULT 0 NOT NULL,
        CONSTRAINT unique_item_addon_group UNIQUE (menu_item_id, addon_group_id)
      );
    `);

    // 13. Table Sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS table_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE CASCADE,
        session_token VARCHAR(128) UNIQUE NOT NULL,
        guest_count INTEGER DEFAULT 2 NOT NULL,
        status VARCHAR(30) DEFAULT 'active' NOT NULL,
        opened_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        closed_at TIMESTAMPTZ,
        customer_name VARCHAR(100),
        customer_phone VARCHAR(50)
      );
    `);

    // 14. Orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE CASCADE,
        session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
        order_number VARCHAR(50) NOT NULL,
        status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) NOT NULL,
        service_charge_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        idempotency_key VARCHAR(128),
        customer_notes TEXT,
        kitchen_notes TEXT,
        cancellation_reason TEXT,
        cancelled_by VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
    `);

    // 15. Order Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
        variant_id UUID REFERENCES menu_item_variants(id) ON DELETE SET NULL,
        item_name_snapshot VARCHAR(150) NOT NULL,
        variant_name_snapshot VARCHAR(100),
        unit_price_snapshot DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        total_price_snapshot DECIMAL(10,2) NOT NULL,
        special_instructions TEXT,
        status VARCHAR(30) DEFAULT 'PENDING' NOT NULL
      );
    `);

    // 16. Order Item Addons
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_item_addons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
        addon_id UUID REFERENCES addons(id) ON DELETE SET NULL,
        addon_name_snapshot VARCHAR(100) NOT NULL,
        addon_price_snapshot DECIMAL(10,2) NOT NULL
      );
    `);

    // 17. Order Status History
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        from_status VARCHAR(30),
        to_status VARCHAR(30) NOT NULL,
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        actor_role VARCHAR(50) DEFAULT 'system' NOT NULL,
        notes TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 18. Service Requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE CASCADE,
        session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        notes TEXT,
        status VARCHAR(30) DEFAULT 'pending' NOT NULL,
        assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMPTZ
      );
    `);

    // 19. Payments
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        table_id UUID REFERENCES dining_tables(id) ON DELETE SET NULL,
        session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        receipt_number VARCHAR(50) UNIQUE NOT NULL,
        payment_method VARCHAR(30) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(30) DEFAULT 'completed' NOT NULL,
        notes TEXT,
        received_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 20. Restaurant Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE,
        enable_sound_notifications BOOLEAN DEFAULT TRUE NOT NULL,
        enable_customer_cancellation BOOLEAN DEFAULT TRUE NOT NULL,
        customer_cancellation_window_seconds INTEGER DEFAULT 120 NOT NULL,
        print_kitchen_token_on_accept BOOLEAN DEFAULT FALSE NOT NULL,
        tax_registration_number VARCHAR(100),
        receipt_footer_text TEXT DEFAULT 'Thank you for dining with us! Scan again soon.',
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 21. Audit Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100),
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    console.log('✅ All 20 tables and indexes migrated successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
