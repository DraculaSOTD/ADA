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
                <p>Model Name: <span class="detail-value">${model.name}</span></p>
                <p>Model Description: <span class="detail-value">${model.description}</span></p>
            </div>
            <div class="model-actions">
                <span class="dropdown-number">${model.added_to_library || 0}</span>
                <button class="action-button add-to-library-btn"><i class="fas fa-plus"></i></button>
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
    // Initial tab content load for AllModelsPage (All Models Overview tab)
    await loadComponent('AllModelsPage/AllModelsOverviewTabContent', '.all-models-page-container .tab-content');
    loadComponentCSS('src/components/AllModelsPage/AllModelsPageTabs.css'); // Load shared CSS for model cards
    loadAllModelsOverviewData(); // Load data for the initial tab

    // Re-attach tab switching listener for AllModelsPage tabs
    document.querySelector('.all-models-tabs-container').addEventListener('click', async (event) => {
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
}

export { setupAllModelsPage };
