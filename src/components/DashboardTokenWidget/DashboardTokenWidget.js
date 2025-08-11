export class DashboardTokenWidget {
    constructor() {
        this.container = null;
        this.updateInterval = null;
        this.chartInstance = null;
    }
    
    async initialize(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        await this.render();
        this.startAutoUpdate();
    }
    
    async render() {
        this.container.innerHTML = `
            <div class="token-widget-card">
                <div class="widget-header">
                    <h3>Token Usage Overview</h3>
                    <div class="widget-actions">
                        <button class="refresh-btn" title="Refresh">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="view-details-btn" title="View Details">
                            <i class="fas fa-chart-line"></i>
                        </button>
                    </div>
                </div>
                
                <div class="widget-content">
                    <div class="token-stats">
                        <div class="stat-item primary">
                            <div class="stat-value" id="current-balance">
                                <span class="loading-placeholder">--</span>
                            </div>
                            <div class="stat-label">Current Balance</div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-value" id="monthly-usage">
                                <span class="loading-placeholder">--</span>
                            </div>
                            <div class="stat-label">Monthly Usage</div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-value" id="usage-percentage">
                                <span class="loading-placeholder">--</span>
                            </div>
                            <div class="stat-label">Usage Rate</div>
                        </div>
                    </div>
                    
                    <div class="usage-chart-container">
                        <canvas id="usage-chart"></canvas>
                    </div>
                    
                    <div class="recent-activity">
                        <h4>Recent Activity</h4>
                        <div class="activity-list" id="recent-activity-list">
                            <div class="loading-spinner">
                                <i class="fas fa-spinner fa-spin"></i>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="widget-footer">
                    <a href="#dashboard?tab=tokens" class="view-all-link">
                        View All Transactions <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
        await this.loadData();
    }
    
    attachEventListeners() {
        const refreshBtn = this.container.querySelector('.refresh-btn');
        const viewDetailsBtn = this.container.querySelector('.view-details-btn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.animateRefresh(refreshBtn);
                this.loadData();
            });
        }
        
        if (viewDetailsBtn) {
            viewDetailsBtn.addEventListener('click', () => {
                window.location.hash = '#dashboard?tab=tokens';
            });
        }
    }
    
    animateRefresh(button) {
        button.classList.add('spinning');
        setTimeout(() => button.classList.remove('spinning'), 1000);
    }
    
    async loadData() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            // Fetch balance and analytics
            const [balanceData, analyticsData, recentTransactions] = await Promise.all([
                this.fetchWithAuth('/api/tokens/balance'),
                this.fetchWithAuth('/api/tokens/analytics?period=week'),
                this.fetchWithAuth('/api/tokens/usage?limit=5')
            ]);
            
            this.updateStats(balanceData);
            this.updateChart(analyticsData);
            this.updateRecentActivity(recentTransactions);
            
        } catch (error) {
            console.error('Error loading token data:', error);
            this.showError();
        }
    }
    
    async fetchWithAuth(url) {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
    }
    
    updateStats(data) {
        const balanceEl = document.getElementById('current-balance');
        const usageEl = document.getElementById('monthly-usage');
        const percentageEl = document.getElementById('usage-percentage');
        
        if (balanceEl) {
            balanceEl.innerHTML = this.formatNumber(data.current_balance);
        }
        
        if (usageEl) {
            usageEl.innerHTML = this.formatNumber(data.monthly_usage);
        }
        
        if (percentageEl) {
            const percentage = data.percentage_used || 0;
            percentageEl.innerHTML = `
                <div class="percentage-display ${this.getPercentageClass(percentage)}">
                    ${percentage.toFixed(1)}%
                </div>
            `;
        }
    }
    
    updateChart(analyticsData) {
        const canvas = document.getElementById('usage-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        
        // Create simple bar chart
        const usageByType = analyticsData.usage_by_type || {};
        const labels = Object.keys(usageByType);
        const data = labels.map(key => usageByType[key].total);
        
        // Simple chart implementation (replace with Chart.js in production)
        this.drawSimpleChart(ctx, labels, data);
    }
    
    drawSimpleChart(ctx, labels, data) {
        const canvas = ctx.canvas;
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = 150;
        
        ctx.clearRect(0, 0, width, height);
        
        if (labels.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', width / 2, height / 2);
            return;
        }
        
        const maxValue = Math.max(...data, 1);
        const barWidth = (width - 40) / labels.length;
        const chartHeight = height - 40;
        
        // Draw bars
        labels.forEach((label, index) => {
            const value = data[index] || 0;
            const barHeight = (value / maxValue) * chartHeight;
            const x = 20 + index * barWidth;
            const y = height - 20 - barHeight;
            
            // Bar
            ctx.fillStyle = '#6a5acd';
            ctx.fillRect(x + barWidth * 0.1, y, barWidth * 0.8, barHeight);
            
            // Label
            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(x + barWidth / 2, height - 5);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(label, 0, 0);
            ctx.restore();
            
            // Value
            if (value > 0) {
                ctx.fillStyle = '#333';
                ctx.font = '11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.formatNumber(value), x + barWidth / 2, y - 5);
            }
        });
    }
    
    updateRecentActivity(transactions) {
        const listEl = document.getElementById('recent-activity-list');
        if (!listEl) return;
        
        if (transactions.length === 0) {
            listEl.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }
        
        listEl.innerHTML = transactions.map(t => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${this.getActivityIcon(t.reason)}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-description">${t.reason}</div>
                    <div class="activity-time">${this.formatTime(t.created_at)}</div>
                </div>
                <div class="activity-amount ${t.change > 0 ? 'positive' : 'negative'}">
                    ${t.change > 0 ? '+' : ''}${this.formatNumber(Math.abs(t.change))}
                </div>
            </div>
        `).join('');
    }
    
    getActivityIcon(reason) {
        const reasonLower = reason?.toLowerCase() || '';
        if (reasonLower.includes('generat')) return 'fas fa-database';
        if (reasonLower.includes('train')) return 'fas fa-brain';
        if (reasonLower.includes('predict')) return 'fas fa-chart-line';
        if (reasonLower.includes('purchase')) return 'fas fa-shopping-cart';
        return 'fas fa-coins';
    }
    
    getPercentageClass(percentage) {
        if (percentage >= 90) return 'danger';
        if (percentage >= 70) return 'warning';
        return 'success';
    }
    
    formatNumber(num) {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toString();
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }
    
    showError() {
        const contentEl = this.container.querySelector('.widget-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load token data</p>
                    <button class="retry-btn" onclick="window.dashboardTokenWidget.loadData()">
                        Retry
                    </button>
                </div>
            `;
        }
    }
    
    startAutoUpdate() {
        // Update every 30 seconds
        this.updateInterval = setInterval(() => {
            this.loadData();
        }, 30000);
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Make available globally
window.DashboardTokenWidget = DashboardTokenWidget;