// Component Loader - Static component loading system

class ComponentLoader {
    constructor() {
        this.components = new Map();
        this.loadedComponents = new Set();
        this.componentCache = new Map();
        this.loadPromises = new Map();
    }

    // Register a component class
    register(name, componentClass) {
        if (this.components.has(name)) {
            console.warn(`Component ${name} is already registered`);
        }
        this.components.set(name, componentClass);
        console.log(`Component ${name} registered`);
    }

    // Get a registered component
    getComponent(name) {
        if (!this.components.has(name)) {
            console.error(`Component ${name} not found`);
            return null;
        }
        return this.components.get(name);
    }

    // Load all registered components
    async loadAllComponents() {
        const loadPromises = [];
        
        for (const [name, componentClass] of this.components) {
            if (!this.loadedComponents.has(name)) {
                loadPromises.push(this.loadComponent(name, componentClass));
            }
        }
        
        await Promise.all(loadPromises);
        console.log(`All ${this.components.size} components loaded`);
        return true;
    }

    // Load a single component
    async loadComponent(name, componentClass) {
        // Check if already loading
        if (this.loadPromises.has(name)) {
            return this.loadPromises.get(name);
        }
        
        // Check if already loaded
        if (this.loadedComponents.has(name)) {
            return Promise.resolve(true);
        }
        
        const loadPromise = this._performComponentLoad(name, componentClass);
        this.loadPromises.set(name, loadPromise);
        
        try {
            await loadPromise;
            this.loadedComponents.add(name);
            this.loadPromises.delete(name);
            return true;
        } catch (error) {
            console.error(`Failed to load component ${name}:`, error);
            this.loadPromises.delete(name);
            throw error;
        }
    }

    // Perform the actual component loading
    async _performComponentLoad(name, componentClass) {
        try {
            // Validate component class
            if (!componentClass || typeof componentClass !== 'function') {
                throw new Error(`Invalid component class for ${name}`);
            }
            
            // Check if component has required methods
            const requiredMethods = ['render'];
            const prototype = componentClass.prototype;
            
            for (const method of requiredMethods) {
                if (typeof prototype[method] !== 'function') {
                    console.warn(`Component ${name} missing required method: ${method}`);
                }
            }
            
            // Pre-load any component dependencies
            if (componentClass.dependencies) {
                await this.loadDependencies(componentClass.dependencies);
            }
            
            // Pre-compile any templates if needed
            if (componentClass.template) {
                await this.compileTemplate(name, componentClass.template);
            }
            
            console.log(`Component ${name} loaded successfully`);
            return true;
        } catch (error) {
            console.error(`Error loading component ${name}:`, error);
            throw error;
        }
    }

    // Load component dependencies
    async loadDependencies(dependencies) {
        const depPromises = dependencies.map(dep => {
            if (typeof dep === 'string' && this.components.has(dep)) {
                return this.loadComponent(dep, this.components.get(dep));
            }
            return Promise.resolve();
        });
        
        await Promise.all(depPromises);
    }

    // Compile component template
    async compileTemplate(name, template) {
        // Simple template compilation
        // In a real implementation, this could use a proper template engine
        const compiled = this.parseTemplate(template);
        this.componentCache.set(`${name}_template`, compiled);
        return compiled;
    }

    // Parse template string
    parseTemplate(template) {
        // Simple template parser for {{variable}} syntax
        return {
            original: template,
            render: (data) => {
                return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
                    const value = this.getNestedProperty(data, path);
                    return value !== undefined ? value : '';
                });
            }
        };
    }

    // Get nested property from object
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current ? current[key] : undefined;
        }, obj);
    }

    // Create component instance
    createInstance(name, container, props = {}) {
        const ComponentClass = this.getComponent(name);
        
        if (!ComponentClass) {
            throw new Error(`Component ${name} not found`);
        }
        
        // Create and return new instance
        return new ComponentClass(container, props);
    }

    // Render component to container
    async renderComponent(name, container, props = {}) {
        try {
            const instance = this.createInstance(name, container, props);
            await instance.render();
            return instance;
        } catch (error) {
            console.error(`Failed to render component ${name}:`, error);
            throw error;
        }
    }

    // Get all registered component names
    getComponentNames() {
        return Array.from(this.components.keys());
    }

    // Check if component is registered
    hasComponent(name) {
        return this.components.has(name);
    }

    // Check if component is loaded
    isLoaded(name) {
        return this.loadedComponents.has(name);
    }

    // Unregister a component
    unregister(name) {
        if (this.components.has(name)) {
            this.components.delete(name);
            this.loadedComponents.delete(name);
            this.componentCache.delete(`${name}_template`);
            console.log(`Component ${name} unregistered`);
            return true;
        }
        return false;
    }

    // Clear all components
    clear() {
        this.components.clear();
        this.loadedComponents.clear();
        this.componentCache.clear();
        this.loadPromises.clear();
        console.log('All components cleared');
    }

    // Batch render multiple components
    async renderBatch(components) {
        const renderPromises = components.map(({ name, container, props }) => {
            return this.renderComponent(name, container, props);
        });
        
        return await Promise.all(renderPromises);
    }

    // Get component statistics
    getStats() {
        return {
            registered: this.components.size,
            loaded: this.loadedComponents.size,
            cached: this.componentCache.size,
            loading: this.loadPromises.size
        };
    }
}

// Export for use in other modules
window.ComponentLoader = ComponentLoader;