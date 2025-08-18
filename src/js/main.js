import { loadPage } from './services/router.js';

// Hash to page mapping
const hashToPage = {
    '#dashboard': 'DashboardPage',
    '#all-models': 'AllModelsPage',
    '#models': 'AllModelsPage',
    '#generate-predictions': 'GeneratePredictionsPage',
    '#data-generator': 'DataGeneratorPage',
    '#data-cleaning': 'DataCleaningPage',
    '#rules-engine': 'RulesEnginePage',
    '#rules-list': 'RulesListPage',
    '#rule-history': 'RuleHistoryPage',
    '#settings': 'SettingsPage',
    '#user-profile': 'UserProfilePage',
    '#contact-us': 'ContactUsPage',
    '#login': 'AuthPage',
    '#tokens': 'TokenPurchasePage',
    '#billing': 'TokenPurchasePage'
};

// Handle hash changes
function handleHashChange() {
    const hash = window.location.hash || '#dashboard';
    const baseHash = hash.split('?')[0]; // Remove query params
    const pageName = hashToPage[baseHash];
    
    if (pageName) {
        const token = localStorage.getItem('token');
        if (!token && pageName !== 'AuthPage') {
            // Redirect to login if not authenticated
            window.location.hash = '#login';
            loadPage('AuthPage');
        } else {
            loadPage(pageName);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial load: check if authenticated
    const token = localStorage.getItem('token');
    const currentPage = localStorage.getItem('currentPage');
    
    // Handle initial hash
    if (window.location.hash) {
        handleHashChange();
    } else if (token) {
        loadPage(currentPage || 'DashboardPage');
    } else {
        loadPage('AuthPage');
    }
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
});
