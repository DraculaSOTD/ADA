// Base Component Class - Foundation for all UI components

class BaseComponent {
    constructor(container, props = {}) {
        // Validate container
        if (!container) {
            throw new Error('Container element is required');
        }
        
        // Set container
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
            
        if (!this.container) {
            throw new Error('Container element not found');
        }
        
        // Initialize properties
        this.props = { ...this.getDefaultProps(), ...props };
        this.state = this.getInitialState();
        this.children = [];
        this.eventListeners = [];
        this.mounted = false;
        this.element = null;
        this.id = this.generateId();
        
        // Bind methods
        this.render = this.render.bind(this);
        this.update = this.update.bind(this);
        this.destroy = this.destroy.bind(this);
        this.setState = this.setState.bind(this);
    }

    // Get default props (to be overridden by child classes)
    getDefaultProps() {
        return {};
    }

    // Get initial state (to be overridden by child classes)
    getInitialState() {
        return {};
    }

    // Generate unique component ID
    generateId() {
        return `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Main render method (must be implemented by child classes)
    async render() {
        try {
            // Clear container
            this.clear();
            
            // Create component HTML
            const html = await this.createHTML();
            
            // Create element from HTML
            this.element = this.createElement(html);
            
            // Add component ID
            this.element.setAttribute('data-component-id', this.id);
            
            // Append to container
            this.container.appendChild(this.element);
            
            // Bind events
            this.bindEvents();
            
            // Call lifecycle method
            await this.onMount();
            
            // Mark as mounted
            this.mounted = true;
            
            // Render children if any
            await this.renderChildren();
            
            return this.element;
        } catch (error) {
            console.error(`Error rendering component ${this.constructor.name}:`, error);
            this.handleRenderError(error);
        }
    }

    // Create component HTML (to be overridden by child classes)
    async createHTML() {
        return '<div>Base Component</div>';
    }

    // Create DOM element from HTML string
    createElement(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstElementChild;
    }

    // Clear container
    clear() {
        if (this.container) {
            // Remove event listeners before clearing
            this.removeEventListeners();
            // Clear container
            this.container.innerHTML = '';
        }
    }

    // Bind event listeners
    bindEvents() {
        // To be overridden by child classes
    }

    // Add event listener with automatic cleanup
    addEventListener(element, event, handler, options) {
        const targetElement = typeof element === 'string' 
            ? this.element.querySelector(element) 
            : element;
            
        if (targetElement) {
            targetElement.addEventListener(event, handler, options);
            this.eventListeners.push({ element: targetElement, event, handler, options });
        }
    }

    // Remove all event listeners
    removeEventListeners() {
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            if (element) {
                element.removeEventListener(event, handler, options);
            }
        });
        this.eventListeners = [];
    }

    // Update component with new props
    async update(newProps = {}) {
        try {
            // Update props
            const oldProps = { ...this.props };
            this.props = { ...this.props, ...newProps };
            
            // Call lifecycle method
            await this.onUpdate(oldProps, this.props);
            
            // Re-render if needed
            if (this.shouldUpdate(oldProps, this.props)) {
                await this.render();
            }
        } catch (error) {
            console.error(`Error updating component ${this.constructor.name}:`, error);
        }
    }

    // Set component state
    async setState(newState) {
        try {
            // Update state
            const oldState = { ...this.state };
            this.state = { ...this.state, ...newState };
            
            // Call lifecycle method
            await this.onStateChange(oldState, this.state);
            
            // Re-render if needed
            if (this.shouldUpdateState(oldState, this.state)) {
                await this.render();
            }
        } catch (error) {
            console.error(`Error setting state for component ${this.constructor.name}:`, error);
        }
    }

    // Check if component should update
    shouldUpdate(oldProps, newProps) {
        return !this.shallowEqual(oldProps, newProps);
    }

    // Check if component should update based on state
    shouldUpdateState(oldState, newState) {
        return !this.shallowEqual(oldState, newState);
    }

    // Shallow equality check
    shallowEqual(obj1, obj2) {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) {
            return false;
        }
        
        for (const key of keys1) {
            if (obj1[key] !== obj2[key]) {
                return false;
            }
        }
        
        return true;
    }

    // Destroy component
    async destroy() {
        try {
            // Call lifecycle method
            await this.onDestroy();
            
            // Destroy children
            await this.destroyChildren();
            
            // Remove event listeners
            this.removeEventListeners();
            
            // Clear container
            this.clear();
            
            // Reset properties
            this.mounted = false;
            this.element = null;
            
            console.log(`Component ${this.constructor.name} destroyed`);
        } catch (error) {
            console.error(`Error destroying component ${this.constructor.name}:`, error);
        }
    }

    // Render child components
    async renderChildren() {
        // To be implemented by child classes if needed
    }

    // Destroy child components
    async destroyChildren() {
        for (const child of this.children) {
            if (child && typeof child.destroy === 'function') {
                await child.destroy();
            }
        }
        this.children = [];
    }

    // Add child component
    addChild(child) {
        this.children.push(child);
    }

    // Remove child component
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
        }
    }

    // Find element within component
    find(selector) {
        return this.element ? this.element.querySelector(selector) : null;
    }

    // Find all elements within component
    findAll(selector) {
        return this.element ? this.element.querySelectorAll(selector) : [];
    }

    // Emit custom event
    emit(eventName, detail = {}) {
        if (this.element) {
            const event = new CustomEvent(eventName, {
                detail,
                bubbles: true,
                cancelable: true
            });
            this.element.dispatchEvent(event);
        }
    }

    // Subscribe to custom event
    on(eventName, handler) {
        this.addEventListener(this.element, eventName, handler);
    }

    // Show component
    show() {
        if (this.element) {
            this.element.style.display = '';
            this.element.classList.remove('hidden');
        }
    }

    // Hide component
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            this.element.classList.add('hidden');
        }
    }

    // Toggle component visibility
    toggle() {
        if (this.element) {
            const isHidden = this.element.style.display === 'none' || 
                           this.element.classList.contains('hidden');
            if (isHidden) {
                this.show();
            } else {
                this.hide();
            }
        }
    }

    // Add CSS class
    addClass(className) {
        if (this.element) {
            this.element.classList.add(className);
        }
    }

    // Remove CSS class
    removeClass(className) {
        if (this.element) {
            this.element.classList.remove(className);
        }
    }

    // Toggle CSS class
    toggleClass(className) {
        if (this.element) {
            this.element.classList.toggle(className);
        }
    }

    // Check if has CSS class
    hasClass(className) {
        return this.element ? this.element.classList.contains(className) : false;
    }

    // Set attribute
    setAttribute(name, value) {
        if (this.element) {
            this.element.setAttribute(name, value);
        }
    }

    // Get attribute
    getAttribute(name) {
        return this.element ? this.element.getAttribute(name) : null;
    }

    // Remove attribute
    removeAttribute(name) {
        if (this.element) {
            this.element.removeAttribute(name);
        }
    }

    // Lifecycle methods (to be overridden by child classes)
    async onMount() {
        // Called after component is mounted
    }

    async onUpdate(oldProps, newProps) {
        // Called when props are updated
    }

    async onStateChange(oldState, newState) {
        // Called when state changes
    }

    async onDestroy() {
        // Called before component is destroyed
    }

    // Error handling
    handleRenderError(error) {
        // Default error handling - can be overridden
        const errorHTML = `
            <div class="component-error">
                <h3>Component Error</h3>
                <p>${error.message}</p>
            </div>
        `;
        this.container.innerHTML = errorHTML;
    }

    // Utility method to escape HTML
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Utility method to format currency
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Utility method to format date
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
    }

    // Debounce utility
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

    // Throttle utility
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Export for use in other modules
window.BaseComponent = BaseComponent;