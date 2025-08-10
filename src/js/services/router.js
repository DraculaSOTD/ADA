import { loadComponent, loadComponentCSS } from './componentLoader.js';
import { setupAuthPage } from '../pages/auth.js';
import { setupDashboardPage } from '../pages/dashboard.js';
import { setupAllModelsPage } from '../pages/all-models.js';
import { setupCustomModelCreationPage } from '../pages/custom-model-creation.js';
import { setupGeneratePredictionsPage } from '../pages/generate-predictions.js';
import { setupDataGenerator } from '../pages/data-generator.js';
import { setupAdvancedRulesEngine } from '../pages/rules-engine-advanced.js';
import { setupRulesList } from '../pages/rules-list.js';
import { setupRuleHistory } from '../pages/rule-history.js';
import { setupSettingsPage } from '../pages/settings.js';
import { setupUserProfilePage } from '../pages/user-profile.js';
import { setupContactUsPage } from '../pages/contact-us.js';
import { updateActiveSidebarLink, setupHeaderDropdown, setupThemeSwitcher, setupChat } from './ui.js';

const routes = {
    'AuthPage': {
        component: 'AuthPage',
        css: 'src/components/AuthPage/AuthPage.css',
        setup: setupAuthPage
    },
    'DashboardPage': {
        component: 'DashboardPage',
        css: 'src/components/DashboardPage/DashboardPage.css',
        setup: setupDashboardPage
    },
    'AllModelsPage': {
        component: 'AllModelsPage',
        css: 'src/components/AllModelsPage/AllModelsPage.css',
        setup: setupAllModelsPage
    },
    'CustomModelCreationPage': {
        component: 'CustomModelCreationPage',
        css: 'src/components/CustomModelCreationPage/CustomModelCreationPage.css',
        setup: setupCustomModelCreationPage
    },
    'GeneratePredictionsPage': {
        component: 'GeneratePredictionsPage',
        css: 'src/components/GeneratePredictionsPage/GeneratePredictionsPage.css',
        setup: setupGeneratePredictionsPage
    },
    'DataGeneratorPage': {
        component: 'DataGeneratorPage',
        css: 'src/components/DataGeneratorPage/DataGeneratorPage.css',
        setup: setupDataGenerator
    },
    'DataCleaningPage': {
        component: 'DataCleaningPage',
        css: 'src/components/DataCleaningPage/DataCleaningPage.css',
        setup: () => {
            if (window.dataCleaningPage) {
                window.dataCleaningPage.initialize();
            }
        }
    },
    'RulesEnginePage': {
        component: 'RulesEnginePage',
        css: 'src/components/RulesEnginePage/RulesEnginePageAdvanced_enhanced.css',
        setup: setupAdvancedRulesEngine
    },
    'RulesListPage': {
        component: 'RulesListPage',
        css: 'src/components/RulesListPage/RulesListPage.css',
        setup: setupRulesList
    },
    'RuleHistoryPage': {
        component: 'RuleHistoryPage',
        css: 'src/components/RuleHistoryPage/RuleHistoryPage.css',
        setup: setupRuleHistory
    },
    'SettingsPage': {
        component: 'SettingsPage',
        css: 'src/components/SettingsPage/SettingsPage.css',
        setup: setupSettingsPage
    },
    'UserProfilePage': {
        component: 'UserProfilePage',
        css: 'src/components/UserProfilePage/UserProfilePage.css',
        setup: setupUserProfilePage
    },
    'ContactUsPage': {
        component: 'ContactUsPage',
        css: 'src/components/ContactUsPage/ContactUsPage.css',
        setup: setupContactUsPage
    }
};

async function setupMainLayout() {
    const appRoot = document.getElementById('app-root');
    appRoot.innerHTML = `
        <div class="dashboard-container">
            <aside class="sidebar-nav"></aside>
            <main class="main-content">
                <div class="page-content-area">
                    <!-- Page content will be loaded here -->
                </div>
            </main>
            <div id="chat-container"></div>
        </div>
    `;
    loadComponentCSS('src/styles/global.css');
    await loadComponent('Sidebar', '.sidebar-nav');
    loadComponentCSS('src/components/Sidebar/Sidebar.css');
    setupHeaderDropdown(loadPage);
    setupThemeSwitcher();
    await setupChat();

    // Handle sidebar navigation for authenticated pages
    document.querySelector('.sidebar-nav').addEventListener('click', async (event) => {
        const target = event.target.closest('.nav-link');
        if (target) {
            event.preventDefault(); // Prevent default anchor behavior
            const pageId = target.dataset.page;
            console.log(`Sidebar navigation to: ${pageId}`);
            // Use hash-based navigation instead of direct loadPage
            window.location.hash = `#${pageId}`;
        }
    });
}

async function loadPage(pageName) {
    console.log(`Loading page: ${pageName}`);
    localStorage.setItem('currentPage', pageName); // Store current page
    const appRoot = document.getElementById('app-root');

    // Remove existing page-specific CSS
    document.querySelectorAll('link[href*="components/"][rel="stylesheet"]').forEach(link => {
        if (!link.href.includes('global.css') && !link.href.includes('Sidebar.css') && !link.href.includes('Chat.css')) { // Keep global, sidebar, and chat css
            link.remove();
        }
    });

    const route = routes[pageName];
    if (!route) {
        console.error(`No route found for page: ${pageName}`);
        // Redirect to dashboard if route doesn't exist
        localStorage.setItem('currentPage', 'DashboardPage');
        window.location.hash = '#dashboard';
        return;
    }

    if (pageName === 'AuthPage') {
        appRoot.innerHTML = ''; // Clear current app root content
        await loadComponent(route.component, '#app-root');
        loadComponentCSS(route.css);
        route.setup();
    } else {
        // For authenticated pages, ensure the main layout is present
        if (!document.querySelector('.dashboard-container')) {
            await setupMainLayout();
        }

        updateActiveSidebarLink(pageName); // Update active link after sidebar is loaded

        // Load the specific page content into the .page-content-area'
        const pageContentArea = document.querySelector('.page-content-area');
        pageContentArea.innerHTML = ''; // Clear previous content
        await loadComponent(route.component, '.page-content-area');
        loadComponentCSS(route.css);
        route.setup();
    }
}

export { loadPage };
