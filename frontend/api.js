// API Service for CoreInventory IMS
const API_BASE = 'http://localhost:3000/api';

// Helper function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('jwtToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Helper function to handle API responses
async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'Request failed');
    }
    return response.json();
}

// ============================================
// DASHBOARD API
// ============================================

async function getDashboardSummary() {
    const response = await fetch(`${API_BASE}/dashboard/summary`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

// ============================================
// PRODUCTS API
// ============================================

async function getProducts() {
    const response = await fetch(`${API_BASE}/products`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

async function createProduct(product) {
    const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(product)
    });
    return handleResponse(response);
}

// ============================================
// STOCK API
// ============================================

async function getStock() {
    const response = await fetch(`${API_BASE}/stock`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

async function addStock(stockData) {
    const response = await fetch(`${API_BASE}/stock`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(stockData)
    });
    return handleResponse(response);
}

async function updateStock(productId, stockData) {
    const response = await fetch(`${API_BASE}/stock/${productId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(stockData)
    });
    return handleResponse(response);
}

// ============================================
// RECEIPTS API
// ============================================

async function getReceipts(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    
    const url = `${API_BASE}/receipts${params.toString() ? '?' + params.toString() : ''}`;
    console.log('Fetching receipts from:', url);
    const response = await fetch(url, {
        headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    console.log('Receipts API response:', data);
    return data;
}

async function getReceipt(id) {
    const response = await fetch(`${API_BASE}/receipts/${id}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

async function createReceipt(receipt) {
    const response = await fetch(`${API_BASE}/receipts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(receipt)
    });
    return handleResponse(response);
}

async function updateReceipt(id, receipt) {
    const response = await fetch(`${API_BASE}/receipts/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(receipt)
    });
    return handleResponse(response);
}

// ============================================
// DELIVERIES API
// ============================================

async function getDeliveries(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    
    const url = `${API_BASE}/deliveries${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

async function getDelivery(id) {
    const response = await fetch(`${API_BASE}/deliveries/${id}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

async function createDelivery(delivery) {
    const response = await fetch(`${API_BASE}/deliveries`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(delivery)
    });
    return handleResponse(response);
}

async function updateDelivery(id, delivery) {
    const response = await fetch(`${API_BASE}/deliveries/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(delivery)
    });
    return handleResponse(response);
}

// ============================================
// STOCK MOVEMENTS API
// ============================================

async function getMovements(filters = {}) {
    const params = new URLSearchParams();
    if (filters.product_id) params.append('product_id', filters.product_id);
    if (filters.type) params.append('type', filters.type);
    if (filters.limit) params.append('limit', filters.limit);
    
    const url = `${API_BASE}/movements${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

// ============================================
// REFERENCE GENERATION
// ============================================

async function generateReference(type) {
    const response = await fetch(`${API_BASE}/generate-reference/${type}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

// ============================================
// WAREHOUSES API
// ============================================

async function getWarehouses() {
    const response = await fetch(`${API_BASE}/warehouses`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

async function createWarehouse(warehouse) {
    const response = await fetch(`${API_BASE}/warehouses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(warehouse)
    });
    return handleResponse(response);
}

async function deleteWarehouse(id) {
    const response = await fetch(`${API_BASE}/warehouses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

// ============================================
// LOCATIONS API
// ============================================

async function getLocations(filters = {}) {
    const params = new URLSearchParams();
    if (filters.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
    
    const url = `${API_BASE}/locations${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

async function createLocation(location) {
    const response = await fetch(`${API_BASE}/locations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(location)
    });
    return handleResponse(response);
}

async function deleteLocation(id) {
    const response = await fetch(`${API_BASE}/locations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

window.api = {
    getDashboardSummary,
    getProducts,
    createProduct,
    getStock,
    getReceipts,
    getReceipt,
    createReceipt,
    updateReceipt,
    getDeliveries,
    getDelivery,
    createDelivery,
    updateDelivery,
    getMovements,
    generateReference,
    getWarehouses,
    createWarehouse,
    deleteWarehouse,
    getLocations,
    createLocation,
    deleteLocation
};
