export function setupGeneratePredictionsPage() {
    const modelSearch = document.getElementById('model-search');
    const modelOptions = document.getElementById('model-options');
    const modelNameInput = document.getElementById('model-name');
    const modelDescriptionInput = document.getElementById('model-description');
    const modelFunctionInput = document.getElementById('model-function');
    const epochInput = document.getElementById('epoch');
    const hiddenLayersInput = document.getElementById('hidden-layers');
    const batchSizeInput = document.getElementById('batch-size');
    const testingDataSizeInput = document.getElementById('testing-data-size');
    const testingDataUnitInput = document.getElementById('testing-data-unit');
    const testingDataFromInput = document.getElementById('testing-data-from');
    const csvUpload = document.getElementById('csv-upload');
    const fileName = document.getElementById('file-name');
    const uploadButton = document.getElementById('upload-button');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    const eta = document.getElementById('eta');

    if (!modelSearch || !modelOptions) {
        console.error('Model search or options container not found');
        return;
    }

    let selectedFile = null;
    let models = [];

    // Fetch models and populate dropdown
    fetch('/api/models/me', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(fetchedModels => {
            console.log('Fetched models:', fetchedModels); // Debugging line
            models = fetchedModels || [];
            populateModelOptions(models);
        })
        .catch(error => {
            console.error('Error fetching models:', error);
            populateModelOptions([]); // Populate with empty array on error
        });

    function populateModelOptions(filteredModels) {
        modelOptions.innerHTML = ''; // Clear existing options

        // Add "Create New" option first
        const createNewDiv = document.createElement('div');
        createNewDiv.textContent = '+ Create New';
        createNewDiv.dataset.value = 'create-new';
        modelOptions.appendChild(createNewDiv);

        if (filteredModels.length > 0) {
            filteredModels.forEach(model => {
                const modelDiv = document.createElement('div');
                modelDiv.textContent = model.name;
                modelDiv.dataset.value = model.id;
                modelOptions.appendChild(modelDiv);
            });
        }
    }

    function clearFormFields() {
        modelNameInput.value = '';
        modelDescriptionInput.value = '';
        modelFunctionInput.value = '';
        epochInput.value = '';
        hiddenLayersInput.value = '';
        batchSizeInput.value = '';
        testingDataSizeInput.value = '';
        testingDataUnitInput.value = 'percentage';
        testingDataFromInput.value = 'random';
    }

    function populateFormFields(model) {
        modelNameInput.value = model.name || '';
        modelDescriptionInput.value = model.description || '';
        modelFunctionInput.value = model.function || '';
        epochInput.value = model.epoch || '';
        hiddenLayersInput.value = model.hidden_layers || '';
        batchSizeInput.value = model.batch_size || '';
        testingDataSizeInput.value = model.testing_data_size || '';
        testingDataUnitInput.value = model.testing_data_unit || 'percentage';
        testingDataFromInput.value = model.testing_data_from || 'random';
    }

    modelSearch.addEventListener('input', () => {
        const searchTerm = modelSearch.value.toLowerCase();
        const filteredModels = models.filter(model => model.name.toLowerCase().includes(searchTerm));
        populateModelOptions(filteredModels);
    });

    modelSearch.addEventListener('focus', () => {
        modelOptions.style.display = 'block';
    });

    document.addEventListener('click', (event) => {
        if (!modelSearch.contains(event.target) && !modelOptions.contains(event.target)) {
            modelOptions.style.display = 'none';
        }
    });

    modelOptions.addEventListener('click', (event) => {
        if (event.target.tagName === 'DIV') {
            const selectedValue = event.target.dataset.value;
            if (selectedValue === 'create-new') {
                clearFormFields();
                modelSearch.value = '';
            } else {
                const selectedModel = models.find(m => m.id == selectedValue);
                if (selectedModel) {
                    populateFormFields(selectedModel);
                    modelSearch.value = selectedModel.name;
                }
            }
            modelOptions.style.display = 'none';
        }
    });

    csvUpload.addEventListener('change', (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            fileName.textContent = selectedFile.name;
        } else {
            fileName.textContent = 'No file chosen';
        }
    });

    uploadButton.addEventListener('click', () => {
        if (selectedFile) {
            uploadFile(selectedFile);
        } else {
            alert('Please select a file to upload.');
        }
    });

    function uploadFile(file) {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);

        let startTime = Date.now();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                progressBar.style.width = percentComplete + '%';
                uploadStatus.textContent = `Uploading... ${Math.round(percentComplete)}%`;

                const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
                const uploadSpeed = event.loaded / elapsedTime; // bytes per second
                const remainingBytes = event.total - event.loaded;
                const remainingTime = remainingBytes / uploadSpeed; // in seconds

                eta.textContent = `ETA: ${formatTime(remainingTime)}`;
            }
        });

        xhr.addEventListener('load', () => {
            progressBar.style.width = '100%';
            uploadStatus.textContent = 'Upload Complete!';
            eta.textContent = '';
        });

        xhr.addEventListener('error', () => {
            uploadStatus.textContent = 'Upload Failed.';
            progressBar.style.width = '0%';
            eta.textContent = '';
        });

        xhr.open('POST', '/upload'); // Replace with your actual upload endpoint
        xhr.send(formData);
    }

    function formatTime(seconds) {
        if (seconds === Infinity || isNaN(seconds)) {
            return '...';
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    }
}
