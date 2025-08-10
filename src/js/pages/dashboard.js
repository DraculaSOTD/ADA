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
            // Special handling for rules engines
            if (model.type === 'rules_engine') {
                itemDiv.innerHTML = `
                    <span class="model-name">${model.name} <span style="font-size: 0.75em; color: #666;">[Rules Engine]</span></span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: 100%; background-color: #4CAF50;"></div>
                    </div>
                    <span class="percentage">Active</span>
                `;
            } else {
                itemDiv.innerHTML = `
                    <span class="model-name">${model.name}</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${performance}%;"></div>
                    </div>
                    <span class="percentage">${performance.toFixed(0)}%</span>
                `;
            }
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

async function loadTokenUsageTracker() {
    const trackerContainer = document.getElementById('tokenUsageTrackerContainer');
    if (trackerContainer) {
        // Load the TokenUsageTracker component
        await loadComponent('TokenUsageTracker', '#tokenUsageTrackerContainer');
        loadComponentCSS('src/components/TokenUsageTracker/TokenUsageTracker.css');
        
        // Check if script is already loaded
        if (!window.TokenUsageTracker) {
            // Load the JavaScript for the tracker
            const script = document.createElement('script');
            script.src = 'src/components/TokenUsageTracker/TokenUsageTracker.js';
            script.onload = () => {
                // Initialize the tracker after the script loads
                if (!window.tokenUsageTracker) {
                    window.tokenUsageTracker = new TokenUsageTracker();
                }
                window.tokenUsageTracker.initialize('tokenUsageTrackerContainer');
            };
            document.body.appendChild(script);
        } else {
            // Script already loaded, just re-initialize
            if (window.tokenUsageTracker) {
                window.tokenUsageTracker.destroy(); // Clean up previous instance
            } else {
                window.tokenUsageTracker = new TokenUsageTracker();
            }
            window.tokenUsageTracker.initialize('tokenUsageTrackerContainer');
        }
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
                    // Load TokenUsageTracker component
                    await loadTokenUsageTracker();
                    // Update quick stats
                    updateTokenQuickStats();
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

function updateTokenQuickStats() {
    // Wait for token tracker to be available
    const checkInterval = setInterval(() => {
        if (window.tokenUsageTracker) {
            clearInterval(checkInterval);
            const tracker = window.tokenUsageTracker;
            
            // Calculate average daily usage
            const avgDaily = document.getElementById('avgDailyUsage');
            if (avgDaily) {
                const startDate = new Date(tracker.startDate || Date.now());
                const daysPassed = Math.max(1, Math.ceil((Date.now() - startDate) / (1000 * 60 * 60 * 24)));
                const avgUsage = Math.round(tracker.usedTokens / daysPassed);
                avgDaily.textContent = tracker.formatNumber(avgUsage);
            }
            
            // Calculate projected monthly usage
            const projectedMonthly = document.getElementById('projectedMonthly');
            if (projectedMonthly) {
                const startDate = new Date(tracker.startDate || Date.now());
                const daysPassed = Math.max(1, Math.ceil((Date.now() - startDate) / (1000 * 60 * 60 * 24)));
                const avgUsage = tracker.usedTokens / daysPassed;
                const projected = Math.round(avgUsage * 30);
                projectedMonthly.textContent = tracker.formatNumber(projected);
                
                // Add color coding
                if (projected > tracker.monthlyLimit) {
                    projectedMonthly.classList.add('danger');
                    projectedMonthly.classList.remove('warning', 'success');
                } else if (projected > tracker.monthlyLimit * 0.8) {
                    projectedMonthly.classList.add('warning');
                    projectedMonthly.classList.remove('danger', 'success');
                } else {
                    projectedMonthly.classList.add('success');
                    projectedMonthly.classList.remove('danger', 'warning');
                }
            }
            
            // Calculate days remaining
            const daysRemaining = document.getElementById('daysRemaining');
            if (daysRemaining) {
                const now = new Date();
                const renewalDate = new Date(tracker.renewalDate);
                const days = Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24));
                daysRemaining.textContent = days > 0 ? days : 0;
            }
            
            // Update usage status
            const usageStatus = document.getElementById('usageStatus');
            if (usageStatus) {
                const percentage = (tracker.usedTokens / tracker.monthlyLimit) * 100;
                if (percentage >= 95) {
                    usageStatus.textContent = 'Critical';
                    usageStatus.classList.add('danger');
                    usageStatus.classList.remove('warning', 'success');
                } else if (percentage >= 80) {
                    usageStatus.textContent = 'High';
                    usageStatus.classList.add('warning');
                    usageStatus.classList.remove('danger', 'success');
                } else {
                    usageStatus.textContent = 'Normal';
                    usageStatus.classList.add('success');
                    usageStatus.classList.remove('danger', 'warning');
                }
            }
        }
    }, 100);
    
    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000);
}

export { setupDashboardPage };
