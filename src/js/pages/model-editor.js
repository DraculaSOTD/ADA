import { StyledDropdown } from '../../components/StyledDropdown/StyledDropdown.js';
import { loadComponentCSS } from '../services/componentLoader.js';
import tokenService from '../services/token_service.js';

class ModelEditorPage {
    constructor() {
        this.dropdowns = {};
        this.modelHistoryVersions = 0;
        this.tokenCosts = {
            versionCost: 100,
            trainingBaseCost: 1000
        };
    }

    async initialize() {
        // Load StyledDropdown CSS
        loadComponentCSS('src/components/StyledDropdown/StyledDropdown.css');
        
        this.setupDropdowns();
        this.setupEventListeners();
        this.updateCostCalculations();
    }

    setupDropdowns() {
        // Model selector dropdown
        const modelSelectorContainer = document.querySelector('.model-selector-container');
        if (modelSelectorContainer) {
            modelSelectorContainer.innerHTML = '<div id="model-selector-dropdown"></div>';
            this.dropdowns.modelSelector = new StyledDropdown(
                document.getElementById('model-selector-dropdown'),
                {
                    id: 'model-selector',
                    placeholder: 'Search or select a model...',
                    searchable: true,
                    options: [
                        { value: 'model1', title: 'Customer Churn Predictor', icon: 'fas fa-chart-line' },
                        { value: 'model2', title: 'Sales Forecast Model', icon: 'fas fa-chart-bar' },
                        { value: 'model3', title: 'Sentiment Analyzer', icon: 'fas fa-brain' },
                        { value: 'new', title: 'Create New Model', icon: 'fas fa-plus' }
                    ],
                    onChange: (value) => this.loadModelData(value)
                }
            );
        }

        // Replace all dropdowns in tagged data section
        const taggedDataSection = document.querySelector('.tagged-data');
        if (taggedDataSection) {
            const dropdownSelects = taggedDataSection.querySelectorAll('select.description-dropdown');
            dropdownSelects.forEach((select, index) => {
                const container = document.createElement('div');
                container.className = 'dropdown-container';
                select.parentNode.replaceChild(container, select);

                const isTrainValue = index % 4 === 0;
                const isTrainDesc = index % 4 === 1;
                const isPredictValue = index % 4 === 2;
                const isPredictDesc = index % 4 === 3;

                let options = [];
                if (isTrainValue || isPredictValue) {
                    options = [
                        { value: 'val1', title: 'Customer ID', icon: 'fas fa-id-card' },
                        { value: 'val2', title: 'Purchase Amount', icon: 'fas fa-dollar-sign' },
                        { value: 'val3', title: 'Product Category', icon: 'fas fa-tags' },
                        { value: 'val4', title: 'Date', icon: 'fas fa-calendar' }
                    ];
                } else {
                    options = [
                        { value: 'col1', title: 'Column 1', icon: 'fas fa-columns' },
                        { value: 'col2', title: 'Column 2', icon: 'fas fa-columns' },
                        { value: 'col3', title: 'Column 3', icon: 'fas fa-columns' },
                        { value: 'col4', title: 'Column 4', icon: 'fas fa-columns' }
                    ];
                }

                const dropdownId = `dropdown-${index}`;
                this.dropdowns[dropdownId] = new StyledDropdown(container, {
                    id: dropdownId,
                    placeholder: isTrainValue ? 'Select train value' : 
                                isTrainDesc ? 'Select column' :
                                isPredictValue ? 'Select predict value' : 
                                'Select column',
                    options: options,
                    size: 'small'
                });
            });
        }

        // Testing data dropdowns
        const testingDataUnit = document.getElementById('testing-data-unit');
        if (testingDataUnit) {
            const container = document.createElement('div');
            container.className = 'dropdown-container inline-dropdown';
            testingDataUnit.parentNode.replaceChild(container, testingDataUnit);
            
            this.dropdowns.testingUnit = new StyledDropdown(container, {
                id: 'testing-unit',
                placeholder: '%',
                options: [
                    { value: 'percentage', title: '%', icon: 'fas fa-percentage' },
                    { value: 'rows', title: 'Rows', icon: 'fas fa-table' }
                ],
                value: 'percentage',
                size: 'small'
            });
        }

        const testingDataFrom = document.getElementById('testing-data-from');
        if (testingDataFrom) {
            const container = document.createElement('div');
            container.className = 'dropdown-container inline-dropdown';
            testingDataFrom.parentNode.replaceChild(container, testingDataFrom);
            
            this.dropdowns.testingFrom = new StyledDropdown(container, {
                id: 'testing-from',
                placeholder: 'Random',
                options: [
                    { value: 'random', title: 'Random', icon: 'fas fa-random' },
                    { value: 'first', title: 'First', icon: 'fas fa-arrow-up' },
                    { value: 'last', title: 'Last', icon: 'fas fa-arrow-down' }
                ],
                value: 'random',
                size: 'small'
            });
        }
    }

    setupEventListeners() {
        // Model History controls
        const historyControls = document.querySelector('.model-history .history-controls');
        if (historyControls) {
            const minusBtn = historyControls.querySelector('.minus-button');
            const plusBtn = historyControls.querySelector('.plus-button');
            const versionSpan = historyControls.querySelector('span:nth-child(2)');
            
            minusBtn.addEventListener('click', () => {
                if (this.modelHistoryVersions > 0) {
                    this.modelHistoryVersions--;
                    versionSpan.textContent = this.modelHistoryVersions;
                    this.updateCostCalculations();
                }
            });
            
            plusBtn.addEventListener('click', () => {
                this.modelHistoryVersions++;
                versionSpan.textContent = this.modelHistoryVersions;
                this.updateCostCalculations();
            });
        }


        // Fix button styles
        this.updateButtonStyles();
    }

    updateButtonStyles() {
        // Update main action buttons
        const backButton = document.querySelector('.back-button');
        const finishButton = document.querySelector('.finish-button');
        
        if (backButton) {
            backButton.className = 'btn btn-secondary';
            backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
        }
        
        if (finishButton) {
            finishButton.className = 'btn btn-primary';
            finishButton.innerHTML = '<i class="fas fa-check"></i> Finish & Train Model';
        }

        // Update upload button
        const uploadButton = document.querySelector('.upload-button');
        if (uploadButton) {
            uploadButton.className = 'btn btn-primary';
            uploadButton.innerHTML = '<i class="fas fa-upload"></i> Upload';
        }

        // Style the increment/decrement buttons
        document.querySelectorAll('.minus-button, .plus-button').forEach(btn => {
            btn.className = btn.classList.contains('minus-button') ? 
                'btn btn-sm btn-secondary minus-button' : 
                'btn btn-sm btn-secondary plus-button';
        });
    }

    updateCostCalculations() {
        // Calculate model history cost
        const historyTotalCost = this.modelHistoryVersions * this.tokenCosts.versionCost;
        const historyCostElement = document.querySelector('.model-history .cost');
        if (historyCostElement) {
            historyCostElement.innerHTML = `Cost: <strong>${historyTotalCost.toLocaleString()}</strong> tokens per month`;
        }

        // Calculate total training cost
        const totalCost = this.tokenCosts.trainingBaseCost + historyTotalCost;
        const trainingCostElement = document.querySelector('.metrics p:nth-child(5) span');
        if (trainingCostElement) {
            trainingCostElement.innerHTML = `${totalCost.toLocaleString()} tokens <i class="fas fa-coins"></i>`;
        }

        // Update the cost card with better formatting
        const metricsSection = document.querySelector('.model-history:last-of-type .metrics');
        if (metricsSection) {
            metricsSection.innerHTML = `
                <div class="metric-item">
                    <label>Accuracy:</label>
                    <span class="metric-value">75%</span>
                </div>
                <div class="metric-item">
                    <label>Data Quality:</label>
                    <span class="metric-value">60%</span>
                </div>
                <div class="metric-item">
                    <label>Model Complexity:</label>
                    <span class="metric-value">85%</span>
                </div>
                <div class="metric-item">
                    <label>Model Quality:</label>
                    <span class="metric-value">93%</span>
                </div>
                <div class="metric-item highlight">
                    <label>Total Training Cost:</label>
                    <span class="metric-value primary">${totalCost.toLocaleString()} tokens <i class="fas fa-coins"></i></span>
                </div>
                <div class="metric-item">
                    <label>Estimated ETA:</label>
                    <span class="metric-value">152 min</span>
                </div>
            `;
        }
    }

    loadModelData(modelId) {
        // Load model data when selected
        if (modelId === 'new') {
            // Clear form for new model
            this.clearForm();
        } else {
            // Load existing model data
            console.log('Loading model:', modelId);
        }
    }

    clearForm() {
        document.getElementById('model-name').value = '';
        document.getElementById('model-description').value = '';
        document.getElementById('model-function').value = '';
        document.getElementById('epoch').value = '';
        document.getElementById('hidden-layers').value = '';
        document.getElementById('batch-size').value = '';
    }
}

// Initialize the page
const modelEditorPage = new ModelEditorPage();
window.modelEditorPage = modelEditorPage;

// Export for router
export { modelEditorPage };