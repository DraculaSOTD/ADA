// API Service - HTTP request handler

class APIService {
    constructor(baseURL) {
        this.baseURL = baseURL || window.getConfig('apiBaseUrl', '/api');
        this.token = this.getStoredToken();
        this.refreshToken = this.getStoredRefreshToken();
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute default cache
        this.pendingRequests = new Map();
        
        // Bind methods
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.put = this.put.bind(this);
        this.delete = this.delete.bind(this);
        this.request = this.request.bind(this);
    }

    // GET request
    async get(endpoint, params = {}, options = {}) {
        const url = this.buildURL(endpoint, params);
        return this.request(url, {
            method: 'GET',
            ...options
        });
    }

    // POST request
    async post(endpoint, data = {}, options = {}) {
        const url = this.buildURL(endpoint);
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    }

    // PUT request
    async put(endpoint, data = {}, options = {}) {
        const url = this.buildURL(endpoint);
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options
        });
    }

    // PATCH request
    async patch(endpoint, data = {}, options = {}) {
        const url = this.buildURL(endpoint);
        return this.request(url, {
            method: 'PATCH',
            body: JSON.stringify(data),
            ...options
        });
    }

    // DELETE request
    async delete(endpoint, options = {}) {
        const url = this.buildURL(endpoint);
        return this.request(url, {
            method: 'DELETE',
            ...options
        });
    }

    // Main request method
    async request(url, options = {}) {
        // Check cache for GET requests
        if (options.method === 'GET' && options.cache !== false) {
            const cached = this.getFromCache(url);
            if (cached) {
                console.log('Returning cached response for:', url);
                return cached;
            }
        }

        // Check for duplicate in-flight requests
        const requestKey = `${options.method || 'GET'}_${url}`;
        if (this.pendingRequests.has(requestKey)) {
            console.log('Returning pending request for:', url);
            return this.pendingRequests.get(requestKey);
        }

        // Default headers
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers
        };

        // Build request options
        const requestOptions = {
            ...options,
            headers,
            credentials: 'include'
        };

        // Apply request interceptors
        const interceptedOptions = await this.applyRequestInterceptors(url, requestOptions);

        // Create promise for the request
        const requestPromise = this.performRequest(url, interceptedOptions, options);
        
        // Store as pending request
        this.pendingRequests.set(requestKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Remove from pending requests
            this.pendingRequests.delete(requestKey);
        }
    }

    // Perform the actual request
    async performRequest(url, requestOptions, originalOptions) {
        try {
            // Show loading indicator
            if (originalOptions.showLoading !== false) {
                this.showLoading(true);
            }

            // Make the request
            const response = await fetch(url, requestOptions);

            // Handle response
            const result = await this.handleResponse(response, url, originalOptions);

            // Apply response interceptors
            const interceptedResult = await this.applyResponseInterceptors(result, response);

            // Cache successful GET requests
            if (requestOptions.method === 'GET' && response.ok && originalOptions.cache !== false) {
                this.addToCache(url, interceptedResult);
            }

            return interceptedResult;

        } catch (error) {
            // Handle network errors
            console.error('Request failed:', error);
            
            if (originalOptions.retry !== false && !originalOptions._retryCount) {
                // Retry once on network failure
                console.log('Retrying request:', url);
                return this.request(url, { ...originalOptions, _retryCount: 1 });
            }
            
            throw this.handleError(error);
        } finally {
            // Hide loading indicator
            if (originalOptions.showLoading !== false) {
                this.showLoading(false);
            }
        }
    }

    // Handle response
    async handleResponse(response, url, options) {
        // Check if response is ok
        if (!response.ok) {
            // Handle 401 Unauthorized
            if (response.status === 401 && options.autoRefresh !== false) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry the original request
                    return this.request(url, { ...options, autoRefresh: false });
                }
            }
            
            // Parse error response
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: response.statusText };
            }
            
            const error = new Error(errorData.message || `Request failed with status ${response.status}`);
            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        // Parse response based on content type
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else if (contentType && contentType.includes('text')) {
            return await response.text();
        } else if (contentType && contentType.includes('blob')) {
            return await response.blob();
        } else {
            // Default to JSON
            try {
                return await response.json();
            } catch {
                return await response.text();
            }
        }
    }

    // Handle errors
    handleError(error) {
        const errorMessage = window.getConfig(`errors.${error.status}`) || 
                           error.message || 
                           window.getConfig('errors.network');
        
        // Show error notification
        if (window.app && window.app.showError) {
            window.app.showError(errorMessage);
        }
        
        return error;
    }

    // Build full URL
    buildURL(endpoint, params = {}) {
        // Check if endpoint is already a full URL
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            return endpoint;
        }
        
        // Build base URL
        let url = endpoint.startsWith('/') ? 
            this.baseURL + endpoint : 
            this.baseURL + '/' + endpoint;
        
        // Add query parameters
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += '?' + queryString;
        }
        
        return url;
    }

    // Get auth headers
    getAuthHeaders() {
        const headers = {};
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Set authentication token
    setToken(token, refreshToken = null) {
        this.token = token;
        this.refreshToken = refreshToken;
        
        // Store in localStorage
        if (token) {
            localStorage.setItem(window.getConfig('auth.tokenKey'), token);
        } else {
            localStorage.removeItem(window.getConfig('auth.tokenKey'));
        }
        
        if (refreshToken) {
            localStorage.setItem(window.getConfig('auth.refreshTokenKey'), refreshToken);
        } else {
            localStorage.removeItem(window.getConfig('auth.refreshTokenKey'));
        }
    }

    // Get stored token
    getStoredToken() {
        return localStorage.getItem(window.getConfig('auth.tokenKey'));
    }

    // Get stored refresh token
    getStoredRefreshToken() {
        return localStorage.getItem(window.getConfig('auth.refreshTokenKey'));
    }

    // Clear authentication
    clearAuth() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem(window.getConfig('auth.tokenKey'));
        localStorage.removeItem(window.getConfig('auth.refreshTokenKey'));
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken) {
            return false;
        }
        
        try {
            const response = await this.post('/auth/refresh', {
                refreshToken: this.refreshToken
            }, {
                autoRefresh: false
            });
            
            if (response.success && response.data.token) {
                this.setToken(response.data.token, response.data.refreshToken);
                return true;
            }
        } catch (error) {
            console.error('Failed to refresh token:', error);
            this.clearAuth();
        }
        
        return false;
    }

    // Add request interceptor
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    // Add response interceptor
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    // Apply request interceptors
    async applyRequestInterceptors(url, options) {
        let interceptedOptions = options;
        
        for (const interceptor of this.requestInterceptors) {
            interceptedOptions = await interceptor(url, interceptedOptions);
        }
        
        return interceptedOptions;
    }

    // Apply response interceptors
    async applyResponseInterceptors(data, response) {
        let interceptedData = data;
        
        for (const interceptor of this.responseInterceptors) {
            interceptedData = await interceptor(interceptedData, response);
        }
        
        return interceptedData;
    }

    // Cache management
    addToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        // Clean up old cache entries
        this.cleanCache();
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        
        if (!cached) {
            return null;
        }
        
        // Check if cache is still valid
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    clearCache() {
        this.cache.clear();
    }

    cleanCache() {
        const now = Date.now();
        
        for (const [key, value] of this.cache) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    // Show/hide loading indicator
    showLoading(show) {
        // This could be connected to a global loading indicator
        if (window.app && window.app.showLoading) {
            window.app.showLoading(show);
        }
    }

    // Upload file
    async uploadFile(endpoint, file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }
            
            // Handle completion
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            });
            
            // Handle errors
            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });
            
            // Open and send request
            xhr.open('POST', this.buildURL(endpoint));
            
            // Add auth headers
            const authHeaders = this.getAuthHeaders();
            for (const [key, value] of Object.entries(authHeaders)) {
                xhr.setRequestHeader(key, value);
            }
            
            xhr.send(formData);
        });
    }

    // Download file
    async downloadFile(endpoint, filename = 'download') {
        const response = await this.get(endpoint, {}, {
            responseType: 'blob',
            cache: false
        });
        
        // Create download link
        const url = window.URL.createObjectURL(response);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // Get statistics
    getStats() {
        return {
            cacheSize: this.cache.size,
            pendingRequests: this.pendingRequests.size,
            hasToken: !!this.token,
            hasRefreshToken: !!this.refreshToken
        };
    }
}

// Export for use in other modules
window.APIService = APIService;