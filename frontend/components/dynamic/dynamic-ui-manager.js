// Dynamic UI Manager

class DynamicUIManager extends BaseComponent {
    constructor(container, props) {
        super(container, props);
        this.dynamicElements = new Map();
        this.templates = new Map();
    }

    getDefaultProps() {
        return {
            enableTemplating: true,
            enableDataBinding: true
        };
    }

    async createHTML() {
        return '<div class="dynamic-ui-container"></div>';
    }

    addDynamicRow(template, data) {
        const rowId = this.generateId();
        const element = this.createElementFromTemplate(template, data);
        
        element.setAttribute('data-dynamic-id', rowId);
        this.element.appendChild(element);
        this.dynamicElements.set(rowId, { element, template, data });
        
        return rowId;
    }

    addDynamicColumn(headerText, cellTemplate) {
        const columnId = this.generateId();
        
        // Find or create table
        let table = this.find('.dynamic-table');
        if (!table) {
            table = document.createElement('table');
            table.className = 'dynamic-table';
            this.element.appendChild(table);
        }
        
        // Add header
        let thead = table.querySelector('thead');
        if (!thead) {
            thead = document.createElement('thead');
            table.appendChild(thead);
        }
        
        let headerRow = thead.querySelector('tr');
        if (!headerRow) {
            headerRow = document.createElement('tr');
            thead.appendChild(headerRow);
        }
        
        const th = document.createElement('th');
        th.textContent = headerText;
        th.setAttribute('data-column-id', columnId);
        headerRow.appendChild(th);
        
        // Store column template
        this.templates.set(columnId, cellTemplate);
        
        return columnId;
    }

    removeDynamicElement(elementId) {
        const item = this.dynamicElements.get(elementId);
        if (item) {
            item.element.remove();
            this.dynamicElements.delete(elementId);
            return true;
        }
        return false;
    }

    createElementFromTemplate(template, data) {
        const html = this.processTemplate(template, data);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.firstElementChild;
    }

    processTemplate(template, data) {
        let processed = template;
        
        // Replace variables {{variable}}
        processed = processed.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
            return this.getNestedValue(data, path) || '';
        });
        
        // Handle conditionals {{#if condition}}...{{/if}}
        processed = processed.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
            return this.getNestedValue(data, condition) ? content : '';
        });
        
        // Handle loops {{#each items}}...{{/each}}
        processed = processed.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, itemsPath, itemTemplate) => {
            const items = this.getNestedValue(data, itemsPath);
            if (!Array.isArray(items)) return '';
            
            return items.map(item => {
                return itemTemplate.replace(/\{\{this(?:\.(\w+))?\}\}/g, (m, prop) => {
                    return prop ? item[prop] : item;
                });
            }).join('');
        });
        
        return processed;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current ? current[key] : undefined;
        }, obj);
    }

    updateDynamicData(elementId, newData) {
        const item = this.dynamicElements.get(elementId);
        if (!item) return false;
        
        const newElement = this.createElementFromTemplate(item.template, newData);
        item.element.replaceWith(newElement);
        item.element = newElement;
        item.data = newData;
        
        return true;
    }

    clearAll() {
        this.element.innerHTML = '';
        this.dynamicElements.clear();
        this.templates.clear();
    }
}

window.DynamicUIManager = DynamicUIManager;