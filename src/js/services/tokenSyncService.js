/**
 * Token Sync Service
 * Manages real-time token balance synchronization across the application
 */

import { fetchAuthenticatedData } from './api.js';

class TokenSyncService {
    constructor() {
        this.updateInterval = 30000; // 30 seconds
        this.intervalId = null;
        this.listeners = new Set();
        this.lastBalance = null;
        this.isUpdating = false;
        this.lowBalanceThreshold = 100;
        this.warningBalanceThreshold = 0.2; // 20% of monthly limit
    }

    /**
     * Initialize the token sync service
     */
    async initialize() {
        // Get initial balance
        await this.updateBalance();
        
        // Start periodic updates
        this.startPeriodicUpdates();
        
        // Listen for visibility changes to pause/resume updates
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopPeriodicUpdates();
            } else {
                this.startPeriodicUpdates();
                this.updateBalance(); // Update immediately when page becomes visible
            }
        });
        
        // Listen for focus to update balance
        window.addEventListener('focus', () => {
            this.updateBalance();
        });
    }

    /**
     * Start periodic balance updates
     */
    startPeriodicUpdates() {
        if (this.intervalId) return;
        
        this.intervalId = setInterval(() => {
            this.updateBalance();
        }, this.updateInterval);
    }

    /**
     * Stop periodic balance updates
     */
    stopPeriodicUpdates() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Update token balance from API
     */
    async updateBalance() {
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        
        try {
            const balanceData = await fetchAuthenticatedData('/api/tokens/balance');
            
            if (balanceData && balanceData.current_balance !== undefined) {
                const newBalance = balanceData.current_balance;
                const hasChanged = this.lastBalance !== null && this.lastBalance !== newBalance;
                
                // Update stored balance
                this.lastBalance = newBalance;
                
                // Update localStorage
                const userData = this.getUserData();
                userData.token_balance = newBalance;
                userData.monthly_usage = balanceData.monthly_usage || 0;
                userData.token_limit = balanceData.token_limit || 10000;
                userData.percentage_used = balanceData.percentage_used || 0;
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Update UI elements
                this.updateUIElements(newBalance);
                
                // Check for low balance warnings
                this.checkBalanceWarnings(newBalance, balanceData);
                
                // Notify listeners
                if (hasChanged) {
                    this.notifyListeners({
                        balance: newBalance,
                        previousBalance: this.lastBalance,
                        data: balanceData
                    });
                }
                
                return balanceData;
            } else {
                // Fallback: Use stored balance from localStorage
                const userData = this.getUserData();
                if (userData.token_balance !== undefined) {
                    this.updateUIElements(userData.token_balance);
                    return {
                        current_balance: userData.token_balance,
                        monthly_usage: userData.monthly_usage || 0,
                        token_limit: userData.token_limit || 10000,
                        percentage_used: userData.percentage_used || 0
                    };
                }
            }
        } catch (error) {
            console.error('Failed to update token balance:', error);
        } finally {
            this.isUpdating = false;
        }
        
        return null;
    }

    /**
     * Update UI elements with new balance
     */
    updateUIElements(balance) {
        // Update sidebar token display
        const tokenAmountElement = document.querySelector('.sidebar .token-amount');
        if (tokenAmountElement) {
            tokenAmountElement.textContent = this.formatTokenAmount(balance);
            
            // Add animation class for balance change
            tokenAmountElement.classList.add('balance-updated');
            setTimeout(() => {
                tokenAmountElement.classList.remove('balance-updated');
            }, 1000);
        }
        
        // Update any other balance displays
        const balanceDisplays = document.querySelectorAll('[data-token-balance]');
        balanceDisplays.forEach(element => {
            element.textContent = this.formatTokenAmount(balance);
        });
    }

    /**
     * Format token amount with K/M suffixes
     */
    formatTokenAmount(amount) {
        // Handle zero and small values
        if (amount === 0) {
            return '0';
        }
        if (amount < 1000) {
            return amount.toLocaleString();
        }
        // Apply K/M formatting only for 1000+
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `${(amount / 1000).toFixed(1)}K`;
        }
        return amount.toLocaleString();
    }

    /**
     * Check for balance warnings
     */
    checkBalanceWarnings(balance, balanceData) {
        const userData = this.getUserData();
        const monthlyLimit = balanceData.token_limit || userData.token_limit || 10000;
        const percentageUsed = balanceData.percentage_used || 0;
        
        // Check for critically low balance
        if (balance < this.lowBalanceThreshold) {
            this.showLowBalanceWarning(balance);
        }
        
        // Check for high usage warning (>80% of monthly limit)
        if (percentageUsed > 80) {
            this.showHighUsageWarning(percentageUsed, monthlyLimit);
        }
    }

    /**
     * Show low balance warning
     */
    showLowBalanceWarning(balance) {
        // Add warning badge to sidebar
        const tokenLabel = document.querySelector('.sidebar .token-label');
        if (tokenLabel && !tokenLabel.querySelector('.warning-badge')) {
            const badge = document.createElement('span');
            badge.className = 'warning-badge';
            badge.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            badge.title = `Low balance: ${balance} tokens remaining`;
            tokenLabel.appendChild(badge);
        }
        
        // Show notification if available
        if (window.app && window.app.showNotification) {
            window.app.showNotification({
                type: 'warning',
                title: 'Low Token Balance',
                message: `You have only ${balance} tokens remaining. Consider purchasing more tokens.`,
                duration: 10000,
                action: {
                    text: 'Purchase Tokens',
                    callback: () => window.location.hash = '#tokens'
                }
            });
        }
    }

    /**
     * Show high usage warning
     */
    showHighUsageWarning(percentageUsed, monthlyLimit) {
        if (window.app && window.app.showNotification) {
            window.app.showNotification({
                type: 'warning',
                title: 'High Token Usage',
                message: `You've used ${percentageUsed.toFixed(0)}% of your monthly limit (${this.formatTokenAmount(monthlyLimit)} tokens).`,
                duration: 8000
            });
        }
    }

    /**
     * Get user data from localStorage
     */
    getUserData() {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {
                return { token_balance: 0 };
            }
        }
        return { token_balance: 0 };
    }

    /**
     * Force an immediate balance update
     */
    async forceUpdate() {
        return await this.updateBalance();
    }

    /**
     * Add a listener for balance changes
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remove a listener
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of balance change
     */
    notifyListeners(data) {
        this.listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in token balance listener:', error);
            }
        });
    }

    /**
     * Track token usage for an operation
     */
    async trackUsage(operation, tokens, details = {}) {
        const usage = {
            operation,
            tokens,
            timestamp: Date.now(),
            details
        };
        
        // Store in localStorage for history
        const usageHistory = this.getUsageHistory();
        usageHistory.push(usage);
        
        // Keep only last 100 entries
        if (usageHistory.length > 100) {
            usageHistory.shift();
        }
        
        localStorage.setItem('tokenUsageHistory', JSON.stringify(usageHistory));
        
        // Update balance after operation
        await this.updateBalance();
    }

    /**
     * Get token usage history
     */
    getUsageHistory() {
        const history = localStorage.getItem('tokenUsageHistory');
        if (history) {
            try {
                return JSON.parse(history);
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    /**
     * Get usage statistics
     */
    getUsageStats() {
        const history = this.getUsageHistory();
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        
        const stats = {
            total: 0,
            today: 0,
            thisWeek: 0,
            byOperation: {}
        };
        
        history.forEach(item => {
            stats.total += item.tokens;
            
            if (item.timestamp > dayAgo) {
                stats.today += item.tokens;
            }
            
            if (item.timestamp > weekAgo) {
                stats.thisWeek += item.tokens;
            }
            
            if (!stats.byOperation[item.operation]) {
                stats.byOperation[item.operation] = 0;
            }
            stats.byOperation[item.operation] += item.tokens;
        });
        
        return stats;
    }

    /**
     * Clean up the service
     */
    destroy() {
        this.stopPeriodicUpdates();
        this.listeners.clear();
    }
}

// Create singleton instance
const tokenSyncService = new TokenSyncService();

// Export for use in other modules
export { tokenSyncService };

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.tokenSyncService = tokenSyncService;
}