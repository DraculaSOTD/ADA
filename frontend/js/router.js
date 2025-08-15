// Client-Side Router

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.previousRoute = null;
        this.routeChangeCallbacks = [];
        this.beforeRouteChangeCallbacks = [];
        this.guards = [];
    }

    // Add a route
    addRoute(route) {
        if (!route.path || !route.component) {
            throw new Error('Route must have path and component');
        }
        
        this.routes.set(route.path, {
            ...route,
            regex: this.pathToRegex(route.path),
            params: this.extractParamNames(route.path)
        });
    }

    // Convert path to regex for matching
    pathToRegex(path) {
        return new RegExp('^' + path
            .replace(/\//g, '\\/')
            .replace(/:\w+/g, '([^\\/]+)')
            .replace(/\*/g, '.*') + '$');
    }

    // Extract parameter names from path
    extractParamNames(path) {
        const matches = path.match(/:(\w+)/g);
        return matches ? matches.map(m => m.substring(1)) : [];
    }

    // Initialize router
    init() {
        // Handle initial route
        this.handleRoute(window.location.pathname);
        
        // Listen for popstate events
        window.addEventListener('popstate', (e) => this.handlePopState(e));
        
        // Intercept link clicks
        document.addEventListener('click', (e) => this.handleLinkClick(e));
    }

    // Handle browser back/forward
    handlePopState(event) {
        const path = window.location.pathname;
        this.handleRoute(path, false);
    }

    // Handle link clicks
    handleLinkClick(event) {
        // Check if it's a link with data-route attribute
        const link = event.target.closest('a[data-route]');
        if (!link) return;
        
        event.preventDefault();
        const path = link.getAttribute('data-route') || link.getAttribute('href');
        this.navigate(path);
    }

    // Navigate to a route
    async navigate(path, options = {}) {
        // Run before route change callbacks
        const canNavigate = await this.runBeforeRouteChange(path);
        if (!canNavigate) return false;
        
        // Update browser history
        if (options.replace) {
            window.history.replaceState({}, '', path);
        } else if (options.pushState !== false) {
            window.history.pushState({}, '', path);
        }
        
        // Handle the route
        return this.handleRoute(path);
    }

    // Handle route change
    async handleRoute(path, runGuards = true) {
        // Find matching route
        const routeInfo = this.findRoute(path);
        
        if (!routeInfo) {
            console.error(`No route found for path: ${path}`);
            this.handle404();
            return false;
        }
        
        // Run route guards if needed
        if (runGuards) {
            const canActivate = await this.runGuards(routeInfo);
            if (!canActivate) {
                console.log('Route blocked by guard');
                return false;
            }
        }
        
        // Update current route
        this.previousRoute = this.currentRoute;
        this.currentRoute = routeInfo;
        
        // Run route change callbacks
        this.runRouteChangeCallbacks(routeInfo);
        
        return true;
    }

    // Find route by path
    findRoute(path) {
        for (const [routePath, route] of this.routes) {
            const match = path.match(route.regex);
            if (match) {
                // Extract parameters
                const params = {};
                route.params.forEach((param, index) => {
                    params[param] = match[index + 1];
                });
                
                return {
                    ...route,
                    path,
                    params,
                    query: this.parseQueryString()
                };
            }
        }
        return null;
    }

    // Parse query string
    parseQueryString() {
        const query = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            query[key] = value;
        }
        return query;
    }

    // Run route guards
    async runGuards(route) {
        for (const guard of this.guards) {
            const canActivate = await guard(route, this.currentRoute);
            if (!canActivate) {
                return false;
            }
        }
        return true;
    }

    // Run before route change callbacks
    async runBeforeRouteChange(path) {
        for (const callback of this.beforeRouteChangeCallbacks) {
            const canContinue = await callback(path, this.currentRoute);
            if (canContinue === false) {
                return false;
            }
        }
        return true;
    }

    // Run route change callbacks
    runRouteChangeCallbacks(route) {
        this.routeChangeCallbacks.forEach(callback => {
            try {
                callback(route, this.previousRoute);
            } catch (error) {
                console.error('Error in route change callback:', error);
            }
        });
    }

    // Add route change listener
    onRouteChange(callback) {
        this.routeChangeCallbacks.push(callback);
    }

    // Add before route change listener
    beforeRouteChange(callback) {
        this.beforeRouteChangeCallbacks.push(callback);
    }

    // Add route guard
    addGuard(guard) {
        this.guards.push(guard);
    }

    // Remove route guard
    removeGuard(guard) {
        const index = this.guards.indexOf(guard);
        if (index > -1) {
            this.guards.splice(index, 1);
        }
    }

    // Get current route
    getCurrentRoute() {
        return this.currentRoute;
    }

    // Get previous route
    getPreviousRoute() {
        return this.previousRoute;
    }

    // Get all routes
    getRoutes() {
        return Array.from(this.routes.values());
    }

    // Check if route exists
    hasRoute(path) {
        return this.findRoute(path) !== null;
    }

    // Remove a route
    removeRoute(path) {
        return this.routes.delete(path);
    }

    // Clear all routes
    clearRoutes() {
        this.routes.clear();
    }

    // Navigate back
    back() {
        window.history.back();
    }

    // Navigate forward
    forward() {
        window.history.forward();
    }

    // Go to specific history entry
    go(n) {
        window.history.go(n);
    }

    // Handle 404
    handle404() {
        // Check if there's a 404 route defined
        const notFoundRoute = this.routes.get('/404');
        if (notFoundRoute) {
            this.currentRoute = notFoundRoute;
            this.runRouteChangeCallbacks(notFoundRoute);
        } else {
            // Default 404 handling
            const container = document.getElementById('page-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-page">
                        <h1>404</h1>
                        <p>Page not found</p>
                        <a href="/" data-route="/">Go to Dashboard</a>
                    </div>
                `;
            }
        }
    }

    // Build URL with parameters
    buildUrl(path, params = {}, query = {}) {
        // Replace path parameters
        let url = path;
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`:${key}`, value);
        }
        
        // Add query parameters
        const queryString = new URLSearchParams(query).toString();
        if (queryString) {
            url += '?' + queryString;
        }
        
        return url;
    }

    // Get route by name
    getRouteByName(name) {
        for (const route of this.routes.values()) {
            if (route.name === name) {
                return route;
            }
        }
        return null;
    }

    // Navigate by route name
    navigateByName(name, params = {}, query = {}) {
        const route = this.getRouteByName(name);
        if (route) {
            const url = this.buildUrl(route.path, params, query);
            return this.navigate(url);
        }
        console.error(`Route with name '${name}' not found`);
        return false;
    }

    // Reload current route
    reload() {
        if (this.currentRoute) {
            this.handleRoute(this.currentRoute.path, false);
        }
    }

    // Check if current route matches path
    isActive(path) {
        return this.currentRoute && this.currentRoute.path === path;
    }

    // Get route parameter
    getParam(name) {
        return this.currentRoute?.params?.[name];
    }

    // Get query parameter
    getQueryParam(name) {
        return this.currentRoute?.query?.[name];
    }

    // Update query parameters without navigation
    updateQueryParams(params, replace = false) {
        const url = new URL(window.location);
        
        for (const [key, value] of Object.entries(params)) {
            if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        }
        
        if (replace) {
            window.history.replaceState({}, '', url);
        } else {
            window.history.pushState({}, '', url);
        }
        
        // Update current route query
        if (this.currentRoute) {
            this.currentRoute.query = this.parseQueryString();
        }
    }
}

// Export for use in other modules
window.Router = Router;