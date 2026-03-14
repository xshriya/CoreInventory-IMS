// Receipt Form JavaScript
// Handles form validation, status workflow, and UI updates for receipt form

// Main action button click handler
function performMainAction() {
    const currentStatus = getCurrentStatus();
    
    if (currentStatus === 'Draft') {
        // Draft -> Ready
        updateReceiptStatus('Ready');
    } else if (currentStatus === 'Ready') {
        // Ready -> Done
        updateReceiptStatus('Done');
    } else if (currentStatus === 'Done') {
        // Already done, no action needed
        return;
    }
}

// Update receipt status and handle workflow
function updateReceiptStatus(newStatus) {
    // Validate form before status change
    if (!validateForm()) {
        return;
    }
    
    // Get receipt data
    const receipt = getReceiptData();
    receipt.status = newStatus;
    
    // Save to localStorage
    saveReceipt(receipt);
    
    // Update UI
    updateStatusIndicator(newStatus);
    updateMainActionButton(newStatus);
    updatePrintButton(newStatus);
    
    // Show success message
    alert(`Receipt status updated to ${newStatus}`);
    
    // If Done, redirect back to list
    if (newStatus === 'Done') {
        setTimeout(() => {
            window.location.href = 'receipts.html';
        }, 1500);
    }
}

// Validate form fields
function validateForm() {
    const receiveFrom = document.getElementById('receiveFrom').value;
    const scheduleDate = document.getElementById('scheduleDate').value;
    
    if (!receiveFrom || !scheduleDate) {
        alert('Please fill in all required fields');
        return false;
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
        return false;
    }
    
    return true;
}

// Get receipt data from form
function getReceiptData() {
    const reference = document.getElementById('reference').value;
    const receiveFrom = document.getElementById('receiveFrom').value;
    const scheduleDate = document.getElementById('scheduleDate').value;
    
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
    
    return {
        reference: reference,
        from: receiveFrom,
        to: 'WH/Stock1', // Default warehouse
        contact: receiveFrom, // Using receiveFrom as contact for simplicity
        scheduleDate: scheduleDate,
        responsible: 'Admin User',
        products: products,
        status: getCurrentStatus()
    };
}

// Get current status from workflow indicator
function getCurrentStatus() {
    const draftStatus = document.getElementById('draftStatus');
    const readyStatus = document.getElementById('readyStatus');
    const doneStatus = document.getElementById('doneStatus');
    
    if (draftStatus.classList.contains('bg-primary')) return 'Draft';
    if (readyStatus.classList.contains('bg-primary')) return 'Ready';
    if (doneStatus.classList.contains('bg-primary')) return 'Done';
    return 'Draft';
}

// Update status workflow indicator
function updateStatusIndicator(status) {
    const draftStatus = document.getElementById('draftStatus');
    const readyStatus = document.getElementById('readyStatus');
    const doneStatus = document.getElementById('doneStatus');
    
    // Reset all statuses
    draftStatus.className = 'px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium';
    readyStatus.className = 'px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium';
    doneStatus.className = 'px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium';
    
    // Activate current status
    switch(status) {
        case 'Draft':
            draftStatus.className = 'px-3 py-1 rounded-full bg-primary text-white font-medium';
            break;
        case 'Ready':
            draftStatus.className = 'px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium';
            readyStatus.className = 'px-3 py-1 rounded-full bg-primary text-white font-medium';
            break;
        case 'Done':
            draftStatus.className = 'px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium';
            readyStatus.className = 'px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium';
            doneStatus.className = 'px-3 py-1 rounded-full bg-primary text-white font-medium';
            break;
    }
}

// Update main action button based on status
function updateMainActionButton(status) {
    const mainActionBtn = document.getElementById('mainActionBtn');
    
    switch(status) {
        case 'Draft':
            mainActionBtn.textContent = 'To Do';
            mainActionBtn.disabled = false;
            mainActionBtn.className = 'bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg shadow-primary/20';
            break;
        case 'Ready':
            mainActionBtn.textContent = 'Validate';
            mainActionBtn.disabled = false;
            mainActionBtn.className = 'bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg shadow-primary/20';
            break;
        case 'Done':
            mainActionBtn.textContent = 'Done';
            mainActionBtn.disabled = true;
            mainActionBtn.className = 'bg-background-card border border-primary/10 text-slate-400 font-medium py-2.5 px-6 rounded-lg cursor-not-allowed';
            break;
    }
}

// Update print button state
function updatePrintButton(status) {
    const printBtn = document.getElementById('printBtn');
    
    if (status === 'Done') {
        printBtn.disabled = false;
        printBtn.className = 'bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-6 rounded-lg transition-colors';
    } else {
        printBtn.disabled = true;
        printBtn.className = 'bg-background-card border border-primary/10 text-slate-400 font-medium py-2.5 px-6 rounded-lg cursor-not-allowed';
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

// Print receipt function
function printReceipt() {
    window.print();
}

// Cancel receipt function
function cancelReceipt() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        window.location.href = 'receipts.html';
    }
}

// Load receipt for editing
function loadReceiptForEdit(reference) {
    const receipts = loadReceipts();
    const receipt = receipts.find(r => r.reference === reference);
    
    if (receipt) {
        document.getElementById('reference').value = receipt.reference;
        document.getElementById('receiveFrom').value = receipt.from || '';
        document.getElementById('scheduleDate').value = receipt.scheduleDate;
        document.getElementById('responsible').value = receipt.responsible || 'Admin User';
        
        // Load products
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = '';
        
        receipt.products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="text" value="${product.product}" class="w-full bg-background-main border border-primary/10 rounded-lg px-4 py-3 text-sm focus:outline-0 focus:ring-2 focus:ring-primary/20">
                </td>
                <td>
                    <input type="number" value="${product.quantity}" min="1" class="w-full bg-background-main border border-primary/10 rounded-lg px-4 py-3 text-sm focus:outline-0 focus:ring-2 focus:ring-primary/20">
                </td>
                <td>
                    <button type="button" onclick="removeProductRow(this)" class="text-red-500 hover:text-red-700 transition-colors">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Update UI based on status
        updateStatusIndicator(receipt.status);
        updateMainActionButton(receipt.status);
        updatePrintButton(receipt.status);
    }
}

// Export functions for global access
window.performMainAction = performMainAction;
window.updateStatusIndicator = updateStatusIndicator;
window.updatePrintButton = updatePrintButton;
window.updateMainActionButton = updateMainActionButton;
window.getCurrentStatus = getCurrentStatus;
window.loadReceiptForEdit = loadReceiptForEdit;
window.printReceipt = printReceipt;
window.cancelReceipt = cancelReceipt;
