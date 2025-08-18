import { StyledDropdown } from '../components/StyledDropdown/StyledDropdown.js';

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
    const csvUpload = document.getElementById('csv-upload');
    const fileName = document.getElementById('file-name');
    const uploadButton = document.getElementById('upload-button');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    const eta = document.getElementById('eta');
    
    // StyledDropdown instances
    let testingDataUnitDropdown = null;
    let testingDataFromDropdown = null;

    if (!modelSearch) {
        console.error('Model search element not found');
        return;
    }
    
    if (!modelOptions) {
        console.warn('Model options container not found - will be created dynamically');
    }

    let selectedFile = null;
    let models = [];

    // Initialize StyledDropdowns for testing data options
    initializeDropdowns();
    
    function initializeDropdowns() {
        // Initialize Testing Data Unit dropdown
        const unitContainer = document.getElementById('testing-data-unit-container');
        if (unitContainer) {
            testingDataUnitDropdown = new StyledDropdown(unitContainer, {
                id: 'testing-data-unit',
                placeholder: '%',
                options: [
                    { value: 'percentage', title: '%', icon: 'fas fa-percent' },
                    { value: 'rows', title: 'Rows', icon: 'fas fa-table' }
                ],
                value: 'percentage',
                onChange: (value) => {
                    console.log('Testing data unit changed to:', value);
                }
            });
        }
        
        // Initialize Testing Data From dropdown
        const fromContainer = document.getElementById('testing-data-from-container');
        if (fromContainer) {
            testingDataFromDropdown = new StyledDropdown(fromContainer, {
                id: 'testing-data-from',
                placeholder: 'Random',
                options: [
                    { value: 'random', title: 'Random', icon: 'fas fa-random' },
                    { value: 'first', title: 'First', icon: 'fas fa-arrow-up' },
                    { value: 'last', title: 'Last', icon: 'fas fa-arrow-down' }
                ],
                value: 'random',
                onChange: (value) => {
                    console.log('Testing data from changed to:', value);
                }
            });
        }
    }

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
        if (!modelOptions) return; // Exit if modelOptions doesn't exist
        
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
        if (testingDataUnitDropdown) {
            testingDataUnitDropdown.setValue('percentage');
        }
        if (testingDataFromDropdown) {
            testingDataFromDropdown.setValue('random');
        }
    }

    function populateFormFields(model) {
        modelNameInput.value = model.name || '';
        modelDescriptionInput.value = model.description || '';
        modelFunctionInput.value = model.function || '';
        epochInput.value = model.epoch || '';
        hiddenLayersInput.value = model.hidden_layers || '';
        batchSizeInput.value = model.batch_size || '';
        testingDataSizeInput.value = model.testing_data_size || '';
        if (testingDataUnitDropdown) {
            testingDataUnitDropdown.setValue(model.testing_data_unit || 'percentage');
        }
        if (testingDataFromDropdown) {
            testingDataFromDropdown.setValue(model.testing_data_from || 'random');
        }
    }

    modelSearch.addEventListener('input', () => {
        const searchTerm = modelSearch.value.toLowerCase();
        const filteredModels = models.filter(model => model.name.toLowerCase().includes(searchTerm));
        populateModelOptions(filteredModels);
    });

    modelSearch.addEventListener('focus', () => {
        if (modelOptions) {
            modelOptions.style.display = 'block';
        }
    });

    document.addEventListener('click', (event) => {
        if (modelOptions && !modelSearch.contains(event.target) && !modelOptions.contains(event.target)) {
            modelOptions.style.display = 'none';
        }
    });

    if (modelOptions) {
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
    }

    if (csvUpload) {
        csvUpload.addEventListener('change', (event) => {
            selectedFile = event.target.files[0];
            if (selectedFile && fileName) {
                fileName.textContent = selectedFile.name;
            } else if (fileName) {
                fileName.textContent = 'No file chosen';
            }
        });
    }

    if (uploadButton) {
        uploadButton.addEventListener('click', () => {
            if (selectedFile) {
                uploadFile(selectedFile);
            } else {
                alert('Please select a file to upload.');
            }
        });
    }

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
