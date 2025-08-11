import { fetchAuthenticatedData } from '../services/api.js';
import { StyledDropdown } from '../../components/StyledDropdown/StyledDropdown.js';
import { loadComponentCSS } from '../services/componentLoader.js';

async function setupSettingsPage() {
    // Load dropdown CSS
    loadComponentCSS('src/components/StyledDropdown/StyledDropdown.css');
    
    // Initialize subscription management
    setupSubscriptionManagement();
    
    // Initialize styled dropdowns
    initializeDropdowns();
    
    // Handle toggle switches
    setupToggleSwitches();
    
    // Handle save button
    const saveButton = document.querySelector('.save-settings-btn');
    if (saveButton) {
        saveButton.addEventListener('click', saveSettings);
    }
    
    // Handle reset button
    const resetButton = document.querySelector('.reset-btn');
    if (resetButton) {
        resetButton.addEventListener('click', resetSettings);
    }
    
    // Load user settings
    await loadUserSettings();
}

// Dropdown instances
let dropdowns = {};

function initializeDropdowns() {
    // Language dropdown
    const languageContainer = document.querySelector('[data-setting="language"]')?.parentElement;
    if (languageContainer) {
        const languageDropdown = document.createElement('div');
        languageContainer.appendChild(languageDropdown);
        
        dropdowns.language = new StyledDropdown(languageDropdown, {
            id: 'language-dropdown',
            label: 'Language',
            placeholder: 'Select language',
            helperText: 'Choose your preferred language',
            options: [
                { value: 'en', title: 'English', icon: 'fas fa-flag-usa' },
                { value: 'es', title: 'Spanish', icon: 'fas fa-globe-americas' },
                { value: 'fr', title: 'French', icon: 'fas fa-globe-europe' },
                { value: 'de', title: 'German', icon: 'fas fa-globe-europe' },
                { value: 'zh', title: 'Chinese', icon: 'fas fa-globe-asia' }
            ],
            onChange: (value) => {
                console.log('Language changed to:', value);
            }
        });
        
        // Hide original select
        const originalSelect = document.querySelector('[data-setting="language"]');
        if (originalSelect) originalSelect.style.display = 'none';
    }
    
    // Timezone dropdown
    const timezoneContainer = document.querySelector('[data-setting="timezone"]')?.parentElement;
    if (timezoneContainer) {
        const timezoneDropdown = document.createElement('div');
        timezoneContainer.appendChild(timezoneDropdown);
        
        dropdowns.timezone = new StyledDropdown(timezoneDropdown, {
            id: 'timezone-dropdown',
            label: 'Timezone',
            placeholder: 'Select timezone',
            helperText: 'Set your local timezone',
            options: [
                { value: 'UTC', title: 'UTC', icon: 'fas fa-clock', description: 'Coordinated Universal Time' },
                { value: 'EST', title: 'Eastern Time', icon: 'fas fa-clock', description: 'UTC-5:00' },
                { value: 'PST', title: 'Pacific Time', icon: 'fas fa-clock', description: 'UTC-8:00' },
                { value: 'CET', title: 'Central European Time', icon: 'fas fa-clock', description: 'UTC+1:00' },
                { value: 'JST', title: 'Japan Standard Time', icon: 'fas fa-clock', description: 'UTC+9:00' }
            ],
            onChange: (value) => {
                console.log('Timezone changed to:', value);
            }
        });
        
        // Hide original select
        const originalSelect = document.querySelector('[data-setting="timezone"]');
        if (originalSelect) originalSelect.style.display = 'none';
    }
    
    // Session timeout dropdown
    const sessionContainer = document.querySelector('[data-setting="session-timeout"]')?.parentElement;
    if (sessionContainer) {
        const sessionDropdown = document.createElement('div');
        sessionContainer.appendChild(sessionDropdown);
        
        dropdowns.sessionTimeout = new StyledDropdown(sessionDropdown, {
            id: 'session-dropdown',
            label: 'Session Timeout',
            placeholder: 'Select timeout duration',
            helperText: 'Automatically log out after inactivity',
            options: [
                { value: '15', title: '15 minutes', icon: 'fas fa-hourglass-half' },
                { value: '30', title: '30 minutes', icon: 'fas fa-hourglass-half' },
                { value: '60', title: '1 hour', icon: 'fas fa-hourglass' },
                { value: '120', title: '2 hours', icon: 'fas fa-hourglass' },
                { value: 'never', title: 'Never', icon: 'fas fa-infinity' }
            ],
            onChange: (value) => {
                console.log('Session timeout changed to:', value);
            }
        });
        
        // Hide original select
        const originalSelect = document.querySelector('[data-setting="session-timeout"]');
        if (originalSelect) originalSelect.style.display = 'none';
    }
    
    // Data retention dropdown
    const retentionContainer = document.querySelector('[data-setting="data-retention"]')?.parentElement;
    if (retentionContainer) {
        const retentionDropdown = document.createElement('div');
        retentionContainer.appendChild(retentionDropdown);
        
        dropdowns.dataRetention = new StyledDropdown(retentionDropdown, {
            id: 'retention-dropdown',
            label: 'Data Retention',
            placeholder: 'Select retention period',
            helperText: 'How long to keep your data',
            options: [
                { value: '30', title: '30 days', icon: 'fas fa-calendar-day' },
                { value: '90', title: '90 days', icon: 'fas fa-calendar-alt' },
                { value: '365', title: '1 year', icon: 'fas fa-calendar' },
                { value: 'forever', title: 'Forever', icon: 'fas fa-infinity' }
            ],
            onChange: (value) => {
                console.log('Data retention changed to:', value);
            }
        });
        
        // Hide original select
        const originalSelect = document.querySelector('[data-setting="data-retention"]');
        if (originalSelect) originalSelect.style.display = 'none';
    }
    
    // Cache duration dropdown
    const cacheContainer = document.querySelector('[data-setting="cache-duration"]')?.parentElement;
    if (cacheContainer) {
        const cacheDropdown = document.createElement('div');
        cacheContainer.appendChild(cacheDropdown);
        
        dropdowns.cacheDuration = new StyledDropdown(cacheDropdown, {
            id: 'cache-dropdown',
            label: 'Cache Duration',
            placeholder: 'Select cache duration',
            helperText: 'How long to cache API responses',
            options: [
                { value: '0', title: 'No cache', icon: 'fas fa-ban' },
                { value: '5', title: '5 minutes', icon: 'fas fa-database' },
                { value: '15', title: '15 minutes', icon: 'fas fa-database' },
                { value: '30', title: '30 minutes', icon: 'fas fa-database' },
                { value: '60', title: '1 hour', icon: 'fas fa-database' }
            ],
            onChange: (value) => {
                console.log('Cache duration changed to:', value);
            }
        });
        
        // Hide original select
        const originalSelect = document.querySelector('[data-setting="cache-duration"]');
        if (originalSelect) originalSelect.style.display = 'none';
    }
}

function setupToggleSwitches() {
    const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            console.log(`${e.target.id} changed to:`, e.target.checked);
        });
    });
}

function setupSubscriptionManagement() {
    // Handle upgrade plan button
    const upgradePlanBtn = document.getElementById('upgradePlanBtn');
    if (upgradePlanBtn) {
        upgradePlanBtn.addEventListener('click', () => {
            const availablePlans = document.getElementById('availablePlans');
            if (availablePlans) {
                availablePlans.style.display = availablePlans.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    // Handle plan selection
    const planButtons = document.querySelectorAll('.select-plan-btn');
    planButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const plan = e.target.dataset.plan;
            if (plan === 'enterprise') {
                window.location.hash = '#contact-us';
            } else {
                // Handle plan upgrade
                console.log('Upgrading to plan:', plan);
            }
        });
    });
    
    // Load subscription data
    loadSubscriptionData();
}

async function loadSubscriptionData() {
    try {
        const userData = await fetchAuthenticatedData('/api/profile');
        const tokenData = await fetchAuthenticatedData('/api/tokens/usage');
        
        if (userData) {
            // Update plan badge
            const planBadge = document.getElementById('currentPlanBadge');
            if (planBadge) planBadge.textContent = userData.subscription_tier || 'Developer';
            
            // Update token limits
            const monthlyTokens = document.getElementById('monthlyTokens');
            if (monthlyTokens) monthlyTokens.textContent = formatNumber(userData.token_limit || 10000);
            
            // Calculate renewal date (30 days from now for demo)
            const renewalDate = document.getElementById('renewalDate');
            if (renewalDate) {
                const date = new Date();
                date.setDate(date.getDate() + 30);
                renewalDate.textContent = date.toLocaleDateString();
            }
            
            // Calculate days remaining
            const daysRemaining = document.getElementById('daysRemaining');
            if (daysRemaining) daysRemaining.textContent = '30';
        }
        
        if (tokenData) {
            // Calculate tokens used
            const tokensUsed = tokenData.reduce((sum, t) => sum + Math.abs(t.change || 0), 0);
            const tokensUsedEl = document.getElementById('tokensUsed');
            if (tokensUsedEl) tokensUsedEl.textContent = formatNumber(tokensUsed);
            
            // Update usage status
            const usageStatus = document.getElementById('usageStatus');
            const limit = userData?.token_limit || 10000;
            const percentage = (tokensUsed / limit) * 100;
            
            if (usageStatus) {
                if (percentage >= 90) {
                    usageStatus.textContent = 'Critical';
                    usageStatus.className = 'stat-value danger';
                } else if (percentage >= 70) {
                    usageStatus.textContent = 'High';
                    usageStatus.className = 'stat-value warning';
                } else {
                    usageStatus.textContent = 'Normal';
                    usageStatus.className = 'stat-value success';
                }
            }
        }
    } catch (error) {
        console.error('Error loading subscription data:', error);
    }
}

async function loadUserSettings() {
    try {
        const settings = await fetchAuthenticatedData('/api/settings/');
        if (settings) {
            // Set toggle switches
            for (const key in settings) {
                const toggle = document.getElementById(key.replace('_', '-'));
                if (toggle && toggle.type === 'checkbox') {
                    toggle.checked = settings[key];
                }
            }
            
            // Set dropdown values
            if (dropdowns.language && settings.language) {
                dropdowns.language.setValue(settings.language);
            }
            if (dropdowns.timezone && settings.timezone) {
                dropdowns.timezone.setValue(settings.timezone);
            }
            if (dropdowns.sessionTimeout && settings.session_timeout) {
                dropdowns.sessionTimeout.setValue(settings.session_timeout);
            }
            if (dropdowns.dataRetention && settings.data_retention) {
                dropdowns.dataRetention.setValue(settings.data_retention);
            }
            if (dropdowns.cacheDuration && settings.cache_duration) {
                dropdowns.cacheDuration.setValue(settings.cache_duration);
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    const settings = {
        // Get toggle values
        dark_mode: document.getElementById('dark-mode')?.checked || false,
        auto_save: document.getElementById('auto-save')?.checked || false,
        email_notifications: document.getElementById('email-notifications')?.checked || false,
        model_alerts: document.getElementById('model-alerts')?.checked || false,
        api_warnings: document.getElementById('api-warnings')?.checked || false,
        weekly_reports: document.getElementById('weekly-reports')?.checked || false,
        analytics: document.getElementById('analytics')?.checked || false,
        rate_limiting: document.getElementById('rate-limiting')?.checked || false,
        debug_mode: document.getElementById('debug-mode')?.checked || false,
        
        // Get dropdown values
        language: dropdowns.language?.getValue() || 'en',
        timezone: dropdowns.timezone?.getValue() || 'UTC',
        session_timeout: dropdowns.sessionTimeout?.getValue() || '30',
        data_retention: dropdowns.dataRetention?.getValue() || '90',
        cache_duration: dropdowns.cacheDuration?.getValue() || '5'
    };
    
    try {
        const result = await fetchAuthenticatedData('/api/settings/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        if (result) {
            showToast('Settings saved successfully!', 'success');
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error saving settings', 'error');
    }
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        // Reset toggles
        document.getElementById('dark-mode').checked = false;
        document.getElementById('auto-save').checked = true;
        document.getElementById('email-notifications').checked = true;
        document.getElementById('model-alerts').checked = true;
        document.getElementById('api-warnings').checked = true;
        document.getElementById('weekly-reports').checked = false;
        document.getElementById('analytics').checked = true;
        document.getElementById('rate-limiting').checked = true;
        document.getElementById('debug-mode').checked = false;
        
        // Reset dropdowns
        dropdowns.language?.setValue('en');
        dropdowns.timezone?.setValue('UTC');
        dropdowns.sessionTimeout?.setValue('30');
        dropdowns.dataRetention?.setValue('90');
        dropdowns.cacheDuration?.setValue('5');
        
        showToast('Settings reset to defaults', 'info');
    }
}

function showToast(message, type = 'info') {
    // Simple toast notification (will be replaced with proper toast component)
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

export { setupSettingsPage };
