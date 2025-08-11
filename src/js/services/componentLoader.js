async function loadComponent(componentName, targetSelector) {
    try {
        const htmlPath = componentName.includes('/') ? `/src/components/${componentName}.html` : `/src/components/${componentName}/${componentName}.html`;
        const response = await fetch(htmlPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        document.querySelector(targetSelector).innerHTML = html;
    } catch (error) {
        console.error(`Failed to load ${componentName} component:`, error);
    }
}

function loadComponentCSS(cssPath) {
    // Handle different path formats
    let fullPath = cssPath;
    
    // If path doesn't start with / or src/, assume it's a component path
    if (!cssPath.startsWith('/') && !cssPath.startsWith('src/')) {
        // Convert component path like "AllModelsPage/AllModelsTable" to full CSS path
        fullPath = `/src/components/${cssPath}.css`;
    } else if (!cssPath.startsWith('/')) {
        // If it starts with src/, prepend /
        fullPath = `/${cssPath}`;
    }
    
    if (!document.querySelector(`link[href="${fullPath}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fullPath;
        document.head.appendChild(link);
    }
}

export { loadComponent, loadComponentCSS };
