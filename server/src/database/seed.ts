import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Karan%40123@localhost:5432/matrix_cravio';

export async function seedDatabase() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('🌱 Starting comprehensive database seed for Matrix Cravio...');

  try {
    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const superadminPass = await bcrypt.hash('admin123', salt);
    const ownerPass = await bcrypt.hash('cravio123', salt);
    const managerPass = await bcrypt.hash('manager123', salt);
    const chefPass = await bcrypt.hash('chef123', salt);
    const waiterPass = await bcrypt.hash('waiter123', salt);
    const cashierPass = await bcrypt.hash('cashier123', salt);

    // 1. Clean existing records safely
    await client.query(`
      TRUNCATE TABLE audit_logs, payments, service_requests, order_status_history, 
      order_item_addons, order_items, orders, table_sessions, menu_item_addon_groups, 
      addons, addon_groups, menu_item_variants, menu_items, menu_categories, 
      table_qr_tokens, dining_tables, restaurant_settings, restaurant_users, restaurants, users 
      CASCADE;
    `);

    // 2. Insert Users
    const usersRes = await client.query(`
      INSERT INTO users (email, password_hash, full_name, phone, system_role)
      VALUES 
        ('admin@cravio.matrix.com', '${superadminPass}', 'Matrix System Admin', '+91 98765 00000', 'superadmin'),
        ('karan@craviobistro.com', '${ownerPass}', 'Karan Sharma', '+91 98765 11111', 'user'),
        ('priya@craviobistro.com', '${managerPass}', 'Priya Mehta', '+91 98765 22222', 'user'),
        ('chef.raj@craviobistro.com', '${chefPass}', 'Chef Rajesh Kumar', '+91 98765 33333', 'user'),
        ('waiter.arun@craviobistro.com', '${waiterPass}', 'Arun Verma', '+91 98765 44444', 'user'),
        ('cashier.neha@craviobistro.com', '${cashierPass}', 'Neha Singh', '+91 98765 55555', 'user')
      RETURNING id, email, full_name;
    `);

    const userMap: Record<string, string> = {};
    usersRes.rows.forEach(u => { userMap[u.email] = u.id; });

    // 3. Insert Restaurant
    const restRes = await client.query(`
      INSERT INTO restaurants (
        name, slug, tagline, description, logo_url, cover_url, 
        email, phone, address, city, postal_code, country, 
        currency_code, currency_symbol, tax_percentage, service_charge_percentage, 
        is_open, opening_time, closing_time, allow_ordering, auto_accept_orders
      ) VALUES (
        'Cravio Bistro & Lounge',
        'cravio-bistro-lounge',
        'Artisanal Flavors, Contemporary Comfort',
        'Modern dining destination blending authentic wood-fired culinary craft with farm-fresh produce, handcrafted cocktails, and seamless contactless ordering.',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
        'contact@craviobistro.com',
        '+91 11 4500 8900',
        'Plot 42, Cyber Hub Boulevard, Sector 24',
        'Gurugram',
        '122002',
        'India',
        'INR',
        '₹',
        5.00,
        5.00,
        true,
        '11:00',
        '23:30',
        true,
        false
      ) RETURNING id;
    `);
    const restId = restRes.rows[0].id;

    // 4. Restaurant Settings
    await client.query(`
      INSERT INTO restaurant_settings (
        restaurant_id, enable_sound_notifications, enable_customer_cancellation, 
        customer_cancellation_window_seconds, print_kitchen_token_on_accept, 
        tax_registration_number, receipt_footer_text
      ) VALUES (
        '${restId}', true, true, 180, false, 'GSTIN-07AAAAA0000A1Z5', 
        'Thank you for dining at Cravio Bistro & Lounge! We look forward to serving you again.'
      );
    `);

    // 5. Link Restaurant Users (Roles)
    await client.query(`
      INSERT INTO restaurant_users (restaurant_id, user_id, role)
      VALUES 
        ('${restId}', '${userMap['karan@craviobistro.com']}', 'owner'),
        ('${restId}', '${userMap['priya@craviobistro.com']}', 'manager'),
        ('${restId}', '${userMap['chef.raj@craviobistro.com']}', 'chef'),
        ('${restId}', '${userMap['waiter.arun@craviobistro.com']}', 'waiter'),
        ('${restId}', '${userMap['cashier.neha@craviobistro.com']}', 'cashier');
    `);

    // 6. Dining Tables
    const tablesRes = await client.query(`
      INSERT INTO dining_tables (restaurant_id, table_number, display_name, zone, capacity, status)
      VALUES 
        ('${restId}', 'T-01', 'Table 1 (Window Side)', 'Indoor Dining', 2, 'occupied'),
        ('${restId}', 'T-02', 'Table 2 (Center Booth)', 'Indoor Dining', 4, 'occupied'),
        ('${restId}', 'T-03', 'Table 3 (Family Booth)', 'Indoor Dining', 6, 'available'),
        ('${restId}', 'T-04', 'Table 4 (Cozy Corner)', 'Indoor Dining', 2, 'available'),
        ('${restId}', 'T-05', 'Table 5 (Skyline Terrace)', 'Terrace Garden', 4, 'occupied'),
        ('${restId}', 'T-06', 'Table 6 (Garden Gazebo)', 'Terrace Garden', 6, 'available'),
        ('${restId}', 'V-01', 'VIP Suite 1 (Emerald Room)', 'VIP Lounge', 8, 'available'),
        ('${restId}', 'B-01', 'Bar High-Top 1', 'Bar & Cocktails', 2, 'available')
      RETURNING id, table_number;
    `);

    const tableMap: Record<string, string> = {};
    tablesRes.rows.forEach(t => { tableMap[t.table_number] = t.id; });

    // 7. QR Tokens for Tables
    const qrTokens = [
      { tableNumber: 'T-01', token: 'crv_tok_table_01_window' },
      { tableNumber: 'T-02', token: 'crv_tok_table_02_booth' },
      { tableNumber: 'T-03', token: 'crv_tok_table_03_family' },
      { tableNumber: 'T-04', token: 'crv_tok_table_04_cozy' },
      { tableNumber: 'T-05', token: 'crv_tok_table_05_terrace' },
      { tableNumber: 'T-06', token: 'crv_tok_table_06_gazebo' },
      { tableNumber: 'V-01', token: 'crv_tok_vip_01_emerald' },
      { tableNumber: 'B-01', token: 'crv_tok_bar_01_hightop' },
    ];

    for (const qr of qrTokens) {
      await client.query(`
        INSERT INTO table_qr_tokens (restaurant_id, table_id, token)
        VALUES ('${restId}', '${tableMap[qr.tableNumber]}', '${qr.token}');
      `);
    }

    // 8. Menu Categories
    const catRes = await client.query(`
      INSERT INTO menu_categories (restaurant_id, name, description, icon, display_order)
      VALUES 
        ('${restId}', 'Signature Starters', 'Crispy appetizers, artisanal dips & sharing platters', 'Flame', 1),
        ('${restId}', 'Wood-Fired Pizzas', '48-hour fermented sourdough with San Marzano tomatoes', 'Pizza', 2),
        ('${restId}', 'Craft Burgers & Sliders', 'Brioche buns, double-smashed patties & house sauces', 'Sandwich', 3),
        ('${restId}', 'Artisanal Pastas & Mains', 'Hand-rolled fresh pasta and slow-braised delicacies', 'Utensils', 4),
        ('${restId}', 'Craft Beverages & Coolers', 'Botanical infusions, fresh mocktails & iced brews', 'GlassWater', 5),
        ('${restId}', 'Decadent Desserts', 'House-baked sweet finishes and artisanal gelatos', 'Cake', 6)
      RETURNING id, name;
    `);

    const catMap: Record<string, string> = {};
    catRes.rows.forEach(c => { catMap[c.name] = c.id; });

    // 9. Addon Groups
    const agRes = await client.query(`
      INSERT INTO addon_groups (restaurant_id, name, description, min_selections, max_selections, is_required)
      VALUES 
        ('${restId}', 'Select Gourmet Dip', 'Complement your dish with our chef-crafted dips', 0, 2, false),
        ('${restId}', 'Pizza Crust & Cheese Upgrades', 'Elevate your pizza experience', 0, 3, false),
        ('${restId}', 'Burger Add-ons', 'Load your burger with extra goodness', 0, 4, false)
      RETURNING id, name;
    `);

    const agMap: Record<string, string> = {};
    agRes.rows.forEach(g => { agMap[g.name] = g.id; });

    // Addons
    const dipGroup = agMap['Select Gourmet Dip'];
    const pizzaGroup = agMap['Pizza Crust & Cheese Upgrades'];
    const burgerGroup = agMap['Burger Add-ons'];

    const addonsRes = await client.query(`
      INSERT INTO addons (addon_group_id, name, price, display_order)
      VALUES 
        ('${dipGroup}', 'Black Truffle Mayo', 70.00, 1),
        ('${dipGroup}', 'Smoked Chipotle Aioli', 50.00, 2),
        ('${dipGroup}', 'Habanero Honey Glaze', 60.00, 3),
        ('${pizzaGroup}', 'Double Buffalo Mozzarella', 110.00, 1),
        ('${pizzaGroup}', 'Garlic Butter Cheese Stuffed Crust', 130.00, 2),
        ('${pizzaGroup}', 'Kalamata Olives & Sundried Tomatoes', 80.00, 3),
        ('${burgerGroup}', 'Double Melted Aged Cheddar', 65.00, 1),
        ('${burgerGroup}', 'Crispy Bacon Strips', 95.00, 2),
        ('${burgerGroup}', 'Caramelized Balsamic Onions', 45.00, 3),
        ('${burgerGroup}', 'Fried Free-Range Egg', 40.00, 4)
      RETURNING id, name;
    `);

    // 10. Menu Items
    const itemsRes = await client.query(`
      INSERT INTO menu_items (
        restaurant_id, category_id, name, description, base_price, 
        image_url, dietary_type, is_gluten_free, spiciness_level, 
        preparation_time_minutes, is_available, is_featured, allergens, display_order
      ) VALUES 
        (
          '${restId}', '${catMap['Signature Starters']}',
          'Truffle & Parmesan Fries',
          'Hand-cut skin-on Yukon potatoes tossed with white truffle oil, shaved 24-month Parmigiano-Reggiano, and fresh rosemary sea salt.',
          290.00,
          'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80',
          'veg', true, 0, 12, true, true, ARRAY['dairy'], 1
        ),
        (
          '${restId}', '${catMap['Signature Starters']}',
          'Smoked Burrata & Heirloom Bruschetta',
          'Artisanal sourdough crostini layered with basil pesto, heirloom cherry tomatoes, artisanal smoked pugliese burrata, and aged balsamic glaze.',
          380.00,
          'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
          'veg', false, 0, 15, true, true, ARRAY['dairy', 'gluten'], 2
        ),
        (
          '${restId}', '${catMap['Signature Starters']}',
          'Korean Glazed Crispy Chicken Tenders',
          'Double-fried buttermilk tender chicken tossed in sweet spicy gochujang glaze, toasted sesame seeds, and scallions.',
          420.00,
          'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80',
          'non_veg', false, 2, 18, true, false, ARRAY['sesame', 'soy', 'gluten'], 3
        ),
        (
          '${restId}', '${catMap['Wood-Fired Pizzas']}',
          'Classic Neapolitan Margherita',
          'San Marzano tomato sauce, fresh fior di latte mozzarella, whole fresh basil leaves, and extra virgin cold-pressed olive oil.',
          460.00,
          'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
          'veg', false, 0, 18, true, true, ARRAY['dairy', 'gluten'], 1
        ),
        (
          '${restId}', '${catMap['Wood-Fired Pizzas']}',
          'Wild Forest Mushroom & Truffle Pizza',
          'Roasted cremini and portobello mushrooms, fontina and taleggio cheeses, garlic confit, thyme, and black truffle oil drizzle.',
          580.00,
          'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
          'veg', false, 0, 20, true, true, ARRAY['dairy', 'gluten'], 2
        ),
        (
          '${restId}', '${catMap['Wood-Fired Pizzas']}',
          'Fiery Peri-Peri Spiced Chicken Pizza',
          'Charred shredded chicken, peri-peri San Marzano reduction, smoked mozzarella, pickled red jalapeños, and cilantro.',
          540.00,
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
          'non_veg', false, 2, 20, true, false, ARRAY['dairy', 'gluten'], 3
        ),
        (
          '${restId}', '${catMap['Craft Burgers & Sliders']}',
          'The Cravio Signature Smash Burger',
          'Double smashed Angus beef / prime patty, melted American cheddar, grilled buttered brioche bun, house secret Cravio sauce, and house dill pickles.',
          490.00,
          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
          'non_veg', false, 1, 15, true, true, ARRAY['dairy', 'gluten', 'egg'], 1
        ),
        (
          '${restId}', '${catMap['Craft Burgers & Sliders']}',
          'Crispy Halloumi & Guacamole Burger',
          'Golden pan-seared halloumi cheese block, smashed lime guacamole, roasted bell pepper coulis, and baby rocket on brioche.',
          440.00,
          'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
          'veg', false, 0, 15, true, false, ARRAY['dairy', 'gluten'], 2
        ),
        (
          '${restId}', '${catMap['Artisanal Pastas & Mains']}',
          'Creamy Wild Mushroom Pappardelle',
          'Fresh ribbon pasta ribbons folded in slow-cooked porcini mushroom cream, garlic butter, fresh parsley, and Grana Padano.',
          510.00,
          'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80',
          'veg', false, 0, 20, true, true, ARRAY['dairy', 'gluten'], 1
        ),
        (
          '${restId}', '${catMap['Artisanal Pastas & Mains']}',
          'Slow-Cooked Herb Chicken Fettuccine',
          'Tender sous-vide chicken breast slivers in roasted garlic sun-dried tomato cream sauce with wilted baby spinach.',
          550.00,
          'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=800&q=80',
          'non_veg', false, 0, 20, true, false, ARRAY['dairy', 'gluten'], 2
        ),
        (
          '${restId}', '${catMap['Craft Beverages & Coolers']}',
          'Smoked Rosemary & Passionfruit Fizz',
          'Hand-pressed passionfruit pulp, fresh lime juice, sparkling soda, and torched fragrant rosemary sprig.',
          240.00,
          'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
          'vegan', true, 0, 6, true, true, NULL, 1
        ),
        (
          '${restId}', '${catMap['Craft Beverages & Coolers']}',
          'Cold Brew Hazelnut Cream Latte',
          '18-hour single origin cold brew coffee concentrate topped with velvety frothed hazelnut oat milk cream.',
          260.00,
          'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80',
          'vegan', true, 0, 5, true, false, ARRAY['nuts'], 2
        ),
        (
          '${restId}', '${catMap['Decadent Desserts']}',
          'Belgian Molten Lava Cake',
          'Callebaut 70% dark chocolate warm center cake paired with house Madagascar vanilla bean gelato and berry compote.',
          360.00,
          'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
          'veg', false, 0, 15, true, true, ARRAY['dairy', 'gluten', 'egg'], 1
        ),
        (
          '${restId}', '${catMap['Decadent Desserts']}',
          'Classic Venetian Tiramisu Cup',
          'Espresso-soaked savoiardi ladyfingers, whipped mascarpone cream, dark cocoa dust, and dark chocolate curls.',
          320.00,
          'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80',
          'veg', false, 0, 8, true, true, ARRAY['dairy', 'gluten'], 2
        )
      RETURNING id, name;
    `);

    const itemMap: Record<string, string> = {};
    itemsRes.rows.forEach(i => { itemMap[i.name] = i.id; });

    // 11. Pizza Variants (Sizes)
    const margheritaId = itemMap['Classic Neapolitan Margherita'];
    if (margheritaId) {
      await client.query(`
        INSERT INTO menu_item_variants (menu_item_id, name, price_modifier, is_default, display_order)
        VALUES 
          ('${margheritaId}', '10-inch Regular', 0.00, true, 1),
          ('${margheritaId}', '12-inch Classic', 140.00, false, 2),
          ('${margheritaId}', '14-inch Grande', 260.00, false, 3);
      `);
      // Link addon groups
      await client.query(`
        INSERT INTO menu_item_addon_groups (menu_item_id, addon_group_id, display_order)
        VALUES 
          ('${margheritaId}', '${pizzaGroup}', 1),
          ('${margheritaId}', '${dipGroup}', 2);
      `);
    }

    const smashBurgerId = itemMap['The Cravio Signature Smash Burger'];
    if (smashBurgerId) {
      await client.query(`
        INSERT INTO menu_item_variants (menu_item_id, name, price_modifier, is_default, display_order)
        VALUES 
          ('${smashBurgerId}', 'Single Patty', 0.00, true, 1),
          ('${smashBurgerId}', 'Double Patty Deluxe', 120.00, false, 2);
      `);
      await client.query(`
        INSERT INTO menu_item_addon_groups (menu_item_id, addon_group_id, display_order)
        VALUES 
          ('${smashBurgerId}', '${burgerGroup}', 1),
          ('${smashBurgerId}', '${dipGroup}', 2);
      `);
    }

    const friesId = itemMap['Truffle & Parmesan Fries'];
    if (friesId) {
      await client.query(`
        INSERT INTO menu_item_addon_groups (menu_item_id, addon_group_id, display_order)
        VALUES ('${friesId}', '${dipGroup}', 1);
      `);
    }

    // 12. Seed Table Sessions
    const t01Id = tableMap['T-01'];
    const t02Id = tableMap['T-02'];
    const t03Id = tableMap['T-03'];
    const t05Id = tableMap['T-05'];

    const sessRes = await client.query(`
      INSERT INTO table_sessions (restaurant_id, table_id, session_token, guest_count, status, customer_name, customer_phone)
      VALUES 
        ('${restId}', '${t01Id}', 'sess_t01_active_001', 2, 'active', 'Aarav Gupta', '+91 98111 22233'),
        ('${restId}', '${t02Id}', 'sess_t02_active_002', 4, 'active', 'Rohan Mathur', '+91 98222 33344'),
        ('${restId}', '${t05Id}', 'sess_t05_active_003', 3, 'active', 'Ananya Sen', '+91 98333 44455')
      RETURNING id, table_id;
    `);

    const sessMap: Record<string, string> = {};
    sessRes.rows.forEach(s => { sessMap[s.table_id] = s.id; });

    // 13. Seed Orders & Items
    // Order 1 on T-01: PREPARING
    const o1Res = await client.query(`
      INSERT INTO orders (
        restaurant_id, table_id, session_id, order_number, status, 
        subtotal, tax_amount, service_charge_amount, discount_amount, total_amount, 
        customer_notes, idempotency_key
      ) VALUES (
        '${restId}', '${t01Id}', '${sessMap[t01Id]}', '#CRV-1001', 'PREPARING', 
        870.00, 43.50, 43.50, 0.00, 957.00, 
        'Please make the Margherita pizza extra crispy and hot.', 'idemp_order_1001'
      ) RETURNING id;
    `);
    const o1Id = o1Res.rows[0].id;

    // Order 1 Items
    const oi1 = await client.query(`
      INSERT INTO order_items (order_id, menu_item_id, item_name_snapshot, variant_name_snapshot, unit_price_snapshot, quantity, total_price_snapshot, special_instructions)
      VALUES 
        ('${o1Id}', '${margheritaId}', 'Classic Neapolitan Margherita', '10-inch Regular', 460.00, 1, 460.00, 'Extra crispy crust'),
        ('${o1Id}', '${friesId}', 'Truffle & Parmesan Fries', NULL, 290.00, 1, 290.00, 'Extra parmesan please'),
        ('${o1Id}', '${itemMap['Smoked Rosemary & Passionfruit Fizz']}', 'Smoked Rosemary & Passionfruit Fizz', NULL, 120.00, 1, 120.00, NULL)
      RETURNING id;
    `);

    // Add Status History for Order 1
    await client.query(`
      INSERT INTO order_status_history (order_id, from_status, to_status, actor_role, notes)
      VALUES 
        ('${o1Id}', NULL, 'PENDING', 'customer', 'Customer placed order from table QR'),
        ('${o1Id}', 'PENDING', 'ACCEPTED', 'chef', 'Kitchen accepted order'),
        ('${o1Id}', 'ACCEPTED', 'PREPARING', 'chef', 'Chef Rajesh started wood-fire oven preparation');
    `);

    // Order 2 on T-02: READY to serve
    const o2Res = await client.query(`
      INSERT INTO orders (
        restaurant_id, table_id, session_id, order_number, status, 
        subtotal, tax_amount, service_charge_amount, discount_amount, total_amount, 
        customer_notes, idempotency_key
      ) VALUES (
        '${restId}', '${t02Id}', '${sessMap[t02Id]}', '#CRV-1002', 'READY', 
        1030.00, 51.50, 51.50, 0.00, 1133.00, 
        'Less spicy for the smash burger.', 'idemp_order_1002'
      ) RETURNING id;
    `);
    const o2Id = o2Res.rows[0].id;

    await client.query(`
      INSERT INTO order_items (order_id, menu_item_id, item_name_snapshot, variant_name_snapshot, unit_price_snapshot, quantity, total_price_snapshot, special_instructions)
      VALUES 
        ('${o2Id}', '${smashBurgerId}', 'The Cravio Signature Smash Burger', 'Single Patty', 490.00, 1, 490.00, 'Less spicy sauce'),
        ('${o2Id}', '${itemMap['Wild Forest Mushroom & Truffle Pizza']}', 'Wild Forest Mushroom & Truffle Pizza', NULL, 580.00, 1, 580.00, NULL);
    `);

    await client.query(`
      INSERT INTO order_status_history (order_id, from_status, to_status, actor_role, notes)
      VALUES 
        ('${o2Id}', NULL, 'PENDING', 'customer', 'Table order placed'),
        ('${o2Id}', 'PENDING', 'ACCEPTED', 'manager', 'Order accepted by Priya'),
        ('${o2Id}', 'ACCEPTED', 'PREPARING', 'chef', 'Prepared by kitchen team'),
        ('${o2Id}', 'PREPARING', 'READY', 'chef', 'Hot food plated and ready for pickup');
    `);

    // Order 3 on T-05: PENDING (Brand new order)
    const o3Res = await client.query(`
      INSERT INTO orders (
        restaurant_id, table_id, session_id, order_number, status, 
        subtotal, tax_amount, service_charge_amount, discount_amount, total_amount, 
        customer_notes, idempotency_key
      ) VALUES (
        '${restId}', '${t05Id}', '${sessMap[t05Id]}', '#CRV-1003', 'PENDING', 
        680.00, 34.00, 34.00, 0.00, 748.00, 
        'Quick service please, celebration table.', 'idemp_order_1003'
      ) RETURNING id;
    `);
    const o3Id = o3Res.rows[0].id;

    await client.query(`
      INSERT INTO order_items (order_id, menu_item_id, item_name_snapshot, variant_name_snapshot, unit_price_snapshot, quantity, total_price_snapshot)
      VALUES 
        ('${o3Id}', '${itemMap['Smoked Burrata & Heirloom Bruschetta']}', 'Smoked Burrata & Heirloom Bruschetta', NULL, 380.00, 1, 380.00),
        ('${o3Id}', '${itemMap['Belgian Molten Lava Cake']}', 'Belgian Molten Lava Cake', NULL, 360.00, 1, 360.00);
    `);

    await client.query(`
      INSERT INTO order_status_history (order_id, from_status, to_status, actor_role, notes)
      VALUES ('${o3Id}', NULL, 'PENDING', 'customer', 'New mobile order placed');
    `);

    // 14. Seed Service Requests
    await client.query(`
      INSERT INTO service_requests (restaurant_id, table_id, session_id, type, notes, status)
      VALUES 
        ('${restId}', '${t01Id}', '${sessMap[t01Id]}', 'request_water', 'Chilled sparkling water requested', 'pending'),
        ('${restId}', '${t05Id}', '${sessMap[t05Id]}', 'call_waiter', 'Assistance needed with wine list', 'pending');
    `);

    // 15. Seed Past Payments for Analytics & Reports
    await client.query(`
      INSERT INTO payments (restaurant_id, table_id, receipt_number, payment_method, amount, status, notes)
      VALUES 
        ('${restId}', '${t01Id}', 'REC-20261024-001', 'card', 1450.00, 'completed', 'Visa contactless terminal'),
        ('${restId}', '${t02Id}', 'REC-20261024-002', 'upi', 2180.00, 'completed', 'UPI QR GPay payment'),
        ('${restId}', '${t03Id}', 'REC-20261024-003', 'cash', 920.00, 'completed', 'Cash counter settlement');
    `);

    // 16. Seed Audit Logs
    await client.query(`
      INSERT INTO audit_logs (restaurant_id, user_id, action, entity_type, entity_id, details)
      VALUES 
        ('${restId}', '${userMap['karan@craviobistro.com']}', 'RESTAURANT_INITIALIZED', 'restaurant', '${restId}', '{"initialSetup": true}'),
        ('${restId}', '${userMap['priya@craviobistro.com']}', 'QR_TOKENS_GENERATED', 'tables', 'ALL', '{"tablesCount": 8}');
    `);

    console.log('🎉 Database successfully seeded with rich commercial data!');
    console.log(`Demo Restaurant ID: ${restId}`);
    console.log('Admin: admin@cravio.matrix.com / admin123');
    console.log('Owner: karan@craviobistro.com / cravio123');
    console.log('Chef: chef.raj@craviobistro.com / chef123');
    console.log('Waiter: waiter.arun@craviobistro.com / waiter123');
    console.log('Sample QR Table 1 URL: /menu/crv_tok_table_01_window');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
