import { loadComponent, loadComponentCSS } from '../services/componentLoader.js';
import { fetchAuthenticatedData } from '../services/api.js';
import { StyledDropdown } from '../../components/StyledDropdown/StyledDropdown.js';

let filterDropdown = null;
let timeDropdown = null;
let currentFilter = 'all';
let currentTimeRange = '30';
let allTokenData = [];

async function loadTokensData() {
    const data = await fetchAuthenticatedData('/api/tokens/usage');
    if (data) {
        allTokenData = data;
        applyFilters();
        setupTokenDropdowns();
    } else {
        allTokenData = [];
        applyFilters();
    }
}

function setupTokenDropdowns() {
    // Only set up dropdowns if we're on the tokens tab
    const filterContainer = document.getElementById('filter-dropdown-container');
    const timeContainer = document.getElementById('time-dropdown-container');
    
    if (filterContainer && !filterDropdown) {
        // Load dropdown CSS
        loadComponentCSS('src/components/StyledDropdown/StyledDropdown.css');
        
        filterDropdown = new StyledDropdown(filterContainer, {
            id: 'token-filter',
            placeholder: 'All Transactions',
            options: [
                { value: 'all', title: 'All Transactions', icon: 'fas fa-list' },
                { value: 'generation', title: 'Data Generation', icon: 'fas fa-database' },
                { value: 'training', title: 'Model Training', icon: 'fas fa-brain' },
                { value: 'prediction', title: 'Predictions', icon: 'fas fa-chart-line' },
                { value: 'purchase', title: 'Purchases', icon: 'fas fa-plus-circle' },
                { value: 'bonus', title: 'Bonuses', icon: 'fas fa-gift' }
            ],
            value: 'all',
            onChange: (value) => {
                currentFilter = value;
                applyFilters();
            }
        });
    }
    
    if (timeContainer && !timeDropdown) {
        timeDropdown = new StyledDropdown(timeContainer, {
            id: 'time-filter',
            placeholder: 'Last 30 days',
            options: [
                { value: '7', title: 'Last 7 days', icon: 'fas fa-calendar-week' },
                { value: '30', title: 'Last 30 days', icon: 'fas fa-calendar-alt' },
                { value: '90', title: 'Last 90 days', icon: 'fas fa-calendar' },
                { value: 'all', title: 'All time', icon: 'fas fa-infinity' }
            ],
            value: '30',
            onChange: (value) => {
                currentTimeRange = value;
                applyFilters();
            }
        });
    }
}

function applyFilters() {
    let filteredData = [...allTokenData];
    
    // Apply transaction type filter
    if (currentFilter !== 'all') {
        filteredData = filteredData.filter(item => {
            const reason = item.reason?.toLowerCase() || '';
            switch(currentFilter) {
                case 'generation':
                    return reason.includes('generat');
                case 'training':
                    return reason.includes('train') || reason.includes('model');
                case 'prediction':
                    return reason.includes('predict');
                case 'purchase':
                    return item.change > 0 && reason.includes('purchase');
                case 'bonus':
                    return item.change > 0 && (reason.includes('bonus') || reason.includes('reward'));
                default:
                    return true;
            }
        });
    }
    
    // Apply time range filter
    if (currentTimeRange !== 'all') {
        const daysAgo = parseInt(currentTimeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        
        filteredData = filteredData.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate >= cutoffDate;
        });
    }
    
    // Update the display
    displayTokenData(filteredData);
}

function displayTokenData(data) {
    let totalCost = data.reduce((acc, item) => acc + (item.change || 0), 0);
    const itemsContainer = document.querySelector('.balance-items');
    const balanceAmountElement = document.querySelector('.balance-amount');
    const priceBreakdownElement = document.querySelector('.price-breakdown');

    if (itemsContainer) {
        itemsContainer.innerHTML = '';
        
        if (data.length === 0) {
            itemsContainer.innerHTML = '<div class="empty-state">No transactions found for the selected filters</div>';
        } else {
            data.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('balance-item', 'card');
                
                const isPositive = item.change > 0;
                const icon = getTransactionIcon(item.reason);
                const date = new Date(item.created_at).toLocaleDateString();
                
                itemDiv.innerHTML = `
                    <div class="item-details">
                        <div class="item-header">
                            <i class="${icon} item-icon"></i>
                            <span class="item-name">${item.reason}</span>
                        </div>
                        <span class="item-date">${date}</span>
                    </div>
                    <div class="item-amount ${isPositive ? 'positive' : 'negative'}">
                        ${isPositive ? '+' : ''}${formatTokenAmount(item.change)}
                    </div>
                `;
                itemsContainer.appendChild(itemDiv);
            });
        }
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
}

function getTransactionIcon(reason) {
    const reasonLower = reason?.toLowerCase() || '';
    if (reasonLower.includes('generat')) return 'fas fa-database';
    if (reasonLower.includes('train') || reasonLower.includes('model')) return 'fas fa-brain';
    if (reasonLower.includes('predict')) return 'fas fa-chart-line';
    if (reasonLower.includes('purchase')) return 'fas fa-shopping-cart';
    if (reasonLower.includes('bonus') || reasonLower.includes('reward')) return 'fas fa-gift';
    return 'fas fa-coins';
}

function formatTokenAmount(amount) {
    const absAmount = Math.abs(amount);
    if (absAmount === 0) {
        return '0';
    }
    if (absAmount > 9999) {
        return `${Math.floor(absAmount / 1000)}k`;
    }
    return absAmount.toString();
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
            script.onload = async () => {
                // Initialize the tracker after the script loads
                if (!window.tokenUsageTracker) {
                    window.tokenUsageTracker = new TokenUsageTracker();
                }
                await window.tokenUsageTracker.initialize('tokenUsageTrackerContainer');
            };
            document.body.appendChild(script);
        } else {
            // Script already loaded, just re-initialize
            if (window.tokenUsageTracker) {
                window.tokenUsageTracker.destroy(); // Clean up previous instance
            } else {
                window.tokenUsageTracker = new TokenUsageTracker();
            }
            await window.tokenUsageTracker.initialize('tokenUsageTrackerContainer');
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
    const modelList = document.querySelector('.in-progress-tab-content .model-list');
    if (!modelList) return;
    
    modelList.innerHTML = '';
    
    // Check for active generation jobs from localStorage
    const activeGeneration = localStorage.getItem('activeGeneration');
    if (activeGeneration) {
        const generation = JSON.parse(activeGeneration);
        const elapsed = Math.floor((Date.now() - generation.startTime) / 1000);
        
        const generationCard = document.createElement('div');
        generationCard.classList.add('model-card', 'card');
        generationCard.innerHTML = `
            <div class="model-header">
                <h3><i class="fas fa-database"></i> Data Generation</h3>
                <span class="job-type-badge generation">Generation</span>
            </div>
            <div class="model-details">
                <p>Job ID: <span class="detail-value">#${generation.id}</span></p>
                <p>Status: <span class="detail-value status-active">${generation.currentStage || generation.status}</span></p>
                <p>Rows Generated: <span class="detail-value">${generation.rows || 0} / ${generation.settings?.rows || 1000}</span></p>
                <p>Time Elapsed: <span class="detail-value">${formatTime(elapsed)}</span></p>
            </div>
            <div class="progress-section">
                <span class="progress-label">Progress:</span>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${generation.progress || 0}%;">${Math.round(generation.progress || 0)}%</div>
                </div>
            </div>
            <div class="model-actions">
                <button class="view-button" onclick="window.location.href='/data-generator'">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="cancel-button" onclick="cancelGeneration('${generation.id}')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        `;
        modelList.appendChild(generationCard);
    }
    
    // Load model training jobs from API
    const data = await fetchAuthenticatedData('/api/models/in-progress');
    if (data && data.length > 0) {
        data.forEach(model => {
            const modelCard = document.createElement('div');
            modelCard.classList.add('model-card', 'card');
            modelCard.innerHTML = `
                <div class="model-header">
                    <h3><i class="fas fa-brain"></i> ${model.name}</h3>
                    <span class="job-type-badge training">Training</span>
                </div>
                <div class="model-details">
                    <p>Model Type: <span class="detail-value">${model.type || 'Neural Network'}</span></p>
                    <p>Status: <span class="detail-value">${model.status}</span></p>
                    <p>Time Elapsed: <span class="detail-value">${model.elapsed || 'N/A'}</span></p>
                    <p>Token Cost: <span class="detail-value">${model.tokenCost || 'N/A'}</span></p>
                </div>
                <div class="progress-section">
                    <span class="progress-label">Training Progress:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${model.progress || 50}%;">${model.progress || 50}%</div>
                    </div>
                </div>
                <div class="model-actions">
                    <button class="pause-button">
                        <i class="fas fa-pause"></i> Pause
                    </button>
                    <button class="cancel-button">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            `;
            modelList.appendChild(modelCard);
        });
    }
    
    // Show empty state if no jobs
    if (modelList.children.length === 0) {
        modelList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks fa-3x"></i>
                <h3>No Active Jobs</h3>
                <p>Your data generation and model training jobs will appear here when in progress.</p>
                <div class="empty-actions">
                    <button class="auth-button" onclick="window.location.href='/data-generator'">
                        <i class="fas fa-database"></i> Generate Data
                    </button>
                    <button class="auth-button" onclick="window.location.href='/model-editor'">
                        <i class="fas fa-brain"></i> Train Model
                    </button>
                </div>
            </div>
        `;
    }
}

// Helper function to format time
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Cancel generation job
window.cancelGeneration = function(generationId) {
    if (confirm('Are you sure you want to cancel this generation job?')) {
        localStorage.removeItem('activeGeneration');
        loadInProgressData(); // Refresh the list
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
    
    // Initialize token widget
    await initializeDashboardTokenWidget();
    
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
                    // Reset dropdowns when switching tabs
                    filterDropdown = null;
                    timeDropdown = null;
                    
                    // Initialize token sync service if available
                    if (window.tokenSyncService) {
                        await window.tokenSyncService.forceUpdate();
                        // Update balance display in the tokens tab
                        const balanceElements = document.querySelectorAll('[data-token-balance]');
                        const userData = localStorage.getItem('user');
                        if (userData) {
                            try {
                                const user = JSON.parse(userData);
                                const formattedBalance = window.tokenSyncService.formatTokenAmount(user.token_balance || 0);
                                balanceElements.forEach(el => {
                                    el.textContent = formattedBalance;
                                });
                            } catch (e) {
                                console.error('Failed to parse user data:', e);
                            }
                        }
                    }
                    
                    await loadTokensData();
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

async function initializeDashboardTokenWidget() {
    // Load widget CSS
    loadComponentCSS('src/components/DashboardTokenWidget/DashboardTokenWidget.css');
    
    // Load widget JavaScript
    const script = document.createElement('script');
    script.src = 'src/components/DashboardTokenWidget/DashboardTokenWidget.js';
    script.type = 'module';
    
    return new Promise((resolve) => {
        script.onload = () => {
            // Initialize the widget
            const widget = new window.DashboardTokenWidget();
            widget.initialize('dashboard-token-widget');
            
            // Store reference for cleanup
            window.dashboardTokenWidget = widget;
            resolve();
        };
        document.body.appendChild(script);
    });
}

export { setupDashboardPage };
