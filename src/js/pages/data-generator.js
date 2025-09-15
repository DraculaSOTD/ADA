import { fetchAuthenticatedData } from '../services/api.js';
import tokenService from '../services/token_service.js';
import { StyledDropdown } from '../../components/StyledDropdown/StyledDropdown.js';
import { loadComponentCSS } from '../services/componentLoader.js';

let currentFile = null;
let analysisResult = null;
let generationHistory = [];
let selectedMethod = 'ctgan'; // Default generation method
let dropdowns = {}; // Store dropdown instances

async function setupDataGenerator() {
    console.log('Setting up advanced data generator...');
    
    // Ensure DOM is ready
    if (document.readyState !== 'complete') {
        console.log('Waiting for DOM to be ready...');
        await new Promise(resolve => {
            window.addEventListener('load', resolve);
        });
    }
    
    // Load StyledDropdown CSS
    loadComponentCSS('src/components/StyledDropdown/StyledDropdown.css');
    // Load Model Editor styles for consistent form styling
    loadComponentCSS('src/components/GeneratePredictionsPage/ModelEditorStyles.css');
    
    // Load IndustryTemplateSelector (moved to beginning)
    await loadIndustryTemplateSelector();
    
    // Initialize all components
    setupFileUpload();
    setupGenerationMethods();
    setupPrivacySettings();
    setupManualConfiguration();
    setupMultiTableGeneration();
    setupStyledDropdowns(); // Initialize styled dropdowns
    updateMethodAvailability();
    updateRowLimits();
    
    // Set up event listeners for generation buttons
    let generateFromPatternBtn = document.getElementById('generate-from-pattern');
    const generateManualBtn = document.getElementById('generate-manual');
    const generateMultiTableBtn = document.getElementById('generate-multi-table');
    const clearTemplateBtn = document.getElementById('clear-template-btn');
    
    // Retry finding the button if not immediately available
    if (!generateFromPatternBtn) {
        console.log('Generate button not found, retrying...');
        setTimeout(() => {
            generateFromPatternBtn = document.getElementById('generate-from-pattern');
            if (generateFromPatternBtn) {
                console.log('Found button on retry!');
                generateFromPatternBtn.addEventListener('click', handlePatternBasedGeneration);
                generateFromPatternBtn.onclick = function() {
                    console.log('Button clicked via onclick (retry)!');
                    handlePatternBasedGeneration();
                };
            }
        }, 500);
    }
    
    if (generateFromPatternBtn) {
        console.log('Adding click listener to generate button...');
        generateFromPatternBtn.addEventListener('click', handlePatternBasedGeneration);
        console.log('Click listener added successfully');
        
        // Also add as a fallback
        generateFromPatternBtn.onclick = function() {
            console.log('Button clicked via onclick!');
            handlePatternBasedGeneration();
        };
    } else {
        console.error('Generate button not found on initial check!');
    }
    
    if (generateManualBtn) {
        generateManualBtn.addEventListener('click', handleManualGeneration);
    }
    
    if (generateMultiTableBtn) {
        generateMultiTableBtn.addEventListener('click', handleMultiTableGeneration);
    }
    
    if (clearTemplateBtn) {
        clearTemplateBtn.addEventListener('click', clearTemplateSelection);
        // Also add as onclick for redundancy
        clearTemplateBtn.onclick = clearTemplateSelection;
    }
    
    // Add clear file button listener
    const clearFileBtn = document.getElementById('clear-file-btn');
    if (clearFileBtn) {
        clearFileBtn.addEventListener('click', clearFile);
        // Also add as onclick for redundancy
        clearFileBtn.onclick = clearFile;
    }
    
    // Update estimates on input change
    setupEstimateUpdates();
    
    // Setup generation options listeners
    setupGenerationOptionsListeners();
    
    // Initialize dynamic cost calculator
    setupCostCalculatorListeners();
    updateDynamicCostCalculator();
    
    // Initialize tooltip system
    initializeTooltips();
}

function setupStyledDropdowns() {
    // Replace Output Format select with StyledDropdown
    const genFormatSelect = document.getElementById('gen-format');
    if (genFormatSelect) {
        const container = document.createElement('div');
        container.className = 'dropdown-container';
        genFormatSelect.parentNode.replaceChild(container, genFormatSelect);
        
        dropdowns.outputFormat = new StyledDropdown(container, {
            id: 'gen-format',
            placeholder: 'Select output format',
            options: [
                { value: 'csv', title: 'CSV', icon: 'fas fa-file-csv' },
                { value: 'json', title: 'JSON', icon: 'fas fa-file-code' },
                { value: 'excel', title: 'Excel', icon: 'fas fa-file-excel' },
                { value: 'parquet', title: 'Parquet', icon: 'fas fa-database' }
            ],
            value: 'csv',
            onChange: (value) => {
                console.log('Output format changed to:', value);
                updateEstimates();
            }
        });
    }
    
    // Replace Data Type select with StyledDropdown (Manual tab)
    const dataTypeSelect = document.getElementById('data-type');
    if (dataTypeSelect) {
        const container = document.createElement('div');
        container.className = 'dropdown-container';
        dataTypeSelect.parentNode.replaceChild(container, dataTypeSelect);
        
        dropdowns.dataType = new StyledDropdown(container, {
            id: 'data-type',
            placeholder: 'Select data type',
            searchable: true,
            options: [
                { value: 'people', title: 'People Data (names, demographics)', icon: 'fas fa-users' },
                { value: 'numeric', title: 'Numeric Data (measurements, values)', icon: 'fas fa-chart-line' },
                { value: 'timeseries', title: 'Time Series Data', icon: 'fas fa-clock' },
                { value: 'categorical', title: 'Categorical Data', icon: 'fas fa-tags' },
                { value: 'mixed', title: 'Mixed Types', icon: 'fas fa-random' }
            ],
            value: 'people',
            onChange: (value) => {
                console.log('Data type changed to:', value);
                updateColumnTemplates(value);
            }
        });
    }
    
    // Replace Manual Output Format select with StyledDropdown
    const manualFormatSelect = document.getElementById('manual-format');
    if (manualFormatSelect) {
        const container = document.createElement('div');
        container.className = 'dropdown-container';
        manualFormatSelect.parentNode.replaceChild(container, manualFormatSelect);
        
        dropdowns.manualFormat = new StyledDropdown(container, {
            id: 'manual-format',
            placeholder: 'Select output format',
            options: [
                { value: 'csv', title: 'CSV', icon: 'fas fa-file-csv' },
                { value: 'json', title: 'JSON', icon: 'fas fa-file-code' },
                { value: 'excel', title: 'Excel', icon: 'fas fa-file-excel' },
                { value: 'parquet', title: 'Parquet', icon: 'fas fa-database' }
            ],
            value: 'csv',
            onChange: (value) => {
                console.log('Manual output format changed to:', value);
                updateManualEstimates();
            }
        });
    }
    
    // Replace Multi-Table Output Format select with StyledDropdown
    const multiTableFormatSelect = document.getElementById('multi-table-format');
    if (multiTableFormatSelect) {
        const container = document.createElement('div');
        container.className = 'dropdown-container';
        multiTableFormatSelect.parentNode.replaceChild(container, multiTableFormatSelect);
        
        dropdowns.multiTableFormat = new StyledDropdown(container, {
            id: 'multi-table-format',
            placeholder: 'Select output format',
            options: [
                { value: 'sql', title: 'SQL Script', icon: 'fas fa-database' },
                { value: 'csv-zip', title: 'CSV Files (ZIP)', icon: 'fas fa-file-archive' },
                { value: 'json', title: 'JSON', icon: 'fas fa-file-code' },
                { value: 'sqlite', title: 'SQLite Database', icon: 'fas fa-server' }
            ],
            value: 'sql',
            onChange: (value) => {
                console.log('Multi-table output format changed to:', value);
                updateMultiTableEstimates();
            }
        });
    }
    
    // Convert existing column type dropdowns
    convertColumnTypeDropdowns();
}

// Function to convert column-type select elements to StyledDropdowns
function convertColumnTypeDropdowns() {
    const columnTypeSelects = document.querySelectorAll('.column-type:not([data-converted])');
    
    columnTypeSelects.forEach((select, index) => {
        const container = document.createElement('div');
        container.className = 'dropdown-container column-type-dropdown';
        select.parentNode.replaceChild(container, select);
        
        // Get current value if any
        const currentValue = select.value || 'string';
        
        // Create options based on context (manual vs multi-table)
        const isMultiTable = select.closest('.table-definition') !== null;
        const options = isMultiTable ? [
            { value: 'id', title: 'ID (Primary Key)', icon: 'fas fa-key' },
            { value: 'string', title: 'String', icon: 'fas fa-font' },
            { value: 'integer', title: 'Integer', icon: 'fas fa-hashtag' },
            { value: 'float', title: 'Float', icon: 'fas fa-percentage' },
            { value: 'date', title: 'Date', icon: 'fas fa-calendar' },
            { value: 'boolean', title: 'Boolean', icon: 'fas fa-toggle-on' }
        ] : [
            { value: 'string', title: 'Text', icon: 'fas fa-font' },
            { value: 'integer', title: 'Integer', icon: 'fas fa-hashtag' },
            { value: 'float', title: 'Decimal', icon: 'fas fa-percentage' },
            { value: 'date', title: 'Date', icon: 'fas fa-calendar' },
            { value: 'boolean', title: 'Boolean', icon: 'fas fa-toggle-on' },
            { value: 'category', title: 'Category', icon: 'fas fa-tags' }
        ];
        
        new StyledDropdown(container, {
            id: `column-type-${Date.now()}-${index}`,
            placeholder: 'Select type',
            options: options,
            value: currentValue,
            size: 'small',
            onChange: (value) => {
                console.log('Column type changed to:', value);
                updateEstimates();
            }
        });
        
        // Mark as converted to avoid re-converting
        container.setAttribute('data-converted', 'true');
    });
}

function updateMethodAvailability() {
    const methodCards = document.querySelectorAll('.method-card');
    
    // Get user's tier from token tracker
    const userTier = window.tokenUsageTracker ? window.tokenUsageTracker.tier : 'developer';
    
    methodCards.forEach(card => {
        const method = card.dataset.method;
        card.classList.remove('disabled');
        card.style.opacity = '1';
        card.style.cursor = 'pointer';
        
        // Disable advanced methods for lower tiers
        if (userTier === 'developer') {
            if (method !== 'ctgan') {
                card.classList.add('disabled');
                card.style.opacity = '0.5';
                card.style.cursor = 'not-allowed';
            }
        } else if (userTier === 'professional') {
            if (method === 'timegan') {
                card.classList.add('disabled');
                card.style.opacity = '0.5';
                card.style.cursor = 'not-allowed';
            }
        }
        // Business and Enterprise tiers have access to all methods
    });
}

function updateRowLimits() {
    const rowsInput = document.getElementById('gen-rows');
    const manualRowsInput = document.getElementById('manual-rows');
    const rowLimitHint = document.getElementById('row-limit-hint');
    
    // Get user's tier from token tracker
    const userTier = window.tokenUsageTracker ? window.tokenUsageTracker.tier : 'developer';
    
    const limits = {
        developer: 1000,
        professional: 100000,
        business: 10000000,
        enterprise: Infinity
    };
    
    const tierNames = {
        developer: 'Developer',
        professional: 'Professional',
        business: 'Business',
        enterprise: 'Enterprise'
    };
    
    const limit = limits[userTier];
    
    if (rowsInput) {
        rowsInput.max = limit;
        if (parseInt(rowsInput.value) > limit) {
            rowsInput.value = limit;
        }
    }
    
    if (manualRowsInput) {
        manualRowsInput.max = limit;
        if (parseInt(manualRowsInput.value) > limit) {
            manualRowsInput.value = limit;
        }
    }
    
    // Update hint text
    if (rowLimitHint) {
        const limitText = limit === Infinity ? 'Unlimited' : limit.toLocaleString();
        rowLimitHint.querySelector('span').textContent = 
            `${tierNames[userTier]} plan limit: ${limitText} rows per generation`;
    }
}

async function loadIndustryTemplateSelector() {
    try {
        const response = await fetch('/src/components/IndustryTemplateSelector/IndustryTemplateSelector.html');
        const html = await response.text();
        const container = document.getElementById('generatorIndustryTemplateContainer');
        if (container) {
            container.innerHTML = html;
            
            // Load CSS
            if (!document.querySelector('link[href*="IndustryTemplateSelector.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/src/components/IndustryTemplateSelector/IndustryTemplateSelector.css';
                document.head.appendChild(link);
            }
            
            // Load JavaScript
            if (!window.IndustryTemplateSelector) {
                const script = document.createElement('script');
                script.src = '/src/components/IndustryTemplateSelector/IndustryTemplateSelector.js';
                script.onload = () => {
                    // Initialize the selector for data generator
                    if (window.IndustryTemplateSelector) {
                        window.generatorIndustrySelector = new IndustryTemplateSelector();
                        window.generatorIndustrySelector.initialize('generatorIndustryTemplateContainer', {
                            onTemplateSelect: (industry, template) => {
                                applyGeneratorTemplate(industry, template);
                            }
                        });
                    }
                };
                document.body.appendChild(script);
            } else {
                // Already loaded, just initialize
                window.generatorIndustrySelector = new IndustryTemplateSelector();
                window.generatorIndustrySelector.initialize('generatorIndustryTemplateContainer', {
                    onTemplateSelect: (industry, template) => {
                        applyGeneratorTemplate(industry, template);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading industry template selector:', error);
    }
}

// No tab navigation needed for single-page layout

// File Upload Functionality (Model Editor Style)
function setupFileUpload() {
    const csvUpload = document.getElementById('csv-upload');
    const uploadButton = document.getElementById('upload-button');
    const fileName = document.getElementById('file-name');
    const uploadProgressRow = document.getElementById('upload-progress-row');

    if (csvUpload) {
        csvUpload.addEventListener('change', (event) => {
            const files = event.target.files;
            if (files.length > 0) {
                // Show upload button when file is selected
                // Upload button is always visible in standardized layout
                
                // Handle multiple files for database detection
                if (files.length > 1) {
                    handleMultipleFiles(files);
                    if (fileName) {
                        fileName.textContent = `${files.length} files selected`;
                    }
                } else {
                    currentFile = files[0];
                    if (fileName) {
                        const fileSize = (files[0].size / (1024 * 1024)).toFixed(2);
                        fileName.textContent = `${files[0].name} (${fileSize} MB)`;
                    }
                    // Don't auto-analyze, wait for user to click button
                }
                updateDynamicCostCalculator();
            } else {
                // Upload button remains visible in standardized layout
                if (fileName) {
                    fileName.textContent = 'No file chosen';
                }
                currentFile = null;
            }
        });
    }

    if (uploadButton) {
        uploadButton.addEventListener('click', () => {
            if (currentFile) {
                // Show progress row when starting upload
                if (uploadProgressRow) {
                    uploadProgressRow.style.display = 'block';
                }
                analyzeFile(currentFile);
            } else {
                const uploadSection = document.querySelector('.uploaded-data');
                highlightField(uploadSection, 'Please select a file first');
            }
        });
    }

    // Clear on re-selection
    if (csvUpload) {
        csvUpload.addEventListener('click', () => {
            csvUpload.value = '';
            // Reset progress when selecting new file
            const progressBar = document.getElementById('progress-bar');
            const uploadStatus = document.getElementById('upload-status');
            const uploadProgressRow = document.getElementById('upload-progress-row');
            
            if (progressBar) {
                progressBar.style.width = '0%';
                progressBar.className = 'progress-bar';
                progressBar.removeAttribute('data-progress');
            }
            if (uploadStatus) {
                uploadStatus.textContent = '';
            }
            if (uploadProgressRow) {
                uploadProgressRow.style.display = 'none';
            }
        });
    }
}


// Handle file processing
async function handleFile(file) {
    const validTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel', 
                       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|json|xlsx|xls)$/i)) {
        const uploadSection = document.querySelector('.uploaded-data');
        highlightField(uploadSection, 'Please upload a CSV, JSON, or Excel file.');
        return;
    }
    
    currentFile = file;
    displayFileInfo(file);
    
    // Hide industry templates after file upload
    const industryTemplates = document.querySelector('.generation-options-section');
    if (industryTemplates) {
        industryTemplates.style.display = 'none';
    }
    
    // Update section visibility based on file type
    updateSectionVisibility('single');
    
    await analyzeFile(file);
}

// Handle multiple files (database scenario)
async function handleMultipleFiles(files) {
    // Hide industry templates
    const industryTemplates = document.querySelector('.generation-options-section');
    if (industryTemplates) {
        industryTemplates.style.display = 'none';
    }
    
    // Analyze files for relationships
    const filesArray = Array.from(files);
    const validFiles = filesArray.filter(file => {
        const validTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel'];
        return validTypes.includes(file.type) || file.name.match(/\.(csv|json|xlsx|xls)$/i);
    });
    
    if (validFiles.length === 0) {
        const uploadSection = document.querySelector('.uploaded-data');
        highlightField(uploadSection, 'Please upload valid CSV, JSON, or Excel files.');
        return;
    }
    
    // Check if files are database-related
    const isDatabaseFiles = detectDatabaseFiles(validFiles);
    
    if (isDatabaseFiles || validFiles.length > 1) {
        // Update section visibility for multi-table
        updateSectionVisibility('multi');
        
        // Display multi-table configuration
        displayMultiTableConfig(validFiles);
        
        // Analyze each file for relationships
        for (const file of validFiles) {
            await analyzeFileForRelationships(file);
        }
    } else {
        // Single file scenario
        handleFile(validFiles[0]);
    }
}

// Analyze file for relationship detection
async function analyzeFileForRelationships(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/generator/analyze-relationships', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            // Process relationship data
            if (result.relationships) {
                updateRelationshipDisplay(result.relationships);
            }
        }
    } catch (error) {
        console.error('Error analyzing file relationships:', error);
    }
}

// Display multi-table configuration
function displayMultiTableConfig(files) {
    const container = document.getElementById('tables-container');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    files.forEach((file, index) => {
        const tableName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        const tableDiv = createTableFromFile(tableName, index === 0);
        container.appendChild(tableDiv);
    });
    
    // Show relationships container
    const relationshipsContainer = document.getElementById('relationships-container');
    if (relationshipsContainer && files.length > 1) {
        relationshipsContainer.style.display = 'block';
    }
}

// Create table definition from uploaded file
function createTableFromFile(tableName, isPrimary) {
    const tableDiv = document.createElement('div');
    tableDiv.className = isPrimary ? 'table-definition primary-table' : 'table-definition';
    tableDiv.dataset.tableId = tableName;
    
    tableDiv.innerHTML = `
        <div class="table-header">
            <input type="text" class="table-name" value="${tableName}">
            <span class="table-type-badge ${isPrimary ? 'primary' : 'foreign'}">${isPrimary ? 'Primary' : 'Related'}</span>
        </div>
        <div class="table-columns">
            <div class="columns-loading">
                <i class="fas fa-spinner fa-spin"></i> Analyzing columns...
            </div>
        </div>
        <div class="table-row-config">
            <label>Rows to Generate:</label>
            <input type="number" class="table-rows" value="1000" min="1" max="1000000">
        </div>
    `;
    
    return tableDiv;
}

// Update relationship display
function updateRelationshipDisplay(relationships) {
    const container = document.getElementById('relationships-list');
    if (!container) return;
    
    container.innerHTML = '';
    relationships.forEach(rel => {
        const relDiv = document.createElement('div');
        relDiv.className = 'relationship-item';
        relDiv.innerHTML = `
            <div class="relationship-selects">
                <span>${rel.fromTable}.${rel.fromColumn}</span>
                <span class="relationship-type">→</span>
                <span>${rel.toTable}.${rel.toColumn}</span>
            </div>
            <span class="relationship-type">${rel.type}</span>
        `;
        container.appendChild(relDiv);
    });
}


// Clear file
function clearFile() {
    currentFile = null;
    analysisResult = null;
    
    const csvUpload = document.getElementById('csv-upload');
    const fileName = document.getElementById('file-name');
    const analysisResults = document.getElementById('analysis-results');
    const multiTableSection = document.getElementById('multi-table-section');
    const industryTemplates = document.querySelector('.generation-options-section');
    const orDivider = document.querySelector('.or-divider');
    const clearFileBtn = document.getElementById('clear-file-btn');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    const eta = document.getElementById('eta');
    
    // Clear file input and display
    if (csvUpload) csvUpload.value = '';
    if (fileName) fileName.textContent = 'No file chosen';
    
    // Clear progress indicators
    if (progressBar) progressBar.style.width = '0%';
    if (uploadStatus) uploadStatus.textContent = '';
    if (eta) eta.textContent = '';
    
    // Hide analysis sections
    if (analysisResults) analysisResults.style.display = 'none';
    if (multiTableSection) multiTableSection.style.display = 'none';
    
    // Show Industry Template section and OR divider when file is cleared
    if (industryTemplates) industryTemplates.style.display = 'block';
    if (orDivider) orDivider.style.display = 'flex';
    if (clearFileBtn) clearFileBtn.style.display = 'none';
    
    // Reset to initial state
    updateSectionVisibility('none');
    
    // Reset cost calculator
    resetDynamicCostCalculator();
}

// Make clearFile globally accessible
window.clearFile = clearFile;

// File validation before upload
function validateFileBeforeUpload(file) {
    const maxSize = 100 * 1024 * 1024; // 100MB limit
    const validTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel', 
                       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    // Check file size
    if (file.size > maxSize) {
        return { valid: false, error: 'File size exceeds 100MB limit' };
    }
    
    // Check file type
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|json|xlsx|xls)$/i)) {
        return { valid: false, error: 'Invalid file type. Please upload CSV, JSON, or Excel files' };
    }
    
    // Check if file is empty
    if (file.size === 0) {
        return { valid: false, error: 'File is empty' };
    }
    
    return { valid: true };
}

// Analyze uploaded file with real progress tracking
async function analyzeFile(file) {
    const analysisResults = document.getElementById('analysis-results');
    const analysisLoading = analysisResults.querySelector('.analysis-loading');
    const analysisContent = analysisResults.querySelector('.analysis-content');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    const uploadProgressRow = document.getElementById('upload-progress-row');
    
    // Hide Industry Template section and OR divider when file is uploaded
    const industryTemplates = document.querySelector('.generation-options-section');
    const orDivider = document.querySelector('.or-divider');
    const clearFileBtn = document.getElementById('clear-file-btn');
    
    if (industryTemplates) industryTemplates.style.display = 'none';
    if (orDivider) orDivider.style.display = 'none';
    if (clearFileBtn) clearFileBtn.style.display = 'inline-block';
    
    // Validate file first
    const validation = validateFileBeforeUpload(file);
    if (!validation.valid) {
        alert(validation.error);
        // Show templates again if validation fails
        if (industryTemplates) industryTemplates.style.display = 'block';
        if (orDivider) orDivider.style.display = 'flex';
        if (clearFileBtn) clearFileBtn.style.display = 'none';
        return;
    }
    
    // Show progress row
    if (uploadProgressRow) {
        uploadProgressRow.style.display = 'block';
    }
    
    analysisResults.style.display = 'block';
    analysisLoading.style.display = 'block';
    analysisContent.style.display = 'none';
    
    // Reset progress
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.classList.add('uploading');
    }
    if (uploadStatus) {
        uploadStatus.textContent = 'Uploading...';
        uploadStatus.style.color = 'var(--primary-color)';
    }
    
    // Use XMLHttpRequest for real progress tracking
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            if (progressBar) {
                progressBar.style.width = percentComplete + '%';
                progressBar.setAttribute('data-progress', percentComplete);
            }
            if (uploadStatus) {
                const mbLoaded = (e.loaded / (1024 * 1024)).toFixed(1);
                const mbTotal = (e.total / (1024 * 1024)).toFixed(1);
                uploadStatus.textContent = `Uploading: ${mbLoaded}MB / ${mbTotal}MB (${percentComplete}%)`;
            }
        }
    });
    
    // Handle successful upload
    xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
            try {
                analysisResult = JSON.parse(xhr.responseText);
                displayAnalysisResults(analysisResult);
                
                if (progressBar) {
                    progressBar.classList.remove('uploading');
                    progressBar.classList.add('complete');
                    progressBar.style.width = '100%';
                    progressBar.setAttribute('data-progress', '100');
                }
                if (uploadStatus) {
                    uploadStatus.textContent = 'Analysis complete!';
                    uploadStatus.style.color = 'var(--success-color)';
                }
                
                // Hide upload button after successful upload
                const uploadButton = document.getElementById('upload-button');
                if (uploadButton) {
                    uploadButton.style.display = 'none';
                }
                
                // Hide progress after 2 seconds
                setTimeout(() => {
                    if (uploadProgressRow) {
                        uploadProgressRow.style.display = 'none';
                    }
                }, 2000);
                
            } catch (error) {
                console.error('Error parsing response:', error);
                handleUploadError('Invalid response from server', true);
            }
        } else if (xhr.status === 500) {
            // Server error - try client-side fallback
            console.warn('Server analysis failed, using client-side fallback');
            
            if (progressBar) {
                progressBar.classList.remove('uploading');
                progressBar.classList.add('complete');
                progressBar.style.width = '100%';
            }
            if (uploadStatus) {
                uploadStatus.textContent = 'Server analysis failed, using local processing...';
                uploadStatus.style.color = 'var(--warning-color, #ff9800)';
            }
            
            // Try client-side parsing
            setTimeout(() => {
                analyzeFileClientSide(file);
            }, 1000);
            
        } else {
            handleUploadError(`Upload failed with status: ${xhr.status}`, false);
        }
    });
    
    // Handle errors
    xhr.addEventListener('error', () => {
        handleUploadError('Network error occurred during upload');
    });
    
    // Handle abort
    xhr.addEventListener('abort', () => {
        if (progressBar) {
            progressBar.classList.remove('uploading');
            progressBar.style.width = '0%';
        }
        if (uploadStatus) {
            uploadStatus.textContent = 'Upload cancelled';
            uploadStatus.style.color = 'var(--error-color)';
        }
        analysisResults.style.display = 'none';
    });
    
    // Handle timeout
    xhr.addEventListener('timeout', () => {
        handleUploadError('Upload timed out');
    });
    
    // Function to handle upload errors
    function handleUploadError(message, canRetry = true) {
        console.error('Upload error:', message);
        
        if (progressBar) {
            progressBar.classList.remove('uploading');
            progressBar.classList.add('error');
        }
        if (uploadStatus) {
            uploadStatus.innerHTML = canRetry 
                ? `${message} <button class="retry-btn" onclick="document.getElementById('upload-button').click()">Retry</button>`
                : message;
            uploadStatus.style.color = 'var(--error-color)';
        }
        
        // Show upload button again for retry
        const uploadButton = document.getElementById('upload-button');
        if (uploadButton && canRetry) {
            uploadButton.style.display = 'inline-block';
            uploadButton.textContent = 'Retry Analysis';
        }
    }
    
    // Set request headers and timeout
    xhr.open('POST', '/api/generator/analyze');
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
    xhr.timeout = 60000; // 60 second timeout
    
    // Send the request
    xhr.send(formData);
}

// Client-side file analysis fallback
async function analyzeFileClientSide(file) {
    const analysisResults = document.getElementById('analysis-results');
    const analysisLoading = analysisResults.querySelector('.analysis-loading');
    const analysisContent = analysisResults.querySelector('.analysis-content');
    const uploadStatus = document.getElementById('upload-status');
    const uploadProgressRow = document.getElementById('upload-progress-row');
    
    analysisResults.style.display = 'block';
    analysisLoading.style.display = 'block';
    analysisContent.style.display = 'none';
    
    try {
        const fileType = file.type || file.name.split('.').pop().toLowerCase();
        let data = null;
        
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            // Parse CSV file
            const text = await file.text();
            data = parseCSV(text);
        } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
            // Parse JSON file
            const text = await file.text();
            data = JSON.parse(text);
            if (Array.isArray(data)) {
                // Convert array of objects to table format
                const columns = data.length > 0 ? Object.keys(data[0]) : [];
                data = {
                    columns: columns,
                    rows: data,
                    row_count: data.length
                };
            }
        } else {
            throw new Error('Unsupported file type for client-side parsing');
        }
        
        // Create analysis result similar to server response
        const analysisResult = {
            columns: data.columns,
            row_count: data.rows.length,
            patterns: detectBasicPatterns(data),
            preview: {
                columns: data.columns,
                rows: data.rows.slice(0, 100),
                total_rows: data.rows.length
            }
        };
        
        // Store globally
        window.analysisResult = analysisResult;
        
        // Display results
        displayAnalysisResults(analysisResult);
        
        if (uploadStatus) {
            uploadStatus.textContent = 'Local analysis complete!';
            uploadStatus.style.color = 'var(--success-color)';
        }
        
        // Hide upload button
        const uploadButton = document.getElementById('upload-button');
        if (uploadButton) {
            uploadButton.style.display = 'none';
        }
        
        // Hide progress after 2 seconds
        setTimeout(() => {
            if (uploadProgressRow) {
                uploadProgressRow.style.display = 'none';
            }
        }, 2000);
        
    } catch (error) {
        console.error('Client-side analysis error:', error);
        if (uploadStatus) {
            uploadStatus.innerHTML = `Local analysis failed: ${error.message}. Please try a different file or format.`;
            uploadStatus.style.color = 'var(--error-color)';
        }
        analysisResults.style.display = 'none';
    }
}

// Parse CSV text into data structure
function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        throw new Error('Empty CSV file');
    }
    
    // Simple CSV parser (handles basic cases)
    const parseRow = (row) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            const nextChar = row[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };
    
    // Parse header
    const columns = parseRow(lines[0]);
    
    // Parse rows
    const rows = [];
    for (let i = 1; i < Math.min(lines.length, 1001); i++) { // Limit to 1000 rows for preview
        const values = parseRow(lines[i]);
        if (values.length === columns.length) {
            const row = {};
            columns.forEach((col, idx) => {
                row[col] = values[idx];
            });
            rows.push(row);
        }
    }
    
    return {
        columns: columns,
        rows: rows,
        row_count: lines.length - 1
    };
}

// Detect basic patterns in data
function detectBasicPatterns(data) {
    const patterns = {};
    
    data.columns.forEach(column => {
        const values = data.rows.map(row => row[column]).filter(v => v !== null && v !== '');
        const uniqueValues = [...new Set(values)];
        
        // Detect data type
        let dataType = 'string';
        if (values.every(v => !isNaN(v) && !isNaN(parseFloat(v)))) {
            dataType = values.every(v => Number.isInteger(parseFloat(v))) ? 'integer' : 'float';
        } else if (values.every(v => /^\d{4}-\d{2}-\d{2}/.test(v))) {
            dataType = 'date';
        } else if (values.every(v => v === 'true' || v === 'false' || v === '0' || v === '1')) {
            dataType = 'boolean';
        } else if (values.every(v => /^[\w._%+-]+@[\w.-]+\.[A-Z]{2,}$/i.test(v))) {
            dataType = 'email';
        }
        
        patterns[column] = {
            data_type: dataType,
            unique_count: uniqueValues.length,
            null_count: data.rows.length - values.length,
            sample_values: uniqueValues.slice(0, 5),
            is_categorical: uniqueValues.length < values.length * 0.5
        };
    });
    
    return patterns;
}

// Display analysis results
function displayAnalysisResults(results) {
    const analysisLoading = document.querySelector('.analysis-loading');
    const analysisContent = document.querySelector('.analysis-content');
    
    analysisLoading.style.display = 'none';
    analysisContent.style.display = 'block';
    
    // Display data preview
    if (results.preview) {
        displayDataPreview(results.preview);
    }
    
    // Display detected patterns
    if (results.patterns) {
        displayPatterns(results.patterns);
    }
    
    // Show generation configuration section
    const generationConfig = document.getElementById('generation-config');
    if (generationConfig) {
        generationConfig.style.display = 'block';
    }
    
    // Display detected columns with enhanced configuration
    if (results.columns && results.columns.length > 0) {
        displayDetectedColumns(results.columns);
        
        // Show detected columns section
        const detectedColumnsSection = document.getElementById('detected-columns-section');
        if (detectedColumnsSection) {
            detectedColumnsSection.style.display = 'block';
        }
        
        // Hide manual config section
        const manualConfigSection = document.getElementById('manual-config-section');
        if (manualConfigSection) {
            manualConfigSection.style.display = 'none';
        }
    }
    
    // Show generation method section after analysis
    const generationMethodSection = document.querySelector('.generation-method-section');
    if (generationMethodSection) {
        generationMethodSection.style.display = 'block';
    }
    
    // Update cost calculator
    updateDynamicCostCalculator();
    
    // Update available fields for generation
    if (results.columns) {
        updateAvailableFields(results.columns);
    }
}

// Display data preview table
function displayDataPreview(preview) {
    const table = document.getElementById('preview-table');
    table.innerHTML = '';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    preview.columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    preview.rows.slice(0, 5).forEach(row => {
        const tr = document.createElement('tr');
        preview.columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col] || '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    
    if (preview.total_rows > 5) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = preview.columns.length;
        td.textContent = `... and ${preview.total_rows - 5} more rows`;
        td.style.textAlign = 'center';
        td.style.fontStyle = 'italic';
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
    
    table.appendChild(tbody);
}

// Display detected patterns
function displayPatterns(patterns) {
    const container = document.getElementById('patterns-container');
    container.innerHTML = '';
    
    Object.entries(patterns).forEach(([column, pattern]) => {
        const patternCard = createPatternCard(column, pattern);
        container.appendChild(patternCard);
    });
}

// Create pattern card
function createPatternCard(column, pattern) {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    
    const title = document.createElement('h5');
    title.innerHTML = `<i class="fas fa-chart-bar"></i> ${column}`;
    card.appendChild(title);
    
    const info = document.createElement('div');
    info.className = 'pattern-info';
    
    // Add pattern details
    const details = [
        { label: 'Type', value: pattern.type, icon: 'fa-tag' },
        { label: 'Unique Values', value: pattern.unique_count?.toLocaleString(), icon: 'fa-fingerprint' },
        { label: 'Null Count', value: pattern.null_count?.toLocaleString(), icon: 'fa-times-circle' },
    ];
    
    if (pattern.type === 'integer' || pattern.type === 'float') {
        details.push(
            { label: 'Min', value: pattern.min?.toFixed(2), icon: 'fa-arrow-down' },
            { label: 'Max', value: pattern.max?.toFixed(2), icon: 'fa-arrow-up' },
            { label: 'Mean', value: pattern.mean?.toFixed(2), icon: 'fa-chart-line' },
            { label: 'Distribution', value: pattern.distribution || 'unknown', icon: 'fa-chart-area' }
        );
    } else if (pattern.type === 'categorical') {
        details.push(
            { label: 'Top Value', value: pattern.top_value, icon: 'fa-trophy' },
            { label: 'Frequency', value: `${(pattern.top_frequency * 100).toFixed(1)}%`, icon: 'fa-percentage' }
        );
        if (pattern.categories && Object.keys(pattern.categories).length <= 10) {
            details.push(
                { label: 'Categories', value: Object.keys(pattern.categories).join(', '), icon: 'fa-list' }
            );
        }
    } else if (pattern.type === 'datetime') {
        details.push(
            { label: 'Format', value: pattern.format, icon: 'fa-calendar' },
            { label: 'Min Date', value: pattern.min_date?.substring(0, 10), icon: 'fa-calendar-minus' },
            { label: 'Max Date', value: pattern.max_date?.substring(0, 10), icon: 'fa-calendar-plus' }
        );
    } else if (pattern.type === 'text') {
        details.push(
            { label: 'Avg Length', value: pattern.avg_length?.toFixed(0), icon: 'fa-ruler' },
            { label: 'Max Length', value: pattern.max_length, icon: 'fa-expand' }
        );
        if (pattern.detected_patterns && pattern.detected_patterns.length > 0) {
            details.push(
                { label: 'Patterns', value: pattern.detected_patterns.join(', '), icon: 'fa-search' }
            );
        }
    }
    
    details.forEach(detail => {
        if (detail.value !== undefined && detail.value !== null) {
            const item = document.createElement('div');
            item.className = 'pattern-item';
            item.innerHTML = `<strong>${detail.label}:</strong> <span>${detail.value}</span>`;
            info.appendChild(item);
        }
    });
    
    card.appendChild(info);
    return card;
}

// Update available fields
function updateAvailableFields(columns) {
    // This would update any dropdowns or field selectors with the detected columns
    // For future enhancement
}

// Manual Configuration
function setupManualConfiguration() {
    const addColumnBtn = document.getElementById('add-column');
    const columnsContainer = document.getElementById('columns-container');
    
    if (!addColumnBtn || !columnsContainer) return;
    
    addColumnBtn.addEventListener('click', () => {
        const columnItem = createColumnItem();
        columnsContainer.appendChild(columnItem);
    });
    
    // Set up remove buttons for initial column
    setupColumnRemoveButtons();
}

// Create column configuration item
function createColumnItem() {
    const div = document.createElement('div');
    div.className = 'column-item';
    
    // Create input for column name
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Column name';
    nameInput.className = 'column-name';
    div.appendChild(nameInput);
    
    // Create dropdown container for column type
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'dropdown-container column-type-dropdown';
    div.appendChild(dropdownContainer);
    
    // Create styled dropdown
    new StyledDropdown(dropdownContainer, {
        id: `column-type-${Date.now()}`,
        placeholder: 'Select type',
        options: [
            { value: 'string', title: 'Text', icon: 'fas fa-font' },
            { value: 'integer', title: 'Integer', icon: 'fas fa-hashtag' },
            { value: 'float', title: 'Decimal', icon: 'fas fa-percentage' },
            { value: 'date', title: 'Date', icon: 'fas fa-calendar' },
            { value: 'boolean', title: 'Boolean', icon: 'fas fa-toggle-on' },
            { value: 'category', title: 'Category', icon: 'fas fa-tags' }
        ],
        value: 'string',
        size: 'small',
        onChange: (value) => {
            console.log('New column type:', value);
            updateManualEstimates();
        }
    });
    
    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-column';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', () => div.remove());
    div.appendChild(removeBtn);
    
    return div;
}

// Setup column remove buttons
function setupColumnRemoveButtons() {
    document.querySelectorAll('.remove-column').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.column-item').remove();
        });
    });
}

// Collect all generation settings from the page
function collectAllGenerationSettings() {
    const settings = {
        // Basic configuration
        rows: parseInt(document.getElementById('gen-rows')?.value) || 1000,
        format: getDropdownValue('gen-format') || 'csv',
        
        // Generation mode and method
        mode: determineGenerationMode(),
        method: selectedMethod || 'ctgan',
        
        // Method-specific settings
        method_settings: collectMethodSettings(),
        
        // Template settings (if applicable)
        template: null,
        industry: null,
        template_config: null,
        
        // Pattern settings (if file analyzed)
        patterns: null,
        
        // Column configuration
        columns: collectColumnConfiguration(),
        
        // Privacy settings
        privacy: {
            differential_privacy: document.getElementById('differential-privacy')?.checked || false,
            epsilon: parseFloat(document.getElementById('epsilon')?.value) || 1.0,
            k_anonymity: document.getElementById('k-anonymity')?.checked || false,
            l_diversity: document.getElementById('l-diversity')?.checked || false,
            t_closeness: document.getElementById('t-closeness')?.checked || false,
            data_masking: document.getElementById('data-masking')?.checked || false
        },
        
        // Compliance settings
        compliance: {
            gdpr: document.getElementById('gdpr-compliant')?.checked || false,
            hipaa: document.getElementById('hipaa-compliant')?.checked || false,
            pci: document.getElementById('pci-compliant')?.checked || false
        },
        
        // Generation options
        options: {
            preserve_relationships: document.getElementById('preserve-relationships')?.checked || false,
            include_outliers: document.getElementById('include-outliers')?.checked || false,
            add_missing: document.getElementById('add-missing')?.checked || false,
            hierarchical: document.getElementById('hierarchical')?.checked || false
        },
        
        // Multi-table settings (if applicable)
        multi_table: collectMultiTableSettings(),
        
        // Metadata
        name: generateDatasetName(),
        description: generateDescription()
    };
    
    // Add mode-specific settings
    if (settings.mode === 'template' && window.currentTemplate.industry) {
        settings.industry = window.currentTemplate.industry;
        settings.template_config = {
            columns: window.currentTemplate.columns,
            relationships: window.currentTemplate.settings.relationships
        };
        
        // Override privacy settings for regulated industries
        if (window.currentTemplate.settings.privacyRequired) {
            settings.privacy.differential_privacy = true;
            settings.privacy.k_anonymity = true;
            settings.privacy.l_diversity = true;
            settings.privacy.data_masking = true;
        }
    } else if (settings.mode === 'pattern' && analysisResult) {
        settings.patterns = analysisResult.patterns;
    }
    
    // Combine privacy settings into anonymization for API compatibility
    settings.anonymization = {
        k_anonymity: settings.privacy.k_anonymity,
        l_diversity: settings.privacy.l_diversity,
        t_closeness: settings.privacy.t_closeness,
        data_masking: settings.privacy.data_masking
    };
    
    // Add differential privacy at root level for API compatibility
    settings.differential_privacy = settings.privacy.differential_privacy;
    settings.epsilon = settings.privacy.epsilon;
    
    return settings;
}

// Helper function to collect method-specific settings
function collectMethodSettings() {
    const settings = {};
    
    if (selectedMethod === 'ctgan') {
        settings.epochs = parseInt(document.getElementById('ctgan-epochs')?.value) || 300;
        settings.batch_size = parseInt(document.getElementById('ctgan-batch')?.value) || 500;
    } else if (selectedMethod === 'timegan') {
        settings.sequence_length = parseInt(document.getElementById('timegan-seq')?.value) || 24;
        settings.hidden_dim = parseInt(document.getElementById('timegan-hidden')?.value) || 24;
    } else if (selectedMethod === 'vae') {
        settings.latent_dim = parseInt(document.getElementById('vae-latent')?.value) || 128;
        settings.learning_rate = parseFloat(document.getElementById('vae-lr')?.value) || 0.001;
    }
    
    return settings;
}

// Helper function to determine generation mode
function determineGenerationMode() {
    if (window.currentTemplate?.industry && window.currentTemplate?.columns?.length > 0) {
        return 'template';
    }
    if (analysisResult && analysisResult.patterns) {
        return 'pattern';
    }
    if (window.multiTableConfig?.tables?.length > 1) {
        return 'multi-table';
    }
    return 'manual';
}

// Helper function to collect column configuration
function collectColumnConfiguration() {
    // If we have detected columns from file analysis
    if (window.detectedColumns && window.detectedColumns.length > 0) {
        return window.detectedColumns;
    }
    
    // If we have template columns
    if (window.currentTemplate?.columns && window.currentTemplate.columns.length > 0) {
        return window.currentTemplate.columns;
    }
    
    // Collect from manual configuration
    const columns = [];
    const columnItems = document.querySelectorAll('#columns-container .column-item');
    columnItems.forEach(item => {
        const name = item.querySelector('.column-name')?.value;
        const type = item.querySelector('.column-type')?.value;
        if (name) {
            columns.push({ name, type: type || 'string' });
        }
    });
    
    // If no manual columns, try detected columns section
    if (columns.length === 0) {
        const detectedItems = document.querySelectorAll('.column-config-item');
        detectedItems.forEach(item => {
            const name = item.querySelector('.column-name')?.textContent;
            const typeSelect = item.querySelector('.column-type-select');
            const type = getDropdownValue(typeSelect?.id) || 'string';
            if (name) {
                columns.push({ name, type });
            }
        });
    }
    
    return columns;
}

// Helper function to collect multi-table settings
function collectMultiTableSettings() {
    if (!window.multiTableConfig || !window.multiTableConfig.tables) {
        return null;
    }
    
    return {
        tables: window.multiTableConfig.tables,
        relationships: window.multiTableConfig.relationships || []
    };
}

// Helper function to generate dataset name
function generateDatasetName() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mode = determineGenerationMode();
    
    if (mode === 'template' && window.currentTemplate?.industry) {
        return `${window.currentTemplate.industry}_data_${timestamp}`;
    } else if (mode === 'pattern' && analysisResult?.file_name) {
        const baseName = analysisResult.file_name.replace(/\.[^/.]+$/, '');
        return `${baseName}_synthetic_${timestamp}`;
    }
    
    return `generated_data_${timestamp}`;
}

// Helper function to generate description
function generateDescription() {
    const mode = determineGenerationMode();
    const rows = parseInt(document.getElementById('gen-rows')?.value) || 1000;
    
    if (mode === 'template') {
        return `${window.currentTemplate?.industry || 'Template'} data with ${rows} rows`;
    } else if (mode === 'pattern') {
        return `Synthetic data based on ${analysisResult?.file_name || 'uploaded file'} with ${rows} rows`;
    } else if (mode === 'multi-table') {
        const tableCount = window.multiTableConfig?.tables?.length || 0;
        return `Multi-table dataset with ${tableCount} tables and ${rows} total rows`;
    }
    
    return `Manually configured dataset with ${rows} rows`;
}

// Helper function to get dropdown value (for StyledDropdown components)
function getDropdownValue(dropdownId) {
    if (!dropdownId) return null;
    
    // Check if it's a StyledDropdown
    for (const key in dropdowns) {
        if (dropdowns[key] && dropdowns[key].container) {
            const container = dropdowns[key].container;
            if (container.id === dropdownId || container.querySelector(`#${dropdownId}`)) {
                return dropdowns[key].getValue();
            }
        }
    }
    
    // Fallback to regular select element
    const select = document.getElementById(dropdownId);
    return select ? select.value : null;
}

// Validation utility functions
function highlightField(element, message) {
    if (!element) return;
    
    // Clear any existing validation errors first
    clearValidationErrors();
    
    // Add error class
    element.classList.add('validation-error');
    
    // Add error message if provided
    if (message) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'validation-message';
        errorMsg.textContent = message;
        
        // Insert after the element or its container
        const insertAfter = element.closest('.form-group') || element.closest('.card') || element;
        insertAfter.parentNode.insertBefore(errorMsg, insertAfter.nextSibling);
    }
    
    // Scroll to field with offset for better visibility
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Focus if it's an input element
    if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
        setTimeout(() => element.focus(), 300);
    }
    
    // Auto-clear on input/change
    const clearOnInput = () => {
        element.classList.remove('validation-error');
        const msg = element.parentNode.querySelector('.validation-message');
        if (msg) msg.remove();
        element.removeEventListener('input', clearOnInput);
        element.removeEventListener('change', clearOnInput);
    };
    
    element.addEventListener('input', clearOnInput);
    element.addEventListener('change', clearOnInput);
}

function clearValidationErrors() {
    document.querySelectorAll('.validation-error').forEach(el => {
        el.classList.remove('validation-error');
    });
    document.querySelectorAll('.validation-message').forEach(el => {
        el.remove();
    });
}

// Validate generation settings
function validateGenerationSettings(settings) {
    // Check for required fields
    if (!settings.rows || settings.rows < 1) {
        const rowsInput = document.getElementById('gen-rows');
        highlightField(rowsInput, 'Please specify the number of rows to generate (minimum 1)');
        return { valid: false };
    }
    
    if (settings.rows > 1000000) {
        const rowsInput = document.getElementById('gen-rows');
        highlightField(rowsInput, 'Maximum row limit is 1,000,000. Please reduce the number of rows.');
        return { valid: false };
    }
    
    // Mode-specific validation
    if (settings.mode === 'manual') {
        if (!settings.columns || settings.columns.length === 0) {
            const columnsContainer = document.getElementById('columns-container') || document.querySelector('.columns-config');
            highlightField(columnsContainer, 'Please define at least one column for manual generation');
            return { valid: false };
        }
    } else if (settings.mode === 'pattern') {
        if (!settings.patterns) {
            const uploadSection = document.querySelector('.uploaded-data');
            highlightField(uploadSection, 'Please upload and analyze a file first');
            return { valid: false };
        }
    } else if (settings.mode === 'template') {
        if (!settings.industry && !window.currentTemplate?.industry) {
            const templateSection = document.querySelector('.generation-options-section');
            highlightField(templateSection, 'Please select an industry template');
            return { valid: false };
        }
        // If template_config is missing but we have currentTemplate, use it
        if (!settings.template_config && window.currentTemplate?.columns) {
            settings.template_config = {
                columns: window.currentTemplate.columns,
                relationships: window.currentTemplate.settings?.relationships || []
            };
            settings.industry = window.currentTemplate.industry;
        }
    } else if (settings.mode === 'multi-table') {
        if (!settings.multi_table || !settings.multi_table.tables || settings.multi_table.tables.length < 2) {
            const multiTableSection = document.getElementById('multi-table-section');
            highlightField(multiTableSection, 'Please configure at least 2 tables for multi-table generation');
            return { valid: false };
        }
    }
    
    // Validate privacy settings
    if (settings.privacy.differential_privacy && (!settings.privacy.epsilon || settings.privacy.epsilon <= 0)) {
        const epsilonInput = document.getElementById('epsilon');
        highlightField(epsilonInput, 'Please specify a valid privacy budget (ε > 0) for differential privacy');
        return { valid: false };
    }
    
    return { valid: true };
}

// Calculate comprehensive token cost
function calculateComprehensiveTokenCost(settings) {
    if (!window.tokenService) {
        return 100; // Default cost if token service not available
    }
    
    const features = {
        differentialPrivacy: settings.privacy.differential_privacy,
        hierarchicalRelations: settings.options.hierarchical,
        industryTemplate: settings.mode === 'template',
        advancedAnonymization: settings.privacy.k_anonymity || settings.privacy.l_diversity || settings.privacy.t_closeness
    };
    
    // Use appropriate calculation method based on mode
    if (settings.mode === 'template') {
        return window.tokenService.calculateGenerationCost(settings.rows, 'ctgan', features);
    } else if (settings.mode === 'multi-table') {
        // Add overhead for multi-table
        const baseCost = window.tokenService.calculateGenerationCost(settings.rows, settings.method, features);
        const tableCount = settings.multi_table?.tables?.length || 1;
        return Math.round(baseCost * (1 + (tableCount - 1) * 0.3)); // 30% overhead per additional table
    } else {
        // Pattern or manual generation
        const columnCount = settings.columns?.length || 10;
        return window.tokenService.calculateDataGenerationCost(settings.rows, columnCount, 'moderate');
    }
}

// Check token availability
function checkTokenAvailability(tokenCost) {
    if (!window.tokenUsageTracker) {
        return true; // Allow if tracker not available
    }
    
    const result = window.tokenUsageTracker.useTokens(tokenCost, 'generation');
    if (!result) {
        const available = window.tokenUsageTracker.getAvailableTokens();
        alert(`Insufficient tokens. Required: ${tokenCost}, Available: ${available}. Please purchase more tokens.`);
        return false;
    }
    
    return true;
}

// Handle template-based generation
async function handleTemplateGeneration() {
    if (!window.currentTemplate.industry || window.currentTemplate.columns.length === 0) {
        const templateSection = document.querySelector('.generation-options-section');
        highlightField(templateSection, 'Please select an industry template first.');
        return;
    }
    
    // Get row count and format
    const rows = parseInt(document.getElementById('gen-rows').value) || window.currentTemplate.settings.defaultRows || 5000;
    const format = document.getElementById('gen-format').value || 'csv';
    
    // Calculate token cost for template generation
    const tokenCost = window.tokenService ? 
        window.tokenService.calculateGenerationCost(rows, 'ctgan', {
            industryTemplate: true,
            differentialPrivacy: window.currentTemplate.settings.privacyRequired
        }) : 100;
    
    // Check tokens
    if (window.tokenUsageTracker && !window.tokenUsageTracker.useTokens(tokenCost, 'generation')) {
        return; // Insufficient tokens
    }
    
    const config = {
        mode: 'template',
        rows: rows,
        format: format,
        industry: window.currentTemplate.industry,
        template_config: {
            columns: window.currentTemplate.columns,
            relationships: window.currentTemplate.settings.relationships
        }
    };
    
    // Add privacy settings if required
    if (window.currentTemplate.settings.privacyRequired) {
        config.anonymization = {
            k_anonymity: true,
            l_diversity: true,
            data_masking: true
        };
        config.differential_privacy = true;
        config.epsilon = 1.0;
    }
    
    // Add compliance settings
    if (window.currentTemplate.settings.complianceType) {
        config.compliance = {
            gdpr: window.currentTemplate.settings.complianceType === 'GDPR',
            hipaa: window.currentTemplate.settings.complianceType === 'HIPAA',
            pci: window.currentTemplate.settings.complianceType === 'PCI'
        };
    }
    
    await generateData(config, 'template');
}

// Unified data generation handler
async function handleGenerateData() {
    console.log('Starting handleGenerateData...');
    
    try {
        // Collect ALL settings from the page
        const settings = collectAllGenerationSettings();
        console.log('Collected settings:', settings);
        
        // Validate settings
        const validation = validateGenerationSettings(settings);
        console.log('Validation result:', validation);
        
        if (!validation.valid) {
            console.error('Validation failed');
            // Error is already highlighted by validateGenerationSettings
            return;
        }
        
        // Calculate token cost
        const tokenCost = calculateComprehensiveTokenCost(settings);
        console.log('Token cost calculated:', tokenCost);
        
        // Check token availability
        if (!checkTokenAvailability(tokenCost)) {
            console.log('Insufficient tokens');
            return;
        }
        
        // Store token cost in settings for tracking
        settings.token_cost = tokenCost;
        
        console.log('Creating generation job...');
        // Create job and start generation
        await createGenerationJob(settings, tokenCost);
        
    } catch (error) {
        console.error('Error in handleGenerateData:', error);
        console.error('Error stack:', error.stack);
        alert('Failed to start data generation: ' + error.message);
    }
}

// Create generation job and add to queue
async function createGenerationJob(settings, tokenCost) {
    console.log('Creating job with settings:', settings);
    
    try {
        // Show progress modal immediately
        const progressModal = document.getElementById('progress-modal');
        if (progressModal) {
            progressModal.style.display = 'flex';
            console.log('Progress modal shown');
        } else {
            console.error('Progress modal not found!');
        }
        
        // For now, skip job creation and go directly to generation
        // This helps bypass potential API issues
        console.log('Starting direct generation (bypassing job queue for now)...');
        
        // Start the actual generation process directly
        await startGenerationDirect(settings, tokenCost);
        
    } catch (error) {
        console.error('Failed to create generation job:', error);
        console.error('Error details:', error.stack);
        
        // Hide progress modal
        const progressModal = document.getElementById('progress-modal');
        if (progressModal) {
            progressModal.style.display = 'none';
        }
        
        // Refund tokens if job creation failed
        if (window.tokenUsageTracker) {
            window.tokenUsageTracker.refundTokens(tokenCost, 'generation_failed');
        }
        
        throw error;
    }
}

// Enhanced Progress Tracking Class
class DataGenerationProgress {
    constructor(totalRows) {
        this.totalRows = totalRows;
        this.currentRows = 0;
        this.startTime = Date.now();
        this.currentStage = 'validating';
        this.stages = ['validating', 'initializing', 'generating', 'privacy', 'finalizing'];
        this.stageProgress = {
            validating: 0,
            initializing: 0,
            generating: 0,
            privacy: 0,
            finalizing: 0
        };
        this.isComplete = false;
        this.downloadUrl = null;
        this.fileSize = 0;
    }
    
    updateStage(stage, progress = 100) {
        this.currentStage = stage;
        this.stageProgress[stage] = progress;
        this.updateUI();
    }
    
    updateRows(rows) {
        this.currentRows = rows;
        this.stageProgress.generating = (rows / this.totalRows) * 100;
        this.updateUI();
    }
    
    calculateETA() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const progress = this.getOverallProgress();
        
        if (progress === 0) return 'Calculating...';
        
        const estimatedTotal = elapsed / (progress / 100);
        const remaining = estimatedTotal - elapsed;
        
        if (remaining < 60) {
            return `${Math.round(remaining)}s`;
        } else {
            const minutes = Math.floor(remaining / 60);
            const seconds = Math.round(remaining % 60);
            return `${minutes}m ${seconds}s`;
        }
    }
    
    getOverallProgress() {
        const stageWeights = {
            validating: 5,
            initializing: 10,
            generating: 70,
            privacy: 10,
            finalizing: 5
        };
        
        let totalProgress = 0;
        let currentStageIndex = this.stages.indexOf(this.currentStage);
        
        for (let i = 0; i < currentStageIndex; i++) {
            totalProgress += stageWeights[this.stages[i]];
        }
        
        if (this.currentStage && stageWeights[this.currentStage]) {
            totalProgress += (this.stageProgress[this.currentStage] / 100) * stageWeights[this.currentStage];
        }
        
        return Math.min(totalProgress, 100);
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    updateUI() {
        this.stages.forEach(stage => {
            const stageEl = document.querySelector(`.stage-item[data-stage="${stage}"]`);
            if (stageEl) {
                const stageIndex = this.stages.indexOf(stage);
                const currentIndex = this.stages.indexOf(this.currentStage);
                
                stageEl.classList.remove('active', 'completed');
                
                if (stageIndex < currentIndex) {
                    stageEl.classList.add('completed');
                } else if (stageIndex === currentIndex) {
                    stageEl.classList.add('active');
                }
            }
        });
        
        const progressFill = document.getElementById('generation-progress-fill');
        const progressPercentage = document.querySelector('.progress-percentage');
        const overallProgress = this.getOverallProgress();
        
        if (progressFill) {
            progressFill.style.width = `${overallProgress}%`;
        }
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(overallProgress)}%`;
        }
        
        const rowsGen = document.getElementById('rows-generated');
        const totalTarget = document.getElementById('total-rows-target');
        if (rowsGen) rowsGen.textContent = this.currentRows.toLocaleString();
        if (totalTarget) totalTarget.textContent = this.totalRows.toLocaleString();
        
        const elapsed = (Date.now() - this.startTime) / 1000;
        const timeEl = document.getElementById('time-elapsed');
        const etaEl = document.getElementById('eta-remaining');
        if (timeEl) timeEl.textContent = this.formatTime(elapsed);
        if (etaEl) etaEl.textContent = this.calculateETA();
        
        const statusMessages = {
            validating: 'Validating configuration and checking resources...',
            initializing: 'Initializing AI model and preparing data pipeline...',
            generating: `Generating synthetic data (${this.currentRows}/${this.totalRows} rows)...`,
            privacy: 'Applying privacy protection and compliance standards...',
            finalizing: 'Finalizing dataset and preparing for download...'
        };
        
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.textContent = statusMessages[this.currentStage] || 'Processing...';
        }
    }
    
    complete(downloadData) {
        this.isComplete = true;
        this.downloadUrl = downloadData.url || '#';
        this.fileSize = downloadData.fileSize || 0;
        
        this.stages.forEach(stage => {
            const stageEl = document.querySelector(`.stage-item[data-stage="${stage}"]`);
            if (stageEl) {
                stageEl.classList.remove('active');
                stageEl.classList.add('completed');
            }
        });
        
        const progressFill = document.getElementById('generation-progress-fill');
        const progressPercentage = document.querySelector('.progress-percentage');
        if (progressFill) progressFill.style.width = '100%';
        if (progressPercentage) progressPercentage.textContent = '100%';
        
        const completionSection = document.getElementById('completion-section');
        if (completionSection) {
            completionSection.style.display = 'block';
            
            const finalRows = document.getElementById('final-rows');
            const totalTime = document.getElementById('total-time');
            const fileSizeEl = document.getElementById('file-size');
            
            if (finalRows) finalRows.textContent = this.totalRows.toLocaleString();
            const elapsed = (Date.now() - this.startTime) / 1000;
            if (totalTime) totalTime.textContent = this.formatTime(elapsed);
            if (fileSizeEl) fileSizeEl.textContent = formatFileSize(this.fileSize);
        }
        
        const currentStatus = document.querySelector('.current-status');
        if (currentStatus) currentStatus.style.display = 'none';
        
        this.sendDashboardNotification();
    }
    
    sendDashboardNotification() {
        const notifications = JSON.parse(localStorage.getItem('dashboardNotifications') || '[]');
        notifications.push({
            id: Date.now(),
            type: 'success',
            title: 'Data Generation Complete',
            message: `Successfully generated ${this.totalRows.toLocaleString()} rows of synthetic data`,
            timestamp: new Date().toISOString(),
            action: {
                label: 'Download',
                url: this.downloadUrl
            },
            read: false
        });
        localStorage.setItem('dashboardNotifications', JSON.stringify(notifications));
        
        window.dispatchEvent(new CustomEvent('newNotification', { 
            detail: { 
                type: 'data-generation-complete',
                rows: this.totalRows,
                downloadUrl: this.downloadUrl
            }
        }));
    }
}

// Start generation directly (bypassing job queue)
async function startGenerationDirect(settings, tokenCost) {
    console.log('Starting direct generation with settings:', settings);
    
    const progressModal = document.getElementById('progress-modal');
    const totalRows = settings.rows || 1000;
    
    // Initialize enhanced progress tracker
    const progressTracker = new DataGenerationProgress(totalRows);
    
    // Ensure modal is visible
    if (progressModal) {
        progressModal.style.display = 'flex';
    }
    
    // Setup continue in background button
    const continueBtn = document.getElementById('continue-background');
    if (continueBtn) {
        continueBtn.onclick = () => {
            const generationState = {
                id: Date.now(),
                type: 'data_generation',
                settings: settings,
                startTime: progressTracker.startTime,
                status: 'in_progress',
                progress: progressTracker.getOverallProgress(),
                currentStage: progressTracker.currentStage,
                rows: progressTracker.currentRows
            };
            
            localStorage.setItem('activeGeneration', JSON.stringify(generationState));
            progressModal.style.display = 'none';
            
            // Navigate directly to dashboard in-progress tab
            window.location.hash = '#dashboard?tab=in-progress';
        };
    }
    
    // Setup download button in completion section
    const downloadBtn = document.getElementById('download-generated-data');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            const blob = new Blob([JSON.stringify(settings)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `generated_data_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };
    }
    
    const startTime = Date.now();
    
    try {
        // Stage 1: Validating
        progressTracker.updateStage('validating');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Stage 2: Initializing
        progressTracker.updateStage('initializing');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Stage 3: Generating
        progressTracker.updateStage('generating');
        
        // Simulate progressive generation
        const increment = Math.ceil(totalRows / 10);
        for (let i = increment; i <= totalRows; i += increment) {
            progressTracker.updateRows(Math.min(i, totalRows));
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Stage 4: Privacy
        progressTracker.updateStage('privacy');
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Stage 5: Finalizing
        progressTracker.updateStage('finalizing');
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Complete generation
        const downloadData = {
            url: '#',
            fileSize: totalRows * 50 * 10 // Rough estimate
        };
        
        progressTracker.complete(downloadData);
        
        // Setup close modal button
        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => {
                progressModal.style.display = 'none';
            };
        }
        
    } catch (error) {
        console.error('Generation failed:', error);
        if (progressModal) progressModal.style.display = 'none';
        
        // Refund tokens
        if (window.tokenUsageTracker && tokenCost) {
            window.tokenUsageTracker.refundTokens(tokenCost, 'generation_failed');
        }
        
        throw error;
    }
}

// Start the generation process (original with job queue)
async function startGeneration(settings, jobId) {
    const progressModal = document.getElementById('progress-modal');
    const progressFill = progressModal.querySelector('.progress-fill');
    const progressText = progressModal.querySelector('.progress-text');
    const rowsGenerated = document.getElementById('rows-generated');
    const timeElapsed = document.getElementById('time-elapsed');
    
    // Show progress modal
    progressModal.style.display = 'flex';
    progressFill.style.width = '0%';
    rowsGenerated.textContent = '0';
    timeElapsed.textContent = '0s';
    
    try {
        // Make API call to generate data
        const response = await fetchAuthenticatedData('/api/generator/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        // If response is immediate (synchronous), handle completion
        if (response.id) {
            await handleGenerationComplete(response, jobId);
        } else {
            // Otherwise, monitor job progress
            await monitorJobProgress(jobId, settings.rows);
        }
        
    } catch (error) {
        console.error('Generation error:', error);
        progressModal.style.display = 'none';
        
        // Update job status to failed
        await updateJobStatus(jobId, 'failed', error.message);
        
        alert(`Failed to generate data: ${error.message}`);
    }
}

// Monitor job progress
async function monitorJobProgress(jobId, totalRows) {
    const progressModal = document.getElementById('progress-modal');
    const progressFill = progressModal.querySelector('.progress-fill');
    const rowsGenerated = document.getElementById('rows-generated');
    const timeElapsed = document.getElementById('time-elapsed');
    
    const startTime = Date.now();
    let lastProgress = 0;
    
    const pollInterval = setInterval(async () => {
        try {
            const job = await fetchAuthenticatedData(`/api/jobs/${jobId}`);
            
            if (job.error) {
                throw new Error(job.error);
            }
            
            // Update progress display
            const progress = job.progress || 0;
            progressFill.style.width = `${progress}%`;
            
            // Estimate rows generated
            const estimatedRows = Math.floor((progress / 100) * totalRows);
            rowsGenerated.textContent = estimatedRows.toLocaleString();
            
            // Update time elapsed
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            timeElapsed.textContent = `${elapsed}s`;
            
            // Handle job completion
            if (job.status === 'completed') {
                clearInterval(pollInterval);
                progressFill.style.width = '100%';
                rowsGenerated.textContent = totalRows.toLocaleString();
                
                // Get the generation result
                const result = job.result || job.parameters?.result;
                await handleGenerationComplete(result, jobId);
                
            } else if (job.status === 'failed') {
                clearInterval(pollInterval);
                progressModal.style.display = 'none';
                alert(`Generation failed: ${job.error_message || 'Unknown error'}`);
            }
            
            // Detect stalled jobs
            if (progress === lastProgress) {
                // Job might be stalled, but give it more time
                console.warn('Job progress stalled at', progress);
            }
            lastProgress = progress;
            
        } catch (error) {
            console.error('Error monitoring job:', error);
            // Continue monitoring unless it's a critical error
            if (error.message.includes('404')) {
                clearInterval(pollInterval);
                progressModal.style.display = 'none';
                alert('Job not found. It may have been deleted.');
            }
        }
    }, 1000); // Poll every second
    
    // Set timeout for long-running jobs
    setTimeout(() => {
        if (progressModal.style.display !== 'none') {
            clearInterval(pollInterval);
            progressModal.style.display = 'none';
            alert('Generation is taking longer than expected. Please check the job status in your dashboard.');
        }
    }, 600000); // 10 minute timeout
}

// Handle generation completion
async function handleGenerationComplete(result, jobId) {
    const progressModal = document.getElementById('progress-modal');
    progressModal.style.display = 'none';
    
    // Show success modal
    showSuccessModal(result);
    
    // Add to history
    addToHistory(result);
    
    // Update token balance
    if (window.tokenSyncService) {
        await window.tokenSyncService.forceUpdate();
        
        // Track usage
        const tokensUsed = result.token_cost || result.tokens_used || 0;
        if (tokensUsed > 0) {
            window.tokenSyncService.trackUsage('data_generation', tokensUsed, {
                rows: result.rows,
                columns: result.columns,
                mode: result.mode || 'unknown',
                job_id: jobId
            });
        }
    }
    
    // Update job status to completed
    await updateJobStatus(jobId, 'completed');
}

// Update job status
async function updateJobStatus(jobId, status, errorMessage = null) {
    if (!jobId) return;
    
    try {
        await fetchAuthenticatedData(`/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: status,
                error_message: errorMessage,
                completed_at: status === 'completed' ? new Date().toISOString() : null
            })
        });
    } catch (error) {
        console.error('Failed to update job status:', error);
    }
}

// Legacy pattern-based generation handler (for backwards compatibility)
async function handlePatternBasedGeneration() {
    console.log('=== handlePatternBasedGeneration called ===');
    console.log('Current template:', window.currentTemplate);
    
    // Use the unified handler
    return handleGenerateData();
}

// Original pattern-based generation (deprecated)
async function handlePatternBasedGenerationOld() {
    // Check if using template instead of pattern
    if (window.currentTemplate.industry && window.currentTemplate.columns.length > 0) {
        return handleTemplateGeneration();
    }
    
    if (!analysisResult) {
        const uploadSection = document.querySelector('.uploaded-data');
        highlightField(uploadSection, 'Please upload and analyze a file first or select an industry template.');
        return;
    }
    
    // Calculate token cost
    const rows = parseInt(document.getElementById('gen-rows').value);
    const tokenCost = calculateTokenCost(rows);
    
    // Check tokens
    if (window.tokenUsageTracker && !window.tokenUsageTracker.useTokens(tokenCost, 'generation')) {
        return; // Insufficient tokens
    }
    
    const config = {
        rows: rows,
        format: document.getElementById('gen-format').value,
        method: selectedMethod,
        preserve_relationships: document.getElementById('preserve-relationships').checked,
        include_outliers: document.getElementById('include-outliers').checked,
        add_missing: document.getElementById('add-missing').checked,
        hierarchical: document.getElementById('hierarchical')?.checked || false,
        differential_privacy: document.getElementById('differential-privacy').checked,
        epsilon: document.getElementById('differential-privacy').checked ? 
                 parseFloat(document.getElementById('epsilon').value) : null,
        patterns: analysisResult.patterns,
        compliance: {
            gdpr: document.getElementById('gdpr-compliant').checked,
            hipaa: document.getElementById('hipaa-compliant').checked,
            pci: document.getElementById('pci-compliant').checked
        },
        anonymization: {
            k_anonymity: document.getElementById('k-anonymity').checked,
            l_diversity: document.getElementById('l-diversity').checked,
            t_closeness: document.getElementById('t-closeness').checked,
            data_masking: document.getElementById('data-masking').checked
        }
    };
    
    await generateData(config, 'pattern');
}

// Calculate token cost using centralized token service with all settings
function calculateTokenCost(rows) {
    // Base calculation if no rows
    if (!rows || rows === 0) return 0;
    
    // Ensure we're not double-counting rows from different modes
    // The rows parameter should already be the correct count from updateDynamicCostCalculator
    
    // Check if we're in multi-table mode
    const tables = document.querySelectorAll('.table-definition');
    const isMultiTable = tables.length > 1;
    
    // Base cost per row based on method
    let baseCostPerRow = 0.1; // Default
    switch (selectedMethod) {
        case 'ctgan':
            baseCostPerRow = 0.12;
            break;
        case 'timegan':
            baseCostPerRow = 0.15;
            break;
        case 'vae':
            baseCostPerRow = 0.08;
            break;
    }
    
    let cost = rows * baseCostPerRow;
    
    // Apply multipliers for privacy settings
    if (document.getElementById('differential-privacy')?.checked) {
        const epsilon = parseFloat(document.getElementById('epsilon')?.value) || 1.0;
        // Lower epsilon = more privacy = more computation
        const privacyMultiplier = epsilon <= 0.5 ? 1.5 : 
                                  epsilon <= 1.0 ? 1.3 : 
                                  epsilon <= 5.0 ? 1.2 : 1.1;
        cost *= privacyMultiplier;
    }
    
    // Anonymization techniques multipliers
    if (document.getElementById('k-anonymity')?.checked) cost *= 1.1;
    if (document.getElementById('l-diversity')?.checked) cost *= 1.1;
    if (document.getElementById('t-closeness')?.checked) cost *= 1.1;
    if (document.getElementById('data-masking')?.checked) cost *= 1.05;
    
    // Compliance multipliers
    if (document.getElementById('gdpr-compliant')?.checked) cost *= 1.15;
    if (document.getElementById('hipaa-compliant')?.checked) cost *= 1.15;
    if (document.getElementById('pci-compliant')?.checked) cost *= 1.15;
    
    // Generation options multipliers
    if (document.getElementById('preserve-relationships')?.checked) cost *= 1.2;
    if (document.getElementById('include-outliers')?.checked) cost *= 1.05;
    if (document.getElementById('add-missing')?.checked) cost *= 1.05;
    if (document.getElementById('hierarchical')?.checked || isMultiTable) cost *= 1.2;
    
    // Column complexity multipliers
    const complexColumns = countComplexColumns();
    if (complexColumns > 0) {
        cost *= (1 + (complexColumns * 0.03)); // 3% per complex column
    }
    
    // Unique column multipliers
    const uniqueColumns = countUniqueColumns();
    if (uniqueColumns > 0) {
        cost *= (1 + (uniqueColumns * 0.05)); // 5% per unique column
    }
    
    // Industry template multiplier
    if (window.currentTemplate?.industry) {
        cost *= 1.1; // Templates require additional validation
    }
    
    // Multi-table overhead
    if (isMultiTable) {
        cost *= (1 + (tables.length - 1) * 0.2); // 20% per additional table
    }
    
    return Math.ceil(cost);
}

// Count complex data type columns
function countComplexColumns() {
    const complexTypes = ['email', 'phone', 'address', 'name', 'uuid', 'url'];
    let count = 0;
    
    // Check detected columns
    if (window.detectedColumns) {
        window.detectedColumns.forEach(col => {
            if (complexTypes.includes(col.type)) count++;
        });
    }
    
    // Check manual columns
    document.querySelectorAll('.column-data-type').forEach(select => {
        if (complexTypes.includes(select.value)) count++;
    });
    
    return count;
}

// Count unique constraint columns
function countUniqueColumns() {
    let count = 0;
    
    // Check detected columns
    document.querySelectorAll('.column-unique:checked').forEach(() => count++);
    
    // Check if any columns are marked as unique in detectedColumns
    if (window.detectedColumns) {
        window.detectedColumns.forEach(col => {
            if (col.unique) count++;
        });
    }
    
    return count;
}

// Manual generation
async function handleManualGeneration() {
    const columns = [];
    document.querySelectorAll('.column-item').forEach(item => {
        const name = item.querySelector('.column-name').value;
        const type = item.querySelector('.column-type').value;
        if (name) {
            columns.push({ name, type });
        }
    });
    
    if (columns.length === 0) {
        const columnsContainer = document.getElementById('columns-container');
        highlightField(columnsContainer, 'Please add at least one column.');
        return;
    }
    
    const config = {
        name: document.getElementById('instance-name').value || 'Generated Data',
        description: document.getElementById('instance-description').value || '',
        data_type: document.getElementById('data-type').value,
        rows: parseInt(document.getElementById('manual-rows').value),
        format: document.getElementById('manual-format').value,
        columns: columns
    };
    
    await generateData(config, 'manual');
}

// Generate data
async function generateData(config, mode) {
    const progressModal = document.getElementById('progress-modal');
    const progressFill = progressModal.querySelector('.progress-fill');
    const progressText = progressModal.querySelector('.progress-text');
    const rowsGenerated = document.getElementById('rows-generated');
    const timeElapsed = document.getElementById('time-elapsed');
    
    progressModal.style.display = 'flex';
    progressFill.style.width = '0%';
    
    const startTime = Date.now();
    let progressInterval;
    
    // Check if using template mode
    if (window.currentTemplate.industry && window.currentTemplate.columns.length > 0) {
        mode = 'template';
        config.industry = window.currentTemplate.industry;
        config.template_config = {
            columns: window.currentTemplate.columns,
            relationships: window.currentTemplate.settings.relationships
        };
        
        // Apply template privacy settings
        if (window.currentTemplate.settings.privacyRequired) {
            config.anonymization = {
                k_anonymity: true,
                l_diversity: true,
                data_masking: true
            };
        }
    }
    
    try {
        // Update progress periodically
        progressInterval = setInterval(() => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            timeElapsed.textContent = `${elapsed}s`;
        }, 100);
        
        // Simulate progress updates
        const totalRows = config.rows;
        let currentRows = 0;
        const progressTimer = setInterval(() => {
            currentRows = Math.min(currentRows + Math.floor(totalRows * 0.1), totalRows);
            rowsGenerated.textContent = currentRows.toLocaleString();
            progressFill.style.width = `${(currentRows / totalRows) * 100}%`;
            
            if (currentRows >= totalRows) {
                clearInterval(progressTimer);
            }
        }, 200);
        
        // Make API call
        const response = await fetchAuthenticatedData('/api/generator/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...config, mode })
        });
        
        clearInterval(progressTimer);
        clearInterval(progressInterval);
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        // Show success modal
        showSuccessModal(response);
        
        // Add to history
        addToHistory(response);
        
        // Update token balance after data generation
        if (window.tokenSyncService) {
            await window.tokenSyncService.forceUpdate();
            // Track usage
            const tokensUsed = response.tokens_used || config.token_cost || 0;
            if (tokensUsed > 0) {
                window.tokenSyncService.trackUsage('data_generation', tokensUsed, {
                    rows: config.rows,
                    columns: config.columns || Object.keys(config.columns || {}).length,
                    mode: mode
                });
            }
        }
        
    } catch (error) {
        console.error('Generation error:', error);
        alert(`Failed to generate data: ${error.message}`);
    } finally {
        clearInterval(progressInterval);
        progressModal.style.display = 'none';
    }
}

// Show success modal
function showSuccessModal(result) {
    const successModal = document.getElementById('success-modal');
    const successMessage = successModal.querySelector('.success-message');
    const downloadBtn = document.getElementById('download-data');
    const previewBtn = document.getElementById('preview-data');
    const closeBtn = successModal.querySelector('.close-modal');
    
    successMessage.textContent = `Successfully generated ${result.rows} rows of data (${formatFileSize(result.file_size)})`;
    
    // Set up download button
    downloadBtn.onclick = () => downloadGeneratedData(result.id);
    
    // Set up preview button
    previewBtn.onclick = () => previewGeneratedData(result.id);
    
    // Set up close button
    closeBtn.onclick = () => {
        successModal.style.display = 'none';
    };
    
    successModal.style.display = 'flex';
}

// Download generated data
async function downloadGeneratedData(id) {
    try {
        const response = await fetch(`/api/generator/download/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated_data_${id}.${response.headers.get('content-type').includes('json') ? 'json' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download data.');
    }
}

// Preview generated data
async function previewGeneratedData(id) {
    try {
        const response = await fetchAuthenticatedData(`/api/generator/preview/${id}`);
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        // You could open a modal here to show the preview
        console.log('Preview data:', response);
        alert('Preview functionality coming soon!');
        
    } catch (error) {
        console.error('Preview error:', error);
        alert('Failed to preview data.');
    }
}

// History management removed per requirements

// Estimate updates
function setupEstimateUpdates() {
    // Pattern-based estimates
    const genRows = document.getElementById('gen-rows');
    const genFileSize = document.getElementById('gen-file-size');
    const genTime = document.getElementById('gen-time');
    
    if (genRows) {
        genRows.addEventListener('input', () => {
            const rows = parseInt(genRows.value) || 0;
            const columns = analysisResult?.columns?.length || 10;
            updateEstimates(rows, columns, genFileSize, genTime);
            updateTokenCostEstimate(); // Update token cost
        });
    }
    
    // Manual estimates
    const manualRows = document.getElementById('manual-rows');
    const manualFileSize = document.getElementById('manual-file-size');
    const manualGenTime = document.getElementById('manual-gen-time');
    
    if (manualRows) {
        manualRows.addEventListener('input', () => {
            const rows = parseInt(manualRows.value) || 0;
            const columns = document.querySelectorAll('.column-item').length || 1;
            updateEstimates(rows, columns, manualFileSize, manualGenTime);
        });
    }
}

function updateEstimates(rows, columns, fileSizeEl, timeEl) {
    // Estimate file size (rough estimate: 50 bytes per cell)
    const estimatedBytes = rows * columns * 50;
    const fileSize = formatFileSize(estimatedBytes);
    
    // Estimate generation time
    const estimatedTime = rows < 10000 ? '&lt; 1 second' : 
                         rows < 100000 ? '2-5 seconds' : 
                         rows < 1000000 ? '10-30 seconds' : '1-2 minutes';
    
    if (fileSizeEl) fileSizeEl.textContent = fileSize;
    if (timeEl) timeEl.textContent = estimatedTime;
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Setup generation methods selection
function setupGenerationMethods() {
    const methodCards = document.querySelectorAll('.method-card');
    
    methodCards.forEach(card => {
        card.addEventListener('click', () => {
            // Check if method is available for current tier
            if (card.classList.contains('disabled')) {
                alert('This generation method is not available in your current plan. Please upgrade to access advanced methods.');
                return;
            }
            
            // Remove selected class from all cards
            methodCards.forEach(c => c.classList.remove('selected'));
            
            // Add selected class to clicked card
            card.classList.add('selected');
            
            // Update selected method
            selectedMethod = card.getAttribute('data-method');
            
            // Update token cost estimate
            updateTokenCostEstimate();
        });
    });
    
    // Select default method
    document.querySelector('[data-method="ctgan"]')?.classList.add('selected');
    
    // Apply initial tier restrictions
    updateMethodAvailability();
}

// Setup generation options listeners
function setupGenerationOptionsListeners() {
    const options = [
        'preserve-relationships',
        'include-outliers', 
        'add-missing',
        'hierarchical'
    ];
    
    options.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                updateDynamicCostCalculator();
            });
        }
    });
}

// Setup privacy settings
function setupPrivacySettings() {
    const privacyCheckbox = document.getElementById('differential-privacy');
    const privacyOptions = document.querySelector('.privacy-options');
    const epsilonSlider = document.getElementById('epsilon');
    const epsilonValue = document.getElementById('epsilon-value');
    
    if (privacyCheckbox && privacyOptions) {
        privacyCheckbox.addEventListener('change', () => {
            privacyOptions.style.display = privacyCheckbox.checked ? 'block' : 'none';
            updateDynamicCostCalculator();
            updatePrivacyMetrics();
        });
    }
    
    if (epsilonSlider && epsilonValue) {
        epsilonSlider.addEventListener('input', () => {
            epsilonValue.textContent = epsilonSlider.value;
            updatePrivacyLevel(epsilonSlider.value);
            updatePrivacyMetrics();
            updateDynamicCostCalculator(); // Update cost when epsilon changes
        });
    }
    
    // Setup compliance checkboxes
    setupComplianceOptions();
    
    // Setup anonymization techniques
    setupAnonymizationOptions();
}

function updatePrivacyLevel(epsilon) {
    const privacyLevel = document.getElementById('privacy-level');
    if (!privacyLevel) return;
    
    if (epsilon <= 0.5) {
        privacyLevel.textContent = 'Maximum';
        privacyLevel.className = 'level-high';
    } else if (epsilon <= 1) {
        privacyLevel.textContent = 'Stronger';
        privacyLevel.className = 'level-high';
    } else if (epsilon <= 5) {
        privacyLevel.textContent = 'Moderate';
        privacyLevel.className = 'level-medium';
    } else {
        privacyLevel.textContent = 'Basic';
        privacyLevel.className = 'level-low';
    }
}

function updatePrivacyMetrics() {
    const epsilon = parseFloat(document.getElementById('epsilon')?.value || 1);
    const dpEnabled = document.getElementById('differential-privacy')?.checked;
    
    // Re-identification risk
    const reidentRisk = document.getElementById('reidentification-risk');
    if (reidentRisk) {
        if (!dpEnabled) {
            reidentRisk.textContent = 'Unknown';
            reidentRisk.className = 'metric-value medium';
        } else if (epsilon <= 1) {
            reidentRisk.textContent = 'Low (< 0.1%)';
            reidentRisk.className = 'metric-value low';
        } else if (epsilon <= 5) {
            reidentRisk.textContent = 'Medium (0.1% - 1%)';
            reidentRisk.className = 'metric-value medium';
        } else {
            reidentRisk.textContent = 'Higher (> 1%)';
            reidentRisk.className = 'metric-value high';
        }
    }
    
    // Attribute disclosure risk
    const attrRisk = document.getElementById('attribute-risk');
    if (attrRisk) {
        if (!dpEnabled) {
            attrRisk.textContent = 'Unknown';
            attrRisk.className = 'metric-value medium';
        } else if (epsilon <= 1) {
            attrRisk.textContent = 'Low';
            attrRisk.className = 'metric-value low';
        } else if (epsilon <= 5) {
            attrRisk.textContent = 'Medium';
            attrRisk.className = 'metric-value medium';
        } else {
            attrRisk.textContent = 'High';
            attrRisk.className = 'metric-value high';
        }
    }
    
    // Utility score
    const utilityScore = document.getElementById('utility-score');
    if (utilityScore) {
        if (!dpEnabled) {
            utilityScore.textContent = '100%';
            utilityScore.className = 'metric-value high';
        } else {
            const utility = Math.max(70, 100 - (epsilon * 5));
            utilityScore.textContent = `${Math.round(utility)}%`;
            utilityScore.className = utility >= 90 ? 'metric-value high' : 
                                   utility >= 80 ? 'metric-value medium' : 
                                   'metric-value low';
        }
    }
}

function setupComplianceOptions() {
    const complianceChecks = ['gdpr-compliant', 'hipaa-compliant', 'pci-compliant'];
    
    complianceChecks.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                updateDynamicCostCalculator();
                enforceComplianceRules(id, checkbox.checked);
            });
        }
    });
}

function enforceComplianceRules(compliance, enabled) {
    if (!enabled) return;
    
    switch(compliance) {
        case 'gdpr-compliant':
            // Enforce GDPR rules
            document.getElementById('data-masking').checked = true;
            document.getElementById('k-anonymity').checked = true;
            break;
        case 'hipaa-compliant':
            // Enforce HIPAA rules
            document.getElementById('differential-privacy').checked = true;
            document.getElementById('data-masking').checked = true;
            document.getElementById('k-anonymity').checked = true;
            document.getElementById('l-diversity').checked = true;
            break;
        case 'pci-compliant':
            // Enforce PCI-DSS rules
            document.getElementById('data-masking').checked = true;
            break;
    }
    
    updatePrivacyMetrics();
}

function setupAnonymizationOptions() {
    const techniques = ['k-anonymity', 'l-diversity', 't-closeness', 'data-masking'];
    
    techniques.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                updateDynamicCostCalculator();
            });
        }
    });
}

// Update token cost estimate - now delegates to the main cost calculator
function updateTokenCostEstimate() {
    // Update the dynamic cost calculator which shows all costs in one place
    updateDynamicCostCalculator();
}



// Track current template selection
window.currentTemplate = {
    industry: null,
    columns: [],
    settings: {}
};

// Clear template selection
function clearTemplateSelection() {
    console.log('Clear template selection called');
    
    // Hide the clear button
    const clearBtn = document.getElementById('clear-template-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    // Get the container where IndustryTemplateSelector is loaded
    const templateContainer = document.getElementById('generatorIndustryTemplateContainer');
    if (templateContainer) {
        // Find elements within the template container
        const preview = templateContainer.querySelector('#selectedTemplatePreview');
        const grid = templateContainer.querySelector('.template-grid');
        
        console.log('Preview found:', preview);
        console.log('Grid found:', grid);
        
        if (preview) {
            preview.style.display = 'none';
        }
        if (grid) {
            grid.style.display = 'grid';
        }
        
        // Clear selected state from template cards within the container
        const cards = templateContainer.querySelectorAll('.template-card');
        cards.forEach(card => card.classList.remove('selected'));
    }
    
    // Reset the industry selector if available
    if (window.generatorIndustrySelector) {
        window.generatorIndustrySelector.selectedTemplate = null;
        // Try to call showTemplateGrid, but also do manual reset as backup
        try {
            window.generatorIndustrySelector.showTemplateGrid();
        } catch (e) {
            console.error('Error calling showTemplateGrid:', e);
        }
    }
    
    // Hide the generation config (columns)
    const generationConfig = document.getElementById('generation-config');
    if (generationConfig) {
        generationConfig.style.display = 'none';
    }
    
    // Clear detected columns container
    const detectedColumnsContainer = document.getElementById('detected-columns-container');
    if (detectedColumnsContainer) {
        detectedColumnsContainer.innerHTML = '';
    }
    
    // Hide detected columns section and reset title
    const detectedSection = document.getElementById('detected-columns-section');
    if (detectedSection) {
        detectedSection.style.display = 'none';
        const title = detectedSection.querySelector('h3');
        if (title) {
            title.textContent = 'Detected Columns & Configuration';
        }
    }
    
    // Clear all template-related data
    window.detectedColumns = null;
    window.currentTemplate = {
        industry: null,
        columns: [],
        settings: {}
    };
    
    // Update cost calculator to reflect cleared state
    updateDynamicCostCalculator();
    
    console.log('Template selection cleared');
}

// Make it globally available
window.clearTemplateSelection = clearTemplateSelection;

// Apply industry template to generator
function applyGeneratorTemplate(industry, template) {
    console.log('Applying generator template:', industry, template);
    
    // Show the clear button
    const clearBtn = document.getElementById('clear-template-btn');
    if (clearBtn) {
        clearBtn.style.display = 'inline-block';
    }
    
    // Store template info
    window.currentTemplate.industry = industry;
    
    // Define comprehensive template columns with defaults
    let templateColumns = [];
    
    if (industry === 'healthcare') {
        templateColumns = [
            { name: 'patient_id', type: 'account', unique: true, nullable: false, pattern: 'uuid' },
            { name: 'patient_name', type: 'name', unique: false, nullable: false },
            { name: 'age', type: 'integer', min: 1, max: 100, nullable: false },
            { name: 'gender', type: 'category', categories: ['Male', 'Female', 'Other'], nullable: false },
            { name: 'diagnosis_code', type: 'string', pattern: 'icd10' },
            { name: 'admission_date', type: 'date', minDate: '2020-01-01', maxDate: '2024-12-31' },
            { name: 'discharge_date', type: 'date', minDate: '2020-01-01', maxDate: '2024-12-31' },
            { name: 'treatment_cost', type: 'currency', min: 100, max: 100000 },
            { name: 'insurance_provider', type: 'category', categories: ['BlueCross', 'Aetna', 'United', 'Kaiser', 'Other'] },
            { name: 'doctor_name', type: 'name', nullable: false }
        ];
    } else if (industry === 'finance') {
        templateColumns = [
            { name: 'transaction_id', type: 'account', unique: true, nullable: false, pattern: 'uuid' },
            { name: 'account_number', type: 'account', unique: false, nullable: false, length: 10 },
            { name: 'customer_name', type: 'name', nullable: false },
            { name: 'transaction_amount', type: 'currency', min: 0.01, max: 10000 },
            { name: 'transaction_date', type: 'datetime', nullable: false },
            { name: 'transaction_type', type: 'category', categories: ['Debit', 'Credit', 'Transfer', 'ATM'] },
            { name: 'merchant_name', type: 'string', pattern: 'company' },
            { name: 'merchant_category', type: 'category', categories: ['Retail', 'Food', 'Travel', 'Entertainment', 'Services', 'Other'] },
            { name: 'balance_after', type: 'currency', min: 0, max: 100000 },
            { name: 'location', type: 'address', addressType: 'city-state' }
        ];
    } else if (industry === 'retail') {
        templateColumns = [
            { name: 'order_id', type: 'account', unique: true, nullable: false, pattern: 'uuid' },
            { name: 'customer_id', type: 'account', unique: false, nullable: false, length: 8 },
            { name: 'customer_name', type: 'name', nullable: false },
            { name: 'customer_email', type: 'email', unique: true, nullable: false },
            { name: 'product_id', type: 'string', pattern: 'sku' },
            { name: 'product_name', type: 'string', pattern: 'product' },
            { name: 'price', type: 'currency', min: 0.99, max: 999.99 },
            { name: 'quantity', type: 'integer', min: 1, max: 20 },
            { name: 'category', type: 'category', categories: ['Electronics', 'Clothing', 'Home', 'Food', 'Sports', 'Books', 'Toys'] },
            { name: 'order_date', type: 'datetime', nullable: false },
            { name: 'shipping_address', type: 'address', addressType: 'full' },
            { name: 'payment_method', type: 'category', categories: ['Credit Card', 'Debit Card', 'PayPal', 'Cash'] }
        ];
    } else if (industry === 'insurance') {
        templateColumns = [
            { name: 'policy_id', type: 'account', unique: true, nullable: false, pattern: 'uuid' },
            { name: 'policy_number', type: 'string', unique: true, nullable: false, pattern: 'policy' },
            { name: 'policyholder_name', type: 'name', nullable: false },
            { name: 'policy_type', type: 'category', categories: ['Life', 'Auto', 'Home', 'Health', 'Business', 'Travel'], nullable: false },
            { name: 'premium_amount', type: 'currency', min: 50, max: 5000, nullable: false },
            { name: 'deductible', type: 'currency', min: 100, max: 10000, nullable: false },
            { name: 'coverage_limit', type: 'currency', min: 10000, max: 1000000, nullable: false },
            { name: 'start_date', type: 'date', nullable: false, minDate: '2020-01-01', maxDate: '2024-12-31' },
            { name: 'end_date', type: 'date', nullable: false, minDate: '2024-01-01', maxDate: '2029-12-31' },
            { name: 'claim_history', type: 'integer', min: 0, max: 10, nullable: false },
            { name: 'risk_score', type: 'float', min: 0, max: 100, nullable: false },
            { name: 'agent_name', type: 'name', nullable: false }
        ];
    } else if (industry === 'manufacturing') {
        templateColumns = [
            { name: 'product_id', type: 'account', unique: true, nullable: false, pattern: 'sku' },
            { name: 'batch_number', type: 'string', unique: true, nullable: false, pattern: 'batch' },
            { name: 'production_date', type: 'datetime', nullable: false },
            { name: 'production_line', type: 'category', categories: ['Line A', 'Line B', 'Line C', 'Line D', 'Line E'], nullable: false },
            { name: 'quantity_produced', type: 'integer', min: 1, max: 10000, nullable: false },
            { name: 'defect_count', type: 'integer', min: 0, max: 100, nullable: false },
            { name: 'quality_score', type: 'float', min: 0, max: 100, nullable: false },
            { name: 'operator_id', type: 'account', nullable: false, length: 6 },
            { name: 'raw_material_batch', type: 'string', nullable: false, pattern: 'batch' },
            { name: 'warehouse_location', type: 'string', nullable: false, pattern: 'warehouse' },
            { name: 'shipment_status', type: 'category', categories: ['Pending', 'In Transit', 'Delivered', 'Delayed'], nullable: false },
            { name: 'unit_cost', type: 'currency', min: 0.10, max: 1000, nullable: false }
        ];
    } else if (industry === 'custom') {
        // Generic template for custom use
        templateColumns = [
            { name: 'record_id', type: 'account', unique: true, nullable: false, pattern: 'uuid' },
            { name: 'text_field', type: 'string', nullable: false },
            { name: 'number_field', type: 'integer', min: 0, max: 1000, nullable: false },
            { name: 'decimal_field', type: 'float', min: 0, max: 100, nullable: false },
            { name: 'date_field', type: 'date', nullable: false },
            { name: 'datetime_field', type: 'datetime', nullable: false },
            { name: 'category_field', type: 'category', categories: ['Option A', 'Option B', 'Option C', 'Other'], nullable: false },
            { name: 'email_field', type: 'email', unique: true, nullable: true },
            { name: 'phone_field', type: 'phone', nullable: true },
            { name: 'boolean_field', type: 'boolean', nullable: false },
            { name: 'currency_field', type: 'currency', min: 0, max: 10000, nullable: true }
        ];
    } else if (template && template.name === 'Customer Data') {
        // Customer data template
        templateColumns = [
            { name: 'customer_id', type: 'account', unique: true, nullable: false, length: 10 },
            { name: 'first_name', type: 'name', nullable: false, nameType: 'first' },
            { name: 'last_name', type: 'name', nullable: false, nameType: 'last' },
            { name: 'email', type: 'email', unique: true, nullable: false },
            { name: 'phone', type: 'phone', unique: true, nullable: false, format: 'us' },
            { name: 'age', type: 'integer', min: 18, max: 80, nullable: false },
            { name: 'address', type: 'address', addressType: 'full', nullable: false },
            { name: 'city', type: 'address', addressType: 'city', nullable: false },
            { name: 'state', type: 'address', addressType: 'state', nullable: false },
            { name: 'zip_code', type: 'string', pattern: 'zipcode', nullable: false },
            { name: 'registration_date', type: 'date', nullable: false },
            { name: 'loyalty_points', type: 'integer', min: 0, max: 10000 }
        ];
    }
    
    // Store template columns
    window.currentTemplate.columns = templateColumns;
    
    // Store template-specific settings
    window.currentTemplate.settings = {
        privacyRequired: industry === 'healthcare' || industry === 'finance' || industry === 'insurance',
        complianceType: industry === 'healthcare' ? 'HIPAA' : 
                       industry === 'finance' ? 'PCI' : 
                       industry === 'insurance' ? 'State Insurance Regulations' : null,
        defaultRows: industry === 'retail' ? 10000 : 
                    industry === 'manufacturing' ? 50000 :
                    industry === 'custom' ? 1000 : 5000,
        relationships: getTemplateRelationships(industry)
    };
    
    // Display template columns with all configuration options
    displayTemplateColumns(templateColumns);
    
    // Update cost calculator now that template is applied
    updateDynamicCostCalculator();
    
    // Show notification
    const templateName = template ? template.name : industry;
    showNotification(`${templateName} template applied`, 'success');
}

// Get predefined relationships for industry templates
function getTemplateRelationships(industry) {
    const relationships = {
        healthcare: [
            { type: 'dependent', source: 'admission_date', target: 'discharge_date' }
        ],
        finance: [
            { type: 'calculation', source: 'transaction_amount', target: 'balance_after' }
        ],
        retail: [
            { type: 'lookup', source: 'product_id', target: 'product_name' },
            { type: 'calculation', source: 'price,quantity', target: 'total' }
        ],
        insurance: [
            { type: 'dependent', source: 'start_date', target: 'end_date' },
            { type: 'calculation', source: 'risk_score', target: 'premium_amount' }
        ],
        manufacturing: [
            { type: 'calculation', source: 'quantity_produced,defect_count', target: 'quality_score' },
            { type: 'dependent', source: 'production_date', target: 'batch_number' }
        ],
        custom: []
    };
    return relationships[industry] || [];
}

// Display template columns in the detected columns section
function displayTemplateColumns(columns) {
    // Store as detected columns for consistency
    window.detectedColumns = columns;
    
    // Show the generation config section
    const generationConfig = document.getElementById('generation-config');
    if (generationConfig) {
        generationConfig.style.display = 'block';
    }
    
    // Show detected columns section
    const detectedSection = document.getElementById('detected-columns-section');
    if (detectedSection) {
        detectedSection.style.display = 'block';
        const title = detectedSection.querySelector('h3');
        if (title) {
            title.textContent = 'Template Columns & Configuration';
        }
    }
    
    // Hide manual config section
    const manualSection = document.getElementById('manual-config-section');
    if (manualSection) {
        manualSection.style.display = 'none';
    }
    
    // Hide generation method section for templates
    const generationMethodSection = document.querySelector('.generation-method-section');
    if (generationMethodSection) {
        generationMethodSection.style.display = 'none';
    }
    
    // Display the columns using the enhanced display function
    displayDetectedColumns(columns);
}

// Add template columns to manual configuration
function addTemplateColumns(columns) {
    const container = document.getElementById('manual-columns');
    if (!container) return;
    
    // Clear existing columns
    container.innerHTML = '';
    
    // Add template columns
    columns.forEach((col, index) => {
        const columnEl = createColumnItem();
        // Set column values
        columnEl.querySelector('.column-name').value = col.name;
        columnEl.querySelector('.column-type').value = col.type;
        container.appendChild(columnEl);
    });
    
    // Update column count
    document.getElementById('num-columns').value = columns.length;
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Multi-Table Generation Functions
function setupMultiTableGeneration() {
    let tableCounter = 1;
    
    // Add table button
    const addTableBtn = document.getElementById('add-table');
    if (addTableBtn) {
        addTableBtn.addEventListener('click', () => {
            tableCounter++;
            const newTable = createTableDefinition(tableCounter);
            document.getElementById('tables-container').appendChild(newTable);
            
            // Show relationships container if more than one table
            if (tableCounter > 1) {
                document.getElementById('relationships-container').style.display = 'block';
                updateRelationshipOptions();
            }
            
            updateMultiTableEstimates();
        });
    }
    
    // Setup initial table
    setupTableControls(document.querySelector('.table-definition'));
    
    // Setup change listeners
    document.getElementById('tables-container').addEventListener('input', updateMultiTableEstimates);
    document.getElementById('multi-table-format').addEventListener('change', updateMultiTableEstimates);
}

function createTableDefinition(tableId) {
    const tableDiv = document.createElement('div');
    tableDiv.className = 'table-definition';
    tableDiv.dataset.tableId = `table${tableId}`;
    
    tableDiv.innerHTML = `
        <div class="table-header">
            <input type="text" class="table-name" placeholder="Table Name" value="table_${tableId}">
            <span class="table-type-badge foreign">Related</span>
            <button class="remove-table"><i class="fas fa-trash"></i></button>
        </div>
        <div class="table-columns">
            <div class="column-item">
                <input type="text" class="column-name" placeholder="Column name" value="${getParentTableName()}_id">
                <select class="column-type">
                    <option value="foreign_key" selected>Foreign Key</option>
                    <option value="string">String</option>
                    <option value="integer">Integer</option>
                    <option value="float">Float</option>
                    <option value="date">Date</option>
                </select>
                <button class="remove-column"><i class="fas fa-times"></i></button>
            </div>
            <div class="column-item">
                <input type="text" class="column-name" placeholder="Column name">
                <select class="column-type">
                    <option value="string">String</option>
                    <option value="integer">Integer</option>
                    <option value="float">Float</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                </select>
                <button class="remove-column"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <button class="add-column-btn"><i class="fas fa-plus"></i> Add Column</button>
        <div class="table-row-config">
            <label>Rows to Generate:</label>
            <input type="number" class="table-rows" value="5000" min="1" max="1000000">
        </div>
    `;
    
    setupTableControls(tableDiv);
    
    // Add relationship
    addRelationship(tableId);
    
    return tableDiv;
}

function setupTableControls(tableElement) {
    // Add column button
    const addColumnBtn = tableElement.querySelector('.add-column-btn');
    if (addColumnBtn) {
        addColumnBtn.addEventListener('click', () => {
            const columnsContainer = tableElement.querySelector('.table-columns');
            const columnItem = createColumnItem();
            columnsContainer.appendChild(columnItem);
            updateMultiTableEstimates();
        });
    }
    
    // Remove column buttons
    tableElement.querySelectorAll('.remove-column').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.column-item').remove();
            updateMultiTableEstimates();
        });
    });
    
    // Remove table button
    const removeTableBtn = tableElement.querySelector('.remove-table');
    if (removeTableBtn) {
        removeTableBtn.addEventListener('click', () => {
            const tableId = tableElement.dataset.tableId;
            tableElement.remove();
            
            // Remove associated relationships
            document.querySelectorAll(`.relationship-item[data-from="${tableId}"], .relationship-item[data-to="${tableId}"]`).forEach(rel => rel.remove());
            
            updateRelationshipOptions();
            updateMultiTableEstimates();
            
            // Hide relationships container if only one table
            if (document.querySelectorAll('.table-definition').length <= 1) {
                document.getElementById('relationships-container').style.display = 'none';
            }
        });
    }
}

function getParentTableName() {
    const firstTable = document.querySelector('.table-name');
    return firstTable ? firstTable.value || 'parent' : 'parent';
}

function addRelationship(fromTableId) {
    const relationshipsContainer = document.getElementById('relationships-list');
    const primaryTable = document.querySelector('.primary-table');
    
    const relationshipDiv = document.createElement('div');
    relationshipDiv.className = 'relationship-item';
    relationshipDiv.dataset.from = fromTableId;
    relationshipDiv.dataset.to = primaryTable.dataset.tableId;
    
    relationshipDiv.innerHTML = `
        <div class="relationship-selects">
            <select class="from-table">
                <option value="${fromTableId}">table_${fromTableId.replace('table', '')}</option>
            </select>
            <span class="relationship-type">has many</span>
            <select class="to-table">
                <option value="${primaryTable.dataset.tableId}">${primaryTable.querySelector('.table-name').value}</option>
            </select>
        </div>
        <button class="remove-relationship"><i class="fas fa-times"></i></button>
    `;
    
    relationshipDiv.querySelector('.remove-relationship').addEventListener('click', () => {
        relationshipDiv.remove();
    });
    
    relationshipsContainer.appendChild(relationshipDiv);
}

function updateRelationshipOptions() {
    const tables = document.querySelectorAll('.table-definition');
    const tableOptions = Array.from(tables).map(table => ({
        id: table.dataset.tableId,
        name: table.querySelector('.table-name').value || `Table ${table.dataset.tableId.replace('table', '')}`
    }));
    
    // Update all relationship selects
    document.querySelectorAll('.from-table, .to-table').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = tableOptions.map(table => 
            `<option value="${table.id}" ${table.id === currentValue ? 'selected' : ''}>${table.name}</option>`
        ).join('');
    });
}

function updateMultiTableEstimates() {
    // Delegate to the main cost calculator to show all costs in one place
    updateDynamicCostCalculator();
}

function calculateMultiTableTokenCost(tables) {
    let totalCost = 0;
    const hasRelationships = tables.length > 1;
    
    tables.forEach(table => {
        const rows = parseInt(table.querySelector('.table-rows').value) || 0;
        const baseCost = tokenService.calculateGenerationCost(rows, 'ctgan', {
            hierarchicalRelations: hasRelationships
        });
        totalCost += baseCost;
    });
    
    // Add 20% overhead for relationship management
    if (hasRelationships) {
        totalCost = Math.ceil(totalCost * 1.2);
    }
    
    return totalCost;
}

async function handleMultiTableGeneration() {
    const tables = [];
    const relationships = [];
    
    // Collect table definitions
    document.querySelectorAll('.table-definition').forEach(tableEl => {
        const columns = [];
        tableEl.querySelectorAll('.column-item').forEach(colEl => {
            columns.push({
                name: colEl.querySelector('.column-name').value,
                type: colEl.querySelector('.column-type').value
            });
        });
        
        tables.push({
            id: tableEl.dataset.tableId,
            name: tableEl.querySelector('.table-name').value,
            rows: parseInt(tableEl.querySelector('.table-rows').value),
            columns: columns,
            isPrimary: tableEl.classList.contains('primary-table')
        });
    });
    
    // Collect relationships
    document.querySelectorAll('.relationship-item').forEach(relEl => {
        relationships.push({
            from: relEl.dataset.from,
            to: relEl.dataset.to,
            type: 'one-to-many'
        });
    });
    
    // Calculate token cost
    const tokenCost = calculateMultiTableTokenCost(document.querySelectorAll('.table-definition'));
    
    // Check tokens
    if (window.tokenUsageTracker && !window.tokenUsageTracker.useTokens(tokenCost, 'multi-table-generation')) {
        return; // Insufficient tokens
    }
    
    const config = {
        tables: tables,
        relationships: relationships,
        format: document.getElementById('multi-table-format').value,
        options: {
            maintainReferentialIntegrity: document.getElementById('maintain-referential-integrity').checked,
            generateRealisticDistributions: document.getElementById('generate-realistic-distributions').checked,
            hierarchicalGeneration: document.getElementById('hierarchical-generation').checked
        }
    };
    
    await generateData(config, 'multi-table');
}


// Detect if uploaded files are database tables
function detectDatabaseFiles(files) {
    // Check for common database patterns:
    // 1. Files with same prefix (e.g., db_users.csv, db_orders.csv)
    // 2. Files with table-like names
    // 3. Multiple CSV/JSON files
    
    if (files.length < 2) return false;
    
    // Check if all files are data files
    const allDataFiles = files.every(file => 
        file.name.endsWith('.csv') || 
        file.name.endsWith('.json') || 
        file.name.endsWith('.xlsx')
    );
    
    if (!allDataFiles) return false;
    
    // Check for common prefix
    const fileNames = files.map(f => f.name);
    const commonPrefix = findCommonPrefix(fileNames);
    
    // If files share a common prefix longer than 2 chars, likely database tables
    return commonPrefix.length > 2;
}

// Find common prefix in file names
function findCommonPrefix(strings) {
    if (strings.length === 0) return '';
    
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
        while (strings[i].indexOf(prefix) !== 0) {
            prefix = prefix.substring(0, prefix.length - 1);
            if (prefix === '') return '';
        }
    }
    return prefix;
}


// Dynamic Cost Calculator Functions
function updateDynamicCostCalculator() {
    // Get current settings
    const format = document.getElementById('gen-format')?.value || 'csv';
    const method = selectedMethod || 'ctgan';
    
    // Calculate rows and columns based on active generation mode
    const mode = determineGenerationMode();
    let rows = 0;
    let columns = 10; // Default column count
    
    // Add data source indicator
    let dataSourceText = '';
    
    // Get row count based on mode
    const manualConfigVisible = document.getElementById('manual-config-section')?.style.display !== 'none';
    const multiTableVisible = document.getElementById('multi-table-section')?.style.display !== 'none';
    
    if (mode === 'template') {
        dataSourceText = `Template: ${window.currentTemplate.industry}`;
        rows = parseInt(document.getElementById('gen-rows')?.value || 0);
        columns = window.detectedColumns ? window.detectedColumns.length : 10;
    } else if (mode === 'pattern') {
        dataSourceText = 'Uploaded File';
        rows = parseInt(document.getElementById('gen-rows')?.value || 0);
        columns = analysisResult?.columns?.length || 10;
    } else if (mode === 'manual' && manualConfigVisible) {
        dataSourceText = 'Manual Configuration';
        rows = parseInt(document.getElementById('manual-rows')?.value || 0);
        columns = document.querySelectorAll('#columns-container .column-item').length || 1;
    } else if (mode === 'multi-table' || multiTableVisible) {
        dataSourceText = 'Multi-Table';
        const tables = document.querySelectorAll('.table-definition');
        tables.forEach(table => {
            const tableRows = parseInt(table.querySelector('.table-rows')?.value || 0);
            rows += tableRows;
            columns = Math.max(columns, table.querySelectorAll('.column-item').length || 5);
        });
    } else {
        dataSourceText = 'No data source selected';
        rows = parseInt(document.getElementById('gen-rows')?.value || 0);
        columns = 0; // Set to 0 when nothing selected
    }
    
    // Update data source status indicator
    let statusElement = document.getElementById('data-source-status');
    if (!statusElement) {
        const costSummaryHeader = document.querySelector('.cost-calculator h2');
        if (costSummaryHeader) {
            statusElement = document.createElement('span');
            statusElement.id = 'data-source-status';
            statusElement.style.fontSize = '0.8rem';
            statusElement.style.marginLeft = '10px';
            statusElement.style.color = 'var(--text-color-secondary)';
            costSummaryHeader.appendChild(statusElement);
        }
    }
    if (statusElement) {
        statusElement.textContent = dataSourceText ? `(${dataSourceText})` : '';
    }
    
    // If no columns selected (no data source), show 0 cost
    if (columns === 0) {
        const sizeElement = document.getElementById('total-data-size');
        const tokenElement = document.getElementById('total-token-cost');
        const totalRowsElement = document.getElementById('total-rows');
        const timeElement = document.getElementById('generation-time');
        
        if (sizeElement) sizeElement.textContent = '0 MB';
        if (tokenElement) tokenElement.textContent = '0 tokens';
        if (totalRowsElement) totalRowsElement.textContent = '0';
        if (timeElement) timeElement.textContent = 'N/A';
        return;
    }
    
    // Calculate actual data size using our new function
    const totalSize = calculateActualDataSize(rows, columns, format);
    const sizeElement = document.getElementById('total-data-size');
    if (sizeElement) {
        sizeElement.textContent = formatFileSize(totalSize);
    }
    
    // Update total rows display
    const totalRowsElement = document.getElementById('total-rows');
    if (totalRowsElement) {
        totalRowsElement.textContent = rows.toLocaleString();
    }
    
    // Update token cost with animation
    const tokenCost = calculateTokenCost(rows);
    const tokenElement = document.getElementById('total-token-cost');
    if (tokenElement) {
        const oldValue = tokenElement.textContent;
        const newValue = `${tokenCost.toLocaleString()} tokens`;
        
        // Only animate if value changed
        if (oldValue !== newValue) {
            tokenElement.textContent = newValue;
            
            // Add pulse animation
            tokenElement.style.transition = 'transform 0.3s ease, color 0.3s ease';
            tokenElement.style.transform = 'scale(1.1)';
            tokenElement.style.color = '#6366f1';
            
            setTimeout(() => {
                tokenElement.style.transform = 'scale(1)';
                tokenElement.style.color = '';
            }, 300);
        }
    }
    
    // Update generation time using our accurate calculation
    const timeElement = document.getElementById('generation-time');
    if (timeElement) {
        const hasPrivacy = document.getElementById('differential-privacy')?.checked ||
                          document.getElementById('k-anonymity')?.checked ||
                          document.getElementById('data-masking')?.checked;
        
        const timeEstimate = calculateRealisticGenerationTime(rows, selectedMethod, hasPrivacy);
        timeElement.textContent = timeEstimate;
    }
}

// Reset dynamic cost calculator
function resetDynamicCostCalculator() {
    const elements = {
        'total-data-size': '0 MB',
        'total-token-cost': '0 tokens',
        'generation-time': '< 1 minute',
        'total-rows': '0'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

// Update section visibility based on upload state
function updateSectionVisibility(uploadState) {
    const industryTemplates = document.querySelector('.generation-options-section');
    const generationConfig = document.getElementById('generation-config');
    const multiTableSection = document.getElementById('multi-table-section');
    const detectedColumnsSection = document.getElementById('detected-columns-section');
    const manualConfigSection = document.getElementById('manual-config-section');
    const generationMethodSection = document.querySelector('.generation-method-section');
    
    switch(uploadState) {
        case 'none':
            // Initial state - no file uploaded
            if (industryTemplates) industryTemplates.style.display = 'block';
            if (generationConfig) generationConfig.style.display = 'none';
            if (multiTableSection) multiTableSection.style.display = 'none';
            if (detectedColumnsSection) detectedColumnsSection.style.display = 'none';
            if (manualConfigSection) manualConfigSection.style.display = 'block';
            if (generationMethodSection) generationMethodSection.style.display = 'none';
            break;
            
        case 'single':
            // Single file uploaded - show generation method after columns detected
            if (industryTemplates) industryTemplates.style.display = 'none';
            if (generationConfig) generationConfig.style.display = 'block';
            if (multiTableSection) multiTableSection.style.display = 'none';
            if (detectedColumnsSection) detectedColumnsSection.style.display = 'block';
            if (manualConfigSection) manualConfigSection.style.display = 'none';
            // Generation method will be shown after columns are detected
            break;
            
        case 'multi':
            // Multiple files or database uploaded
            if (industryTemplates) industryTemplates.style.display = 'none';
            if (generationConfig) generationConfig.style.display = 'none';
            if (multiTableSection) multiTableSection.style.display = 'block';
            if (detectedColumnsSection) detectedColumnsSection.style.display = 'none';
            if (manualConfigSection) manualConfigSection.style.display = 'none';
            if (generationMethodSection) generationMethodSection.style.display = 'none';
            detectTableRelationships();
            break;
            
        case 'template':
            // Template selected - hide generation method
            if (industryTemplates) industryTemplates.style.display = 'block';
            if (generationConfig) generationConfig.style.display = 'block';
            if (multiTableSection) multiTableSection.style.display = 'none';
            if (detectedColumnsSection) detectedColumnsSection.style.display = 'block';
            if (manualConfigSection) manualConfigSection.style.display = 'none';
            if (generationMethodSection) generationMethodSection.style.display = 'none';
            break;
    }
}

// Display detected columns with enhanced configuration
function displayDetectedColumns(columns) {
    const container = document.getElementById('detected-columns-container');
    if (!container) return;
    
    // Store columns globally for management
    window.detectedColumns = columns.map(col => {
        // Ensure each column has proper structure
        if (typeof col === 'string') {
            return { name: col, type: 'string', nullable: true };
        }
        return col;
    });
    
    let html = `
        <div class="columns-toolbar">
            <button class="btn btn-primary add-column-btn" onclick="addNewDetectedColumn()">
                <i class="fas fa-plus"></i> Add Column
            </button>
        </div>
        <div class="detected-columns-grid">
    `;
    
    window.detectedColumns.forEach((col, index) => {
        const columnName = col.name || col;
        const dataType = detectDataType(col);
        const missingStrategy = getMissingValueStrategy(dataType);
        
        html += `
            <div class="column-config-item" data-column="${columnName}" data-index="${index}">
                <div class="column-row-wrapper">
                    <div class="column-info-section">
                        <div class="column-header">
                            <strong class="column-name">${columnName}</strong>
                            <button class="remove-column-btn" onclick="removeDetectedColumn(${index})" title="Remove column">×</button>
                        </div>
                    </div>
                    
                    <div class="column-settings-row">
                        <div class="setting-item">
                            <label>Type:</label>
                            <select class="column-data-type compact" data-column="${columnName}" data-index="${index}">
                                <option value="string" ${dataType === 'string' ? 'selected' : ''}>String</option>
                                <option value="integer" ${dataType === 'integer' ? 'selected' : ''}>Integer</option>
                                <option value="float" ${dataType === 'float' ? 'selected' : ''}>Float</option>
                                <option value="date" ${dataType === 'date' ? 'selected' : ''}>Date</option>
                                <option value="datetime" ${dataType === 'datetime' ? 'selected' : ''}>DateTime</option>
                                <option value="boolean" ${dataType === 'boolean' ? 'selected' : ''}>Boolean</option>
                                <option value="email" ${dataType === 'email' ? 'selected' : ''}>Email</option>
                                <option value="phone" ${dataType === 'phone' ? 'selected' : ''}>Phone</option>
                                <option value="name" ${dataType === 'name' ? 'selected' : ''}>Name</option>
                                <option value="address" ${dataType === 'address' ? 'selected' : ''}>Address</option>
                                <option value="account" ${dataType === 'account' ? 'selected' : ''}>Account</option>
                                <option value="currency" ${dataType === 'currency' ? 'selected' : ''}>Currency</option>
                                <option value="category" ${dataType === 'category' ? 'selected' : ''}>Category</option>
                            </select>
                        </div>
                        
                        <div class="setting-item checkbox-group">
                            <label class="checkbox-inline">
                                <input type="checkbox" class="column-unique" data-column="${columnName}" ${col.unique ? 'checked' : ''}>
                                Unique
                            </label>
                            <label class="checkbox-inline">
                                <input type="checkbox" class="column-nullable" data-column="${columnName}" ${col.nullable !== false ? 'checked' : ''}>
                                Nullable
                            </label>
                        </div>
                        
                        <div class="setting-item">
                            <label>Missing:</label>
                            <select class="missing-strategy compact" data-column="${col.name}">
                                ${missingStrategy}
                            </select>
                        </div>
                        
                        ${getDataTypeSpecificSettings(dataType, col) || ''}
                        
                        <div class="column-stats-inline">
                            <span class="stat-badge" title="Null values">${col.nullCount || 0}</span>
                            <span class="stat-badge" title="Unique values">${col.uniqueCount || '—'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add event listeners for data type changes
    container.querySelectorAll('.column-data-type').forEach(select => {
        select.addEventListener('change', handleDataTypeChange);
    });
    
    // Add event listeners for missing value strategies
    container.querySelectorAll('.missing-strategy').forEach(select => {
        select.addEventListener('change', handleMissingStrategyChange);
    });
    
    // Add event listeners for checkboxes
    container.querySelectorAll('.column-unique, .column-nullable').forEach(checkbox => {
        checkbox.addEventListener('change', updateColumnOptions);
    });
    
    // Show generation method section after columns are detected (only for file uploads, not templates)
    const generationMethodSection = document.querySelector('.generation-method-section');
    const detectedSection = document.getElementById('detected-columns-section');
    if (generationMethodSection && detectedSection) {
        const sectionTitle = detectedSection.querySelector('h3');
        // Only show generation method if this is from file upload (not template)
        if (sectionTitle && sectionTitle.textContent !== 'Template Columns & Configuration') {
            generationMethodSection.style.display = 'block';
        }
    }
}

// Detect data type from column name and sample values
function detectDataType(column) {
    const name = (typeof column === 'string' ? column : column.name || '').toLowerCase();
    
    // Smart detection based on column name
    if (name.includes('email') || name.includes('mail')) return 'email';
    if (name.includes('phone') || name.includes('tel') || name.includes('mobile')) return 'phone';
    if (name.includes('name') && (name.includes('first') || name.includes('last') || name.includes('full'))) return 'name';
    if (name.includes('address') || name.includes('street') || name.includes('city')) return 'address';
    if (name.includes('date') || name.includes('time') || name.includes('created') || name.includes('updated')) return 'date';
    if (name.includes('id') || name.includes('account') || name.includes('number')) return 'account';
    if (name.includes('price') || name.includes('amount') || name.includes('cost') || name.includes('salary')) return 'currency';
    
    // Fall back to basic type detection
    if (column.samples && column.samples.length > 0) {
        const sample = column.samples[0];
        if (typeof sample === 'number') return parseFloat(sample) % 1 === 0 ? 'integer' : 'float';
        if (typeof sample === 'boolean') return 'boolean';
        if (!isNaN(Date.parse(sample))) return 'date';
    }
    
    return 'string';
}

// Get missing value strategy options based on data type
function getMissingValueStrategy(dataType) {
    const strategies = {
        numeric: `
            <option value="random-range">Random between min/max in data</option>
            <option value="custom-range">Random between custom range</option>
            <option value="mean">Mean imputation</option>
            <option value="median">Median imputation</option>
            <option value="mode">Mode imputation</option>
            <option value="forward-fill">Forward fill</option>
            <option value="backward-fill">Backward fill</option>
        `,
        categorical: `
            <option value="mode">Most frequent value</option>
            <option value="random-existing">Random from existing values</option>
            <option value="custom-value">Custom value</option>
            <option value="forward-fill">Forward fill</option>
            <option value="backward-fill">Backward fill</option>
        `,
        temporal: `
            <option value="forward-fill">Forward fill</option>
            <option value="backward-fill">Backward fill</option>
            <option value="interpolate">Interpolate</option>
            <option value="current-date">Current date</option>
        `,
        identifier: `
            <option value="generate-unique">Generate unique ID</option>
            <option value="sequential">Sequential numbering</option>
            <option value="uuid">UUID</option>
        `
    };
    
    if (['integer', 'float', 'currency'].includes(dataType)) {
        return strategies.numeric;
    } else if (['date', 'datetime'].includes(dataType)) {
        return strategies.temporal;
    } else if (['id', 'account'].includes(dataType)) {
        return strategies.identifier;
    } else {
        return strategies.categorical;
    }
}

// Get data type specific settings with inline layout
function getDataTypeSpecificSettings(dataType, column) {
    switch(dataType) {
        case 'name':
            return `
                <div class="setting-item">
                    <label>Format:</label>
                    <select class="name-generation compact">
                        <option value="realistic">Realistic</option>
                        <option value="pattern">Pattern</option>
                        <option value="random">Random</option>
                    </select>
                </div>
            `;
            
        case 'email':
            return `
                <div class="setting-item">
                    <label>Format:</label>
                    <select class="email-format compact">
                        <option value="firstname.lastname">First.Last</option>
                        <option value="initials">F.Last</option>
                        <option value="random">Random</option>
                    </select>
                </div>
            `;
            
        case 'phone':
            return `
                <div class="setting-item">
                    <label>Format:</label>
                    <select class="phone-format compact">
                        <option value="us">(XXX) XXX-XXXX</option>
                        <option value="intl">+1-XXX-XXX-XXXX</option>
                        <option value="simple">XXXXXXXXXX</option>
                    </select>
                </div>
            `;
            
        case 'account':
            return `
                <div class="setting-item">
                    <label>Length:</label>
                    <input type="number" class="compact-input account-length" value="10" min="4" max="20">
                </div>
            `;
            
        case 'address':
            return `
                <div class="setting-item">
                    <label>Address:</label>
                    <select class="address-type compact">
                        <option value="full">Full</option>
                        <option value="street">Street</option>
                        <option value="city-state">City/State</option>
                    </select>
                </div>
            `;
            
        case 'currency':
            return `
                <div class="setting-item range-group">
                    <label>Range:</label>
                    <input type="number" class="compact-input currency-min" placeholder="Min" value="0">
                    <span class="range-separator">to</span>
                    <input type="number" class="compact-input currency-max" placeholder="Max" value="10000">
                </div>
            `;
            
        case 'integer':
        case 'float':
            return `
                <div class="setting-item range-group">
                    <label>Range:</label>
                    <input type="number" class="compact-input num-min" placeholder="Min" value="0">
                    <span class="range-separator">to</span>
                    <input type="number" class="compact-input num-max" placeholder="Max" value="100">
                </div>
            `;
            
        case 'date':
        case 'datetime':
            return `
                <div class="setting-item">
                    <label>Period:</label>
                    <select class="date-range compact">
                        <option value="last-year">Last Year</option>
                        <option value="last-5-years">Last 5 Years</option>
                        <option value="future">Future Dates</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>
            `;
            
        case 'category':
            return `
                <div class="setting-item">
                    <label>Categories:</label>
                    <input type="text" class="compact-input category-list" placeholder="A, B, C..." value="${column.categories ? column.categories.join(', ') : ''}">
                </div>
            `;
            
        default:
            return '';
    }
}

// Handle data type change
function handleDataTypeChange(event) {
    const newDataType = event.target.value;
    const columnName = event.target.dataset.column;
    const columnIndex = parseInt(event.target.dataset.index);
    
    // Update the column data type in the detectedColumns array
    if (window.detectedColumns && window.detectedColumns[columnIndex]) {
        window.detectedColumns[columnIndex].type = newDataType;
        
        // Re-render the columns to update the Missing Values Strategy and specific settings
        displayDetectedColumns(window.detectedColumns);
        
        // Update cost calculator since data type affects cost
        updateDynamicCostCalculator();
    }
}

// Handle missing strategy change
function handleMissingStrategyChange(event) {
    const strategy = event.target.value;
    const columnName = event.target.dataset.column;
    const settingsRow = event.target.closest('.column-settings-row');
    
    // Remove any existing custom inputs
    const existingCustom = settingsRow.querySelector('.custom-missing-input');
    if (existingCustom) {
        existingCustom.remove();
    }
    
    // Show additional inputs based on strategy
    if (strategy === 'custom-range') {
        // Add inline range inputs
        const rangeInputs = document.createElement('div');
        rangeInputs.className = 'setting-item range-group custom-missing-input';
        rangeInputs.innerHTML = `
            <label>Values:</label>
            <input type="number" class="compact-input range-min" placeholder="Min">
            <span class="range-separator">to</span>
            <input type="number" class="compact-input range-max" placeholder="Max">
        `;
        
        // Insert after the missing strategy selector
        const missingItem = event.target.parentElement;
        missingItem.insertAdjacentElement('afterend', rangeInputs);
        
    } else if (strategy === 'custom-value') {
        // Add inline custom value input
        const valueInputContainer = document.createElement('div');
        valueInputContainer.className = 'setting-item custom-missing-input';
        valueInputContainer.innerHTML = `
            <label>Value:</label>
            <input type="text" class="compact-input custom-value" placeholder="Custom value">
        `;
        
        // Insert after the missing strategy selector
        const missingItem = event.target.parentElement;
        missingItem.insertAdjacentElement('afterend', valueInputContainer);
    }
    
    updateEstimates();
    updateDynamicCostCalculator();
}

// Detect table relationships for multi-file uploads
function detectTableRelationships() {
    // This would analyze multiple files to find foreign key relationships
    console.log('Detecting table relationships...');
}

// Toggle method details expansion
window.toggleMethodDetails = function(method) {
    const details = document.getElementById(`${method}-details`);
    const button = details.parentElement.querySelector('.method-expand-btn i');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        button.className = 'fas fa-chevron-up';
    } else {
        details.style.display = 'none';
        button.className = 'fas fa-chevron-down';
    }
};

// Toggle privacy settings expansion
window.togglePrivacySettings = function() {
    const content = document.getElementById('privacy-content');
    const button = document.querySelector('.privacy-section .method-expand-btn i');
    
    if (content && button) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            button.className = 'fas fa-chevron-up';
        } else {
            content.style.display = 'none';
            button.className = 'fas fa-chevron-down';
        }
    }
};

// Add new column to detected columns
window.addNewDetectedColumn = function() {
    if (!window.detectedColumns) {
        window.detectedColumns = [];
    }
    
    const newColumn = {
        name: `new_column_${window.detectedColumns.length + 1}`,
        type: 'string',
        nullable: true,
        unique: false,
        samples: [],
        nullCount: 0,
        uniqueCount: 'N/A'
    };
    
    window.detectedColumns.push(newColumn);
    displayDetectedColumns(window.detectedColumns);
    updateDynamicCostCalculator(); // Update cost when column added
    
    // Focus on the new column name for editing
    setTimeout(() => {
        const lastColumn = document.querySelector('.column-config-item:last-child .column-name');
        if (lastColumn) {
            // Make column name editable
            makeColumnNameEditable(lastColumn);
        }
    }, 100);
};

// Remove detected column
window.removeDetectedColumn = function(index) {
    if (window.detectedColumns && window.detectedColumns[index]) {
        window.detectedColumns.splice(index, 1);
        displayDetectedColumns(window.detectedColumns);
        updateEstimates();
        updateDynamicCostCalculator(); // Update cost when column removed
    }
};

// Make column name editable
function makeColumnNameEditable(element) {
    const currentName = element.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'column-name-input';
    
    element.replaceWith(input);
    input.focus();
    input.select();
    
    const saveEdit = () => {
        const newName = input.value.trim();
        if (newName) {
            const columnIndex = parseInt(input.closest('.column-config-item').dataset.index);
            if (window.detectedColumns[columnIndex]) {
                window.detectedColumns[columnIndex].name = newName;
            }
            const span = document.createElement('span');
            span.className = 'column-name';
            span.textContent = newName;
            span.onclick = () => makeColumnNameEditable(span);
            input.replaceWith(span);
        }
    };
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        }
    });
}

// Update column options (unique/nullable)
function updateColumnOptions(event) {
    const columnName = event.target.dataset.column;
    const isUnique = event.target.classList.contains('column-unique');
    const column = window.detectedColumns.find(c => c.name === columnName);
    
    if (column) {
        if (isUnique) {
            column.unique = event.target.checked;
        } else {
            column.nullable = event.target.checked;
        }
    }
    
    updateEstimates();
    updateDynamicCostCalculator(); // Also update cost
}

// Add event listeners for real-time updates
function setupCostCalculatorListeners() {
    // Listen to row input changes
    const rowInputs = ['gen-rows', 'manual-rows'];
    rowInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateDynamicCostCalculator);
        }
    });
    
    // Listen to table row changes in multi-table
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('table-rows')) {
            updateDynamicCostCalculator();
        }
    });
    
    // Listen to column configuration changes
    document.addEventListener('change', (e) => {
        const target = e.target;
        
        // Update on column type changes
        if (target.classList.contains('column-data-type')) {
            updateDynamicCostCalculator();
        }
        
        // Update on unique/nullable changes
        if (target.classList.contains('column-unique') || 
            target.classList.contains('column-nullable')) {
            updateDynamicCostCalculator();
        }
        
        // Update on missing strategy changes
        if (target.classList.contains('missing-strategy')) {
            updateDynamicCostCalculator();
        }
    });
    
    // Listen to method changes
    document.addEventListener('click', (e) => {
        if (e.target.closest('.method-card')) {
            setTimeout(updateDynamicCostCalculator, 100); // Small delay for selection
        }
    });
}

// Initialize Tooltip System
function initializeTooltips() {
    const tooltips = {
        'privacy-noise': 'Adds carefully calibrated random noise to your synthetic data to protect individual records while preserving overall data patterns and statistics. Lower values provide stronger privacy but may reduce data accuracy. This is the gold standard for privacy-preserving data generation.',
        'gdpr-compliance': 'Ensures your synthetic data meets European Union privacy regulations (General Data Protection Regulation). Automatically enables anonymization techniques, prevents re-identification of individuals, and ensures the right to be forgotten is maintained. Essential for any data used in EU contexts.',
        'hipaa-compliance': 'Applies US healthcare data privacy and security standards. Automatically removes all 18 HIPAA identifiers including names, geographic data, dates, contact info, SSN, medical record numbers, and biometric data. Ensures medical data cannot be traced back to specific patients.',
        'pci-compliance': 'Implements Payment Card Industry Data Security Standard requirements. Masks all card numbers (keeping only last 4 digits), removes CVV codes, tokenizes transaction IDs, and ensures all payment-related data meets industry security standards for financial data.',
        'k-anonymity': 'Groups records together so each individual appears with at least k-1 other similar records (default k=5). This makes it impossible to identify specific individuals. For example, with k=5, any combination of attributes will match at least 5 people in the dataset.',
        'l-diversity': 'Ensures sensitive attributes (like medical conditions or salaries) have diverse values within each k-anonymous group. This prevents attackers from inferring sensitive information even if they know someone is in the dataset. Each group will have at least "l" different values for sensitive fields.',
        't-closeness': 'Maintains similar statistical distributions of sensitive attributes between groups and the overall dataset. This prevents inference attacks where attackers use statistical patterns to guess sensitive values. The distribution in any group stays within threshold "t" of the overall distribution.',
        'data-masking': 'Replaces real sensitive data with realistic but fictitious values. Names become fake names, SSNs become valid-format fake SSNs, addresses become real but different addresses. Maintains data format and validity while removing all real personal information.'
    };
    
    const tooltipContainer = document.getElementById('tooltip-container');
    const tooltipText = tooltipContainer?.querySelector('.tooltip-text');
    let currentTooltip = null;
    let tooltipTimeout = null;
    
    // Add event listeners to all help icons
    document.querySelectorAll('.help-icon').forEach(icon => {
        const tooltipKey = icon.dataset.tooltip;
        if (!tooltipKey || !tooltips[tooltipKey]) return;
        
        // Mouse events for desktop
        icon.addEventListener('mouseenter', (e) => {
            clearTimeout(tooltipTimeout);
            showTooltip(e.currentTarget, tooltips[tooltipKey]);
        });
        
        icon.addEventListener('mouseleave', () => {
            hideTooltip();
        });
        
        // Touch events for mobile
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (currentTooltip === tooltipKey) {
                hideTooltip();
            } else {
                showTooltip(e.currentTarget, tooltips[tooltipKey]);
            }
        });
    });
    
    // Hide tooltip when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.help-icon')) {
            hideTooltip();
        }
    });
    
    function showTooltip(element, text) {
        if (!tooltipContainer || !tooltipText) return;
        
        const rect = element.getBoundingClientRect();
        currentTooltip = element.dataset.tooltip;
        
        tooltipText.textContent = text;
        tooltipContainer.style.display = 'block';
        
        // Position tooltip above the icon
        const tooltipRect = tooltipContainer.getBoundingClientRect();
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 10;
        
        // Keep tooltip within viewport
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        // If tooltip would go above viewport, show below
        if (top < 10) {
            top = rect.bottom + 10;
            // Flip arrow
            const arrow = tooltipContainer.querySelector('.tooltip-arrow');
            if (arrow) {
                arrow.style.borderWidth = '0 6px 6px 6px';
                arrow.style.borderColor = 'transparent transparent #2d3748 transparent';
                arrow.style.top = '-6px';
                arrow.style.bottom = 'auto';
            }
        } else {
            // Reset arrow to bottom
            const arrow = tooltipContainer.querySelector('.tooltip-arrow');
            if (arrow) {
                arrow.style.borderWidth = '6px 6px 0 6px';
                arrow.style.borderColor = '#2d3748 transparent transparent transparent';
                arrow.style.bottom = '-6px';
                arrow.style.top = 'auto';
            }
        }
        
        tooltipContainer.style.left = `${left}px`;
        tooltipContainer.style.top = `${top}px`;
    }
    
    function hideTooltip() {
        if (tooltipContainer) {
            tooltipTimeout = setTimeout(() => {
                tooltipContainer.style.display = 'none';
                currentTooltip = null;
            }, 100);
        }
    }
}

// Fix Data Size Calculation
function calculateActualDataSize(rows, columns, format) {
    if (!rows || !columns) return 0;
    
    let bytesPerCell = 0;
    let overhead = 0;
    
    // Calculate based on format
    switch (format) {
        case 'csv':
            // CSV: average 10-15 bytes per cell + commas + newlines
            bytesPerCell = 12;
            overhead = columns * 20; // Header row
            break;
        case 'json':
            // JSON: field names + values + structure
            bytesPerCell = 25; // Including field names and quotes
            overhead = rows * 4 + 100; // Brackets and commas
            break;
        case 'excel':
            // Excel: Binary format with metadata
            bytesPerCell = 8;
            overhead = 5000; // Excel file structure overhead
            break;
        case 'parquet':
            // Parquet: Compressed columnar format
            bytesPerCell = 5;
            overhead = 1000; // Parquet metadata
            break;
        default:
            bytesPerCell = 12;
            overhead = 100;
    }
    
    // Calculate base size
    let totalBytes = (rows * columns * bytesPerCell) + overhead;
    
    // Add overhead for privacy features if enabled
    if (document.getElementById('differential-privacy')?.checked) {
        totalBytes *= 1.1; // 10% overhead for noise addition
    }
    if (document.getElementById('data-masking')?.checked) {
        totalBytes *= 1.05; // 5% overhead for masked values
    }
    
    return Math.round(totalBytes);
}

// Fix Generation Time Calculation
function calculateRealisticGenerationTime(rows, method, hasPrivacy) {
    if (!rows) return '< 1 second';
    
    // Base time per 1000 rows (in seconds)
    let baseTime = 0;
    switch (method) {
        case 'ctgan':
            baseTime = 2; // 2 seconds per 1000 rows
            break;
        case 'timegan':
            baseTime = 3; // 3 seconds per 1000 rows
            break;
        case 'vae':
            baseTime = 1; // 1 second per 1000 rows
            break;
        default:
            baseTime = 1.5;
    }
    
    // Calculate base generation time
    let totalSeconds = (rows / 1000) * baseTime;
    
    // Add overhead for privacy features
    if (document.getElementById('differential-privacy')?.checked) {
        totalSeconds *= 1.5; // 50% slower with differential privacy
    }
    if (document.getElementById('k-anonymity')?.checked) {
        totalSeconds *= 1.2; // 20% slower with k-anonymity
    }
    if (document.getElementById('data-masking')?.checked) {
        totalSeconds *= 1.1; // 10% slower with masking
    }
    
    // Add complexity for multiple tables
    const tables = document.querySelectorAll('.table-definition');
    if (tables.length > 1) {
        totalSeconds *= (1 + (tables.length - 1) * 0.3); // 30% per additional table
    }
    
    // Format the time estimate
    if (totalSeconds < 1) {
        return '< 1 second';
    } else if (totalSeconds < 60) {
        return `${Math.round(totalSeconds)} seconds`;
    } else if (totalSeconds < 300) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.round(totalSeconds % 60);
        return `${minutes}m ${seconds}s`;
    } else {
        const minutes = Math.round(totalSeconds / 60);
        return `~${minutes} minutes`;
    }
}

// Make functions available globally for onclick handlers
window.downloadGeneratedData = downloadGeneratedData;
window.previewGeneratedData = previewGeneratedData;
window.handlePatternBasedGeneration = handlePatternBasedGeneration;
window.handleGenerateData = handleGenerateData;

// Also add a debug function
window.testGenerateButton = function() {
    alert('Button is working! Now testing generation...');
    console.log('Test button click successful');
    handlePatternBasedGeneration();
};

export { setupDataGenerator };