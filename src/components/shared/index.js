// Shared Components Index
// Export all shared components for easy importing

export { TabNavigation } from './TabNavigation.js';
export { SearchBar } from './SearchBar.js';

// Initialize shared component styles
export function initializeSharedStyles() {
    // Check if styles are already loaded
    if (document.querySelector('link[href*="shared/index.css"]')) {
        return;
    }

    // Create link element for shared styles
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/src/components/shared/index.css';
    document.head.appendChild(link);
}

// Utility function to load component CSS dynamically
export function loadComponentCSS(componentName) {
    const cssPath = `/src/components/shared/${componentName}.css`;
    
    // Check if already loaded
    if (document.querySelector(`link[href="${cssPath}"]`)) {
        return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssPath;
    document.head.appendChild(link);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSharedStyles);
} else {
    initializeSharedStyles();
}