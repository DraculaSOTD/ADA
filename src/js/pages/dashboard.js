import { loadComponent, loadComponentCSS } from '../services/componentLoader.js';
import { fetchAuthenticatedData } from '../services/api.js';

async function loadTokensData() {
    const data = await fetchAuthenticatedData('/api/tokens/usage');
    if (data) {
        let totalCost = data.reduce((acc, item) => acc + (item.change || 0), 0);
        const itemsContainer = document.querySelector('.balance-items');
        const balanceAmountElement = document.querySelector('.balance-amount');
        const priceBreakdownElement = document.querySelector('.price-breakdown');

        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            data.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('balance-item', 'card');
                itemDiv.innerHTML = `
                    <div class="item-details">
                        <span class="item-name">${item.reason}</span>
                        <span class="item-price">Tokens: ${formatTokenAmount(item.change)}</span>
                    </div>
                `;
                itemsContainer.appendChild(itemDiv);
            });
        }

        if (balanceAmountElement) {
            balanceAmountElement.textContent = formatTokenAmount(totalCost);
        }

        if (priceBreakdownElement) {
            priceBreakdownElement.innerHTML = `
                <p>Base Price: <span>$${totalCost.toFixed(2)}</span></p>
                <p>Taxes: <span>$0.00</span></p>
                <p class="total">Total: <span>$${totalCost.toFixed(2)}</span></p>
            `;
        }
    } else {
        const itemsContainer = document.querySelector('.balance-items');
        const balanceAmountElement = document.querySelector('.balance-amount');
        const priceBreakdownElement = document.querySelector('.price-breakdown');

        if (itemsContainer) {
            itemsContainer.innerHTML = '';
        }
        if (balanceAmountElement) {
            balanceAmountElement.textContent = '$0.00';
        }
        if (priceBreakdownElement) {
            priceBreakdownElement.innerHTML = `
                <p>Base Price: <span>$0.00</span></p>
                <p>Taxes: <span>$0.00</span></p>
                <p class="total">Total: <span>$0.00</span></p>
            `;
        }
    }
}

function formatTokenAmount(amount) {
    if (amount === 0) {
        return '0';
    }
    if (amount > 9999) {
        return `${Math.floor(amount / 1000)}k`;
    }
    return amount.toString();
}

async function loadModelPerformanceData() {
    const models = await fetchAuthenticatedData('/api/models/me');
    if (models) {
        const performanceList = document.querySelector('.model-performance-card .performance-list');
        performanceList.innerHTML = '';
        models.forEach(model => {
            const performance = model.performance && model.performance.accuracy ? model.performance.accuracy * 100 : 0;
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('performance-item');
            itemDiv.innerHTML = `
                <span class="model-name">${model.name}</span>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${performance}%;"></div>
                </div>
                <span class="percentage">${performance.toFixed(0)}%</span>
            `;
            performanceList.appendChild(itemDiv);
        });
    }
}

async function loadNotificationsAlertsData() {
    const notifications = await fetchAuthenticatedData('/api/notifications/');
    if (notifications) {
        const alertsList = document.querySelector('.notifications-alerts-card .alerts-list');
        alertsList.innerHTML = '';
        notifications.forEach(notification => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('alert-item');
            itemDiv.innerHTML = `
                <div class="alert-dot"></div>
                <div class="alert-content">
                    <span class="alert-title">${notification.title}</span>
                    <span class="alert-description">${notification.message}</span>
                </div>
                <span class="alert-time">${new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            `;
            alertsList.appendChild(itemDiv);
        });
    }
}

async function loadAllModelsData() {
    const userModels = await fetchAuthenticatedData('/api/models/me');

    if (userModels) {
        const modelList = document.querySelector('.all-models-tab-content .model-list');
        modelList.innerHTML = '';
        userModels.forEach(model => {
            const modelCard = document.createElement('div');
            modelCard.classList.add('model-card', 'card');
            modelCard.dataset.modelId = model.id;
            modelCard.innerHTML = `
                <div class="model-header">
                    <span class="model-name">${model.name}</span>
                    <button class="remove-model-button" style="display: none;"><i class="fas fa-times"></i></button>
                </div>
                <div class="model-details">
                    <p>Description: <span class="detail-value">${model.description}</span></p>
                    <p>Type: <span class="detail-value">${model.type}</span></p>
                    <p>Visibility: <span class="detail-value">${model.visibility}</span></p>
                    <p>Status: <span class="detail-value">${model.status}</span></p>
                </div>
            `;
            modelList.appendChild(modelCard);
        });

        // Show remove button only in "My Models" tab
        const myModelsTab = document.querySelector('.tab-item[data-tab="my-models"]');
        if (myModelsTab && myModelsTab.classList.contains('active')) {
            document.querySelectorAll('.remove-model-button').forEach(button => {
                button.style.display = 'block';
            });
        }

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-model-button').forEach(button => {
            button.addEventListener('click', async (event) => {
                event.stopPropagation();
                const modelCard = event.target.closest('.model-card');
                const modelId = modelCard.dataset.modelId;
                if (confirm('Are you sure you want to remove this model?')) {
                    const response = await fetchAuthenticatedData(`/api/models/${modelId}`, { method: 'DELETE' });
                    if (response) {
                        modelCard.remove();
                    } else {
                        alert('Failed to remove model.');
                    }
                }
            });
        });
    }
}

async function loadInProgressData() {
    const data = await fetchAuthenticatedData('/api/models/in-progress');
    if (data) {
        const modelList = document.querySelector('.in-progress-tab-content .model-list');
        modelList.innerHTML = '';
        data.forEach(model => {
            const modelCard = document.createElement('div');
            modelCard.classList.add('model-card', 'card');
            modelCard.innerHTML = `
                <div class="model-details">
                    <p>Model Name: <span class="detail-value">${model.name}</span></p>
                    <p>Model State: <span class="detail-value">${model.status}</span></p>
                    <p>Time Elapsed: <span class="detail-value">N/A</span></p>
                    <p>Elapsed Token Cost: <span class="detail-value">N/A</span></p>
                </div>
                <div class="progress-section">
                    <span class="progress-label">State Progress:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: 50%;">50%</div>
                    </div>
                </div>
                <div class="model-actions">
                    <button class="pause-button">Pause</button>
                    <button class="cancel-button">Cancel</button>
                </div>
            `;
            modelList.appendChild(modelCard);
        });
    }
}

async function loadActiveModelsData() {
    const data = await fetchAuthenticatedData('/api/models/active');
    if (data) {
        const modelList = document.querySelector('.active-models-tab-content .model-list');
        modelList.innerHTML = '';
        data.forEach(model => {
            const modelCard = document.createElement('div');
            modelCard.classList.add('model-card', 'card');
            modelCard.innerHTML = `
                <div class="model-header">
                    <span class="model-name">${model.name}</span>
                </div>
                <div class="model-details">
                    <p>Description: <span class="detail-value">${model.description}</span></p>
                    <p>Type: <span class="detail-value">${model.type}</span></p>
                    <p>Visibility: <span class="detail-value">${model.visibility}</span></p>
                    <p>Status: <span class="detail-value">${model.status}</span></p>
                </div>
            `;
            modelList.appendChild(modelCard);
        });
    }
}

async function setupDashboardPage() {
    loadComponent('DashboardTabs', '.dashboard-tabs');
    loadComponentCSS('src/components/DashboardTabs/DashboardTabs.css');
    loadComponent('ModelPerformance', '.model-performance-section');
    loadComponentCSS('src/components/ModelPerformance/ModelPerformance.css');
    loadComponent('NotificationsAlerts', '.notifications-alerts-section');
    loadComponentCSS('src/components/NotificationsAlerts/NotificationsAlerts.css');
    // Initial tab content load for Dashboard (All Models tab)
    loadComponent('AllModelsTabContent', '.tab-content');
    loadComponentCSS('src/components/AllModelsTabContent/AllModelsTabContent.css');

    // Re-attach tab switching listener for DashboardTabs
    document.querySelector('.dashboard-tabs').addEventListener('click', async (event) => {
        const target = event.target.closest('.tab-item');
        if (target) {
            const tabId = target.dataset.tab;
            document.querySelectorAll('.tab-item').forEach(item => item.classList.remove('active'));
            target.classList.add('active');

            const tabContentElement = document.querySelector('.tab-content');
            tabContentElement.innerHTML = '';

            switch (tabId) {
                case 'tokens':
                    await loadComponent('TokensTabContent', '.tab-content');
                    loadComponentCSS('src/components/TokensTabContent/TokensTabContent.css');
                    loadTokensData();
                    break;
                case 'my-models':
                    await loadComponent('AllModelsTabContent', '.tab-content');
                    loadComponentCSS('src/components/AllModelsTabContent/AllModelsTabContent.css');
                    loadAllModelsData();
                    break;
                case 'in-progress':
                    await loadComponent('InProgressTabContent', '.tab-content');
                    loadComponentCSS('src/components/InProgressTabContent/InProgressTabContent.css');
                    loadInProgressData();
                    break;
                case 'active-models':
                    await loadComponent('ActiveModelsTabContent', '.tab-content');
                    loadComponentCSS('src/components/ActiveModelsTabContent/ActiveModelsTabContent.css');
                    loadActiveModelsData();
                    break;
                default:
                    console.warn('Unknown tab:', tabId);
            }
        }
    });

    // Initial data load
    loadModelPerformanceData();
    loadNotificationsAlertsData();
    loadAllModelsData();
}

export { setupDashboardPage };
