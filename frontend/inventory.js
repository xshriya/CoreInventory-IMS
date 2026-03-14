// CoreInventory/LogisticsPro - Shared Inventory Management Script

// Warehouse Functions
function saveWarehouse(warehouse) {
    const warehouses = loadWarehouses();
    warehouse.id = warehouse.id || generateId('WH');
    warehouses.push(warehouse);
    localStorage.setItem('warehouses', JSON.stringify(warehouses));
    return warehouse;
}

function loadWarehouses() {
    const warehouses = localStorage.getItem('warehouses');
    return warehouses ? JSON.parse(warehouses) : [];
}

function updateWarehouse(id, updatedWarehouse) {
    const warehouses = loadWarehouses();
    const index = warehouses.findIndex(w => w.id === id);
    if (index !== -1) {
        warehouses[index] = { ...warehouses[index], ...updatedWarehouse };
        localStorage.setItem('warehouses', JSON.stringify(warehouses));
        return warehouses[index];
    }
    return null;
}

function deleteWarehouse(id) {
    const warehouses = loadWarehouses();
    const filteredWarehouses = warehouses.filter(w => w.id !== id);
    localStorage.setItem('warehouses', JSON.stringify(filteredWarehouses));
}

// Location Functions
function saveLocation(location) {
    const locations = loadLocations();
    location.id = location.id || generateId('LOC');
    locations.push(location);
    localStorage.setItem('locations', JSON.stringify(locations));
    return location;
}

function loadLocations() {
    const locations = localStorage.getItem('locations');
    return locations ? JSON.parse(locations) : [];
}

function updateLocation(id, updatedLocation) {
    const locations = loadLocations();
    const index = locations.findIndex(l => l.id === id);
    if (index !== -1) {
        locations[index] = { ...locations[index], ...updatedLocation };
        localStorage.setItem('locations', JSON.stringify(locations));
        return locations[index];
    }
    return null;
}

function deleteLocation(id) {
    const locations = loadLocations();
    const filteredLocations = locations.filter(l => l.id !== id);
    localStorage.setItem('locations', JSON.stringify(filteredLocations));
}

function getLocationsByWarehouse(warehouseCode) {
    const locations = loadLocations();
    return locations.filter(l => l.warehouse === warehouseCode);
}

// Stock Functions
function saveStock(stock) {
    const stocks = loadStock();
    stock.id = stock.id || generateId('STK');
    stocks.push(stock);
    localStorage.setItem('stocks', JSON.stringify(stocks));
    return stock;
}

function loadStock() {
    const stocks = localStorage.getItem('stocks');
    return stocks ? JSON.parse(stocks) : [];
}

function updateStock(id, updatedStock) {
    const stocks = loadStock();
    const index = stocks.findIndex(s => s.id === id);
    if (index !== -1) {
        stocks[index] = { ...stocks[index], ...updatedStock };
        localStorage.setItem('stocks', JSON.stringify(stocks));
        return stocks[index];
    }
    return null;
}

function deleteStock(id) {
    const stocks = loadStock();
    const filteredStocks = stocks.filter(s => s.id !== id);
    localStorage.setItem('stocks', JSON.stringify(filteredStocks));
}

function getStockByLocation(locationName) {
    const stocks = loadStock();
    return stocks.filter(s => s.location === locationName);
}

// Helper Functions
function generateId(prefix) {
    const existingItems = {
        'WH': loadWarehouses(),
        'LOC': loadLocations(),
        'STK': loadStock()
    };
    
    const items = existingItems[prefix] || [];
    const maxId = items.reduce((max, item) => {
        const num = parseInt(item.id.replace(prefix, ''));
        return num > max ? num : max;
    }, 0);
    
    return `${prefix}${maxId + 1}`;
}

// Dropdown Population Functions
function populateWarehouseDropdown(selectElement) {
    const warehouses = loadWarehouses();
    selectElement.innerHTML = '<option value="">Select Warehouse</option>';
    
    warehouses.forEach(warehouse => {
        const option = document.createElement('option');
        option.value = warehouse.shortCode;
        option.textContent = `${warehouse.name} (${warehouse.shortCode})`;
        selectElement.appendChild(option);
    });
}

function populateLocationDropdown(selectElement) {
    const locations = loadLocations();
    selectElement.innerHTML = '<option value="">Select Location</option>';
    
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.name;
        option.textContent = `${location.name} (${location.shortCode})`;
        selectElement.appendChild(option);
    });
}

// Form Validation
function validateWarehouseForm(formData) {
    if (!formData.name || formData.name.trim() === '') {
        return { valid: false, error: 'Warehouse name is required' };
    }
    if (!formData.shortCode || formData.shortCode.trim() === '') {
        return { valid: false, error: 'Short code is required' };
    }
    if (!formData.address || formData.address.trim() === '') {
        return { valid: false, error: 'Address is required' };
    }
    
    // Check if short code already exists
    const warehouses = loadWarehouses();
    const existingCode = warehouses.find(w => w.shortCode === formData.shortCode);
    if (existingCode) {
        return { valid: false, error: 'Short code already exists' };
    }
    
    return { valid: true };
}

function validateLocationForm(formData) {
    if (!formData.name || formData.name.trim() === '') {
        return { valid: false, error: 'Location name is required' };
    }
    if (!formData.shortCode || formData.shortCode.trim() === '') {
        return { valid: false, error: 'Short code is required' };
    }
    if (!formData.warehouse || formData.warehouse.trim() === '') {
        return { valid: false, error: 'Warehouse selection is required' };
    }
    
    // Check if short code already exists
    const locations = loadLocations();
    const existingCode = locations.find(l => l.shortCode === formData.shortCode);
    if (existingCode) {
        return { valid: false, error: 'Short code already exists' };
    }
    
    return { valid: true };
}

function validateStockForm(formData) {
    if (!formData.product || formData.product.trim() === '') {
        return { valid: false, error: 'Product name is required' };
    }
    if (!formData.unitCost || formData.unitCost <= 0) {
        return { valid: false, error: 'Unit cost must be greater than 0' };
    }
    if (!formData.onHand || formData.onHand < 0) {
        return { valid: false, error: 'On hand quantity cannot be negative' };
    }
    if (!formData.freeToUse || formData.freeToUse < 0) {
        return { valid: false, error: 'Free to use quantity cannot be negative' };
    }
    if (parseInt(formData.freeToUse) > parseInt(formData.onHand)) {
        return { valid: false, error: 'Free to use cannot exceed on hand quantity' };
    }
    
    return { valid: true };
}

// Notification System
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-status-green text-white' : 
        type === 'error' ? 'bg-late-red text-white' : 
        'bg-primary text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Clear all data (for testing/reset)
function clearAllData() {
    localStorage.removeItem('warehouses');
    localStorage.removeItem('locations');
    localStorage.removeItem('stocks');
    showNotification('All data cleared', 'info');
}

// Initialize sample data (for testing)
function initializeSampleData() {
    // Check if data already exists
    if (loadWarehouses().length > 0) return;
    
    // Sample warehouse
    const warehouse = saveWarehouse({
        name: 'Main Warehouse',
        shortCode: 'WH',
        address: 'Industrial Area, Goa'
    });
    
    // Sample location
    const location = saveLocation({
        name: 'Shelf A',
        shortCode: 'SH-A',
        warehouse: 'WH'
    });
    
    // Sample stock items
    saveStock({
        product: 'Desk',
        unitCost: 3000,
        onHand: 50,
        freeToUse: 45,
        location: 'Shelf A'
    });
    
    saveStock({
        product: 'Table',
        unitCost: 3000,
        onHand: 50,
        freeToUse: 50,
        location: 'Shelf A'
    });
    
    showNotification('Sample data initialized', 'success');
}
