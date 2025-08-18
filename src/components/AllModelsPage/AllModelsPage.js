import { TabNavigation } from '../shared/TabNavigation.js';

export class AllModelsPage {
    constructor() {
        this.tabNavigation = null;
        this.init();
    }

    init() {
        this.initializeTabNavigation();
        this.loadInitialContent();
    }

    initializeTabNavigation() {
        const container = document.getElementById('allModelsTabContainer');
        if (!container) return;

        this.tabNavigation = new TabNavigation(container, {
            activeTab: 0,
            onTabChange: (tabId, index) => this.handleTabChange(tabId, index)
        });

        // Set up tabs
        this.tabNavigation.setTabs([
            { id: 'all-models', label: 'All Models', icon: 'fas fa-list' },
            { id: 'community', label: 'Community Models', icon: 'fas fa-users' },
            { id: 'pretrained', label: 'Pretrained Models', icon: 'fas fa-check-circle' }
        ]);
    }

    handleTabChange(tabId, index) {
        // Hide all panels
        const panels = document.querySelectorAll('.tab-panel');
        panels.forEach(panel => panel.classList.remove('active'));

        // Show selected panel
        const selectedPanel = document.querySelector(`[data-panel="${tabId}"]`);
        if (selectedPanel) {
            selectedPanel.classList.add('active');
            this.loadTabContent(tabId);
        }
    }

    loadInitialContent() {
        this.loadTabContent('all-models');
    }

    async loadTabContent(tabId) {
        const panel = document.querySelector(`[data-panel="${tabId}"]`);
        if (!panel) return;

        // Check if content is already loaded
        if (panel.dataset.loaded === 'true') return;

        try {
            let contentFile;
            switch(tabId) {
                case 'all-models':
                    contentFile = 'AllModelsOverviewTabContent.html';
                    break;
                case 'community':
                    contentFile = 'CommunityModelsTabContent.html';
                    break;
                case 'pretrained':
                    contentFile = 'PretrainedModelsTabContent.html';
                    break;
                default:
                    return;
            }

            // Load content (this would typically be an AJAX call)
            const response = await fetch(`/src/components/AllModelsPage/${contentFile}`);
            if (response.ok) {
                const content = await response.text();
                panel.innerHTML = content;
                panel.dataset.loaded = 'true';
                this.initializeTabFeatures(tabId);
            }
        } catch (error) {
            console.error('Error loading tab content:', error);
            panel.innerHTML = '<div class="empty-state">Error loading content. Please try again.</div>';
        }
    }

    async initializeTabFeatures(tabId) {
        // Initialize features specific to each tab by calling the data loading functions
        switch(tabId) {
            case 'all-models':
                await this.loadAllModelsData();
                break;
            case 'community':
                await this.loadCommunityModelsData();
                break;
            case 'pretrained':
                await this.loadPretrainedModelsData();
                break;
        }
    }

    async loadAllModelsData() {
        // Call the loadAllModels function from all-models.js if it exists
        if (typeof loadAllModels === 'function') {
            await loadAllModels();
        } else {
            console.log('loadAllModels function not found, loading mock data');
            // Fallback: render mock data
            const panel = document.querySelector('[data-panel="all-models"]');
            if (panel) {
                const container = panel.querySelector('.card');
                if (container && typeof renderModelTable === 'function') {
                    const mockData = [...this.getMockModels()];
                    renderModelTable(mockData, '.tab-panel[data-panel="all-models"] .card', 'all');
                }
            }
        }
    }

    async loadCommunityModelsData() {
        // Call the loadCommunityModels function from all-models.js if it exists
        if (typeof loadCommunityModels === 'function') {
            await loadCommunityModels();
        } else {
            console.log('loadCommunityModels function not found');
        }
    }

    async loadPretrainedModelsData() {
        // Call the loadPretrainedModels function from all-models.js if it exists
        if (typeof loadPretrainedModels === 'function') {
            await loadPretrainedModels();
        } else {
            console.log('loadPretrainedModels function not found');
        }
    }

    getMockModels() {
        // Return some mock models for testing
        return [
            {
                id: 1,
                name: 'Sentiment Analysis',
                description: 'Analyzes text sentiment',
                type: 'Classification',
                status: 'active',
                user_id: 1,
                created_at: new Date().toISOString(),
                performance: { accuracy: 0.92 }
            },
            {
                id: 2,
                name: 'Sales Forecaster',
                description: 'Forecasts sales trends',
                type: 'Regression',
                status: 'active',
                user_id: 1,
                created_at: new Date().toISOString(),
                performance: { accuracy: 0.88 }
            }
        ];
    }
}

// Export for use in router
window.AllModelsPage = AllModelsPage;

// Initialize when DOM is ready (fallback for direct script load)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.allModelsPage) {
            window.allModelsPage = new AllModelsPage();
        }
    });
} else if (!window.allModelsPage) {
    // DOM already loaded, initialize if not already done
    window.allModelsPage = new AllModelsPage();
}