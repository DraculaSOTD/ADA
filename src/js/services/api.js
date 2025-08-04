async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch data from ${url}:`, error);
        return null;
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
