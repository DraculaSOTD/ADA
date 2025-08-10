// Data Preview Table Component with Virtual Scrolling
class DataPreviewTable {
    constructor() {
        this.container = null;
        this.data = [];
        this.columns = [];
        this.filteredData = [];
        this.sortColumn = null;
        this.sortOrder = 'asc';
        this.currentPage = 1;
        this.rowsPerPage = 50;
        this.selectedRows = new Set();
        this.virtualScrolling = {
            rowHeight: 40,
            visibleRows: 20,
            scrollTop: 0,
            startIndex: 0,
            endIndex: 50
        };
        this.columnStats = {};
        this.showStats = false;
    }

    async initialize(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('DataPreviewTable: Container not found');
            return;
        }

        // Load HTML template
        try {
            const response = await fetch('/src/components/DataPreviewTable/DataPreviewTable.html');
            const html = await response.text();
            this.container.innerHTML = html;

            // Load CSS
            if (!document.querySelector('link[href*="DataPreviewTable.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/src/components/DataPreviewTable/DataPreviewTable.css';
                document.head.appendChild(link);
            }

            this.setupEventListeners();
            
            if (options.data) {
                this.loadData(options.data);
            }
        } catch (error) {
            console.error('Failed to load DataPreviewTable:', error);
        }
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = this.container.querySelector('#searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Control buttons
        const toggleStatsBtn = this.container.querySelector('#toggleStatsBtn');
        if (toggleStatsBtn) {
            toggleStatsBtn.addEventListener('click', () => this.toggleStatistics());
        }

        const exportBtn = this.container.querySelector('#exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportModal());
        }

        const fullscreenBtn = this.container.querySelector('#fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Pagination controls
        this.setupPaginationControls();

        // Export modal controls
        this.setupExportModalControls();

        // Virtual scrolling
        const tableViewport = this.container.querySelector('#tableViewport');
        if (tableViewport) {
            tableViewport.addEventListener('scroll', () => this.handleScroll());
        }
    }

    setupPaginationControls() {
        const firstPageBtn = this.container.querySelector('#firstPageBtn');
        const prevPageBtn = this.container.querySelector('#prevPageBtn');
        const nextPageBtn = this.container.querySelector('#nextPageBtn');
        const lastPageBtn = this.container.querySelector('#lastPageBtn');
        const currentPageInput = this.container.querySelector('#currentPage');

        if (firstPageBtn) {
            firstPageBtn.addEventListener('click', () => this.goToPage(1));
        }

        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        }

        if (lastPageBtn) {
            lastPageBtn.addEventListener('click', () => this.goToPage(this.getTotalPages()));
        }

        if (currentPageInput) {
            currentPageInput.addEventListener('change', (e) => {
                const page = parseInt(e.target.value);
                if (page > 0 && page <= this.getTotalPages()) {
                    this.goToPage(page);
                }
            });
        }
    }

    setupExportModalControls() {
        const closeBtn = this.container.querySelector('#closeExportModal');
        const cancelBtn = this.container.querySelector('#cancelExportBtn');
        const confirmBtn = this.container.querySelector('#confirmExportBtn');
        const exportModal = this.container.querySelector('#exportModal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideExportModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideExportModal());
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.exportData());
        }

        // Close modal on outside click
        if (exportModal) {
            exportModal.addEventListener('click', (e) => {
                if (e.target === exportModal) {
                    this.hideExportModal();
                }
            });
        }
    }

    loadData(data) {
        this.data = data;
        this.filteredData = [...data];
        
        // Extract columns
        if (data.length > 0) {
            this.columns = Object.keys(data[0]);
            this.calculateColumnStatistics();
        }

        this.updateDisplay();
    }

    calculateColumnStatistics() {
        this.columnStats = {};
        
        this.columns.forEach(column => {
            const values = this.data.map(row => row[column]);
            const stats = {
                name: column,
                type: this.detectColumnType(values),
                unique: new Set(values).size,
                nulls: values.filter(v => v === null || v === undefined || v === '').length,
                min: null,
                max: null,
                mean: null
            };

            // Calculate numeric statistics
            if (stats.type === 'number') {
                const numericValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
                if (numericValues.length > 0) {
                    stats.min = Math.min(...numericValues);
                    stats.max = Math.max(...numericValues);
                    stats.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
                }
            }

            this.columnStats[column] = stats;
        });
    }

    detectColumnType(values) {
        const sampleValues = values.filter(v => v !== null && v !== undefined).slice(0, 100);
        
        if (sampleValues.every(v => typeof v === 'boolean')) {
            return 'boolean';
        }
        
        if (sampleValues.every(v => !isNaN(v) && !isNaN(parseFloat(v)))) {
            return 'number';
        }
        
        if (sampleValues.every(v => !isNaN(Date.parse(v)))) {
            return 'date';
        }
        
        return 'string';
    }

    updateDisplay() {
        this.renderHeaders();
        this.renderVirtualRows();
        this.updateStatistics();
        this.updateFooterInfo();
        this.updatePaginationControls();
    }

    renderHeaders() {
        const tableHead = this.container.querySelector('#tableHead');
        if (!tableHead) return;

        const headerRow = document.createElement('tr');
        
        // Add checkbox column for selection
        const checkboxHeader = document.createElement('th');
        checkboxHeader.style.width = '40px';
        checkboxHeader.innerHTML = '<input type="checkbox" id="selectAll">';
        headerRow.appendChild(checkboxHeader);

        // Add data columns
        this.columns.forEach(column => {
            const th = document.createElement('th');
            th.className = 'sortable';
            th.innerHTML = `
                ${column}
                <i class="fas fa-sort sort-icon"></i>
            `;
            th.addEventListener('click', () => this.sortByColumn(column));
            headerRow.appendChild(th);
        });

        tableHead.innerHTML = '';
        tableHead.appendChild(headerRow);

        // Setup select all checkbox
        const selectAllCheckbox = tableHead.querySelector('#selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.selectAllRows(e.target.checked));
        }
    }

    renderVirtualRows() {
        const tableBody = this.container.querySelector('#tableBody');
        if (!tableBody) return;

        const tableViewport = this.container.querySelector('#tableViewport');
        const viewportHeight = tableViewport ? tableViewport.clientHeight : 600;
        
        // Calculate virtual scrolling parameters
        this.virtualScrolling.visibleRows = Math.ceil(viewportHeight / this.virtualScrolling.rowHeight);
        const totalRows = this.filteredData.length;
        
        // Clear existing rows
        tableBody.innerHTML = '';

        // Add top spacer
        const topSpacer = document.createElement('tr');
        topSpacer.className = 'virtual-spacer';
        topSpacer.style.height = `${this.virtualScrolling.startIndex * this.virtualScrolling.rowHeight}px`;
        tableBody.appendChild(topSpacer);

        // Render visible rows
        const endIndex = Math.min(
            this.virtualScrolling.startIndex + this.virtualScrolling.visibleRows + 5,
            totalRows
        );

        for (let i = this.virtualScrolling.startIndex; i < endIndex; i++) {
            const rowData = this.filteredData[i];
            if (!rowData) continue;

            const tr = document.createElement('tr');
            tr.dataset.index = i;
            
            // Checkbox cell
            const checkboxCell = document.createElement('td');
            checkboxCell.innerHTML = `<input type="checkbox" data-row="${i}">`;
            tr.appendChild(checkboxCell);

            // Data cells
            this.columns.forEach(column => {
                const td = document.createElement('td');
                const value = rowData[column];
                
                if (value === null || value === undefined) {
                    td.className = 'cell-null';
                    td.textContent = 'null';
                } else if (typeof value === 'boolean') {
                    td.className = 'cell-boolean';
                    td.innerHTML = value ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>';
                } else if (typeof value === 'number') {
                    td.className = 'cell-number';
                    td.textContent = this.formatNumber(value);
                } else {
                    td.textContent = String(value);
                }
                
                td.title = String(value);
                tr.appendChild(td);
            });

            // Add row selection handler
            tr.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    this.toggleRowSelection(i);
                }
            });

            tableBody.appendChild(tr);
        }

        // Add bottom spacer
        const bottomSpacer = document.createElement('tr');
        bottomSpacer.className = 'virtual-spacer';
        const remainingRows = totalRows - endIndex;
        bottomSpacer.style.height = `${Math.max(0, remainingRows * this.virtualScrolling.rowHeight)}px`;
        tableBody.appendChild(bottomSpacer);

        // Update checkboxes for selected rows
        this.updateRowSelectionDisplay();
    }

    handleScroll() {
        const tableViewport = this.container.querySelector('#tableViewport');
        if (!tableViewport) return;

        const scrollTop = tableViewport.scrollTop;
        const newStartIndex = Math.floor(scrollTop / this.virtualScrolling.rowHeight);
        
        if (Math.abs(newStartIndex - this.virtualScrolling.startIndex) > 5) {
            this.virtualScrolling.startIndex = newStartIndex;
            this.renderVirtualRows();
        }

        // Show horizontal scroll indicator if needed
        if (tableViewport.scrollWidth > tableViewport.clientWidth) {
            const indicator = this.container.querySelector('.scroll-indicator.horizontal');
            if (indicator) {
                indicator.classList.add('show');
                clearTimeout(this.scrollIndicatorTimeout);
                this.scrollIndicatorTimeout = setTimeout(() => {
                    indicator.classList.remove('show');
                }, 2000);
            }
        }
    }

    handleSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            this.filteredData = [...this.data];
        } else {
            this.filteredData = this.data.filter(row => {
                return this.columns.some(column => {
                    const value = row[column];
                    return value && String(value).toLowerCase().includes(term);
                });
            });
        }

        this.currentPage = 1;
        this.virtualScrolling.startIndex = 0;
        this.updateDisplay();
    }

    sortByColumn(column) {
        if (this.sortColumn === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortOrder = 'asc';
        }

        this.filteredData.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            let comparison = 0;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }

            return this.sortOrder === 'asc' ? comparison : -comparison;
        });

        this.updateDisplay();
        this.updateSortIndicators();
    }

    updateSortIndicators() {
        const headers = this.container.querySelectorAll('th.sortable');
        headers.forEach((header, index) => {
            const column = this.columns[index];
            const sortIcon = header.querySelector('.sort-icon');
            
            if (sortIcon) {
                if (column === this.sortColumn) {
                    sortIcon.className = `fas fa-sort-${this.sortOrder === 'asc' ? 'up' : 'down'} sort-icon`;
                } else {
                    sortIcon.className = 'fas fa-sort sort-icon';
                }
            }
        });
    }

    toggleStatistics() {
        this.showStats = !this.showStats;
        const statsPanel = this.container.querySelector('#columnStatsPanel');
        
        if (statsPanel) {
            statsPanel.style.display = this.showStats ? 'block' : 'none';
            
            if (this.showStats) {
                this.renderStatistics();
            }
        }
    }

    renderStatistics() {
        const statsGrid = this.container.querySelector('#statsGrid');
        if (!statsGrid) return;

        statsGrid.innerHTML = '';

        Object.values(this.columnStats).forEach(stats => {
            const statCard = document.createElement('div');
            statCard.className = 'column-stat-card';
            
            let statsHtml = `
                <div class="column-stat-name">${stats.name}</div>
                <div class="column-stat-item">
                    <span>Type:</span>
                    <span class="column-stat-value">${stats.type}</span>
                </div>
                <div class="column-stat-item">
                    <span>Unique:</span>
                    <span class="column-stat-value">${this.formatNumber(stats.unique)}</span>
                </div>
                <div class="column-stat-item">
                    <span>Nulls:</span>
                    <span class="column-stat-value">${this.formatNumber(stats.nulls)}</span>
                </div>
            `;

            if (stats.type === 'number' && stats.min !== null) {
                statsHtml += `
                    <div class="column-stat-item">
                        <span>Min:</span>
                        <span class="column-stat-value">${this.formatNumber(stats.min)}</span>
                    </div>
                    <div class="column-stat-item">
                        <span>Max:</span>
                        <span class="column-stat-value">${this.formatNumber(stats.max)}</span>
                    </div>
                    <div class="column-stat-item">
                        <span>Mean:</span>
                        <span class="column-stat-value">${this.formatNumber(stats.mean)}</span>
                    </div>
                `;
            }

            statCard.innerHTML = statsHtml;
            statsGrid.appendChild(statCard);
        });
    }

    updateStatistics() {
        const totalRowsEl = this.container.querySelector('#totalRows');
        const totalColumnsEl = this.container.querySelector('#totalColumns');
        const dataSizeEl = this.container.querySelector('#dataSize');

        if (totalRowsEl) {
            totalRowsEl.textContent = this.formatNumber(this.filteredData.length);
        }

        if (totalColumnsEl) {
            totalColumnsEl.textContent = this.columns.length;
        }

        if (dataSizeEl) {
            // Estimate data size
            const jsonSize = JSON.stringify(this.filteredData.slice(0, 100)).length;
            const estimatedSize = (jsonSize / 100) * this.filteredData.length;
            dataSizeEl.textContent = this.formatDataSize(estimatedSize);
        }
    }

    updateFooterInfo() {
        const visibleRangeEl = this.container.querySelector('#visibleRange');
        const selectedInfoEl = this.container.querySelector('#selectedInfo');

        if (visibleRangeEl) {
            const start = this.virtualScrolling.startIndex + 1;
            const end = Math.min(
                this.virtualScrolling.startIndex + this.virtualScrolling.visibleRows,
                this.filteredData.length
            );
            visibleRangeEl.textContent = `Showing rows ${start}-${end} of ${this.filteredData.length}`;
        }

        if (selectedInfoEl) {
            const selectedCount = this.selectedRows.size;
            selectedInfoEl.textContent = `${selectedCount} row${selectedCount !== 1 ? 's' : ''} selected`;
        }
    }

    toggleRowSelection(index) {
        if (this.selectedRows.has(index)) {
            this.selectedRows.delete(index);
        } else {
            this.selectedRows.add(index);
        }
        this.updateRowSelectionDisplay();
        this.updateFooterInfo();
    }

    selectAllRows(selected) {
        if (selected) {
            this.filteredData.forEach((_, index) => {
                this.selectedRows.add(index);
            });
        } else {
            this.selectedRows.clear();
        }
        this.updateRowSelectionDisplay();
        this.updateFooterInfo();
    }

    updateRowSelectionDisplay() {
        const rows = this.container.querySelectorAll('#tableBody tr:not(.virtual-spacer)');
        rows.forEach(row => {
            const index = parseInt(row.dataset.index);
            const checkbox = row.querySelector('input[type="checkbox"]');
            
            if (this.selectedRows.has(index)) {
                row.classList.add('selected');
                if (checkbox) checkbox.checked = true;
            } else {
                row.classList.remove('selected');
                if (checkbox) checkbox.checked = false;
            }
        });
    }

    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page < 1 || page > totalPages) return;

        this.currentPage = page;
        const startRow = (page - 1) * this.rowsPerPage;
        this.virtualScrolling.startIndex = startRow;

        const tableViewport = this.container.querySelector('#tableViewport');
        if (tableViewport) {
            tableViewport.scrollTop = startRow * this.virtualScrolling.rowHeight;
        }

        this.updatePaginationControls();
    }

    getTotalPages() {
        return Math.ceil(this.filteredData.length / this.rowsPerPage);
    }

    updatePaginationControls() {
        const currentPageInput = this.container.querySelector('#currentPage');
        const totalPagesEl = this.container.querySelector('#totalPages');
        const firstPageBtn = this.container.querySelector('#firstPageBtn');
        const prevPageBtn = this.container.querySelector('#prevPageBtn');
        const nextPageBtn = this.container.querySelector('#nextPageBtn');
        const lastPageBtn = this.container.querySelector('#lastPageBtn');

        const totalPages = this.getTotalPages();

        if (currentPageInput) {
            currentPageInput.value = this.currentPage;
            currentPageInput.max = totalPages;
        }

        if (totalPagesEl) {
            totalPagesEl.textContent = totalPages;
        }

        // Update button states
        if (firstPageBtn) firstPageBtn.disabled = this.currentPage === 1;
        if (prevPageBtn) prevPageBtn.disabled = this.currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = this.currentPage === totalPages;
        if (lastPageBtn) lastPageBtn.disabled = this.currentPage === totalPages;
    }

    toggleFullscreen() {
        const table = this.container.querySelector('.data-preview-table');
        const icon = this.container.querySelector('#fullscreenBtn i');
        
        if (table) {
            table.classList.toggle('fullscreen');
            
            if (icon) {
                icon.className = table.classList.contains('fullscreen') 
                    ? 'fas fa-compress' 
                    : 'fas fa-expand';
            }
        }
    }

    showExportModal() {
        const modal = this.container.querySelector('#exportModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideExportModal() {
        const modal = this.container.querySelector('#exportModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async exportData() {
        const formatInput = this.container.querySelector('input[name="exportFormat"]:checked');
        const includeHeaders = this.container.querySelector('#exportHeaders').checked;
        const exportSelected = this.container.querySelector('#exportSelected').checked;

        if (!formatInput) return;

        const format = formatInput.value;
        const dataToExport = exportSelected && this.selectedRows.size > 0
            ? Array.from(this.selectedRows).map(index => this.filteredData[index])
            : this.filteredData;

        let content = '';
        let filename = `export_${Date.now()}`;
        let mimeType = 'text/plain';

        switch (format) {
            case 'csv':
                content = this.exportToCSV(dataToExport, includeHeaders);
                filename += '.csv';
                mimeType = 'text/csv';
                break;
            case 'json':
                content = JSON.stringify(dataToExport, null, 2);
                filename += '.json';
                mimeType = 'application/json';
                break;
            case 'excel':
                // For Excel export, we'd need a library like xlsx.js
                alert('Excel export requires additional libraries. Using CSV format instead.');
                content = this.exportToCSV(dataToExport, includeHeaders);
                filename += '.csv';
                mimeType = 'text/csv';
                break;
            case 'parquet':
                alert('Parquet export requires server-side processing.');
                this.hideExportModal();
                return;
        }

        // Download the file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        this.hideExportModal();
    }

    exportToCSV(data, includeHeaders) {
        const lines = [];
        
        if (includeHeaders) {
            lines.push(this.columns.map(col => `"${col}"`).join(','));
        }

        data.forEach(row => {
            const values = this.columns.map(col => {
                const value = row[col];
                if (value === null || value === undefined) return '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            lines.push(values.join(','));
        });

        return lines.join('\n');
    }

    formatNumber(num) {
        if (num === null || num === undefined) return '';
        if (Number.isInteger(num)) return num.toLocaleString();
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    formatDataSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Public API methods
    refresh() {
        this.updateDisplay();
    }

    setData(data) {
        this.loadData(data);
    }

    getSelectedData() {
        return Array.from(this.selectedRows).map(index => this.filteredData[index]);
    }

    clearSelection() {
        this.selectedRows.clear();
        this.updateRowSelectionDisplay();
        this.updateFooterInfo();
    }

    destroy() {
        this.container.innerHTML = '';
        clearTimeout(this.scrollIndicatorTimeout);
    }
}

// Export for use
window.DataPreviewTable = DataPreviewTable;