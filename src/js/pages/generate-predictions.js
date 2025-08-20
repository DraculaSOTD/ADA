import { fetchAuthenticatedData } from '../services/api.js';
import { modelEditorPage } from './model-editor.js';

async function setupGeneratePredictionsPage() {
    // Initialize the model editor with styled dropdowns
    await modelEditorPage.initialize();
    const modelSearch = document.getElementById('model-search');
    const modelOptions = document.getElementById('model-options');
    const csvUpload = document.getElementById('csv-upload');
    const fileName = document.getElementById('file-name');
    const uploadButton = document.getElementById('upload-button');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    const eta = document.getElementById('eta');

    let models = [];

    async function loadModels() {
        models = await fetchAuthenticatedData('/api/models/me');
        if (models) {
            renderModelOptions(models);
        }
    }

    function renderModelOptions(modelsToRender) {
        if (!modelOptions) {
            console.warn('Model options container not found');
            return;
        }
        
        modelOptions.innerHTML = '';

        const createModelOption = document.createElement('div');
        createModelOption.textContent = '+ Create Model';
        createModelOption.addEventListener('click', () => {
            loadPage('CustomModelCreationPage');
        });
        modelOptions.appendChild(createModelOption);

        modelsToRender.forEach(model => {
            const option = document.createElement('div');
            option.textContent = model.name;
            option.dataset.modelId = model.id;
            option.addEventListener('click', () => {
                modelSearch.value = model.name;
                modelOptions.style.display = 'none';
            });
            modelOptions.appendChild(option);
        });
    }

    // Add null checks before adding event listeners
    if (modelSearch) {
        modelSearch.addEventListener('click', () => {
            if (modelOptions) {
                renderModelOptions(models);
                modelOptions.style.display = 'block';
            }
        });

        modelSearch.addEventListener('input', () => {
            const searchTerm = modelSearch.value.toLowerCase();
            const filteredModels = models.filter(model => model.name.toLowerCase().includes(searchTerm));
            if (modelOptions) {
                renderModelOptions(filteredModels);
                modelOptions.style.display = 'block';
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (modelSearch && modelOptions && !modelSearch.contains(e.target)) {
            modelOptions.style.display = 'none';
        }
    });

    if (csvUpload) {
        csvUpload.addEventListener('change', () => {
            if (csvUpload.files.length > 0 && fileName) {
                fileName.textContent = csvUpload.files[0].name;
            } else if (fileName) {
                fileName.textContent = 'No file chosen';
            }
        });
    }

    if (uploadButton) {
        uploadButton.addEventListener('click', async () => {
        if (csvUpload.files.length === 0) {
            alert('Please select a file to upload.');
            return;
        }

        const file = csvUpload.files[0];
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload/', true);
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                progressBar.style.width = `${percentComplete}%`;
                uploadStatus.textContent = `${Math.round(percentComplete)}%`;
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                uploadStatus.textContent = 'Upload complete!';
                eta.textContent = '';
                
                // Parse the CSV file and update the model editor
                if (modelEditorPage && modelEditorPage.handleFileUpload) {
                    modelEditorPage.handleFileUpload(file);
                }
            } else {
                uploadStatus.textContent = 'Upload failed.';
            }
        };

        xhr.onerror = () => {
            uploadStatus.textContent = 'Upload failed.';
        };

        xhr.send(formData);
        });
    }

    loadModels();
}

export { setupGeneratePredictionsPage };
