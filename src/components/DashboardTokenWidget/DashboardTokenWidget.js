class DashboardTokenWidget {
    constructor() {
        this.widgetContainer = null;
        this.refreshInterval = null;
        this.tokenUsageHistory = [];
    }
    
    initialize(containerId) {
        this.widgetContainer = document.getElementById(containerId);
        if (!this.widgetContainer) {
            console.error('Dashboard token widget container not found');
            return;
        }
        
        // Wait for TokenUsageTracker to be available
        if (window.tokenUsageTracker) {
            this.updateWidget();
            this.startAutoRefresh();
        } else {
            // Try to load TokenUsageTracker if not available
            const checkInterval = setInterval(() => {
                if (window.tokenUsageTracker) {
                    clearInterval(checkInterval);
                    this.updateWidget();
                    this.startAutoRefresh();
                }
            }, 100);
            
            // Stop checking after 5 seconds
            setTimeout(() => clearInterval(checkInterval), 5000);
        }
        
        // Load recent activities
        this.loadRecentActivities();
    }
    
    updateWidget() {
        const tracker = window.tokenUsageTracker;
        if (!tracker) return;
        
        // Update plan badge
        const planBadge = document.getElementById('dashboardPlanBadge');
        if (planBadge) {
            const tierNames = {
                developer: 'Developer',
                professional: 'Professional',
                business: 'Business',
                enterprise: 'Enterprise'
            };
            planBadge.textContent = tierNames[tracker.tier] || tracker.tier;
            planBadge.className = 'plan-badge ' + tracker.tier;
        }
        
        // Update token usage
        const tokensUsed = document.getElementById('dashboardTokensUsed');
        const tokenLimit = document.getElementById('dashboardTokenLimit');
        if (tokensUsed && tokenLimit) {
            tokensUsed.textContent = tracker.formatNumber(tracker.usedTokens);
            tokenLimit.textContent = tracker.formatNumber(tracker.monthlyLimit);
        }
        
        // Update days remaining
        const daysRemaining = document.getElementById('dashboardDaysRemaining');
        if (daysRemaining) {
            const now = new Date();
            const renewalDate = new Date(tracker.renewalDate);
            const days = Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24));
            daysRemaining.textContent = days > 0 ? days : 0;
        }
        
        // Update progress bar
        const progressBar = document.getElementById('dashboardTokenProgress');
        const progressPercentage = document.getElementById('dashboardTokenPercentage');
        if (progressBar && progressPercentage) {
            const percentage = (tracker.usedTokens / tracker.monthlyLimit) * 100;
            progressBar.style.width = `${Math.min(percentage, 100)}%`;
            progressPercentage.textContent = `${Math.round(percentage)}%`;
            
            // Change color based on usage
            if (percentage >= 90) {
                progressBar.classList.add('danger');
                progressBar.classList.remove('warning');
            } else if (percentage >= 75) {
                progressBar.classList.add('warning');
                progressBar.classList.remove('danger');
            } else {
                progressBar.classList.remove('warning', 'danger');
            }
        }
        
        // Update quick stats
        this.updateQuickStats();
    }
    
    updateQuickStats() {
        const tracker = window.tokenUsageTracker;
        if (!tracker) return;
        
        // Calculate average daily usage
        const avgDaily = document.getElementById('dashboardAvgDaily');
        if (avgDaily) {
            const startDate = new Date(tracker.startDate || Date.now());
            const daysPassed = Math.max(1, Math.ceil((Date.now() - startDate) / (1000 * 60 * 60 * 24)));
            const avgUsage = Math.round(tracker.usedTokens / daysPassed);
            avgDaily.textContent = tracker.formatNumber(avgUsage);
        }
        
        // Calculate projected monthly usage
        const projectedUsage = document.getElementById('dashboardProjectedUsage');
        if (projectedUsage) {
            const startDate = new Date(tracker.startDate || Date.now());
            const daysPassed = Math.max(1, Math.ceil((Date.now() - startDate) / (1000 * 60 * 60 * 24)));
            const avgUsage = tracker.usedTokens / daysPassed;
            const projected = Math.round(avgUsage * 30);
            projectedUsage.textContent = tracker.formatNumber(projected);
            
            // Add color coding
            if (projected > tracker.monthlyLimit) {
                projectedUsage.classList.add('danger');
                projectedUsage.classList.remove('warning', 'success');
            } else if (projected > tracker.monthlyLimit * 0.8) {
                projectedUsage.classList.add('warning');
                projectedUsage.classList.remove('danger', 'success');
            } else {
                projectedUsage.classList.add('success');
                projectedUsage.classList.remove('danger', 'warning');
            }
        }
        
        // Update status
        const status = document.getElementById('dashboardStatus');
        if (status) {
            const percentage = (tracker.usedTokens / tracker.monthlyLimit) * 100;
            if (percentage >= 95) {
                status.textContent = 'Critical';
                status.classList.add('danger');
                status.classList.remove('warning', 'success');
            } else if (percentage >= 80) {
                status.textContent = 'High';
                status.classList.add('warning');
                status.classList.remove('danger', 'success');
            } else {
                status.textContent = 'Normal';
                status.classList.add('success');
                status.classList.remove('danger', 'warning');
            }
        }
    }
    
    async loadRecentActivities() {
        try {
            const response = await fetch('/api/tokens/recent-usage', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            
            if (response.ok) {
                const activities = await response.json();
                this.displayRecentActivities(activities);
            }
        } catch (error) {
            console.error('Error loading recent activities:', error);
            // Use mock data for now
            this.displayMockActivities();
        }
    }
    
    displayRecentActivities(activities) {
        const activitiesList = document.getElementById('dashboardActivitiesList');
        if (!activitiesList) return;
        
        if (!activities || activities.length === 0) {
            activitiesList.innerHTML = `
                <div class="activity-item">
                    <span class="activity-time">No recent activity</span>
                    <span class="activity-description">Start using features to see token consumption</span>
                    <span class="activity-cost">--</span>
                </div>
            `;
            return;
        }
        
        activitiesList.innerHTML = '';
        activities.slice(0, 5).forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            
            const time = new Date(activity.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            item.innerHTML = `
                <span class="activity-time">${time}</span>
                <span class="activity-description">${activity.description}</span>
                <span class="activity-cost">${activity.tokens} tokens</span>
            `;
            
            activitiesList.appendChild(item);
        });
    }
    
    displayMockActivities() {
        // Display mock activities for demonstration
        const mockActivities = [
            { timestamp: Date.now() - 3600000, description: 'Data generation - 1000 rows', tokens: 3 },
            { timestamp: Date.now() - 7200000, description: 'Basic data cleaning - 5000 rows', tokens: 5 },
            { timestamp: Date.now() - 10800000, description: 'Model training completed', tokens: 25 },
            { timestamp: Date.now() - 86400000, description: 'Advanced data cleaning', tokens: 15 },
            { timestamp: Date.now() - 172800000, description: 'Data generation - 500 rows', tokens: 2 }
        ];
        
        this.displayRecentActivities(mockActivities);
    }
    
    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.updateWidget();
        }, 30000);
    }
    
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }
}

// Export for use in other modules
window.DashboardTokenWidget = DashboardTokenWidget;