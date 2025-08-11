import { StyledDropdown } from '../../components/StyledDropdown/StyledDropdown.js';
import { loadComponentCSS } from '../services/componentLoader.js';
import tokenService from '../services/token_service.js';

class ModelCreationPage {
    constructor() {
        this.dropdowns = {};
        this.trainFields = 0;
        this.predictFields = 0;
        this.baseCost = 500; // Base cost for model creation
        this.fieldCost = 50; // Cost per field
    }

    async initialize() {
        // Load StyledDropdown CSS
        loadComponentCSS('src/components/StyledDropdown/StyledDropdown.css');
        
        this.setupDropdowns();
        this.setupEventListeners();
        this.updateTokenCost();
    }

    setupDropdowns() {
        // Train Description dropdown
        const trainDescSelect = document.getElementById('model-data-description-train');
        if (trainDescSelect) {
            const container = document.createElement('div');
            container.className = 'dropdown-container';
            trainDescSelect.parentNode.replaceChild(container, trainDescSelect);
            
            this.dropdowns.trainDescription = new StyledDropdown(container, {
                id: 'train-description',
                placeholder: 'Select train data description',
                options: [
                    { value: 'customer_data', title: 'Customer Data', icon: 'fas fa-users' },
                    { value: 'sales_data', title: 'Sales Data', icon: 'fas fa-chart-line' },
                    { value: 'product_data', title: 'Product Data', icon: 'fas fa-box' },
                    { value: 'transaction_data', title: 'Transaction Data', icon: 'fas fa-exchange-alt' }
                ],
                onChange: () => this.updateTokenCost()
            });
        }

        // Predict Description dropdown
        const predictDescSelect = document.getElementById('model-data-description-predict');
        if (predictDescSelect) {
            const container = document.createElement('div');
            container.className = 'dropdown-container';
            predictDescSelect.parentNode.replaceChild(container, predictDescSelect);
            
            this.dropdowns.predictDescription = new StyledDropdown(container, {
                id: 'predict-description',
                placeholder: 'Select predict data description',
                options: [
                    { value: 'churn_probability', title: 'Churn Probability', icon: 'fas fa-percentage' },
                    { value: 'sales_forecast', title: 'Sales Forecast', icon: 'fas fa-chart-bar' },
                    { value: 'category_prediction', title: 'Category Prediction', icon: 'fas fa-tags' },
                    { value: 'value_estimation', title: 'Value Estimation', icon: 'fas fa-dollar-sign' }
                ],
                onChange: () => this.updateTokenCost()
            });
        }

        // Algorithm dropdown
        const algorithmSelect = document.getElementById('model-algorithm');
        if (algorithmSelect) {
            const container = document.createElement('div');
            container.className = 'dropdown-container';
            algorithmSelect.parentNode.replaceChild(container, algorithmSelect);
            
            this.dropdowns.algorithm = new StyledDropdown(container, {
                id: 'algorithm',
                placeholder: 'Select algorithm',
                options: [
                    { value: 'neural_network', title: 'Neural Network', icon: 'fas fa-brain', description: '+200 tokens' },
                    { value: 'random_forest', title: 'Random Forest', icon: 'fas fa-tree', description: '+150 tokens' },
                    { value: 'svm', title: 'Support Vector Machine', icon: 'fas fa-vector-square', description: '+180 tokens' },
                    { value: 'linear_regression', title: 'Linear Regression', icon: 'fas fa-chart-line', description: '+100 tokens' }
                ],
                onChange: () => this.updateTokenCost()
            });
        }

        // Model Type dropdown
        const modelTypeSelect = document.getElementById('model-type');
        if (modelTypeSelect) {
            const container = document.createElement('div');
            container.className = 'dropdown-container';
            modelTypeSelect.parentNode.replaceChild(container, modelTypeSelect);
            
            this.dropdowns.modelType = new StyledDropdown(container, {
                id: 'model-type',
                placeholder: 'Select model type',
                options: [
                    { value: 'classification', title: 'Classification', icon: 'fas fa-tags' },
                    { value: 'regression', title: 'Regression', icon: 'fas fa-chart-line' },
                    { value: 'clustering', title: 'Clustering', icon: 'fas fa-project-diagram' },
                    { value: 'nlp', title: 'Natural Language Processing', icon: 'fas fa-language', description: '+300 tokens' }
                ],
                onChange: () => this.updateTokenCost()
            });
        }
    }

    setupEventListeners() {
        // Train fields counter
        const trainMinusBtn = document.querySelector('.form-group:nth-child(2) .minus-button');
        const trainPlusBtn = document.querySelector('.form-group:nth-child(2) .plus-button');
        const trainCountSpan = document.querySelector('.form-group:nth-child(2) .number-input-group span');
        
        if (trainMinusBtn && trainPlusBtn && trainCountSpan) {
            trainMinusBtn.addEventListener('click', () => {
                if (this.trainFields > 0) {
                    this.trainFields--;
                    trainCountSpan.textContent = this.trainFields;
                    this.updateTokenCost();
                }
            });
            
            trainPlusBtn.addEventListener('click', () => {
                this.trainFields++;
                trainCountSpan.textContent = this.trainFields;
                this.updateTokenCost();
            });
        }

        // Predict fields counter
        const predictMinusBtn = document.querySelector('.form-group:nth-child(5) .minus-button');
        const predictPlusBtn = document.querySelector('.form-group:nth-child(5) .plus-button');
        const predictCountSpan = document.querySelector('.form-group:nth-child(5) .number-input-group span');
        
        if (predictMinusBtn && predictPlusBtn && predictCountSpan) {
            predictMinusBtn.addEventListener('click', () => {
                if (this.predictFields > 0) {
                    this.predictFields--;
                    predictCountSpan.textContent = this.predictFields;
                    this.updateTokenCost();
                }
            });
            
            predictPlusBtn.addEventListener('click', () => {
                this.predictFields++;
                predictCountSpan.textContent = this.predictFields;
                this.updateTokenCost();
            });
        }

        // Style buttons
        this.styleButtons();
    }

    styleButtons() {
        // Style all buttons consistently
        document.querySelectorAll('.minus-button, .plus-button').forEach(btn => {
            btn.className = btn.classList.contains('minus-button') ? 
                'btn btn-sm btn-secondary minus-button' : 
                'btn btn-sm btn-secondary plus-button';
        });

        // Find and style the create model button
        const actionButtons = document.querySelectorAll('.custom-model-creation-container button');
        actionButtons.forEach(btn => {
            if (btn.textContent.includes('Create') || btn.textContent.includes('Train')) {
                btn.className = 'btn btn-primary';
                btn.innerHTML = '<i class="fas fa-rocket"></i> Create & Train Model';
            }
        });
    }

    updateTokenCost() {
        let totalCost = this.baseCost;
        
        // Add field costs
        totalCost += (this.trainFields + this.predictFields) * this.fieldCost;
        
        // Add algorithm cost
        if (this.dropdowns.algorithm) {
            const algorithm = this.dropdowns.algorithm.getValue();
            const algorithmCosts = {
                'neural_network': 200,
                'random_forest': 150,
                'svm': 180,
                'linear_regression': 100
            };
            totalCost += algorithmCosts[algorithm] || 0;
        }
        
        // Add model type cost
        if (this.dropdowns.modelType) {
            const modelType = this.dropdowns.modelType.getValue();
            if (modelType === 'nlp') {
                totalCost += 300;
            }
        }

        // Add cost display if it doesn't exist
        let costDisplay = document.getElementById('token-cost-display');
        if (!costDisplay) {
            const formSection = document.querySelector('.form-section');
            if (formSection) {
                const costCard = document.createElement('div');
                costCard.className = 'cost-calculation card';
                costCard.innerHTML = `
                    <h3>Token Cost Calculation</h3>
                    <div class="cost-breakdown">
                        <div class="cost-item">
                            <span>Base Model Cost:</span>
                            <span>${this.baseCost} tokens</span>
                        </div>
                        <div class="cost-item">
                            <span>Data Fields (${this.trainFields + this.predictFields} × ${this.fieldCost}):</span>
                            <span>${(this.trainFields + this.predictFields) * this.fieldCost} tokens</span>
                        </div>
                        <div class="cost-item" id="algorithm-cost-item" style="display: none;">
                            <span>Algorithm Cost:</span>
                            <span id="algorithm-cost">0 tokens</span>
                        </div>
                        <div class="cost-item" id="model-type-cost-item" style="display: none;">
                            <span>Model Type Cost:</span>
                            <span id="model-type-cost">0 tokens</span>
                        </div>
                        <div class="cost-item total">
                            <span>Total Cost:</span>
                            <span id="token-cost-display">${totalCost} tokens</span>
                        </div>
                    </div>
                `;
                formSection.appendChild(costCard);
                costDisplay = document.getElementById('token-cost-display');
            }
        } else {
            // Update existing display
            costDisplay.textContent = `${totalCost} tokens`;
            
            // Update breakdown
            const fieldsCost = document.querySelector('.cost-item:nth-child(2) span:last-child');
            if (fieldsCost) {
                fieldsCost.textContent = `${(this.trainFields + this.predictFields) * this.fieldCost} tokens`;
            }
            
            // Update algorithm cost
            const algorithmCostItem = document.getElementById('algorithm-cost-item');
            const algorithmCostSpan = document.getElementById('algorithm-cost');
            if (this.dropdowns.algorithm) {
                const algorithm = this.dropdowns.algorithm.getValue();
                const algorithmCosts = {
                    'neural_network': 200,
                    'random_forest': 150,
                    'svm': 180,
                    'linear_regression': 100
                };
                const algCost = algorithmCosts[algorithm] || 0;
                if (algCost > 0 && algorithmCostItem && algorithmCostSpan) {
                    algorithmCostItem.style.display = 'flex';
                    algorithmCostSpan.textContent = `${algCost} tokens`;
                }
            }
            
            // Update model type cost
            const modelTypeCostItem = document.getElementById('model-type-cost-item');
            const modelTypeCostSpan = document.getElementById('model-type-cost');
            if (this.dropdowns.modelType && modelTypeCostItem && modelTypeCostSpan) {
                const modelType = this.dropdowns.modelType.getValue();
                if (modelType === 'nlp') {
                    modelTypeCostItem.style.display = 'flex';
                    modelTypeCostSpan.textContent = '300 tokens';
                } else {
                    modelTypeCostItem.style.display = 'none';
                }
            }
        }
    }
}

// Initialize the page
const modelCreationPage = new ModelCreationPage();
window.modelCreationPage = modelCreationPage;

// Export for router
export { modelCreationPage };