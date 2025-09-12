import { StyledDropdown } from '../../components/StyledDropdown/StyledDropdown.js';
import { loadComponentCSS } from '../services/componentLoader.js';
import tokenService from '../services/token_service.js';

class ModelEditorPage {
    constructor() {
        this.dropdowns = {};
        this.modelHistoryVersions = 0;
        this.processingUnits = 1; // Default to 1 processing unit
        this.tokenCosts = {
            versionCost: 0,  // Start at 0, calculate dynamically based on model complexity
            trainingBaseCost: 0,  // Start at 0, calculate dynamically
            processingUnitCost: 500  // Cost per processing unit per hour
        };
        this.uploadedData = null;
        this.selectedFile = null; // Store selected file before upload
        this.columnNames = [];
        this.dataMetrics = {
            accuracy: 0,
            dataQuality: 0,
            modelComplexity: 0,
            modelQuality: 0
        };
        this.modelType = null; // 'template' or 'new'
        this.selectedModelId = null;
        this.requiredColumns = []; // For template models
        this.trainingColumns = []; // Selected training columns
        this.predictionColumns = []; // Selected prediction columns
        this.selectedAlgorithm = null; // Selected ML algorithm
        this.algorithmConfigs = this.getAlgorithmConfigs(); // Algorithm configurations
    }

    async initialize() {
        // Load StyledDropdown CSS
        loadComponentCSS('src/components/StyledDropdown/StyledDropdown.css');
        
        this.setupDropdowns();
        this.setupEventListeners();
        this.calculateDynamicVersionCost(); // Initialize version cost calculation
        this.initializeMetricsDisplay(); // Show all zeros initially
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

        // Tagged data section will be initialized dynamically when model is selected and data is uploaded

        // Testing data dropdowns
        const testingDataUnitContainer = document.getElementById('testing-data-unit-container');
        if (testingDataUnitContainer) {
            this.dropdowns.testingUnit = new StyledDropdown(testingDataUnitContainer, {
                id: 'testing-unit',
                placeholder: 'Percentage',
                options: [
                    { value: 'percentage', title: 'Percentage', icon: 'fas fa-percentage' },
                    { value: 'rows', title: 'Rows', icon: 'fas fa-table' }
                ],
                value: 'percentage'
            });
        }

        const testingDataFromContainer = document.getElementById('testing-data-from-container');
        if (testingDataFromContainer) {
            this.dropdowns.testingFrom = new StyledDropdown(testingDataFromContainer, {
                id: 'testing-from',
                placeholder: 'Random Selection',
                options: [
                    { value: 'random', title: 'Random Selection', icon: 'fas fa-random' },
                    { value: 'first', title: 'First Rows', icon: 'fas fa-arrow-up' },
                    { value: 'last', title: 'Last Rows', icon: 'fas fa-arrow-down' }
                ],
                value: 'random'
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

        // Processing Units controls
        const processingControls = document.querySelector('.processing-units .history-controls');
        if (processingControls) {
            const minusBtn = processingControls.querySelector('.minus-button');
            const plusBtn = processingControls.querySelector('.plus-button');
            const unitsSpan = processingControls.querySelector('span:nth-child(2)');
            const gpuInfoSpan = processingControls.querySelector('.gpu-info');
            
            minusBtn.addEventListener('click', () => {
                if (this.processingUnits > 1) {
                    this.processingUnits--;
                    unitsSpan.textContent = this.processingUnits;
                    this.updateProcessingUnitsDisplay(gpuInfoSpan);
                    this.updateCostCalculations();
                }
            });
            
            plusBtn.addEventListener('click', () => {
                if (this.processingUnits < 10) { // Max 10 units
                    this.processingUnits++;
                    unitsSpan.textContent = this.processingUnits;
                    this.updateProcessingUnitsDisplay(gpuInfoSpan);
                    this.updateCostCalculations();
                }
            });
        }

        // Add listeners for model parameters to update metrics in real-time
        const paramInputs = ['epoch', 'hidden-layers', 'batch-size', 'model-name', 'model-description'];
        paramInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                // Use both input and change events for immediate updates
                input.addEventListener('input', () => {
                    this.updateMetricsDisplay();
                });
                input.addEventListener('change', () => {
                    this.updateMetricsDisplay();
                });
            }
        });

        // Add listener for algorithm selection
        const algorithmSelect = document.getElementById('model-algorithm');
        if (algorithmSelect) {
            algorithmSelect.addEventListener('change', (e) => {
                this.selectedAlgorithm = e.target.value;
                this.updateParameterFields(e.target.value);
                this.updateMetricsDisplay();
            });
        }

        // Add file upload listener to store file (no auto-upload)
        const csvUpload = document.getElementById('csv-upload');
        if (csvUpload) {
            csvUpload.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    // Handle CSV and other text files
                    if (file.type === 'text/csv' || file.name.endsWith('.csv') || 
                        file.type === 'text/plain' || file.type === '' ||
                        file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
                        file.name.endsWith('.json')) {
                        // Just store the file and update display
                        this.selectedFile = file;
                        const fileName = document.getElementById('file-name');
                        if (fileName) {
                            fileName.textContent = file.name;
                        }
                        // Show upload button and clear button
                        const uploadButton = document.getElementById('upload-button');
                        if (uploadButton) {
                            uploadButton.style.display = 'inline-block';
                        }
                        const clearFileBtn = document.getElementById('clear-file-btn');
                        if (clearFileBtn) {
                            clearFileBtn.style.display = 'inline-block';
                        }
                        console.log('File selected:', file.name);
                    }
                }
            });
        }
        
        // Add clear file button listener
        const clearFileBtn = document.getElementById('clear-file-btn');
        if (clearFileBtn) {
            clearFileBtn.addEventListener('click', () => this.clearFile());
        }

        // Add upload button listener with model validation
        const uploadButton = document.getElementById('upload-button');
        if (uploadButton) {
            uploadButton.addEventListener('click', () => {
                // Check if model is selected
                if (!this.selectedModelId) {
                    alert('Please select a model from the dropdown in the top right before uploading data.');
                    return;
                }
                // Check if file is selected
                if (!this.selectedFile) {
                    alert('Please select a file first.');
                    return;
                }
                // Process the upload
                this.handleFileUpload(this.selectedFile);
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

    initializeMetricsDisplay() {
        // Initialize all metrics to 0
        this.dataMetrics = {
            accuracy: 0,
            dataQuality: 0,
            modelComplexity: 0,
            modelQuality: 0
        };
        
        // Update the Cost Summary section with zeros
        this.updateCostSummary();
        
        // Initialize model history cost display
        const historyCostElement = document.querySelector('.model-history .cost');
        if (historyCostElement) {
            historyCostElement.innerHTML = `Cost: <strong>0</strong> tokens per version`;
        }
    }

    updateProcessingUnitsDisplay(gpuInfoSpan) {
        // Calculate GPU resources based on processing units
        const memoryPerUnit = 8; // GB
        const coresPerUnit = 4;
        const totalMemory = this.processingUnits * memoryPerUnit;
        const totalCores = this.processingUnits * coresPerUnit;
        
        if (gpuInfoSpan) {
            gpuInfoSpan.textContent = `GPU: ${totalMemory}GB Memory, ${totalCores} Cores`;
        }
    }

    updateCostCalculations() {
        // Calculate dynamic version cost based on model complexity
        this.calculateDynamicVersionCost();
        
        // Calculate model history cost
        const historyTotalCost = this.modelHistoryVersions * this.tokenCosts.versionCost;
        const historyCostElement = document.querySelector('.model-history .cost');
        if (historyCostElement) {
            historyCostElement.innerHTML = `Cost: <strong>${historyTotalCost.toLocaleString()}</strong> tokens per version`;
        }

        // Processing units cost is calculated but not displayed separately
        // It's included in the total cost calculation

        // Use updateMetricsDisplay to show actual metrics
        this.updateMetricsDisplay();
    }

    loadModelData(modelId) {
        this.selectedModelId = modelId;
        
        if (modelId === 'new') {
            // New model - allow all columns
            this.modelType = 'new';
            this.clearForm();
            this.initializeTaggedDataSection();
        } else {
            // Template model - load requirements
            this.modelType = 'template';
            this.loadTemplateRequirements(modelId);
            console.log('Loading template model:', modelId);
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

    initializeTaggedDataSection() {
        const container = document.getElementById('tagged-data-content');
        if (!container) return;

        // Clear any existing content
        container.innerHTML = '';

        if (!this.uploadedData || !this.columnNames || this.columnNames.length === 0) {
            // Show placeholder if no data is uploaded
            container.innerHTML = `
                <div class="placeholder-message">
                    <i class="fas fa-database"></i>
                    <p>${this.modelType ? 'Upload a CSV file to configure column mappings' : 'Select a model and upload data to configure column mappings'}</p>
                </div>
            `;
            return;
        }

        // Build UI based on model type
        if (this.modelType === 'template') {
            this.buildTemplateColumnMapping(container);
        } else if (this.modelType === 'new') {
            this.buildCustomColumnSelector(container);
        }
    }

    buildTemplateColumnMapping(container) {
        // Build UI for template models with required columns
        const mappingHTML = `
            <div class="template-mapping">
                <div class="mapping-header">
                    <h4>Map CSV columns to required fields</h4>
                </div>
                <div class="mapping-rows">
                    ${this.requiredColumns.map((reqCol, index) => `
                        <div class="mapping-row">
                            <div class="csv-column-select" id="template-map-${index}"></div>
                            <span class="arrow">→</span>
                            <div class="required-field">
                                <input type="text" readonly value="${reqCol.name}" />
                                <span class="field-type">${reqCol.type || 'Any'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        container.innerHTML = mappingHTML;

        // Initialize dropdowns for each mapping
        this.requiredColumns.forEach((reqCol, index) => {
            const dropdownContainer = document.getElementById(`template-map-${index}`);
            if (dropdownContainer) {
                const columnOptions = this.columnNames.map((col, colIndex) => ({
                    value: `col_${colIndex}`,
                    title: col,
                    icon: 'fas fa-columns'
                }));

                this.dropdowns[`template-map-${index}`] = new StyledDropdown(dropdownContainer, {
                    id: `template-map-${index}`,
                    placeholder: 'Select CSV column',
                    options: columnOptions,
                    size: 'small',
                    onChange: () => this.updateMetricsDisplay()
                });
            }
        });
    }

    buildCustomColumnSelector(container) {
        // Build UI for custom models with add/remove capabilities
        const selectorHTML = `
            <div class="column-builder">
                <div class="column-section training-section">
                    <h4>Training Columns</h4>
                    <div class="column-list" id="training-column-list">
                        ${this.trainingColumns.length > 0 ? 
                            this.trainingColumns.map(col => this.createColumnItem(col, 'training')).join('') :
                            '<p class="no-columns">No columns selected. Add columns from available list.</p>'
                        }
                    </div>
                    <button class="btn btn-sm btn-secondary add-column-btn" onclick="modelEditorPage.showColumnSelector('training')">
                        <i class="fas fa-plus"></i> Add Column
                    </button>
                </div>
                
                <div class="column-section prediction-section">
                    <h4>Prediction Columns</h4>
                    <div class="column-list" id="prediction-column-list">
                        ${this.predictionColumns.length > 0 ?
                            this.predictionColumns.map(col => this.createColumnItem(col, 'prediction')).join('') :
                            '<p class="no-columns">No columns selected. Add columns from available list.</p>'
                        }
                    </div>
                    <button class="btn btn-sm btn-secondary add-column-btn" onclick="modelEditorPage.showColumnSelector('prediction')">
                        <i class="fas fa-plus"></i> Add Column
                    </button>
                </div>
            </div>
            
            <div class="available-columns">
                <h4>Available Columns</h4>
                <div class="column-chips">
                    ${this.columnNames.map((col, index) => {
                        const isUsed = this.trainingColumns.includes(col) || this.predictionColumns.includes(col);
                        return `
                            <div class="column-chip ${isUsed ? 'used' : ''}" data-column="${col}">
                                <span>${col}</span>
                                ${!isUsed ? `
                                    <button class="add-to-training" onclick="modelEditorPage.addColumnToSection('training', '${col}')">
                                        <i class="fas fa-plus"></i> Train
                                    </button>
                                    <button class="add-to-prediction" onclick="modelEditorPage.addColumnToSection('prediction', '${col}')">
                                        <i class="fas fa-plus"></i> Predict
                                    </button>
                                ` : '<span class="used-label">In use</span>'}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        container.innerHTML = selectorHTML;
    }

    createColumnItem(columnName, section) {
        return `
            <div class="column-item" data-column="${columnName}" data-section="${section}">
                <i class="fas fa-columns"></i>
                <span class="column-name">${columnName}</span>
                <button class="remove-btn" onclick="modelEditorPage.removeColumnFromSection('${section}', '${columnName}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    addColumnToSection(section, columnName) {
        if (section === 'training') {
            if (!this.trainingColumns.includes(columnName)) {
                this.trainingColumns.push(columnName);
            }
        } else if (section === 'prediction') {
            if (!this.predictionColumns.includes(columnName)) {
                this.predictionColumns.push(columnName);
            }
        }
        
        this.initializeTaggedDataSection();
        this.updateMetricsDisplay();
    }

    removeColumnFromSection(section, columnName) {
        if (section === 'training') {
            this.trainingColumns = this.trainingColumns.filter(col => col !== columnName);
        } else if (section === 'prediction') {
            this.predictionColumns = this.predictionColumns.filter(col => col !== columnName);
        }
        
        this.initializeTaggedDataSection();
        this.updateMetricsDisplay();
    }

    showColumnSelector(section) {
        // This could open a modal or dropdown to select columns
        // For now, using the available columns section
        const availableSection = document.querySelector('.available-columns');
        if (availableSection) {
            availableSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    loadTemplateRequirements(modelId) {
        // Comprehensive template configurations
        // In production, this would fetch from API
        const templateConfigurations = {
            'model1': {
                name: 'Customer Churn Predictor',
                description: 'Predicts customer churn probability based on purchase history and behavior patterns',
                modelFunction: 'Binary Classification (Logistic Regression)',
                epoch: 50,
                hiddenLayers: 3,
                batchSize: 32,
                requiredColumns: [
                    { name: 'Customer ID', type: 'ID', required: true },
                    { name: 'Purchase Amount', type: 'Number', required: true },
                    { name: 'Product Category', type: 'Category', required: true },
                    { name: 'Date', type: 'Date', required: true }
                ]
            },
            'model2': {
                name: 'Sales Forecast Model',
                description: 'Forecasts future sales based on historical data and seasonal patterns using time series analysis',
                modelFunction: 'Time Series Regression (LSTM)',
                epoch: 100,
                hiddenLayers: 4,
                batchSize: 64,
                requiredColumns: [
                    { name: 'Sales Date', type: 'Date', required: true },
                    { name: 'Revenue', type: 'Number', required: true },
                    { name: 'Region', type: 'Category', required: true }
                ]
            },
            'model3': {
                name: 'Sentiment Analyzer',
                description: 'Analyzes text sentiment and classifies as positive, negative, or neutral using NLP',
                modelFunction: 'Multi-class Classification (BERT)',
                epoch: 30,
                hiddenLayers: 12,
                batchSize: 16,
                requiredColumns: [
                    { name: 'Text Content', type: 'Text', required: true },
                    { name: 'Sentiment Score', type: 'Number', required: false }
                ]
            }
        };

        const templateConfig = templateConfigurations[modelId];
        if (templateConfig) {
            // Populate form fields with template defaults
            this.populateFormWithTemplate(templateConfig);
            
            // Set required columns for Tagged Data section
            this.requiredColumns = templateConfig.requiredColumns || [];
            this.initializeTaggedDataSection();
        }
    }

    populateFormWithTemplate(templateConfig) {
        // Populate all form fields with template default values
        const modelNameField = document.getElementById('model-name');
        const modelDescField = document.getElementById('model-description');
        const modelFunctionField = document.getElementById('model-function');
        const epochField = document.getElementById('epoch');
        const hiddenLayersField = document.getElementById('hidden-layers');
        const batchSizeField = document.getElementById('batch-size');

        if (modelNameField) modelNameField.value = templateConfig.name || '';
        if (modelDescField) modelDescField.value = templateConfig.description || '';
        if (modelFunctionField) modelFunctionField.value = templateConfig.modelFunction || '';
        if (epochField) epochField.value = templateConfig.epoch || '';
        if (hiddenLayersField) hiddenLayersField.value = templateConfig.hiddenLayers || '';
        if (batchSizeField) batchSizeField.value = templateConfig.batchSize || '';

        // Update metrics display to reflect the populated values
        this.updateMetricsDisplay();
        
        console.log('Template loaded:', templateConfig.name);
    }

    parseCSVData(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 0) return null;

        // Improved CSV parsing to handle different delimiters and quotes
        const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];
                
                if (char === '"' || char === "'") {
                    if (inQuotes && (char === '"' && nextChar === '"')) {
                        current += '"';
                        i++; // Skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        // Parse headers
        const headers = parseCSVLine(lines[0]);
        
        // Check if first row contains actual headers or data
        const hasHeaders = headers.some(h => {
            // More sophisticated header detection
            const cleaned = h.replace(/['"]/g, '');
            return isNaN(parseFloat(cleaned)) || 
                   cleaned.length > 20 || 
                   /[a-zA-Z]{2,}/.test(cleaned);
        });
        
        if (hasHeaders) {
            this.columnNames = headers.map(h => h.replace(/['"]/g, '') || `Column${headers.indexOf(h) + 1}`);
        } else {
            // Generate column names if no headers
            this.columnNames = headers.map((_, index) => `Column${index + 1}`);
        }

        // Parse data rows
        const dataStartIndex = hasHeaders ? 1 : 0;
        const data = [];
        for (let i = dataStartIndex; i < Math.min(lines.length, 100); i++) { // Parse first 100 rows for analysis
            if (lines[i].trim()) {
                const row = parseCSVLine(lines[i]);
                data.push(row);
            }
        }

        this.uploadedData = {
            headers: this.columnNames,
            data: data,
            rowCount: lines.length - (hasHeaders ? 1 : 0)
        };

        console.log('Parsed CSV:', {
            columns: this.columnNames.length,
            rows: this.uploadedData.rowCount,
            headers: this.columnNames
        });

        return this.uploadedData;
    }

    analyzeDataQuality() {
        if (!this.uploadedData || !this.uploadedData.data || this.uploadedData.data.length === 0) {
            this.dataMetrics.dataQuality = 0;
            this.dataMetrics.accuracy = 0;
            return this.dataMetrics;
        }

        let nullCount = 0;
        let totalCells = 0;
        let numericColumns = 0;
        let categoricalColumns = 0;

        // Analyze each column
        this.columnNames.forEach((_, colIndex) => {
            let isNumeric = true;
            let hasNulls = false;

            this.uploadedData.data.forEach(row => {
                totalCells++;
                const value = row[colIndex];
                
                if (!value || value === '' || value.toLowerCase() === 'null' || value.toLowerCase() === 'nan') {
                    nullCount++;
                    hasNulls = true;
                } else if (isNaN(parseFloat(value))) {
                    isNumeric = false;
                }
            });

            if (isNumeric) numericColumns++;
            else categoricalColumns++;
        });

        // Calculate quality score (0-100)
        const completeness = totalCells > 0 ? ((totalCells - nullCount) / totalCells) * 100 : 0;
        const diversity = (numericColumns > 0 && categoricalColumns > 0) ? 15 : 5;
        
        this.dataMetrics.dataQuality = Math.min(100, Math.round(completeness * 0.8 + diversity));
        
        // Calculate accuracy based on all factors
        this.calculateAccuracy();
        
        return this.dataMetrics;
    }

    calculateAccuracy() {
        // Accuracy is a combination of data quality, model complexity, and configuration
        let accuracy = 0;
        
        // Data contribution (0-40 points)
        if (this.uploadedData && this.uploadedData.rowCount > 0) {
            const dataPoints = Math.min(40, this.dataMetrics.dataQuality * 0.4);
            accuracy += dataPoints;
        }
        
        // Model complexity contribution (0-30 points)
        if (this.dataMetrics.modelComplexity > 0) {
            const complexityPoints = Math.min(30, this.dataMetrics.modelComplexity * 0.3);
            accuracy += complexityPoints;
        }
        
        // Model quality contribution (0-30 points)
        if (this.dataMetrics.modelQuality > 0) {
            const qualityPoints = Math.min(30, this.dataMetrics.modelQuality * 0.3);
            accuracy += qualityPoints;
        }
        
        this.dataMetrics.accuracy = Math.round(accuracy);
    }

    calculateModelComplexity() {
        const epochValue = document.getElementById('epoch')?.value;
        const hiddenLayersValue = document.getElementById('hidden-layers')?.value;
        const batchSizeValue = document.getElementById('batch-size')?.value;
        
        // Return 0 if no values are entered
        if (!epochValue && !hiddenLayersValue && !batchSizeValue) {
            this.dataMetrics.modelComplexity = 0;
            this.dataMetrics.modelQuality = this.dataMetrics.dataQuality ? 
                Math.round(this.dataMetrics.dataQuality * 0.3) : 0;
            return this.dataMetrics;
        }

        const epoch = parseInt(epochValue) || 0;
        const hiddenLayers = parseInt(hiddenLayersValue) || 0;
        const batchSize = parseInt(batchSizeValue) || 0;

        // Calculate complexity score based on parameters (0-100)
        let complexityScore = 0;
        
        if (epoch > 0) {
            complexityScore += Math.min(35, epoch / 2); // Max 35 points for epochs
        }
        
        if (hiddenLayers > 0) {
            complexityScore += Math.min(35, hiddenLayers * 7); // Max 35 points for layers
        }
        
        if (batchSize > 0) {
            // Optimal batch size is around 32-64, give points based on that
            const batchOptimal = Math.max(0, 30 - Math.abs(batchSize - 48) * 0.5);
            complexityScore += Math.min(30, batchOptimal); // Max 30 points for batch size
        }

        this.dataMetrics.modelComplexity = Math.round(complexityScore);
        
        // Calculate model quality based on complexity, data quality, and dropdown selections
        const dropdownBonus = this.getDropdownSelectionBonus();
        this.dataMetrics.modelQuality = Math.round(
            (this.dataMetrics.modelComplexity * 0.3 + 
             this.dataMetrics.dataQuality * 0.5 + 
             dropdownBonus * 0.2)
        );

        return this.dataMetrics;
    }

    getDropdownSelectionBonus() {
        // Calculate bonus based on how many dropdowns have been configured
        let selectedCount = 0;
        let totalDropdowns = 0;
        
        Object.keys(this.dropdowns).forEach(key => {
            if (key.startsWith('dropdown-')) {
                totalDropdowns++;
                const dropdown = this.dropdowns[key];
                if (dropdown && dropdown.getValue && dropdown.getValue()) {
                    selectedCount++;
                }
            }
        });
        
        return totalDropdowns > 0 ? (selectedCount / totalDropdowns) * 100 : 0;
    }

    updateDropdownsWithColumns() {
        if (!this.columnNames || this.columnNames.length === 0) return;

        // Initialize Tagged Data section with columns
        this.initializeTaggedDataSection();
        
        // Update metrics after dropdown update
        this.updateMetricsDisplay();
    }

    calculateDynamicTokenCost() {
        let baseCost = 0;
        
        // Add cost based on data size
        if (this.uploadedData && this.uploadedData.rowCount > 0) {
            baseCost += Math.round(this.uploadedData.rowCount * 0.1); // 0.1 tokens per row
        }
        
        // Add cost based on model parameters
        const epochValue = document.getElementById('epoch')?.value;
        const hiddenLayersValue = document.getElementById('hidden-layers')?.value;
        const batchSizeValue = document.getElementById('batch-size')?.value;
        
        if (epochValue && epochValue !== '') {
            baseCost += parseInt(epochValue) * 50; // 50 tokens per epoch
        }
        
        if (hiddenLayersValue && hiddenLayersValue !== '') {
            baseCost += parseInt(hiddenLayersValue) * 100; // 100 tokens per layer
        }
        
        if (batchSizeValue && batchSizeValue !== '') {
            baseCost += parseInt(batchSizeValue) * 5; // 5 tokens per batch size unit
        }
        
        this.tokenCosts.trainingBaseCost = baseCost;
        return baseCost;
    }

    calculateDynamicVersionCost() {
        let versionCost = 0;
        
        // Base cost for storing a version
        versionCost = 50; // Base 50 tokens per version
        
        // Add cost based on model complexity
        const epochValue = document.getElementById('epoch')?.value;
        const hiddenLayersValue = document.getElementById('hidden-layers')?.value;
        
        if (epochValue && epochValue !== '') {
            versionCost += parseInt(epochValue) * 10; // 10 tokens per epoch for version storage
        }
        
        if (hiddenLayersValue && hiddenLayersValue !== '') {
            versionCost += parseInt(hiddenLayersValue) * 20; // 20 tokens per layer for version storage
        }
        
        // Add cost based on data size for version
        if (this.uploadedData && this.uploadedData.rowCount > 0) {
            versionCost += Math.round(this.uploadedData.rowCount * 0.01); // 0.01 tokens per row for version
        }
        
        this.tokenCosts.versionCost = versionCost;
        return versionCost;
    }

    updateMetricsDisplay() {
        this.calculateModelComplexity();
        this.calculateAccuracy(); // Recalculate accuracy with latest values
        const dynamicCost = this.calculateDynamicTokenCost(); // Calculate dynamic training cost
        this.calculateDynamicVersionCost(); // Calculate dynamic version cost
        
        // Update the new Cost Summary section
        this.updateCostSummary();
    }
    
    updateCostSummary() {
        // Calculate all metrics
        const baseCost = this.calculateDynamicTokenCost();
        const versionCost = this.modelHistoryVersions * this.tokenCosts.versionCost;
        // Multiply only base cost by processing units (not version cost which is storage)
        const totalCost = (baseCost * this.processingUnits) + versionCost;
        
        // Calculate data size
        let dataSize = '0 MB';
        if (this.uploadedData && this.uploadedData.rowCount > 0) {
            const estimatedBytes = this.uploadedData.rowCount * this.columnNames.length * 50; // Estimate 50 bytes per cell
            dataSize = this.formatFileSize(estimatedBytes);
        }
        
        // Calculate base training time
        let baseTime = 0; // Start at 0
        if (this.uploadedData && this.uploadedData.rowCount > 0) {
            baseTime += Math.round(this.uploadedData.rowCount / 100) + 5; // Add time based on data size
        }
        if (this.dataMetrics.modelComplexity > 0) {
            baseTime += Math.round(this.dataMetrics.modelComplexity * 1.2); // Add time based on complexity
        }
        
        // Divide training time by processing units (more units = faster training)
        // Ensure minimum time of 1 minute
        let estimatedTime = baseTime > 0 ? Math.max(1, Math.round(baseTime / this.processingUnits)) : 0;
        
        // Update all metric elements
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };
        
        updateElement('total-data-size', dataSize);
        updateElement('total-token-cost', `${totalCost.toLocaleString()} tokens`);
        updateElement('predicted-accuracy', `${this.dataMetrics.accuracy}%`);
        updateElement('data-quality', `${this.dataMetrics.dataQuality}%`);
        updateElement('model-complexity', `${this.dataMetrics.modelComplexity}%`);
        updateElement('model-quality', `${this.dataMetrics.modelQuality}%`);
        updateElement('training-time', `${estimatedTime} min`);
        updateElement('model-versions', `${this.modelHistoryVersions} versions`);
        
        console.log('Cost Summary updated:', {
            dataSize,
            totalCost,
            accuracy: this.dataMetrics.accuracy,
            dataQuality: this.dataMetrics.dataQuality,
            modelComplexity: this.dataMetrics.modelComplexity,
            modelQuality: this.dataMetrics.modelQuality,
            trainingTime: estimatedTime,
            versions: this.modelHistoryVersions
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 MB';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    handleFileUpload(file) {
        if (!file) return;

        // Show upload progress
        const progressBar = document.getElementById('progress-bar');
        const uploadStatus = document.getElementById('upload-status');
        const eta = document.getElementById('eta');

        // Reset progress bar
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.backgroundColor = 'var(--primary-color)';
        }

        // Always process the file immediately when this method is called
        // (It's now only called from the upload button click with validation)
        this.processFileUpload(file);
    }

    processFileUpload(file) {
        const progressBar = document.getElementById('progress-bar');
        const uploadStatus = document.getElementById('upload-status');
        const eta = document.getElementById('eta');

        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            if (uploadStatus) {
                uploadStatus.textContent = `Processing... ${progress}%`;
            }
            if (eta && progress < 100) {
                const remaining = Math.ceil((100 - progress) / 10 * 0.2);
                eta.textContent = `ETA: ${remaining}s`;
            }

            if (progress >= 100) {
                clearInterval(interval);
                if (uploadStatus) {
                    uploadStatus.textContent = 'Complete';
                }
                if (eta) {
                    eta.textContent = '';
                }
                if (progressBar) {
                    progressBar.style.backgroundColor = 'var(--success-color, #4caf50)';
                }
                
                // Process the file
                this.readAndParseFile(file);
            }
        }, 200);
    }

    readAndParseFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const csvText = e.target.result;
            const parsedData = this.parseCSVData(csvText);
            
            if (parsedData) {
                this.analyzeDataQuality();
                this.updateDropdownsWithColumns();
                this.updateMetricsDisplay();
                
                console.log('Parsed columns:', this.columnNames);
                console.log('Data metrics:', this.dataMetrics);
            }
        };
        reader.onerror = () => {
            const uploadStatus = document.getElementById('upload-status');
            if (uploadStatus) {
                uploadStatus.textContent = 'Error reading file';
            }
            const progressBar = document.getElementById('progress-bar');
            if (progressBar) {
                progressBar.style.backgroundColor = 'var(--error-color, #f44336)';
            }
        };
        reader.readAsText(file);
    }

    // Get algorithm configurations
    getAlgorithmConfigs() {
        return {
            // Classification algorithms
            'random_forest_clf': {
                name: 'Random Forest Classifier',
                params: {
                    'n_estimators': { label: 'Number of Trees', type: 'number', default: 100, min: 10, max: 1000 },
                    'max_depth': { label: 'Max Depth', type: 'number', default: 10, min: 1, max: 50 },
                    'min_samples_split': { label: 'Min Samples Split', type: 'number', default: 2, min: 2, max: 20 }
                }
            },
            'svm_clf': {
                name: 'Support Vector Machine',
                params: {
                    'kernel': { label: 'Kernel', type: 'select', options: ['linear', 'rbf', 'poly', 'sigmoid'], default: 'rbf' },
                    'C': { label: 'C Parameter', type: 'number', default: 1.0, min: 0.01, max: 100, step: 0.01 },
                    'gamma': { label: 'Gamma', type: 'select', options: ['scale', 'auto'], default: 'scale' }
                }
            },
            'logistic_regression': {
                name: 'Logistic Regression',
                params: {
                    'penalty': { label: 'Penalty', type: 'select', options: ['l1', 'l2', 'elasticnet', 'none'], default: 'l2' },
                    'C': { label: 'Inverse Regularization', type: 'number', default: 1.0, min: 0.01, max: 100, step: 0.01 },
                    'max_iter': { label: 'Max Iterations', type: 'number', default: 100, min: 50, max: 1000 }
                }
            },
            'neural_network_clf': {
                name: 'Neural Network Classifier',
                params: {
                    'hidden_layers': { label: 'Hidden Layers', type: 'number', default: 2, min: 1, max: 10 },
                    'neurons_per_layer': { label: 'Neurons per Layer', type: 'number', default: 128, min: 16, max: 512 },
                    'learning_rate': { label: 'Learning Rate', type: 'number', default: 0.001, min: 0.0001, max: 0.1, step: 0.0001 },
                    'activation': { label: 'Activation', type: 'select', options: ['relu', 'sigmoid', 'tanh'], default: 'relu' }
                }
            },
            'xgboost_clf': {
                name: 'XGBoost Classifier',
                params: {
                    'n_estimators': { label: 'Number of Boosting Rounds', type: 'number', default: 100, min: 10, max: 1000 },
                    'max_depth': { label: 'Max Depth', type: 'number', default: 6, min: 1, max: 20 },
                    'learning_rate': { label: 'Learning Rate', type: 'number', default: 0.3, min: 0.01, max: 1, step: 0.01 }
                }
            },
            // Regression algorithms
            'linear_regression': {
                name: 'Linear Regression',
                params: {
                    'fit_intercept': { label: 'Fit Intercept', type: 'checkbox', default: true },
                    'normalize': { label: 'Normalize', type: 'checkbox', default: false }
                }
            },
            'random_forest_reg': {
                name: 'Random Forest Regressor',
                params: {
                    'n_estimators': { label: 'Number of Trees', type: 'number', default: 100, min: 10, max: 1000 },
                    'max_depth': { label: 'Max Depth', type: 'number', default: 10, min: 1, max: 50 }
                }
            },
            // Clustering algorithms
            'kmeans': {
                name: 'K-Means Clustering',
                params: {
                    'n_clusters': { label: 'Number of Clusters', type: 'number', default: 3, min: 2, max: 20 },
                    'max_iter': { label: 'Max Iterations', type: 'number', default: 300, min: 100, max: 1000 }
                }
            },
            // Time Series
            'lstm': {
                name: 'LSTM Network',
                params: {
                    'lstm_units': { label: 'LSTM Units', type: 'number', default: 50, min: 10, max: 200 },
                    'dropout': { label: 'Dropout Rate', type: 'number', default: 0.2, min: 0, max: 0.5, step: 0.1 },
                    'lookback': { label: 'Lookback Period', type: 'number', default: 10, min: 1, max: 100 }
                }
            }
        };
    }

    // Update parameter fields based on selected algorithm
    updateParameterFields(algorithmId) {
        const paramsRow = document.getElementById('algorithm-params-row');
        if (!paramsRow || !algorithmId) return;

        const config = this.algorithmConfigs[algorithmId];
        if (!config) {
            // Keep default fields for algorithms without specific configs
            return;
        }

        // Clear existing fields
        paramsRow.innerHTML = '';

        // Add algorithm-specific parameter fields
        let fieldCount = 0;
        for (const [paramKey, paramConfig] of Object.entries(config.params)) {
            if (fieldCount >= 2) break; // Only show 2 fields per row

            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';

            const label = document.createElement('label');
            label.setAttribute('for', `param-${paramKey}`);
            label.textContent = paramConfig.label + ':';
            formGroup.appendChild(label);

            let input;
            if (paramConfig.type === 'select') {
                input = document.createElement('select');
                paramConfig.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    if (opt === paramConfig.default) option.selected = true;
                    input.appendChild(option);
                });
            } else if (paramConfig.type === 'checkbox') {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = paramConfig.default;
            } else {
                input = document.createElement('input');
                input.type = 'number';
                input.placeholder = paramConfig.default;
                input.value = paramConfig.default;
                input.min = paramConfig.min;
                input.max = paramConfig.max;
                if (paramConfig.step) input.step = paramConfig.step;
            }

            input.id = `param-${paramKey}`;
            input.className = 'algorithm-param';
            
            // Add event listener for real-time updates
            input.addEventListener('change', () => this.updateMetricsDisplay());
            input.addEventListener('input', () => this.updateMetricsDisplay());

            formGroup.appendChild(input);
            paramsRow.appendChild(formGroup);
            fieldCount++;
        }

        // If neural network, keep epochs and batch size visible
        if (algorithmId.includes('neural_network') || algorithmId === 'lstm') {
            const epochGroup = document.createElement('div');
            epochGroup.className = 'form-group';
            epochGroup.innerHTML = `
                <label for="epoch">Epochs:</label>
                <input type="number" id="epoch" placeholder="10" min="1" max="1000" value="10">
            `;
            
            const batchGroup = document.createElement('div');
            batchGroup.className = 'form-group';
            batchGroup.innerHTML = `
                <label for="batch-size">Batch Size:</label>
                <input type="number" id="batch-size" placeholder="32" min="1" max="512" value="32">
            `;

            if (fieldCount < 2) {
                paramsRow.appendChild(epochGroup);
                fieldCount++;
            }
            if (fieldCount < 2) {
                paramsRow.appendChild(batchGroup);
            }

            // Re-add event listeners
            const epochInput = epochGroup.querySelector('#epoch');
            const batchInput = batchGroup.querySelector('#batch-size');
            if (epochInput) {
                epochInput.addEventListener('change', () => this.updateMetricsDisplay());
                epochInput.addEventListener('input', () => this.updateMetricsDisplay());
            }
            if (batchInput) {
                batchInput.addEventListener('change', () => this.updateMetricsDisplay());
                batchInput.addEventListener('input', () => this.updateMetricsDisplay());
            }
        }
    }

    // Create Model method - triggered by the Create Model button
    createModel() {
        // Validate required fields
        const modelName = document.getElementById('model-name')?.value;
        const modelAlgorithm = document.getElementById('model-algorithm')?.value;
        
        if (!modelName || modelName.trim() === '') {
            alert('Please enter a model name');
            return;
        }
        
        if (!modelAlgorithm || modelAlgorithm === '') {
            alert('Please select an ML algorithm');
            return;
        }
        
        if (!this.uploadedData || this.columnNames.length === 0) {
            alert('Please upload training data');
            return;
        }
        
        // Check if columns are properly mapped (for template models or custom models)
        if (this.modelType === 'new' && this.trainingColumns.length === 0) {
            alert('Please select at least one training column');
            return;
        }
        
        // Collect all model configuration
        const modelConfig = {
            name: modelName,
            description: document.getElementById('model-description')?.value || '',
            algorithm: modelAlgorithm,
            epochs: parseInt(document.getElementById('epoch')?.value) || 10,
            hiddenLayers: parseInt(document.getElementById('hidden-layers')?.value) || 2,
            batchSize: parseInt(document.getElementById('batch-size')?.value) || 32,
            trainingColumns: this.trainingColumns,
            predictionColumns: this.predictionColumns,
            dataSize: this.uploadedData?.rowCount || 0,
            modelVersions: this.modelHistoryVersions,
            totalTokenCost: this.calculateDynamicTokenCost(),
            estimatedAccuracy: this.dataMetrics.accuracy,
            modelComplexity: this.dataMetrics.modelComplexity,
            dataQuality: this.dataMetrics.dataQuality
        };
        
        // Show progress modal instead of simple alert
        this.showProgressModal(modelConfig);
    }
    
    showProgressModal(modelConfig) {
        const progressModal = document.getElementById('progress-modal');
        if (!progressModal) return;
        
        progressModal.style.display = 'flex';
        
        // Update total epochs display
        const totalEpochs = document.getElementById('total-epochs');
        if (totalEpochs) totalEpochs.textContent = modelConfig.epochs;
        
        // Setup continue in background button - navigate to dashboard
        const continueBtn = document.getElementById('continue-background');
        if (continueBtn) {
            continueBtn.onclick = () => {
                const trainingState = {
                    id: Date.now(),
                    type: 'model_training',
                    modelName: modelConfig.name,
                    algorithm: modelConfig.algorithm,
                    startTime: Date.now(),
                    status: 'in_progress',
                    progress: this.currentProgress || 0,
                    currentStage: this.currentStage || 'validating'
                };
                
                localStorage.setItem('activeTraining', JSON.stringify(trainingState));
                progressModal.style.display = 'none';
                
                // Navigate directly to dashboard in-progress tab
                window.location.hash = '#dashboard?tab=in-progress';
            };
        }
        
        // Setup close button
        const closeButtons = progressModal.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.onclick = () => {
                progressModal.style.display = 'none';
            };
        });
        
        // Start progress simulation
        this.simulateTrainingProgress(modelConfig);
    }
    
    simulateTrainingProgress(modelConfig) {
        const stages = ['validating', 'initializing', 'training', 'evaluating', 'finalizing'];
        let currentStageIndex = 0;
        let progress = 0;
        let currentEpoch = 0;
        const startTime = Date.now();
        
        const updateProgress = () => {
            // Update stage
            if (progress < 20) {
                currentStageIndex = 0; // validating
            } else if (progress < 30) {
                currentStageIndex = 1; // initializing
            } else if (progress < 70) {
                currentStageIndex = 2; // training
                currentEpoch = Math.floor((progress - 30) / 40 * modelConfig.epochs);
            } else if (progress < 90) {
                currentStageIndex = 3; // evaluating
            } else {
                currentStageIndex = 4; // finalizing
            }
            
            // Update stage indicators
            const stageItems = document.querySelectorAll('.stage-item');
            stageItems.forEach((item, index) => {
                if (index < currentStageIndex) {
                    item.classList.add('completed');
                    item.classList.remove('active');
                } else if (index === currentStageIndex) {
                    item.classList.add('active');
                    item.classList.remove('completed');
                } else {
                    item.classList.remove('active', 'completed');
                }
            });
            
            // Update progress bar
            const progressFill = document.getElementById('generation-progress-fill');
            const progressPercentage = document.querySelector('.progress-percentage');
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressPercentage) progressPercentage.textContent = `${progress}%`;
            
            // Update training progress
            const trainingProgress = document.getElementById('training-progress');
            if (trainingProgress) trainingProgress.textContent = currentEpoch;
            
            // Update time elapsed
            const elapsed = Date.now() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timeElapsed = document.getElementById('time-elapsed');
            if (timeElapsed) timeElapsed.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Update ETA
            if (progress > 0) {
                const estimatedTotal = elapsed / (progress / 100);
                const remaining = estimatedTotal - elapsed;
                const etaMinutes = Math.floor(remaining / 60000);
                const etaSeconds = Math.floor((remaining % 60000) / 1000);
                const etaRemaining = document.getElementById('eta-remaining');
                if (etaRemaining) etaRemaining.textContent = `${etaMinutes}:${etaSeconds.toString().padStart(2, '0')}`;
            }
            
            // Update status message
            const statusMessage = document.getElementById('status-message');
            if (statusMessage) {
                const messages = {
                    'validating': 'Validating training data and configuration...',
                    'initializing': 'Initializing neural network architecture...',
                    'training': `Training model (Epoch ${currentEpoch}/${modelConfig.epochs})...`,
                    'evaluating': 'Evaluating model performance on test data...',
                    'finalizing': 'Finalizing model and preparing for download...'
                };
                statusMessage.textContent = messages[stages[currentStageIndex]];
            }
            
            // Continue or complete
            if (progress < 100) {
                progress += Math.random() * 3 + 1; // Random increment
                progress = Math.min(progress, 100);
                setTimeout(updateProgress, 500);
            } else {
                this.completeTraining(modelConfig, startTime);
            }
        };
        
        updateProgress();
    }
    
    completeTraining(modelConfig, startTime) {
        const completionSection = document.getElementById('completion-section');
        const currentStatus = document.querySelector('.current-status');
        
        if (completionSection) completionSection.style.display = 'block';
        if (currentStatus) currentStatus.style.display = 'none';
        
        // Update completion stats
        const finalAccuracy = document.getElementById('final-accuracy');
        if (finalAccuracy) finalAccuracy.textContent = modelConfig.estimatedAccuracy;
        
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const totalTime = document.getElementById('total-time');
        if (totalTime) totalTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const modelSize = document.getElementById('model-size');
        if (modelSize) modelSize.textContent = `${(Math.random() * 50 + 10).toFixed(1)} MB`;
        
        // Setup download button
        const downloadBtn = document.getElementById('download-model');
        if (downloadBtn) {
            downloadBtn.onclick = () => {
                alert(`Downloading model: ${modelConfig.name}.pkl`);
            };
        }
        
        // Setup view metrics button
        const viewMetricsBtn = document.getElementById('view-metrics');
        if (viewMetricsBtn) {
            viewMetricsBtn.onclick = () => {
                alert(`Model Metrics:\n\nAccuracy: ${modelConfig.estimatedAccuracy}%\nPrecision: ${(modelConfig.estimatedAccuracy * 0.95).toFixed(1)}%\nRecall: ${(modelConfig.estimatedAccuracy * 0.93).toFixed(1)}%\nF1 Score: ${(modelConfig.estimatedAccuracy * 0.94).toFixed(1)}%`);
            };
        }
    }
    
    clearFile() {
        // Clear the selected file
        this.selectedFile = null;
        this.uploadedData = null;
        
        const csvUpload = document.getElementById('csv-upload');
        const fileName = document.getElementById('file-name');
        const progressBar = document.getElementById('progress-bar');
        const uploadStatus = document.getElementById('upload-status');
        const eta = document.getElementById('eta');
        const uploadButton = document.getElementById('upload-button');
        const clearFileBtn = document.getElementById('clear-file-btn');
        
        // Clear file input and display
        if (csvUpload) csvUpload.value = '';
        if (fileName) fileName.textContent = 'No file chosen';
        
        // Clear progress indicators
        if (progressBar) progressBar.style.width = '0%';
        if (uploadStatus) uploadStatus.textContent = '';
        if (eta) eta.textContent = '';
        
        // Hide clear button and show upload button
        if (clearFileBtn) clearFileBtn.style.display = 'none';
        if (uploadButton) uploadButton.style.display = 'inline-block';
        
        // Clear tagged data display
        const taggedDataContent = document.getElementById('tagged-data-content');
        if (taggedDataContent) {
            taggedDataContent.innerHTML = '<div class="placeholder-message"><i class="fas fa-cloud-upload-alt"></i><p>Upload data to see tagged fields</p></div>';
        }
        
        // Reset metrics
        this.dataMetrics = {
            accuracy: 0,
            dataQuality: 0,
            modelComplexity: 0,
            modelQuality: 0
        };
        this.columnNames = [];
        this.updateMetricsDisplay();
    }
}

// Initialize the page
const modelEditorPage = new ModelEditorPage();
window.modelEditorPage = modelEditorPage;

// Make clearFile globally accessible
window.clearFile = () => modelEditorPage.clearFile();

// Export for router
export { modelEditorPage };