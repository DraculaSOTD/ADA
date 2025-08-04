import { fetchAuthenticatedData } from '../services/api.js';

async function setupUserProfilePage() {
    const profileForm = document.getElementById('user-profile-form');
    if (!profileForm) return;

    // Fetch and populate initial profile data
    const profile = await fetchAuthenticatedData('/api/profile');
    if (profile) {
        for (const key in profile) {
            const input = profileForm.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = profile[key];
            }
        }
    }

    // Handle form submission
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(profileForm);
        const profileData = {};
        formData.forEach((value, key) => {
            profileData[key] = value;
        });

        const updatedProfile = await fetchAuthenticatedData('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });

        if (updatedProfile) {
            alert('Profile updated successfully!');
        } else {
            alert('Failed to update profile.');
        }
    });
}

export { setupUserProfilePage };
