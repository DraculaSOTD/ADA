import { fetchAuthenticatedData } from '../services/api.js';

class RuleHistoryManager {
    constructor() {
        this.ruleId = null;
        this.rule = null;
        this.executions = [];
        this.filteredExecutions = [];
        this.filters = {
            status: '',
            trigger: '',
            dateRange: ''
        };
    }

    async init() {
        // Get rule ID from URL
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        this.ruleId = urlParams.get('id');
        
        if (!this.ruleId) {
            alert('No rule ID provided');
            window.location.hash = '#rules-list';
            return;
        }

        await this.loadRule();
        await this.loadExecutions();
        this.setupEventListeners();
        this.updateStats();
        this.renderExecutions();
    }

    async loadRule() {
        try {
            const rule = await fetchAuthenticatedData(`/api/rules/${this.ruleId}`);
            if (rule && !rule.error) {
                this.rule = rule;
                document.getElementById('rule-name').textContent = `${rule.rule_name} - Execution History`;
            } else {
                throw new Error('Rule not found');
            }
        } catch (error) {
            console.error('Failed to load rule:', error);
            alert('Failed to load rule');
            window.location.hash = '#rules-list';
        }
    }

    async loadExecutions() {
        try {
            const executions = await fetchAuthenticatedData(`/api/rules/${this.ruleId}/executions`);
            this.executions = executions || [];
            this.filteredExecutions = [...this.executions];
        } catch (error) {
            console.error('Failed to load executions:', error);
            this.executions = [];
            this.filteredExecutions = [];
        }
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                await this.loadExecutions();
                this.applyFilters();
                this.updateStats();
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Refresh';
            });
        }

        // Execute button
        const executeBtn = document.getElementById('execute-btn');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => this.executeRule());
        }

        const firstExecuteBtn = document.getElementById('first-execute-btn');
        if (firstExecuteBtn) {
            firstExecuteBtn.addEventListener('click', () => this.executeRule());
        }

        // Filters
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }

        const triggerFilter = document.getElementById('trigger-filter');
        if (triggerFilter) {
            triggerFilter.addEventListener('change', (e) => {
                this.filters.trigger = e.target.value;
                this.applyFilters();
            });
        }

        const dateFilter = document.getElementById('date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.filters.dateRange = e.target.value;
                this.applyFilters();
            });
        }
    }

    applyFilters() {
        this.filteredExecutions = [...this.executions];

        // Status filter
        if (this.filters.status) {
            this.filteredExecutions = this.filteredExecutions.filter(exec => 
                exec.status === this.filters.status
            );
        }

        // Trigger filter
        if (this.filters.trigger) {
            this.filteredExecutions = this.filteredExecutions.filter(exec => 
                exec.trigger_type === this.filters.trigger
            );
        }

        // Date range filter
        if (this.filters.dateRange) {
            const now = new Date();
            let cutoffDate;

            switch (this.filters.dateRange) {
                case 'today':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
            }

            if (cutoffDate) {
                this.filteredExecutions = this.filteredExecutions.filter(exec => 
                    new Date(exec.created_at) >= cutoffDate
                );
            }
        }

        this.renderExecutions();
    }

    updateStats() {
        // Total executions
        const totalEl = document.getElementById('total-executions');
        if (totalEl) totalEl.textContent = this.executions.length;

        // Success count
        const successCount = this.executions.filter(e => e.status === 'completed').length;
        const successEl = document.getElementById('success-count');
        if (successEl) successEl.textContent = successCount;

        // Failed count
        const failedCount = this.executions.filter(e => e.status === 'failed').length;
        const failedEl = document.getElementById('failed-count');
        if (failedEl) failedEl.textContent = failedCount;

        // Average execution time
        const completedExecs = this.executions.filter(e => e.execution_time_ms);
        const avgTime = completedExecs.length > 0
            ? Math.round(completedExecs.reduce((sum, e) => sum + e.execution_time_ms, 0) / completedExecs.length)
            : 0;
        const avgTimeEl = document.getElementById('avg-time');
        if (avgTimeEl) avgTimeEl.textContent = `${avgTime}ms`;
    }

    renderExecutions() {
        const tbody = document.getElementById('history-tbody');
        const emptyState = document.getElementById('empty-state');
        const tableContainer = document.querySelector('.history-table-container');

        if (!tbody) return;

        if (this.filteredExecutions.length === 0) {
            tableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        tableContainer.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        tbody.innerHTML = this.filteredExecutions.map(exec => `
            <tr>
                <td><span class="execution-id">#${exec.id}</span></td>
                <td><span class="trigger-badge">${this.formatTriggerType(exec.trigger_type)}</span></td>
                <td><span class="status-badge ${exec.status}">${this.formatStatus(exec.status)}</span></td>
                <td><span class="execution-time">${this.formatDate(exec.created_at)}</span></td>
                <td><span class="execution-duration">${this.formatDuration(exec.execution_time_ms)}</span></td>
                <td><span class="token-cost">${exec.token_cost || 0}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="viewExecutionDetails(${exec.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${exec.status === 'failed' ? `
                            <button class="btn btn-sm btn-secondary btn-icon" onclick="retryExecution(${exec.id})">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async executeRule() {
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';

        try {
            const response = await fetchAuthenticatedData(`/api/rules/${this.ruleId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input_data: {},
                    trigger_type: 'manual'
                })
            });

            if (response && !response.error) {
                alert('Rule executed successfully!');
                await this.loadExecutions();
                this.updateStats();
                this.renderExecutions();
            } else {
                alert('Failed to execute rule: ' + (response.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error executing rule:', error);
            alert('Failed to execute rule');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    formatTriggerType(type) {
        const types = {
            manual: 'Manual',
            schedule: 'Scheduled',
            event: 'Event',
            model_complete: 'Model Complete',
            webhook: 'Webhook'
        };
        return types[type] || type;
    }

    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDuration(ms) {
        if (!ms) return '-';
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }

    async showExecutionDetails(executionId) {
        const execution = this.executions.find(e => e.id === executionId);
        if (!execution) return;

        const modal = document.getElementById('execution-modal');
        const detailsDiv = document.getElementById('execution-details');

        detailsDiv.innerHTML = `
            <div class="detail-section">
                <h3>General Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Execution ID</span>
                        <span class="detail-value">#${execution.id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">
                            <span class="status-badge ${execution.status}">${this.formatStatus(execution.status)}</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Trigger Type</span>
                        <span class="detail-value">${this.formatTriggerType(execution.trigger_type)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Started At</span>
                        <span class="detail-value">${this.formatDate(execution.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Completed At</span>
                        <span class="detail-value">${execution.completed_at ? this.formatDate(execution.completed_at) : '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duration</span>
                        <span class="detail-value">${this.formatDuration(execution.execution_time_ms)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Token Cost</span>
                        <span class="detail-value">${execution.token_cost || 0}</span>
                    </div>
                </div>
            </div>

            ${execution.error_message ? `
                <div class="detail-section">
                    <h3>Error Details</h3>
                    <div class="error-message">
                        ${this.escapeHtml(execution.error_message)}
                    </div>
                </div>
            ` : ''}

            <div class="detail-section">
                <h3>Input Data</h3>
                <div class="json-viewer">
                    <pre>${JSON.stringify(execution.input_data || {}, null, 2)}</pre>
                </div>
            </div>

            ${execution.output_data ? `
                <div class="detail-section">
                    <h3>Output Data</h3>
                    <div class="json-viewer">
                        <pre>${JSON.stringify(execution.output_data, null, 2)}</pre>
                    </div>
                </div>
            ` : ''}
        `;

        modal.style.display = 'flex';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions
window.viewExecutionDetails = function(executionId) {
    window.ruleHistoryManager.showExecutionDetails(executionId);
};

window.closeExecutionModal = function() {
    const modal = document.getElementById('execution-modal');
    if (modal) modal.style.display = 'none';
};

window.retryExecution = async function(executionId) {
    const execution = window.ruleHistoryManager.executions.find(e => e.id === executionId);
    if (!execution) return;

    if (!confirm('Retry this execution with the same input data?')) return;

    try {
        const response = await fetchAuthenticatedData(`/api/rules/${window.ruleHistoryManager.ruleId}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input_data: execution.input_data || {},
                trigger_type: 'manual'
            })
        });

        if (response && !response.error) {
            alert('Rule re-executed successfully!');
            window.ruleHistoryManager.loadExecutions();
            window.ruleHistoryManager.updateStats();
            window.ruleHistoryManager.renderExecutions();
        } else {
            alert('Failed to retry execution');
        }
    } catch (error) {
        console.error('Error retrying execution:', error);
        alert('Failed to retry execution');
    }
};

function setupRuleHistory() {
    window.ruleHistoryManager = new RuleHistoryManager();
    window.ruleHistoryManager.init();
}

export { setupRuleHistory };