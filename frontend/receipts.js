// Receipts JavaScript Module
// Data Storage and Logic for Receipts Module

// Clear all existing receipt data
function clearReceiptData() {
    localStorage.removeItem('receipts');
}

// Initialize receipts in localStorage if not exists
function initializeReceipts() {
    // Clear any existing data first
    clearReceiptData();
    
    if (!localStorage.getItem('receipts')) {
        // Initialize with empty array
        localStorage.setItem('receipts', JSON.stringify([]));
    }
}

// Generate reference ID with auto-increment
function generateReference() {
    const receipts = loadReceipts();
    const maxId = receipts.length > 0 ? 
        Math.max(...receipts.map(r => {
            const match = r.reference.match(/WH\/IN\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        })) : 0;
    
    const nextId = maxId + 1;
    return `WH/IN/${nextId.toString().padStart(3, '0')}`;
}

// Save receipt to localStorage
function saveReceipt(receipt) {
    const receipts = loadReceipts();
    const existingIndex = receipts.findIndex(r => r.reference === receipt.reference);
    
    if (existingIndex >= 0) {
        receipts[existingIndex] = receipt;
    } else {
        receipts.push(receipt);
    }
    
    localStorage.setItem('receipts', JSON.stringify(receipts));
    return receipt;
}

// Load all receipts from localStorage
function loadReceipts() {
    initializeReceipts();
    const receipts = JSON.parse(localStorage.getItem('receipts') || '[]');
    return receipts;
}

// Render receipts table
function renderReceiptsTable(receipts = null) {
    const receiptsData = receipts || loadReceipts();
    const tbody = document.getElementById('receiptsTableBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    receiptsData.forEach(receipt => {
        const row = document.createElement('tr');
        row.className = 'border-b border-primary/5 hover:bg-primary/5 cursor-pointer transition-colors';
        row.onclick = () => window.location.href = `receipt-form.html?id=${receipt.reference}`;
        
        row.innerHTML = `
            <td class="px-6 py-4 text-sm font-medium text-slate-800">${receipt.reference}</td>
            <td class="px-6 py-4 text-sm text-slate-600">${receipt.from}</td>
            <td class="px-6 py-4 text-sm text-slate-600">${receipt.to}</td>
            <td class="px-6 py-4 text-sm text-slate-600">${receipt.contact}</td>
            <td class="px-6 py-4 text-sm text-slate-600">${formatDate(receipt.scheduleDate)}</td>
            <td class="px-6 py-4">
                ${getStatusBadge(receipt.status)}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Get status badge HTML
function getStatusBadge(status) {
    switch(status) {
        case 'Draft':
            return '<span class="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">Draft</span>';
        case 'Ready':
            return '<span class="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Ready</span>';
        case 'Done':
            return '<span class="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Done</span>';
        default:
            return '<span class="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">Draft</span>';
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Search receipts
function searchReceipts(query) {
    const receipts = loadReceipts();
    const filteredReceipts = receipts.filter(receipt => {
        const searchLower = query.toLowerCase();
        return receipt.reference.toLowerCase().includes(searchLower) ||
               receipt.contact.toLowerCase().includes(searchLower);
    });
    
    renderReceiptsTable(filteredReceipts);
}

// Update receipt status through workflow
function updateStatus(receipt) {
    let newStatus;
    
    switch(receipt.status) {
        case 'Draft':
            newStatus = 'Ready';
            break;
        case 'Ready':
            newStatus = 'Done';
            // Update stock when status becomes Done
            updateStock(receipt);
            break;
        case 'Done':
            alert('Receipt is already completed');
            return;
        default:
            newStatus = 'Ready';
    }
    
    receipt.status = newStatus;
    saveReceipt(receipt);
    
    // Update UI
    if (typeof updateStatusBadge === 'function') {
        updateStatusBadge(newStatus);
    }
    
    // Show success message
    alert(`Receipt status updated to ${newStatus}`);
    
    // If Done, redirect back to list
    if (newStatus === 'Done') {
        setTimeout(() => {
            window.location.href = 'receipts.html';
        }, 1000);
    }
}

// Update stock when receipt is done
function updateStock(receipt) {
    // Get current stock or initialize
    let stock = JSON.parse(localStorage.getItem('stock') || '{}');
    
    receipt.products.forEach(product => {
        const stockKey = product.product;
        if (stock[stockKey]) {
            stock[stockKey] += product.quantity;
        } else {
            stock[stockKey] = product.quantity;
        }
    });
    
    localStorage.setItem('stock', JSON.stringify(stock));
    console.log('Stock updated:', stock);
}

// Render kanban view
function renderKanbanView() {
    const receipts = loadReceipts();
    
    const draftColumn = document.getElementById('draftColumn');
    const readyColumn = document.getElementById('readyColumn');
    const doneColumn = document.getElementById('doneColumn');
    
    if (!draftColumn || !readyColumn || !doneColumn) return;
    
    // Clear columns
    draftColumn.innerHTML = '';
    readyColumn.innerHTML = '';
    doneColumn.innerHTML = '';
    
    receipts.forEach(receipt => {
        const card = createKanbanCard(receipt);
        
        switch(receipt.status) {
            case 'Draft':
                draftColumn.appendChild(card);
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
function createKanbanCard(receipt) {
    const card = document.createElement('div');
    card.className = 'bg-background-main border border-primary/10 rounded-lg p-4 cursor-pointer hover:border-primary/30 transition-colors';
    card.onclick = () => window.location.href = `receipt-form.html?id=${receipt.reference}`;
    
    card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-primary">${receipt.reference}</span>
            ${getStatusBadge(receipt.status)}
        </div>
        <p class="text-sm font-medium text-slate-800 mb-1">${receipt.contact}</p>
        <p class="text-xs text-slate-500">${formatDate(receipt.scheduleDate)}</p>
        <p class="text-xs text-slate-400 mt-2">${receipt.products.length} products</p>
    `;
    
    return card;
}

// Validate receipt form
function validateReceipt() {
    const reference = document.getElementById('reference').value;
    const receiveFrom = document.getElementById('receiveFrom').value;
    const to = document.getElementById('to').value;
    const contact = document.getElementById('contact').value;
    const scheduleDate = document.getElementById('scheduleDate').value;
    
    if (!receiveFrom || !contact || !scheduleDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Get products
    const products = [];
    const productRows = document.querySelectorAll('#productsTableBody tr');
    
    productRows.forEach(row => {
        const productInput = row.querySelector('input[type="text"]');
        const quantityInput = row.querySelector('input[type="number"]');
        
        if (productInput.value && quantityInput.value) {
            products.push({
                product: productInput.value,
                quantity: parseInt(quantityInput.value)
            });
        }
    });
    
    if (products.length === 0) {
        alert('Please add at least one product');
        return;
    }
    
    // Create receipt object
    const receipt = {
        reference: reference,
        from: receiveFrom,
        to: to,
        contact: contact,
        scheduleDate: scheduleDate,
        responsible: 'Admin User',
        products: products,
        status: getCurrentStatus()
    };
    
    // Update status through workflow
    updateStatus(receipt);
}

// Get current status from form
function getCurrentStatus() {
    const statusBadge = document.getElementById('statusBadge');
    if (!statusBadge) return 'Draft';
    
    const statusText = statusBadge.textContent.trim();
    
    if (statusText === 'Draft') return 'Draft';
    if (statusText === 'Ready') return 'Ready';
    if (statusText === 'Done') return 'Done';
    return 'Draft';
}

// Export functions for global access
window.generateReference = generateReference;
window.saveReceipt = saveReceipt;
window.loadReceipts = loadReceipts;
window.renderReceiptsTable = renderReceiptsTable;
window.searchReceipts = searchReceipts;
window.updateStatus = updateStatus;
window.validateReceipt = validateReceipt;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeReceipts();
});
