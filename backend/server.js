require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./database');
const { JWT_SECRET } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'CoreInventory IMS API is running' });
});

// ============================================
// DASHBOARD API
// ============================================

app.get('/api/dashboard/summary', (req, res) => {
    try {
        const totalReceipts = db.prepare('SELECT COUNT(*) as count FROM receipts').get().count;
        const totalDeliveries = db.prepare('SELECT COUNT(*) as count FROM deliveries').get().count;
        const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        const totalStock = db.prepare('SELECT COALESCE(SUM(on_hand), 0) as total FROM stock').get().total;
        
        const pendingReceipts = db.prepare("SELECT COUNT(*) as count FROM receipts WHERE status IN ('draft', 'ready')").get().count;
        const pendingDeliveries = db.prepare("SELECT COUNT(*) as count FROM deliveries WHERE status IN ('draft', 'waiting', 'ready')").get().count;
        
        const lateReceipts = db.prepare("SELECT COUNT(*) as count FROM receipts WHERE status != 'done' AND receipt_date < date('now')").get().count;
        const lateDeliveries = db.prepare("SELECT COUNT(*) as count FROM deliveries WHERE status != 'done' AND delivery_date < date('now')").get().count;

        res.json({
            totalReceipts,
            totalDeliveries,
            totalProducts,
            totalStock,
            pendingReceipts,
            pendingDeliveries,
            lateReceipts,
            lateDeliveries
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch dashboard summary' });
    }
});

// ============================================
// PRODUCTS API
// ============================================

app.get('/api/products', (req, res) => {
    try {
        const products = db.prepare(`
            SELECT p.*, COALESCE(s.on_hand, 0) as stock_on_hand, COALESCE(s.allocated, 0) as stock_allocated
            FROM products p
            LEFT JOIN stock s ON p.id = s.product_id
            ORDER BY p.created_at DESC
        `).all();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.post('/api/products', (req, res) => {
    const { sku, name, description, unit } = req.body;
    
    if (!sku || !name) {
        return res.status(400).json({ error: 'SKU and name are required' });
    }
    
    try {
        const result = db.prepare('INSERT INTO products (sku, name, description, unit) VALUES (?, ?, ?, ?)').run(sku, name, description, unit || 'pcs');
        
        // Initialize stock record
        db.prepare('INSERT INTO stock (product_id, on_hand, allocated) VALUES (?, 0, 0)').run(result.lastInsertRowid);
        
        res.status(201).json({ id: result.lastInsertRowid, sku, name, description, unit });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'SKU already exists' });
        }
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// ============================================
// STOCK API
// ============================================

app.get('/api/stock', (req, res) => {
    try {
        const stock = db.prepare(`
            SELECT s.*, p.sku, p.name as product_name, p.unit
            FROM stock s
            JOIN products p ON s.product_id = p.id
            ORDER BY p.name
        `).all();
        res.json(stock);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stock' });
    }
});

// Add or update stock (creates product if not exists)
app.post('/api/stock', (req, res) => {
    const { product_name, sku, quantity, unit_cost } = req.body;
    
    if (!product_name) {
        return res.status(400).json({ error: 'Product name is required' });
    }
    
    if (!quantity || quantity < 0) {
        return res.status(400).json({ error: 'Valid quantity is required' });
    }
    
    try {
        // Find or create product
        let product = db.prepare('SELECT id FROM products WHERE name = ? OR sku = ?').get(product_name, sku || product_name);
        
        if (!product) {
            // Create new product
            const productSku = sku || product_name.toUpperCase().replace(/\s+/g, '-').substring(0, 20);
            const result = db.prepare('INSERT INTO products (sku, name, unit) VALUES (?, ?, ?)').run(productSku, product_name, 'pcs');
            const productId = result.lastInsertRowid;
            
            // Create stock record
            db.prepare('INSERT INTO stock (product_id, on_hand, allocated) VALUES (?, ?, 0)').run(productId, quantity);
            
            res.status(201).json({ 
                id: productId, 
                product_id: productId,
                product_name, 
                sku: productSku, 
                on_hand: quantity, 
                allocated: 0,
                free_to_use: quantity,
                message: 'Product created and stock added'
            });
        } else {
            // Update existing stock
            db.prepare('UPDATE stock SET on_hand = on_hand + ? WHERE product_id = ?').run(quantity, product.id);
            
            // Get updated stock
            const stock = db.prepare('SELECT s.*, p.sku, p.name as product_name FROM stock s JOIN products p ON s.product_id = p.id WHERE s.product_id = ?').get(product.id);
            
            res.json({ 
                ...stock, 
                free_to_use: stock.on_hand - stock.allocated,
                message: 'Stock updated successfully' 
            });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to add stock', details: err.message });
    }
});

// Update stock directly (for manual adjustments)
app.put('/api/stock/:productId', (req, res) => {
    const { productId } = req.params;
    const { on_hand, allocated } = req.body;
    
    try {
        const stock = db.prepare('SELECT * FROM stock WHERE product_id = ?').get(productId);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        
        // Validate free_to_use (on_hand - allocated) cannot be negative
        const newOnHand = on_hand !== undefined ? on_hand : stock.on_hand;
        const newAllocated = allocated !== undefined ? allocated : stock.allocated;
        
        if (newAllocated > newOnHand) {
            return res.status(400).json({ error: 'Allocated cannot exceed on hand quantity' });
        }
        
        db.prepare('UPDATE stock SET on_hand = ?, allocated = ? WHERE product_id = ?').run(newOnHand, newAllocated, productId);
        
        const updated = db.prepare('SELECT s.*, p.sku, p.name as product_name FROM stock s JOIN products p ON s.product_id = p.id WHERE s.product_id = ?').get(productId);
        
        res.json({ ...updated, free_to_use: updated.on_hand - updated.allocated });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// ============================================
// RECEIPTS API
// ============================================

app.get('/api/receipts', (req, res) => {
    try {
        const { status, search } = req.query;
        let query = `
            SELECT r.*, 
                   (SELECT COUNT(*) FROM receipt_items WHERE receipt_id = r.id) as item_count,
                   (SELECT SUM(quantity) FROM receipt_items WHERE receipt_id = r.id) as total_quantity
            FROM receipts r
            WHERE 1=1
        `;
        const params = [];
        
        if (status && status !== 'all') {
            query += ' AND r.status = ?';
            params.push(status);
        }
        
        if (search) {
            query += ' AND (r.reference LIKE ? OR r.supplier LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY r.created_at DESC';
        
        const receipts = db.prepare(query).all(...params);
        res.json(receipts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch receipts' });
    }
});

app.get('/api/receipts/:id', (req, res) => {
    try {
        const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(req.params.id);
        
        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }
        
        const items = db.prepare(`
            SELECT ri.*, p.sku, p.name as product_name, p.unit
            FROM receipt_items ri
            JOIN products p ON ri.product_id = p.id
            WHERE ri.receipt_id = ?
        `).all(req.params.id);
        
        res.json({ ...receipt, items });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch receipt' });
    }
});

app.post('/api/receipts', (req, res) => {
    const { reference, receipt_date, supplier, from_location, to_location, contact, status, items } = req.body;
    
    if (!reference) {
        return res.status(400).json({ error: 'Reference is required' });
    }
    
    try {
        const existing = db.prepare('SELECT id FROM receipts WHERE reference = ?').get(reference);
        if (existing) {
            return res.status(400).json({ error: 'Reference already exists' });
        }
        
        const result = db.prepare('INSERT INTO receipts (reference, receipt_date, supplier, from_location, to_location, contact, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            reference,
            receipt_date || null,
            supplier || null,
            from_location || null,
            to_location || null,
            contact || null,
            status || 'draft'
        );
        
        const receiptId = result.lastInsertRowid;
        
        // Add items and update stock if status is 'done'
        if (items && items.length > 0) {
            const insertItem = db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)');
            const updateStock = db.prepare('UPDATE stock SET on_hand = on_hand + ? WHERE product_id = ?');
            const insertStock = db.prepare('INSERT INTO stock (product_id, on_hand, allocated) VALUES (?, ?, 0)');
            const insertMovement = db.prepare(`
                INSERT INTO stock_movements (reference, product_id, movement_type, from_location, to_location, quantity)
                VALUES (?, ?, 'receipt', ?, 'Warehouse', ?)
            `);
            
            for (const item of items) {
                // Handle both product_id and product_name
                let productId = item.product_id;
                if (!productId && item.product_name) {
                    // Find or create product by name
                    let product = db.prepare('SELECT id FROM products WHERE name = ? OR sku = ?').get(item.product_name, item.sku || item.product_name);
                    
                    if (!product) {
                        // Create new product
                        const productSku = item.sku || item.product_name.toUpperCase().replace(/\s+/g, '-').substring(0, 20);
                        const result = db.prepare('INSERT INTO products (sku, name, unit) VALUES (?, ?, ?)').run(productSku, item.product_name, item.unit || 'pcs');
                        productId = result.lastInsertRowid;
                    } else {
                        productId = product.id;
                    }
                }
                
                if (productId && item.quantity > 0) {
                    insertItem.run(receiptId, productId, item.quantity);
                    
                    if (status === 'done') {
                        // Check if stock record exists
                        const existingStock = db.prepare('SELECT id FROM stock WHERE product_id = ?').get(productId);
                        if (existingStock) {
                            updateStock.run(item.quantity, productId);
                        } else {
                            insertStock.run(productId, item.quantity);
                        }
                        insertMovement.run(`REC/${receiptId}`, productId, supplier || 'External', item.quantity);
                    }
                }
            }
        }
        
        res.status(201).json({ id: receiptId, reference, receipt_date, supplier, status });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create receipt', details: err.message });
    }
});

app.put('/api/receipts/:id', (req, res) => {
    const { id } = req.params;
    const { reference, receipt_date, supplier, from_location, to_location, contact, status, items } = req.body;
    
    try {
        const existing = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Receipt not found' });
        }
        
        // Update receipt
        db.prepare('UPDATE receipts SET reference = ?, receipt_date = ?, supplier = ?, from_location = ?, to_location = ?, contact = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
            reference || existing.reference,
            receipt_date || existing.receipt_date,
            supplier || existing.supplier,
            from_location || existing.from_location,
            to_location || existing.to_location,
            contact || existing.contact,
            status || existing.status,
            id
        );
        
        // Handle items update
        if (items !== undefined) {
            // Delete existing items
            db.prepare('DELETE FROM receipt_items WHERE receipt_id = ?').run(id);
            
            if (items && items.length > 0) {
                const insertItem = db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES (?, ?, ?)');
                const updateStock = db.prepare('UPDATE stock SET on_hand = on_hand + ? WHERE product_id = ?');
                const insertStock = db.prepare('INSERT INTO stock (product_id, on_hand, allocated) VALUES (?, ?, 0)');
                const insertMovement = db.prepare(`
                    INSERT INTO stock_movements (reference, product_id, movement_type, from_location, to_location, quantity)
                    VALUES (?, ?, 'receipt', ?, 'Warehouse', ?)
                `);
                
                for (const item of items) {
                    // Handle both product_id and product_name
                    let productId = item.product_id;
                    if (!productId && item.product_name) {
                        // Find or create product by name
                        let product = db.prepare('SELECT id FROM products WHERE name = ? OR sku = ?').get(item.product_name, item.sku || item.product_name);
                        
                        if (!product) {
                            // Create new product
                            const productSku = item.sku || item.product_name.toUpperCase().replace(/\s+/g, '-').substring(0, 20);
                            const result = db.prepare('INSERT INTO products (sku, name, unit) VALUES (?, ?, ?)').run(productSku, item.product_name, item.unit || 'pcs');
                            productId = result.lastInsertRowid;
                        } else {
                            productId = product.id;
                        }
                    }
                    
                    if (productId && item.quantity > 0) {
                        insertItem.run(id, productId, item.quantity);
                        
                        // If transitioning to 'done', update stock
                        if (status === 'done' && existing.status !== 'done') {
                            // Check if stock record exists
                            const existingStock = db.prepare('SELECT id FROM stock WHERE product_id = ?').get(productId);
                            if (existingStock) {
                                updateStock.run(item.quantity, productId);
                            } else {
                                insertStock.run(productId, item.quantity);
                            }
                            insertMovement.run(`REC/${id}`, productId, supplier || 'External', item.quantity);
                        }
                    }
                }
            }
        }
        
        res.json({ id, reference, receipt_date, supplier, status });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update receipt', details: err.message });
    }
});

// ============================================
// DELIVERIES API
// ============================================

app.get('/api/deliveries', (req, res) => {
    try {
        const { status, search } = req.query;
        let query = `
            SELECT d.*,
                   (SELECT COUNT(*) FROM delivery_items WHERE delivery_id = d.id) as item_count,
                   (SELECT SUM(quantity) FROM delivery_items WHERE delivery_id = d.id) as total_quantity
            FROM deliveries d
            WHERE 1=1
        `;
        const params = [];
        
        if (status && status !== 'all') {
            query += ' AND d.status = ?';
            params.push(status);
        }
        
        if (search) {
            query += ' AND (d.reference LIKE ? OR d.customer LIKE ? OR d.contact LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY d.created_at DESC';
        
        const deliveries = db.prepare(query).all(...params);
        res.json(deliveries);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
});

app.get('/api/deliveries/:id', (req, res) => {
    try {
        const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
        
        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }
        
        const items = db.prepare(`
            SELECT di.*, p.sku, p.name as product_name, p.unit, COALESCE(s.on_hand, 0) as available_stock
            FROM delivery_items di
            JOIN products p ON di.product_id = p.id
            LEFT JOIN stock s ON p.id = s.product_id
            WHERE di.delivery_id = ?
        `).all(req.params.id);
        
        res.json({ ...delivery, items });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch delivery' });
    }
});

app.post('/api/deliveries', (req, res) => {
    const { reference, delivery_date, customer, from_location, to_location, contact, status, items } = req.body;
    
    if (!reference) {
        return res.status(400).json({ error: 'Reference is required' });
    }
    
    try {
        // Check if reference already exists
        const existing = db.prepare('SELECT id FROM deliveries WHERE reference = ?').get(reference);
        if (existing) {
            return res.status(400).json({ error: 'Reference already exists' });
        }
        
        const result = db.prepare(`
            INSERT INTO deliveries (reference, delivery_date, customer, from_location, to_location, contact, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            reference,
            delivery_date || null,
            customer || null,
            from_location || null,
            to_location || null,
            contact || null,
            status || 'draft'
        );
        
        const deliveryId = result.lastInsertRowid;
        
        // Add items and update stock if status is 'done'
        if (items && items.length > 0) {
            const insertItem = db.prepare('INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES (?, ?, ?)');
            const updateStock = db.prepare('UPDATE stock SET on_hand = on_hand - ? WHERE product_id = ?');
            const insertMovement = db.prepare(`
                INSERT INTO stock_movements (reference, product_id, movement_type, from_location, to_location, quantity)
                VALUES (?, ?, 'delivery', ?, ?, ?)
            `);
            
            for (const item of items) {
                // Handle both product_id and product_name
                let productId = item.product_id;
                if (!productId && item.product_name) {
                    // Find product by name or SKU
                    const product = db.prepare('SELECT id FROM products WHERE name = ? OR sku = ?').get(item.product_name, item.product_name);
                    if (product) {
                        productId = product.id;
                    }
                }
                
                if (productId && item.quantity > 0) {
                    // Validate stock availability if status is 'done'
                    if (status === 'done') {
                        const stock = db.prepare('SELECT on_hand FROM stock WHERE product_id = ?').get(productId);
                        if (!stock || stock.on_hand < item.quantity) {
                            return res.status(400).json({ 
                                error: `Insufficient stock for product. Available: ${stock?.on_hand || 0}, Requested: ${item.quantity}` 
                            });
                        }
                    }
                    
                    insertItem.run(deliveryId, productId, item.quantity);
                    
                    if (status === 'done') {
                        updateStock.run(item.quantity, productId);
                        insertMovement.run(`DEL/${deliveryId}`, productId, from_location || 'Warehouse', to_location || 'External', item.quantity);
                    }
                }
            }
        }
        
        res.status(201).json({ id: deliveryId, reference, delivery_date, customer, status });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create delivery', details: err.message });
    }
});

app.put('/api/deliveries/:id', (req, res) => {
    const { id } = req.params;
    const { reference, delivery_date, customer, from_location, to_location, contact, status, items } = req.body;
    
    try {
        const existing = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Delivery not found' });
        }
        
        // Update delivery
        db.prepare(`
            UPDATE deliveries 
            SET reference = ?, delivery_date = ?, customer = ?, from_location = ?, to_location = ?, contact = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(
            reference || existing.reference,
            delivery_date || existing.delivery_date,
            customer || existing.customer,
            from_location || existing.from_location,
            to_location || existing.to_location,
            contact || existing.contact,
            status || existing.status,
            id
        );
        
        // Handle items update
        if (items !== undefined) {
            // Delete existing items
            db.prepare('DELETE FROM delivery_items WHERE delivery_id = ?').run(id);
            
            if (items && items.length > 0) {
                const insertItem = db.prepare('INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES (?, ?, ?)');
                const updateStock = db.prepare('UPDATE stock SET on_hand = on_hand - ? WHERE product_id = ?');
                const insertMovement = db.prepare(`
                    INSERT INTO stock_movements (reference, product_id, movement_type, from_location, to_location, quantity)
                    VALUES (?, ?, 'delivery', ?, ?, ?)
                `);
                
                for (const item of items) {
                    // Handle both product_id and product_name
                    let productId = item.product_id;
                    if (!productId && item.product_name) {
                        // Find product by name or SKU
                        const product = db.prepare('SELECT id FROM products WHERE name = ? OR sku = ?').get(item.product_name, item.product_name);
                        if (product) {
                            productId = product.id;
                        }
                    }
                    
                    if (productId && item.quantity > 0) {
                        // Validate stock if transitioning to 'done'
                        if (status === 'done' && existing.status !== 'done') {
                            const stock = db.prepare('SELECT on_hand FROM stock WHERE product_id = ?').get(productId);
                            if (!stock || stock.on_hand < item.quantity) {
                                return res.status(400).json({ 
                                    error: `Insufficient stock for product. Available: ${stock?.on_hand || 0}, Requested: ${item.quantity}` 
                                });
                            }
                        }
                        
                        insertItem.run(id, productId, item.quantity);
                        
                        if (status === 'done' && existing.status !== 'done') {
                            updateStock.run(item.quantity, productId);
                            insertMovement.run(`DEL/${id}`, productId, from_location || 'Warehouse', to_location || 'External', item.quantity);
                        }
                    }
                }
            }
        }
        
        res.json({ id, reference, delivery_date, customer, status });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update delivery', details: err.message });
    }
});

// ============================================
// STOCK MOVEMENTS API (History)
// ============================================

app.get('/api/movements', (req, res) => {
    try {
        const { product_id, type, limit = 50 } = req.query;
        let query = `
            SELECT sm.*, p.sku, p.name as product_name
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            WHERE 1=1
        `;
        const params = [];
        
        if (product_id) {
            query += ' AND sm.product_id = ?';
            params.push(product_id);
        }
        
        if (type) {
            query += ' AND sm.movement_type = ?';
            params.push(type);
        }
        
        query += ' ORDER BY sm.created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const movements = db.prepare(query).all(...params);
        res.json(movements);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch movements' });
    }
});

// ============================================
// REFERENCE GENERATION
// ============================================

app.get('/api/generate-reference/:type', (req, res) => {
    const { type } = req.params;
    const prefix = type === 'receipt' ? 'REC' : type === 'delivery' ? 'DEL' : 'MOV';
    
    try {
        let table = type === 'receipt' ? 'receipts' : type === 'delivery' ? 'deliveries' : 'stock_movements';
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        const nextNum = (result.count + 1).toString().padStart(4, '0');
        res.json({ reference: `${prefix}/${nextNum}` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate reference' });
    }
});

// ============================================
// WAREHOUSES API
// ============================================

app.get('/api/warehouses', (req, res) => {
    try {
        const warehouses = db.prepare(`
            SELECT w.*, COUNT(l.id) as location_count
            FROM warehouses w
            LEFT JOIN locations l ON w.id = l.warehouse_id
            GROUP BY w.id
            ORDER BY w.name
        `).all();
        res.json(warehouses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch warehouses' });
    }
});

app.post('/api/warehouses', (req, res) => {
    const { name, code } = req.body;
    
    if (!name || !code) {
        return res.status(400).json({ error: 'Name and code are required' });
    }
    
    try {
        const result = db.prepare('INSERT INTO warehouses (name, code) VALUES (?, ?)').run(name, code.toUpperCase());
        res.status(201).json({ id: result.lastInsertRowid, name, code: code.toUpperCase() });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Warehouse name or code already exists' });
        }
        res.status(500).json({ error: 'Failed to create warehouse' });
    }
});

app.delete('/api/warehouses/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        // Delete associated locations first
        db.prepare('DELETE FROM locations WHERE warehouse_id = ?').run(id);
        // Delete warehouse
        const result = db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete warehouse' });
    }
});

// ============================================
// LOCATIONS API
// ============================================

app.get('/api/locations', (req, res) => {
    try {
        const { warehouse_id } = req.query;
        let query = `
            SELECT l.*, w.name as warehouse_name, w.code as warehouse_code
            FROM locations l
            JOIN warehouses w ON l.warehouse_id = w.id
        `;
        const params = [];
        
        if (warehouse_id) {
            query += ' WHERE l.warehouse_id = ?';
            params.push(warehouse_id);
        }
        
        query += ' ORDER BY w.name, l.name';
        
        const locations = db.prepare(query).all(...params);
        res.json(locations);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

app.post('/api/locations', (req, res) => {
    const { warehouse_id, name, code } = req.body;
    
    if (!warehouse_id || !name || !code) {
        return res.status(400).json({ error: 'Warehouse ID, name, and code are required' });
    }
    
    try {
        const result = db.prepare('INSERT INTO locations (warehouse_id, name, code) VALUES (?, ?, ?)').run(warehouse_id, name, code.toUpperCase());
        res.status(201).json({ id: result.lastInsertRowid, warehouse_id, name, code: code.toUpperCase() });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Location code already exists in this warehouse' });
        }
        res.status(500).json({ error: 'Failed to create location' });
    }
});

app.delete('/api/locations/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        const result = db.prepare('DELETE FROM locations WHERE id = ?').run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete location' });
    }
});
// AUTH ROUTES
// ============================================

// --- CHECK LOGIN ID AVAILABILITY ---
app.get('/api/check-login-id/:loginId', (req, res) => {
    const { loginId } = req.params;
    
    if (!idRegex.test(loginId)) {
        return res.json({ available: false, reason: 'invalid_format' });
    }
    
    const user = db.prepare('SELECT id FROM users WHERE login_id = ?').get(loginId);
    res.json({ available: !user, reason: user ? 'taken' : 'available' });
});

// --- CHECK EMAIL AVAILABILITY ---
app.get('/api/check-email/:email', (req, res) => {
    const { email } = req.params;
    
    if (!emailRegex.test(email)) {
        return res.json({ available: false, reason: 'invalid_format' });
    }
    
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    res.json({ available: !user, reason: user ? 'taken' : 'available' });
});

// --- GET EMAIL BY LOGIN ID ---
app.get('/api/get-email/:loginId', (req, res) => {
    const { loginId } = req.params;
    
    const user = db.prepare('SELECT email FROM users WHERE login_id = ?').get(loginId);
    
    if (!user) {
        return res.status(404).json({ error: "Login ID not found" });
    }
    
    res.json({ email: user.email });
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

const idRegex = /^[a-zA-Z0-9]{6,12}$/;
const emailRegex = /^\S+@\S+\.\S+$/;
const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{9,}$/;

// --- SIGNUP ---
app.post('/api/signup', async (req, res) => {
    const { login_id, email, password } = req.body;

    if (!idRegex.test(login_id)) return res.status(400).json({ error: "Login ID must be 6-12 alphanumeric characters." });
    if (!emailRegex.test(email)) return res.status(400).json({ error: "Invalid email format." });
    if (!passRegex.test(password)) return res.status(400).json({ error: "Password must be >8 chars, with uppercase, lowercase, and special character." });

    try {
        const hash = await bcrypt.hash(password, 10);
        db.prepare('INSERT INTO users (login_id, email, password_hash) VALUES (?, ?, ?)').run(login_id, email, hash);
        res.status(201).json({ message: "User created." });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Login ID or Email already exists." });
        res.status(500).json({ error: "Database error." });
    }
});

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        
    if (!user) return res.status(401).json({ error: "Invalid Login Id or Password" });
        
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid Login Id or Password" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ 
        token,
        user: {
            id: user.id,
            login_id: user.login_id,
            email: user.email
        }
    });
});

// --- FORGOT PASSWORD (OTP GENERATION) ---
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ error: "Email not found." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60000; 

    db.prepare('INSERT OR REPLACE INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)').run(email, otp, expiresAt);

    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP is ${otp}. It expires in 15 minutes.`
    });

    res.json({ message: "OTP sent." });
});

// --- VERIFY OTP (without reset) ---
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    
    const record = db.prepare('SELECT * FROM password_resets WHERE email = ? AND otp = ?').get(email, otp);
    if (!record) return res.status(400).json({ error: "Invalid OTP." });
    if (Date.now() > record.expires_at) return res.status(400).json({ error: "OTP expired." });
    
    res.json({ message: "OTP verified." });
});

// --- VERIFY OTP & RESET ---
app.post('/api/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!passRegex.test(newPassword)) return res.status(400).json({ error: "Password does not meet complexity rules." });

    const record = db.prepare('SELECT * FROM password_resets WHERE email = ? AND otp = ?').get(email, otp);
    if (!record) return res.status(400).json({ error: "Invalid OTP." });
    if (Date.now() > record.expires_at) return res.status(400).json({ error: "OTP expired." });

    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
    db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);

    res.json({ message: "Password updated successfully." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));