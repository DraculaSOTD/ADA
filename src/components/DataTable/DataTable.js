export class DataTable {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            columns: options.columns || [],
            data: options.data || [],
            sortable: options.sortable !== false,
            filterable: options.filterable !== false,
            paginated: options.paginated !== false,
            pageSize: options.pageSize || 10,
            selectable: options.selectable || false,
            actions: options.actions || [],
            emptyMessage: options.emptyMessage || 'No data available',
            loading: options.loading || false,
            striped: options.striped !== false,
            hoverable: options.hoverable !== false,
            compact: options.compact || false,
            onRowClick: options.onRowClick || null,
            onSort: options.onSort || null,
            onFilter: options.onFilter || null,
            onPageChange: options.onPageChange || null,
            onSelectionChange: options.onSelectionChange || null,
            ...options
        };
        
        this.state = {
            sortColumn: null,
            sortDirection: 'asc',
            filterText: '',
            currentPage: 1,
            selectedRows: new Set()
        };
        
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        const html = `
            <div class="data-table-wrapper ${this.options.compact ? 'compact' : ''}">
                ${this.renderFilter()}
                <div class="data-table-container">
                    ${this.options.loading ? this.renderLoading() : this.renderTable()}
                </div>
                ${this.renderPagination()}
            </div>
        `;
        
        this.container.innerHTML = html;
    }
    
    renderFilter() {
        if (!this.options.filterable) return '';
        
        return `
            <div class="data-table-filter">
                <div class="filter-input-wrapper">
                    <i class="fas fa-search"></i>
                    <input 
                        type="text" 
                        class="filter-input" 
                        placeholder="Search..." 
                        value="${this.state.filterText}"
                    >
                </div>
            </div>
        `;
    }
    
    renderTable() {
        const filteredData = this.getFilteredData();
        const paginatedData = this.getPaginatedData(filteredData);
        
        if (filteredData.length === 0) {
            return `
                <div class="data-table-empty">
                    <i class="fas fa-inbox"></i>
                    <p>${this.options.emptyMessage}</p>
                </div>
            `;
        }
        
        return `
            <table class="data-table ${this.options.striped ? 'striped' : ''} ${this.options.hoverable ? 'hoverable' : ''}">
                <thead>
                    <tr>
                        ${this.options.selectable ? '<th class="checkbox-column"><input type="checkbox" class="select-all"></th>' : ''}
                        ${this.renderHeaders()}
                        ${this.options.actions.length > 0 ? '<th class="actions-column">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${paginatedData.map(row => this.renderRow(row)).join('')}
                </tbody>
            </table>
        `;
    }
    
    renderHeaders() {
        return this.options.columns.map(column => {
            const sortable = this.options.sortable && column.sortable !== false;
            const isSorted = this.state.sortColumn === column.key;
            const sortIcon = isSorted 
                ? (this.state.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down')
                : 'fa-sort';
            
            return `
                <th 
                    class="${sortable ? 'sortable' : ''} ${isSorted ? 'sorted' : ''}"
                    data-column="${column.key}"
                    style="${column.width ? `width: ${column.width}` : ''}"
                >
                    <div class="th-content">
                        <span>${column.label}</span>
                        ${sortable ? `<i class="fas ${sortIcon}"></i>` : ''}
                    </div>
                </th>
            `;
        }).join('');
    }
    
    renderRow(row, index) {
        const rowId = row.id || index;
        const isSelected = this.state.selectedRows.has(rowId);
        
        return `
            <tr 
                class="${isSelected ? 'selected' : ''} ${this.options.onRowClick ? 'clickable' : ''}"
                data-row-id="${rowId}"
            >
                ${this.options.selectable ? `
                    <td class="checkbox-column">
                        <input type="checkbox" class="row-select" ${isSelected ? 'checked' : ''}>
                    </td>
                ` : ''}
                ${this.renderCells(row)}
                ${this.renderActions(row)}
            </tr>
        `;
    }
    
    renderCells(row) {
        return this.options.columns.map(column => {
            let value = this.getNestedValue(row, column.key);
            
            if (column.render) {
                value = column.render(value, row);
            } else if (column.type === 'date' && value) {
                value = new Date(value).toLocaleDateString();
            } else if (column.type === 'datetime' && value) {
                value = new Date(value).toLocaleString();
            } else if (column.type === 'boolean') {
                value = value 
                    ? '<i class="fas fa-check text-success"></i>' 
                    : '<i class="fas fa-times text-danger"></i>';
            } else if (column.type === 'badge' && value) {
                const badgeClass = column.badgeClass ? column.badgeClass(value) : 'primary';
                value = `<span class="badge badge-${badgeClass}">${value}</span>`;
            }
            
            return `<td class="${column.className || ''}">${value || '-'}</td>`;
        }).join('');
    }
    
    renderActions(row) {
        if (this.options.actions.length === 0) return '';
        
        const actions = this.options.actions.map(action => {
            if (action.condition && !action.condition(row)) return '';
            
            const className = action.className || 'btn-sm btn-secondary';
            const icon = action.icon ? `<i class="${action.icon}"></i>` : '';
            const label = action.label || '';
            
            return `
                <button 
                    class="btn ${className} action-btn" 
                    data-action="${action.key}"
                    title="${action.tooltip || label}"
                >
                    ${icon} ${label}
                </button>
            `;
        }).filter(Boolean).join('');
        
        return `<td class="actions-column">${actions}</td>`;
    }
    
    renderPagination() {
        if (!this.options.paginated) return '';
        
        const filteredData = this.getFilteredData();
        const totalPages = Math.ceil(filteredData.length / this.options.pageSize);
        
        if (totalPages <= 1) return '';
        
        const pages = this.getPaginationPages(totalPages);
        
        return `
            <div class="data-table-pagination">
                <div class="pagination-info">
                    Showing ${this.getPaginationInfo(filteredData.length)}
                </div>
                <div class="pagination-controls">
                    <button 
                        class="btn btn-sm btn-secondary" 
                        data-page="prev"
                        ${this.state.currentPage === 1 ? 'disabled' : ''}
                    >
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    ${pages.map(page => {
                        if (page === '...') {
                            return '<span class="pagination-ellipsis">...</span>';
                        }
                        return `
                            <button 
                                class="btn btn-sm ${page === this.state.currentPage ? 'btn-primary' : 'btn-secondary'}" 
                                data-page="${page}"
                            >
                                ${page}
                            </button>
                        `;
                    }).join('')}
                    
                    <button 
                        class="btn btn-sm btn-secondary" 
                        data-page="next"
                        ${this.state.currentPage === totalPages ? 'disabled' : ''}
                    >
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderLoading() {
        return `
            <div class="data-table-loading">
                <div class="spinner-border" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <p>Loading data...</p>
            </div>
        `;
    }
    
    attachEventListeners() {
        // Filter input
        const filterInput = this.container.querySelector('.filter-input');
        if (filterInput) {
            filterInput.addEventListener('input', this.debounce((e) => {
                this.state.filterText = e.target.value;
                this.state.currentPage = 1;
                this.render();
                if (this.options.onFilter) {
                    this.options.onFilter(this.state.filterText);
                }
            }, 300));
        }
        
        // Sort headers
        this.container.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.column;
                if (this.state.sortColumn === column) {
                    this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.state.sortColumn = column;
                    this.state.sortDirection = 'asc';
                }
                this.render();
                if (this.options.onSort) {
                    this.options.onSort(this.state.sortColumn, this.state.sortDirection);
                }
            });
        });
        
        // Row clicks
        if (this.options.onRowClick) {
            this.container.querySelectorAll('tbody tr').forEach(tr => {
                tr.addEventListener('click', (e) => {
                    if (e.target.closest('.actions-column') || e.target.closest('.checkbox-column')) return;
                    const rowId = tr.dataset.rowId;
                    const row = this.options.data.find(r => (r.id || this.options.data.indexOf(r)) == rowId);
                    this.options.onRowClick(row, e);
                });
            });
        }
        
        // Selection
        if (this.options.selectable) {
            // Select all
            const selectAll = this.container.querySelector('.select-all');
            if (selectAll) {
                selectAll.addEventListener('change', (e) => {
                    const checked = e.target.checked;
                    const visibleRows = this.getPaginatedData(this.getFilteredData());
                    
                    visibleRows.forEach(row => {
                        const rowId = row.id || this.options.data.indexOf(row);
                        if (checked) {
                            this.state.selectedRows.add(rowId);
                        } else {
                            this.state.selectedRows.delete(rowId);
                        }
                    });
                    
                    this.render();
                    if (this.options.onSelectionChange) {
                        this.options.onSelectionChange(Array.from(this.state.selectedRows));
                    }
                });
            }
            
            // Individual row selection
            this.container.querySelectorAll('.row-select').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const tr = e.target.closest('tr');
                    const rowId = parseInt(tr.dataset.rowId);
                    
                    if (e.target.checked) {
                        this.state.selectedRows.add(rowId);
                    } else {
                        this.state.selectedRows.delete(rowId);
                    }
                    
                    this.render();
                    if (this.options.onSelectionChange) {
                        this.options.onSelectionChange(Array.from(this.state.selectedRows));
                    }
                });
            });
        }
        
        // Actions
        this.container.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const actionKey = btn.dataset.action;
                const tr = btn.closest('tr');
                const rowId = tr.dataset.rowId;
                const row = this.options.data.find(r => (r.id || this.options.data.indexOf(r)) == rowId);
                const action = this.options.actions.find(a => a.key === actionKey);
                
                if (action && action.handler) {
                    action.handler(row, e);
                }
            });
        });
        
        // Pagination
        this.container.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                const totalPages = Math.ceil(this.getFilteredData().length / this.options.pageSize);
                
                if (page === 'prev' && this.state.currentPage > 1) {
                    this.state.currentPage--;
                } else if (page === 'next' && this.state.currentPage < totalPages) {
                    this.state.currentPage++;
                } else if (!isNaN(page)) {
                    this.state.currentPage = parseInt(page);
                }
                
                this.render();
                if (this.options.onPageChange) {
                    this.options.onPageChange(this.state.currentPage);
                }
            });
        });
    }
    
    // Helper methods
    getFilteredData() {
        if (!this.state.filterText) return this.options.data;
        
        const searchText = this.state.filterText.toLowerCase();
        return this.options.data.filter(row => {
            return this.options.columns.some(column => {
                const value = this.getNestedValue(row, column.key);
                return value && value.toString().toLowerCase().includes(searchText);
            });
        });
    }
    
    getPaginatedData(data) {
        if (!this.options.paginated) return data;
        
        const start = (this.state.currentPage - 1) * this.options.pageSize;
        const end = start + this.options.pageSize;
        
        return data.slice(start, end);
    }
    
    getSortedData(data) {
        if (!this.state.sortColumn) return data;
        
        const column = this.options.columns.find(c => c.key === this.state.sortColumn);
        if (!column) return data;
        
        return [...data].sort((a, b) => {
            let aVal = this.getNestedValue(a, column.key);
            let bVal = this.getNestedValue(b, column.key);
            
            if (column.type === 'number') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (column.type === 'date' || column.type === 'datetime') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else {
                aVal = (aVal || '').toString().toLowerCase();
                bVal = (bVal || '').toString().toLowerCase();
            }
            
            if (aVal < bVal) return this.state.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.state.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }
    
    getPaginationPages(totalPages) {
        const current = this.state.currentPage;
        const pages = [];
        
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (current <= 4) {
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push('...', totalPages);
            } else if (current >= totalPages - 3) {
                pages.push(1, '...');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1, '...');
                for (let i = current - 1; i <= current + 1; i++) {
                    pages.push(i);
                }
                pages.push('...', totalPages);
            }
        }
        
        return pages;
    }
    
    getPaginationInfo(totalItems) {
        const start = (this.state.currentPage - 1) * this.options.pageSize + 1;
        const end = Math.min(start + this.options.pageSize - 1, totalItems);
        return `${start}-${end} of ${totalItems} items`;
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Public methods
    updateData(data) {
        this.options.data = data;
        this.state.currentPage = 1;
        this.render();
    }
    
    updateColumns(columns) {
        this.options.columns = columns;
        this.render();
    }
    
    setLoading(loading) {
        this.options.loading = loading;
        this.render();
    }
    
    getSelectedRows() {
        return Array.from(this.state.selectedRows).map(id => {
            return this.options.data.find(row => (row.id || this.options.data.indexOf(row)) == id);
        }).filter(Boolean);
    }
    
    clearSelection() {
        this.state.selectedRows.clear();
        this.render();
    }
    
    refresh() {
        this.render();
    }
}