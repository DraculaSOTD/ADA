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
                    size: 'small',
                    onChange: () => {
                        // Update metrics when dropdown selection changes
                        this.updateMetricsDisplay();
                    }
                });
            });
        }

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
        // Show all metrics as 0 initially
        const metricsSection = document.querySelector('.model-history:last-of-type .metrics');
        if (metricsSection) {
            metricsSection.innerHTML = `
                <div class="metric-item">
                    <label>Predicted Accuracy:</label>
                    <span class="metric-value">0%</span>
                </div>
                <div class="metric-item">
                    <label>Data Quality:</label>
                    <span class="metric-value">0%</span>
                </div>
                <div class="metric-item">
                    <label>Model Complexity:</label>
                    <span class="metric-value">0%</span>
                </div>
                <div class="metric-item">
                    <label>Model Quality:</label>
                    <span class="metric-value">0%</span>
                </div>
                <div class="metric-item highlight">
                    <label>Total Training Cost:</label>
                    <span class="metric-value primary">0 tokens <i class="fas fa-coins"></i></span>
                </div>
                <div class="metric-item">
                    <label>Estimated ETA:</label>
                    <span class="metric-value">0 min</span>
                </div>
            `;
        }
        
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

        // Create options from column names
        const columnOptions = this.columnNames.map((col, index) => ({
            value: `col_${index}`,
            title: col,
            icon: 'fas fa-columns'
        }));

        // Update all existing dropdowns in the tagged data section
        Object.keys(this.dropdowns).forEach(dropdownId => {
            if (dropdownId.startsWith('dropdown-')) {
                const dropdown = this.dropdowns[dropdownId];
                if (dropdown && dropdown.setOptions) {
                    dropdown.setOptions(columnOptions);
                }
            }
        });
        
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
        
        const metricsSection = document.querySelector('.model-history:last-of-type .metrics');
        console.log('Looking for metrics section:', {
            found: !!metricsSection,
            selector: '.model-history:last-of-type .metrics'
        });
        
        if (metricsSection) {
            // Calculate total cost including both training and version costs
            const versionCost = this.modelHistoryVersions * this.tokenCosts.versionCost;
            const totalCost = dynamicCost + versionCost;
            
            console.log('Token Cost Calculation:', {
                dynamicCost: dynamicCost,
                modelHistoryVersions: this.modelHistoryVersions,
                versionCostPer: this.tokenCosts.versionCost,
                versionCostTotal: versionCost,
                totalCost: totalCost,
                metricsSection: metricsSection
            });
            
            // Calculate ETA based on actual data and complexity
            let estimatedTime = 0; // Start at 0
            if (this.uploadedData && this.uploadedData.rowCount > 0) {
                estimatedTime += Math.round(this.uploadedData.rowCount / 100) + 5; // Add time based on data size
            }
            if (this.dataMetrics.modelComplexity > 0) {
                estimatedTime += Math.round(this.dataMetrics.modelComplexity * 1.2); // Add time based on complexity
            }
            
            metricsSection.innerHTML = `
                <div class="metric-item">
                    <label>Predicted Accuracy:</label>
                    <span class="metric-value">${this.dataMetrics.accuracy}%</span>
                </div>
                <div class="metric-item">
                    <label>Data Quality:</label>
                    <span class="metric-value">${this.dataMetrics.dataQuality}%</span>
                </div>
                <div class="metric-item">
                    <label>Model Complexity:</label>
                    <span class="metric-value">${this.dataMetrics.modelComplexity}%</span>
                </div>
                <div class="metric-item">
                    <label>Model Quality:</label>
                    <span class="metric-value">${this.dataMetrics.modelQuality}%</span>
                </div>
                <div class="metric-item highlight">
                    <label>Total Training Cost:</label>
                    <span class="metric-value primary">${totalCost.toLocaleString()} tokens <i class="fas fa-coins"></i></span>
                </div>
                <div class="metric-item">
                    <label>Estimated ETA:</label>
                    <span class="metric-value">${estimatedTime} min</span>
                </div>
            `;
        } else {
            // If metrics section not found, log error and try alternative selector
            console.error('Metrics section not found! Trying alternative selectors...');
            const altMetricsSection = document.querySelector('.card .metrics');
            if (altMetricsSection) {
                console.log('Found metrics section with alternative selector');
                // Update with alternative section
                const versionCost = this.modelHistoryVersions * this.tokenCosts.versionCost;
                const totalCost = this.calculateDynamicTokenCost() + versionCost;
                
                const costElement = altMetricsSection.querySelector('.metric-item.highlight .metric-value.primary');
                if (costElement) {
                    costElement.innerHTML = `${totalCost.toLocaleString()} tokens <i class="fas fa-coins"></i>`;
                    console.log('Updated Total Training Cost directly:', totalCost);
                }
            }
        }
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