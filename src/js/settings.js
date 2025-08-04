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
