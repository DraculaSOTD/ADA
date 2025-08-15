// Data Binding System - Reactive data management

class DataBindingSystem {
    constructor() {
        this.bindings = new Map();
        this.dataSources = new Map();
        this.observers = new Map();
        this.updateQueue = [];
        this.isUpdating = false;
        
        // Bind methods
        this.bindComponent = this.bindComponent.bind(this);
        this.unbindComponent = this.unbindComponent.bind(this);
        this.updateData = this.updateData.bind(this);
    }

    // Bind a component to a data source
    bindComponent(componentId, dataSource, options = {}) {
        const binding = {
            componentId,
            dataSource,
            updateCallback: options.updateCallback || null,
            transform: options.transform || null,
            filter: options.filter || null,
            debounce: options.debounce || 0,
            throttle: options.throttle || 0,
            deep: options.deep || false,
            immediate: options.immediate !== false
        };
        
        // Store binding
        this.bindings.set(componentId, binding);
        
        // Set up data observer
        this.setupDataObserver(componentId, dataSource, binding);
        
        // Perform immediate update if requested
        if (binding.immediate) {
            this.refreshData(componentId);
        }
        
        console.log(`Component ${componentId} bound to data source:`, dataSource);
        return true;
    }

    // Set up data observer for reactive updates
    setupDataObserver(componentId, dataSource, binding) {
        // Get or create data source
        if (!this.dataSources.has(dataSource)) {
            this.dataSources.set(dataSource, this.createReactiveData({}));
        }
        
        const reactiveData = this.dataSources.get(dataSource);
        
        // Create observer
        const observer = {
            componentId,
            dataSource,
            handler: (property, value, oldValue) => {
                this.handleDataChange(componentId, property, value, oldValue, binding);
            }
        };
        
        // Store observer
        if (!this.observers.has(dataSource)) {
            this.observers.set(dataSource, []);
        }
        this.observers.get(dataSource).push(observer);
        
        return observer;
    }

    // Create reactive data object
    createReactiveData(initialData) {
        const self = this;
        
        return new Proxy(initialData, {
            get(target, property) {
                // Track property access for dependency tracking
                self.trackDependency(property);
                return target[property];
            },
            
            set(target, property, value) {
                const oldValue = target[property];
                
                // Check if value actually changed
                if (oldValue === value) {
                    return true;
                }
                
                // Update value
                target[property] = value;
                
                // Notify observers
                self.notifyObservers(property, value, oldValue);
                
                return true;
            },
            
            deleteProperty(target, property) {
                const oldValue = target[property];
                delete target[property];
                
                // Notify observers
                self.notifyObservers(property, undefined, oldValue);
                
                return true;
            }
        });
    }

    // Track property access for dependency tracking
    trackDependency(property) {
        // This could be extended to track which components depend on which properties
        // for more efficient updates
    }

    // Notify observers of data change
    notifyObservers(property, value, oldValue) {
        // Get all observers for all data sources
        for (const [dataSource, observers] of this.observers) {
            for (const observer of observers) {
                observer.handler(property, value, oldValue);
            }
        }
    }

    // Handle data change for a component
    handleDataChange(componentId, property, value, oldValue, binding) {
        // Apply filter if provided
        if (binding.filter && !binding.filter(property, value, oldValue)) {
            return;
        }
        
        // Queue update
        this.queueUpdate(componentId, property, value, oldValue, binding);
    }

    // Queue component update
    queueUpdate(componentId, property, value, oldValue, binding) {
        const update = {
            componentId,
            property,
            value,
            oldValue,
            binding,
            timestamp: Date.now()
        };
        
        // Check if update already queued
        const existingIndex = this.updateQueue.findIndex(
            u => u.componentId === componentId && u.property === property
        );
        
        if (existingIndex > -1) {
            // Replace existing update
            this.updateQueue[existingIndex] = update;
        } else {
            // Add new update
            this.updateQueue.push(update);
        }
        
        // Process queue
        this.processUpdateQueue();
    }

    // Process update queue
    processUpdateQueue() {
        if (this.isUpdating || this.updateQueue.length === 0) {
            return;
        }
        
        this.isUpdating = true;
        
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            const updates = [...this.updateQueue];
            this.updateQueue = [];
            
            // Group updates by component
            const componentUpdates = new Map();
            
            for (const update of updates) {
                if (!componentUpdates.has(update.componentId)) {
                    componentUpdates.set(update.componentId, []);
                }
                componentUpdates.get(update.componentId).push(update);
            }
            
            // Apply updates
            for (const [componentId, updates] of componentUpdates) {
                this.applyComponentUpdates(componentId, updates);
            }
            
            this.isUpdating = false;
            
            // Check if more updates queued
            if (this.updateQueue.length > 0) {
                this.processUpdateQueue();
            }
        });
    }

    // Apply updates to a component
    applyComponentUpdates(componentId, updates) {
        const binding = this.bindings.get(componentId);
        if (!binding) return;
        
        // Get component data
        const data = this.getData(binding.dataSource);
        
        // Apply transform if provided
        const transformedData = binding.transform ? binding.transform(data) : data;
        
        // Call update callback
        if (binding.updateCallback) {
            try {
                binding.updateCallback(transformedData, updates);
            } catch (error) {
                console.error(`Error updating component ${componentId}:`, error);
            }
        }
        
        // Trigger component update event
        this.triggerComponentUpdate(componentId, transformedData, updates);
    }

    // Trigger component update event
    triggerComponentUpdate(componentId, data, updates) {
        const event = new CustomEvent('databinding:update', {
            detail: {
                componentId,
                data,
                updates
            }
        });
        
        document.dispatchEvent(event);
    }

    // Get data for a data source
    getData(dataSource) {
        if (!this.dataSources.has(dataSource)) {
            return null;
        }
        return this.dataSources.get(dataSource);
    }

    // Set data for a data source
    setData(dataSource, data) {
        if (!this.dataSources.has(dataSource)) {
            this.dataSources.set(dataSource, this.createReactiveData(data));
        } else {
            const reactiveData = this.dataSources.get(dataSource);
            Object.assign(reactiveData, data);
        }
    }

    // Update specific data property
    updateData(dataSource, property, value) {
        if (!this.dataSources.has(dataSource)) {
            this.dataSources.set(dataSource, this.createReactiveData({}));
        }
        
        const reactiveData = this.dataSources.get(dataSource);
        
        if (typeof property === 'object') {
            // Update multiple properties
            Object.assign(reactiveData, property);
        } else {
            // Update single property
            reactiveData[property] = value;
        }
    }

    // Refresh data for a component
    refreshData(componentId) {
        const binding = this.bindings.get(componentId);
        if (!binding) return;
        
        const data = this.getData(binding.dataSource);
        
        // Force update
        this.applyComponentUpdates(componentId, [{
            property: '*',
            value: data,
            oldValue: null
        }]);
    }

    // Unbind a component
    unbindComponent(componentId) {
        const binding = this.bindings.get(componentId);
        if (!binding) return false;
        
        // Remove from bindings
        this.bindings.delete(componentId);
        
        // Remove observer
        const dataSourceObservers = this.observers.get(binding.dataSource);
        if (dataSourceObservers) {
            const index = dataSourceObservers.findIndex(o => o.componentId === componentId);
            if (index > -1) {
                dataSourceObservers.splice(index, 1);
            }
        }
        
        // Remove from update queue
        this.updateQueue = this.updateQueue.filter(u => u.componentId !== componentId);
        
        console.log(`Component ${componentId} unbound`);
        return true;
    }

    // Clear all bindings
    clearBindings() {
        this.bindings.clear();
        this.observers.clear();
        this.updateQueue = [];
        console.log('All data bindings cleared');
    }

    // Get binding for a component
    getBinding(componentId) {
        return this.bindings.get(componentId);
    }

    // Check if component is bound
    isBound(componentId) {
        return this.bindings.has(componentId);
    }

    // Get all bindings
    getAllBindings() {
        return Array.from(this.bindings.entries());
    }

    // Create computed property
    createComputed(dataSource, property, computation, dependencies = []) {
        // Set up watchers for dependencies
        for (const dep of dependencies) {
            this.watch(dataSource, dep, () => {
                // Recompute value
                const data = this.getData(dataSource);
                const computedValue = computation(data);
                this.updateData(dataSource, property, computedValue);
            });
        }
        
        // Compute initial value
        const data = this.getData(dataSource);
        const initialValue = computation(data);
        this.updateData(dataSource, property, initialValue);
    }

    // Watch for specific property changes
    watch(dataSource, property, callback) {
        const watcherId = `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const binding = {
            componentId: watcherId,
            dataSource,
            updateCallback: (data, updates) => {
                const relevantUpdate = updates.find(u => u.property === property || u.property === '*');
                if (relevantUpdate) {
                    callback(relevantUpdate.value, relevantUpdate.oldValue);
                }
            }
        };
        
        this.bindings.set(watcherId, binding);
        this.setupDataObserver(watcherId, dataSource, binding);
        
        return watcherId;
    }

    // Stop watching
    unwatch(watcherId) {
        return this.unbindComponent(watcherId);
    }

    // Get statistics
    getStats() {
        return {
            bindings: this.bindings.size,
            dataSources: this.dataSources.size,
            observers: Array.from(this.observers.values()).reduce((sum, arr) => sum + arr.length, 0),
            queuedUpdates: this.updateQueue.length,
            isUpdating: this.isUpdating
        };
    }
}

// Export for use in other modules
window.DataBindingSystem = DataBindingSystem;