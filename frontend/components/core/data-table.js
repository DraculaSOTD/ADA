// DataTable Component

class DataTableComponent extends BaseComponent {
    getDefaultProps() {
        return {
            columns: [], // Array of { key, label, sortable, width, align, formatter }
            data: [],
            sorting: true,
            filtering: true,
            pagination: true,
            pageSize: 20,
            selectable: false,
            editable: false,
            striped: true,
            hover: true,
            bordered: true,
            compact: false,
            loading: false,
            emptyMessage: 'No data available',
            onRowClick: null,
            onSelectionChange: null,
            onEdit: null,
            onSort: null,
            onFilter: null,
            className: ''
        };
    }

    getInitialState() {
        return {
            currentPage: 1,
            sortColumn: null,
            sortDirection: 'asc',
            filterText: '',
            selectedRows: new Set(),
            editingCell: null,
            processedData: []
        };
    }

    async createHTML() {
        const {
            columns,
            striped,
            hover,
            bordered,
            compact,
            loading,
            filtering,
            pagination,
            selectable,
            className
        } = this.props;

        const { currentPage, sortColumn, sortDirection, filterText } = this.state;

        const tableClasses = [
            'data-table',
            striped ? 'data-table--striped' : '',
            hover ? 'data-table--hover' : '',
            bordered ? 'data-table--bordered' : '',
            compact ? 'data-table--compact' : '',
            className
        ].filter(Boolean).join(' ');

        // Process data
        const processedData = this.processData();
        const paginatedData = this.paginateData(processedData);

        // Filter bar
        let filterHTML = '';
        if (filtering) {
            filterHTML = `
                <div class="data-table__filter">
                    <input 
                        type="text" 
                        class="data-table__filter-input" 
                        placeholder="Search..."
                        value="${filterText}"
                    />
                </div>
            `;
        }

        // Table header
        let headerHTML = '<thead><tr>';
        
        if (selectable) {
            headerHTML += `
                <th class="data-table__checkbox-cell">
                    <input type="checkbox" class="data-table__select-all" />
                </th>
            `;
        }

        for (const column of columns) {
            const sortable = column.sortable !== false && this.props.sorting;
            const isSorted = sortColumn === column.key;
            const sortClass = isSorted ? `data-table__header--sorted-${sortDirection}` : '';
            
            headerHTML += `
                <th 
                    class="data-table__header ${sortable ? 'data-table__header--sortable' : ''} ${sortClass}"
                    data-column="${column.key}"
                    style="${column.width ? `width: ${column.width}` : ''}"
                >
                    <div class="data-table__header-content">
                        <span>${column.label}</span>
                        ${sortable ? '<span class="data-table__sort-icon"></span>' : ''}
                    </div>
                </th>
            `;
        }
        headerHTML += '</tr></thead>';

        // Table body
        let bodyHTML = '<tbody>';
        
        if (loading) {
            bodyHTML += `
                <tr>
                    <td colspan="${columns.length + (selectable ? 1 : 0)}" class="data-table__loading">
                        <div class="data-table__spinner"></div>
                        Loading...
                    </td>
                </tr>
            `;
        } else if (paginatedData.length === 0) {
            bodyHTML += `
                <tr>
                    <td colspan="${columns.length + (selectable ? 1 : 0)}" class="data-table__empty">
                        ${this.props.emptyMessage}
                    </td>
                </tr>
            `;
        } else {
            for (const [index, row] of paginatedData.entries()) {
                const isSelected = this.state.selectedRows.has(row);
                bodyHTML += `<tr class="${isSelected ? 'data-table__row--selected' : ''}" data-row-index="${index}">`;
                
                if (selectable) {
                    bodyHTML += `
                        <td class="data-table__checkbox-cell">
                            <input type="checkbox" class="data-table__select-row" ${isSelected ? 'checked' : ''} />
                        </td>
                    `;
                }

                for (const column of columns) {
                    const value = this.getCellValue(row, column);
                    const align = column.align || 'left';
                    const editable = column.editable && this.props.editable;
                    
                    bodyHTML += `
                        <td 
                            class="data-table__cell ${editable ? 'data-table__cell--editable' : ''}"
                            style="text-align: ${align}"
                            data-column="${column.key}"
                        >
                            ${value}
                        </td>
                    `;
                }
                
                bodyHTML += '</tr>';
            }
        }
        bodyHTML += '</tbody>';

        // Pagination
        let paginationHTML = '';
        if (pagination && !loading && processedData.length > 0) {
            const totalPages = Math.ceil(processedData.length / this.props.pageSize);
            paginationHTML = this.createPaginationHTML(currentPage, totalPages);
        }

        return `
            <div class="${tableClasses}">
                ${filterHTML}
                <div class="data-table__wrapper">
                    <table class="data-table__table">
                        ${headerHTML}
                        ${bodyHTML}
                    </table>
                </div>
                ${paginationHTML}
            </div>
        `;
    }

    bindEvents() {
        // Filter input
        const filterInput = this.find('.data-table__filter-input');
        if (filterInput) {
            this.addEventListener(filterInput, 'input', this.debounce((e) => {
                this.setState({ filterText: e.target.value, currentPage: 1 });
                if (this.props.onFilter) {
                    this.props.onFilter(e.target.value);
                }
            }, 300));
        }

        // Sort headers
        if (this.props.sorting) {
            this.findAll('.data-table__header--sortable').forEach(header => {
                this.addEventListener(header, 'click', () => {
                    const column = header.dataset.column;
                    this.handleSort(column);
                });
            });
        }

        // Row selection
        if (this.props.selectable) {
            // Select all checkbox
            const selectAll = this.find('.data-table__select-all');
            if (selectAll) {
                this.addEventListener(selectAll, 'change', (e) => {
                    this.handleSelectAll(e.target.checked);
                });
            }

            // Individual row checkboxes
            this.findAll('.data-table__select-row').forEach((checkbox, index) => {
                this.addEventListener(checkbox, 'change', (e) => {
                    this.handleRowSelection(index, e.target.checked);
                });
            });
        }

        // Row click
        if (this.props.onRowClick) {
            this.findAll('tbody tr').forEach((row, index) => {
                this.addEventListener(row, 'click', (e) => {
                    if (!e.target.matches('input')) {
                        const data = this.paginateData(this.processData())[index];
                        this.props.onRowClick(data, index);
                    }
                });
            });
        }

        // Cell editing
        if (this.props.editable) {
            this.findAll('.data-table__cell--editable').forEach(cell => {
                this.addEventListener(cell, 'dblclick', () => {
                    this.startCellEdit(cell);
                });
            });
        }

        // Pagination
        this.findAll('[data-page]').forEach(button => {
            this.addEventListener(button, 'click', () => {
                const page = parseInt(button.dataset.page);
                if (page) {
                    this.setState({ currentPage: page });
                }
            });
        });
    }

    processData() {
        let data = [...this.props.data];

        // Apply filtering
        if (this.state.filterText) {
            data = this.filterData(data, this.state.filterText);
        }

        // Apply sorting
        if (this.state.sortColumn) {
            data = this.sortData(data, this.state.sortColumn, this.state.sortDirection);
        }

        return data;
    }

    filterData(data, filterText) {
        const searchText = filterText.toLowerCase();
        return data.filter(row => {
            return this.props.columns.some(column => {
                const value = this.getCellValue(row, column);
                return value.toString().toLowerCase().includes(searchText);
            });
        });
    }

    sortData(data, column, direction) {
        return [...data].sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];

            if (aVal === bVal) return 0;
            
            let comparison = 0;
            if (aVal === null || aVal === undefined) {
                comparison = 1;
            } else if (bVal === null || bVal === undefined) {
                comparison = -1;
            } else if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = aVal.toString().localeCompare(bVal.toString());
            }

            return direction === 'asc' ? comparison : -comparison;
        });
    }

    paginateData(data) {
        if (!this.props.pagination) {
            return data;
        }

        const { currentPage } = this.state;
        const { pageSize } = this.props;
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;

        return data.slice(start, end);
    }

    getCellValue(row, column) {
        const value = row[column.key];
        
        if (column.formatter && typeof column.formatter === 'function') {
            return column.formatter(value, row);
        }

        if (value === null || value === undefined) {
            return '';
        }

        return this.escapeHTML(value.toString());
    }

    handleSort(column) {
        const { sortColumn, sortDirection } = this.state;
        
        let newDirection = 'asc';
        if (sortColumn === column) {
            newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        }

        this.setState({
            sortColumn: column,
            sortDirection: newDirection,
            currentPage: 1
        });

        if (this.props.onSort) {
            this.props.onSort(column, newDirection);
        }
    }

    handleSelectAll(checked) {
        const processedData = this.processData();
        const selectedRows = new Set();

        if (checked) {
            processedData.forEach(row => selectedRows.add(row));
        }

        this.setState({ selectedRows });

        if (this.props.onSelectionChange) {
            this.props.onSelectionChange(Array.from(selectedRows));
        }
    }

    handleRowSelection(index, checked) {
        const processedData = this.paginateData(this.processData());
        const row = processedData[index];
        const selectedRows = new Set(this.state.selectedRows);

        if (checked) {
            selectedRows.add(row);
        } else {
            selectedRows.delete(row);
        }

        this.setState({ selectedRows });

        if (this.props.onSelectionChange) {
            this.props.onSelectionChange(Array.from(selectedRows));
        }
    }

    startCellEdit(cell) {
        // Implementation for cell editing
        // This would create an input field in the cell for editing
    }

    createPaginationHTML(currentPage, totalPages) {
        let html = '<div class="data-table__pagination">';
        
        // Previous button
        html += `
            <button 
                class="data-table__page-btn" 
                data-page="${currentPage - 1}"
                ${currentPage === 1 ? 'disabled' : ''}
            >
                Previous
            </button>
        `;

        // Page numbers
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button 
                    class="data-table__page-btn ${i === currentPage ? 'data-table__page-btn--active' : ''}" 
                    data-page="${i}"
                >
                    ${i}
                </button>
            `;
        }

        // Next button
        html += `
            <button 
                class="data-table__page-btn" 
                data-page="${currentPage + 1}"
                ${currentPage === totalPages ? 'disabled' : ''}
            >
                Next
            </button>
        `;

        html += '</div>';
        return html;
    }

    // Public methods
    setData(data) {
        this.update({ data });
    }

    getSelectedRows() {
        return Array.from(this.state.selectedRows);
    }

    clearSelection() {
        this.setState({ selectedRows: new Set() });
    }

    refresh() {
        this.render();
    }
}

// Export for use in other modules
window.DataTableComponent = DataTableComponent;