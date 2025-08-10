import { loadComponent, loadComponentCSS } from '../services/componentLoader.js';
import { fetchAuthenticatedData } from '../services/api.js';

function renderModelCards(models, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container not found: ${containerSelector}`);
        return;
    }
    container.innerHTML = '';
    models.forEach(model => {
        const modelCard = document.createElement('div');
        modelCard.classList.add('model-card', 'card');
        modelCard.dataset.modelId = model.id;
        let username = model.user_id;
        if (model.name === 'Community Sentiment Analyzer') {
            username = 'Jeff';
        } else if (model.name === 'DataPulse NLP Core') {
            username = 'DataPulse';
        }
        // Add special styling for rules engines
        const modelTypeLabel = model.type === 'rules_engine' ? ' <span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em;">Rules Engine</span>' : '';
        const actionButtons = model.type === 'rules_engine' ? 
            `<button class="action-button edit-rule-btn" data-rule-id="${model.id}"><i class="fas fa-edit"></i> Edit</button>
             <button class="action-button execute-rule-btn" data-rule-id="${model.id}"><i class="fas fa-play"></i> Execute</button>` :
            `<button class="action-button add-to-library-btn"><i class="fas fa-plus"></i></button>`;
        
        modelCard.innerHTML = `
            <div class="model-header">
                <span class="username">${username}</span>
                <span class="post-description">${model.description}</span>
                <div class="likes">
                    <span class="upvotes">${model.upvotes || 0}</span>
                    <button class="vote-btn" data-vote-type="upvote">👍</button>
                    <span class="downvotes">${model.downvotes || 0}</span>
                    <button class="vote-btn" data-vote-type="downvote">👎</button>
                </div>
            </div>
            <div class="model-details">
                <p>Model Name: <span class="detail-value">${model.name}${modelTypeLabel}</span></p>
                <p>Model Description: <span class="detail-value">${model.description}</span></p>
            </div>
            <div class="model-actions">
                <span class="dropdown-number">${model.added_to_library || 0}</span>
                ${actionButtons}
            </div>
        `;
        container.appendChild(modelCard);
    });

    // Add event listeners for vote and add-to-library buttons
    container.querySelectorAll('.vote-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const modelId = event.target.closest('.model-card').dataset.modelId;
            const voteType = event.target.dataset.voteType;
            await fetchAuthenticatedData(`/api/votes/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model_id: parseInt(modelId), vote_type: voteType })
            });
            // Refresh the view to show updated vote counts
            loadAllModelsOverviewData();
        });
    });

    container.querySelectorAll('.add-to-library-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const modelId = event.target.closest('.model-card').dataset.modelId;
            await fetchAuthenticatedData(`/api/models/${modelId}/add-to-library`, {
                method: 'POST'
            });
            // Refresh the view to show updated library counts
            loadAllModelsOverviewData();
        });
    });
    
    // Add event listeners for rules engine buttons
    container.querySelectorAll('.edit-rule-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const ruleId = event.target.closest('button').dataset.ruleId;
            // Redirect to rules engine edit page
            window.location.hash = `#rules-engine?edit=${ruleId}`;
        });
    });
    
    container.querySelectorAll('.execute-rule-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const ruleId = event.target.closest('button').dataset.ruleId;
            // Show execution dialog or redirect to execution page
            if (confirm('Execute this rule engine with test data?')) {
                try {
                    const result = await fetchAuthenticatedData(`/api/rules/${ruleId}/execute`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            input_data: { test: true },
                            trigger_type: 'manual'
                        })
                    });
                    alert(`Rule executed successfully!\n\nStatus: ${result.status}\nExecution Time: ${result.execution_time_ms}ms`);
                } catch (error) {
                    alert('Failed to execute rule: ' + error.message);
                }
            }
        });
    });
}

async function loadAllModelsOverviewData() {
    const [communityModels, pretrainedModels] = await Promise.all([
        fetchAuthenticatedData('/api/models/community'),
        fetchAuthenticatedData('/api/models/pretrained')
    ]);
    let allModels = [];
    if (communityModels) {
        allModels = allModels.concat(communityModels);
    }
    if (pretrainedModels) {
        allModels = allModels.concat(pretrainedModels);
    }
    renderModelCards(allModels, '#allModelsList');
    attachSearchListener(allModels, '#allModelsList');
}

async function loadCommunityModelsData() {
    const data = await fetchAuthenticatedData('/api/models/community');
    if (data) {
        renderModelCards(data, '#communityModelsList');
        attachSearchListener(data, '#communityModelsList');
    }
}

async function loadPretrainedModelsData() {
    const data = await fetchAuthenticatedData('/api/models/pretrained');
    if (data) {
        renderModelCards(data, '#pretrainedModelsList');
        attachSearchListener(data, '#pretrainedModelsList');
    }
}

function attachSearchListener(models, containerSelector) {
    const searchInput = document.getElementById('model-search');
    if (searchInput) {
        searchInput.removeEventListener('input', handleSearch); // Remove existing listener to prevent duplicates
        searchInput.addEventListener('input', (event) => handleSearch(event, models, containerSelector));
    }
}

function handleSearch(event, models, containerSelector) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredModels = models.filter(model =>
        model.name.toLowerCase().includes(searchTerm) ||
        model.description.toLowerCase().includes(searchTerm)
    );
    renderModelCards(filteredModels, containerSelector);
}

async function setupAllModelsPage() {
    // Wait a bit to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if container exists
    const tabContent = document.querySelector('.all-models-page-container .tab-content');
    if (!tabContent) {
        console.error('AllModelsPage tab content container not found');
        return;
    }
    
    // Initial tab content load for AllModelsPage (All Models Overview tab)
    await loadComponent('AllModelsPage/AllModelsOverviewTabContent', '.all-models-page-container .tab-content');
    loadComponentCSS('src/components/AllModelsPage/AllModelsPageTabs.css'); // Load shared CSS for model cards
    loadAllModelsOverviewData(); // Load data for the initial tab

    // Re-attach tab switching listener for AllModelsPage tabs
    const tabsContainer = document.querySelector('.all-models-tabs-container');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', async (event) => {
        const target = event.target.closest('.tab-item');
        if (target) {
            const tabId = target.dataset.tab;
            document.querySelectorAll('.all-models-tabs-container .tab-item').forEach(item => item.classList.remove('active'));
            target.classList.add('active');

            const tabContentElement = document.querySelector('.all-models-page-container .tab-content');
            tabContentElement.innerHTML = '';

            switch (tabId) {
                case 'all-models-overview':
                    await loadComponent('AllModelsPage/AllModelsOverviewTabContent', '.all-models-page-container .tab-content');
                    loadComponentCSS('src/components/AllModelsPage/AllModelsPageTabs.css');
                    loadAllModelsOverviewData();
                    break;
                case 'community-models':
                    await loadComponent('AllModelsPage/CommunityModelsTabContent', '.all-models-page-container .tab-content');
                    loadComponentCSS('src/components/AllModelsPage/AllModelsPageTabs.css');
                    loadCommunityModelsData();
                    break;
                case 'pretrained-models':
                    await loadComponent('AllModelsPage/PretrainedModelsTabContent', '.all-models-page-container .tab-content');
                    loadComponentCSS('src/components/AllModelsPage/AllModelsPageTabs.css');
                    loadPretrainedModelsData();
                    break;
                default:
                    console.warn('Unknown All Models tab:', tabId);
            }
        }
    });
    } // End of if (tabsContainer)
}

export { setupAllModelsPage };
