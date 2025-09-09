import { StyledDropdown } from '../../components/StyledDropdown/StyledDropdown.js';
import { loadComponentCSS } from '../services/componentLoader.js';
import tokenService from '../services/token_service.js';

class ModelEditorPage {
    constructor() {
        this.dropdowns = {};
        this.modelHistoryVersions = 0;
        this.tokenCosts = {
            versionCost: 0,  // Start at 0, calculate dynamically based on model complexity
            trainingBaseCost: 0  // Start at 0, calculate dynamically
        };
        this.uploadedData = null;
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
                placeholder: '%',
                options: [
                    { value: 'percentage', title: '%', icon: 'fas fa-percentage' },
                    { value: 'rows', title: 'Rows', icon: 'fas fa-table' }
                ],
                value: 'percentage',
                size: 'small'
            });
        }

        const testingDataFromContainer = document.getElementById('testing-data-from-container');
        if (testingDataFromContainer) {
            this.dropdowns.testingFrom = new StyledDropdown(testingDataFromContainer, {
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

        // Add listeners for model parameters to update metrics in real-time
        const paramInputs = ['epoch', 'hidden-layers', 'batch-size', 'model-name', 'model-description', 'model-function'];
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

        // Add file upload listener to parse CSV immediately on selection
        const csvUpload = document.getElementById('csv-upload');
        if (csvUpload) {
            csvUpload.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    // Handle CSV and other text files
                    if (file.type === 'text/csv' || file.name.endsWith('.csv') || 
                        file.type === 'text/plain' || file.type === '') {
                        this.handleFileUpload(file);
                        console.log('CSV file selected, parsing columns...');
                    }
                }
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

    updateCostCalculations() {
        // Calculate dynamic version cost based on model complexity
        this.calculateDynamicVersionCost();
        
        // Calculate model history cost
        const historyTotalCost = this.modelHistoryVersions * this.tokenCosts.versionCost;
        const historyCostElement = document.querySelector('.model-history .cost');
        if (historyCostElement) {
            historyCostElement.innerHTML = `Cost: <strong>${historyTotalCost.toLocaleString()}</strong> tokens per version`;
        }

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
        const versionCost = this.modelHistoryVersions * this.tokenCosts.versionCost;
        const totalCost = this.calculateDynamicTokenCost() + versionCost;
        
        // Calculate data size
        let dataSize = '0 MB';
        if (this.uploadedData && this.uploadedData.rowCount > 0) {
            const estimatedBytes = this.uploadedData.rowCount * this.columnNames.length * 50; // Estimate 50 bytes per cell
            dataSize = this.formatFileSize(estimatedBytes);
        }
        
        // Calculate training time
        let estimatedTime = 0; // Start at 0
        if (this.uploadedData && this.uploadedData.rowCount > 0) {
            estimatedTime += Math.round(this.uploadedData.rowCount / 100) + 5; // Add time based on data size
        }
        if (this.dataMetrics.modelComplexity > 0) {
            estimatedTime += Math.round(this.dataMetrics.modelComplexity * 1.2); // Add time based on complexity
        }
        
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
        reader.readAsText(file);
    }
}

// Initialize the page
const modelEditorPage = new ModelEditorPage();
window.modelEditorPage = modelEditorPage;

// Export for router
export { modelEditorPage };