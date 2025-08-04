import { fetchAuthenticatedData } from '../services/api.js';

async function setupSettingsPage() {
    const settingsForm = document.getElementById('settings-form');
    if (!settingsForm) return;

    // Fetch and populate initial settings
    const settings = await fetchAuthenticatedData('/api/settings/');
    if (settings) {
        for (const key in settings) {
            const input = settingsForm.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = settings[key];
                } else {
                    input.value = settings[key];
                }
            }
        }
    }

    // Handle form submission
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(settingsForm);
        const settingsData = {};
        formData.forEach((value, key) => {
            const input = settingsForm.querySelector(`[name="${key}"]`);
            if (input.type === 'checkbox') {
                settingsData[key] = input.checked;
            } else {
                settingsData[key] = value;
            }
        });

        const updatedSettings = await fetchAuthenticatedData('/api/settings/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });

        if (updatedSettings) {
            alert('Settings updated successfully!');
        } else {
            alert('Failed to update settings.');
        }
    });
}

export { setupSettingsPage };
