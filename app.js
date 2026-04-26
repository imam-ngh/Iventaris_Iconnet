// ========================================
// GLOBAL VARIABLES
// ========================================
let inventoryData = [];
let deleteItemId = null;
let selectedItems = new Set();
let selectedHistoryItems = new Set();
let signaturePad, inventoryDistChart, conditionChart;

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    // Load user info
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (user) {
        document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
        document.getElementById('userName').textContent = user.name;
    }

    // Initialize app
    loadInventory();
    setupEventListeners();
    
    // Premium Upgrade: only init theme & charts at startup
    // Signature pad is initialized lazily when navigating to the page
    setTimeout(() => {
        if(typeof initTheme === 'function') initTheme();
        if(typeof initCharts === 'function') initCharts();
    }, 300);
});

// ========================================
// CHECKBOX EVENT LISTENERS - Re-attach after table render
// ========================================
function attachCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach((checkbox, idx) => {
        // Get ID from the parent row's data-id attribute
        const row = checkbox.closest('tr');
        const id = row ? row.getAttribute('data-id') : idx;

        // Restore checked state from selectedItems
        if (id && selectedItems.has(id)) {
            checkbox.checked = true;
        } else if (id) {
            checkbox.checked = false;
        }

        // Remove old onchange handler and add new one
        checkbox.onchange = function () {
            const rowId = this.closest('tr').getAttribute('data-id');
            if (this.checked) {
                selectedItems.add(rowId);
            } else {
                selectedItems.delete(rowId);
            }
            updateSelectedCount();
            updateActionButtons();
        };
    });
}

// ========================================
// HELPER FUNCTIONS FOR BADGE CLASSES
// ========================================
function getStatusBadgeClass(status) {
    if (!status) return 'none';
    const s = status.toString().toLowerCase().trim();
    if (s === 'baik' || s === 'yes' || s === 'ya') return 'Baik';
    if (s === 'rusak ringan' || s === 'warning') return 'Rusak_Ringan';
    if (s === 'rusak berat' || s === 'danger') return 'Rusak_Berat';
    return s.replace(/\s+/g, '_');
}

function getCategoryBadgeClass(category) {
    if (!category) return 'none';
    return category.toString().toLowerCase().trim();
}

// ========================================
// ACTION BUTTON EVENT LISTENERS (Event Delegation)
// ========================================
function attachActionButtonListeners() {
    // Use event delegation on the table body for better reliability
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) return;

    // Remove old delegation if exists
    tableBody.onclick = null;

    // Add new delegation
    tableBody.onclick = function (e) {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;

        const row = btn.closest('tr');
        const id = row ? row.getAttribute('data-id') : null;
        if (!id) return;

        // Prevent default and stop propagation
        e.preventDefault();
        e.stopPropagation();

        // Call appropriate function based on button class
        if (btn.classList.contains('view')) {
            viewItem(id);
        } else if (btn.classList.contains('edit')) {
            editItem(id);
        } else if (btn.classList.contains('delete')) {
            deleteItem(id);
        }
    };
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Menu navigation
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function (e) {
            // Check if this is a submenu item
            if (this.classList.contains('submenu-item')) {
                const page = this.getAttribute('data-page');
                navigateTo(page);

                // Close sidebar on mobile
                if (window.innerWidth < 1024) {
                    document.getElementById('sidebar').classList.remove('active');
                    document.getElementById('sidebarOverlay').classList.remove('show');
                }
                return;
            }

            // Check if this item has submenu
            if (this.classList.contains('has-submenu')) {
                this.classList.toggle('open');
                const nextSibling = this.nextElementSibling;
                if (nextSibling && nextSibling.classList.contains('submenu')) {
                    nextSibling.classList.toggle('open');
                }
                return;
            }

            // Normal menu item - navigate
            const page = this.getAttribute('data-page');
            navigateTo(page);

            // Close sidebar on mobile
            if (window.innerWidth < 1024) {
                document.getElementById('sidebar').classList.remove('active');
                document.getElementById('sidebarOverlay').classList.remove('show');
            }
        });
    });

    // Mobile sidebar toggle
    document.getElementById('hamburger').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('active');
        document.getElementById('sidebarOverlay').classList.toggle('show');
    });

    document.getElementById('sidebarOverlay').addEventListener('click', function () {
        document.getElementById('sidebar').classList.remove('active');
        this.classList.remove('show');
    });

    // Search - don't clear selected items, just re-render with checkbox listeners
    document.getElementById('searchInput').addEventListener('input', function () {
        selectedItems.clear();
        updateSelectedCount();
        updateInventoryTable();
    });

    // Filter dropdown - don't clear selected items, just re-render with checkbox listeners
    document.getElementById('exportFilter').addEventListener('change', function () {
        selectedItems.clear();
        updateSelectedCount();
        updateInventoryTable();
    });

    // View limit dropdown - don't clear selected items
    document.getElementById('viewLimit').addEventListener('change', function () {
        selectedItems.clear();
        updateSelectedCount();
        updateInventoryTable();
    });

    // Export buttons
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
    document.getElementById('exportPdf').addEventListener('click', exportToPdf);

    // Import button
    const importExcelBtn = document.getElementById('importExcelBtn');
    const importFileInput = document.getElementById('importFileInput');
    if (importExcelBtn && importFileInput) {
        importExcelBtn.addEventListener('click', function () {
            importFileInput.click();
        });
        importFileInput.addEventListener('change', handleImportFile);
    }

    // Delete selected button
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedItems);
    }

    // Generate QR button
    const generateQrBtn = document.getElementById('generateQrBtn');
    if (generateQrBtn) {
        generateQrBtn.addEventListener('click', function () {
            generateQRForSelected();
        });
    }

    // History page event listeners
    const historySearchInput = document.getElementById('historySearchInput');
    if (historySearchInput) {
        historySearchInput.addEventListener('input', function () {
            selectedHistoryItems.clear();
            updateHistorySelectedCount();
            renderHistoryTable();
        });
    }
    const historyActionFilter = document.getElementById('historyActionFilter');
    if (historyActionFilter) {
        historyActionFilter.addEventListener('change', function () {
            selectedHistoryItems.clear();
            updateHistorySelectedCount();
            renderHistoryTable();
        });
    }
    const historyItemFilter = document.getElementById('historyItemFilter');
    if (historyItemFilter) {
        historyItemFilter.addEventListener('change', function () {
            selectedHistoryItems.clear();
            updateHistorySelectedCount();
            renderHistoryTable();
        });
    }
    const exportHistoryExcelBtn = document.getElementById('exportHistoryExcelBtn');
    if (exportHistoryExcelBtn) {
        exportHistoryExcelBtn.addEventListener('click', exportHistoryToExcel);
    }
    const exportHistoryPdfBtn = document.getElementById('exportHistoryPdfBtn');
    if (exportHistoryPdfBtn) {
        exportHistoryPdfBtn.addEventListener('click', exportHistoryToPdf);
    }

    // Delete selected history button
    const deleteHistorySelectedBtn = document.getElementById('deleteHistorySelectedBtn');
    if (deleteHistorySelectedBtn) {
        deleteHistorySelectedBtn.addEventListener('click', deleteSelectedHistory);
    }

    // Initialize sortable columns
    initSortableColumns();

    // Inventory form
    document.getElementById('inventoryForm').addEventListener('submit', handleInventorySubmit);

    // Handover form
    document.getElementById('handoverForm').addEventListener('submit', submitHandover);

    // Print QR button
    document.getElementById('printQrBtn').addEventListener('click', printQRCode);

    // Set today's date
    document.getElementById('itemDate').valueAsDate = new Date();
    document.getElementById('handoverTanggal').valueAsDate = new Date();

    // Handover search and filter listeners
    const handoverSearchInput = document.getElementById('handoverSearchInput');
    if (handoverSearchInput) {
        handoverSearchInput.addEventListener('input', updateHandoverTable);
    }
    const handoverJenisFilter = document.getElementById('handoverJenisFilter');
    if (handoverJenisFilter) {
        handoverJenisFilter.addEventListener('change', updateHandoverTable);
    }

    // Handover export buttons
    const exportHandoverExcel = document.getElementById('exportHandoverExcel');
    if (exportHandoverExcel) {
        exportHandoverExcel.addEventListener('click', exportHandoverToExcel);
    }
    const exportHandoverPdf = document.getElementById('exportHandoverPdf');
    if (exportHandoverPdf) {
        exportHandoverPdf.addEventListener('click', exportHandoverToPdf);
    }

    // Show/hide SN Converter based on item name
    document.getElementById('itemName').addEventListener('change', function () {
        const snConverterRow = document.getElementById('snConverterRow');
        if (this.value === 'Headset') {
            snConverterRow.style.display = 'flex';
        } else {
            snConverterRow.style.display = 'none';
            document.getElementById('itemSnConverter').value = '';
        }
    });

    // Close modal when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
}

// ========================================
// AUTHENTICATION
// ========================================
function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ========================================
// NAVIGATION
// ========================================
function navigateTo(page) {
    // Update menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });

    // Open submenu if navigating to a submenu item
    const targetSubmenuItem = document.querySelector(`.submenu-item[data-page="${page}"]`);
    if (targetSubmenuItem) {
        const parentHasSubmenu = targetSubmenuItem.previousElementSibling;
        if (parentHasSubmenu && parentHasSubmenu.classList.contains('has-submenu')) {
            parentHasSubmenu.classList.add('open');
            const submenuContainer = parentHasSubmenu.nextElementSibling;
            if (submenuContainer && submenuContainer.classList.contains('submenu')) {
                submenuContainer.classList.add('open');
            }
        }
    }

    // Update page with animation
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    const targetPage = document.getElementById(page + 'Page');
    targetPage.classList.add('active');

    // Add stagger animation to cards on dashboard
    if (page === 'dashboard') {
        const cards = targetPage.querySelectorAll('.stat-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.style.opacity = '0';
            card.style.animation = 'fadeSlideIn 0.5s ease forwards';
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }

    // Update title
    const pageTitles = {
        'dashboard': 'Dashboard',
        'inventory': 'Inventory',
        'input': 'Input Inventaris',
        'scan': 'Cek Inventaris',
        'history': 'History',
        'handover': 'Serah Terima',
        'handover-data': 'Data Serah Terima',
        'handover-input': 'Input Serah Terima'
    };
    document.getElementById('pageTitle').textContent = pageTitles[page];

    // Update content
    if (page === 'dashboard') {
        updateDashboard();
    } else if (page === 'inventory') {
        updateInventoryTable();
    } else if (page === 'scan') {
        initScanPage();
    } else if (page === 'history') {
        loadHistory();
    } else if (page === 'handover' || page === 'handover-data') {
        loadHandover();
    } else if (page === 'handover-input') {
        loadHandover();
        // Reinit signature pad after brief delay to ensure canvas is visible
        setTimeout(() => {
            if(typeof initSignaturePad === 'function') initSignaturePad();
        }, 150);
    }
}

// ========================================
// API FUNCTIONS
// ========================================
async function loadInventory() {
    try {
        const response = await fetch('/api/inventory');
        inventoryData = await response.json();
        updateDashboard();
        initializePagination();
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Gagal memuat data inventaris!', true);
    }
}

async function addInventory(item) {
    try {
        const response = await fetch('/api/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
        });

        const data = await response.json();
        if (data.success) {
            inventoryData.push(data.item);
            updateDashboard();
            updateInventoryTable();
            return data.item;
        }
    } catch (error) {
        console.error('Error adding inventory:', error);
        showToast('Gagal menambahkan item!', true);
    }
    return null;
}

async function updateInventoryItem(id, updatedItem) {
    try {
        const response = await fetch(`/api/inventory/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedItem)
        });

        const data = await response.json();
        if (data.success) {
            const index = inventoryData.findIndex(item => item.id === id);
            if (index !== -1) {
                inventoryData[index] = data.item;
            }
            updateDashboard();
            updateInventoryTable();
            return true;
        }
    } catch (error) {
        console.error('Error updating inventory:', error);
        showToast('Gagal memperbarui item!', true);
    }
    return false;
}

async function deleteInventoryItem(id) {
    try {
        const response = await fetch(`/api/inventory/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            inventoryData = inventoryData.filter(item => item.id !== id);
            updateDashboard();
            updateInventoryTable();
            return true;
        }
    } catch (error) {
        console.error('Error deleting inventory:', error);
        showToast('Gagal menghapus item!', true);
    }
    return false;
}

function toggleItemSelection(id) {
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
    } else {
        selectedItems.add(id);
    }
    updateSelectedCount();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.row-checkbox');

    if (selectAllCheckbox.checked) {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const filterSelect = document.getElementById('exportFilter');
        const filterValue = filterSelect ? filterSelect.value : 'all';

        const filtered = inventoryData.filter(item => {
            if (filterValue !== 'all' && item.name !== filterValue) {
                return false;
            }
            const matchesSearch = (item.name && item.name.toLowerCase().includes(search)) ||
                (item.merk && item.merk.toLowerCase().includes(search)) ||
                (item.sn && item.sn.toLowerCase().includes(search)) ||
                (item.lokasi && item.lokasi.toLowerCase().includes(search));
            return matchesSearch;
        });

        filtered.forEach(item => selectedItems.add(item.id));
    } else {
        selectedItems.clear();
    }

    checkboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
    });

    updateSelectedCount();
}

function updateSelectedCount() {
    const countEl = document.getElementById('selectedCount');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const generateQrBtn = document.getElementById('generateQrBtn');
    const count = selectedItems.size;

    if (countEl) countEl.textContent = count;

    if (deleteBtn) {
        deleteBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (generateQrBtn) {
        generateQrBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

function updateActionButtons() {
    // Same as updateSelectedCount - duplicate for compatibility
    updateSelectedCount();
}

async function deleteSelectedItems() {
    if (selectedItems.size === 0) {
        showToast('Pilih item yang ingin dihapus!', true);
        return;
    }

    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus ${selectedItems.size} item?`);
    if (!confirmDelete) return;

    try {
        const response = await fetch('/api/inventory/bulk-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: Array.from(selectedItems) })
        });

        const data = await response.json();
        if (data.success) {
            inventoryData = inventoryData.filter(item => !selectedItems.has(item.id));
            selectedItems.clear();
            updateSelectedCount();
            updateDashboard();
            updateInventoryTable();
            showToast(`${data.count} item berhasil dihapus!`);
        }
    } catch (error) {
        console.error('Error deleting selected items:', error);
        showToast('Gagal menghapus item!', true);
    }
}

// ========================================
// DASHBOARD
// ========================================
function updateDashboard() {
    // Calculate stats
    const total = inventoryData.length;
    const monitors = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'monitor').length;
    const keyboards = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'keyboard').length;
    const mice = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'mouse').length;
    const headsets = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'headset').length;
    const laptops = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'laptop').length;
    const pcs = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'pc').length;
    const tvs = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'tv').length;

    // Animate count-up for stats
    animateCountUp('totalItems', total);
    animateCountUp('totalMonitors', monitors);
    animateCountUp('totalKeyboards', keyboards);
    animateCountUp('totalMice', mice);
    animateCountUp('totalHeadsets', headsets);
    animateCountUp('totalLaptops', laptops);
    animateCountUp('totalPCs', pcs);
    animateCountUp('totalTVs', tvs);

    // Update recent activity
    const recentTableBody = document.getElementById('recentTableBody');
    const recentItems = inventoryData.slice(-5).reverse();

    if (recentItems.length === 0) {
        recentTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-secondary);">Belum ada aktivitas</td></tr>';
    } else {
        recentTableBody.innerHTML = recentItems.map((item, index) => `
            <tr style="animation: fadeSlideIn 0.5s ease forwards; animation-delay: ${index * 0.1}s; opacity: 0;">
                <td><span class="category-badge ${(item.name || '').toLowerCase()}">${item.name || '-'}</span></td>
                <td>${item.merk || '-'}</td>
                <td><span class="barcode-display">${item.sn || '-'}</span></td>
                <td>${item.lokasi || '-'}</td>
                <td><span class="status-badge ${(item.kondisiBefore || '').replace(/\s+/g, '_')}">${item.kondisiBefore || '-'}</span></td>
                <td><span class="status-badge ${(item.kondisiAfter || '').replace(/\s+/g, '_')}">${item.kondisiAfter || '-'}</span></td>
                <td><span class="status-badge ${(item.checklist || '')}">${item.checklist || '-'}</span></td>
                <td>${item.catatan || '-'}</td>
                <td>${item.date || '-'}</td>
                <td><span class="barcode-display">${item.id || '-'}</span></td>
            </tr>
        `).join('');
    }
    
    // Update charts
    if(typeof updateChartsData === 'function') updateChartsData();
}


// ========================================
// COUNT-UP ANIMATION
// ========================================
function animateCountUp(elementId, targetValue, duration = 1500) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = 0;
    const startTime = performance.now();

    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(updateValue);
        } else {
            element.textContent = targetValue;
        }
    }

    requestAnimationFrame(updateValue);
}

// ========================================
// INVENTORY TABLE
// ========================================
let currentPage = 1;
let itemsPerPage = 10;

function changeViewLimit() {
    const select = document.getElementById('viewLimit');
    if (select) {
        itemsPerPage = parseInt(select.value);
    }
    currentPage = 1;
    updateInventoryTable();
}

function initializePagination() {
    const select = document.getElementById('viewLimit');
    if (select) {
        itemsPerPage = parseInt(select.value);
    }
    currentPage = 1;
    console.log('Initializing pagination - Items per page:', itemsPerPage, 'Total data:', inventoryData.length);
    updateInventoryTable();
}

function changePage(direction) {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filterSelect = document.getElementById('exportFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';

    let filtered = inventoryData.filter(item => {
        if (filterValue !== 'all' && item.name !== filterValue) return false;
        const matchesSearch = (item.name && item.name.toLowerCase().includes(search)) ||
            (item.merk && item.merk.toLowerCase().includes(search)) ||
            (item.sn && item.sn.toLowerCase().includes(search)) ||
            (item.lokasi && item.lokasi.toLowerCase().includes(search));
        return matchesSearch;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    updateInventoryTable();
}

function goToPage(page) {
    currentPage = page;
    updateInventoryTable();
}

function updateInventoryTable() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filterSelect = document.getElementById('exportFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';

    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    let filtered = inventoryData.filter(item => {
        if (filterValue !== 'all' && item.name !== filterValue) return false;
        const matchesSearch = (item.name && item.name.toLowerCase().includes(search)) ||
            (item.merk && item.merk.toLowerCase().includes(search)) ||
            (item.sn && item.sn.toLowerCase().includes(search)) ||
            (item.lokasi && item.lokasi.toLowerCase().includes(search));
        return matchesSearch;
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // Ensure itemsPerPage is valid
    if (!itemsPerPage || itemsPerPage < 1) itemsPerPage = 10;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    // Debug log
    console.log('Pagination - Page:', currentPage, 'ItemsPerPage:', itemsPerPage, 'Start:', startIndex, 'End:', endIndex, 'Total:', totalItems);

    // Force slice to work correctly
    const paginatedData = filtered.slice(startIndex, endIndex);
    console.log('Paginated data count:', paginatedData.length);

    const tableBody = document.getElementById('inventoryTableBody');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('inventoryPagination');
    const showingStart = document.getElementById('showingStart');
    const showingEnd = document.getElementById('showingEnd');
    const totalData = document.getElementById('totalData');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageNumbers = document.getElementById('pageNumbers');

    if (totalItems === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        if (pagination) pagination.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        if (pagination) pagination.style.display = 'flex';

        tableBody.innerHTML = paginatedData.map((item, index) => {
            const isSelected = selectedItems.has(item.id);
            // Status badge classes - ensure proper styling
            const kondisiBeforeClass = getStatusBadgeClass(item.kondisiBefore);
            const kondisiAfterClass = getStatusBadgeClass(item.kondisiAfter);
            const checklistClass = item.checklist === 'Ya' ? 'checked' : 'unchecked';
            const categoryClass = getCategoryBadgeClass(item.name);

            return `
            <tr data-id="${item.id}" class="${isSelected ? 'selected-row' : ''}">
                <td><input type="checkbox" class="row-checkbox" ${isSelected ? 'checked' : ''}></td>
                <td><span class="category-badge ${categoryClass}">${item.name || '-'}</span></td>
                <td>${item.merk || '-'}</td>
                <td><span class="barcode-value">${item.sn || '-'}</span></td>
                <td><span class="barcode-value">${item.snConverter || '-'}</span></td>
                <td>${item.lokasi || '-'}</td>
                <td><span class="status-badge ${kondisiBeforeClass}">${item.kondisiBefore || '-'}</span></td>
                <td><span class="status-badge ${kondisiAfterClass}">${item.kondisiAfter || '-'}</span></td>
                <td><span class="status-badge ${checklistClass}">${item.checklist || '-'}</span></td>
                <td>${item.catatan || '-'}</td>
                <td>${item.tanggalMasuk || '-'}</td>
                <td>${item.date || '-'}</td>
                <td>
                    ${item.qrCode
                    ? `<img src="${item.qrCode}" alt="QR" class="qr-thumbnail">`
                    : `<span class="no-data">-</span>`
                }
                </td>
                <td><span class="barcode-value">${item.barcode || item.id || '-'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewItem('${item.id}')" title="Lihat"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" onclick="editItem('${item.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="deleteItem('${item.id}')" title="Hapus"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        // Attach checkbox event listeners AFTER rendering
        attachCheckboxListeners();

        // Attach action button event listeners
        attachActionButtonListeners();

        if (showingStart) showingStart.textContent = totalItems > 0 ? startIndex + 1 : 0;
        if (showingEnd) showingEnd.textContent = endIndex;
        if (totalData) totalData.textContent = totalItems;

        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

        if (pageNumbers) {
            let html = '';
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    html += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    html += `<span class="ellipsis">...</span>`;
                }
            }
            pageNumbers.innerHTML = html;
        }

        // Re-attach checkbox listeners after table render
        attachCheckboxListeners();
    }
}

// ========================================
// INPUT INVENTORY
// ========================================
async function handleInventorySubmit(e) {
    e.preventDefault();

    const newItem = {
        name: document.getElementById('itemName').value,
        merk: document.getElementById('itemMerk').value,
        sn: document.getElementById('itemSn').value,
        snConverter: document.getElementById('itemSnConverter').value,
        lokasi: document.getElementById('itemLocation').value,
        kondisiBefore: document.getElementById('itemKondisiBefore').value,
        checklist: document.getElementById('itemChecklist').value,
        kondisiAfter: document.getElementById('itemKondisiAfter').value,
        catatan: document.getElementById('itemCatatan').value,
        tanggalMasuk: document.getElementById('itemTanggalMasuk').value,
        date: document.getElementById('itemDate').value,
        qrCode: ''
    };

    // First save to server to get the ID
    const savedItem = await addInventory(newItem);

    if (savedItem) {
        // Now generate QR code with the correct ID
        const qrData = JSON.stringify({
            id: savedItem.id,
            name: savedItem.name,
            merk: savedItem.merk,
            sn: savedItem.sn,
            lokasi: savedItem.lokasi
        });

        // Clear previous QR code
        const qrcodeDiv = document.getElementById('qrcode');
        const qrPlaceholder = document.getElementById('qrPlaceholder');
        qrcodeDiv.innerHTML = '';
        qrcodeDiv.style.display = 'block';
        qrPlaceholder.style.display = 'none';

        // Generate new QR code with correct ID
        new QRCode(qrcodeDiv, {
            text: qrData,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Get QR code as data URL and update on server
        setTimeout(() => {
            const canvas = qrcodeDiv.querySelector('canvas');
            if (canvas) {
                savedItem.qrCode = canvas.toDataURL('image/png');
                updateInventoryItem(savedItem.id, { qrCode: savedItem.qrCode });
            } else {
                const img = qrcodeDiv.querySelector('img');
                if (img) {
                    savedItem.qrCode = img.src;
                    updateInventoryItem(savedItem.id, { qrCode: savedItem.qrCode });
                }
            }
        }, 100);

        // Update UI
        document.getElementById('qrInfo').style.display = 'block';
        document.getElementById('qrItemName').textContent = savedItem.name;
        document.getElementById('qrItemId').textContent = 'ID: ' + savedItem.id;
        document.getElementById('printQrBtn').classList.add('show');

        showToast('Item berhasil ditambahkan!');
        document.getElementById('inventoryForm').reset();
        document.getElementById('itemDate').valueAsDate = new Date();
    }
}

function printQRCode() {
    try {
        var qrcodeDiv = document.getElementById('qrcode');
        if (!qrcodeDiv) {
            showToast('Elemen QR Code tidak ditemukan!', true);
            return;
        }

        // Cari canvas atau img di dalam qrcode div
        var qrImage = qrcodeDiv.querySelector('canvas');
        var imgSrc = '';

        if (qrImage) {
            // Jika canvas, convert ke dataURL
            imgSrc = qrImage.toDataURL('image/png');
        } else {
            // Coba cari img
            qrImage = qrcodeDiv.querySelector('img');
            if (qrImage) {
                imgSrc = qrImage.src;
            }
        }

        // Jika masih tidak ada, coba cari di dalam child lain
        if (!imgSrc) {
            var children = qrcodeDiv.querySelectorAll('*');
            for (var i = 0; i < children.length; i++) {
                if (children[i].tagName === 'CANVAS') {
                    imgSrc = children[i].toDataURL('image/png');
                    break;
                } else if (children[i].tagName === 'IMG') {
                    imgSrc = children[i].src;
                    break;
                }
            }
        }

        if (!imgSrc || imgSrc === '' || imgSrc === 'data:,') {
            showToast('QR Code belum tersedia! Silakan input data terlebih dahulu.', true);
            return;
        }

        var itemIdEl = document.getElementById('qrItemId');
        var itemId = itemIdEl ? itemIdEl.textContent : '';

        // Buka window baru untuk print
        var printWindow = window.open('', '_blank', 'width=400,height=500');
        if (!printWindow) {
            showToast('Popup blocker mencegah membuka jendela print!', true);
            return;
        }

        var htmlContent = '<!DOCTYPE html>' +
            '<html>' +
            '<head>' +
            '<title>Print QR Code - Inventaris</title>' +
            '<style>' +
            'body { margin: 0; padding: 20px; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }' +
            '.container { text-align: center; border: 2px solid #333; padding: 20px; border-radius: 10px; }' +
            'img { width: 180px; height: 180px; }' +
            '.item-id { margin-top: 15px; font-size: 20px; font-weight: bold; font-family: monospace; }' +
            '</style>' +
            '</head>' +
            '<body>' +
            '<div class="container">' +
            '<img src="' + imgSrc + '" />' +
            '<div class="item-id">' + itemId + '</div>' +
            '</div>' +
            '<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }<\/script>' +
            '</body>' +
            '</html>';

        printWindow.document.write(htmlContent);
        printWindow.document.close();

    } catch (e) {
        console.error('Print QR Error:', e);
        showToast('Gagal print QR Code: ' + e.message, true);
    }
}

// ============================================
// HELPER: Export PDF Style
// ============================================
function createPdfDoc(title, orientation) {
    orientation = orientation || 'landscape';
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF(orientation, 'mm', 'a4');
    var pageWidth = doc.internal.pageSize.getWidth();
    var pageHeight = doc.internal.pageSize.getHeight();
    var margin = 20;

    // Header Logo
    try {
        doc.addImage('img/logo1.png', 'PNG', margin, 10, 35, 12);
    } catch (e) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text('ICONNET', margin, 18);
    }

    // Header Title - Modern Design
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text(title, pageWidth / 2, 20, { align: 'center' });

    // Subtitle / Tanggal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('Dicetak pada: ' + formatDate(new Date()), pageWidth / 2, 28, { align: 'center' });

    // Decorative Line
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.8);
    doc.line(margin, 35, pageWidth - margin, 35);

    return { doc: doc, pageWidth: pageWidth, pageHeight: pageHeight };
}

function applyPdfTableStyle(doc, options) {
    var pageWidth = doc.internal.pageSize.getWidth();
    var pageHeight = doc.internal.pageSize.getHeight();

    var defaultOptions = {
        theme: 'grid',
        styles: {
            fontSize: 7.5,
            cellPadding: 3,
            overflow: 'linebreak',
            valign: 'middle',
            halign: 'center',
            lineColor: [226, 232, 240], // Slate 200
            lineWidth: 0.1,
            font: 'helvetica'
        },
        headStyles: {
            fillColor: [79, 70, 229], // Indigo 600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8.5
        },
        bodyStyles: {
            textColor: [30, 41, 59], // Slate 800
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // Slate 50
        },
        margin: { left: 15, right: 15, top: 35, bottom: 20 },
        tableWidth: 'auto', // Auto-fit to page width
        pageBreak: 'auto',
        didDrawPage: function (data) {
            // Footer
            var pageNum = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(148, 163, 184); // Slate 400
            doc.text('Halaman ' + data.pageNumber, pageWidth / 2, pageHeight - 10, { align: 'center' });

            // Branding Footer
            doc.setFontSize(7);
            doc.text('ICONNET - Inventory Management System', 15, pageHeight - 10);
        }
    };

    // Merge options
    if (options) {
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                if (key === 'styles' || key === 'headStyles' || key === 'margin') {
                    // Deep merge for some objects
                    for (var subKey in options[key]) {
                        defaultOptions[key][subKey] = options[key][subKey];
                    }
                } else {
                    defaultOptions[key] = options[key];
                }
            }
        }
    }

    return defaultOptions;
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function viewItem(id) {
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;

    // Store current item ID for print
    window.currentViewItemId = id;

    document.getElementById('viewItemName').textContent = item.name || '-';
    document.getElementById('viewMerk').textContent = item.merk || '-';
    document.getElementById('viewSn').textContent = item.sn || '-';
    document.getElementById('viewSnConverter').textContent = item.snConverter || '-';
    document.getElementById('viewLocation').textContent = item.lokasi || '-';
    document.getElementById('viewKondisiBefore').textContent = item.kondisiBefore || '-';
    document.getElementById('viewChecklist').textContent = item.checklist || '-';
    document.getElementById('viewKondisiAfter').textContent = item.kondisiAfter || '-';
    document.getElementById('viewCatatan').textContent = item.catatan || '-';
    document.getElementById('viewItemDate').textContent = formatDate(item.date);

    // Generate QR in modal
    const modalQr = document.getElementById('modal-qrcode');
    modalQr.innerHTML = '';
    if (item.qrCode) {
        const img = document.createElement('img');
        img.src = item.qrCode;
        img.alt = 'QR Code';
        modalQr.appendChild(img);
    }

    openModal('viewModal');
}

// Print Barcode Function
function printBarcode() {
    const id = window.currentViewItemId;
    if (!id) return;

    const item = inventoryData.find(i => i.id === id);
    if (!item) return;

    // Create print window
    const printWindow = window.open('', '_blank', 'width=400,height=500');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Barcode - ${item.id}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 20px;
                }
                .qrcode-img {
                    width: 180px;
                    height: 180px;
                    margin: 20px 0;
                }
                .item-info {
                    margin-top: 15px;
                    font-size: 14px;
                }
                .item-id {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                @media print {
                    body { margin: 0; }
                }
            </style>
        </head>
        <body>
            <div class="item-id">${item.id}</div>
            <img class="qrcode-img" src="${item.qrCode || ''}" alt="QR Code" onerror="this.style.display='none'">
            <div class="item-info">
                <strong>${item.name || '-'}</strong><br>
                ${item.merk || '-'} | ${item.sn || '-'}
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

function editItem(id) {
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;

    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemName').value = item.name || '';
    document.getElementById('editMerk').value = item.merk || '';
    document.getElementById('editSn').value = item.sn || '';
    document.getElementById('editSnConverter').value = item.snConverter || '';
    document.getElementById('editLocation').value = item.lokasi || '';
    document.getElementById('editKondisiBefore').value = item.kondisiBefore || 'Baik';
    document.getElementById('editChecklist').value = item.checklist || 'Tidak';
    document.getElementById('editKondisiAfter').value = item.kondisiAfter || 'Baik';
    document.getElementById('editCatatan').value = item.catatan || '';
    document.getElementById('editTanggalMasuk').value = item.tanggalMasuk || item.date || '';
    document.getElementById('editItemDate').value = item.date || '';

    const snConverterRow = document.getElementById('editSnConverterRow');
    if (item.name === 'Headset') {
        snConverterRow.style.display = 'flex';
    } else {
        snConverterRow.style.display = 'none';
    }

    openModal('editModal');
}

async function saveEdit() {
    const id = document.getElementById('editItemId').value;
    const updatedItem = {
        name: document.getElementById('editItemName').value,
        merk: document.getElementById('editMerk').value,
        sn: document.getElementById('editSn').value,
        snConverter: document.getElementById('editSnConverter').value,
        lokasi: document.getElementById('editLocation').value,
        kondisiBefore: document.getElementById('editKondisiBefore').value,
        checklist: document.getElementById('editChecklist').value,
        kondisiAfter: document.getElementById('editKondisiAfter').value,
        catatan: document.getElementById('editCatatan').value,
        tanggalMasuk: document.getElementById('editTanggalMasuk').value,
        date: document.getElementById('editItemDate').value
    };

    // Generate QR code if item doesn't have one
    const currentItem = inventoryData.find(i => i.id === id);
    if (!currentItem || !currentItem.qrCode) {
        const qrData = JSON.stringify({
            id: id,
            name: updatedItem.name,
            merk: updatedItem.merk,
            sn: updatedItem.sn,
            lokasi: updatedItem.lokasi
        });

        // Generate QR code
        const qrContainer = document.createElement('div');
        new QRCode(qrContainer, {
            text: qrData,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Wait for QR code to generate
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = qrContainer.querySelector('canvas');
        if (canvas) {
            updatedItem.qrCode = canvas.toDataURL('image/png');
        } else {
            const img = qrContainer.querySelector('img');
            if (img) {
                updatedItem.qrCode = img.src;
            }
        }
    }

    const success = await updateInventoryItem(id, updatedItem);

    if (success) {
        closeModal('editModal');
        showToast('Item berhasil diperbarui! QR Code telah digenerate.');
    }
}

function deleteItem(id) {
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;

    deleteItemId = id;
    document.getElementById('deleteItemName').textContent = item.name;
    openModal('deleteModal');
}

async function confirmDelete() {
    if (deleteItemId) {
        const success = await deleteInventoryItem(deleteItemId);

        if (success) {
            deleteItemId = null;
            closeModal('deleteModal');
            showToast('Item berhasil dihapus!');
        }
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// ========================================
// EXPORT FUNCTIONS
// ========================================
async function exportToExcel() {
    if (inventoryData.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }

    // Get filter value
    const filterValue = document.getElementById('exportFilter') ? document.getElementById('exportFilter').value : 'all';

    // Filter data based on selection
    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name && item.name.toLowerCase() === filterValue.toLowerCase());
    }

    if (filteredData.length === 0) {
        showToast('Tidak ada data untuk filter ini!', true);
        return;
    }

    showToast('Sedang menyiapkan file Excel...');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');

    // Add headers
    const headers = ['ID', 'QR Code', 'Nama Barang', 'Merk', 'SN', 'SN Converter', 'Lokasi', 'Kondisi (Before)', 'Kondisi (After)', 'Checklist', 'Catatan', 'Tanggal Barang Masuk', 'Tanggal Input'];
    const headerRow = worksheet.addRow(headers);

    // Style header
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF037A89' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Set column widths
    worksheet.columns = [
        { width: 12 }, // ID
        { width: 15 }, // QR Code
        { width: 20 }, // Nama Barang
        { width: 15 }, // Merk
        { width: 20 }, // SN
        { width: 20 }, // SN Converter
        { width: 20 }, // Lokasi
        { width: 18 }, // Kondisi (Before)
        { width: 18 }, // Kondisi (After)
        { width: 12 }, // Checklist
        { width: 25 }, // Catatan
        { width: 18 }, // Tanggal Barang Masuk
        { width: 15 }  // Tanggal Input
    ];

    // Add data
    for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];
        const rowIndex = i + 2; // +1 for 1-based index, +1 for header

        const rowData = [
            item.id,
            '', // Placeholder for QR code
            item.name,
            item.merk,
            item.sn,
            item.snConverter || '',
            item.lokasi,
            item.kondisiBefore,
            item.kondisiAfter,
            item.checklist,
            item.catatan,
            formatDate(item.tanggalMasuk),
            formatDate(item.date)
        ];

        const row = worksheet.addRow(rowData);
        row.height = 80; // Make row tall enough for image
        row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Add QR code image if exists
        if (item.qrCode) {
            try {
                let base64Data;
                if (item.qrCode.startsWith('data:image')) {
                    // Strip the data URI prefix to get raw base64
                    base64Data = item.qrCode.split(',')[1];
                } else {
                    // It's a URL path, need to fetch it
                    const response = await fetch(item.qrCode);
                    const blob = await response.blob();
                    const dataUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    base64Data = dataUrl.split(',')[1];
                }

                const imageId = workbook.addImage({
                    base64: base64Data,
                    extension: 'png',
                });

                worksheet.addImage(imageId, {
                    tl: { col: 1, row: rowIndex - 1 },
                    br: { col: 2, row: rowIndex },
                    editAs: 'oneCell'
                });
            } catch (error) {
                console.error('Error adding image to Excel:', error);
            }
        }
    }

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const filterText = filterValue === 'all' ? 'Semua' : filterValue;
    anchor.download = `Inventory_${filterText}_${formatDate(new Date())}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);

    showToast('Berhasil export ke Excel dengan QR Code!');
}

function exportToPdf() {
    if (inventoryData.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }

    const filterValue = document.getElementById('exportFilter') ? document.getElementById('exportFilter').value : 'all';

    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name && item.name.toLowerCase() === filterValue.toLowerCase());
    }

    if (filteredData.length === 0) {
        showToast('Tidak ada data untuk filter ini!', true);
        return;
    }

    const result = createPdfDoc('LAPORAN DATA INVENTARIS', 'landscape');
    const doc = result.doc;

    const tableData = filteredData.map((item, index) => [
        index + 1,
        item.id || '-',
        item.name || '-',
        item.merk || '-',
        item.sn || '-',
        item.snConverter || '-',
        item.lokasi || '-',
        item.kondisiBefore || '-',
        item.kondisiAfter || '-',
        item.checklist || '-',
        item.catatan || '-',
        formatTanggalIndonesia(item.tanggalMasuk),
        formatTanggalIndonesia(item.date)
    ]);

    const tableOptions = applyPdfTableStyle(doc, {
        head: [['No', 'ID', 'Nama', 'Merk', 'SN', 'SN Conv', 'Lokasi', 'Kondisi(B)', 'Kondisi(A)', 'Cek', 'Catatan', 'Tgl Barang Masuk', 'Tgl Input']],
        body: tableData,
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 18 },
            2: { cellWidth: 20, halign: 'left' },
            3: { cellWidth: 18 },
            4: { cellWidth: 22 },
            5: { cellWidth: 20 },
            6: { cellWidth: 22, halign: 'left' },
            7: { cellWidth: 16 },
            8: { cellWidth: 16 },
            9: { cellWidth: 10 },
            10: { cellWidth: 35, halign: 'left' },
            11: { cellWidth: 30 },
            12: { cellWidth: 'auto' }
        }
    });

    doc.autoTable(tableOptions);

    const filterText = filterValue === 'all' ? 'Semua' : filterValue;
    doc.save(`Inventory_${filterText}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Berhasil export ke PDF!');
}

// ========================================
// GENERATE QR FOR SELECTED ITEMS
// ========================================
function generateQRForSelected() {
    const selected = Array.from(selectedItems);

    if (selected.length === 0) {
        showToast('Pilih item terlebih dahulu!', true);
        return;
    }

    let successCount = 0;
    let alreadyExistCount = 0;
    let errorCount = 0;

    selected.forEach(id => {
        const item = inventoryData.find(i => i.id === id);
        if (!item) return;

        // CEK DULU: Apakah QR sudah ada?
        if (item.qrCode && item.qrCode.length > 0) {
            // QR sudah ada - jangan generate ulang
            alreadyExistCount++;
            console.log(`QR already exists for item: ${item.id} - ${item.name}`);
            return;
        }

        // QR belum ada - generate baru
        // Konsisten: QR selalu dibuat dari SN (jika ada), kalau tidak dari ID
        const qrValue = item.sn || item.id;

        if (!qrValue) {
            console.log(`Cannot generate QR: no SN or ID for item: ${item.id}`);
            errorCount++;
            return;
        }

        // Generate QR code menggunakan QRCode library
        const qrContainer = document.createElement('div');
        qrContainer.style.display = 'none';
        document.body.appendChild(qrContainer);

        try {
            new QRCode(qrContainer, {
                text: qrValue,
                width: 128,
                height: 128,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });

            // Tunggu QR code selesai digenerate
            setTimeout(() => {
                const canvas = qrContainer.querySelector('canvas');
                const img = qrContainer.querySelector('img');

                let qrBase64 = '';
                if (canvas) {
                    qrBase64 = canvas.toDataURL('image/png');
                } else if (img) {
                    qrBase64 = img.src;
                }

                if (qrBase64) {
                    // Update local data
                    item.qrCode = qrBase64;
                    item.qrData = qrValue; // Simpan value untuk konsistensi

                    // Save ke database
                    fetch(`/api/inventory/${item.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            qrCode: qrBase64,
                            qrData: qrValue
                        })
                    })
                        .then(res => res.json())
                        .then(result => {
                            if (result.success) {
                                successCount++;
                                console.log(`QR generated successfully for: ${item.id}`);
                            }
                        })
                        .catch(err => {
                            console.error('Error saving QR:', err);
                            errorCount++;
                        });
                }

                // Clean up
                document.body.removeChild(qrContainer);
            }, 100);
        } catch (e) {
            console.error('Error generating QR:', e);
            errorCount++;
            if (qrContainer.parentNode) {
                document.body.removeChild(qrContainer);
            }
        }
    });

    // Tampilkan hasil setelah proses
    setTimeout(() => {
        let message = '';

        if (alreadyExistCount > 0 && successCount === 0) {
            message = `QR Code sudah tersedia untuk ${alreadyExistCount} item!`;
            showToast(message, true);
        } else if (alreadyExistCount > 0 && successCount > 0) {
            message = `${successCount} QR baru digenerate, ${alreadyExistCount} sudah ada!`;
            showToast(message);
        } else if (successCount > 0) {
            message = `${successCount} QR Code berhasil digenerate!`;
            showToast(message);
            updateInventoryTable();
        } else if (errorCount > 0) {
            message = `${errorCount} QR gagal digenerate!`;
            showToast(message, true);
        } else {
            showToast('Tidak ada QR yang perlu digenerate!', true);
        }
    }, 800);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    toast.classList.toggle('error', isError);
    toast.querySelector('i').className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// SCAN/CHECK INVENTORY FUNCTIONS
// ========================================
let checkedItems = {};
let html5QrcodeScanner = null;
let scanInitialized = false;

function initScanPage() {
    loadCheckedItems();
    renderScanTable();
    updateScanStats();

    if (scanInitialized) {
        const scanInput = document.getElementById('scanInput');
        if (scanInput) scanInput.focus();
        return;
    }

    // Set up scan input
    const scanInput = document.getElementById('scanInput');
    const scanBtn = document.getElementById('scanBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const resetBtn = document.getElementById('resetCheckBtn');
    const closeScannerBtn = document.getElementById('closeScannerBtn');
    const exportExcelBtn = document.getElementById('exportCheckExcelBtn');
    const exportPdfBtn = document.getElementById('exportCheckPdfBtn');

    if (scanBtn) {
        scanBtn.addEventListener('click', performScan);
    }

    if (scanInput) {
        scanInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                performScan();
            }
        });
        scanInput.focus();
    }

    // Camera button
    if (cameraBtn) {
        cameraBtn.addEventListener('click', toggleCamera);
    }

    // Close scanner button
    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', stopCamera);
    }

    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', async function () {
            if (confirm('Apakah Anda yakin ingin mereset semua checklist di database?')) {
                try {
                    const response = await fetch('/api/inventory/reset-checklist', { method: 'POST' });
                    const data = await response.json();

                    if (data.success) {
                        checkedItems = {};
                        saveCheckedItems();

                        // Update local inventoryData
                        inventoryData.forEach(item => item.checklist = 'Tidak');

                        renderScanTable();
                        updateScanStats();
                        showToast('Semua status checklist telah direset');
                    } else {
                        showToast('Gagal mereset checklist!', true);
                    }
                } catch (error) {
                    console.error('Error resetting checklist:', error);
                    showToast('Terjadi kesalahan saat mereset!', true);
                }
            }
        });
    }

    // Export buttons
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportChecklistToExcel);
    }
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportChecklistToPdf);
    }

    // Scan filter dropdown
    const scanFilter = document.getElementById('scanFilter');
    if (scanFilter) {
        scanFilter.addEventListener('change', function () {
            scanPage = 1;
            renderScanTable();
            updateScanStats();
        });
    }

    // Scan view limit dropdown
    const scanViewLimit = document.getElementById('scanViewLimit');
    if (scanViewLimit) {
        scanViewLimit.addEventListener('change', function () {
            var newLimit = parseInt(this.value);
            scanItemsPerPage = newLimit;
            scanPage = 1;
            renderScanTable();
        });
    }

    // Handover delete selected button
    const deleteHandoverSelectedBtn = document.getElementById('deleteHandoverSelectedBtn');
    if (deleteHandoverSelectedBtn) {
        deleteHandoverSelectedBtn.addEventListener('click', deleteSelectedHandover);
    }
}

function toggleCamera() {
    const scannerContainer = document.getElementById('scannerContainer');
    const scanInput = document.getElementById('scanInput');

    if (scannerContainer.style.display === 'none') {
        scannerContainer.style.display = 'block';
        startCamera();
    } else {
        stopCamera();
    }
}

function startCamera() {
    if (html5QrcodeScanner) {
        return;
    }

    // Check if Secure Context (HTTPS)
    const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
        showToast('Kamera membutuhkan HTTPS untuk berjalan di HP!', true);
        alert('Fitur kamera di HP diblokir browser karena menggunakan HTTP biasa. \n\nSolusi: \n1. Gunakan Ngrok untuk mendapatkan link HTTPS \n2. Atau buka chrome://flags/#unsafely-treat-insecure-origin-as-secure di Chrome HP dan masukkan IP komputer Anda.');
        return;
    }

    html5QrcodeScanner = new Html5Qrcode("reader");

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error("Error starting camera:", err);
        showToast('Gagal mengakses kamera! Pastikan izin diberikan.', true);
    });
}

function stopCamera() {
    const scannerContainer = document.getElementById('scannerContainer');

    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner = null;
            scannerContainer.style.display = 'none';
        }).catch(err => {
            console.error("Error stopping camera:", err);
            html5QrcodeScanner = null;
            scannerContainer.style.display = 'none';
        });
    } else {
        scannerContainer.style.display = 'none';
    }
}

function onScanSuccess(decodedText, decodedResult) {
    // Handle the scanned code
    const scanInput = document.getElementById('scanInput');

    // Parse JSON if QR contains data like {"id":"INV-001","name":"monitor",...}
    let searchId = decodedText;
    try {
        const parsed = JSON.parse(decodedText);
        // Extract ID from JSON object
        searchId = parsed.id || decodedText;
    } catch (e) {
        // Not JSON, use as-is
        searchId = decodedText;
    }

    scanInput.value = searchId;
    performScan();
    stopCamera();
}

function onScanFailure(error) {
    // Handle scan failure, usually better to ignore and keep scanning
}

async function performScan() {
    const scanInput = document.getElementById('scanInput');
    const searchValue = scanInput.value.trim().toUpperCase();

    if (!searchValue) {
        showToast('Mohon masukkan ID atau barcode', true);
        return;
    }

    try {
        const response = await fetch('/api/inventory/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchValue })
        });

        const data = await response.json();

        if (data.success) {
            const item = data.item;
            const alreadyChecked = data.status === 'already_checked';

            // Sync local inventoryData
            const localIdx = inventoryData.findIndex(i => i.id === item.id);
            if (localIdx !== -1) {
                inventoryData[localIdx].checklist = 'Ya';
            }

            // Update local checkedItems for immediate UI updates
            checkedItems[item.id] = {
                checked: true,
                checkTime: new Date().toISOString()
            };

            saveCheckedItems();
            renderScanTable();
            updateScanStats();

            // Clear input FIRST to prevent double trigger
            scanInput.value = '';
            scanInput.focus();

            // Show scan result popup
            showScanResultPopup(item, alreadyChecked);
        } else {
            showToast(data.status === 'not_found' ? 'Barang tidak ditemukan!' : (data.message || 'Error checking item'), true);
        }
    } catch (error) {
        console.error('Error in performScan:', error);
        showToast(`Gagal: ${error.message || 'Koneksi bermasalah'}`, true);
    }
}

function showScanResultPopup(item, isDuplicate) {
    const modal = document.getElementById('scanResultModal');
    const title = document.getElementById('scanResultTitle');
    const statusDiv = document.getElementById('scanResultStatus');
    const tableBody = document.getElementById('scanResultTableBody');

    if (isDuplicate) {
        modal.classList.remove('scan-result-modal-new');
        modal.classList.add('scan-result-modal-duplicate');
        title.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Barang Sudah Pernah Dicek';
        statusDiv.className = 'scan-result-banner scan-result-status-duplicate';
        statusDiv.innerHTML = '<i class="fas fa-history"></i> Barang ini sudah pernah discan sebelumnya!';
    } else {
        modal.classList.remove('scan-result-modal-duplicate');
        modal.classList.add('scan-result-modal-new');
        title.innerHTML = '<i class="fas fa-check-circle"></i> Berhasil Dicek';
        statusDiv.className = 'scan-result-banner scan-result-status-new';
        statusDiv.innerHTML = '<i class="fas fa-star"></i> Barang berhasil dicek untuk pertama kali.';
    }

    const statusBadge = isDuplicate
        ? '<span class="status-badge-inline warning"><i class="fas fa-history"></i> Sudah Dicek</span>'
        : '<span class="status-badge-inline success"><i class="fas fa-check"></i> Pertama Kali</span>';

    const checkTime = isDuplicate ? (checkedItems[item.id] ? checkedItems[item.id].checkTime : null) : new Date().toISOString();

    tableBody.innerHTML = `
        <tr>
            <td><i class="fas fa-tag"></i> ID Inventaris</td>
            <td>${item.id}</td>
        </tr>
        <tr>
            <td><i class="fas fa-cube"></i> Nama Barang</td>
            <td><span class="badge primary">${item.name}</span></td>
        </tr>
        <tr>
            <td><i class="fas fa-industry"></i> Merk</td>
            <td>${item.merk}</td>
        </tr>
        <tr>
            <td><i class="fas fa-barcode"></i> Serial Number</td>
            <td>${item.sn}</td>
        </tr>
        <tr>
            <td><i class="fas fa-exchange-alt"></i> SN Converter</td>
            <td>${item.snConverter || '-'}</td>
        </tr>
        <tr>
            <td><i class="fas fa-map-marker-alt"></i> Lokasi</td>
            <td>${item.lokasi}</td>
        </tr>
        <tr>
            <td><i class="fas fa-heartbeat"></i> Kondisi</td>
            <td><span class="badge success">${item.kondisiAfter || item.kondisiBefore || 'Baik'}</span></td>
        </tr>
        <tr>
            <td><i class="fas fa-clipboard-check"></i> Checklist</td>
            <td>${item.checklist === 'Ya' ? 'Sudah' : 'Belum'}</td>
        </tr>
        <tr>
            <td><i class="fas fa-flag"></i> Status Akhir</td>
            <td>${statusBadge}</td>
        </tr>
        <tr>
            <td><i class="far fa-clock"></i> Waktu Dicek</td>
            <td>${formatDateTime(checkTime)}</td>
        </tr>
    `;

    openModal('scanResultModal');
}

// SCAN PAGINATION
let scanPage = 1;
let scanItemsPerPage = 10;

function changeScanPage(direction) {
    const filterSelect = document.getElementById('scanFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    const limitSelect = document.getElementById('scanViewLimit');
    scanItemsPerPage = parseInt(limitSelect.value);

    let filtered = inventoryData;
    if (filterValue !== 'all') {
        filtered = inventoryData.filter(item => item.name === filterValue);
    }

    const totalPages = Math.ceil(filtered.length / scanItemsPerPage);
    scanPage += direction;

    if (scanPage < 1) scanPage = 1;
    if (scanPage > totalPages) scanPage = totalPages;

    renderScanTable();
}

function goToScanPage(page) {
    scanPage = page;
    renderScanTable();
}

function renderScanTable() {
    const tableBody = document.getElementById('scanTableBody');
    if (!tableBody) return;

    const filterSelect = document.getElementById('scanFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    const limitSelect = document.getElementById('scanViewLimit');
    scanItemsPerPage = parseInt(limitSelect.value);

    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name === filterValue);
    }

    const totalItems = filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / scanItemsPerPage));

    if (scanPage > totalPages) scanPage = totalPages;
    if (scanPage < 1) scanPage = 1;

    const startIndex = (scanPage - 1) * scanItemsPerPage;
    const endIndex = Math.min(startIndex + scanItemsPerPage, totalItems);
    const paginatedData = totalItems > 0 ? filteredData.slice(startIndex, endIndex) : [];

    const pagination = document.getElementById('scanPagination');
    const showingStart = document.getElementById('scanShowingStart');
    const showingEnd = document.getElementById('scanShowingEnd');
    const totalData = document.getElementById('scanTotalData');
    const prevBtn = document.getElementById('scanPrevBtn');
    const nextBtn = document.getElementById('scanNextBtn');
    const pageNumbers = document.getElementById('scanPageNumbers');

    if (totalItems === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Tidak ada data inventaris</td></tr>';
        if (pagination) pagination.style.display = 'none';
        return;
    }

    if (pagination) pagination.style.display = 'flex';

    tableBody.innerHTML = paginatedData.map(item => {
        const isChecked = checkedItems[item.id] && checkedItems[item.id].checked;
        const checkTime = isChecked ? checkedItems[item.id].checkTime : null;
        const rowClass = isChecked ? 'scan-item-checked' : '';
        const statusBadge = isChecked
            ? '<span class="status-badge checked">Sudah Dicek</span>'
            : '<span class="status-badge unchecked">Belum Dicek</span>';

        return `
            <tr class="${rowClass}" data-id="${item.id}">
                <td>${statusBadge}</td>
                <td><span class="barcode-display">${item.id || '-'}</span></td>
                <td><span class="category-badge ${(item.name || '').toLowerCase()}">${item.name || '-'}</span></td>
                <td>${item.merk || '-'}</td>
                <td><span class="barcode-display">${item.sn || '-'}</span></td>
                <td>${item.lokasi || '-'}</td>
                <td>${checkTime ? formatDateTime(checkTime) : '-'}</td>
            </tr>
        `;
    }).join('');

    if (showingStart) showingStart.textContent = totalItems > 0 ? startIndex + 1 : 0;
    if (showingEnd) showingEnd.textContent = endIndex;
    if (totalData) totalData.textContent = totalItems;

    if (prevBtn) prevBtn.disabled = scanPage === 1;
    if (nextBtn) nextBtn.disabled = scanPage >= totalPages;

    if (pageNumbers) {
        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= scanPage - 1 && i <= scanPage + 1)) {
                html += `<button class="page-number ${i === scanPage ? 'active' : ''}" onclick="goToScanPage(${i})">${i}</button>`;
            } else if (i === scanPage - 2 || i === scanPage + 2) {
                html += `<span class="ellipsis">...</span>`;
            }
        }
        pageNumbers.innerHTML = html;
    }
}

function updateScanStats() {
    // Get filter value
    const filterSelect = document.getElementById('scanFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';

    // Filter inventory data for stats
    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name === filterValue);
    }

    const total = filteredData.length;
    let checked = 0;

    filteredData.forEach(item => {
        if (checkedItems[item.id] && checkedItems[item.id].checked) {
            checked++;
        }
    });

    const unchecked = total - checked;

    document.getElementById('totalToCheck').textContent = total;
    document.getElementById('totalChecked').textContent = checked;
    document.getElementById('totalUnchecked').textContent = unchecked;
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function loadCheckedItems() {
    const saved = localStorage.getItem('checkedItems');
    if (saved) {
        checkedItems = JSON.parse(saved);
    }
}

function saveCheckedItems() {
    localStorage.setItem('checkedItems', JSON.stringify(checkedItems));
}

// Export checklist to Excel
async function exportChecklistToExcel() {
    if (inventoryData.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }

    // Get filter value
    const filterSelect = document.getElementById('scanFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';

    // Filter inventory data
    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name === filterValue);
    }

    if (filteredData.length === 0) {
        showToast('Tidak ada data untuk diexport!', true);
        return;
    }

    showToast('Sedang menyiapkan file Excel...');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cek Inventaris');

    // Add headers
    const headers = ['Status', 'ID', 'QR Code', 'Nama Barang', 'Merk', 'SN', 'SN Converter', 'Lokasi', 'Kondisi (Before)', 'Kondisi (After)', 'Checklist', 'Waktu Cek'];
    const headerRow = worksheet.addRow(headers);

    // Style header
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF037A89' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Set column widths
    worksheet.columns = [
        { width: 15 }, // Status
        { width: 12 }, // ID
        { width: 15 }, // QR Code
        { width: 20 }, // Nama Barang
        { width: 15 }, // Merk
        { width: 20 }, // SN
        { width: 20 }, // SN Converter
        { width: 20 }, // Lokasi
        { width: 18 }, // Kondisi (Before)
        { width: 18 }, // Kondisi (After)
        { width: 12 }, // Checklist
        { width: 20 }  // Waktu Cek
    ];

    // Add data
    for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];
        const rowIndex = i + 2;
        const isChecked = checkedItems[item.id] && checkedItems[item.id].checked;
        const checkTime = isChecked ? checkedItems[item.id].checkTime : null;

        const rowData = [
            isChecked ? 'Sudah Dicek' : 'Belum Dicek',
            item.id,
            '', // QR Code placeholder
            item.name,
            item.merk,
            item.sn,
            item.snConverter || '',
            item.lokasi,
            item.kondisiBefore,
            item.kondisiAfter,
            item.checklist,
            checkTime ? formatDateTime(checkTime) : '-'
        ];

        const row = worksheet.addRow(rowData);
        row.height = 80;
        row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            if (cell.value === 'Sudah Dicek') {
                cell.font = { color: { argb: 'FF28A745' }, bold: true };
            } else if (cell.value === 'Belum Dicek') {
                cell.font = { color: { argb: 'FFDC3545' }, bold: true };
            }
        });

        // Add QR code image
        if (item.qrCode) {
            try {
                let base64Image;
                if (item.qrCode.startsWith('data:image')) {
                    base64Image = item.qrCode;
                } else {
                    const response = await fetch(item.qrCode);
                    const blob = await response.blob();
                    base64Image = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                }

                const imageId = workbook.addImage({
                    base64: base64Image,
                    extension: 'png',
                });

                worksheet.addImage(imageId, {
                    tl: { col: 2, row: rowIndex - 1 },
                    ext: { width: 100, height: 100 },
                    editAs: 'oneCell'
                });
            } catch (error) {
                console.error('Error adding image to Excel:', error);
            }
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Cek_Inventaris_${formatDate(new Date())}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);

    showToast('Berhasil export checklist ke Excel!');
}

// Export checklist to PDF
function exportChecklistToPdf() {
    try {
        if (!inventoryData || inventoryData.length === 0) {
            showToast('Tidak ada data untuk diexport!', true);
            return;
        }

        var filterSelect = document.getElementById('scanFilter');
        var filterValue = filterSelect ? filterSelect.value : 'all';

        var filteredData = [];
        for (var i = 0; i < inventoryData.length; i++) {
            var item = inventoryData[i];
            if (!item) continue;
            if (filterValue !== 'all' && item.name !== filterValue) continue;
            filteredData.push(item);
        }

        if (filteredData.length === 0) {
            showToast('Tidak ada data untuk diexport!', true);
            return;
        }

        var result = createPdfDoc('LAPORAN CEK INVENTARIS', 'landscape');
        var doc = result.doc;

        var tableData = filteredData.map(item => {
            var isChecked = checkedItems && checkedItems[item.id] && checkedItems[item.id].checked;
            var checkTime = isChecked && checkedItems[item.id].checkTime ? checkedItems[item.id].checkTime : null;
            return [
                item.id || '-',
                item.name || '-',
                item.merk || '-',
                item.sn || '-',
                item.snConverter || '-',
                item.lokasi || '-',
                item.kondisiBefore || '-',
                item.kondisiAfter || '-',
                item.checklist || '-',
                checkTime ? formatDateTime(checkTime) : '-',
                isChecked ? '✓' : '✗'
            ];
        });

        var tableOptions = applyPdfTableStyle(doc, {
            head: [['ID', 'Nama', 'Merk', 'SN', 'SN Conv', 'Lokasi', 'Kondisi(B)', 'Kondisi(A)', 'Checklist', 'Waktu Cek', 'Status']],
            body: tableData,
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 30, halign: 'left' },
                2: { cellWidth: 20 },
                3: { cellWidth: 30 },
                4: { cellWidth: 25 },
                5: { cellWidth: 30, halign: 'left' },
                6: { cellWidth: 20 },
                7: { cellWidth: 20 },
                8: { cellWidth: 15 },
                9: { cellWidth: 30 },
                10: { cellWidth: 'auto', halign: 'center' }
            }
        });

        doc.autoTable(tableOptions);

        doc.save('Cek_Inventaris_' + formatDate(new Date()) + '.pdf');
        showToast('Berhasil export PDF!');

    } catch (e) {
        console.error('Export PDF Error:', e);
        showToast('Gagal export PDF: ' + e.message, true);
    }
}

// ========================================
// HISTORY FUNCTIONS
// ========================================
let historyData = [];

async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        historyData = await response.json();
        renderHistoryTable();
    } catch (error) {
        console.error('Error loading history:', error);
        showToast('Gagal memuat data history!', true);
    }
}

// HISTORY PAGINATION
let historyPage = 1;
let historyItemsPerPage = 10;

function changeHistoryPage(direction) {
    const limitSelect = document.getElementById('historyViewLimit');
    historyItemsPerPage = parseInt(limitSelect.value);

    const search = document.getElementById('historySearchInput') ? document.getElementById('historySearchInput').value.toLowerCase() : '';
    const actionFilter = document.getElementById('historyActionFilter') ? document.getElementById('historyActionFilter').value : 'all';
    const itemFilter = document.getElementById('historyItemFilter') ? document.getElementById('historyItemFilter').value : 'all';

    let filtered = historyData.filter(h => {
        if (actionFilter !== 'all' && h.action !== actionFilter) return false;
        if (itemFilter !== 'all' && (!h.itemName || h.itemName.toLowerCase() !== itemFilter.toLowerCase())) return false;
        if (search) {
            const matchesSearch =
                (h.itemId && h.itemId.toLowerCase().includes(search)) ||
                (h.itemName && h.itemName.toLowerCase().includes(search)) ||
                (h.itemMerk && h.itemMerk.toLowerCase().includes(search)) ||
                (h.itemSn && h.itemSn.toLowerCase().includes(search)) ||
                (h.itemLokasi && h.itemLokasi.toLowerCase().includes(search)) ||
                (h.details && h.details.toLowerCase().includes(search));
            if (!matchesSearch) return false;
        }
        return true;
    });

    const totalPages = Math.ceil(filtered.length / historyItemsPerPage);
    historyPage += direction;

    if (historyPage < 1) historyPage = 1;
    if (historyPage > totalPages) historyPage = totalPages;

    renderHistoryTable();
}

function goToHistoryPage(page) {
    historyPage = page;
    renderHistoryTable();
}

function renderHistoryTable() {
    const tableBody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('historyEmptyState');
    if (!tableBody) return;

    const selectAllCheckbox = document.getElementById('selectAllHistoryCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    const search = document.getElementById('historySearchInput') ? document.getElementById('historySearchInput').value.toLowerCase() : '';
    const actionFilter = document.getElementById('historyActionFilter') ? document.getElementById('historyActionFilter').value : 'all';
    const itemFilter = document.getElementById('historyItemFilter') ? document.getElementById('historyItemFilter').value : 'all';
    const limitSelect = document.getElementById('historyViewLimit');
    historyItemsPerPage = parseInt(limitSelect.value);

    let filtered = historyData.filter(h => {
        if (actionFilter !== 'all' && h.action !== actionFilter) return false;
        if (itemFilter !== 'all' && (!h.itemName || h.itemName.toLowerCase() !== itemFilter.toLowerCase())) return false;
        if (search) {
            const matchesSearch =
                (h.itemId && h.itemId.toLowerCase().includes(search)) ||
                (h.itemName && h.itemName.toLowerCase().includes(search)) ||
                (h.itemMerk && h.itemMerk.toLowerCase().includes(search)) ||
                (h.itemSn && h.itemSn.toLowerCase().includes(search)) ||
                (h.itemLokasi && h.itemLokasi.toLowerCase().includes(search)) ||
                (h.details && h.details.toLowerCase().includes(search));
            if (!matchesSearch) return false;
        }
        return true;
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / historyItemsPerPage));

    if (historyPage > totalPages) historyPage = totalPages;
    if (historyPage < 1) historyPage = 1;

    const startIndex = (historyPage - 1) * historyItemsPerPage;
    const endIndex = Math.min(startIndex + historyItemsPerPage, totalItems);
    const paginatedData = totalItems > 0 ? filtered.slice(startIndex, endIndex) : [];

    const pagination = document.getElementById('historyPagination');
    const showingStart = document.getElementById('historyShowingStart');
    const showingEnd = document.getElementById('historyShowingEnd');
    const totalData = document.getElementById('historyTotalData');
    const prevBtn = document.getElementById('historyPrevBtn');
    const nextBtn = document.getElementById('historyNextBtn');
    const pageNumbers = document.getElementById('historyPageNumbers');

    if (totalItems === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (pagination) pagination.style.display = 'none';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (pagination) pagination.style.display = 'flex';

        tableBody.innerHTML = paginatedData.map(h => {
            const actionClass = h.action.toLowerCase();
            const actionLabel = h.action === 'CREATE' ? 'Input' : h.action === 'UPDATE' ? 'Update' : 'Delete';
            return `
                <tr>
                    <td><input type="checkbox" class="history-row-checkbox" value="${h.id}" ${selectedHistoryItems.has(h.id) ? 'checked' : ''} onchange="toggleHistorySelection('${h.id}')"></td>
                    <td><span class="history-action-badge ${actionClass}">${actionLabel}</span></td>
                    <td>${h.itemId || '-'}</td>
                    <td>${h.itemName || '-'}</td>
                    <td>${h.itemMerk || '-'}</td>
                    <td>${h.itemSn || '-'}</td>
                    <td>${h.itemLokasi || '-'}</td>
                    <td>${h.details || '-'}</td>
                    <td>${h.timestamp ? formatDateTime(h.timestamp) : '-'}</td>
                </tr>
            `;
        }).join('');

        if (showingStart) showingStart.textContent = totalItems > 0 ? startIndex + 1 : 0;
        if (showingEnd) showingEnd.textContent = endIndex;
        if (totalData) totalData.textContent = totalItems;

        if (prevBtn) prevBtn.disabled = historyPage === 1;
        if (nextBtn) nextBtn.disabled = historyPage >= totalPages;

        if (pageNumbers) {
            let html = '';
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= historyPage - 1 && i <= historyPage + 1)) {
                    html += `<button class="page-number ${i === historyPage ? 'active' : ''}" onclick="goToHistoryPage(${i})">${i}</button>`;
                } else if (i === historyPage - 2 || i === historyPage + 2) {
                    html += `<span class="ellipsis">...</span>`;
                }
            }
            pageNumbers.innerHTML = html;
        }
    }
}

function toggleHistorySelection(id) {
    if (selectedHistoryItems.has(id)) {
        selectedHistoryItems.delete(id);
    } else {
        selectedHistoryItems.add(id);
    }
    updateHistorySelectedCount();
}

function toggleSelectAllHistory() {
    const selectAllCheckbox = document.getElementById('selectAllHistoryCheckbox');
    const checkboxes = document.querySelectorAll('.history-row-checkbox');

    if (selectAllCheckbox.checked) {
        const search = document.getElementById('historySearchInput') ? document.getElementById('historySearchInput').value.toLowerCase() : '';
        const actionFilter = document.getElementById('historyActionFilter') ? document.getElementById('historyActionFilter').value : 'all';
        const itemFilter = document.getElementById('historyItemFilter') ? document.getElementById('historyItemFilter').value : 'all';

        const filtered = historyData.filter(h => {
            if (actionFilter !== 'all' && h.action !== actionFilter) return false;
            if (itemFilter !== 'all' && (!h.itemName || h.itemName.toLowerCase() !== itemFilter.toLowerCase())) return false;
            if (search) {
                const matchesSearch =
                    (h.itemId && h.itemId.toLowerCase().includes(search)) ||
                    (h.itemName && h.itemName.toLowerCase().includes(search)) ||
                    (h.itemMerk && h.itemMerk.toLowerCase().includes(search)) ||
                    (h.itemSn && h.itemSn.toLowerCase().includes(search)) ||
                    (h.itemLokasi && h.itemLokasi.toLowerCase().includes(search)) ||
                    (h.details && h.details.toLowerCase().includes(search));
                if (!matchesSearch) return false;
            }
            return true;
        });

        filtered.forEach(h => selectedHistoryItems.add(h.id));
    } else {
        selectedHistoryItems.clear();
    }

    checkboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
    });

    updateHistorySelectedCount();
}

function updateHistorySelectedCount() {
    const deleteSelectedBtn = document.getElementById('deleteHistorySelectedBtn');
    const selectedCount = document.getElementById('historySelectedCount');

    if (selectedHistoryItems.size > 0) {
        deleteSelectedBtn.style.display = 'inline-flex';
        selectedCount.textContent = selectedHistoryItems.size;
    } else {
        deleteSelectedBtn.style.display = 'none';
    }
}

async function deleteSelectedHistory() {
    if (selectedHistoryItems.size === 0) {
        showToast('Pilih item yang ingin dihapus!', true);
        return;
    }

    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus ${selectedHistoryItems.size} history?`);
    if (!confirmDelete) return;

    try {
        console.log('Deleting history IDs:', Array.from(selectedHistoryItems));

        const response = await fetch('/api/history/bulk-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: Array.from(selectedHistoryItems) })
        });

        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
            historyData = historyData.filter(h => !selectedHistoryItems.has(h.id));
            selectedHistoryItems.clear();
            updateHistorySelectedCount();
            renderHistoryTable();
            showToast(`${data.count} history berhasil dihapus!`);
        } else {
            showToast('Gagal menghapus: ' + (data.message || 'Unknown error'), true);
        }
    } catch (error) {
        console.error('Error deleting selected history:', error);
        showToast('Gagal menghapus history! Error: ' + error.message, true);
    }
}

async function exportHistoryToExcel() {
    const btn = document.getElementById('exportHistoryExcelBtn');
    if (btn && btn.disabled) return;
    if (btn) btn.disabled = true;

    try {
        if (historyData.length === 0) {
            showToast('Tidak ada data history untuk diexport!', true);
            return;
        }

        const actionFilter = document.getElementById('historyActionFilter') ? document.getElementById('historyActionFilter').value : 'all';
        const itemFilter = document.getElementById('historyItemFilter') ? document.getElementById('historyItemFilter').value : 'all';

        let filtered = historyData.filter(h => {
            if (actionFilter !== 'all' && h.action !== actionFilter) return false;
            if (itemFilter !== 'all' && (!h.itemName || h.itemName.toLowerCase() !== itemFilter.toLowerCase())) return false;
            return true;
        });

        if (filtered.length === 0) {
            showToast('Tidak ada data untuk filter ini!', true);
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('History');

        const headers = ['Aksi', 'ID Item', 'Nama Barang', 'Merk', 'SN', 'Lokasi', 'Detail', 'Waktu'];
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF037A89' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        worksheet.columns = [
            { width: 12 }, { width: 12 }, { width: 20 }, { width: 15 },
            { width: 20 }, { width: 20 }, { width: 35 }, { width: 22 }
        ];

        filtered.forEach(h => {
            const actionLabel = h.action === 'CREATE' ? 'Input' : h.action === 'UPDATE' ? 'Update' : 'Delete';
            const row = worksheet.addRow([
                actionLabel, h.itemId || '-', h.itemName || '-', h.itemMerk || '-',
                h.itemSn || '-', h.itemLokasi || '-', h.details || '-',
                h.timestamp ? formatDateTime(h.timestamp) : '-'
            ]);
            row.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'history_inventaris.xlsx';
        anchor.click();
        window.URL.revokeObjectURL(url);
        showToast('Berhasil export history ke Excel!');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function exportHistoryToPdf() {
    var btn = document.getElementById('exportHistoryPdfBtn');
    if (btn && btn.disabled) return;
    if (btn) btn.disabled = true;

    try {
        if (!historyData || historyData.length === 0) {
            showToast('Tidak ada data history untuk diexport!', true);
            return;
        }

        var actionFilter = document.getElementById('historyActionFilter') ? document.getElementById('historyActionFilter').value : 'all';
        var itemFilter = document.getElementById('historyItemFilter') ? document.getElementById('historyItemFilter').value : 'all';

        var filtered = [];
        for (var i = 0; i < historyData.length; i++) {
            var h = historyData[i];
            if (!h) continue;
            if (actionFilter !== 'all' && h.action !== actionFilter) continue;
            if (itemFilter !== 'all' && h.itemName && h.itemName.toLowerCase() !== itemFilter.toLowerCase()) continue;
            filtered.push(h);
        }

        if (filtered.length === 0) {
            showToast('Tidak ada data untuk filter ini!', true);
            return;
        }

        var result = createPdfDoc('LAPORAN HISTORY INVENTARIS', 'landscape');
        var doc = result.doc;

        var tableData = [];
        for (var j = 0; j < filtered.length; j++) {
            var h = filtered[j];
            var actionLabel = '-';
            if (h.action === 'CREATE') actionLabel = 'Input';
            else if (h.action === 'UPDATE') actionLabel = 'Update';
            else if (h.action === 'DELETE') actionLabel = 'Delete';

            tableData.push([
                actionLabel,
                h.itemId || '-',
                h.itemName || '-',
                h.itemMerk || '-',
                h.itemSn || '-',
                h.itemLokasi || '-',
                h.details || '-',
                h.timestamp ? formatDateTime(h.timestamp) : '-'
            ]);
        }

        var tableOptions = applyPdfTableStyle(doc, {
            head: [['Aksi', 'ID Item', 'Nama', 'Merk', 'SN', 'Lokasi', 'Detail', 'Waktu']],
            body: tableData,
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 20 },
                2: { cellWidth: 30, halign: 'left' },
                3: { cellWidth: 25 },
                4: { cellWidth: 30 },
                5: { cellWidth: 30, halign: 'left' },
                6: { cellWidth: 'auto', halign: 'left' },
                7: { cellWidth: 35 }
            }
        });

        doc.autoTable(tableOptions);

        doc.save('history_' + formatDate(new Date()) + '.pdf');
        showToast('Berhasil export PDF!');

    } catch (e) {
        console.error('Export PDF Error:', e);
        showToast('Gagal export PDF: ' + e.message, true);
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ========================================
// SORTABLE TABLE COLUMNS
// ========================================
let sortState = {};

function initSortableColumns() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', function () {
            const table = this.closest('table');
            const tableId = table.id;
            const sortKey = this.dataset.sort;

            // Toggle sort direction
            if (!sortState[tableId]) sortState[tableId] = {};
            if (sortState[tableId].key === sortKey) {
                sortState[tableId].dir = sortState[tableId].dir === 'asc' ? 'desc' : 'asc';
            } else {
                sortState[tableId] = { key: sortKey, dir: 'asc' };
            }

            // Update header icons
            table.querySelectorAll('.sortable').forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            this.classList.add(sortState[tableId].dir === 'asc' ? 'sort-asc' : 'sort-desc');

            // Sort and re-render based on table
            if (tableId === 'inventoryTable') {
                sortAndRenderInventory();
            } else if (tableId === 'scanTable') {
                sortAndRenderScan();
            } else if (tableId === 'historyTable') {
                sortAndRenderHistory();
            }
        });
    });
}

function sortData(data, key, dir) {
    return [...data].sort((a, b) => {
        let valA = a[key] || '';
        let valB = b[key] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
    });
}

function sortAndRenderInventory() {
    const state = sortState['inventoryTable'];
    if (!state) return;

    const search = document.getElementById('searchInput').value.toLowerCase();
    const filterValue = document.getElementById('exportFilter') ? document.getElementById('exportFilter').value : 'all';

    let filtered = inventoryData.filter(item => {
        if (filterValue !== 'all' && item.name !== filterValue) return false;
        const matchesSearch = (item.name && item.name.toLowerCase().includes(search)) ||
            (item.merk && item.merk.toLowerCase().includes(search)) ||
            (item.sn && item.sn.toLowerCase().includes(search)) ||
            (item.lokasi && item.lokasi.toLowerCase().includes(search));
        return matchesSearch;
    });

    filtered = sortData(filtered, state.key, state.dir);

    const tableBody = document.getElementById('inventoryTableBody');
    const emptyState = document.getElementById('emptyState');

    if (filtered.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';

        // Use same rendering as updateInventoryTable
        tableBody.innerHTML = filtered.map(item => {
            const isSelected = selectedItems.has(item.id);
            const kondisiBeforeClass = getStatusBadgeClass(item.kondisiBefore);
            const kondisiAfterClass = getStatusBadgeClass(item.kondisiAfter);
            const checklistClass = item.checklist === 'Ya' ? 'checked' : 'unchecked';
            const categoryClass = getCategoryBadgeClass(item.name);

            return `
            <tr data-id="${item.id}">
                <td><input type="checkbox" class="row-checkbox" ${isSelected ? 'checked' : ''}></td>
                <td><span class="category-badge ${categoryClass}">${item.name || '-'}</span></td>
                <td>${item.merk || '-'}</td>
                <td><span class="barcode-value">${item.sn || '-'}</span></td>
                <td><span class="barcode-value">${item.snConverter || '-'}</span></td>
                <td>${item.lokasi || '-'}</td>
                <td><span class="status-badge ${kondisiBeforeClass}">${item.kondisiBefore || '-'}</span></td>
                <td><span class="status-badge ${kondisiAfterClass}">${item.kondisiAfter || '-'}</span></td>
                <td><span class="status-badge ${checklistClass}">${item.checklist || '-'}</span></td>
                <td>${item.catatan || '-'}</td>
                <td>${item.tanggalMasuk || '-'}</td>
                <td>${item.date || '-'}</td>
                <td>
                    ${item.qrCode
                    ? `<img src="${item.qrCode}" alt="QR" class="qr-thumbnail">`
                    : `<span class="no-data">-</span>`
                }
                </td>
                <td><span class="barcode-value">${item.barcode || item.id || '-'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewItem('${item.id}')" title="Lihat"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" onclick="editItem('${item.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="deleteItem('${item.id}')" title="Hapus"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        // Re-attach checkbox listeners after sorting
        attachCheckboxListeners();

        // Attach action button listeners
        attachActionButtonListeners();
    }
}

function sortAndRenderScan() {
    const state = sortState['scanTable'];
    if (!state) return;

    const filterSelect = document.getElementById('scanFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';

    let filteredData = inventoryData;
    if (filterValue !== 'all') {
        filteredData = inventoryData.filter(item => item.name === filterValue);
    }

    // Add sort-friendly properties (status: 1 = checked/sudah, 0 = unchecked/belum)
    let sortableData = filteredData.map(item => {
        const isChecked = checkedItems[item.id] && checkedItems[item.id].checked;
        const checkTime = isChecked ? checkedItems[item.id].checkTime : null;
        return {
            ...item,
            status: isChecked ? 1 : 0,  // 1 = sudah dicek, 0 = belum dicek (untuk sorting)
            statusText: isChecked ? 'Sudah Dicek' : 'Belum Dicek',  // Text untuk display
            checkTime: checkTime || ''
        };
    });

    sortableData = sortData(sortableData, state.key, state.dir);

    const tableBody = document.getElementById('scanTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = sortableData.map(item => {
        const isChecked = item.status === 1;
        const rowClass = isChecked ? 'scan-item-checked' : '';
        const statusBadge = isChecked
            ? '<span class="status-badge checked">Sudah Dicek</span>'
            : '<span class="status-badge unchecked">Belum Dicek</span>';

        return `
            <tr class="${rowClass}" data-id="${item.id}">
                <td>${statusBadge}</td>
                <td><span class="barcode-display">${item.id || '-'}</span></td>
                <td><span class="category-badge ${(item.name || '').toLowerCase()}">${item.name || '-'}</span></td>
                <td>${item.merk || '-'}</td>
                <td><span class="barcode-display">${item.sn || '-'}</span></td>
                <td>${item.lokasi || '-'}</td>
                <td>${item.checkTime ? formatDateTime(item.checkTime) : '-'}</td>
            </tr>
        `;
    }).join('');
}

function sortAndRenderHistory() {
    const state = sortState['historyTable'];
    if (!state) return;

    const search = document.getElementById('historySearchInput') ? document.getElementById('historySearchInput').value.toLowerCase() : '';
    const actionFilter = document.getElementById('historyActionFilter') ? document.getElementById('historyActionFilter').value : 'all';
    const itemFilter = document.getElementById('historyItemFilter') ? document.getElementById('historyItemFilter').value : 'all';

    let filtered = historyData.filter(h => {
        if (actionFilter !== 'all' && h.action !== actionFilter) return false;
        if (itemFilter !== 'all' && (!h.itemName || h.itemName.toLowerCase() !== itemFilter.toLowerCase())) return false;
        if (search) {
            const matchesSearch =
                (h.itemId && h.itemId.toLowerCase().includes(search)) ||
                (h.itemName && h.itemName.toLowerCase().includes(search)) ||
                (h.details && h.details.toLowerCase().includes(search));
            if (!matchesSearch) return false;
        }
        return true;
    });

    filtered = sortData(filtered, state.key, state.dir);

    const tableBody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('historyEmptyState');

    if (filtered.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        tableBody.innerHTML = filtered.map(h => {
            const actionClass = h.action.toLowerCase();
            const actionLabel = h.action === 'CREATE' ? 'Input' : h.action === 'UPDATE' ? 'Update' : 'Delete';
            return `
                <tr style="animation: fadeSlideIn 0.5s ease forwards; opacity: 0;">
                    <td><span class="history-action-badge ${actionClass}">${actionLabel}</span></td>
                    <td>${h.itemId || '-'}</td>
                    <td>${h.itemName || '-'}</td>
                    <td>${h.itemMerk || '-'}</td>
                    <td>${h.itemSn || '-'}</td>
                    <td>${h.itemLokasi || '-'}</td>
                    <td>${h.details || '-'}</td>
                    <td>${h.timestamp ? formatDateTime(h.timestamp) : '-'}</td>
                </tr>
            `;
        }).join('');
    }
}

// ========================================
// IMPORT FUNCTIONS
// ========================================
async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
        showToast('Format file tidak didukung! Gunakan file Excel (.xlsx, .xls) atau CSV.', true);
        return;
    }

    showToast('Memproses file...');

    try {
        const data = await readExcelFile(file);
        if (!data || data.length === 0) {
            showToast('File kosong atau tidak valid!', true);
            return;
        }

        // Map Excel columns to inventory fields
        const items = data.map((row, index) => {
            // Debug: log first row keys to see actual column names
            if (index === 0) {
                console.log('First row keys:', Object.keys(row));
                console.log('First row sample:', row);
            }

            // Get value with more flexible matching
            const getValue = (possibleNames) => {
                for (const name of possibleNames) {
                    // Direct match
                    if (row[name] !== undefined && row[name] !== null) {
                        return row[name];
                    }
                    // Case insensitive match
                    const nameLower = name.toLowerCase().trim();
                    for (const key of Object.keys(row)) {
                        if (key.toLowerCase().trim() === nameLower) {
                            return row[key];
                        }
                    }
                }
                return '';
            };

            const name = getValue(['Nama Barang', 'name', 'Name', 'NAMA BARANG']);
            const id = getValue(['ID', 'id', 'ID', 'Barcode', 'barcode']);
            const merk = getValue(['Merk', 'merk', 'MERK']);
            const sn = getValue(['SN', 'sn', 'Serial Number', 'SERIAL NUMBER']);
            const snConverter = getValue(['SN Converter', 'snConverter', 'sn_converter', 'SN CONVERTER', 'Sn Converter', 'Sn converter']);
            const lokasi = getValue(['Lokasi', 'lokasi', 'LOKASI']);
            const kondisiBefore = getValue(['Kondisi (Before)', 'kondisiBefore', 'Kondisi Before', 'KONDISI BEFORE']) || 'Baik';
            const kondisiAfter = getValue(['Kondisi (After)', 'kondisiAfter', 'Kondisi After', 'KONDISI AFTER']);
            const checklist = getValue(['Checklist', 'checklist', 'CHECKLIST']) || 'Tidak';
            const catatan = getValue(['Catatan', 'catatan', 'CATATAN']);
            const date = getValue(['Tanggal', 'date', 'TANGGAL']) || new Date().toISOString().split('T')[0];
            const qrData = getValue(['QR Code', 'qrCode', 'QR Data', 'qrData', 'QR']);

            if (!name) return null;

            return {
                id: String(id || ''),
                name: String(name),
                merk: String(merk || ''),
                sn: String(sn || ''),
                snConverter: String(snConverter || ''),
                lokasi: String(lokasi || ''),
                kondisiBefore: String(kondisiBefore),
                kondisiAfter: String(kondisiAfter || ''),
                checklist: String(checklist),
                catatan: String(catatan || ''),
                date: date,
                qrData: String(qrData || '')
            };
        }).filter(item => item !== null);

        if (items.length === 0) {
            showToast('Tidak ada data yang valid ditemukan dalam file!', true);
            return;
        }

        // Send to server for bulk import
        const response = await fetch('/api/inventory/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });

        const result = await response.json();

        if (result.success) {
            showToast(`Berhasil import ${result.count} item!`);

            // Regenerate QR codes for imported items if they don't have QR codes
            if (items.some(item => item.qrData || item.sn)) {
                setTimeout(() => {
                    regenerateQRCodes();
                }, 1000);
            }

            loadInventory();
        } else {
            showToast('Gagal import: ' + (result.message || 'Unknown error'), true);
        }
    } catch (error) {
        console.error('Import error:', error);
        showToast('Error saat memproses file: ' + error.message, true);
    }

    event.target.value = '';
}

// Regenerate QR codes for items without QR codes
function regenerateQRCodes() {
    let count = 0;

    inventoryData.forEach(item => {
        if (!item.qrCode && (item.sn || item.id)) {
            const qrData = item.sn || item.id;

            const qrContainer = document.createElement('div');
            qrContainer.style.display = 'none';
            document.body.appendChild(qrContainer);

            try {
                new QRCode(qrContainer, {
                    text: qrData,
                    width: 128,
                    height: 128,
                    correctLevel: QRCode.CorrectLevel.H
                });

                setTimeout(() => {
                    const canvas = qrContainer.querySelector('canvas');
                    const img = qrContainer.querySelector('img');

                    let qrBase64 = '';
                    if (canvas) {
                        qrBase64 = canvas.toDataURL('image/png');
                    } else if (img) {
                        qrBase64 = img.src;
                    }

                    if (qrBase64) {
                        fetch(`/api/inventory/${item.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ qrCode: qrBase64 })
                        })
                            .then(res => res.json())
                            .then(result => {
                                if (result.success) {
                                    count++;
                                    item.qrCode = qrBase64;
                                    updateInventoryTable();
                                }
                            });
                    }

                    document.body.removeChild(qrContainer);
                }, 100);
            } catch (e) {
                console.error('Error generating QR:', e);
                document.body.removeChild(qrContainer);
            }
        }
    });

    setTimeout(() => {
        if (count > 0) {
            showToast(`${count} QR Code berhasil diregenerate!`);
        }
    }, 2000);
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                resolve(jsonData);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ========================================
// HANDOVER FUNCTIONS
// ========================================
let handoverData = [];
let selectedHandoverItems = new Set();

async function loadHandover() {
    try {
        const response = await fetch('/api/handover');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        handoverData = Array.isArray(data) ? data : [];

        renderHandoverTable();
    } catch (error) {
        console.error('Error loading handover:', error);
        handoverData = [];
        renderHandoverTable();
    }
}

function loadItemsByCategory() {
    const kategoriSelect = document.getElementById('handoverKategori');
    const itemSelect = document.getElementById('handoverItem');
    if (!kategoriSelect || !itemSelect) return;

    const kategori = kategoriSelect.value;

    if (!kategori) {
        itemSelect.innerHTML = '<option value="">Pilih Kategori Dulu</option>';
        itemSelect.disabled = true;
        return;
    }

    itemSelect.disabled = false;
    itemSelect.innerHTML = '<option value="">Pilih Item</option>';

    const filteredItems = inventoryData.filter(item => item.name === kategori);

    filteredItems.forEach(item => {
        itemSelect.innerHTML += `<option value="${item.id}" data-name="${item.name}" data-merk="${item.merk}" data-sn="${item.sn}" data-lokasi="${item.lokasi}">${item.id} - ${item.name} (${item.merk || '-'})</option>`;
    });
}

function loadHandoverItemDetails() {
    const select = document.getElementById('handoverItem');
    if (!select) return;

    const itemId = select.value;
    const detailId = document.getElementById('detailId');
    const detailNama = document.getElementById('detailNama');
    const detailMerk = document.getElementById('detailMerk');
    const detailSn = document.getElementById('detailSn');
    const detailLokasi = document.getElementById('detailLokasi');
    const detailKondisi = document.getElementById('detailKondisi');

    if (!itemId) {
        if (detailId) detailId.textContent = '-';
        if (detailNama) detailNama.textContent = '-';
        if (detailMerk) detailMerk.textContent = '-';
        if (detailSn) detailSn.textContent = '-';
        if (detailLokasi) detailLokasi.textContent = '-';
        if (detailKondisi) detailKondisi.textContent = '-';
        return;
    }

    const item = inventoryData.find(i => i.id === itemId);
    const detailSnConverterContainer = document.getElementById('detailSnConverterContainer');
    const detailSnConverter = document.getElementById('detailSnConverter');

    if (item) {
        if (detailId) detailId.textContent = item.id;
        if (detailNama) detailNama.textContent = item.name || '-';
        if (detailMerk) detailMerk.textContent = item.merk || '-';
        if (detailSn) detailSn.textContent = item.sn || '-';
        if (detailLokasi) detailLokasi.textContent = item.lokasi || '-';
        if (detailKondisi) detailKondisi.textContent = item.kondisiAfter || item.kondisiBefore || '-';

        // Handle SN Converter visibility for Headset category
        if (item.name && item.name.toLowerCase() === 'headset') {
            if (detailSnConverterContainer) detailSnConverterContainer.style.display = 'block';
            if (detailSnConverter) detailSnConverter.textContent = item.snConverter || '-';
        } else {
            if (detailSnConverterContainer) detailSnConverterContainer.style.display = 'none';
        }
    } else {
        if (detailSnConverterContainer) detailSnConverterContainer.style.display = 'none';
    }
}

async function submitHandover(e) {
    e.preventDefault();

    const select = document.getElementById('handoverItem');
    const itemId = select.value;
    const item = inventoryData.find(i => i.id === itemId);

    const handoverRecord = {
        jenis: document.getElementById('handoverJenis').value,
        itemId: itemId,
        itemName: item ? item.name : '',
        itemMerk: item ? item.merk : '',
        itemSn: item ? item.sn : '',
        pihakPenyerah: document.getElementById('handoverDari').value,
        pihakPenerima: document.getElementById('handoverKepada').value,
        tanggalSerahTerima: document.getElementById('handoverTanggal').value,
        kondisiBefore: document.getElementById('handoverKondisiBefore').value,
        kondisiAfter: document.getElementById('handoverKondisiAfter').value,
        lokasiBaru: document.getElementById('handoverLokasi').value,
        catatan: document.getElementById('handoverCatatan').value,
        noBeritaAcara: document.getElementById('handoverNoBA').value,
        signature: signaturePad && !signaturePad.isEmpty() ? signaturePad.toDataURL() : null
    };

    try {
        const response = await fetch('/api/handover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(handoverRecord)
        });

        const data = await response.json();
        if (data.success) {
            showToast('Serah terima berhasil disimpan!');
            document.getElementById('handoverForm').reset();
            if (signaturePad) signaturePad.clear();
            loadHandover();
        } else {
            showToast('Gagal menyimpan serah terima!', true);
        }
    } catch (error) {
        console.error('Error saving handover:', error);
        showToast('Gagal menyimpan serah terima!', true);
    }
}

// HANDOVER PAGINATION
let handoverPage = 1;
let handoverItemsPerPage = 10;
let handoverSortKey = '';
let handoverSortDir = 'asc';

function changeHandoverPage(direction) {
    const limitSelect = document.getElementById('handoverViewLimit');
    if (limitSelect) handoverItemsPerPage = parseInt(limitSelect.value);

    handoverPage += direction;

    const totalPages = Math.ceil(filteredHandoverData().length / handoverItemsPerPage);
    if (handoverPage < 1) handoverPage = 1;
    if (handoverPage > totalPages) handoverPage = totalPages;

    renderHandoverTable();
}

function goToHandoverPage(page) {
    handoverPage = page;
    renderHandoverTable();
}

function sortHandoverTable(key) {
    if (handoverSortKey === key) {
        handoverSortDir = handoverSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        handoverSortKey = key;
        handoverSortDir = 'asc';
    }
    renderHandoverTable();
}

function filteredHandoverData() {
    if (!handoverData || !Array.isArray(handoverData)) {
        return [];
    }

    const search = document.getElementById('handoverSearchInput') ? document.getElementById('handoverSearchInput').value.toLowerCase() : '';
    const jenisFilter = document.getElementById('handoverJenisFilter') ? document.getElementById('handoverJenisFilter').value : 'all';

    var filtered = handoverData.filter(function (h) {
        if (!h) return false;
        if (jenisFilter !== 'all' && h.jenis !== jenisFilter) return false;
        if (search) {
            var matchesSearch =
                (h.item_id && h.item_id.toLowerCase().includes(search)) ||
                (h.item_name && h.item_name.toLowerCase().includes(search)) ||
                (h.pihak_penyerah && h.pihak_penyerah.toLowerCase().includes(search)) ||
                (h.pihak_penerima && h.pihak_penerima.toLowerCase().includes(search)) ||
                (h.no_berita_acara && h.no_berita_acara.toLowerCase().includes(search));
            if (!matchesSearch) return false;
        }
        return true;
    });

    // Apply sorting
    if (handoverSortKey) {
        filtered.sort(function (a, b) {
            var valA = a[handoverSortKey] || '';
            var valB = b[handoverSortKey] || '';

            // Handle date sorting
            if (handoverSortKey === 'tanggal_serah_terima' || handoverSortKey === 'timestamp') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            }

            if (valA < valB) return handoverSortDir === 'asc' ? -1 : 1;
            if (valA > valB) return handoverSortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
}

function renderHandoverTable() {
    const tableBody = document.getElementById('handoverTableBody');
    const emptyState = document.getElementById('handoverEmptyState');
    const pagination = document.getElementById('handoverPagination');
    if (!tableBody) return;

    const selectAllCheckbox = document.getElementById('selectAllHandoverCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    const limitSelect = document.getElementById('handoverViewLimit');
    if (limitSelect) handoverItemsPerPage = parseInt(limitSelect.value);

    const filtered = filteredHandoverData();
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / handoverItemsPerPage));

    if (handoverPage > totalPages) handoverPage = totalPages;
    if (handoverPage < 1) handoverPage = 1;

    const startIndex = (handoverPage - 1) * handoverItemsPerPage;
    const endIndex = Math.min(startIndex + handoverItemsPerPage, totalItems);
    const paginatedData = totalItems > 0 ? filtered.slice(startIndex, endIndex) : [];

    const showingStart = document.getElementById('handoverShowingStart');
    const showingEnd = document.getElementById('handoverShowingEnd');
    const totalData = document.getElementById('handoverTotalData');
    const prevBtn = document.getElementById('handoverPrevBtn');
    const nextBtn = document.getElementById('handoverNextBtn');
    const pageNumbers = document.getElementById('handoverPageNumbers');

    if (totalItems === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (pagination) pagination.style.display = 'none';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (pagination) pagination.style.display = 'flex';

        tableBody.innerHTML = paginatedData.map(h => {
            const warna = h.jenis === 'Penerimaan' ? '#10b981' : '#f59e0b';
            return `
                <tr data-id="${h.id}">
                    <td><input type="checkbox" class="handover-row-checkbox" value="${h.id}" onchange="toggleHandoverSelection('${h.id}')"></td>
                    <td><span style="color: ${warna}; font-weight: bold;">${h.jenis}</span></td>
                    <td>${h.no_berita_acara || '-'}</td>
                    <td>${h.item_id || '-'}</td>
                    <td>${h.item_name || '-'}</td>
                    <td>${h.pihak_penyerah || '-'}</td>
                    <td>${h.pihak_penerima || '-'}</td>
                    <td>${formatTanggalIndonesia(h.tanggal_serah_terima) || '-'}</td>
                    <td>${h.kondisi_before || '-'}</td>
                    <td>${h.kondisi_after || '-'}</td>
                    <td>${h.lokasi_baru || '-'}</td>
                    <td>${h.catatan || '-'}</td>
                    <td>${h.timestamp ? formatTanggalIndonesia(h.timestamp, true) : '-'}</td>
                    <td>
                        <div class="btn-aksi">
                            <button class="btn-pdf" onclick="generateBA_pdf('${h.id}')" title="Download BA PDF"><i class="fas fa-file-pdf"></i></button>
                            <button class="btn-excel" onclick="generateBA_excel('${h.id}')" title="Download BA Excel"><i class="fas fa-file-excel"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (showingStart) showingStart.textContent = totalItems > 0 ? startIndex + 1 : 0;
        if (showingEnd) showingEnd.textContent = endIndex;
        if (totalData) totalData.textContent = totalItems;

        if (prevBtn) prevBtn.disabled = handoverPage === 1;
        if (nextBtn) nextBtn.disabled = handoverPage >= totalPages;

        if (pageNumbers) {
            let html = '';
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= handoverPage - 1 && i <= handoverPage + 1)) {
                    html += `<button class="page-number ${i === handoverPage ? 'active' : ''}" onclick="goToHandoverPage(${i})">${i}</button>`;
                } else if (i === handoverPage - 2 || i === handoverPage + 2) {
                    html += `<span class="ellipsis">...</span>`;
                }
            }
            pageNumbers.innerHTML = html;
        }
    }
}

function updateHandoverTable() {
    handoverPage = 1;
    renderHandoverTable();
}

function toggleHandoverSelection(id) {
    if (selectedHandoverItems.has(id)) {
        selectedHandoverItems.delete(id);
    } else {
        selectedHandoverItems.add(id);
    }
    updateHandoverSelectedCount();
}

function toggleSelectAllHandover() {
    const selectAllCheckbox = document.getElementById('selectAllHandoverCheckbox');
    const checkboxes = document.querySelectorAll('.handover-row-checkbox');

    if (!selectAllCheckbox) return;

    if (selectAllCheckbox.checked) {
        filteredHandoverData().forEach(h => selectedHandoverItems.add(h.id));
    } else {
        selectedHandoverItems.clear();
    }

    checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
    updateHandoverSelectedCount();
}

function updateHandoverSelectedCount() {
    const deleteSelectedBtn = document.getElementById('deleteHandoverSelectedBtn');
    const selectedCount = document.getElementById('handoverSelectedCount');

    if (selectedHandoverItems.size > 0) {
        if (deleteSelectedBtn) deleteSelectedBtn.style.display = 'inline-flex';
        if (selectedCount) selectedCount.textContent = selectedHandoverItems.size;
    } else {
        if (deleteSelectedBtn) deleteSelectedBtn.style.display = 'none';
    }
}

async function deleteSelectedHandover() {
    if (selectedHandoverItems.size === 0) {
        showToast('Pilih item yang ingin dihapus!', true);
        return;
    }

    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus ${selectedHandoverItems.size} data?`);
    if (!confirmDelete) return;

    try {
        const response = await fetch('/api/handover/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedHandoverItems) })
        });

        const data = await response.json();
        if (data.success) {
            handoverData = handoverData.filter(h => !selectedHandoverItems.has(h.id));
            selectedHandoverItems.clear();
            updateHandoverSelectedCount();
            renderHandoverTable();
            showToast(`${data.count} data berhasil dihapus!`);
        }
    } catch (error) {
        console.error('Error deleting handover:', error);
        showToast('Gagal menghapus!', true);
    }
}

function formatTanggalIndonesia(dateStr, includeTime) {
    if (!dateStr) return '-';
    
    // Check if it's an ISO string or has 'T'
    const isIso = dateStr.includes('T');
    const dateObj = new Date(dateStr);
    
    // If invalid date object and not ISO-like, try to parse
    if (isNaN(dateObj.getTime()) && !isIso) {
        const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const parts = dateStr.split('-');
        if (parts.length >= 3) {
            const tahun = parts[0];
            const bulanIdx = parseInt(parts[1]) - 1;
            const hari = parts[2].split('T')[0];
            return `${hari} ${bulan[bulanIdx]} ${tahun}`;
        }
        return dateStr;
    }

    // Use toLocaleString for better formatting if it's a valid date
    const options = {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        const formatted = dateObj.toLocaleString('id-ID', options).replace(/\./g, ':');
        // If it already contains 'pukul', just fix dots. Otherwise add it.
        return formatted.includes('pukul') ? formatted : formatted.replace(/ (\d{2}:\d{2})/, ' pukul $1');
    }
    
    return dateObj.toLocaleString('id-ID', options);
}

function generateNomorBA(tanggal, id) {
    if (!tanggal) return 'SMG08.001/ICONNET/BASTB/04-12-2026/0';

    const tgl = tanggal.includes('T') ? tanggal.split('T')[0] : tanggal;
    const parts = tgl.split('-');
    const tahun = parts[0];
    const bulan = parts[1];
    const hari = parts[2];
    const nomor = String(id).padStart(3, '0');

    return `SMG08.${nomor}/ICONNET/BASTB/${bulan}-${hari}-${tahun}/0`;
}

function generateBA_pdf(id) {
    const data = handoverData.find(h => h.id == id);
    if (!data) {
        showToast('Data tidak ditemukan!', true);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    const margin = 20;
    const marginRight = pageWidth - margin;
    const tableWidth = pageWidth - (margin * 2);

    const nomorBA = data.no_berita_acara || generateNomorBA(data.tanggal_serah_terima, data.id);
    const tglFormat = formatTanggalIndonesia(data.tanggal_serah_terima);

    // 1. HEADER: Logo & Nomor Dokumen
    try {
        doc.addImage('img/logo1.png', 'PNG', margin, 10, 35, 12);
    } catch (e) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text('ICONNET', margin, 18);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('No. Berita Acara:', marginRight, 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(nomorBA, marginRight, 20, { align: 'right' });

    // 2. JUDUL
    let y = 40;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('BERITA ACARA SERAH TERIMA BARANG', centerX, y, { align: 'center' });

    y += 5;
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.8);
    doc.line(margin, y, marginRight, y);

    // 3. KALIMAT PEMBUKA
    y += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    const openingText = `Bahwa pada hari ini, ${tglFormat}, kami yang bertanda tangan di bawah ini telah melaksanakan serah terima aset/barang inventaris dengan rincian informasi sebagai berikut:`;
    const splitOpening = doc.splitTextToSize(openingText, tableWidth);
    doc.text(splitOpening, margin, y);

    // 4. TABEL DETAIL BARANG
    y += (splitOpening.length * 5) + 5;
    doc.autoTable({
        startY: y,
        head: [['Deskripsi Informasi', 'Detail Aset / Barang']],
        body: [
            ['ID Inventaris', data.item_id || '-'],
            ['Nama Barang', data.item_name || '-'],
            ['Merk / Model', data.item_merk || '-'],
            ['Serial Number (SN)', data.item_sn || '-'],
            ['Kategori / Jenis', data.jenis || '-'],
            ['Kondisi Awal (Penyerah)', data.kondisi_before || '-'],
            ['Kondisi Akhir (Penerima)', data.kondisi_after || '-'],
            ['Lokasi Penempatan', data.lokasi_baru || '-']
        ],
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'left',
            cellPadding: 4
        },
        bodyStyles: {
            fontSize: 9.5,
            textColor: [51, 65, 85],
            cellPadding: 4,
            lineColor: [226, 232, 240]
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: tableWidth * 0.35, fillColor: [248, 250, 252] },
            1: { cellWidth: tableWidth * 0.65 }
        },
        styles: {
            valign: 'middle',
            overflow: 'linebreak'
        }
    });

    // 5. TANDA TANGAN
    y = doc.lastAutoTable.finalY + 20;

    // Check if y is too low, add page if necessary
    if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
    }

    const colWidth = tableWidth / 2;
    const col1X = margin + (colWidth / 2);
    const col2X = marginRight - (colWidth / 2);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    doc.text('Pihak Penyerah,', col1X, y, { align: 'center' });
    doc.text('Pihak Penerima,', col2X, y, { align: 'center' });

    // 5.1 SIGNATURE IMAGE
    if (data.signature) {
        try {
            // Draw signature for Penyerah only (as per user request)
            doc.addImage(data.signature, 'PNG', col1X - 15, y + 2, 30, 15);
        } catch (e) {
            console.error('Error adding signature to PDF:', e);
        }
    }

    y += 25; // Space for signature

    // Names with Underline
    doc.setFont('helvetica', 'bold');

    const namePenyerah = data.pihak_penyerah || '............................';
    const namePenerima = data.pihak_penerima || '............................';

    doc.text(namePenyerah, col1X, y, { align: 'center' });
    doc.text(namePenerima, col2X, y, { align: 'center' });

    // Drawing Underline
    const nameWidth1 = doc.getTextWidth(namePenyerah);
    const nameWidth2 = doc.getTextWidth(namePenerima);

    doc.setLineWidth(0.3);
    doc.setDrawColor(30, 41, 59);
    doc.line(col1X - (nameWidth1 / 2), y + 1, col1X + (nameWidth1 / 2), y + 1);
    doc.line(col2X - (nameWidth2 / 2), y + 1, col2X + (nameWidth2 / 2), y + 1);

    // Mengetahui
    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.text('Mengetahui / Menyetujui,', centerX, y, { align: 'center' });

    y += 25;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('...................................', centerX, y, { align: 'center' });

    const mgmtWidth = doc.getTextWidth('...................................');
    doc.setDrawColor(79, 70, 229);
    doc.line(centerX - (mgmtWidth / 2), y + 1, centerX + (mgmtWidth / 2), y + 1);

    // 6. CATATAN (IF ANY)
    if (data.catatan) {
        y += 15;
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'italic');
        const catatanLines = doc.splitTextToSize('Catatan: ' + data.catatan, tableWidth);
        doc.text(catatanLines, margin, y);
    }

    // 7. FOOTER: Page Number & Date
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Halaman ${i} dari ${totalPages}`, centerX, pageHeight - 10, { align: 'center' });
        doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, margin, pageHeight - 10);
    }

    const fileName = `BA_SERAH_TERIMA_${data.item_id || 'ITEM'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    showToast('Berita Acara PDF berhasil diunduh!');
}

async function generateBA_excel(id) {
    const data = handoverData.find(h => h.id == id);
    if (!data) {
        showToast('Data tidak ditemukan!', true);
        return;
    }

    showToast('Sedang menyiapkan file Excel...');

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('BA Serah Terima');

        const tglFormat = formatTanggalIndonesia(data.tanggal_serah_terima);
        const nomorBA = data.no_berita_acara || generateNomorBA(data.tanggal_serah_terima, data.id);

        // Set columns
        worksheet.columns = [
            { width: 35 }, // A: Keterangan
            { width: 55 }  // B: Detail
        ];

        // 1. HEADER SECTION
        // Add Logo if possible
        try {
            const logoResponse = await fetch('img/logo1.png');
            if (logoResponse.ok) {
                const logoBuffer = await logoResponse.arrayBuffer();
                const logoId = workbook.addImage({
                    buffer: logoBuffer,
                    extension: 'png',
                });
                // Place logo in top right
                worksheet.addImage(logoId, {
                    tl: { col: 1.6, row: 0.1 },
                    ext: { width: 100, height: 35 }
                });
            }
        } catch (e) {
            console.warn('Failed to load logo for Excel:', e);
        }

        // Title
        worksheet.mergeCells('A1:B1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'BERITA ACARA SERAH TERIMA BARANG';
        titleCell.font = { name: 'Arial', bold: true, size: 16, color: { argb: 'FF1E293B' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        worksheet.mergeCells('A2:B2');
        const companyCell = worksheet.getCell('A2');
        companyCell.value = 'ICONNET';
        companyCell.font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FF4F46E5' } };
        companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(2).height = 25;

        worksheet.mergeCells('A3:B3');
        const noCell = worksheet.getCell('A3');
        noCell.value = 'No: ' + nomorBA;
        noCell.font = { name: 'Arial', size: 10 };
        noCell.alignment = { horizontal: 'center' };

        // 2. OPENING SECTION
        worksheet.addRow([]);
        const openingRow = worksheet.addRow(['Pada hari ini, tanggal ' + tglFormat + ', telah dilakukan serah terima barang sebagai berikut:']);
        worksheet.mergeCells(`A${openingRow.number}:B${openingRow.number}`);
        openingRow.getCell(1).font = { name: 'Arial', size: 11 };
        openingRow.getCell(1).alignment = { wrapText: true, vertical: 'middle' };
        openingRow.height = 30;

        worksheet.addRow([]);

        // 3. DATA TABLE
        const headRow = worksheet.addRow(['Keterangan', 'Detail']);
        headRow.height = 25;
        headRow.eachCell(cell => {
            cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'medium' },
                left: { style: 'medium' },
                bottom: { style: 'medium' },
                right: { style: 'medium' }
            };
        });

        const rows = [
            ['ID Inventaris', data.item_id || '-'],
            ['Nama Barang', data.item_name || '-'],
            ['Merk / Model', data.item_merk || '-'],
            ['Serial Number (SN)', data.item_sn || '-'],
            ['Kategori / Jenis', data.jenis || '-'],
            ['Kondisi Awal (Penyerah)', data.kondisi_before || '-'],
            ['Kondisi Akhir (Penerima)', data.kondisi_after || '-'],
            ['Lokasi Penempatan Baru', data.lokasi_baru || '-']
        ];

        rows.forEach(r => {
            const row = worksheet.addRow(r);
            row.height = 22;
            row.getCell(1).font = { name: 'Arial', bold: true, color: { argb: 'FF334155' } };
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle', indent: 1 };
            });
        });

        worksheet.addRow([]);

        // 4. SIGNATURE SECTION
        worksheet.addRow([]);
        const sigHeader = worksheet.addRow(['Pihak Penyerah,', 'Pihak Penerima,']);
        sigHeader.height = 20;
        sigHeader.eachCell(cell => {
            cell.font = { name: 'Arial', bold: true, size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Space for signature
        worksheet.addRow([]);
        worksheet.addRow([]);
        worksheet.addRow([]);

        const nameRow = worksheet.addRow([
            data.pihak_penyerah || '( ............................ )',
            data.pihak_penerima || '( ............................ )'
        ]);
        nameRow.height = 20;
        nameRow.eachCell(cell => {
            cell.font = { name: 'Arial', bold: true, size: 11, underline: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        worksheet.addRow([]);
        const knowingRow = worksheet.addRow(['Mengetahui,']);
        worksheet.mergeCells(`A${knowingRow.number}:B${knowingRow.number}`);
        knowingRow.getCell(1).font = { name: 'Arial', size: 11 };
        knowingRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.addRow([]);
        worksheet.addRow([]);
        const managementRow = worksheet.addRow(['ICONNET']);
        worksheet.mergeCells(`A${managementRow.number}:B${managementRow.number}`);
        managementRow.getCell(1).font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF4F46E5' } };
        managementRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        // 5. NOTES SECTION
        if (data.catatan) {
            worksheet.addRow([]);
            worksheet.addRow([]);
            const noteHeader = worksheet.addRow(['Catatan:']);
            noteHeader.getCell(1).font = { name: 'Arial', bold: true, size: 10 };

            const noteContent = worksheet.addRow([data.catatan]);
            worksheet.mergeCells(`A${noteContent.number}:B${noteContent.number}`);
            noteContent.getCell(1).font = { name: 'Arial', italic: true, size: 10, color: { argb: 'FF64748B' } };
            noteContent.getCell(1).alignment = { wrapText: true };
        }

        // Export and Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `BA_SERAH_TERIMA_${data.item_id || 'ITEM'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();

        showToast('BA Excel profesional berhasil diunduh!');
    } catch (error) {
        console.error('Error generating Excel:', error);
        showToast('Gagal membuat file Excel!', true);
    }
}

// ============================================
// EXPORT EXCEL - DATA SERAH TERIMA
// ============================================
async function exportHandoverToExcel() {
    var btn = document.getElementById('exportHandoverExcel');
    if (btn && btn.disabled) return;
    if (btn) btn.disabled = true;

    try {
        showToast('Sedang menyiapkan laporan Excel...');

        // Load data
        let data = handoverData || [];
        if (data.length === 0) {
            try {
                const response = await fetch('/api/handover');
                if (response.ok) {
                    const apiData = await response.json();
                    data = Array.isArray(apiData) ? apiData : [];
                }
            } catch (e) { console.warn('Fetch error:', e); }
        }

        if (data.length === 0) {
            showToast('Tidak ada data untuk diexport!', true);
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Serah Terima');

        // 1. SET COLUMNS
        worksheet.columns = [
            { header: 'No', key: 'no', width: 6 },
            { header: 'Jenis', key: 'jenis', width: 12 },
            { header: 'No Berita Acara', key: 'no_ba', width: 35 },
            { header: 'ID Item', key: 'id_item', width: 15 },
            { header: 'Nama Barang', key: 'nama', width: 25 },
            { header: 'Penyerah', key: 'penyerah', width: 20 },
            { header: 'Penerima', key: 'penerima', width: 20 },
            { header: 'Tanggal', key: 'tanggal', width: 22 },
            { header: 'Kondisi Before', key: 'before', width: 18 },
            { header: 'Kondisi After', key: 'after', width: 18 },
            { header: 'Lokasi Baru', key: 'lokasi', width: 22 },
            { header: 'Catatan', key: 'catatan', width: 30 }
        ];

        // 2. HEADER LAPORAN (MANUAL INSERTION AT TOP)
        // Shift worksheet down to make room for header
        worksheet.insertRow(1, []);
        worksheet.insertRow(1, []);
        worksheet.insertRow(1, []);
        worksheet.insertRow(1, []);

        // Title
        worksheet.mergeCells('A1:L1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'LAPORAN SERAH TERIMA INVENTARIS';
        titleCell.font = { name: 'Arial', bold: true, size: 16, color: { argb: 'FF1E293B' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        // Subtitle (Date)
        worksheet.mergeCells('A2:L2');
        const dateCell = worksheet.getCell('A2');
        dateCell.value = 'Dicetak pada: ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        dateCell.font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };
        dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // 3. LOGO
        try {
            const logoResponse = await fetch('img/logo1.png');
            if (logoResponse.ok) {
                const logoBuffer = await logoResponse.arrayBuffer();
                const logoId = workbook.addImage({
                    buffer: logoBuffer,
                    extension: 'png',
                });
                worksheet.addImage(logoId, {
                    tl: { col: 10, row: 0.1 }, // Column K
                    ext: { width: 120, height: 40 }
                });
            }
        } catch (e) { console.warn('Logo error:', e); }

        // 4. STYLE THE TABLE HEADERS (Row 5 now)
        const headerRow = worksheet.getRow(5);
        headerRow.values = ['No', 'Jenis', 'No BA', 'ID Item', 'Nama Barang', 'Penyerah', 'Penerima', 'Tanggal', 'Kondisi Before', 'Kondisi After', 'Lokasi Baru', 'Catatan'];
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
            cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo 600
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        });

        // 5. DATA ROWS
        data.forEach((item, index) => {
            const row = worksheet.addRow([
                index + 1,
                item.jenis || '-',
                item.no_berita_acara || '-',
                item.item_id || '-',
                item.item_name || '-',
                item.pihak_penyerah || '-',
                item.pihak_penerima || '-',
                item.tanggal_serah_terima ? formatTanggalIndonesia(item.tanggal_serah_terima) : '-',
                item.kondisi_before || '-',
                item.kondisi_after || '-',
                item.lokasi_baru || '-',
                item.catatan || '-'
            ]);

            row.height = 22;
            const isEven = index % 2 === 0;

            row.eachCell((cell, colNumber) => {
                // Zebra Striping
                if (!isEven) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }

                // Borders
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };

                // Alignment
                cell.font = { name: 'Arial', size: 9 };
                const colKey = [1, 2, 8].includes(colNumber) ? 'center' : ([5, 11, 12].includes(colNumber) ? 'left' : 'center');
                cell.alignment = { horizontal: colKey, vertical: 'middle', wrapText: true, indent: colKey === 'left' ? 1 : 0 };
            });
        });

        // 6. FOOTER
        worksheet.addRow([]);
        const footerStart = worksheet.addRow([]);
        const footerRow1 = worksheet.addRow(['Dicetak oleh sistem']);
        const footerRow2 = worksheet.addRow(['ICONNET']);

        [footerRow1, footerRow2].forEach(row => {
            worksheet.mergeCells(`A${row.number}:L${row.number}`);
            row.getCell(1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
            row.getCell(1).alignment = { horizontal: 'left' };
        });

        // Export
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Laporan_Serah_Terima_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();

        showToast('Laporan Excel berhasil diunduh!');
    } catch (error) {
        console.error('Export Excel Error:', error);
        showToast('Gagal export Excel: ' + error.message, true);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function exportHandoverToPdf() {
    var btn = document.getElementById('exportHandoverPdf');
    if (btn && btn.disabled) return;
    if (btn) btn.disabled = true;

    try {
        var data = handoverData || [];

        if (data.length === 0) {
            showToast('Tidak ada data untuk export!', true);
            return;
        }

        var result = createPdfDoc('LAPORAN DATA SERAH TERIMA', 'landscape');
        var doc = result.doc;

        var tableData = [];
        for (var i = 0; i < data.length; i++) {
            var h = data[i] || {};
            tableData.push([
                i + 1,
                h.jenis || '-',
                h.no_berita_acara || '-',
                h.item_id || '-',
                h.item_name || '-',
                h.pihak_penyerah || '-',
                h.pihak_penerima || '-',
                h.timestamp ? formatTanggalIndonesia(h.timestamp, true) : (h.tanggal_serah_terima ? formatTanggalIndonesia(h.tanggal_serah_terima, true) : '-'),
                h.kondisi_before || '-',
                h.kondisi_after || '-',
                h.lokasi_baru || '-',
                h.catatan || '-'
            ]);
        }

        var tableOptions = applyPdfTableStyle(doc, {
            head: [['No', 'Jenis', 'No BA', 'ID Item', 'Nama', 'Penyerah', 'Penerima', 'Tanggal', 'Kondisi(B)', 'Kondisi(A)', 'Lokasi', 'Catatan']],
            body: tableData,
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 18 },
                2: { cellWidth: 35 },
                3: { cellWidth: 18 },
                4: { cellWidth: 22, halign: 'left' },
                5: { cellWidth: 20, halign: 'left' },
                6: { cellWidth: 20, halign: 'left' },
                7: { cellWidth: 22 },
                8: { cellWidth: 18 },
                9: { cellWidth: 18 },
                10: { cellWidth: 22, halign: 'left' },
                11: { cellWidth: 'auto', halign: 'left' }
            }
        });

        doc.autoTable(tableOptions);

        doc.save('serah_terima_' + new Date().toISOString().split('T')[0] + '.pdf');
        showToast('PDF berhasil diunduh!');

    } catch (e) {
        console.error('Export PDF Error:', e);
        showToast('Gagal export PDF: ' + e.message, true);
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ========================================
// PROFESSIONAL UPGRADE: THEME, CHARTS, SIGNATURE
// ========================================

function initTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', theme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    // Update charts text color if they exist
    if (inventoryDistChart) {
        const textColor = newTheme === 'dark' ? '#f8fafc' : '#0f172a';
        inventoryDistChart.options.plugins.legend.labels.color = textColor;
        inventoryDistChart.update();
        conditionChart.options.scales.y.ticks.color = textColor;
        conditionChart.options.scales.x.ticks.color = textColor;
        conditionChart.update();
    }
}

function initSignaturePad() {
    const canvas = document.getElementById('signaturePad');
    if (!canvas) return;

    // Destroy previous instance if exists
    if (signaturePad) {
        try { signaturePad.off(); } catch(e) {}
        signaturePad = null;
    }

    // Resize the canvas to match its displayed CSS size (fix HiDPI & SPA hidden element issue)
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        if (w === 0 || h === 0) return; // not visible yet, skip
        canvas.width  = w * ratio;
        canvas.height = h * ratio;
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
        if (signaturePad) signaturePad.clear(); // clear after resize to avoid artifacts
    }

    // Remove any previous resize listener
    if (window._signatureResizeHandler) {
        window.removeEventListener('resize', window._signatureResizeHandler);
    }
    window._signatureResizeHandler = resizeCanvas;
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255,255,255,0)',
        penColor: '#1e293b'
    });

    const clearBtn = document.getElementById('clearSignature');
    if (clearBtn) {
        // Clone to remove old listeners
        const newBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newBtn, clearBtn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signaturePad.clear();
        });
    }
}

function initCharts() {
    const distCanvas = document.getElementById('inventoryDistChart');
    const condCanvas = document.getElementById('conditionChart');
    if (!distCanvas || !condCanvas) return;

    const distCtx = distCanvas.getContext('2d');
    const condCtx = condCanvas.getContext('2d');
    
    const theme = document.body.getAttribute('data-theme');
    const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
    
    inventoryDistChart = new Chart(distCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor }
                }
            }
        }
    });
    
    conditionChart = new Chart(condCtx, {
        type: 'bar',
        data: {
            labels: ['Baik', 'Rusak Ringan', 'Rusak Berat'],
            datasets: [{
                label: 'Status Kondisi',
                data: [0, 0, 0],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function updateChartsData() {
    if (!inventoryData || inventoryData.length === 0) return;
    if (!inventoryDistChart || !conditionChart) initCharts();
    if (!inventoryDistChart || !conditionChart) return;
    
    // Distribution
    const dist = {};
    inventoryData.forEach(item => {
        const name = item.name || item.nama_barang || 'Unknown';
        dist[name] = (dist[name] || 0) + 1;
    });
    
    inventoryDistChart.data.labels = Object.keys(dist);
    inventoryDistChart.data.datasets[0].data = Object.values(dist);
    inventoryDistChart.update();
    
    // Condition
    const cond = { 'Baik': 0, 'Rusak Ringan': 0, 'Rusak Berat': 0 };
    inventoryData.forEach(item => {
        const kAfter = item.kondisiAfter || item.kondisi_after;
        const kBefore = item.kondisiBefore || item.kondisi_before;
        if (cond[kAfter] !== undefined) cond[kAfter]++;
        else if (cond[kBefore] !== undefined) cond[kBefore]++;
    });
    
    conditionChart.data.datasets[0].data = [cond['Baik'], cond['Rusak Ringan'], cond['Rusak Berat']];
    conditionChart.update();
}
