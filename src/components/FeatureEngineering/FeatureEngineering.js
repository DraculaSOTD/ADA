/**
 * Feature Engineering Component
 * Provides automated feature engineering capabilities with intelligent suggestions
 */

import { loadComponentCSS } from '../../js/services/componentLoader.js';

class FeatureEngineering {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            showAdvanced: true,
            allowCustomOperations: true,
            maxFileSize: 50 * 1024 * 1024, // 50MB
            ...options
        };
        
        this.currentFile = null;
        this.currentAnalysis = null;
        this.selectedOperations = [];
        this.operationTypes = null;
        this.previewMode = false;
        
        this.init();
    }
    
    async init() {
        await loadComponentCSS('src/components/FeatureEngineering/FeatureEngineering.css');
        this.render();
        this.setupEventListeners();
        await this.loadOperationTypes();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="feature-engineering">
                <!-- Header -->
                <div class="feature-engineering-header">
                    <h2>
                        <i class="fas fa-cogs"></i>
                        Automated Feature Engineering
                    </h2>
                    <p>Enhance your data with intelligent feature transformations and selections</p>
                </div>
                
                <!-- File Upload Section -->
                <div class="upload-section card">
                    <h3>
                        <i class="fas fa-upload"></i>
                        Upload Data for Analysis
                    </h3>
                    
                    <div class="upload-area" id="upload-area">
                        <div class="upload-placeholder">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <h4>Drop your data file here</h4>
                            <p>Or click to browse (CSV, Excel files supported)</p>
                            <input type="file" id="file-input" accept=".csv,.xlsx,.xls" hidden>
                        </div>
                    </div>
                    
                    <div class="upload-options">
                        <div class="form-group">
                            <label for="target-column">Target Column (Optional):</label>
                            <select id="target-column" class="form-control">
                                <option value="">Select target column...</option>
                            </select>
                            <small class="form-hint">
                                Specify the target column for supervised learning recommendations
                            </small>
                        </div>
                        
                        <button id="analyze-btn" class="btn btn-primary" disabled>
                            <i class="fas fa-search"></i>
                            Analyze Data
                        </button>
                    </div>
                </div>
                
                <!-- Analysis Results -->
                <div class="analysis-section" id="analysis-section" style="display: none;">
                    <!-- Data Overview -->
                    <div class="data-overview card">
                        <h3>
                            <i class="fas fa-chart-bar"></i>
                            Data Overview
                        </h3>
                        <div class="overview-grid" id="overview-grid">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>
                    
                    <!-- Feature Analysis -->
                    <div class="feature-analysis card">
                        <h3>
                            <i class="fas fa-microscope"></i>
                            Feature Analysis
                        </h3>
                        <div class="features-table-container">
                            <table class="features-table" id="features-table">
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        <th>Type</th>
                                        <th>Missing %</th>
                                        <th>Unique Values</th>
                                        <th>Statistics</th>
                                        <th>Issues</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Populated by JavaScript -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Recommendations -->
                    <div class="recommendations-section card">
                        <h3>
                            <i class="fas fa-lightbulb"></i>
                            Feature Engineering Recommendations
                        </h3>
                        <div class="recommendations-container" id="recommendations-container">
                            <!-- Populated by JavaScript -->
                        </div>
                        
                        <div class="recommendations-actions">
                            <button id="select-all-btn" class="btn btn-secondary">
                                <i class="fas fa-check-double"></i>
                                Select All Recommended
                            </button>
                            <button id="clear-selection-btn" class="btn btn-secondary">
                                <i class="fas fa-times"></i>
                                Clear Selection
                            </button>
                        </div>
                    </div>
                    
                    <!-- Custom Operations -->
                    <div class="custom-operations card" id="custom-operations">
                        <h3>
                            <i class="fas fa-plus-circle"></i>
                            Add Custom Operations
                        </h3>
                        <div class="operation-builder">
                            <div class="operation-form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="operation-type">Operation Type:</label>
                                        <select id="operation-type" class="form-control">
                                            <option value="">Select operation...</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="operation-column">Column:</label>
                                        <select id="operation-column" class="form-control">
                                            <option value="">Select column...</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="operation-parameters" id="operation-parameters">
                                    <!-- Dynamic parameters based on operation type -->
                                </div>
                                
                                <div class="operation-actions">
                                    <button id="preview-operation-btn" class="btn btn-secondary">
                                        <i class="fas fa-eye"></i>
                                        Preview
                                    </button>
                                    <button id="add-operation-btn" class="btn btn-primary">
                                        <i class="fas fa-plus"></i>
                                        Add Operation
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Selected Operations -->
                    <div class="selected-operations card">
                        <h3>
                            <i class="fas fa-list-check"></i>
                            Selected Operations
                            <span class="operation-count" id="operation-count">0</span>
                        </h3>
                        <div class="operations-list" id="operations-list">
                            <div class="no-operations">
                                <i class="fas fa-info-circle"></i>
                                <p>No operations selected. Choose from recommendations above or add custom operations.</p>
                            </div>
                        </div>
                        
                        <div class="operations-actions">
                            <button id="apply-operations-btn" class="btn btn-success" disabled>
                                <i class="fas fa-play"></i>
                                Apply Feature Engineering
                            </button>
                            <button id="export-config-btn" class="btn btn-secondary" disabled>
                                <i class="fas fa-download"></i>
                                Export Configuration
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Results Section -->
                <div class="results-section" id="results-section" style="display: none;">
                    <div class="results-summary card">
                        <h3>
                            <i class="fas fa-check-circle"></i>
                            Feature Engineering Results
                        </h3>
                        <div class="results-grid" id="results-grid">
                            <!-- Populated by JavaScript -->
                        </div>
                        
                        <div class="results-actions">
                            <button id="download-data-btn" class="btn btn-primary">
                                <i class="fas fa-download"></i>
                                Download Processed Data
                            </button>
                            <button id="view-sample-btn" class="btn btn-secondary">
                                <i class="fas fa-table"></i>
                                View Sample
                            </button>
                            <button id="start-new-btn" class="btn btn-secondary">
                                <i class="fas fa-redo"></i>
                                Process New File
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Preview Modal -->
                <div class="modal fade" id="preview-modal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Operation Preview</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="preview-modal-body">
                                <!-- Preview content -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" id="confirm-preview-btn">Add Operation</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // File upload
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('drop', this.handleFileDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Analysis
        document.getElementById('analyze-btn').addEventListener('click', this.analyzeData.bind(this));
        
        // Recommendations
        document.getElementById('select-all-btn').addEventListener('click', this.selectAllRecommendations.bind(this));
        document.getElementById('clear-selection-btn').addEventListener('click', this.clearSelection.bind(this));
        
        // Custom operations
        document.getElementById('operation-type').addEventListener('change', this.handleOperationTypeChange.bind(this));
        document.getElementById('preview-operation-btn').addEventListener('click', this.previewOperation.bind(this));
        document.getElementById('add-operation-btn').addEventListener('click', this.addCustomOperation.bind(this));
        
        // Apply operations
        document.getElementById('apply-operations-btn').addEventListener('click', this.applyOperations.bind(this));
        document.getElementById('export-config-btn').addEventListener('click', this.exportConfiguration.bind(this));
        
        // Results
        document.getElementById('download-data-btn').addEventListener('click', this.downloadProcessedData.bind(this));
        document.getElementById('view-sample-btn').addEventListener('click', this.viewSampleData.bind(this));
        document.getElementById('start-new-btn').addEventListener('click', this.startNew.bind(this));
    }
    
    async loadOperationTypes() {
        try {
            const response = await fetch('/api/feature-engineering/operation-types', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                this.operationTypes = await response.json();
                this.populateOperationTypeDropdown();
            }
        } catch (error) {
            console.error('Failed to load operation types:', error);
        }
    }
    
    populateOperationTypeDropdown() {
        const dropdown = document.getElementById('operation-type');
        dropdown.innerHTML = '<option value="">Select operation...</option>';
        
        if (!this.operationTypes) return;
        
        Object.entries(this.operationTypes).forEach(([category, operations]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
            
            operations.forEach(operation => {
                const option = document.createElement('option');
                option.value = operation.type;
                option.textContent = operation.name;
                option.dataset.category = category;
                option.dataset.description = operation.description;
                optgroup.appendChild(option);
            });
            
            dropdown.appendChild(optgroup);
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
    }
    
    handleFileDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    processFile(file) {
        // Validate file
        if (!this.validateFile(file)) return;
        
        this.currentFile = file;
        this.updateFileDisplay(file);
        this.populateTargetColumnDropdown(file);
        
        // Enable analyze button
        document.getElementById('analyze-btn').disabled = false;
    }
    
    validateFile(file) {
        // Check file type
        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showMessage('Please select a CSV or Excel file', 'error');
            return false;
        }
        
        // Check file size
        if (file.size > this.options.maxFileSize) {
            this.showMessage('File size exceeds 50MB limit', 'error');
            return false;
        }
        
        return true;
    }
    
    updateFileDisplay(file) {
        const uploadArea = document.getElementById('upload-area');
        uploadArea.innerHTML = `
            <div class="file-info">
                <i class="fas fa-file-${file.name.endsWith('.csv') ? 'csv' : 'excel'}"></i>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <p>Size: ${this.formatFileSize(file.size)}</p>
                </div>
                <button class="btn btn-sm btn-secondary" id="change-file-btn">
                    <i class="fas fa-exchange-alt"></i>
                    Change File
                </button>
            </div>
        `;
        
        document.getElementById('change-file-btn').addEventListener('click', () => {
            this.resetUpload();
        });
    }
    
    resetUpload() {
        this.currentFile = null;
        this.currentAnalysis = null;
        document.getElementById('file-input').value = '';
        document.getElementById('analyze-btn').disabled = true;
        document.getElementById('analysis-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        
        const uploadArea = document.getElementById('upload-area');
        uploadArea.innerHTML = `
            <div class="upload-placeholder">
                <i class="fas fa-cloud-upload-alt"></i>
                <h4>Drop your data file here</h4>
                <p>Or click to browse (CSV, Excel files supported)</p>
                <input type="file" id="file-input" accept=".csv,.xlsx,.xls" hidden>
            </div>
        `;
        
        // Re-attach event listeners
        uploadArea.addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('file-input').addEventListener('change', this.handleFileSelect.bind(this));
    }
    
    async populateTargetColumnDropdown(file) {
        // This would typically involve reading the file headers
        // For now, we'll populate it during analysis
        const dropdown = document.getElementById('target-column');
        dropdown.innerHTML = '<option value="">Select target column...</option>';
    }
    
    async analyzeData() {
        if (!this.currentFile) return;
        
        this.showLoading('Analyzing data and generating recommendations...');
        
        try {
            const formData = new FormData();
            formData.append('file', this.currentFile);
            
            const targetColumn = document.getElementById('target-column').value;
            if (targetColumn) {
                formData.append('target_column', targetColumn);
            }
            
            const response = await fetch('/api/feature-engineering/analyze', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.currentAnalysis = result.analysis;
                this.displayAnalysisResults(result);
                this.populateColumnDropdowns(result.file_info.columns);
                document.getElementById('analysis-section').style.display = 'block';
            } else {
                const error = await response.json();
                this.showMessage(error.detail || 'Analysis failed', 'error');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            this.showMessage('Failed to analyze data', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    displayAnalysisResults(result) {
        // Display data overview
        this.displayDataOverview(result.analysis);
        
        // Display feature analysis
        this.displayFeatureAnalysis(result.analysis);
        
        // Display recommendations
        this.displayRecommendations(result.analysis.suggestions);
        
        // Populate target column dropdown with actual columns
        const targetDropdown = document.getElementById('target-column');
        targetDropdown.innerHTML = '<option value="">Select target column...</option>';
        result.file_info.columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            targetDropdown.appendChild(option);
        });
    }
    
    displayDataOverview(analysis) {
        const grid = document.getElementById('overview-grid');
        const info = analysis.data_info;
        const estimated = analysis.estimated_impact;
        
        grid.innerHTML = `
            <div class="overview-item">
                <i class="fas fa-table"></i>
                <div class="overview-content">
                    <h4>Dataset Shape</h4>
                    <p>${info.shape[0].toLocaleString()} rows × ${info.shape[1]} columns</p>
                </div>
            </div>
            
            <div class="overview-item">
                <i class="fas fa-memory"></i>
                <div class="overview-content">
                    <h4>Memory Usage</h4>
                    <p>${this.formatFileSize(info.memory_usage)}</p>
                </div>
            </div>
            
            <div class="overview-item">
                <i class="fas fa-plus-circle"></i>
                <div class="overview-content">
                    <h4>Potential New Features</h4>
                    <p>${estimated.potential_new_features}</p>
                </div>
            </div>
            
            <div class="overview-item">
                <i class="fas fa-chart-line"></i>
                <div class="overview-content">
                    <h4>Complexity Score</h4>
                    <p>${estimated.complexity_score}/100</p>
                </div>
            </div>
            
            <div class="overview-item">
                <i class="fas fa-clock"></i>
                <div class="overview-content">
                    <h4>Est. Processing Time</h4>
                    <p>${estimated.estimated_processing_time || 'Unknown'}</p>
                </div>
            </div>
        `;
    }
    
    displayFeatureAnalysis(analysis) {
        const tbody = document.querySelector('#features-table tbody');
        tbody.innerHTML = '';
        
        Object.entries(analysis.feature_analysis).forEach(([column, data]) => {
            const row = document.createElement('tr');
            
            // Determine issues
            const issues = [];
            if (data.null_percentage > 10) issues.push('High missing values');
            if (data.unique_percentage > 80 && data.dtype === 'object') issues.push('High cardinality');
            if (data.skewness && Math.abs(data.skewness) > 2) issues.push('Highly skewed');
            if (data.outliers_count && data.outliers_count > data.unique_count * 0.1) issues.push('Many outliers');
            
            row.innerHTML = `
                <td class="feature-name">${column}</td>
                <td class="feature-type">
                    <span class="type-badge type-${this.getTypeCategory(data.dtype)}">${data.dtype}</span>
                </td>
                <td class="missing-percent">${data.null_percentage.toFixed(1)}%</td>
                <td class="unique-count">${data.unique_count.toLocaleString()}</td>
                <td class="statistics">${this.formatStatistics(data)}</td>
                <td class="issues">
                    ${issues.length > 0 ? 
                        `<span class="issue-badge">${issues.join(', ')}</span>` : 
                        '<span class="no-issues">None</span>'
                    }
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    displayRecommendations(suggestions) {
        const container = document.getElementById('recommendations-container');
        container.innerHTML = '';
        
        Object.entries(suggestions).forEach(([category, operations]) => {
            if (operations.length === 0) return;
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'recommendation-category';
            categoryDiv.innerHTML = `
                <h4>
                    <i class="fas ${this.getCategoryIcon(category)}"></i>
                    ${category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                </h4>
                <div class="operations-grid">
                    ${operations.map((op, index) => this.createRecommendationCard(op, category, index)).join('')}
                </div>
            `;
            
            container.appendChild(categoryDiv);
        });
        
        // Add event listeners to recommendation cards
        container.querySelectorAll('.recommendation-card').forEach(card => {
            card.addEventListener('click', this.toggleRecommendation.bind(this));
        });
    }
    
    createRecommendationCard(operation, category, index) {
        const operationId = `${category}_${index}`;
        
        return `
            <div class="recommendation-card" data-operation='${JSON.stringify(operation)}' data-id="${operationId}">
                <div class="card-header">
                    <h5>${this.getOperationTitle(operation)}</h5>
                    <div class="card-checkbox">
                        <input type="checkbox" id="rec_${operationId}">
                        <label for="rec_${operationId}"></label>
                    </div>
                </div>
                <div class="card-body">
                    <p class="operation-reason">${operation.reason}</p>
                    ${operation.column ? `<p class="operation-column">Column: <strong>${operation.column}</strong></p>` : ''}
                    ${operation.estimated_new_features ? 
                        `<p class="new-features">+${operation.estimated_new_features} new features</p>` : ''
                    }
                </div>
            </div>
        `;
    }
    
    toggleRecommendation(e) {
        const card = e.currentTarget;
        const checkbox = card.querySelector('input[type="checkbox"]');
        const operation = JSON.parse(card.dataset.operation);
        
        checkbox.checked = !checkbox.checked;
        card.classList.toggle('selected', checkbox.checked);
        
        if (checkbox.checked) {
            this.addOperation(operation);
        } else {
            this.removeOperation(operation);
        }
        
        this.updateSelectedOperations();
    }
    
    addOperation(operation) {
        // Check if operation already exists
        const exists = this.selectedOperations.some(op => 
            op.type === operation.type && op.column === operation.column
        );
        
        if (!exists) {
            this.selectedOperations.push({
                ...operation,
                id: this.generateOperationId(operation)
            });
        }
    }
    
    removeOperation(operation) {
        this.selectedOperations = this.selectedOperations.filter(op => 
            !(op.type === operation.type && op.column === operation.column)
        );
    }
    
    generateOperationId(operation) {
        return `${operation.type}_${operation.column || 'global'}_${Date.now()}`;
    }
    
    updateSelectedOperations() {
        const container = document.getElementById('operations-list');
        const countElement = document.getElementById('operation-count');
        const applyBtn = document.getElementById('apply-operations-btn');
        const exportBtn = document.getElementById('export-config-btn');
        
        countElement.textContent = this.selectedOperations.length;
        applyBtn.disabled = this.selectedOperations.length === 0;
        exportBtn.disabled = this.selectedOperations.length === 0;
        
        if (this.selectedOperations.length === 0) {
            container.innerHTML = `
                <div class="no-operations">
                    <i class="fas fa-info-circle"></i>
                    <p>No operations selected. Choose from recommendations above or add custom operations.</p>
                </div>
            `;
        } else {
            container.innerHTML = this.selectedOperations.map(op => this.createOperationItem(op)).join('');
            
            // Add remove event listeners
            container.querySelectorAll('.remove-operation-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const operationId = e.target.closest('.operation-item').dataset.id;
                    this.removeOperationById(operationId);
                    this.updateSelectedOperations();
                });
            });
        }
    }
    
    createOperationItem(operation) {
        return `
            <div class="operation-item" data-id="${operation.id}">
                <div class="operation-info">
                    <h4>${this.getOperationTitle(operation)}</h4>
                    ${operation.column ? `<p class="operation-column">Column: ${operation.column}</p>` : ''}
                    <p class="operation-description">${operation.reason || 'Custom operation'}</p>
                </div>
                <div class="operation-actions">
                    <button class="btn btn-sm btn-secondary preview-btn" data-operation='${JSON.stringify(operation)}'>
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger remove-operation-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    removeOperationById(operationId) {
        this.selectedOperations = this.selectedOperations.filter(op => op.id !== operationId);
        
        // Update recommendation cards
        document.querySelectorAll('.recommendation-card').forEach(card => {
            const operation = JSON.parse(card.dataset.operation);
            const exists = this.selectedOperations.some(op => 
                op.type === operation.type && op.column === operation.column
            );
            
            const checkbox = card.querySelector('input[type="checkbox"]');
            checkbox.checked = exists;
            card.classList.toggle('selected', exists);
        });
    }
    
    selectAllRecommendations() {
        // Select all recommendation cards
        document.querySelectorAll('.recommendation-card').forEach(card => {
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (!checkbox.checked) {
                checkbox.checked = true;
                card.classList.add('selected');
                const operation = JSON.parse(card.dataset.operation);
                this.addOperation(operation);
            }
        });
        
        this.updateSelectedOperations();
    }
    
    clearSelection() {
        // Clear all selections
        document.querySelectorAll('.recommendation-card').forEach(card => {
            const checkbox = card.querySelector('input[type="checkbox"]');
            checkbox.checked = false;
            card.classList.remove('selected');
        });
        
        this.selectedOperations = [];
        this.updateSelectedOperations();
    }
    
    populateColumnDropdowns(columns) {
        const columnDropdown = document.getElementById('operation-column');
        columnDropdown.innerHTML = '<option value="">Select column...</option>';
        
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            columnDropdown.appendChild(option);
        });
    }
    
    handleOperationTypeChange() {
        const typeSelect = document.getElementById('operation-type');
        const parametersContainer = document.getElementById('operation-parameters');
        const selectedType = typeSelect.value;
        
        if (!selectedType || !this.operationTypes) {
            parametersContainer.innerHTML = '';
            return;
        }
        
        // Find operation in types
        let operation = null;
        for (const category of Object.values(this.operationTypes)) {
            operation = category.find(op => op.type === selectedType);
            if (operation) break;
        }
        
        if (!operation || !operation.parameters) {
            parametersContainer.innerHTML = '';
            return;
        }
        
        // Generate parameter inputs
        parametersContainer.innerHTML = operation.parameters.map(param => `
            <div class="form-group">
                <label for="param_${param.name}">${param.name}:</label>
                <input 
                    type="${param.type}" 
                    id="param_${param.name}" 
                    class="form-control" 
                    value="${param.default || ''}"
                    placeholder="${param.description || ''}"
                >
            </div>
        `).join('');
    }
    
    async previewOperation() {
        const operation = this.buildOperationFromForm();
        if (!operation) return;
        
        this.showLoading('Generating preview...');
        
        try {
            const formData = new FormData();
            formData.append('file', this.currentFile);
            formData.append('operation', JSON.stringify(operation));
            
            const targetColumn = document.getElementById('target-column').value;
            if (targetColumn) {
                formData.append('target_column', targetColumn);
            }
            
            const response = await fetch('/api/feature-engineering/preview-operation', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showPreviewModal(result);
            } else {
                const error = await response.json();
                this.showMessage(error.detail || 'Preview failed', 'error');
            }
        } catch (error) {
            console.error('Preview error:', error);
            this.showMessage('Failed to generate preview', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    showPreviewModal(result) {
        const modal = document.getElementById('preview-modal');
        const body = document.getElementById('preview-modal-body');
        
        body.innerHTML = `
            <div class="preview-content">
                <div class="preview-summary">
                    <h4>Operation: ${this.getOperationTitle(result.operation)}</h4>
                    <p>Shape change: ${result.shape_change.before[0]}×${result.shape_change.before[1]} → 
                       ${result.shape_change.after[0]}×${result.shape_change.after[1]}</p>
                </div>
                
                <div class="preview-tables">
                    <div class="preview-table">
                        <h5>Before (Sample)</h5>
                        <div class="table-container">
                            ${this.createSampleTable(result.before_sample, result.before_columns)}
                        </div>
                    </div>
                    
                    <div class="preview-table">
                        <h5>After (Sample)</h5>
                        <div class="table-container">
                            ${this.createSampleTable(result.after_sample, result.after_columns)}
                        </div>
                    </div>
                </div>
                
                <div class="transformation-details">
                    <h5>Transformation Details</h5>
                    <pre>${JSON.stringify(result.transformation_info, null, 2)}</pre>
                </div>
            </div>
        `;
        
        // Store operation for confirmation
        this.previewOperation = result.operation;
        
        // Show modal (using Bootstrap or custom modal logic)
        modal.style.display = 'block';
        modal.classList.add('show');
    }
    
    createSampleTable(data, columns) {
        if (!data || data.length === 0) return '<p>No data to display</p>';
        
        return `
            <table class="table table-sm">
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${columns.map(col => `<td>${row[col] || 'N/A'}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    buildOperationFromForm() {
        const type = document.getElementById('operation-type').value;
        const column = document.getElementById('operation-column').value;
        
        if (!type) {
            this.showMessage('Please select an operation type', 'warning');
            return null;
        }
        
        const operation = { type };
        
        if (column) {
            operation.column = column;
        }
        
        // Add parameters
        const parameterInputs = document.querySelectorAll('#operation-parameters input');
        parameterInputs.forEach(input => {
            const paramName = input.id.replace('param_', '');
            let value = input.value;
            
            // Convert to appropriate type
            if (input.type === 'number') {
                value = parseFloat(value);
            }
            
            if (value !== '' && !isNaN(value)) {
                operation[paramName] = value;
            }
        });
        
        return operation;
    }
    
    addCustomOperation() {
        const operation = this.buildOperationFromForm();
        if (!operation) return;
        
        // Add to selected operations
        this.addOperation({
            ...operation,
            reason: 'Custom operation'
        });
        
        this.updateSelectedOperations();
        
        // Clear form
        document.getElementById('operation-type').value = '';
        document.getElementById('operation-column').value = '';
        document.getElementById('operation-parameters').innerHTML = '';
        
        this.showMessage('Operation added successfully', 'success');
    }
    
    async applyOperations() {
        if (this.selectedOperations.length === 0) return;
        
        this.showLoading('Applying feature engineering operations...');
        
        try {
            const formData = new FormData();
            formData.append('file', this.currentFile);
            formData.append('operations', JSON.stringify(this.selectedOperations));
            
            const targetColumn = document.getElementById('target-column').value;
            if (targetColumn) {
                formData.append('target_column', targetColumn);
            }
            
            const response = await fetch('/api/feature-engineering/apply', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.displayResults(result);
                document.getElementById('results-section').style.display = 'block';
                
                // Scroll to results
                document.getElementById('results-section').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            } else {
                const error = await response.json();
                this.showMessage(error.detail || 'Feature engineering failed', 'error');
            }
        } catch (error) {
            console.error('Apply operations error:', error);
            this.showMessage('Failed to apply feature engineering', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    displayResults(result) {
        const grid = document.getElementById('results-grid');
        const info = result.transformation_info;
        
        grid.innerHTML = `
            <div class="result-item">
                <i class="fas fa-chart-line"></i>
                <div class="result-content">
                    <h4>Original Shape</h4>
                    <p>${result.original_shape[0]} × ${result.original_shape[1]}</p>
                </div>
            </div>
            
            <div class="result-item">
                <i class="fas fa-chart-bar"></i>
                <div class="result-content">
                    <h4>Final Shape</h4>
                    <p>${result.final_shape[0]} × ${result.final_shape[1]}</p>
                </div>
            </div>
            
            <div class="result-item">
                <i class="fas fa-plus"></i>
                <div class="result-content">
                    <h4>Features Added</h4>
                    <p>${info.features_added}</p>
                </div>
            </div>
            
            <div class="result-item">
                <i class="fas fa-minus"></i>
                <div class="result-content">
                    <h4>Features Removed</h4>
                    <p>${info.features_removed}</p>
                </div>
            </div>
            
            <div class="result-item">
                <i class="fas fa-cogs"></i>
                <div class="result-content">
                    <h4>Operations Applied</h4>
                    <p>${info.applied_operations.length}</p>
                </div>
            </div>
        `;
        
        // Store processed data for download
        this.processedData = result;
    }
    
    downloadProcessedData() {
        if (!this.processedData) return;
        
        const blob = new Blob([this.processedData.csv_data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `processed_${this.currentFile.name.replace(/\.[^/.]+$/, "")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    viewSampleData() {
        if (!this.processedData) return;
        
        // Show sample data in a modal or new section
        console.log('Sample data:', this.processedData.sample_data);
        this.showMessage('Sample data logged to console', 'info');
    }
    
    exportConfiguration() {
        if (this.selectedOperations.length === 0) return;
        
        const config = {
            operations: this.selectedOperations,
            target_column: document.getElementById('target-column').value,
            created_at: new Date().toISOString(),
            file_name: this.currentFile?.name
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'feature_engineering_config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    startNew() {
        this.resetUpload();
        this.selectedOperations = [];
        this.currentAnalysis = null;
        this.processedData = null;
        
        // Scroll back to top
        this.container.scrollIntoView({ behavior: 'smooth' });
    }
    
    getTypeCategory(dtype) {
        if (dtype.includes('int') || dtype.includes('float')) return 'numeric';
        if (dtype.includes('object') || dtype.includes('category')) return 'categorical';
        if (dtype.includes('datetime')) return 'datetime';
        return 'other';
    }
    
    formatStatistics(data) {
        if (data.dtype.includes('int') || data.dtype.includes('float')) {
            return `Mean: ${data.mean?.toFixed(2) || 'N/A'}, Std: ${data.std?.toFixed(2) || 'N/A'}`;
        } else if (data.dtype === 'object') {
            return `Most frequent: ${data.most_frequent || 'N/A'}`;
        }
        return 'N/A';
    }
    
    getCategoryIcon(category) {
        const icons = {
            'encoding': 'fa-code',
            'scaling': 'fa-arrows-alt-h',
            'feature_creation': 'fa-plus-square',
            'feature_selection': 'fa-filter',
            'dimensionality_reduction': 'fa-compress-arrows-alt'
        };
        return icons[category] || 'fa-cog';
    }
    
    getOperationTitle(operation) {
        const titles = {
            'one_hot': 'One-Hot Encoding',
            'label': 'Label Encoding',
            'target': 'Target Encoding',
            'standard': 'Standard Scaling',
            'minmax': 'Min-Max Scaling',
            'robust': 'Robust Scaling',
            'power_transform': 'Power Transform',
            'datetime_features': 'DateTime Features',
            'polynomial': 'Polynomial Features',
            'correlation_filter': 'Correlation Filter',
            'variance_threshold': 'Variance Threshold',
            'univariate_selection': 'Univariate Selection',
            'pca': 'PCA'
        };
        return titles[operation.type] || operation.type;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showMessage(message, type = 'info') {
        // Implementation for showing toast messages
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    showLoading(message) {
        // Implementation for showing loading state
        console.log('Loading:', message);
    }
    
    hideLoading() {
        // Implementation for hiding loading state
        console.log('Loading complete');
    }
}

export { FeatureEngineering };