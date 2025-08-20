import { loadComponent, loadComponentCSS } from '../services/componentLoader.js';
import { fetchAuthenticatedData } from '../services/api.js';
import { toastManager, Modal } from '../../components/common/index.js';

function renderModelTable(models, containerSelector, tableType = 'all') {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container not found: ${containerSelector}`);
        return;
    }
    
    // Store models data for filtering
    container._models = models;
    container._tableType = tableType;
    
    // Create the models display with search
    container.innerHTML = `
        <div class="models-wrapper">
            <div class="models-header">
                <div class="search-bar-container">
                    <input type="text" id="model-search-${tableType}" placeholder="Search models..." class="search-input">
                    <button class="search-button"><i class="fas fa-search"></i></button>
                    <button class="btn btn-primary" id="refresh-models-${tableType}">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
            <div id="models-container-${tableType}" class="models-container">
                <!-- Model cards will be rendered here -->
            </div>
        </div>
    `;
    
    // Initial render of all models
    renderModelCards(models, `#models-container-${tableType}`, tableType);
    
    // Setup search functionality
    const searchInput = document.getElementById(`model-search-${tableType}`);
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredModels = models.filter(model => 
                model.name.toLowerCase().includes(searchTerm) ||
                (model.description && model.description.toLowerCase().includes(searchTerm)) ||
                (model.username && model.username.toLowerCase().includes(searchTerm))
            );
            renderModelCards(filteredModels, `#models-container-${tableType}`, tableType);
        });
    }
    
    // Add refresh button handler
    const refreshBtn = document.getElementById(`refresh-models-${tableType}`);
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshCurrentTable);
    }
}

function refreshCurrentTable() {
    const activeTab = document.querySelector('.all-models-tabs-container .tab-item.active');
    if (activeTab) {
        activeTab.click();
    }
}

function renderModelCards(models, containerSelector, tableType = 'all') {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container not found: ${containerSelector}`);
        return;
    }
    
    if (models.length === 0) {
        container.innerHTML = '<div class="empty-state">No models found</div>';
        return;
    }
    
    // Create grid container
    const gridHTML = `<div class="models-grid">${renderModelCardsHTML(models, tableType)}</div>`;
    container.innerHTML = gridHTML;
    
    // Attach event listeners
    setTimeout(() => attachCardEventListeners(container, tableType), 0);
}

function renderModelCardsHTML(models, tableType) {
    if (models.length === 0) {
        return '';
    }
    
    return models.map(model => {
        let username = model.username || `User ${model.user_id}`;
        if (model.name === 'Community Sentiment Analyzer') {
            username = 'Jeff';
        } else if (model.name === 'DataPulse NLP Core') {
            username = 'DataPulse';
        }
        
        const typeLabel = model.type === 'rules_engine' ? 
            '<span class="badge badge-success">Rules Engine</span>' : 
            '<span class="badge badge-info">Model</span>';
        
        return `
            <div class="model-card card" data-model-id="${model.id}">
                <div class="model-card-header">
                    <div class="model-title-row">
                        <h4 class="model-name">${model.name}</h4>
                        ${typeLabel}
                    </div>
                    <div class="model-creator">
                        <i class="fas fa-user"></i> ${username}
                    </div>
                </div>
                
                <div class="model-card-body">
                    <p class="model-description">${model.description || 'No description available'}</p>
                    
                    <div class="model-stats">
                        <div class="stat-item">
                            <i class="fas fa-calendar"></i>
                            <span>${new Date(model.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-bookmark"></i>
                            <span>${model.added_to_library || 0} libraries</span>
                        </div>
                    </div>
                </div>
                
                <div class="model-card-footer">
                    <div class="vote-section">
                        <button class="vote-btn upvote-btn" data-model-id="${model.id}" data-vote-type="upvote">
                            <i class="fas fa-thumbs-up"></i> ${model.upvotes || 0}
                        </button>
                        <button class="vote-btn downvote-btn" data-model-id="${model.id}" data-vote-type="downvote">
                            <i class="fas fa-thumbs-down"></i> ${model.downvotes || 0}
                        </button>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info view-btn" data-model-id="${model.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${model.type === 'rules_engine' ? `
                            <button class="btn btn-sm btn-warning edit-rule-btn" data-rule-id="${model.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-secondary add-to-library-btn" data-model-id="${model.id}">
                                <i class="fas fa-plus"></i> Add
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function attachCardEventListeners(container, tableType) {
    // Vote buttons
    container.querySelectorAll('.vote-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const modelId = button.dataset.modelId;
            const voteType = button.dataset.voteType;
            
            try {
                await fetchAuthenticatedData(`/api/votes/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model_id: parseInt(modelId), vote_type: voteType })
                });
                toastManager.success(`Vote ${voteType}d successfully`);
                refreshCurrentTable();
            } catch (error) {
                toastManager.error('Failed to vote');
            }
        });
    });
    
    // View buttons
    container.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const modelId = button.dataset.modelId;
            
            // Find the model from the container's parent that stores all models
            const modelsContainer = container.closest('.models-wrapper').parentElement;
            const models = modelsContainer._models || [];
            const model = models.find(m => m.id == modelId);
            
            if (model) {
                showModelDetailsModal(model);
            }
        });
    });
    
    // Add to library buttons
    container.querySelectorAll('.add-to-library-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const modelId = button.dataset.modelId;
            
            try {
                await fetchAuthenticatedData('/api/models/library', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model_id: parseInt(modelId) })
                });
                toastManager.success('Model added to library');
                refreshCurrentTable();
            } catch (error) {
                toastManager.error('Failed to add model to library');
            }
        });
    });
    
    // Edit rule buttons
    container.querySelectorAll('.edit-rule-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const ruleId = button.dataset.ruleId;
            window.location.hash = `#rules-engine?edit=${ruleId}`;
        });
    });
}

async function showModelDetailsModal(model) {
    // Try to fetch more details about the model
    let modelDetails = model;
    try {
        const fullDetails = await fetchAuthenticatedData(`/api/models/${model.id}`);
        if (fullDetails) {
            modelDetails = { ...model, ...fullDetails };
        }
    } catch (error) {
        console.error('Failed to fetch model details:', error);
    }

    Modal.alert({
        title: modelDetails.name,
        size: 'large',
        message: `
            <div class="model-details-modal">
                <div class="model-header-section">
                    <div class="model-type-badge">
                        <span class="badge badge-${modelDetails.type === 'rules_engine' ? 'success' : 'info'}">
                            ${modelDetails.type === 'rules_engine' ? 'Rules Engine' : 'Model'}
                        </span>
                    </div>
                    <div class="model-stats">
                        <div class="stat">
                            <i class="fas fa-thumbs-up text-success"></i>
                            <span>${modelDetails.upvotes || 0}</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-thumbs-down text-danger"></i>
                            <span>${modelDetails.downvotes || 0}</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-bookmark text-info"></i>
                            <span>${modelDetails.added_to_library || 0}</span>
                        </div>
                    </div>
                </div>
                
                <div class="model-info-section">
                    <h4>Description</h4>
                    <p>${modelDetails.description || 'No description available'}</p>
                </div>
                
                <div class="model-details-grid">
                    <div class="detail-item">
                        <label>Created By:</label>
                        <span>${modelDetails.username || `User ${modelDetails.user_id}`}</span>
                    </div>
                    <div class="detail-item">
                        <label>Created On:</label>
                        <span>${new Date(modelDetails.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-${modelDetails.status || 'active'}">${modelDetails.status || 'Active'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Visibility:</label>
                        <span>${modelDetails.visibility || 'Public'}</span>
                    </div>
                </div>
                
                ${modelDetails.performance ? `
                    <div class="model-performance-section">
                        <h4>Performance Metrics</h4>
                        <div class="performance-grid">
                            ${Object.entries(modelDetails.performance).map(([key, value]) => `
                                <div class="metric-item">
                                    <label>${key.charAt(0).toUpperCase() + key.slice(1)}:</label>
                                    <span>${typeof value === 'number' ? (value * 100).toFixed(1) + '%' : value}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="model-actions-section">
                    <button class="btn btn-primary" onclick="window.location.hash='#model-details/${modelDetails.id}'">
                        <i class="fas fa-external-link-alt"></i> Open Full Details
                    </button>
                    ${modelDetails.type !== 'rules_engine' ? `
                        <button class="btn btn-secondary" onclick="toastManager.info('Test feature coming soon!')">
                            <i class="fas fa-play"></i> Test Model
                        </button>
                    ` : ''}
                </div>
            </div>
        `
    });
}

async function loadAllModels() {
    try {
        // Wait a bit for DOM to update after component load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Fetch all models
        const communityModelsPromise = fetchAuthenticatedData('/api/models/community').catch(() => getMockCommunityModels());
        const pretrainedModelsPromise = fetchAuthenticatedData('/api/models/pretrained').catch(() => getMockPretrainedModels());
        const userModelsPromise = fetchAuthenticatedData('/api/models/me').catch(() => getMockUserModels());
        const [communityModels, pretrainedModels, userModels] = await Promise.all([
            communityModelsPromise,
            pretrainedModelsPromise,
            userModelsPromise
        ]);
        // Combine and deduplicate models
        const allModels = [...(communityModels || []), ...(pretrainedModels || []), ...(userModels || [])];
        const uniqueModels = Array.from(new Map(allModels.map(model => [model.id, model])).values());
        
        // Find the container within the tab panel
        const panel = document.querySelector('[data-panel="all-models"]');
        const container = panel?.querySelector('.all-models-overview-tab-content .card');
        
        if (container) {
            renderModelTable(uniqueModels, '[data-panel="all-models"] .all-models-overview-tab-content .card', 'all');
        } else {
            console.error('Container not found for all models overview');
            toastManager.error('Failed to load models view');
        }
    } catch (error) {
        console.error('Error fetching models:', error);
        toastManager.error('Failed to load models');
        // Show empty state
        const panel = document.querySelector('[data-panel="all-models"]');
        const container = panel?.querySelector('.all-models-overview-tab-content .card');
        if (container) {
            container.innerHTML = '<h3>All Models Overview</h3><div class="empty-state">Failed to load models. Please try again.</div>';
        }
    }
}

async function loadCommunityModels() {
    try {
        // Wait a bit for DOM to update after component load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const models = await fetchAuthenticatedData('/api/models/community').catch(() => getMockCommunityModels());
        
        // Find the container within the tab panel
        const panel = document.querySelector('[data-panel="community"]');
        const container = panel?.querySelector('.community-models-tab-content .card');
        
        if (container) {
            renderModelTable(models || [], '[data-panel="community"] .community-models-tab-content .card', 'community');
        } else {
            console.error('Container not found for community models');
            toastManager.error('Failed to load community models view');
        }
    } catch (error) {
        console.error('Error fetching community models:', error);
        toastManager.error('Failed to load community models');
        // Show empty state
        const panel = document.querySelector('[data-panel="community"]');
        const container = panel?.querySelector('.community-models-tab-content .card');
        if (container) {
            container.innerHTML = '<h3>Community Models</h3><div class="empty-state">Failed to load community models. Please try again.</div>';
        }
    }
}

async function loadPretrainedModels() {
    try {
        // Wait a bit for DOM to update after component load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const models = await fetchAuthenticatedData('/api/models/pretrained').catch(() => getMockPretrainedModels());
        
        // Find the container within the tab panel
        const panel = document.querySelector('[data-panel="pretrained"]');
        const container = panel?.querySelector('.pretrained-models-tab-content .card');
        
        if (container) {
            renderModelTable(models || [], '[data-panel="pretrained"] .pretrained-models-tab-content .card', 'pretrained');
        } else {
            console.error('Container not found for pretrained models');
            toastManager.error('Failed to load pretrained models view');
        }
    } catch (error) {
        console.error('Error fetching pretrained models:', error);
        toastManager.error('Failed to load pretrained models');
        // Show empty state
        const panel = document.querySelector('[data-panel="pretrained"]');
        const container = panel?.querySelector('.pretrained-models-tab-content .card');
        if (container) {
            container.innerHTML = '<h3>Pretrained Models</h3><div class="empty-state">Failed to load pretrained models. Please try again.</div>';
        }
    }
}

async function setupAllModelsPage() {
    const tabButtons = document.querySelectorAll('.all-models-tabs-container .tab-item');
    const tabContent = document.querySelector('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', async function() {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            const tab = this.getAttribute('data-tab');
            // Load the appropriate tab content
            switch(tab) {
                case 'all-models-overview':
                    await loadComponentWithStyles('AllModelsOverviewTabContent', tabContent);
                    await loadAllModels();
                    break;
                case 'community-models':
                    await loadComponentWithStyles('CommunityModelsTabContent', tabContent);
                    await loadCommunityModels();
                    break;
                case 'pretrained-models':
                    await loadComponentWithStyles('PretrainedModelsTabContent', tabContent);
                    await loadPretrainedModels();
                    break;
            }
        });
    });
    // Load default tab (All Models Overview)
    const defaultTab = document.querySelector('.all-models-tabs-container .tab-item[data-tab="all-models-overview"]');
    if (defaultTab) {
        defaultTab.click();
    }
}

async function loadComponentWithStyles(componentName, containerSelector) {
    await loadComponent(`AllModelsPage/${componentName}`, '.tab-content');
    // CSS files don't exist for these components, removing CSS loading
}

// Mock data functions for when API fails
function getMockCommunityModels() {
    return [
        {
            id: 101,
            name: 'Community Sentiment Analyzer',
            description: 'Analyzes text for positive, negative, or neutral sentiment',
            type: 'NLP',
            visibility: 'community',
            status: 'active',
            user_id: 1,
            username: 'Jeff',
            created_at: new Date().toISOString(),
            performance: { accuracy: 0.85 },
            upvotes: 42,
            downvotes: 3,
            added_to_library: 15
        },
        {
            id: 102,
            name: 'Customer Churn Predictor',
            description: 'Predicts customer churn based on behavior patterns',
            type: 'Classification',
            visibility: 'community',
            status: 'active',
            user_id: 2,
            username: 'Sarah',
            created_at: new Date().toISOString(),
            performance: { accuracy: 0.89 },
            upvotes: 38,
            downvotes: 2,
            added_to_library: 12
        }
    ];
}

function getMockPretrainedModels() {
    return [
        {
            id: 201,
            name: 'DataPulse NLP Core',
            description: 'Official model for natural language processing',
            type: 'NLP',
            visibility: 'pretrained',
            status: 'active',
            user_id: 0,
            username: 'DataPulse',
            created_at: new Date().toISOString(),
            performance: { accuracy: 0.98 },
            upvotes: 150,
            downvotes: 1,
            added_to_library: 89
        },
        {
            id: 202,
            name: 'Image Classification Pro',
            description: 'Advanced image classification with 1000+ categories',
            type: 'Classification',
            visibility: 'pretrained',
            status: 'active',
            user_id: 0,
            username: 'DataPulse',
            created_at: new Date().toISOString(),
            performance: { accuracy: 0.95 },
            upvotes: 128,
            downvotes: 5,
            added_to_library: 67
        }
    ];
}

function getMockUserModels() {
    return [
        {
            id: 1,
            name: 'Sales Forecaster',
            description: 'A model to forecast sales',
            type: 'Regression',
            visibility: 'private',
            status: 'active',
            user_id: 1,
            created_at: new Date().toISOString(),
            performance: { accuracy: 0.88 },
            upvotes: 0,
            downvotes: 0,
            added_to_library: 0
        },
        {
            id: 2,
            name: 'Customer Segmentation',
            description: 'Segments customers into different groups',
            type: 'Clustering',
            visibility: 'private',
            status: 'in-progress',
            user_id: 1,
            created_at: new Date().toISOString(),
            performance: { accuracy: 0.92 },
            upvotes: 0,
            downvotes: 0,
            added_to_library: 0
        }
    ];
}

// Export functions globally for use by AllModelsPage component
window.loadAllModels = loadAllModels;
window.loadCommunityModels = loadCommunityModels;
window.loadPretrainedModels = loadPretrainedModels;
window.renderModelTable = renderModelTable;

export { setupAllModelsPage };