document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        // No need to redirect, just don't load the data
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`
    };

    const performanceList = document.querySelector('.model-performance-card .performance-list');

    function loadModelPerformance() {
        fetch('/api/models/me', { headers })
            .then(response => response.json())
            .then(models => {
                performanceList.innerHTML = ''; // Clear existing items
                models.forEach(model => {
                    const performanceItem = document.createElement('div');
                    performanceItem.classList.add('performance-item');

                    const modelName = document.createElement('span');
                    modelName.classList.add('model-name');
                    modelName.textContent = model.name;

                    const progressBarContainer = document.createElement('div');
                    progressBarContainer.classList.add('progress-bar-container');

                    const progressBar = document.createElement('div');
                    progressBar.classList.add('progress-bar');
                    const performance = model.performance && model.performance.accuracy ? model.performance.accuracy * 100 : 0;
                    progressBar.style.width = `${performance}%`;

                    const percentage = document.createElement('span');
                    percentage.classList.add('percentage');
                    percentage.textContent = `${performance.toFixed(0)}%`;

                    progressBarContainer.appendChild(progressBar);
                    performanceItem.appendChild(modelName);
                    performanceItem.appendChild(progressBarContainer);
                    performanceItem.appendChild(percentage);
                    performanceList.appendChild(performanceItem);
                });
            })
            .catch(error => console.error('Error fetching model performance:', error));
    }

    loadModelPerformance();

    document.querySelector('.model-performance-card .refresh-button').addEventListener('click', loadModelPerformance);
});
