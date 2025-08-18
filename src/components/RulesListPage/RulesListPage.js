import { StyledDropdown } from '../StyledDropdown/StyledDropdown.js';

export class RulesListPage {
    constructor() {
        this.rules = [];
        this.filteredRules = [];
        this.filters = {
            status: '',
            trigger: '',
            sort: 'created_desc'
        };
        this.searchTerm = '';
        this.statusDropdown = null;
        this.triggerDropdown = null;
        this.sortDropdown = null;
        this.init();
    }

    init() {
        // Ensure StyledDropdown CSS is loaded
        this.loadDropdownStyles();
        this.initializeSearchBar();
        this.initializeFilters();
        this.loadRules();
        this.updateStats();
    }
    
    loadDropdownStyles() {
        // Check if StyledDropdown CSS is already loaded
        const existingLink = document.querySelector('link[href*="StyledDropdown.css"]');
        if (!existingLink) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/src/components/StyledDropdown/StyledDropdown.css';
            document.head.appendChild(link);
        }
    }

    initializeSearchBar() {
        const searchInput = document.getElementById('rules-search-input');
        const searchButton = document.getElementById('rules-search-button');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.handleSearch(this.searchTerm);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch(this.searchTerm);
                }
            });
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                this.handleSearch(this.searchTerm);
            });
        }
    }

    initializeFilters() {
        console.log('Initializing RulesListPage filters...');
        
        // Status filter dropdown
        const statusContainer = document.getElementById('status-filter-container');
        console.log('Status container found:', !!statusContainer);
        
        if (statusContainer) {
            this.statusDropdown = new StyledDropdown(statusContainer, {
                id: 'status-filter',
                placeholder: 'All Status',
                options: [
                    { value: '', title: 'All Status', icon: 'fas fa-list' },
                    { value: 'active', title: 'Active', icon: 'fas fa-check-circle' },
                    { value: 'inactive', title: 'Inactive', icon: 'fas fa-times-circle' }
                ],
                value: '',
                onChange: (value) => {
                    this.filters.status = value;
                    this.applyFilters();
                }
            });
        }

        // Trigger filter dropdown
        const triggerContainer = document.getElementById('trigger-filter-container');
        if (triggerContainer) {
            this.triggerDropdown = new StyledDropdown(triggerContainer, {
                id: 'trigger-filter',
                placeholder: 'All Triggers',
                options: [
                    { value: '', title: 'All Triggers', icon: 'fas fa-bolt' },
                    { value: 'manual', title: 'Manual', icon: 'fas fa-hand-pointer' },
                    { value: 'schedule', title: 'Scheduled', icon: 'fas fa-clock' },
                    { value: 'event', title: 'Event-based', icon: 'fas fa-calendar-check' },
                    { value: 'model_complete', title: 'Model Completion', icon: 'fas fa-robot' },
                    { value: 'webhook', title: 'Webhook', icon: 'fas fa-link' }
                ],
                value: '',
                onChange: (value) => {
                    this.filters.trigger = value;
                    this.applyFilters();
                }
            });
        }

        // Sort filter dropdown
        const sortContainer = document.getElementById('sort-filter-container');
        if (sortContainer) {
            this.sortDropdown = new StyledDropdown(sortContainer, {
                id: 'sort-filter',
                placeholder: 'Newest First',
                options: [
                    { value: 'created_desc', title: 'Newest First', icon: 'fas fa-sort-amount-down' },
                    { value: 'created_asc', title: 'Oldest First', icon: 'fas fa-sort-amount-up' },
                    { value: 'name_asc', title: 'Name (A-Z)', icon: 'fas fa-sort-alpha-down' },
                    { value: 'name_desc', title: 'Name (Z-A)', icon: 'fas fa-sort-alpha-up' },
                    { value: 'executions', title: 'Most Executed', icon: 'fas fa-fire' }
                ],
                value: 'created_desc',
                onChange: (value) => {
                    this.filters.sort = value;
                    this.applyFilters();
                }
            });
        }
    }

    loadRules() {
        // Simulate loading rules from API
        this.rules = this.generateMockRules();
        this.filteredRules = [...this.rules];
        this.renderRules();
    }

    generateMockRules() {
        return [
            {
                id: 1,
                name: 'Data Quality Check',
                description: 'Validates incoming data against quality thresholds',
                status: 'active',
                trigger: 'schedule',
                schedule: 'Every 6 hours',
                executions: 1542,
                successRate: 98.5,
                lastRun: '2 hours ago'
            },
            {
                id: 2,
                name: 'Customer Segmentation',
                description: 'Automatically segments customers based on behavior patterns',
                status: 'active',
                trigger: 'event',
                event: 'New customer signup',
                executions: 3287,
                successRate: 99.2,
                lastRun: '5 minutes ago'
            },
            {
                id: 3,
                name: 'Fraud Detection Alert',
                description: 'Monitors transactions for suspicious patterns',
                status: 'active',
                trigger: 'real-time',
                executions: 8921,
                successRate: 97.8,
                lastRun: '1 minute ago'
            },
            {
                id: 4,
                name: 'Weekly Report Generation',
                description: 'Generates and distributes weekly performance reports',
                status: 'inactive',
                trigger: 'schedule',
                schedule: 'Every Monday at 9 AM',
                executions: 52,
                successRate: 100,
                lastRun: '3 days ago'
            },
            {
                id: 5,
                name: 'Model Retraining Pipeline',
                description: 'Automatically retrains ML models when performance drops',
                status: 'active',
                trigger: 'model_complete',
                threshold: 'Accuracy < 95%',
                executions: 28,
                successRate: 96.4,
                lastRun: '1 week ago'
            }
        ];
    }

    handleSearch(searchTerm) {
        if (!searchTerm) {
            this.filteredRules = [...this.rules];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredRules = this.rules.filter(rule => 
                rule.name.toLowerCase().includes(term) ||
                rule.description.toLowerCase().includes(term) ||
                rule.trigger.toLowerCase().includes(term)
            );
        }
        this.applyFilters();
    }

    clearSearch() {
        this.filteredRules = [...this.rules];
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.filteredRules];

        // Apply status filter
        if (this.filters.status) {
            filtered = filtered.filter(rule => rule.status === this.filters.status);
        }

        // Apply trigger filter
        if (this.filters.trigger) {
            filtered = filtered.filter(rule => rule.trigger === this.filters.trigger);
        }

        // Apply sorting
        filtered = this.sortRules(filtered, this.filters.sort);

        this.renderRules(filtered);
        this.updateStats(filtered);
    }

    sortRules(rules, sortBy) {
        const sorted = [...rules];
        
        switch(sortBy) {
            case 'created_desc':
                return sorted.reverse();
            case 'created_asc':
                return sorted;
            case 'name_asc':
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case 'name_desc':
                return sorted.sort((a, b) => b.name.localeCompare(a.name));
            case 'executions':
                return sorted.sort((a, b) => b.executions - a.executions);
            default:
                return sorted;
        }
    }

    renderRules(rules = this.filteredRules) {
        const container = document.getElementById('rules-grid');
        const emptyState = document.getElementById('empty-state');
        
        if (!container) return;

        if (rules.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        container.innerHTML = rules.map(rule => `
            <div class="rule-card" data-rule-id="${rule.id}">
                <div class="rule-header">
                    <h3 class="rule-title">${rule.name}</h3>
                    <span class="rule-status ${rule.status}">${rule.status}</span>
                </div>
                <p class="rule-description">${rule.description}</p>
                <div class="rule-meta">
                    <div class="meta-item">
                        <i class="fas fa-${this.getTriggerIcon(rule.trigger)}"></i>
                        <span>${this.getTriggerLabel(rule)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${rule.lastRun}</span>
                    </div>
                </div>
                <div class="rule-stats">
                    <div class="stat-item">
                        <div class="stat-item-value">${rule.executions.toLocaleString()}</div>
                        <div class="stat-item-label">Executions</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-value">${rule.successRate}%</div>
                        <div class="stat-item-label">Success Rate</div>
                    </div>
                </div>
                <div class="rule-actions">
                    <button class="secondary-button" onclick="rulesListPage.editRule(${rule.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="secondary-button" onclick="rulesListPage.viewHistory(${rule.id})">
                        <i class="fas fa-history"></i> History
                    </button>
                    <button class="auth-button" onclick="rulesListPage.runRule(${rule.id})">
                        <i class="fas fa-play"></i> Run Now
                    </button>
                </div>
            </div>
        `).join('');

        // Add click handlers for cards
        const cards = container.querySelectorAll('.rule-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const ruleId = card.dataset.ruleId;
                    this.viewRuleDetails(ruleId);
                }
            });
        });
    }

    getTriggerIcon(trigger) {
        const icons = {
            'schedule': 'calendar-alt',
            'event': 'bolt',
            'manual': 'hand-pointer',
            'model_complete': 'check-circle',
            'webhook': 'link',
            'real-time': 'sync'
        };
        return icons[trigger] || 'cog';
    }

    getTriggerLabel(rule) {
        switch(rule.trigger) {
            case 'schedule':
                return rule.schedule || 'Scheduled';
            case 'event':
                return rule.event || 'Event-based';
            case 'model_complete':
                return rule.threshold || 'Model trigger';
            default:
                return rule.trigger.replace('_', ' ').charAt(0).toUpperCase() + 
                       rule.trigger.slice(1).replace('_', ' ');
        }
    }

    updateStats(rules = this.filteredRules) {
        // Update total rules
        const totalRulesEl = document.getElementById('total-rules');
        if (totalRulesEl) {
            totalRulesEl.textContent = this.rules.length;
        }

        // Update active rules
        const activeRulesEl = document.getElementById('active-rules');
        if (activeRulesEl) {
            const activeCount = this.rules.filter(r => r.status === 'active').length;
            activeRulesEl.textContent = activeCount;
        }

        // Update total executions
        const totalExecutionsEl = document.getElementById('total-executions');
        if (totalExecutionsEl) {
            const totalExecutions = this.rules.reduce((sum, r) => sum + r.executions, 0);
            totalExecutionsEl.textContent = totalExecutions.toLocaleString();
        }

        // Update success rate
        const successRateEl = document.getElementById('success-rate');
        if (successRateEl) {
            const avgSuccessRate = this.rules.reduce((sum, r) => sum + r.successRate, 0) / this.rules.length;
            successRateEl.textContent = `${avgSuccessRate.toFixed(1)}%`;
        }
    }

    viewRuleDetails(ruleId) {
        console.log('Viewing details for rule:', ruleId);
        // Navigate to rule details page
        window.location.hash = `#rule-details/${ruleId}`;
    }

    editRule(ruleId) {
        console.log('Editing rule:', ruleId);
        // Navigate to rule editor
        window.location.hash = `#rules-engine/${ruleId}`;
    }

    viewHistory(ruleId) {
        console.log('Viewing history for rule:', ruleId);
        // Show execution history modal
        this.showHistoryModal(ruleId);
    }

    runRule(ruleId) {
        const rule = this.rules.find(r => r.id === parseInt(ruleId));
        if (rule) {
            console.log('Running rule:', rule.name);
            this.showNotification(`Rule "${rule.name}" is now running...`, 'info');
            
            // Simulate rule execution
            setTimeout(() => {
                this.showNotification(`Rule "${rule.name}" completed successfully!`, 'success');
                // Update last run time
                rule.lastRun = 'Just now';
                rule.executions++;
                this.renderRules();
            }, 2000);
        }
    }

    showHistoryModal(ruleId) {
        const rule = this.rules.find(r => r.id === parseInt(ruleId));
        if (!rule) return;

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Execution History - ${rule.name}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="history-list">
                        ${this.generateHistoryItems(rule)}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    generateHistoryItems(rule) {
        const history = [];
        const statuses = ['success', 'success', 'success', 'failed', 'success'];
        
        for (let i = 0; i < 10; i++) {
            const status = statuses[i % statuses.length];
            const date = new Date();
            date.setHours(date.getHours() - i * 3);
            
            history.push(`
                <div class="history-item">
                    <div class="history-status ${status}">
                        <i class="fas fa-${status === 'success' ? 'check' : 'times'}"></i>
                    </div>
                    <div class="history-details">
                        <div class="history-time">${date.toLocaleString()}</div>
                        <div class="history-info">
                            ${status === 'success' ? 'Completed successfully' : 'Failed with errors'}
                            - Duration: ${Math.floor(Math.random() * 60) + 10}s
                        </div>
                    </div>
                </div>
            `);
        }
        
        return history.join('');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type} show`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Export for use in router
window.RulesListPage = RulesListPage;

// Function to initialize the page when called by router
window.initializeRulesListPage = function() {
    // Add a small delay to ensure DOM is fully rendered
    setTimeout(() => {
        if (!window.rulesListPage) {
            window.rulesListPage = new RulesListPage();
        } else {
            // Re-initialize if already exists (page reload)
            window.rulesListPage = new RulesListPage();
        }
    }, 100);
};