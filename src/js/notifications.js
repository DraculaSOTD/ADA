document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        // No need to redirect, just don't load the data
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`
    };

    const alertsList = document.querySelector('.notifications-alerts-card .alerts-list');

    function loadNotifications() {
        fetch('/api/notifications/', { headers })
            .then(response => response.json())
            .then(notifications => {
                alertsList.innerHTML = ''; // Clear existing items
                notifications.forEach(notification => {
                    const alertItem = document.createElement('div');
                    alertItem.classList.add('alert-item');

                    const alertDot = document.createElement('div');
                    alertDot.classList.add('alert-dot');

                    const alertContent = document.createElement('div');
                    alertContent.classList.add('alert-content');

                    const alertTitle = document.createElement('span');
                    alertTitle.classList.add('alert-title');
                    alertTitle.textContent = notification.title;

                    const alertDescription = document.createElement('span');
                    alertDescription.classList.add('alert-description');
                    alertDescription.textContent = notification.message;

                    const alertTime = document.createElement('span');
                    alertTime.classList.add('alert-time');
                    alertTime.textContent = new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    alertContent.appendChild(alertTitle);
                    alertContent.appendChild(alertDescription);
                    alertItem.appendChild(alertDot);
                    alertItem.appendChild(alertContent);
                    alertItem.appendChild(alertTime);
                    alertsList.appendChild(alertItem);
                });
            })
            .catch(error => console.error('Error fetching notifications:', error));
    }

    loadNotifications();

    document.querySelector('.notifications-alerts-card .refresh-button').addEventListener('click', loadNotifications);
});
