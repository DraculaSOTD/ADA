import { fetchAuthenticatedData } from '../services/api.js';

class RulesListManager {
    constructor() {
        this.rules = [];
        this.filteredRules = [];
        this.executions = [];
        this.filters = {
            search: '',
            status: '',
            trigger: '',
            sort: 'created_desc'
        };
    }

    async init() {
        await this.loadRules();
        await this.loadExecutions();
        this.setupEventListeners();
        this.updateStats();
        this.renderRules();
    }

    async loadRules() {
        try {
            const rules = await fetchAuthenticatedData('/api/rules/');
            this.rules = rules || [];
            this.filteredRules = [...this.rules];
        } catch (error) {
            console.error('Failed to load rules:', error);
            this.rules = [];
            this.filteredRules = [];
        }
    }

    async loadExecutions() {
        try {
            const executions = await fetchAuthenticatedData('/api/rules/executions');
            this.executions = executions || [];
        } catch (error) {
            console.error('Failed to load executions:', error);
            this.executions = [];
        }
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('rule-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Trigger filter
        const triggerFilter = document.getElementById('trigger-filter');
        if (triggerFilter) {
            triggerFilter.addEventListener('change', (e) => {
                this.filters.trigger = e.target.value;
                this.applyFilters();
            });
        }

        // Sort filter
        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.applyFilters();
            });
        }
    }

    applyFilters() {
        // Start with all rules
        this.filteredRules = [...this.rules];

        // Apply search filter
        if (this.filters.search) {
            this.filteredRules = this.filteredRules.filter(rule => 
                rule.rule_name.toLowerCase().includes(this.filters.search) ||
                (rule.description && rule.description.toLowerCase().includes(this.filters.search))
            );
        }

        // Apply status filter
        if (this.filters.status) {
            this.filteredRules = this.filteredRules.filter(rule => {
                const isActive = rule.is_active ? 'active' : 'inactive';
                return isActive === this.filters.status;
            });
        }

        // Apply trigger filter
        if (this.filters.trigger) {
            this.filteredRules = this.filteredRules.filter(rule => {
                const triggerType = rule.trigger_config?.type || rule.trigger_type;
                return triggerType === this.filters.trigger;
            });
        }

        // Apply sorting
        this.sortRules();

        // Render filtered results
        this.renderRules();
    }

    sortRules() {
        switch (this.filters.sort) {
            case 'created_asc':
                this.filteredRules.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'created_desc':
                this.filteredRules.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'name_asc':
                this.filteredRules.sort((a, b) => a.rule_name.localeCompare(b.rule_name));
                break;
            case 'name_desc':
                this.filteredRules.sort((a, b) => b.rule_name.localeCompare(a.rule_name));
                break;
            case 'executions':
                this.filteredRules.sort((a, b) => {
                    const aExec = this.getExecutionCount(a.id);
                    const bExec = this.getExecutionCount(b.id);
                    return bExec - aExec;
                });
                break;
        }
    }

    getExecutionCount(ruleId) {
        return this.executions.filter(exec => exec.rule_id === ruleId).length;
    }

    getSuccessRate(ruleId) {
        const ruleExecutions = this.executions.filter(exec => exec.rule_id === ruleId);
        if (ruleExecutions.length === 0) return 0;
        
        const successful = ruleExecutions.filter(exec => exec.status === 'completed').length;
        return Math.round((successful / ruleExecutions.length) * 100);
    }

    getLastExecution(ruleId) {
        const ruleExecutions = this.executions.filter(exec => exec.rule_id === ruleId);
        if (ruleExecutions.length === 0) return null;
        
        return ruleExecutions.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        )[0];
    }

    updateStats() {
        // Total rules
        const totalRulesEl = document.getElementById('total-rules');
        if (totalRulesEl) totalRulesEl.textContent = this.rules.length;

        // Active rules
        const activeRules = this.rules.filter(rule => rule.is_active).length;
        const activeRulesEl = document.getElementById('active-rules');
        if (activeRulesEl) activeRulesEl.textContent = activeRules;

        // Total executions
        const totalExecutionsEl = document.getElementById('total-executions');
        if (totalExecutionsEl) totalExecutionsEl.textContent = this.executions.length;

        // Success rate
        const successful = this.executions.filter(exec => exec.status === 'completed').length;
        const successRate = this.executions.length > 0 
            ? Math.round((successful / this.executions.length) * 100) 
            : 0;
        const successRateEl = document.getElementById('success-rate');
        if (successRateEl) successRateEl.textContent = `${successRate}%`;
    }

    renderRules() {
        const rulesGrid = document.getElementById('rules-grid');
        const emptyState = document.getElementById('empty-state');
        
        if (!rulesGrid) return;

        if (this.filteredRules.length === 0) {
            rulesGrid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        rulesGrid.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        rulesGrid.innerHTML = this.filteredRules.map(rule => {
            const execCount = this.getExecutionCount(rule.id);
            const successRate = this.getSuccessRate(rule.id);
            const lastExec = this.getLastExecution(rule.id);
            const triggerType = rule.trigger_config?.type || rule.trigger_type || 'manual';

            return `
                <div class="rule-card" onclick="window.location.hash = '#rules-engine?edit=${rule.id}'">
                    <div class="rule-header">
                        <h3 class="rule-title">${this.escapeHtml(rule.rule_name)}</h3>
                        <span class="rule-status ${rule.is_active ? 'active' : 'inactive'}">
                            ${rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    
                    <p class="rule-description">
                        ${this.escapeHtml(rule.description || 'No description')}
                    </p>
                    
                    <div class="rule-meta">
                        <div class="meta-item">
                            <i class="fas fa-bolt"></i>
                            <span>${this.formatTriggerType(triggerType)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${this.formatDate(rule.created_at)}</span>
                        </div>
                        ${lastExec ? `
                            <div class="meta-item">
                                <i class="fas fa-sync"></i>
                                <span>Last run: ${this.formatRelativeTime(lastExec.created_at)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="rule-stats">
                        <div class="stat-item">
                            <div class="stat-item-value">${execCount}</div>
                            <div class="stat-item-label">Executions</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item-value">${successRate}%</div>
                            <div class="stat-item-label">Success</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item-value">${rule.token_cost || 0}</div>
                            <div class="stat-item-label">Token Cost</div>
                        </div>
                    </div>
                    
                    <div class="rule-actions">
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); executeRule(${rule.id})">
                            <i class="fas fa-play"></i> Execute
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); viewHistory(${rule.id})">
                            <i class="fas fa-history"></i> History
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteRule(${rule.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatTriggerType(type) {
        const types = {
            manual: 'Manual',
            schedule: 'Scheduled',
            event: 'Event-based',
            model_complete: 'Model Completion',
            webhook: 'Webhook'
        };
        return types[type] || type;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions for button actions
window.executeRule = async function(ruleId) {
    try {
        const response = await fetchAuthenticatedData(`/api/rules/${ruleId}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input_data: {},
                trigger_type: 'manual'
            })
        });
        
        if (response && !response.error) {
            alert('Rule executed successfully!');
            // Reload to update stats
            window.rulesListManager.loadExecutions();
            window.rulesListManager.renderRules();
        } else {
            alert('Failed to execute rule');
        }
    } catch (error) {
        console.error('Error executing rule:', error);
        alert('Failed to execute rule');
    }
};

window.viewHistory = function(ruleId) {
    window.location.hash = `#rule-history?id=${ruleId}`;
};

window.deleteRule = async function(ruleId) {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
        const response = await fetchAuthenticatedData(`/api/rules/${ruleId}`, {
            method: 'DELETE'
        });
        
        if (response && !response.error) {
            alert('Rule deleted successfully!');
            // Reload rules
            window.rulesListManager.loadRules();
            window.rulesListManager.updateStats();
            window.rulesListManager.renderRules();
        } else {
            alert('Failed to delete rule');
        }
    } catch (error) {
        console.error('Error deleting rule:', error);
        alert('Failed to delete rule');
    }
};

function setupRulesList() {
    window.rulesListManager = new RulesListManager();
    window.rulesListManager.init();
}

export { setupRulesList };