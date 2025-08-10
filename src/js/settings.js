document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        window.location.href = '/components/AuthPage/AuthPage.html';
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Initialize subscription management
    initializeSubscriptionManagement();

    // Fetch and populate settings
    fetch('/api/settings/', { headers })
        .then(response => response.json())
        .then(settings => {
            document.getElementById('dark-mode').checked = settings.dark_mode;
            document.getElementById('auto-save').checked = settings.auto_save;
            document.querySelector('.setting-select[data-setting="language"]').value = settings.language;
            document.querySelector('.setting-select[data-setting="timezone"]').value = settings.timezone;
            document.getElementById('email-notifications').checked = settings.email_notifications;
            document.getElementById('model-alerts').checked = settings.model_completion_alerts;
            document.getElementById('api-warnings').checked = settings.api_usage_warnings;
            document.getElementById('weekly-reports').checked = settings.weekly_reports;
            document.getElementById('analytics').checked = settings.data_analytics;
            document.querySelector('.setting-select[data-setting="session-timeout"]').value = settings.session_timeout_minutes;
            document.querySelector('.setting-select[data-setting="data-retention"]').value = settings.data_retention_days;
            document.getElementById('rate-limiting').checked = settings.api_rate_limiting_enabled;
            document.getElementById('debug-mode').checked = settings.debug_mode;
            document.querySelector('.setting-select[data-setting="cache-duration"]').value = settings.cache_duration_minutes;
        })
        .catch(error => console.error('Error fetching settings:', error));

    // Save settings
    document.querySelector('.save-settings-btn').addEventListener('click', () => {
        const settings = {
            dark_mode: document.getElementById('dark-mode').checked,
            auto_save: document.getElementById('auto-save').checked,
            language: document.querySelector('.setting-select[data-setting="language"]').value,
            timezone: document.querySelector('.setting-select[data-setting="timezone"]').value,
            email_notifications: document.getElementById('email-notifications').checked,
            model_completion_alerts: document.getElementById('model-alerts').checked,
            api_usage_warnings: document.getElementById('api-warnings').checked,
            weekly_reports: document.getElementById('weekly-reports').checked,
            data_analytics: document.getElementById('analytics').checked,
            session_timeout_minutes: parseInt(document.querySelector('.setting-select[data-setting="session-timeout"]').value),
            data_retention_days: parseInt(document.querySelector('.setting-select[data-setting="data-retention"]').value),
            api_rate_limiting_enabled: document.getElementById('rate-limiting').checked,
            debug_mode: document.getElementById('debug-mode').checked,
            cache_duration_minutes: parseInt(document.querySelector('.setting-select[data-setting="cache-duration"]').value)
        };

        fetch('/api/settings/', {
            method: 'PUT',
            headers,
            body: JSON.stringify(settings)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Settings saved:', data);
            alert('Settings saved successfully!');
        })
        .catch(error => console.error('Error saving settings:', error));
    });
});

// Subscription Management Functions
function initializeSubscriptionManagement() {
    // Load current subscription info from token tracker
    if (window.tokenUsageTracker) {
        updateSubscriptionDisplay();
    } else {
        // Initialize token tracker if not already loaded
        const script = document.createElement('script');
        script.src = '/src/components/TokenUsageTracker/TokenUsageTracker.js';
        script.onload = () => {
            window.tokenUsageTracker = new TokenUsageTracker();
            updateSubscriptionDisplay();
        };
        document.body.appendChild(script);
    }
    
    // Setup event listeners
    const upgradePlanBtn = document.getElementById('upgradePlanBtn');
    if (upgradePlanBtn) {
        upgradePlanBtn.addEventListener('click', togglePlansDisplay);
    }
    
    // Setup plan selection buttons
    const selectPlanBtns = document.querySelectorAll('.select-plan-btn');
    selectPlanBtns.forEach(btn => {
        btn.addEventListener('click', (e) => handlePlanSelection(e));
    });
    
    // Setup billing management buttons
    const manageBillingBtn = document.querySelector('.manage-billing-btn');
    if (manageBillingBtn) {
        manageBillingBtn.addEventListener('click', openBillingPortal);
    }
    
    const updatePaymentBtn = document.querySelector('.update-payment-btn');
    if (updatePaymentBtn) {
        updatePaymentBtn.addEventListener('click', openPaymentModal);
    }
}

function updateSubscriptionDisplay() {
    const tracker = window.tokenUsageTracker;
    if (!tracker) return;
    
    // Update current plan badge
    const planBadge = document.getElementById('currentPlanBadge');
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
    
    // Update monthly tokens
    const monthlyTokensEl = document.getElementById('monthlyTokens');
    if (monthlyTokensEl) {
        monthlyTokensEl.textContent = tracker.formatNumber(tracker.monthlyLimit);
    }
    
    // Update renewal date
    const renewalDateEl = document.getElementById('renewalDate');
    if (renewalDateEl) {
        const renewalDate = new Date(tracker.renewalDate);
        renewalDateEl.textContent = renewalDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    // Update tokens used
    const tokensUsedEl = document.getElementById('tokensUsed');
    if (tokensUsedEl) {
        tokensUsedEl.textContent = tracker.formatNumber(tracker.usedTokens);
    }
    
    // Update plan selection buttons
    updatePlanButtons(tracker.tier);
}

function togglePlansDisplay() {
    const availablePlans = document.getElementById('availablePlans');
    if (availablePlans) {
        availablePlans.style.display = availablePlans.style.display === 'none' ? 'block' : 'none';
    }
}

function updatePlanButtons(currentTier) {
    const selectPlanBtns = document.querySelectorAll('.select-plan-btn');
    selectPlanBtns.forEach(btn => {
        const plan = btn.dataset.plan;
        if (plan === currentTier) {
            btn.textContent = 'Current Plan';
            btn.disabled = true;
            btn.style.opacity = '0.7';
        } else if (plan === 'enterprise') {
            btn.textContent = 'Contact Sales';
        } else {
            btn.textContent = 'Select Plan';
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    });
}

function handlePlanSelection(e) {
    const btn = e.target;
    const selectedPlan = btn.dataset.plan;
    
    if (selectedPlan === 'enterprise') {
        window.location.href = 'mailto:sales@ada-platform.com?subject=Enterprise Plan Inquiry';
        return;
    }
    
    // Show confirmation dialog
    const planNames = {
        developer: 'Developer (Free)',
        professional: 'Professional ($49/month)',
        business: 'Business ($199/month)'
    };
    
    if (confirm(`Are you sure you want to switch to the ${planNames[selectedPlan]} plan?`)) {
        // Update the tier
        if (window.tokenUsageTracker) {
            window.tokenUsageTracker.upgradeTier(selectedPlan);
            updateSubscriptionDisplay();
            togglePlansDisplay();
            
            // Show success notification
            showNotification(`Successfully switched to ${planNames[selectedPlan]} plan!`, 'success');
        }
    }
}

function openBillingPortal() {
    // In a real implementation, this would open Stripe billing portal or similar
    alert('Billing portal would open here. This is a demo implementation.');
}

function openPaymentModal() {
    // In a real implementation, this would open payment method update modal
    alert('Payment method update modal would open here. This is a demo implementation.');
}

function showNotification(message, type = 'info') {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
