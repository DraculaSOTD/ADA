import { loadPage } from './services/router.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initial load: check if authenticated
    const token = localStorage.getItem('token');
    const currentPage = localStorage.getItem('currentPage');
    if (token) {
        loadPage(currentPage || 'DashboardPage');
    } else {
        loadPage('AuthPage');
    }
});
