// Token Usage Tracker Component
class TokenUsageTracker {
    constructor() {
        // Tier-based token allocations
        this.tierAllocations = {
            developer: 10000,        // 10K tokens/month
            professional: 1000000,   // 1M tokens/month
            business: 10000000,      // 10M tokens/month
            enterprise: Infinity     // Unlimited
        };
        
        // Initialize with loading state
        this.tier = 'developer';
        this.monthlyLimit = 0;
        this.currentTokens = 0;
        this.usedTokens = 0;
        this.renewalDate = this.getNextRenewalDate();
        this.additionalTokens = 0; // Tokens purchased separately
        this.isLoading = true
        
        this.usage = {
            cleaning: 0,
            generation: 0,
            api: 0,
            training: 0,
            prediction: 0,
            other: 0
        };
    }

    async initialize(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('TokenUsageTracker: Container not found');
            return;
        }
        
        // Show loading state
        this.showLoadingState();
        
        // Load real token data from API
        await this.loadTokenDataFromAPI();
        
        // Also load any cached data
        this.loadTokenData();
        
        // Update display with real data
        this.updateDisplay();
        this.setupEventListeners();
        
        // Subscribe to token sync service if available
        if (window.tokenSyncService) {
            window.tokenSyncService.addListener((data) => {
                this.handleBalanceUpdate(data);
            });
        }
        
        // Update every 30 seconds
        this.updateInterval = setInterval(() => this.loadTokenDataFromAPI(), 30000);
    }

    async loadTokenDataFromAPI() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No auth token found');
                return;
            }
            
            const response = await fetch('/api/tokens/balance', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update with real API data
                this.currentTokens = data.current_balance || 0;
                this.monthlyLimit = data.token_limit || 10000;
                this.usedTokens = data.monthly_usage || 0;
                
                // Calculate days until reset
                if (data.days_until_reset) {
                    const resetDate = new Date();
                    resetDate.setDate(resetDate.getDate() + data.days_until_reset);
                    this.renewalDate = resetDate.toISOString();
                }
                
                // Get user tier from localStorage
                const userData = localStorage.getItem('user');
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        this.tier = user.subscription_tier || 'developer';
                    } catch (e) {
                        console.error('Failed to parse user data:', e);
                    }
                }
                
                this.isLoading = false;
                this.saveTokenData();
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Failed to fetch token balance:', error);
            this.isLoading = false;
            // Fall back to cached data
            this.loadTokenData();
        }
    }
    
    loadTokenData() {
        // Load from localStorage as fallback
        const savedData = localStorage.getItem('tokenUsageData');
        if (savedData) {
            const data = JSON.parse(savedData);
            // Only use cached data if we don't have API data
            if (this.isLoading || this.currentTokens === 0) {
                this.tier = data.tier || this.tier;
                this.monthlyLimit = data.monthlyLimit || this.tierAllocations[this.tier];
                this.usedTokens = data.usedTokens || 0;
                this.currentTokens = data.currentTokens || 0;
                this.additionalTokens = data.additionalTokens || 0;
                this.renewalDate = data.renewalDate || this.getNextRenewalDate();
                this.usage = data.usage || this.usage;
            }
            
            // Check if renewal date has passed
            if (new Date() >= new Date(this.renewalDate)) {
                this.resetMonthlyTokens();
            }
        }
    }

    showLoadingState() {
        const currentTokensEl = this.container.querySelector('#currentTokens');
        if (currentTokensEl) {
            currentTokensEl.textContent = 'Loading...';
        }
    }
    
    handleBalanceUpdate(data) {
        if (data && data.balance !== undefined) {
            this.currentTokens = data.balance;
            this.updateDisplay();
        }
    }
    
    saveTokenData() {
        const data = {
            tier: this.tier,
            currentTokens: this.currentTokens,
            monthlyLimit: this.monthlyLimit,
            usedTokens: this.usedTokens,
            additionalTokens: this.additionalTokens,
            renewalDate: this.renewalDate,
            usage: this.usage,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('tokenUsageData', JSON.stringify(data));
    }

    updateDisplay() {
        // Update token balance
        const currentTokensEl = this.container.querySelector('#currentTokens');
        if (currentTokensEl) {
            currentTokensEl.textContent = this.formatNumber(this.currentTokens);
        }

        // Update progress bar
        const progressFill = this.container.querySelector('#tokenProgressFill');
        const usedTokensEl = this.container.querySelector('#usedTokens');
        const totalTokensEl = this.container.querySelector('#totalTokens');
        
        if (progressFill && usedTokensEl && totalTokensEl) {
            const percentage = (this.usedTokens / this.monthlyLimit) * 100;
            progressFill.style.width = `${Math.min(percentage, 100)}%`;
            usedTokensEl.textContent = this.formatNumber(this.usedTokens);
            totalTokensEl.textContent = this.formatNumber(this.monthlyLimit);
            
            // Change color based on usage
            if (percentage > 90) {
                progressFill.style.backgroundColor = '#e53e3e';
            } else if (percentage > 75) {
                progressFill.style.backgroundColor = '#f59e0b';
            } else {
                progressFill.style.backgroundColor = 'var(--primary-color)';
            }
        }
        
        // Update renewal info
        const renewalText = this.container.querySelector('#renewalText');
        if (renewalText) {
            const daysUntilRenewal = this.getDaysUntilRenewal();
            renewalText.textContent = `Renews in ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? 's' : ''}`;
        }

        // Update tier badge
        const tierBadge = this.container.querySelector('#currentTierBadge');
        if (tierBadge) {
            const tierNames = {
                developer: 'Developer',
                professional: 'Professional',
                business: 'Business',
                enterprise: 'Enterprise'
            };
            tierBadge.textContent = tierNames[this.tier] || this.tier;
            tierBadge.className = 'tier-badge ' + this.tier;
        }

        // Update usage breakdown
        const cleaningUsage = this.container.querySelector('#cleaningUsage');
        const generationUsage = this.container.querySelector('#generationUsage');
        const trainingUsage = this.container.querySelector('#trainingUsage');
        const predictionUsage = this.container.querySelector('#predictionUsage');
        const apiUsage = this.container.querySelector('#apiUsage');
        
        if (cleaningUsage) cleaningUsage.textContent = this.formatNumber(this.usage.cleaning);
        if (generationUsage) generationUsage.textContent = this.formatNumber(this.usage.generation);
        if (trainingUsage) trainingUsage.textContent = this.formatNumber(this.usage.training);
        if (predictionUsage) predictionUsage.textContent = this.formatNumber(this.usage.prediction);
        if (apiUsage) apiUsage.textContent = this.formatNumber(this.usage.api);
    }

    setupEventListeners() {
        // Set up any event listeners if needed
    }

    useTokens(amount, category = 'api') {
        if (amount > this.currentTokens) {
            this.showInsufficientTokensAlert();
            return false;
        }

        this.currentTokens -= amount;
        
        // Track monthly usage only if we're using from monthly allocation
        const monthlyTokensAvailable = this.monthlyLimit - this.usedTokens;
        if (monthlyTokensAvailable > 0) {
            const fromMonthly = Math.min(amount, monthlyTokensAvailable);
            this.usedTokens += fromMonthly;
            
            // If amount exceeds monthly available, use additional tokens
            if (amount > fromMonthly) {
                this.additionalTokens -= (amount - fromMonthly);
            }
        } else {
            // All from additional tokens
            this.additionalTokens -= amount;
        }
        
        if (this.usage[category] !== undefined) {
            this.usage[category] += amount;
        } else {
            this.usage.other = (this.usage.other || 0) + amount;
        }

        this.saveTokenData();
        this.updateDisplay();
        
        // Check for low balance
        const percentageUsed = (this.usedTokens / this.monthlyLimit) * 100;
        if (percentageUsed > 80 && this.currentTokens < this.monthlyLimit * 0.2) {
            this.showLowBalanceWarning();
        }

        return true;
    }

    addTokens(amount) {
        this.additionalTokens += amount;
        this.currentTokens += amount;
        this.saveTokenData();
        this.updateDisplay();
    }

    formatNumber(num) {
        // Handle zero and small values properly
        if (num === 0) {
            return '0';
        }
        if (num < 1000) {
            return num.toLocaleString();
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }

    showPricingModal() {
        // Redirect to settings page subscription management
        window.location.hash = '#settings';
        setTimeout(() => {
            // Try to scroll to subscription section
            const subscriptionSection = document.getElementById('subscription-management');
            if (subscriptionSection) {
                subscriptionSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }

    createPricingModal() {
        // Deprecated - now redirects to settings
        this.showPricingModal();
    }

    closePricingModal() {
        // Deprecated - modal no longer exists
        console.log('Pricing modal deprecated - use settings page');
    }

    purchaseTokens(amount, price) {
        // Simulate token purchase
        console.log(`Purchasing ${this.formatNumber(amount)} tokens for $${price}`);
        
        // In real implementation, this would integrate with payment system
        setTimeout(() => {
            this.addTokens(amount);
            this.closePricingModal();
            this.showNotification(`Successfully purchased ${this.formatNumber(amount)} tokens!`, 'success');
        }, 1000);
    }

    showTierUpgrade() {
        console.log('Show tier upgrade options');
        // Implementation for tier upgrade modal
    }

    viewHistory() {
        console.log('View token usage history');
        // Implementation for history view
    }

    setupAutoRecharge() {
        console.log('Setup auto-recharge');
        // Implementation for auto-recharge settings
    }

    showInsufficientTokensAlert() {
        this.showNotification('Insufficient tokens. Please purchase more tokens to continue.', 'error');
        this.showPricingModal();
    }

    showLowBalanceWarning() {
        this.showNotification('Low token balance. Consider purchasing more tokens.', 'warning');
    }

    showNotification(message, type = 'info') {
        // Reuse notification system from main app
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback notification
            const notification = document.createElement('div');
            notification.className = `notification ${type} show`;
            notification.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                 type === 'error' ? 'exclamation-circle' : 
                                 type === 'warning' ? 'exclamation-triangle' :
                                 'info-circle'}"></i>
                <span>${message}</span>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    getNextRenewalDate() {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth.toISOString();
    }
    
    resetMonthlyTokens() {
        this.usedTokens = 0;
        this.currentTokens = this.monthlyLimit + this.additionalTokens;
        this.renewalDate = this.getNextRenewalDate();
        this.usage = {
            cleaning: 0,
            generation: 0,
            api: 0,
            training: 0,
            prediction: 0,
            other: 0
        };
        this.saveTokenData();
        this.updateDisplay();
        this.showNotification('Monthly tokens renewed!', 'success');
    }
    
    getDaysUntilRenewal() {
        const now = new Date();
        const renewal = new Date(this.renewalDate);
        const diffTime = Math.abs(renewal - now);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    
    upgradeTier(newTier) {
        if (this.tierAllocations[newTier] === undefined) {
            console.error('Invalid tier:', newTier);
            return;
        }
        
        const oldTier = this.tier;
        this.tier = newTier;
        this.monthlyLimit = this.tierAllocations[newTier];
        
        // If upgrading, add the difference to current tokens
        if (this.monthlyLimit > this.tierAllocations[oldTier]) {
            const difference = this.monthlyLimit - this.tierAllocations[oldTier];
            this.currentTokens += difference;
        }
        
        this.saveTokenData();
        this.updateDisplay();
        this.showNotification(`Upgraded to ${newTier} tier!`, 'success');
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}