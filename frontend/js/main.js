// ADA Platform - Main Application Entry Point

class Application {
    constructor() {
        this.components = new Map();
        this.router = null;
        this.wsManager = null;
        this.apiService = null;
        this.dataBinding = null;
        this.currentUser = null;
        this.config = window.ADAConfig || {};
    }

    async initialize() {
        try {
            console.log('Initializing ADA Platform...');
            
            // Show loading overlay
            this.showLoading(true);
            
            // Initialize core services
            await this.initializeServices();
            
            // Load all components
            await this.loadComponents();
            
            // Setup router and navigation
            await this.setupRouter();
            
            // Initialize WebSocket connection
            await this.initializeWebSocket();
            
            // Check authentication
            await this.checkAuthentication();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Hide loading overlay
            this.showLoading(false);
            
            // Navigate to initial route
            this.router.navigate(window.location.pathname || '/dashboard');
            
            console.log('ADA Platform initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    async initializeServices() {
        // Initialize API service
        this.apiService = new APIService(this.config.apiBaseUrl || '/api');
        window.apiService = this.apiService;
        
        // Initialize data binding system
        this.dataBinding = new DataBindingSystem();
        window.dataBinding = this.dataBinding;
        
        // Initialize component loader
        this.componentLoader = new ComponentLoader();
        window.componentLoader = this.componentLoader;
    }

    async loadComponents() {
        console.log('Loading components...');
        
        // Register all components with the loader
        const componentManifest = {
            // Core components
            'Button': ButtonComponent,
            'Input': InputComponent,
            'Modal': ModalComponent,
            'DataTable': DataTableComponent,
            'Card': CardComponent,
            'ProgressBar': ProgressBarComponent,
            
            // Dynamic components
            'DynamicUIManager': DynamicUIManager,
            'FormBuilder': FormBuilder,
            
            // Page components
            'Dashboard': DashboardPage,
            'ModelCreation': ModelCreationPage,
            'DataGeneration': DataGenerationPage,
            'RulesEngine': RulesEnginePage,
            'AdminDashboard': AdminDashboardPage
        };
        
        // Load all components
        for (const [name, componentClass] of Object.entries(componentManifest)) {
            this.componentLoader.register(name, componentClass);
        }
        
        await this.componentLoader.loadAllComponents();
        console.log('Components loaded successfully');
    }

    async setupRouter() {
        console.log('Setting up router...');
        
        // Initialize router
        this.router = new Router();
        
        // Define routes
        const routes = [
            { path: '/', component: 'Dashboard', title: 'Dashboard' },
            { path: '/dashboard', component: 'Dashboard', title: 'Dashboard' },
            { path: '/models', component: 'ModelCreation', title: 'Models' },
            { path: '/models/create', component: 'ModelCreation', title: 'Create Model' },
            { path: '/data/generate', component: 'DataGeneration', title: 'Generate Data' },
            { path: '/rules', component: 'RulesEngine', title: 'Rules Engine' },
            { path: '/admin', component: 'AdminDashboard', title: 'Admin', protected: true, adminOnly: true }
        ];
        
        // Register routes
        routes.forEach(route => {
            this.router.addRoute(route);
        });
        
        // Set up route change handler
        this.router.onRouteChange((route) => {
            this.handleRouteChange(route);
        });
        
        // Initialize router
        this.router.init();
        
        console.log('Router setup complete');
    }

    async initializeWebSocket() {
        console.log('Initializing WebSocket connection...');
        
        try {
            const wsUrl = this.config.wsUrl || `ws://${window.location.host}/ws`;
            this.wsManager = new WebSocketManager(wsUrl);
            
            // Set up WebSocket event handlers
            this.wsManager.on('connect', () => {
                console.log('WebSocket connected');
                this.showNotification('Connected to server', 'success');
            });
            
            this.wsManager.on('disconnect', () => {
                console.log('WebSocket disconnected');
                this.showNotification('Disconnected from server', 'warning');
            });
            
            this.wsManager.on('message', (data) => {
                this.handleWebSocketMessage(data);
            });
            
            // Connect to WebSocket
            await this.wsManager.connect();
            
            window.wsManager = this.wsManager;
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            // Continue without WebSocket - app should still work
        }
    }

    async checkAuthentication() {
        try {
            const response = await this.apiService.get('/auth/verify');
            if (response.success) {
                this.currentUser = response.data.user;
                this.updateUserInterface();
            }
        } catch (error) {
            console.log('User not authenticated');
            // User is not authenticated, which is fine for public pages
        }
    }

    setupEventListeners() {
        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[data-route]')) {
                e.preventDefault();
                const route = e.target.getAttribute('data-route');
                this.router.navigate(route);
            }
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            this.router.handlePopState(e);
        });
        
        // Handle window resize
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    handleRouteChange(route) {
        console.log('Route changed:', route);
        
        // Check if route requires authentication
        if (route.protected && !this.currentUser) {
            this.router.navigate('/login');
            return;
        }
        
        // Check if route requires admin
        if (route.adminOnly && (!this.currentUser || !this.currentUser.isAdmin)) {
            this.showNotification('Admin access required', 'error');
            this.router.navigate('/dashboard');
            return;
        }
        
        // Update page title
        document.title = `${route.title} - ADA Platform`;
        
        // Load the component for this route
        this.loadPageComponent(route.component);
        
        // Update navigation active state
        this.updateNavigationState(route.path);
    }

    async loadPageComponent(componentName) {
        const container = document.getElementById('page-container');
        
        // Clear current content
        container.innerHTML = '';
        
        // Show loading
        this.showLoading(true);
        
        try {
            // Get component from loader
            const ComponentClass = this.componentLoader.getComponent(componentName);
            
            if (!ComponentClass) {
                throw new Error(`Component ${componentName} not found`);
            }
            
            // Create and render component
            const component = new ComponentClass(container, {
                user: this.currentUser,
                apiService: this.apiService,
                wsManager: this.wsManager,
                router: this.router
            });
            
            await component.render();
            
            // Store current component
            this.currentPageComponent = component;
            
        } catch (error) {
            console.error('Failed to load page component:', error);
            this.showError(`Failed to load page: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    handleWebSocketMessage(data) {
        console.log('WebSocket message received:', data);
        
        // Handle different message types
        switch (data.type) {
            case 'model_update':
                this.handleModelUpdate(data.payload);
                break;
            case 'job_status':
                this.handleJobStatus(data.payload);
                break;
            case 'notification':
                this.showNotification(data.payload.message, data.payload.type);
                break;
            case 'data_update':
                // Trigger data binding updates
                this.dataBinding.updateData(data.payload.componentId, data.payload.data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    handleModelUpdate(data) {
        // Update model status in UI
        if (this.currentPageComponent && this.currentPageComponent.handleModelUpdate) {
            this.currentPageComponent.handleModelUpdate(data);
        }
        
        // Show notification
        this.showNotification(`Model ${data.modelName} status: ${data.status}`, 'info');
    }

    handleJobStatus(data) {
        // Update job status in UI
        if (this.currentPageComponent && this.currentPageComponent.handleJobStatus) {
            this.currentPageComponent.handleJobStatus(data);
        }
    }

    updateUserInterface() {
        const userContainer = document.getElementById('nav-user');
        if (!userContainer) return;
        
        if (this.currentUser) {
            userContainer.innerHTML = `
                <div class="user-menu">
                    <span class="user-name">${this.currentUser.name}</span>
                    <span class="user-tokens">Tokens: ${this.currentUser.tokenBalance || 0}</span>
                    <button class="btn-logout" onclick="app.logout()">Logout</button>
                </div>
            `;
        } else {
            userContainer.innerHTML = `
                <div class="user-menu">
                    <a href="/login" data-route="/login" class="btn-login">Login</a>
                </div>
            `;
        }
    }

    updateNavigationState(currentPath) {
        // Update active navigation item
        document.querySelectorAll('.nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (route === currentPath) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    handleResize() {
        // Handle responsive layout changes
        const width = window.innerWidth;
        const sidebar = document.getElementById('sidebar');
        
        if (width < 768 && sidebar) {
            sidebar.style.display = 'none';
        }
        
        // Notify current component of resize
        if (this.currentPageComponent && this.currentPageComponent.handleResize) {
            this.currentPageComponent.handleResize();
        }
    }

    handleKeyboardShortcuts(e) {
        // Global keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'k':
                    e.preventDefault();
                    this.openCommandPalette();
                    break;
                case '/':
                    e.preventDefault();
                    this.focusSearch();
                    break;
            }
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.innerHTML = `
            <span class="notification__message">${message}</span>
            <button class="notification__close" onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    async logout() {
        try {
            await this.apiService.post('/auth/logout');
            this.currentUser = null;
            this.updateUserInterface();
            this.router.navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
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

    openCommandPalette() {
        // TODO: Implement command palette
        console.log('Command palette not yet implemented');
    }

    focusSearch() {
        // TODO: Implement search focus
        console.log('Search not yet implemented');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Create global app instance
    window.app = new Application();
    
    // Initialize the application
    await window.app.initialize();
});