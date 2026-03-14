// Delivery Module - Shared Logic

// Clear all existing delivery data
function clearDeliveryData() {
    localStorage.removeItem('deliveries');
}

// Initialize deliveries with empty array
function initializeDeliveries() {
    // Clear any existing data first
    clearDeliveryData();
    
    const deliveries = localStorage.getItem('deliveries');
    if (!deliveries) {
        localStorage.setItem('deliveries', JSON.stringify([]));
    }
}

// Generate delivery reference with auto-increment
function generateDeliveryReference() {
    const deliveries = loadDeliveries();
    let maxId = 0;
    
    deliveries.forEach(delivery => {
        const match = delivery.reference.match(/WH\/OUT\/(\d+)/);
        if (match) {
            const id = parseInt(match[1]);
            if (id > maxId) {
                maxId = id;
            }
        }
    });
    
    const nextId = maxId + 1;
    return `WH/OUT/${String(nextId).padStart(3, '0')}`;
}

// Save delivery to localStorage
function saveDelivery(delivery) {
    const deliveries = loadDeliveries();
    const existingIndex = deliveries.findIndex(d => d.reference === delivery.reference);
    
    if (existingIndex !== -1) {
        deliveries[existingIndex] = delivery;
    } else {
        deliveries.push(delivery);
    }
    
    localStorage.setItem('deliveries', JSON.stringify(deliveries));
}

// Load all deliveries from localStorage
function loadDeliveries() {
    const deliveries = localStorage.getItem('deliveries');
    return deliveries ? JSON.parse(deliveries) : [];
}

// Render delivery table
function renderDeliveryTable(deliveries = null) {
    const deliveriesToRender = deliveries || loadDeliveries();
    const tbody = document.getElementById('deliveriesTableBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    deliveriesToRender.forEach(delivery => {
        const row = document.createElement('tr');
        row.className = 'border-b border-primary/5 hover:bg-primary/5 cursor-pointer transition-colors';
        row.onclick = () => window.location.href = `delivery-form.html?id=${delivery.reference}`;
        
        row.innerHTML = `
            <td class="px-6 py-4">
                <span class="text-xs font-bold text-primary">${delivery.reference}</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-sm text-slate-700">${delivery.from || 'WH/Stock1'}</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-sm text-slate-700">${delivery.to || 'Customer'}</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-sm text-slate-700">${delivery.contact || 'N/A'}</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-sm text-slate-700">${formatDate(delivery.scheduleDate)}</span>
            </td>
            <td class="px-6 py-4">
                ${getStatusBadge(delivery.status)}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Render kanban view
function renderKanbanView() {
    const deliveries = loadDeliveries();
    
    const draftColumn = document.getElementById('draftColumn');
    const waitingColumn = document.getElementById('waitingColumn');
    const readyColumn = document.getElementById('readyColumn');
    const doneColumn = document.getElementById('doneColumn');
    
    if (!draftColumn || !waitingColumn || !readyColumn || !doneColumn) return;
    
    // Clear columns
    draftColumn.innerHTML = '';
    waitingColumn.innerHTML = '';
    readyColumn.innerHTML = '';
    doneColumn.innerHTML = '';
    
    deliveries.forEach(delivery => {
        const card = createKanbanCard(delivery);
        
        switch(delivery.status) {
            case 'Draft':
                draftColumn.appendChild(card);
                break;
            case 'Waiting':
                waitingColumn.appendChild(card);
                break;
            case 'Ready':
                readyColumn.appendChild(card);
                break;
            case 'Done':
                doneColumn.appendChild(card);
                break;
        }
    });
}

// Create kanban card
function createKanbanCard(delivery) {
    const card = document.createElement('div');
    card.className = 'bg-background-main border border-primary/10 rounded-lg p-4 cursor-pointer hover:border-primary/30 transition-colors';
    card.onclick = () => window.location.href = `delivery-form.html?id=${delivery.reference}`;
    
    card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-primary">${delivery.reference}</span>
            ${getStatusBadge(delivery.status)}
        </div>
        <p class="text-sm font-medium text-slate-800 mb-1">${delivery.contact || 'N/A'}</p>
        <p class="text-xs text-slate-500">${formatDate(delivery.scheduleDate)}</p>
        <p class="text-xs text-slate-400 mt-2">${delivery.products.length} products</p>
    `;
    
    return card;
}

// Search deliveries
function searchDeliveries(query) {
    const deliveries = loadDeliveries();
    const filtered = deliveries.filter(delivery => {
        const searchLower = query.toLowerCase();
        return delivery.reference.toLowerCase().includes(searchLower) ||
               (delivery.contact && delivery.contact.toLowerCase().includes(searchLower));
    });
    
    renderDeliveryTable(filtered);
}

// Check stock availability
function checkStockAvailability(product, requiredQuantity) {
    // In real implementation, this would check actual inventory
    // For now, return 0 availability for all products
    const available = 0;
    return {
        available: available,
        sufficient: available >= requiredQuantity
    };
}

// Update delivery status
function updateDeliveryStatus(reference, newStatus) {
    const deliveries = loadDeliveries();
    const delivery = deliveries.find(d => d.reference === reference);
    
    if (delivery) {
        delivery.status = newStatus;
        saveDelivery(delivery);
        return true;
    }
    
    return false;
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusColors = {
        'Draft': 'bg-gray-100 text-gray-700',
        'Waiting': 'bg-orange-100 text-orange-700',
        'Ready': 'bg-yellow-100 text-yellow-700',
        'Done': 'bg-green-100 text-green-700'
    };
    
    return `<span class="px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-700'}">${status}</span>`;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Export functions for global access
window.generateDeliveryReference = generateDeliveryReference;
window.saveDelivery = saveDelivery;
window.loadDeliveries = loadDeliveries;
window.renderDeliveryTable = renderDeliveryTable;
window.searchDeliveries = searchDeliveries;
window.checkStockAvailability = checkStockAvailability;
window.updateDeliveryStatus = updateDeliveryStatus;
window.renderKanbanView = renderKanbanView;
