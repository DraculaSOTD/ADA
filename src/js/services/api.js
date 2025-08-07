async function fetchData(url, options = {}) {
    try {
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
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.hash = '#login';
                throw new Error('Authentication failed. Please login again.');
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
        
        // Return error details instead of null for better error handling
        return {
            error: true,
            message: error.message || 'Network error occurred',
            status: error.status
        };
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
