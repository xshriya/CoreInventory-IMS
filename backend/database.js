const Database = require('better-sqlite3');
const db = new Database('inventory.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login_id TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
        email TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expires_at INTEGER NOT NULL
    );

    -- Warehouses
    CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Locations within warehouses
    CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        warehouse_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        UNIQUE(warehouse_id, code)
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        unit TEXT DEFAULT 'pcs',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Stock (current inventory levels)
    CREATE TABLE IF NOT EXISTS stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL UNIQUE,
        location_id INTEGER,
        on_hand INTEGER DEFAULT 0,
        allocated INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    -- Receipts (inbound)
    CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT NOT NULL UNIQUE,
        receipt_date DATE,
        supplier TEXT,
        from_location TEXT,
        to_location TEXT,
        contact TEXT,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Receipt Items
    CREATE TABLE IF NOT EXISTS receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Deliveries (outbound)
    CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT NOT NULL UNIQUE,
        delivery_date DATE,
        customer TEXT,
        from_location TEXT,
        to_location TEXT,
        contact TEXT,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Delivery Items
    CREATE TABLE IF NOT EXISTS delivery_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Stock Movements (history)
    CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT NOT NULL UNIQUE,
        product_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL,
        from_location TEXT,
        to_location TEXT,
        quantity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
`);

// Seed demo data for demonstration
const seedData = () => {
    // Check if already seeded
    const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
    if (existingProducts.count > 0) return;

    // Seed Warehouses
    db.prepare("INSERT INTO warehouses (name, code) VALUES (?, ?)").run('Main Warehouse', 'WH-01');
    db.prepare("INSERT INTO warehouses (name, code) VALUES (?, ?)").run('Distribution Center', 'DC-01');

    // Seed Locations
    db.prepare("INSERT INTO locations (warehouse_id, name, code) VALUES (?, ?, ?)").run(1, 'Receiving Area', 'WH-01-RCV');
    db.prepare("INSERT INTO locations (warehouse_id, name, code) VALUES (?, ?, ?)").run(1, 'Storage A', 'WH-01-A');
    db.prepare("INSERT INTO locations (warehouse_id, name, code) VALUES (?, ?, ?)").run(1, 'Storage B', 'WH-01-B');
    db.prepare("INSERT INTO locations (warehouse_id, name, code) VALUES (?, ?, ?)").run(2, 'Shipping Dock', 'DC-01-SHP');

    // Seed Products
    const products = [
        { sku: 'LAPTOP-001', name: 'Dell Laptop XPS 15', unit: 'pcs' },
        { sku: 'MONITOR-001', name: 'Samsung 27" Monitor', unit: 'pcs' },
        { sku: 'KEYBOARD-001', name: 'Logitech Mechanical Keyboard', unit: 'pcs' },
        { sku: 'MOUSE-001', name: 'Wireless Mouse', unit: 'pcs' },
        { sku: 'CABLE-001', name: 'USB-C Cable 2m', unit: 'pcs' },
        { sku: 'CHAIR-001', name: 'Ergonomic Office Chair', unit: 'pcs' },
        { sku: 'DESK-001', name: 'Standing Desk', unit: 'pcs' },
        { sku: 'HEADSET-001', name: 'Bluetooth Headset', unit: 'pcs' }
    ];

    for (const p of products) {
        const result = db.prepare('INSERT INTO products (sku, name, unit) VALUES (?, ?, ?)').run(p.sku, p.name, p.unit);
        
        // Seed Stock for each product
        const onHand = Math.floor(Math.random() * 100) + 20;
        const allocated = Math.floor(Math.random() * 10);
        db.prepare('INSERT INTO stock (product_id, on_hand, allocated) VALUES (?, ?, ?)').run(result.lastInsertRowid, onHand, allocated);
    }

    // Seed Receipts
    const receipts = [
        { ref: 'WH/IN/0001', date: '2026-03-10', supplier: 'TechSupply Co.', status: 'done' },
        { ref: 'WH/IN/0002', date: '2026-03-12', supplier: 'Global Electronics', status: 'done' },
        { ref: 'WH/IN/0003', date: '2026-03-14', supplier: 'Office Solutions', status: 'ready' },
        { ref: 'WH/IN/0004', date: '2026-03-15', supplier: 'TechSupply Co.', status: 'draft' }
    ];

    for (const r of receipts) {
        db.prepare('INSERT INTO receipts (reference, receipt_date, supplier, status) VALUES (?, ?, ?, ?)').run(r.ref, r.date, r.supplier, r.status);
    }

    // Seed Receipt Items
    db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(1, 1, 25);
    db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(1, 2, 30);
    db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(2, 3, 50);
    db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(2, 4, 100);
    db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(2, 5, 200);
    db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(3, 6, 15);
    db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)').run(3, 7, 10);

    // Seed Deliveries
    const deliveries = [
        { ref: 'WH/OUT/0001', date: '2026-03-11', customer: 'Acme Corporation', status: 'done' },
        { ref: 'WH/OUT/0002', date: '2026-03-13', customer: 'TechStart Inc.', status: 'done' },
        { ref: 'WH/OUT/0003', date: '2026-03-14', customer: 'Global Retail Ltd.', status: 'ready' },
        { ref: 'WH/OUT/0004', date: '2026-03-15', customer: 'Smart Solutions', status: 'draft' }
    ];

    for (const d of deliveries) {
        db.prepare('INSERT INTO deliveries (reference, delivery_date, customer, status) VALUES (?, ?, ?, ?)').run(d.ref, d.date, d.customer, d.status);
    }

    // Seed Delivery Items
    db.prepare('INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES (?, ?, ?)').run(1, 1, 5);
    db.prepare('INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES (?, ?, ?)').run(1, 2, 10);
    db.prepare('INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES (?, ?, ?)').run(2, 3, 20);
    db.prepare('INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES (?, ?, ?)').run(2, 4, 30);
    db.prepare('INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES (?, ?, ?)').run(3, 5, 50);
    db.prepare('INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES (?, ?, ?)').run(3, 8, 15);

    // Seed Stock Movements
    db.prepare("INSERT INTO stock_movements (reference, product_id, movement_type, from_location, to_location, quantity) VALUES (?, ?, 'receipt', 'TechSupply Co.', 'Main Warehouse', 25)").run('MOV-001', 1);
    db.prepare("INSERT INTO stock_movements (reference, product_id, movement_type, from_location, to_location, quantity) VALUES (?, ?, 'receipt', 'TechSupply Co.', 'Main Warehouse', 30)").run('MOV-002', 2);
    db.prepare("INSERT INTO stock_movements (reference, product_id, movement_type, from_location, to_location, quantity) VALUES (?, ?, 'delivery', 'Main Warehouse', 'Acme Corporation', 5)").run('MOV-003', 1);
    db.prepare("INSERT INTO stock_movements (reference, product_id, movement_type, from_location, to_location, quantity) VALUES (?, ?, 'delivery', 'Main Warehouse', 'Acme Corporation', 10)").run('MOV-004', 2);

    console.log('Demo data seeded successfully');
};

seedData();

module.exports = db;