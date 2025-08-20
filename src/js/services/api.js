async function fetchData(url, options = {}) {
    try {
        console.log(`API Request: ${options.method || 'GET'} ${url}`);
        if (options.body) {
            console.log('Request body:', options.body);
        }
        
        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");
        
        if (!response.ok) {
            // Try to get error details from response
            let errorData = null;
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            if (isJson) {
                try {
                    errorData = await response.json();
                    errorMessage = errorData?.detail || errorData?.message || errorMessage;
                } catch (e) {
                    // Response wasn't valid JSON
                }
            }
            
            console.error(`API Error (${response.status}):`, errorMessage);
            
            // Handle specific error cases
            if (response.status === 401) {
                // For login endpoint, don't redirect - just return the error
                if (url.includes('/api/login')) {
                    throw new Error(errorMessage);
                }
                
                // Check if we just logged in (within last 5 seconds)
                const loginTime = localStorage.getItem('loginTime');
                const currentTime = Date.now();
                const timeSinceLogin = loginTime ? currentTime - parseInt(loginTime) : Infinity;
                
                if (timeSinceLogin < 5000) {
                    // Just logged in, might be a timing issue - don't clear token yet
                    console.warn('401 error shortly after login, might be a timing issue');
                    throw new Error('Authentication error - please try again');
                } else {
                    // Clear token and redirect to login
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('loginTime');
                    window.location.hash = '#login';
                    throw new Error('Authentication failed. Please login again.');
                }
            }
            
            // Handle 500 errors that might be auth-related (fallback)
            if (response.status === 500 && !url.includes('/api/login')) {
                // Check if error message indicates auth issue
                if (errorMessage && (errorMessage.includes('401') || errorMessage.includes('credentials'))) {
                    console.warn('500 error appears to be auth-related, redirecting to login');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('loginTime');
                    window.location.hash = '#login';
                    throw new Error('Session expired. Please login again.');
                }
            }
            
            throw new Error(errorMessage);
        }
        
        // Response is ok, parse the body
        if (isJson) {
            return await response.json();
        } else {
            // Return text for non-JSON responses
            return await response.text();
        }
    } catch (error) {
        console.error(`Failed to fetch data from ${url}:`, error);
        
        // Re-throw the error to let callers handle it
        throw error;
    }
}

async function fetchAuthenticatedData(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found, redirecting to login.');
        // This should be handled by the router
        return null;
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    return fetchData(url, { ...options, headers });
}

export { fetchData, fetchAuthenticatedData };
