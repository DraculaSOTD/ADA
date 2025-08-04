document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        window.location.href = '/components/AuthPage/AuthPage.html';
        return;
    }

    fetch('/api/profile', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }
        return response.json();
    })
    .then(profile => {
        document.getElementById('firstName').value = profile.full_name.split(' ')[0];
        document.getElementById('lastName').value = profile.full_name.split(' ').slice(1).join(' ');
        document.getElementById('email').value = profile.email;
        document.getElementById('phone').value = profile.phone_number;
        document.getElementById('company').value = profile.company || '';
        document.getElementById('position').value = profile.position || '';
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
        window.location.href = '/components/AuthPage/AuthPage.html';
    });
});
