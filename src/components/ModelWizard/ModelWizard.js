/**
 * Model Training Wizard Component
 * Provides a guided step-by-step workflow for model creation and training
 */

import { loadComponentCSS } from '../../js/services/componentLoader.js';
import { DataValidationPanel } from '../DataValidationPanel/DataValidationPanel.js';
import { StyledDropdown } from '../StyledDropdown/StyledDropdown.js';
import formValidation from '../../js/services/form_validation_service.js';

class ModelWizard {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            allowSkipSteps: false,
            showProgressBar: true,
            autoAdvance: false,
            enablePersistence: true,
            errorRecovery: true,
            ...options
        };
        
        this.currentStep = 1;
        this.totalSteps = 6;
        this.stepData = {
            // Default preprocessing settings
            preprocessingEnabled: false,
            numericalMethod: 'zscore',
            missingMethod: 'mean',
            outlierMethod: 'none',
            
            // Template mapping storage
            templateMappings: {},
            
            // Feature selection for custom models
            inputFeatures: [],
            targetFeature: null
        };
        this.validationPanel = null;
        this.dropdowns = {};
        this.errorRecoveryEnabled = true;
        this.persistenceKey = 'modelWizard_' + Date.now();
        
        this.steps = [
            { id: 1, name: 'Model Selection', title: 'Choose Model Type', required: true },
            { id: 2, name: 'Data Upload', title: 'Upload Training Data', required: true },
            { id: 3, name: 'Data Configuration', title: 'Configure Data Mapping', required: true },
            { id: 4, name: 'Model Parameters', title: 'Set Model Parameters', required: true },
            { id: 5, name: 'Training Configuration', title: 'Training Settings', required: true },
            { id: 6, name: 'Review & Train', title: 'Review and Start Training', required: true }
        ];
        
        this.init();
    }
    
    async init() {
        await loadComponentCSS('src/components/ModelWizard/ModelWizard.css');
        await loadComponentCSS('src/components/DataValidationPanel/DataValidationPanel.css');
        
        // Try to load persisted data
        const hasPersistedData = this.loadPersistedData();
        
        this.render();
        this.setupEventListeners();
        
        // Show appropriate step
        this.showStep(hasPersistedData ? this.currentStep : 1);
    }
    
    render() {
        this.container.innerHTML = `
            <div class="model-wizard">
                <!-- Progress Header -->
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-track">
                            ${this.steps.map((step, index) => `
                                <div class="progress-step ${index + 1 === this.currentStep ? 'active' : ''} ${index + 1 < this.currentStep ? 'completed' : ''}" 
                                     data-step="${step.id}">
                                    <div class="step-circle">
                                        <span class="step-number">${step.id}</span>
                                        <i class="fas fa-check step-check"></i>
                                    </div>
                                    <div class="step-info">
                                        <div class="step-name">${step.name}</div>
                                        <div class="step-title">${step.title}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(this.currentStep - 1) / (this.totalSteps - 1) * 100}%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Step Content -->
                <div class="wizard-content">
                    <div class="step-container" id="step-container">
                        <!-- Step content will be rendered here -->
                    </div>
                </div>
                
                <!-- Navigation Footer -->
                <div class="wizard-footer">
                    <div class="wizard-navigation">
                        <button class="btn btn-secondary" id="prev-btn" disabled>
                            <i class="fas fa-arrow-left"></i> Previous
                        </button>
                        
                        <div class="step-indicator">
                            Step <span id="current-step-number">${this.currentStep}</span> of ${this.totalSteps}
                        </div>
                        
                        <button class="btn btn-primary" id="next-btn">
                            Next <i class="fas fa-arrow-right"></i>
                        </button>
                        
                        <button class="btn btn-success" id="finish-btn" style="display: none;">
                            <i class="fas fa-rocket"></i> Start Training
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Navigation buttons
        document.getElementById('prev-btn').addEventListener('click', () => this.previousStep());
        document.getElementById('next-btn').addEventListener('click', () => this.nextStep());
        document.getElementById('finish-btn').addEventListener('click', () => this.finishWizard());
        
        // Step clicking
        document.querySelectorAll('.progress-step').forEach(step => {
            step.addEventListener('click', (e) => {
                const stepNumber = parseInt(e.currentTarget.dataset.step);
                if (this.canNavigateToStep(stepNumber)) {
                    this.showStep(stepNumber);
                }
            });
        });
    }
    
    showStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.totalSteps) return;
        
        this.currentStep = stepNumber;
        this.persistStepData();
        this.updateProgressDisplay();
        this.renderStepContent(stepNumber);
        this.updateNavigationButtons();
    }
    
    updateProgressDisplay() {
        // Update progress steps
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNum = index + 1;
            step.className = 'progress-step';
            
            if (stepNum === this.currentStep) {
                step.classList.add('active');
            } else if (stepNum < this.currentStep) {
                step.classList.add('completed');
            }
        });
        
        // Update progress bar
        const progressFill = document.querySelector('.progress-fill');
        const progressPercent = (this.currentStep - 1) / (this.totalSteps - 1) * 100;
        progressFill.style.width = progressPercent + '%';
        
        // Update step indicator
        document.getElementById('current-step-number').textContent = this.currentStep;
    }
    
    renderStepContent(stepNumber) {
        const container = document.getElementById('step-container');
        
        switch(stepNumber) {
            case 1:
                this.renderModelSelectionStep(container);
                break;
            case 2:
                this.renderDataUploadStep(container);
                break;
            case 3:
                this.renderDataConfigurationStep(container);
                break;
            case 4:
                this.renderModelParametersStep(container);
                break;
            case 5:
                this.renderTrainingConfigurationStep(container);
                break;
            case 6:
                this.renderReviewStep(container);
                break;
        }
        
        // Scroll to top of step content
        container.scrollTop = 0;
    }
    
    renderModelSelectionStep(container) {
        container.innerHTML = `
            <div class="step-content">
                <div class="step-header">
                    <h2>Choose Your Model Type</h2>
                    <p>Select whether to use a pre-trained template or create a custom model from scratch.</p>
                </div>
                
                <div class="model-type-selection">
                    <div class="model-type-card ${this.stepData.modelType === 'template' ? 'selected' : ''}" 
                         data-type="template">
                        <div class="card-icon">
                            <i class="fas fa-layer-group"></i>
                        </div>
                        <h3>Template Model</h3>
                        <p>Start with pre-configured models for common use cases like customer churn prediction, 
                           sales forecasting, or sentiment analysis.</p>
                        <div class="card-benefits">
                            <div class="benefit">
                                <i class="fas fa-check"></i>
                                <span>Pre-optimized parameters</span>
                            </div>
                            <div class="benefit">
                                <i class="fas fa-check"></i>
                                <span>Faster setup</span>
                            </div>
                            <div class="benefit">
                                <i class="fas fa-check"></i>
                                <span>Proven architectures</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="model-type-card ${this.stepData.modelType === 'custom' ? 'selected' : ''}" 
                         data-type="custom">
                        <div class="card-icon">
                            <i class="fas fa-cogs"></i>
                        </div>
                        <h3>Custom Model</h3>
                        <p>Build a model from scratch with full control over algorithms, parameters, 
                           and data preprocessing options.</p>
                        <div class="card-benefits">
                            <div class="benefit">
                                <i class="fas fa-check"></i>
                                <span>Full customization</span>
                            </div>
                            <div class="benefit">
                                <i class="fas fa-check"></i>
                                <span>Advanced features</span>
                            </div>
                            <div class="benefit">
                                <i class="fas fa-check"></i>
                                <span>Algorithm choice</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="template-selection" id="template-selection" style="display: none;">
                    <h3>Select a Template</h3>
                    <div class="template-grid">
                        <div class="template-card" data-template="churn">
                            <div class="template-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <h4>Customer Churn Predictor</h4>
                            <p>Predict which customers are likely to leave your service</p>
                            <div class="template-tags">
                                <span class="tag">Binary Classification</span>
                                <span class="tag">Logistic Regression</span>
                            </div>
                        </div>
                        
                        <div class="template-card" data-template="sales">
                            <div class="template-icon">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <h4>Sales Forecast Model</h4>
                            <p>Forecast future sales based on historical data and trends</p>
                            <div class="template-tags">
                                <span class="tag">Time Series</span>
                                <span class="tag">LSTM</span>
                            </div>
                        </div>
                        
                        <div class="template-card" data-template="sentiment">
                            <div class="template-icon">
                                <i class="fas fa-comments"></i>
                            </div>
                            <h4>Sentiment Analyzer</h4>
                            <p>Analyze text sentiment and classify as positive, negative, or neutral</p>
                            <div class="template-tags">
                                <span class="tag">NLP</span>
                                <span class="tag">BERT</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Setup event listeners for this step
        this.setupModelSelectionListeners();
    }
    
    renderDataUploadStep(container) {
        container.innerHTML = `
            <div class="step-content">
                <div class="step-header">
                    <h2>Upload Your Training Data</h2>
                    <p>Upload a CSV, Excel, or JSON file containing your training data. We'll validate the data quality and provide insights.</p>
                </div>
                
                <div id="data-validation-container" class="data-validation-container">
                    <!-- Data validation panel will be rendered here -->
                </div>
            </div>
        `;
        
        // Initialize data validation panel
        const validationContainer = document.getElementById('data-validation-container');
        this.validationPanel = new DataValidationPanel(validationContainer, {
            onDataAccepted: (validationResult, file) => {
                this.stepData.validationResult = validationResult;
                this.stepData.uploadedFile = file;
                this.validateAndUpdateUI();
            },
            onDataCleanRequested: (validationResult, file) => {
                this.handleDataCleaning(validationResult, file);
            }
        });
    }
    
    renderDataConfigurationStep(container) {
        if (!this.stepData.validationResult) {
            container.innerHTML = `
                <div class="step-content">
                    <div class="step-placeholder">
                        <i class="fas fa-upload"></i>
                        <h3>No Data Uploaded</h3>
                        <p>Please go back to the previous step and upload your training data first.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const columns = this.stepData.validationResult.columns || [];
        const isTemplate = this.stepData.modelType === 'template';
        
        container.innerHTML = `
            <div class="step-content">
                <div class="step-header">
                    <h2>Configure Data Mapping</h2>
                    <p>${isTemplate ? 
                        'Map your CSV columns to the required fields for this template model.' :
                        'Select which columns to use for training and which column(s) to predict.'
                    }</p>
                </div>
                
                ${isTemplate ? this.renderTemplateMapping(columns) : this.renderCustomMapping(columns)}
                
                <!-- Data Preprocessing Options -->
                <div class="preprocessing-section card">
                    <h3>Data Preprocessing</h3>
                    <div class="preprocessing-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" id="enable-preprocessing" ${this.stepData.preprocessingEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label">Enable automated data preprocessing</span>
                    </div>
                    
                    <div class="preprocessing-options" id="preprocessing-options" style="display: ${this.stepData.preprocessingEnabled ? 'block' : 'none'};">
                        <div class="preprocessing-grid">
                            <div class="option-card">
                                <h4>Numerical Columns</h4>
                                <select id="numerical-method" class="form-control">
                                    <option value="zscore" ${this.stepData.numericalMethod === 'zscore' ? 'selected' : ''}>Z-Score Normalization</option>
                                    <option value="minmax" ${this.stepData.numericalMethod === 'minmax' ? 'selected' : ''}>Min-Max Scaling</option>
                                    <option value="robust" ${this.stepData.numericalMethod === 'robust' ? 'selected' : ''}>Robust Scaling</option>
                                    <option value="log" ${this.stepData.numericalMethod === 'log' ? 'selected' : ''}>Log Transformation</option>
                                </select>
                            </div>
                            
                            <div class="option-card">
                                <h4>Missing Values</h4>
                                <select id="missing-method" class="form-control">
                                    <option value="drop" ${this.stepData.missingMethod === 'drop' ? 'selected' : ''}>Drop rows with missing values</option>
                                    <option value="mean" ${this.stepData.missingMethod === 'mean' ? 'selected' : ''}>Fill with mean/mode</option>
                                    <option value="median" ${this.stepData.missingMethod === 'median' ? 'selected' : ''}>Fill with median</option>
                                    <option value="forward" ${this.stepData.missingMethod === 'forward' ? 'selected' : ''}>Forward fill</option>
                                </select>
                            </div>
                            
                            <div class="option-card">
                                <h4>Outlier Treatment</h4>
                                <select id="outlier-method" class="form-control">
                                    <option value="none" ${this.stepData.outlierMethod === 'none' ? 'selected' : ''}>Keep outliers</option>
                                    <option value="iqr" ${this.stepData.outlierMethod === 'iqr' ? 'selected' : ''}>Remove using IQR method</option>
                                    <option value="zscore" ${this.stepData.outlierMethod === 'zscore' ? 'selected' : ''}>Remove using Z-score</option>
                                    <option value="cap" ${this.stepData.outlierMethod === 'cap' ? 'selected' : ''}>Cap to percentiles</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupDataConfigurationListeners();
        
        // Populate template mapping dropdowns if in template mode
        if (this.stepData.modelType === 'template') {
            this.populateTemplateMappings(columns);
        }
    }
    
    renderTemplateMapping(columns) {
        const templates = {
            churn: [
                { name: 'Customer ID', type: 'ID', required: true },
                { name: 'Purchase Amount', type: 'Number', required: true },
                { name: 'Product Category', type: 'Category', required: true },
                { name: 'Date', type: 'Date', required: true }
            ],
            sales: [
                { name: 'Sales Date', type: 'Date', required: true },
                { name: 'Revenue', type: 'Number', required: true },
                { name: 'Region', type: 'Category', required: true }
            ],
            sentiment: [
                { name: 'Text Content', type: 'Text', required: true },
                { name: 'Sentiment Score', type: 'Number', required: false }
            ]
        };
        
        const requiredFields = templates[this.stepData.selectedTemplate] || [];
        
        return `
            <div class="template-mapping card">
                <h3>Column Mapping</h3>
                <div class="mapping-description">
                    <p>Map your CSV columns to the required fields for the ${this.stepData.selectedTemplate} model.</p>
                </div>
                
                <div class="mapping-list">
                    ${requiredFields.map((field, index) => `
                        <div class="mapping-row">
                            <div class="required-field">
                                <div class="field-name">${field.name}</div>
                                <div class="field-type">${field.type}</div>
                                <div class="field-required">${field.required ? 'Required' : 'Optional'}</div>
                            </div>
                            <div class="mapping-arrow">
                                <i class="fas fa-arrow-left"></i>
                            </div>
                            <div class="column-selector" id="mapping-${index}">
                                <!-- Dropdown will be populated by JavaScript -->
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderCustomMapping(columns) {
        return `
            <div class="custom-mapping card">
                <h3>Feature Selection</h3>
                <div class="mapping-description">
                    <p>Select which columns to use as features (input) and which to predict (target).</p>
                </div>
                
                <div class="feature-selection-grid">
                    <div class="feature-section">
                        <h4>Input Features</h4>
                        <p class="section-description">Columns used to train the model</p>
                        <div class="feature-list" id="input-features">
                            ${columns.map(col => `
                                <div class="feature-item">
                                    <label class="feature-checkbox">
                                        <input type="checkbox" value="${col.name}" class="input-feature" 
                                               ${this.stepData.inputFeatures?.includes(col.name) ? 'checked' : ''}>
                                        <span class="checkmark"></span>
                                        <span class="feature-name">${col.name}</span>
                                        <span class="feature-type">${col.data_type}</span>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="feature-section">
                        <h4>Target Variable</h4>
                        <p class="section-description">Column(s) to predict</p>
                        <div class="feature-list" id="target-features">
                            ${columns.map(col => `
                                <div class="feature-item">
                                    <label class="feature-checkbox">
                                        <input type="radio" name="target-feature" value="${col.name}" class="target-feature"
                                               ${this.stepData.targetFeature === col.name ? 'checked' : ''}>
                                        <span class="checkmark radio"></span>
                                        <span class="feature-name">${col.name}</span>
                                        <span class="feature-type">${col.data_type}</span>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderModelParametersStep(container) {
        const isTemplate = this.stepData.modelType === 'template';
        
        container.innerHTML = `
            <div class="step-content">
                <div class="step-header">
                    <h2>Configure Model Parameters</h2>
                    <p>${isTemplate ? 
                        'Fine-tune the pre-configured parameters for your template model.' :
                        'Select the machine learning algorithm and configure its parameters.'
                    }</p>
                </div>
                
                <!-- Model Information -->
                <div class="model-info card">
                    <div class="model-header">
                        <div class="model-name">
                            <input type="text" id="model-name" class="form-control" 
                                   placeholder="Enter model name" value="${this.stepData.modelName || ''}">
                        </div>
                        <div class="model-algorithm">
                            ${isTemplate ? 
                                `<span class="algorithm-badge">${this.getTemplateAlgorithm()}</span>` :
                                `<select id="algorithm-select" class="form-control">
                                    <option value="">Select Algorithm...</option>
                                    <optgroup label="Classification">
                                        <option value="random_forest_clf">Random Forest</option>
                                        <option value="svm_clf">Support Vector Machine</option>
                                        <option value="logistic_regression">Logistic Regression</option>
                                        <option value="neural_network_clf">Neural Network</option>
                                        <option value="xgboost_clf">XGBoost</option>
                                    </optgroup>
                                    <optgroup label="Regression">
                                        <option value="linear_regression">Linear Regression</option>
                                        <option value="random_forest_reg">Random Forest Regressor</option>
                                        <option value="neural_network_reg">Neural Network Regressor</option>
                                    </optgroup>
                                    <optgroup label="Clustering">
                                        <option value="kmeans">K-Means</option>
                                        <option value="dbscan">DBSCAN</option>
                                    </optgroup>
                                </select>`
                            }
                        </div>
                    </div>
                    
                    <div class="model-description">
                        <textarea id="model-description" class="form-control" rows="3" 
                                  placeholder="Describe what this model will be used for...">${this.stepData.modelDescription || ''}</textarea>
                    </div>
                </div>
                
                <!-- Parameter Configuration -->
                <div class="parameters-config card">
                    <h3>Training Parameters</h3>
                    <div class="parameters-grid" id="parameters-grid">
                        <!-- Parameters will be populated based on algorithm selection -->
                    </div>
                </div>
                
                <!-- Advanced Options -->
                <div class="advanced-options card">
                    <h3>Advanced Options</h3>
                    <div class="options-grid">
                        <div class="option-group">
                            <label for="cross-validation">Cross Validation</label>
                            <select id="cross-validation" class="form-control">
                                <option value="none">No validation</option>
                                <option value="kfold" selected>K-Fold (5 folds)</option>
                                <option value="stratified">Stratified K-Fold</option>
                                <option value="time-series">Time Series Split</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="test-split">Test Set Size</label>
                            <select id="test-split" class="form-control">
                                <option value="0.2" selected>20%</option>
                                <option value="0.25">25%</option>
                                <option value="0.3">30%</option>
                                <option value="0.1">10%</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="random-seed">Random Seed</label>
                            <input type="number" id="random-seed" class="form-control" 
                                   value="${this.stepData.randomSeed || 42}" min="1" max="9999">
                        </div>
                        
                        <div class="option-group">
                            <label for="early-stopping">Early Stopping</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="early-stopping" ${this.stepData.earlyStopping ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupModelParametersListeners();
        this.updateParametersGrid();
    }
    
    renderTrainingConfigurationStep(container) {
        container.innerHTML = `
            <div class="step-content">
                <div class="step-header">
                    <h2>Training Configuration</h2>
                    <p>Configure computational resources and training optimization settings.</p>
                </div>
                
                <!-- Resource Configuration -->
                <div class="resource-config card">
                    <h3>Computational Resources</h3>
                    <div class="resource-grid">
                        <div class="resource-item">
                            <h4>Processing Units</h4>
                            <div class="resource-control">
                                <button class="btn btn-sm btn-secondary" id="decrease-units">-</button>
                                <span class="resource-value" id="processing-units">${this.stepData.processingUnits || 1}</span>
                                <button class="btn btn-sm btn-secondary" id="increase-units">+</button>
                            </div>
                            <div class="resource-info">
                                <span class="gpu-specs" id="gpu-specs">GPU: 8GB Memory, 4 Cores</span>
                                <span class="cost-estimate" id="units-cost">~500 tokens/hour</span>
                            </div>
                        </div>
                        
                        <div class="resource-item">
                            <h4>Model Versions</h4>
                            <div class="resource-control">
                                <button class="btn btn-sm btn-secondary" id="decrease-versions">-</button>
                                <span class="resource-value" id="model-versions">${this.stepData.modelVersions || 0}</span>
                                <button class="btn btn-sm btn-secondary" id="increase-versions">+</button>
                            </div>
                            <div class="resource-info">
                                <span class="version-info">Automatic model checkpointing</span>
                                <span class="cost-estimate" id="versions-cost">~100 tokens/version</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Training Optimization -->
                <div class="optimization-config card">
                    <h3>Training Optimization</h3>
                    <div class="optimization-options">
                        <div class="option-card">
                            <h4>Hyperparameter Tuning</h4>
                            <label class="toggle-switch">
                                <input type="checkbox" id="hyperparameter-tuning" ${this.stepData.hyperparameterTuning ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <p>Automatically find optimal parameters</p>
                        </div>
                        
                        <div class="option-card">
                            <h4>Auto Feature Selection</h4>
                            <label class="toggle-switch">
                                <input type="checkbox" id="auto-features" ${this.stepData.autoFeatures ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <p>Select most important features automatically</p>
                        </div>
                        
                        <div class="option-card">
                            <h4>Model Ensemble</h4>
                            <label class="toggle-switch">
                                <input type="checkbox" id="model-ensemble" ${this.stepData.modelEnsemble ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <p>Combine multiple models for better accuracy</p>
                        </div>
                    </div>
                </div>
                
                <!-- Monitoring and Alerts -->
                <div class="monitoring-config card">
                    <h3>Monitoring & Alerts</h3>
                    <div class="monitoring-options">
                        <div class="option-group">
                            <label for="training-alerts">Training Alerts</label>
                            <select id="training-alerts" class="form-control">
                                <option value="none">No alerts</option>
                                <option value="completion" selected>On completion</option>
                                <option value="progress">Progress updates</option>
                                <option value="all">All events</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="performance-threshold">Performance Threshold</label>
                            <div class="threshold-input">
                                <input type="number" id="performance-threshold" class="form-control" 
                                       value="${this.stepData.performanceThreshold || 85}" min="0" max="100" step="0.1">
                                <span class="input-suffix">%</span>
                            </div>
                        </div>
                        
                        <div class="option-group">
                            <label for="max-training-time">Max Training Time</label>
                            <select id="max-training-time" class="form-control">
                                <option value="30">30 minutes</option>
                                <option value="60" selected>1 hour</option>
                                <option value="120">2 hours</option>
                                <option value="240">4 hours</option>
                                <option value="0">No limit</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupTrainingConfigurationListeners();
    }
    
    renderReviewStep(container) {
        const estimatedCost = this.calculateEstimatedCost();
        const estimatedTime = this.calculateEstimatedTime();
        
        // Format algorithm name for display
        const algorithmDisplay = this.formatAlgorithmName(this.stepData.algorithm || this.getTemplateAlgorithm());
        
        container.innerHTML = `
            <div class="step-content">
                <div class="step-header">
                    <h2>Review & Start Training</h2>
                    <p>Review your configuration and start training your model.</p>
                </div>
                
                <!-- Configuration Summary -->
                <div class="config-summary">
                    <div class="summary-section">
                        <h3>Model Configuration</h3>
                        <div class="summary-card">
                            <div class="summary-item">
                                <span class="label">Model Type:</span>
                                <span class="value">${this.stepData.modelType === 'template' ? 'Template' : 'Custom'}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Model Name:</span>
                                <span class="value">${this.stepData.modelName || 'Unnamed Model'}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Algorithm:</span>
                                <span class="value">${algorithmDisplay}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Data Size:</span>
                                <span class="value">${this.stepData.validationResult?.total_rows || 0} rows, ${this.stepData.validationResult?.total_columns || 0} columns</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="summary-section">
                        <h3>Training Settings</h3>
                        <div class="summary-card">
                            <div class="summary-item">
                                <span class="label">Processing Units:</span>
                                <span class="value">${this.stepData.processingUnits || 1} GPU${(this.stepData.processingUnits || 1) > 1 ? 's' : ''}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Model Versions:</span>
                                <span class="value">${this.stepData.modelVersions || 0} checkpoint${(this.stepData.modelVersions || 0) !== 1 ? 's' : ''}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Cross Validation:</span>
                                <span class="value">${this.formatCrossValidation(this.stepData.crossValidation)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Preprocessing:</span>
                                <span class="value">${this.stepData.preprocessingEnabled ? 
                                    `Enabled (${this.stepData.numericalMethod || 'zscore'})` : 'Disabled'}</span>
                            </div>
                            ${this.stepData.hyperparameterTuning || this.stepData.autoFeatures || this.stepData.modelEnsemble ? `
                            <div class="summary-item">
                                <span class="label">Optimizations:</span>
                                <span class="value">
                                    ${[
                                        this.stepData.hyperparameterTuning && 'Hyperparameter Tuning',
                                        this.stepData.autoFeatures && 'Auto Feature Selection',
                                        this.stepData.modelEnsemble && 'Model Ensemble'
                                    ].filter(Boolean).join(', ')}
                                </span>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    <div class="summary-section full-width">
                        <h3>Detailed Cost Breakdown</h3>
                        <div class="cost-breakdown">
                            <!-- Main cost categories -->
                            <div class="cost-category">
                                <h4>Training Costs</h4>
                                <div class="cost-item">
                                    <span class="cost-label">Base Training:</span>
                                    <span class="cost-value">${estimatedCost.breakdown.baseTraining.toLocaleString()} tokens</span>
                                </div>
                                <div class="cost-item">
                                    <span class="cost-label">GPU Processing (${estimatedCost.estimatedHours} hrs):</span>
                                    <span class="cost-value">${estimatedCost.breakdown.processingUnits.toLocaleString()} tokens</span>
                                </div>
                                ${estimatedCost.breakdown.crossValidation > 0 ? `
                                <div class="cost-item">
                                    <span class="cost-label">Cross Validation:</span>
                                    <span class="cost-value">${estimatedCost.breakdown.crossValidation.toLocaleString()} tokens</span>
                                </div>` : ''}
                                <div class="cost-subtotal">
                                    <span class="cost-label">Training Subtotal:</span>
                                    <span class="cost-value">${estimatedCost.training.toLocaleString()} tokens</span>
                                </div>
                            </div>
                            
                            ${estimatedCost.preprocessing > 0 ? `
                            <div class="cost-category">
                                <h4>Data Processing</h4>
                                <div class="cost-item">
                                    <span class="cost-label">Data Validation & Cleaning:</span>
                                    <span class="cost-value">${estimatedCost.breakdown.dataProcessing.toLocaleString()} tokens</span>
                                </div>
                                ${estimatedCost.breakdown.featureEngineering > 0 ? `
                                <div class="cost-item">
                                    <span class="cost-label">Feature Engineering:</span>
                                    <span class="cost-value">${estimatedCost.breakdown.featureEngineering.toLocaleString()} tokens</span>
                                </div>` : ''}
                                <div class="cost-subtotal">
                                    <span class="cost-label">Processing Subtotal:</span>
                                    <span class="cost-value">${estimatedCost.preprocessing.toLocaleString()} tokens</span>
                                </div>
                            </div>` : ''}
                            
                            ${estimatedCost.optimization > 0 ? `
                            <div class="cost-category">
                                <h4>Optimization</h4>
                                ${estimatedCost.breakdown.hyperparameterTuning > 0 ? `
                                <div class="cost-item">
                                    <span class="cost-label">Hyperparameter Tuning:</span>
                                    <span class="cost-value">${estimatedCost.breakdown.hyperparameterTuning.toLocaleString()} tokens</span>
                                </div>` : ''}
                                ${estimatedCost.breakdown.autoFeatureSelection > 0 ? `
                                <div class="cost-item">
                                    <span class="cost-label">Auto Feature Selection:</span>
                                    <span class="cost-value">${estimatedCost.breakdown.autoFeatureSelection.toLocaleString()} tokens</span>
                                </div>` : ''}
                                ${estimatedCost.breakdown.modelEnsemble > 0 ? `
                                <div class="cost-item">
                                    <span class="cost-label">Model Ensemble:</span>
                                    <span class="cost-value">${estimatedCost.breakdown.modelEnsemble.toLocaleString()} tokens</span>
                                </div>` : ''}
                                <div class="cost-subtotal">
                                    <span class="cost-label">Optimization Subtotal:</span>
                                    <span class="cost-value">${estimatedCost.optimization.toLocaleString()} tokens</span>
                                </div>
                            </div>` : ''}
                            
                            ${estimatedCost.storage > 0 ? `
                            <div class="cost-category">
                                <h4>Storage</h4>
                                <div class="cost-item">
                                    <span class="cost-label">Model Storage (${this.stepData.modelVersions || 0} versions):</span>
                                    <span class="cost-value">${estimatedCost.storage.toLocaleString()} tokens</span>
                                </div>
                            </div>` : ''}
                            
                            <!-- Total cost -->
                            <div class="cost-total-section">
                                <div class="cost-item total">
                                    <span class="cost-label">Grand Total:</span>
                                    <span class="cost-value">${estimatedCost.total.toLocaleString()} tokens</span>
                                </div>
                                <div class="cost-info">
                                    <div class="time-estimate">
                                        <i class="fas fa-clock"></i>
                                        <span>Estimated training time: ${estimatedTime} minutes</span>
                                    </div>
                                    <div class="hourly-rate">
                                        <i class="fas fa-tachometer-alt"></i>
                                        <span>GPU Rate: ${estimatedCost.hourlyRate.toLocaleString()} tokens/hour</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Cost savings indicator -->
                            ${this.stepData.processingUnits > 1 ? `
                            <div class="cost-savings">
                                <i class="fas fa-info-circle"></i>
                                <span>Using ${this.stepData.processingUnits} processing units reduces training time by 
                                      ${Math.round((1 - 1/Math.sqrt(this.stepData.processingUnits)) * 100)}%</span>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Training Options -->
                <div class="training-options">
                    <div class="option-card">
                        <label class="option-checkbox">
                            <input type="checkbox" id="save-checkpoints" checked>
                            <span class="checkmark"></span>
                            <span class="option-text">Save training checkpoints</span>
                        </label>
                    </div>
                    
                    <div class="option-card">
                        <label class="option-checkbox">
                            <input type="checkbox" id="generate-report" checked>
                            <span class="checkmark"></span>
                            <span class="option-text">Generate training report</span>
                        </label>
                    </div>
                    
                    <div class="option-card">
                        <label class="option-checkbox">
                            <input type="checkbox" id="auto-deploy">
                            <span class="checkmark"></span>
                            <span class="option-text">Auto-deploy after training</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Event listener setup methods
    setupModelSelectionListeners() {
        document.querySelectorAll('.model-type-card').forEach(card => {
            card.addEventListener('click', () => {
                // Remove selection from all cards
                document.querySelectorAll('.model-type-card').forEach(c => c.classList.remove('selected'));
                
                // Select clicked card
                card.classList.add('selected');
                
                const modelType = card.dataset.type;
                this.stepData.modelType = modelType;
                
                // Show/hide template selection
                const templateSelection = document.getElementById('template-selection');
                if (modelType === 'template') {
                    templateSelection.style.display = 'block';
                } else {
                    templateSelection.style.display = 'none';
                    this.stepData.selectedTemplate = null;
                }
                
                this.validateAndUpdateUI();
            });
        });
        
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                this.safeExecute(() => {
                    // Remove selection from all template cards
                    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
                    
                    // Select clicked template
                    card.classList.add('selected');
                    
                    this.stepData.selectedTemplate = card.dataset.template;
                    this.validateAndUpdateUI();
                }, 'template-selection');
            });
        });
    }
    
    setupDataConfigurationListeners() {
        // Preprocessing toggle
        const preprocessingToggle = document.getElementById('enable-preprocessing');
        if (preprocessingToggle) {
            preprocessingToggle.addEventListener('change', (e) => {
                this.stepData.preprocessingEnabled = e.target.checked;
                document.getElementById('preprocessing-options').style.display = 
                    e.target.checked ? 'block' : 'none';
            });
        }
        
        // Preprocessing method selectors
        ['numerical-method', 'missing-method', 'outlier-method'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.stepData[this.toCamelCase(id)] = e.target.value;
                });
            }
        });
        
        // Feature selection for custom models
        document.querySelectorAll('.input-feature').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.stepData.inputFeatures = Array.from(document.querySelectorAll('.input-feature:checked'))
                    .map(cb => cb.value);
                this.validateAndUpdateUI();
            });
        });
        
        document.querySelectorAll('.target-feature').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.stepData.targetFeature = e.target.value;
                this.validateAndUpdateUI();
            });
        });
    }
    
    populateTemplateMappings(columns) {
        const templates = {
            churn: [
                { name: 'Customer ID', type: 'ID', required: true },
                { name: 'Purchase Amount', type: 'Number', required: true },
                { name: 'Product Category', type: 'Category', required: true },
                { name: 'Date', type: 'Date', required: true }
            ],
            sales: [
                { name: 'Sales Date', type: 'Date', required: true },
                { name: 'Revenue', type: 'Number', required: true },
                { name: 'Region', type: 'Category', required: true }
            ],
            sentiment: [
                { name: 'Text Content', type: 'Text', required: true },
                { name: 'Sentiment Score', type: 'Number', required: false }
            ]
        };
        
        const requiredFields = templates[this.stepData.selectedTemplate] || [];
        
        requiredFields.forEach((field, index) => {
            const container = document.getElementById(`mapping-${index}`);
            if (container) {
                // Create dropdown for column mapping
                const select = document.createElement('select');
                select.className = 'form-control template-mapping-select';
                select.id = `template-mapping-${index}`;
                select.dataset.fieldName = field.name;
                select.dataset.required = field.required;
                
                // Add "Not Mapped" option for optional fields
                if (!field.required) {
                    const notMappedOption = document.createElement('option');
                    notMappedOption.value = '';
                    notMappedOption.textContent = 'Not Mapped (Optional)';
                    select.appendChild(notMappedOption);
                }
                
                // Add default option for required fields
                if (field.required) {
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = 'Select Column...';
                    defaultOption.disabled = true;
                    defaultOption.selected = true;
                    select.appendChild(defaultOption);
                }
                
                // Add column options
                columns.forEach(column => {
                    const option = document.createElement('option');
                    option.value = column.name;
                    option.textContent = `${column.name} (${column.data_type})`;
                    
                    // Auto-select if already mapped
                    if (this.stepData.templateMappings[field.name] === column.name) {
                        option.selected = true;
                    }
                    
                    select.appendChild(option);
                });
                
                // Add event listener for mapping changes
                select.addEventListener('change', (e) => {
                    const fieldName = e.target.dataset.fieldName;
                    if (e.target.value) {
                        this.stepData.templateMappings[fieldName] = e.target.value;
                    } else {
                        delete this.stepData.templateMappings[fieldName];
                    }
                    this.validateAndUpdateUI();
                });
                
                container.appendChild(select);
            }
        });
    }
    
    setupModelParametersListeners() {
        // Model name and description
        ['model-name', 'model-description'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.stepData[this.toCamelCase(id)] = e.target.value;
                    this.validateAndUpdateUI();
                });
            }
        });
        
        // Algorithm selection for custom models
        const algorithmSelect = document.getElementById('algorithm-select');
        if (algorithmSelect) {
            algorithmSelect.addEventListener('change', (e) => {
                this.stepData.algorithm = e.target.value;
                this.updateParametersGrid();
                this.validateAndUpdateUI();
            });
        }
        
        // Advanced options
        ['cross-validation', 'test-split', 'random-seed'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.stepData[this.toCamelCase(id)] = e.target.value;
                });
            }
        });
        
        const earlyStoppingToggle = document.getElementById('early-stopping');
        if (earlyStoppingToggle) {
            earlyStoppingToggle.addEventListener('change', (e) => {
                this.stepData.earlyStopping = e.target.checked;
            });
        }
    }
    
    setupTrainingConfigurationListeners() {
        // Resource controls
        document.getElementById('decrease-units')?.addEventListener('click', () => {
            const current = this.stepData.processingUnits || 1;
            if (current > 1) {
                this.stepData.processingUnits = current - 1;
                this.updateResourceDisplay();
            }
        });
        
        document.getElementById('increase-units')?.addEventListener('click', () => {
            const current = this.stepData.processingUnits || 1;
            if (current < 10) {
                this.stepData.processingUnits = current + 1;
                this.updateResourceDisplay();
            }
        });
        
        document.getElementById('decrease-versions')?.addEventListener('click', () => {
            const current = this.stepData.modelVersions || 0;
            if (current > 0) {
                this.stepData.modelVersions = current - 1;
                this.updateResourceDisplay();
            }
        });
        
        document.getElementById('increase-versions')?.addEventListener('click', () => {
            const current = this.stepData.modelVersions || 0;
            this.stepData.modelVersions = current + 1;
            this.updateResourceDisplay();
        });
        
        // Optimization options
        ['hyperparameter-tuning', 'auto-features', 'model-ensemble'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.stepData[this.toCamelCase(id)] = e.target.checked;
                });
            }
        });
        
        // Monitoring options
        ['training-alerts', 'performance-threshold', 'max-training-time'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.stepData[this.toCamelCase(id)] = e.target.value;
                });
            }
        });
    }
    
    // Navigation and validation methods
    nextStep() {
        if (this.validateAndUpdateUI() && this.currentStep < this.totalSteps) {
            this.showStep(this.currentStep + 1);
        }
    }
    
    previousStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }
    
    canNavigateToStep(stepNumber) {
        // Allow navigation to previous steps or current step
        if (stepNumber <= this.currentStep) return true;
        
        // Allow navigation to next step only if current step is valid
        if (stepNumber === this.currentStep + 1) {
            return this.getValidationState();
        }
        
        return false;
    }
    
    validateCurrentStep() {
        let isValid = false;
        let validationResult = { valid: true, errors: [] };
        
        switch(this.currentStep) {
            case 1: // Model Selection
                validationResult = this.validateModelSelection();
                break;
            case 2: // Data Upload
                validationResult = this.validateDataUpload();
                break;
            case 3: // Data Configuration
                validationResult = this.validateDataConfiguration();
                break;
            case 4: // Model Parameters
                validationResult = this.validateModelParameters();
                break;
            case 5: // Training Configuration
                validationResult = this.validateTrainingConfiguration();
                break;
            case 6: // Review
                validationResult = this.validateReview();
                break;
        }
        
        isValid = validationResult.valid;
        
        // Show validation errors if any
        if (!isValid) {
            this.showStepValidationErrors(validationResult.errors);
        } else {
            this.clearStepValidationErrors();
        }
        
        return isValid;
    }
    
    validateModelSelection() {
        const errors = [];
        
        if (!this.stepData.modelType) {
            errors.push('Please select a model type (Template or Custom)');
        }
        
        if (this.stepData.modelType === 'template' && !this.stepData.selectedTemplate) {
            errors.push('Please select a template model');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    validateDataUpload() {
        const errors = [];
        
        if (!this.stepData.validationResult) {
            errors.push('Please upload a data file');
        } else if (!this.stepData.validationResult.is_valid) {
            errors.push('The uploaded data file has quality issues that must be resolved');
            
            // Add specific data quality issues
            if (this.stepData.validationResult.recommendations) {
                errors.push(...this.stepData.validationResult.recommendations.slice(0, 3));
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    validateDataConfiguration() {
        const errors = [];
        
        if (this.stepData.modelType === 'template') {
            // Validate template mappings - check required fields
            const templates = {
                churn: [
                    { name: 'Customer ID', type: 'ID', required: true },
                    { name: 'Purchase Amount', type: 'Number', required: true },
                    { name: 'Product Category', type: 'Category', required: true },
                    { name: 'Date', type: 'Date', required: true }
                ],
                sales: [
                    { name: 'Sales Date', type: 'Date', required: true },
                    { name: 'Revenue', type: 'Number', required: true },
                    { name: 'Region', type: 'Category', required: true }
                ],
                sentiment: [
                    { name: 'Text Content', type: 'Text', required: true },
                    { name: 'Sentiment Score', type: 'Number', required: false }
                ]
            };
            
            const requiredFields = templates[this.stepData.selectedTemplate] || [];
            const mappings = this.stepData.templateMappings || {};
            
            if (Object.keys(mappings).length === 0) {
                errors.push('Please configure column mappings for the template');
            } else {
                // Check each required field is mapped
                requiredFields.forEach(field => {
                    if (field.required && !mappings[field.name]) {
                        errors.push(`Required field "${field.name}" must be mapped to a column`);
                    }
                });
                
                // Check for duplicate mappings
                const mappedColumns = Object.values(mappings).filter(col => col);
                const uniqueColumns = new Set(mappedColumns);
                if (mappedColumns.length !== uniqueColumns.size) {
                    errors.push('Each column can only be mapped to one field');
                }
            }
        } else {
            // Validate custom feature selection
            if (!this.stepData.inputFeatures || this.stepData.inputFeatures.length === 0) {
                errors.push('Please select at least one input feature');
            }
            
            if (!this.stepData.targetFeature) {
                errors.push('Please select a target variable to predict');
            }
            
            if (this.stepData.inputFeatures && this.stepData.targetFeature && 
                this.stepData.inputFeatures.includes(this.stepData.targetFeature)) {
                errors.push('Target variable cannot be used as an input feature');
            }
            
            // Validate minimum features for algorithm
            if (this.stepData.inputFeatures && this.stepData.inputFeatures.length < 2) {
                errors.push('At least 2 input features are recommended for reliable model training');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    validateModelParameters() {
        const errors = [];
        
        // Validate model name
        const modelNameValidation = formValidation.rules.modelName(this.stepData.modelName);
        if (!modelNameValidation.valid) {
            errors.push(modelNameValidation.message);
        }
        
        // Validate algorithm selection for custom models
        if (this.stepData.modelType === 'custom' && !this.stepData.algorithm) {
            errors.push('Please select a machine learning algorithm');
        }
        
        // Validate algorithm-specific parameters
        if (this.stepData.algorithm) {
            const paramErrors = this.validateAlgorithmParameters();
            errors.push(...paramErrors);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    validateAlgorithmParameters() {
        const errors = [];
        const algorithm = this.stepData.algorithm;
        
        // Get parameter values from form
        const epochs = document.getElementById('epochs')?.value;
        const learningRate = document.getElementById('learning-rate')?.value;
        const hiddenLayers = document.getElementById('hidden-layers')?.value;
        const batchSize = document.getElementById('batch-size')?.value;
        
        // Validate epochs
        if (epochs && (isNaN(epochs) || epochs < 1 || epochs > 1000)) {
            errors.push('Epochs must be between 1 and 1000');
        }
        
        // Validate learning rate
        if (learningRate && (isNaN(learningRate) || learningRate <= 0 || learningRate > 1)) {
            errors.push('Learning rate must be between 0 and 1');
        }
        
        // Algorithm-specific validations
        if (algorithm.includes('neural_network')) {
            if (hiddenLayers && (isNaN(hiddenLayers) || hiddenLayers < 1 || hiddenLayers > 10)) {
                errors.push('Hidden layers must be between 1 and 10 for neural networks');
            }
            
            if (batchSize && (isNaN(batchSize) || batchSize < 1 || batchSize > 512)) {
                errors.push('Batch size must be between 1 and 512');
            }
        }
        
        return errors;
    }
    
    validateTrainingConfiguration() {
        const errors = [];
        
        // Validate processing units
        if (this.stepData.processingUnits && (this.stepData.processingUnits < 1 || this.stepData.processingUnits > 10)) {
            errors.push('Processing units must be between 1 and 10');
        }
        
        // Validate performance threshold
        if (this.stepData.performanceThreshold && 
            (this.stepData.performanceThreshold < 0 || this.stepData.performanceThreshold > 100)) {
            errors.push('Performance threshold must be between 0 and 100');
        }
        
        // Validate max training time
        if (this.stepData.maxTrainingTime && this.stepData.maxTrainingTime < 0) {
            errors.push('Max training time cannot be negative');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    validateReview() {
        const errors = [];
        
        // Final validation - check all critical data is present
        if (!this.stepData.modelName) {
            errors.push('Model name is required');
        }
        
        if (!this.stepData.validationResult) {
            errors.push('Training data is required');
        }
        
        if (this.stepData.modelType === 'custom') {
            if (!this.stepData.inputFeatures || this.stepData.inputFeatures.length === 0) {
                errors.push('Input features must be selected');
            }
            
            if (!this.stepData.targetFeature) {
                errors.push('Target variable must be selected');
            }
            
            if (!this.stepData.algorithm) {
                errors.push('Algorithm must be selected');
            }
        } else if (this.stepData.modelType === 'template') {
            if (!this.stepData.selectedTemplate) {
                errors.push('Template must be selected');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    showStepValidationErrors(errors) {
        // Remove existing error display
        this.clearStepValidationErrors();
        
        if (errors.length === 0) return;
        
        // Create error summary
        const stepContainer = document.getElementById('step-container');
        const errorSummary = document.createElement('div');
        errorSummary.className = 'step-validation-errors';
        errorSummary.innerHTML = `
            <div class="validation-summary">
                <h4><i class="fas fa-exclamation-triangle"></i> Please correct the following issues:</h4>
                <ul>
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        `;
        
        stepContainer.insertBefore(errorSummary, stepContainer.firstChild);
        
        // Scroll to top of step
        stepContainer.scrollTop = 0;
    }
    
    clearStepValidationErrors() {
        const errorSummary = document.querySelector('.step-validation-errors');
        if (errorSummary) {
            errorSummary.remove();
        }
    }
    
    // Get current validation state without triggering validation UI updates
    getValidationState() {
        let validationResult = { valid: true, errors: [] };
        
        switch (this.currentStep) {
            case 1:
                validationResult = this.validateModelSelection();
                break;
            case 2:
                validationResult = this.validateDataUpload();
                break;
            case 3:
                validationResult = this.validateDataConfiguration();
                break;
            case 4:
                validationResult = this.validateModelParameters();
                break;
            case 5:
                validationResult = this.validateTrainingConfiguration();
                break;
            case 6:
                validationResult = this.validateReview();
                break;
        }
        
        return validationResult.valid;
    }
    
    // Validate current step and update UI safely
    validateAndUpdateUI() {
        const isValid = this.validateCurrentStep();
        this.updateNavigationButtons();
        return isValid;
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const finishBtn = document.getElementById('finish-btn');
        
        // Previous button
        prevBtn.disabled = this.currentStep === 1;
        
        // Next/Finish buttons - get validation state without calling validateCurrentStep
        const isValid = this.getValidationState();
        
        if (this.currentStep === this.totalSteps) {
            nextBtn.style.display = 'none';
            finishBtn.style.display = 'block';
            finishBtn.disabled = !isValid;
        } else {
            nextBtn.style.display = 'block';
            finishBtn.style.display = 'none';
            nextBtn.disabled = !isValid;
        }
    }
    
    // Helper methods
    toCamelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
    
    getTemplateAlgorithm() {
        const algorithms = {
            churn: 'Logistic Regression',
            sales: 'LSTM Neural Network',
            sentiment: 'BERT Transformer'
        };
        return algorithms[this.stepData.selectedTemplate] || 'Unknown';
    }
    
    updateParametersGrid() {
        const grid = document.getElementById('parameters-grid');
        if (!grid) return;
        
        const algorithm = this.stepData.algorithm || this.getTemplateDefaultAlgorithm();
        
        // Generate parameter fields based on algorithm
        // This is a simplified version - in practice, you'd have more comprehensive parameter definitions
        const parameters = this.getAlgorithmParameters(algorithm);
        
        grid.innerHTML = parameters.map(param => `
            <div class="parameter-group">
                <label for="${param.id}">${param.label}</label>
                ${param.type === 'select' ? 
                    `<select id="${param.id}" class="form-control">
                        ${param.options.map(opt => `<option value="${opt.value}" ${opt.selected ? 'selected' : ''}>${opt.label}</option>`).join('')}
                    </select>` :
                    `<input type="${param.type}" id="${param.id}" class="form-control" 
                            value="${param.default}" min="${param.min || ''}" max="${param.max || ''}" step="${param.step || ''}">`
                }
            </div>
        `).join('');
    }
    
    getAlgorithmParameters(algorithm) {
        // Return algorithm-specific parameters
        // This is a simplified implementation
        return [
            { id: 'epochs', label: 'Epochs', type: 'number', default: 10, min: 1, max: 1000 },
            { id: 'learning-rate', label: 'Learning Rate', type: 'number', default: 0.001, min: 0.0001, max: 1, step: 0.0001 }
        ];
    }
    
    updateResourceDisplay() {
        const unitsSpan = document.getElementById('processing-units');
        const versionsSpan = document.getElementById('model-versions');
        const gpuSpecs = document.getElementById('gpu-specs');
        const unitsCost = document.getElementById('units-cost');
        const versionsCost = document.getElementById('versions-cost');
        
        if (unitsSpan) unitsSpan.textContent = this.stepData.processingUnits || 1;
        if (versionsSpan) versionsSpan.textContent = this.stepData.modelVersions || 0;
        
        if (gpuSpecs) {
            const units = this.stepData.processingUnits || 1;
            const memory = units * 8;
            const cores = units * 4;
            gpuSpecs.textContent = `GPU: ${memory}GB Memory, ${cores} Cores`;
        }
        
        if (unitsCost) {
            const baseCost = 500; // Base token cost per hour
            const units = this.stepData.processingUnits || 1;
            const totalCost = baseCost * units;
            unitsCost.textContent = `~${totalCost.toLocaleString()} tokens/hour`;
            // Note: Training time will be divided by units (handled in training logic)
        }
        
        if (versionsCost) {
            const cost = (this.stepData.modelVersions || 0) * 100;
            versionsCost.textContent = `~${cost} tokens/version`;
        }
    }
    
    calculateEstimatedCost() {
        const dataSize = this.stepData.validationResult?.total_rows || 0;
        const dataColumns = this.stepData.validationResult?.total_columns || 0;
        const processingUnits = this.stepData.processingUnits || 1;
        const modelVersions = this.stepData.modelVersions || 0;
        
        // Base costs
        const baseTrainingCostPerRow = 0.1;
        const baseStorageCostPerVersion = 100;
        
        // Algorithm complexity factor
        const algorithmFactor = this.getAlgorithmComplexityFactor();
        
        // Data processing costs
        const dataProcessingCost = this.getDataProcessingCost(dataSize, dataColumns);
        
        // Training costs
        const baseTraining = dataSize * baseTrainingCostPerRow * algorithmFactor;
        const gpuCost = processingUnits * 500; // 500 tokens per GPU unit per hour
        
        // Calculate training time in hours
        const estimatedTimeMinutes = this.calculateEstimatedTime();
        const estimatedHours = estimatedTimeMinutes / 60;
        
        // Processing unit costs (GPU time)
        const processingCost = Math.round(gpuCost * estimatedHours);
        
        // Optimization costs
        const optimizationCost = this.getOptimizationCost(dataSize);
        
        // Feature engineering costs
        const featureEngineeringCost = this.stepData.preprocessingEnabled ? 
            Math.round(dataSize * dataColumns * 0.01) : 0;
        
        // Storage costs
        const storageCost = modelVersions * baseStorageCostPerVersion;
        
        // Cross-validation costs (additional training iterations)
        const crossValidationCost = this.getCrossValidationCost(baseTraining);
        
        // Calculate totals
        const trainingTotal = Math.round(baseTraining + processingCost + crossValidationCost);
        const preprocessingTotal = Math.round(dataProcessingCost + featureEngineeringCost);
        const optimizationTotal = Math.round(optimizationCost);
        const storageTotal = Math.round(storageCost);
        
        const grandTotal = trainingTotal + preprocessingTotal + optimizationTotal + storageTotal;
        
        return {
            // Main categories
            training: trainingTotal,
            preprocessing: preprocessingTotal,
            optimization: optimizationTotal,
            storage: storageTotal,
            total: grandTotal,
            
            // Detailed breakdown
            breakdown: {
                baseTraining: Math.round(baseTraining),
                processingUnits: processingCost,
                crossValidation: Math.round(crossValidationCost),
                dataProcessing: Math.round(dataProcessingCost),
                featureEngineering: featureEngineeringCost,
                hyperparameterTuning: this.stepData.hyperparameterTuning ? Math.round(optimizationCost * 0.6) : 0,
                autoFeatureSelection: this.stepData.autoFeatures ? Math.round(optimizationCost * 0.2) : 0,
                modelEnsemble: this.stepData.modelEnsemble ? Math.round(optimizationCost * 0.2) : 0,
                modelStorage: storageTotal
            },
            
            // Hourly rates
            hourlyRate: gpuCost * processingUnits,
            estimatedHours: estimatedHours.toFixed(2)
        };
    }
    
    calculateEstimatedTime() {
        const dataSize = this.stepData.validationResult?.total_rows || 0;
        const dataColumns = this.stepData.validationResult?.total_columns || 0;
        const processingUnits = this.stepData.processingUnits || 1;
        
        // Base time calculation (in minutes)
        let baseTime = Math.max(5, dataSize / 1000) * (dataColumns / 10);
        
        // Algorithm complexity factor
        const algorithmFactor = this.getAlgorithmComplexityFactor();
        baseTime *= algorithmFactor;
        
        // Add time for preprocessing
        if (this.stepData.preprocessingEnabled) {
            baseTime += (dataSize * dataColumns) / 50000; // Additional preprocessing time
        }
        
        // Add time for hyperparameter tuning
        if (this.stepData.hyperparameterTuning) {
            baseTime *= 2.5; // Hyperparameter tuning increases time significantly
        }
        
        // Add time for cross-validation
        const crossValidation = this.stepData.crossValidation || 'kfold';
        if (crossValidation === 'kfold') {
            baseTime *= 1.5; // K-fold adds 50% more time
        } else if (crossValidation === 'stratified') {
            baseTime *= 1.6;
        }
        
        // Add time for model ensemble
        if (this.stepData.modelEnsemble) {
            baseTime *= 1.8; // Ensemble methods take longer
        }
        
        // Reduce time based on processing units (parallel processing)
        const effectiveTime = baseTime / Math.sqrt(processingUnits);
        
        return Math.round(Math.max(1, effectiveTime));
    }
    
    // Helper method to get algorithm complexity factor
    getAlgorithmComplexityFactor() {
        const algorithm = this.stepData.algorithm || this.getTemplateDefaultAlgorithm();
        
        const complexityFactors = {
            // Classification
            'logistic_regression': 1.0,
            'naive_bayes': 0.8,
            'decision_tree_clf': 1.0,
            'random_forest_clf': 1.5,
            'svm_clf': 2.0,
            'neural_network_clf': 2.5,
            'xgboost_clf': 1.8,
            'knn_clf': 1.2,
            
            // Regression
            'linear_regression': 0.8,
            'polynomial_regression': 1.2,
            'ridge_regression': 1.0,
            'lasso_regression': 1.0,
            'random_forest_reg': 1.5,
            'neural_network_reg': 2.5,
            'svm_reg': 2.0,
            'xgboost_reg': 1.8,
            
            // Clustering
            'kmeans': 1.0,
            'dbscan': 1.5,
            'hierarchical': 1.8,
            'gaussian_mixture': 1.6,
            'mean_shift': 1.4,
            
            // Time Series
            'arima': 1.5,
            'lstm': 3.0,
            'prophet': 1.3,
            'seasonal_decompose': 1.2,
            
            // NLP
            'bert': 4.0,
            'gpt': 4.5,
            'sentiment_analysis': 2.0,
            'text_classification': 2.0,
            'named_entity_recognition': 2.5
        };
        
        return complexityFactors[algorithm] || 1.5;
    }
    
    // Helper method to calculate data processing costs
    getDataProcessingCost(dataSize, dataColumns) {
        let cost = 0;
        
        // Base data validation cost
        cost += dataSize * 0.01;
        
        // Missing value handling cost
        const missingMethod = this.stepData.missingMethod || 'drop';
        if (missingMethod === 'mean' || missingMethod === 'median') {
            cost += dataSize * dataColumns * 0.005;
        } else if (missingMethod === 'forward') {
            cost += dataSize * dataColumns * 0.008;
        }
        
        // Outlier treatment cost
        const outlierMethod = this.stepData.outlierMethod || 'none';
        if (outlierMethod !== 'none') {
            cost += dataSize * dataColumns * 0.01;
        }
        
        // Numerical standardization cost
        if (this.stepData.preprocessingEnabled) {
            const numericalMethod = this.stepData.numericalMethod || 'zscore';
            if (numericalMethod !== 'none') {
                cost += dataSize * dataColumns * 0.003;
            }
        }
        
        return cost;
    }
    
    // Helper method to calculate optimization costs
    getOptimizationCost(dataSize) {
        let cost = 0;
        
        // Hyperparameter tuning cost
        if (this.stepData.hyperparameterTuning) {
            const algorithmFactor = this.getAlgorithmComplexityFactor();
            cost += dataSize * 0.5 * algorithmFactor;
        }
        
        // Auto feature selection cost
        if (this.stepData.autoFeatures) {
            cost += dataSize * 0.2;
        }
        
        // Model ensemble cost
        if (this.stepData.modelEnsemble) {
            cost += dataSize * 0.3;
        }
        
        return cost;
    }
    
    // Helper method to calculate cross-validation costs
    getCrossValidationCost(baseTrainingCost) {
        const crossValidation = this.stepData.crossValidation || 'kfold';
        
        if (crossValidation === 'none') {
            return 0;
        } else if (crossValidation === 'kfold') {
            return baseTrainingCost * 0.5; // 5-fold adds 50% overhead
        } else if (crossValidation === 'stratified') {
            return baseTrainingCost * 0.6;
        } else if (crossValidation === 'time-series') {
            return baseTrainingCost * 0.4;
        }
        
        return 0;
    }
    
    // Helper method to format algorithm names for display
    formatAlgorithmName(algorithmId) {
        const algorithmNames = {
            // Classification
            'logistic_regression': 'Logistic Regression',
            'naive_bayes': 'Naive Bayes',
            'decision_tree_clf': 'Decision Tree',
            'random_forest_clf': 'Random Forest Classifier',
            'svm_clf': 'Support Vector Machine',
            'neural_network_clf': 'Neural Network Classifier',
            'xgboost_clf': 'XGBoost Classifier',
            'knn_clf': 'K-Nearest Neighbors',
            
            // Regression
            'linear_regression': 'Linear Regression',
            'polynomial_regression': 'Polynomial Regression',
            'ridge_regression': 'Ridge Regression',
            'lasso_regression': 'Lasso Regression',
            'random_forest_reg': 'Random Forest Regressor',
            'neural_network_reg': 'Neural Network Regressor',
            'svm_reg': 'Support Vector Regressor',
            'xgboost_reg': 'XGBoost Regressor',
            
            // Clustering
            'kmeans': 'K-Means Clustering',
            'dbscan': 'DBSCAN',
            'hierarchical': 'Hierarchical Clustering',
            'gaussian_mixture': 'Gaussian Mixture Model',
            'mean_shift': 'Mean Shift',
            
            // Time Series
            'arima': 'ARIMA',
            'lstm': 'LSTM Network',
            'prophet': 'Prophet',
            'seasonal_decompose': 'Seasonal Decomposition',
            
            // NLP
            'bert': 'BERT',
            'gpt': 'GPT',
            'sentiment_analysis': 'Sentiment Analysis',
            'text_classification': 'Text Classification',
            'named_entity_recognition': 'Named Entity Recognition'
        };
        
        return algorithmNames[algorithmId] || algorithmId;
    }
    
    // Helper method to format cross-validation display
    formatCrossValidation(method) {
        const methodNames = {
            'none': 'No Validation',
            'kfold': 'K-Fold (5 folds)',
            'stratified': 'Stratified K-Fold',
            'time-series': 'Time Series Split'
        };
        
        return methodNames[method] || method || 'K-Fold (5 folds)';
    }
    
    async finishWizard() {
        // Collect all configuration data
        const config = {
            ...this.stepData,
            timestamp: new Date().toISOString()
        };
        
        // Start training with WebSocket support
        try {
            const response = await this.startTraining(config);
            if (response.job_id) {
                // Subscribe to WebSocket updates
                await this.subscribeToTrainingUpdates(response.job_id);
            }
        } catch (error) {
            console.error('Failed to start training:', error);
            this.showError('Failed to start training: ' + error.message);
        }
        
        // Trigger callback
        if (this.options.onFinish) {
            this.options.onFinish(config);
        }
    }
    
    async startTraining(config) {
        // Prepare training request
        const requestData = {
            config: {
                model_id: `model_${Date.now()}`,
                model_name: config.modelName,
                algorithm: config.algorithm || this.getTemplateDefaultAlgorithm(),
                parameters: this.extractParameters(),
                data_config: {
                    input_features: config.inputFeatures || [],
                    target_feature: config.targetFeature
                },
                preprocessing_config: {
                    missing_method: config.missingMethod || 'drop',
                    numerical_method: config.numericalMethod || 'zscore',
                    outlier_method: config.outlierMethod || 'none'
                },
                training_config: {
                    test_split: config.testSplit || 0.2,
                    random_seed: config.randomSeed || 42,
                    cross_validation: config.crossValidation || 'kfold'
                },
                optimization_config: {
                    hyperparameter_tuning: config.hyperparameterTuning || false,
                    auto_features: config.autoFeatures || false,
                    model_ensemble: config.modelEnsemble || false
                }
            },
            file_data: await this.getFileDataBase64()
        };
        
        // Send training request
        const response = await fetch('/api/models/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to start training');
        }
        
        return await response.json();
    }
    
    async subscribeToTrainingUpdates(jobId) {
        // Import WebSocket service
        const { default: wsService } = await import('../../js/services/websocket_service.js');
        
        // Ensure WebSocket is connected
        await wsService.connect();
        
        // Subscribe to job updates
        await wsService.subscribeToJob(jobId, {
            onProgress: (data) => this.handleTrainingProgress(data),
            onComplete: (data) => this.handleTrainingComplete(data),
            onError: (data) => this.handleTrainingError(data)
        });
        
        // Show training modal
        this.showTrainingModal(jobId);
    }
    
    handleTrainingProgress(data) {
        console.log('Training progress:', data);
        // Update UI with progress data
        // This will be handled by the WebSocket service's updateProgressUI method
    }
    
    handleTrainingComplete(data) {
        console.log('Training complete:', data);
        
        // Show completion UI
        const completionSection = document.getElementById('completion-section');
        if (completionSection) {
            completionSection.style.display = 'block';
            
            // Update metrics
            if (data.metrics) {
                const accuracy = data.metrics.accuracy || data.metrics.r2_score || 0;
                const finalAccuracy = document.getElementById('final-accuracy');
                if (finalAccuracy) {
                    finalAccuracy.textContent = (accuracy * 100).toFixed(1);
                }
            }
        }
    }
    
    handleTrainingError(data) {
        console.error('Training error:', data);
        this.showError(data.error_message || 'Training failed');
    }
    
    showTrainingModal(jobId) {
        // Show the progress modal
        const modal = document.getElementById('progress-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // Update job ID display
            const jobIdElement = document.getElementById('training-job-id');
            if (jobIdElement) {
                jobIdElement.textContent = jobId;
            }
        }
    }
    
    async getFileDataBase64() {
        // Get file data from validation result
        if (!this.stepData.uploadedFile) {
            throw new Error('No file uploaded');
        }
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(this.stepData.uploadedFile);
        });
    }
    
    extractParameters() {
        // Extract algorithm parameters from form
        const params = {};
        
        // Get all parameter inputs from step 4
        const paramInputs = document.querySelectorAll('#parameters-grid input, #parameters-grid select');
        paramInputs.forEach(input => {
            if (input.id && input.value) {
                const key = input.id.replace('-', '_');
                const value = input.type === 'number' ? parseFloat(input.value) : input.value;
                params[key] = value;
            }
        });
        
        return params;
    }
    
    getTemplateDefaultAlgorithm() {
        const algorithms = {
            'churn': 'logistic_regression',
            'sales': 'lstm',
            'sentiment': 'bert'
        };
        return algorithms[this.stepData.selectedTemplate] || 'random_forest_clf';
    }
    
    showError(message) {
        // Show error notification
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert('Error: ' + message);
        }
    }
    
    // Data cleaning handler
    handleDataCleaning(validationResult, file) {
        // Implement auto data cleaning logic
        console.log('Auto-cleaning data...', validationResult);
        
        // For now, just show a message
        alert('Auto data cleaning feature will be implemented in the next phase.');
    }
    
    // Public API
    getCurrentStep() {
        return this.currentStep;
    }
    
    getStepData() {
        return { ...this.stepData };
    }
    
    setStepData(data) {
        this.stepData = { ...this.stepData, ...data };
        this.persistStepData();
        this.validateAndUpdateUI();
    }
    
    reset() {
        this.currentStep = 1;
        this.stepData = {};
        this.clearPersistedData();
        this.showStep(1);
    }
    
    // Data persistence methods
    persistStepData() {
        if (!this.options.enablePersistence) return;
        
        try {
            const persistData = {
                currentStep: this.currentStep,
                stepData: this.stepData,
                timestamp: Date.now()
            };
            localStorage.setItem(this.persistenceKey, JSON.stringify(persistData));
        } catch (error) {
            console.warn('Failed to persist wizard data:', error);
        }
    }
    
    loadPersistedData() {
        if (!this.options.enablePersistence) return false;
        
        try {
            const stored = localStorage.getItem(this.persistenceKey);
            if (!stored) return false;
            
            const persistData = JSON.parse(stored);
            
            // Check if data is not too old (24 hours)
            const ageHours = (Date.now() - persistData.timestamp) / (1000 * 60 * 60);
            if (ageHours > 24) {
                this.clearPersistedData();
                return false;
            }
            
            this.currentStep = persistData.currentStep || 1;
            this.stepData = persistData.stepData || {};
            
            return true;
        } catch (error) {
            console.warn('Failed to load persisted wizard data:', error);
            this.clearPersistedData();
            return false;
        }
    }
    
    clearPersistedData() {
        try {
            localStorage.removeItem(this.persistenceKey);
        } catch (error) {
            console.warn('Failed to clear persisted data:', error);
        }
    }
    
    // Error handling and recovery methods for production stability
    handleError(error, context = 'Unknown') {
        console.error(`ModelWizard Error [${context}]:`, error);
        
        if (!this.errorRecoveryEnabled) {
            throw error;
        }
        
        // Show user-friendly error message
        this.showErrorMessage(`An error occurred: ${error.message || 'Please try again.'}`, context);
        
        // Attempt recovery based on context
        this.attemptErrorRecovery(error, context);
    }
    
    showErrorMessage(message, context) {
        // Remove any existing error messages
        const existingError = document.querySelector('.wizard-error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Create error display
        const errorDiv = document.createElement('div');
        errorDiv.className = 'wizard-error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <div class="error-text">
                    <h4>Something went wrong</h4>
                    <p>${message}</p>
                    <small>Context: ${context}</small>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i> Dismiss
                </button>
            </div>
        `;
        
        // Insert at top of wizard container
        this.container.insertBefore(errorDiv, this.container.firstChild);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }
    
    attemptErrorRecovery(error, context) {
        switch (context) {
            case 'template-selection':
                // Reset template selection
                this.stepData.selectedTemplate = null;
                this.stepData.modelType = null;
                document.querySelectorAll('.template-card, .model-type-option').forEach(el => {
                    el.classList.remove('selected');
                });
                break;
                
            case 'data-validation':
                // Reset validation state
                this.stepData.validationResult = null;
                this.stepData.uploadedFile = null;
                if (this.validationPanel) {
                    this.validationPanel.reset();
                }
                break;
                
            case 'feature-selection':
                // Reset feature selections
                this.stepData.inputFeatures = [];
                this.stepData.targetFeature = null;
                document.querySelectorAll('.input-feature, .target-feature').forEach(el => {
                    el.checked = false;
                });
                break;
                
            case 'navigation':
                // Safe navigation fallback
                if (this.currentStep > 1) {
                    this.showStep(Math.max(1, this.currentStep - 1));
                }
                break;
                
            default:
                // General recovery - refresh current step
                this.showStep(this.currentStep);
                break;
        }
        
        // Update UI after recovery
        try {
            this.updateNavigationButtons();
        } catch (navError) {
            console.error('Navigation update failed during recovery:', navError);
        }
    }
    
    // Wrap critical methods with error handling
    safeExecute(method, context, ...args) {
        try {
            return method.apply(this, args);
        } catch (error) {
            this.handleError(error, context);
            return false;
        }
    }
}

export { ModelWizard };