// Move History Module - CoreInventory/LogisticsPro
// Connected to Backend API

// Current view state
let currentView = 'list';
let allMoves = [];

// Toggle NEW dropdown menu
function toggleNewDropdown() {
    const dropdown = document.getElementById('newDropdown');
    dropdown.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('newDropdown');
    const button = event.target.closest('button[onclick="toggleNewDropdown()"]');
    
    if (dropdown && !button && !dropdown.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

// Load move history from Backend API
async function loadMoveHistory() {
    try {
        // Fetch stock movements from API
        const movements = await api.getMovements({ limit: 100 });
        
        // Transform API data to display format
        allMoves = movements.map(mov => ({
            reference: mov.reference || `MOV/${mov.id}`,
            date: mov.created_at || new Date().toISOString(),
            contact: mov.from_location || mov.to_location || 'N/A',
            from: mov.from_location || 'N/A',
            to: mov.to_location || 'N/A',
            quantity: mov.quantity || 0,
            type: mov.movement_type === 'receipt' ? 'IN' : 'OUT',
            status: mapStatus(mov.movement_type),
            product: mov.product_name || mov.sku || 'Unknown Product',
            productId: mov.product_id
        }));
        
        // Sort by date (newest first)
        allMoves.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Render the table
        renderMoveTable(allMoves);
        renderKanbanView(allMoves);
    } catch (err) {
        console.error('Failed to load move history:', err);
        // Show error state
        const tableBody = document.getElementById('moveTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2">error</span>
                    <p class="text-sm">Failed to load move history</p>
                    <p class="text-xs mt-1">${err.message}</p>
                </td>
            </tr>
        `;
    }
}

// Map movement type to display status
function mapStatus(movementType) {
    if (movementType === 'receipt') return 'Completed';
    if (movementType === 'delivery') return 'In Transit';
    return 'Ready';
}

// Render move table
function renderMoveTable(moves) {
    const tableBody = document.getElementById('moveTableBody');
    
    if (moves.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2">history</span>
                    <p class="text-sm">No move history found</p>
                    <p class="text-xs mt-1">Moves will appear here when receipts and deliveries are processed</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = moves.map(move => {
        const rowClass = move.type === 'IN' ? 'bg-status-green/5 border-l-4 border-status-green' : 'bg-late-red/5 border-l-4 border-late-red';
        const statusClass = move.status === 'Ready' ? 'bg-status-green/10 text-status-green' : 
                           move.status === 'In Transit' ? 'bg-primary/10 text-primary' : 
                           move.status === 'Completed' ? 'bg-slate-100 text-slate-600' : 'bg-late-red/10 text-late-red';
        
        return `
            <tr class="border-b border-primary/5 hover:bg-primary/5 transition-colors ${rowClass}">
                <td class="py-3 px-4">
                    <div class="font-medium text-slate-800">${move.reference}</div>
                    <div class="text-xs text-slate-500">${move.product}</div>
                </td>
                <td class="py-3 px-4">
                    <div class="text-sm text-slate-600">${formatDate(move.date)}</div>
                </td>
                <td class="py-3 px-4">
                    <div class="text-sm text-slate-800">${move.contact}</div>
                </td>
                <td class="py-3 px-4">
                    <div class="text-sm text-slate-600">${move.from}</div>
                </td>
                <td class="py-3 px-4">
                    <div class="text-sm text-slate-600">${move.to}</div>
                </td>
                <td class="py-3 px-4">
                    <div class="text-sm font-medium text-slate-800">${move.quantity}</div>
                </td>
                <td class="py-3 px-4">
                    <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${move.status}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Render Kanban view
function renderKanbanView(moves) {
    const readyColumn = document.getElementById('readyColumn');
    const inTransitColumn = document.getElementById('inTransitColumn');
    const completedColumn = document.getElementById('completedColumn');
    const readyCount = document.getElementById('readyCount');
    const inTransitCount = document.getElementById('inTransitCount');
    const completedCount = document.getElementById('completedCount');
    
    // Group moves by status
    const readyMoves = moves.filter(move => move.status === 'Ready');
    const inTransitMoves = moves.filter(move => move.status === 'In Transit');
    const completedMoves = moves.filter(move => move.status === 'Completed');
    
    // Update counts
    readyCount.textContent = readyMoves.length;
    inTransitCount.textContent = inTransitMoves.length;
    completedCount.textContent = completedMoves.length;
    
    // Render columns
    readyColumn.innerHTML = renderKanbanCards(readyMoves);
    inTransitColumn.innerHTML = renderKanbanCards(inTransitMoves);
    completedColumn.innerHTML = renderKanbanCards(completedMoves);
}

// Render individual Kanban cards
function renderKanbanCards(moves) {
    if (moves.length === 0) {
        return '<div class="text-center py-6 sm:py-8 text-slate-400 text-xs sm:text-sm">No moves in this status</div>';
    }
    
    return moves.map(move => {
        const cardClass = move.type === 'IN' ? 'border-l-4 border-status-green bg-status-green/5' : 'border-l-4 border-late-red bg-late-red/5';
        
        return `
            <div class="bg-background-card border border-primary/10 rounded-lg p-2 sm:p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${cardClass}">
                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span class="text-xs font-medium text-slate-600 truncate">${move.reference}</span>
                    <span class="text-xs text-slate-500 whitespace-nowrap ml-2">${formatDate(move.date)}</span>
                </div>
                <div class="mb-1.5 sm:mb-2">
                    <div class="text-xs sm:text-sm font-medium text-slate-800 truncate">${move.product}</div>
                    <div class="text-xs text-slate-500 truncate">${move.contact}</div>
                </div>
                <div class="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-2 text-xs">
                    <span class="text-slate-600 truncate">${move.from} → ${move.to}</span>
                    <span class="font-medium text-slate-800 whitespace-nowrap">Qty: ${move.quantity}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Search moves
function searchMoves() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        if (currentView === 'list') {
            renderMoveTable(allMoves);
        } else {
            renderKanbanView(allMoves);
        }
        return;
    }
    
    const filteredMoves = allMoves.filter(move => 
        move.reference.toLowerCase().includes(searchTerm) ||
        move.contact.toLowerCase().includes(searchTerm)
    );
    
    if (currentView === 'list') {
        renderMoveTable(filteredMoves);
    } else {
        renderKanbanView(filteredMoves);
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Set view (list or kanban)
function setView(view) {
    currentView = view;
    
    const listView = document.getElementById('listView');
    const kanbanView = document.getElementById('kanbanView');
    const listBtn = document.getElementById('listViewBtn');
    const kanbanBtn = document.getElementById('kanbanViewBtn');
    
    if (view === 'list') {
        listView.classList.remove('hidden');
        kanbanView.classList.add('hidden');
        
        listBtn.classList.add('bg-primary', 'text-white');
        listBtn.classList.remove('hover:bg-primary/5', 'text-slate-600');
        
        kanbanBtn.classList.remove('bg-primary', 'text-white');
        kanbanBtn.classList.add('hover:bg-primary/5', 'text-slate-600');
        
        // Render list view
        renderMoveTable(allMoves);
    } else {
        listView.classList.add('hidden');
        kanbanView.classList.remove('hidden');
        
        kanbanBtn.classList.add('bg-primary', 'text-white');
        kanbanBtn.classList.remove('hover:bg-primary/5', 'text-slate-600');
        
        listBtn.classList.remove('bg-primary', 'text-white');
        listBtn.classList.add('hover:bg-primary/5', 'text-slate-600');
        
        // Render kanban view
        renderKanbanView(allMoves);
    }
}

// Toggle view (alias for setView)
function toggleView() {
    const newView = currentView === 'list' ? 'kanban' : 'list';
    setView(newView);
}

// Initialize sample data for demonstration
function initializeSampleData() {
    loadMoveHistory();
}

// Clear all move history data
function clearMoveHistory() {
    loadMoveHistory();
}
