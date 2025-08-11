import { fetchAuthenticatedData } from '../services/api.js';
import tokenService from '../services/token_service.js';

let currentFile = null;
let analysisResult = null;
let generationHistory = [];
let selectedMethod = 'ctgan'; // Default generation method

async function setupDataGenerator() {
    console.log('Setting up advanced data generator...');
    
    // Load IndustryTemplateSelector
    await loadIndustryTemplateSelector();
    
    // Initialize all components
    setupTabNavigation();
    setupFileUpload();
    setupGenerationMethods();
    setupPrivacySettings();
    setupManualConfiguration();
    setupMultiTableGeneration();
    setupHistoryTab();
    loadGenerationHistory();
    updateMethodAvailability();
    updateRowLimits();
    
    // Set up event listeners for generation buttons
    const generateFromPatternBtn = document.getElementById('generate-from-pattern');
    const generateManualBtn = document.getElementById('generate-manual');
    const generateMultiTableBtn = document.getElementById('generate-multi-table');
    
    if (generateFromPatternBtn) {
        generateFromPatternBtn.addEventListener('click', handlePatternBasedGeneration);
    }
    
    if (generateManualBtn) {
        generateManualBtn.addEventListener('click', handleManualGeneration);
    }
    
    if (generateMultiTableBtn) {
        generateMultiTableBtn.addEventListener('click', handleMultiTableGeneration);
    }
    
    // Update estimates on input change
    setupEstimateUpdates();
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

// Tab Navigation
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Update active states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// File Upload Functionality
function setupFileUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const browseButton = uploadArea?.querySelector('.browse-button');
    
    if (!uploadArea || !fileInput) return;
    
    // Browse button click
    browseButton?.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // Remove file button
    const removeFileBtn = document.querySelector('.remove-file');
    removeFileBtn?.addEventListener('click', clearFile);
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Handle file processing
async function handleFile(file) {
    const validTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel', 
                       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|json|xlsx|xls)$/i)) {
        alert('Please upload a CSV, JSON, or Excel file.');
        return;
    }
    
    currentFile = file;
    displayFileInfo(file);
    await analyzeFile(file);
}

// Display file information
function displayFileInfo(file) {
    const filePreview = document.getElementById('file-preview');
    const fileName = filePreview.querySelector('.file-name');
    const fileSize = filePreview.querySelector('.file-size');
    const fileIcon = filePreview.querySelector('.file-icon');
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    // Update icon based on file type
    if (file.name.endsWith('.csv')) {
        fileIcon.className = 'fas fa-file-csv file-icon';
    } else if (file.name.endsWith('.json')) {
        fileIcon.className = 'fas fa-file-code file-icon';
    } else if (file.name.match(/\.(xlsx|xls)$/)) {
        fileIcon.className = 'fas fa-file-excel file-icon';
    }
    
    filePreview.style.display = 'block';
    document.getElementById('upload-area').style.display = 'none';
}

// Clear file
function clearFile() {
    currentFile = null;
    analysisResult = null;
    
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('analysis-results').style.display = 'none';
    document.getElementById('generation-config').style.display = 'none';
    document.getElementById('file-input').value = '';
}

// Analyze uploaded file
async function analyzeFile(file) {
    const analysisResults = document.getElementById('analysis-results');
    const analysisLoading = analysisResults.querySelector('.analysis-loading');
    const analysisContent = analysisResults.querySelector('.analysis-content');
    
    analysisResults.style.display = 'block';
    analysisLoading.style.display = 'block';
    analysisContent.style.display = 'none';
    
    try {
        // Upload file and analyze
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/generator/analyze', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to analyze file');
        }
        
        analysisResult = await response.json();
        displayAnalysisResults(analysisResult);
        
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Failed to analyze file. Please try again.');
        analysisResults.style.display = 'none';
    }
}

// Display analysis results
function displayAnalysisResults(results) {
    const analysisLoading = document.querySelector('.analysis-loading');
    const analysisContent = document.querySelector('.analysis-content');
    
    analysisLoading.style.display = 'none';
    analysisContent.style.display = 'block';
    
    // Display data preview
    displayDataPreview(results.preview);
    
    // Display detected patterns
    displayPatterns(results.patterns);
    
    // Show generation configuration
    document.getElementById('generation-config').style.display = 'block';
    
    // Update available fields for generation
    updateAvailableFields(results.columns);
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
    title.textContent = column;
    card.appendChild(title);
    
    const info = document.createElement('div');
    info.className = 'pattern-info';
    
    // Add pattern details
    const details = [
        { label: 'Type', value: pattern.type },
        { label: 'Unique Values', value: pattern.unique_count },
        { label: 'Null Count', value: pattern.null_count },
    ];
    
    if (pattern.type === 'numeric') {
        details.push(
            { label: 'Min', value: pattern.min?.toFixed(2) },
            { label: 'Max', value: pattern.max?.toFixed(2) },
            { label: 'Mean', value: pattern.mean?.toFixed(2) },
            { label: 'Std Dev', value: pattern.std?.toFixed(2) }
        );
    } else if (pattern.type === 'categorical') {
        details.push(
            { label: 'Top Value', value: pattern.top_value },
            { label: 'Frequency', value: `${(pattern.top_frequency * 100).toFixed(1)}%` }
        );
    } else if (pattern.type === 'datetime') {
        details.push(
            { label: 'Format', value: pattern.format },
            { label: 'Range', value: `${pattern.min_date} to ${pattern.max_date}` }
        );
    }
    
    details.forEach(detail => {
        if (detail.value !== undefined) {
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
    
    div.innerHTML = `
        <input type="text" placeholder="Column name" class="column-name">
        <select class="column-type">
            <option value="string">Text</option>
            <option value="integer">Integer</option>
            <option value="float">Decimal</option>
            <option value="date">Date</option>
            <option value="boolean">Boolean</option>
            <option value="category">Category</option>
        </select>
        <button class="remove-column"><i class="fas fa-times"></i></button>
    `;
    
    // Add remove functionality
    const removeBtn = div.querySelector('.remove-column');
    removeBtn.addEventListener('click', () => div.remove());
    
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

// Pattern-based generation
async function handlePatternBasedGeneration() {
    if (!analysisResult) {
        alert('Please upload and analyze a file first.');
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

// Calculate token cost using centralized token service
function calculateTokenCost(rows) {
    const features = {
        differentialPrivacy: document.getElementById('differential-privacy')?.checked,
        hierarchicalRelations: document.getElementById('hierarchical')?.checked,
        industryTemplate: window.industryTemplateSelector?.selectedTemplate !== null
    };
    
    return tokenService.calculateGenerationCost(rows, selectedMethod, features);
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
        alert('Please add at least one column.');
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

// History management
function setupHistoryTab() {
    // History tab is set up, just need to load data
}

async function loadGenerationHistory() {
    try {
        const response = await fetchAuthenticatedData('/api/generator/history');
        
        if (response.error) {
            console.error('Failed to load history:', response.error);
            return;
        }
        
        generationHistory = response.history || [];
        displayHistory();
        
    } catch (error) {
        console.error('History error:', error);
    }
}

function displayHistory() {
    const container = document.getElementById('history-container');
    
    if (generationHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No data generated yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    generationHistory.forEach(item => {
        const historyItem = createHistoryItem(item);
        container.appendChild(historyItem);
    });
}

function createHistoryItem(item) {
    const div = document.createElement('div');
    div.className = 'history-item';
    
    const date = new Date(item.created_at).toLocaleString();
    
    div.innerHTML = `
        <div class="history-info">
            <h4>${item.instance_name}</h4>
            <div class="history-meta">
                <span><i class="fas fa-calendar"></i> ${date}</span>
                <span><i class="fas fa-table"></i> ${item.rows} rows × ${item.columns} columns</span>
                <span><i class="fas fa-file"></i> ${formatFileSize(item.file_size)}</span>
            </div>
        </div>
        <div class="history-actions">
            <button onclick="downloadGeneratedData('${item.id}')" title="Download">
                <i class="fas fa-download"></i>
            </button>
            <button onclick="previewGeneratedData('${item.id}')" title="Preview">
                <i class="fas fa-eye"></i>
            </button>
        </div>
    `;
    
    return div;
}

function addToHistory(item) {
    generationHistory.unshift(item);
    displayHistory();
}

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

// Setup privacy settings
function setupPrivacySettings() {
    const privacyCheckbox = document.getElementById('differential-privacy');
    const privacyOptions = document.querySelector('.privacy-options');
    const epsilonSlider = document.getElementById('epsilon');
    const epsilonValue = document.getElementById('epsilon-value');
    
    if (privacyCheckbox && privacyOptions) {
        privacyCheckbox.addEventListener('change', () => {
            privacyOptions.style.display = privacyCheckbox.checked ? 'block' : 'none';
            updateTokenCostEstimate();
            updatePrivacyMetrics();
        });
    }
    
    if (epsilonSlider && epsilonValue) {
        epsilonSlider.addEventListener('input', () => {
            epsilonValue.textContent = epsilonSlider.value;
            updatePrivacyLevel(epsilonSlider.value);
            updatePrivacyMetrics();
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
        privacyLevel.textContent = 'Very High';
        privacyLevel.className = 'level-high';
    } else if (epsilon <= 1) {
        privacyLevel.textContent = 'High';
        privacyLevel.className = 'level-high';
    } else if (epsilon <= 5) {
        privacyLevel.textContent = 'Medium';
        privacyLevel.className = 'level-medium';
    } else {
        privacyLevel.textContent = 'Low';
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
                updateTokenCostEstimate();
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
                updateTokenCostEstimate();
            });
        }
    });
}

// Update token cost estimate
function updateTokenCostEstimate() {
    // Update pattern-based generation cost
    const rows = parseInt(document.getElementById('gen-rows')?.value || 0);
    const tokenCostEl = document.getElementById('gen-token-cost');
    
    if (tokenCostEl && rows > 0) {
        const features = {
            preserveDistributions: document.getElementById('preserve-distributions')?.checked,
            preserveCorrelations: document.getElementById('preserve-correlations')?.checked,
            generateOutliers: document.getElementById('generate-outliers')?.checked,
            temporalConsistency: document.getElementById('temporal-consistency')?.checked,
            differentialPrivacy: document.getElementById('differential-privacy')?.checked
        };
        
        const cost = tokenService.calculateGenerationCost(rows, selectedMethod, features);
        tokenCostEl.textContent = `${cost.toLocaleString()} tokens`;
    }
    
    // Update manual configuration cost
    const manualRows = parseInt(document.getElementById('manual-rows')?.value || 0);
    const manualTokenCostEl = document.getElementById('manual-token-cost');
    
    if (manualTokenCostEl && manualRows > 0) {
        const manualColumns = document.querySelectorAll('#manual-columns .column-config').length || 1;
        const cost = tokenService.calculateGenerationCost(manualRows, 'manual', { columns: manualColumns });
        manualTokenCostEl.textContent = `${cost.toLocaleString()} tokens`;
    }
    
    // Update multi-table cost
    updateMultiTableTokenCost();
    
    // Update time estimate
    if (rows > 0) {
        updateGenerationTimeEstimate(rows);
    }
}

// Update multi-table token cost display
function updateMultiTableTokenCost() {
    const multiTableTokenCostEl = document.getElementById('multi-table-token-cost');
    if (!multiTableTokenCostEl) return;
    
    const tables = document.querySelectorAll('.table-definition');
    if (tables.length > 0) {
        const cost = calculateMultiTableTokenCost(tables);
        multiTableTokenCostEl.textContent = `${cost.toLocaleString()} tokens`;
    }
}

// Update generation time estimate based on method
function updateGenerationTimeEstimate(rows) {
    const timeEl = document.getElementById('gen-time');
    if (!timeEl) return;
    
    let estimatedTime;
    
    switch (selectedMethod) {
        case 'ctgan':
            estimatedTime = rows < 10000 ? '< 5 seconds' : 
                           rows < 100000 ? '10-30 seconds' : 
                           rows < 1000000 ? '1-3 minutes' : '3-5 minutes';
            break;
        case 'timegan':
            estimatedTime = rows < 10000 ? '< 10 seconds' : 
                           rows < 100000 ? '30-60 seconds' : 
                           rows < 1000000 ? '2-5 minutes' : '5-10 minutes';
            break;
        case 'vae':
            estimatedTime = rows < 10000 ? '< 3 seconds' : 
                           rows < 100000 ? '5-15 seconds' : 
                           rows < 1000000 ? '30-60 seconds' : '1-2 minutes';
            break;
        default:
            estimatedTime = '< 1 minute';
    }
    
    timeEl.textContent = estimatedTime;
}

// Apply industry template to generator
function applyGeneratorTemplate(industry, template) {
    console.log('Applying generator template:', industry, template);
    
    // Update manual configuration based on template
    if (industry === 'healthcare') {
        // Add healthcare-specific columns
        addTemplateColumns([
            { name: 'patient_id', type: 'string', pattern: 'uuid' },
            { name: 'diagnosis_code', type: 'string', pattern: 'icd10' },
            { name: 'admission_date', type: 'date', minDate: '2020-01-01', maxDate: '2024-12-31' },
            { name: 'discharge_date', type: 'date', minDate: '2020-01-01', maxDate: '2024-12-31' },
            { name: 'treatment_cost', type: 'number', min: 100, max: 100000 }
        ]);
    } else if (industry === 'finance') {
        // Add finance-specific columns
        addTemplateColumns([
            { name: 'transaction_id', type: 'string', pattern: 'uuid' },
            { name: 'account_number', type: 'string', pattern: 'account' },
            { name: 'transaction_amount', type: 'number', min: 0.01, max: 1000000 },
            { name: 'transaction_date', type: 'datetime' },
            { name: 'merchant_category', type: 'category', categories: ['Retail', 'Food', 'Travel', 'Entertainment', 'Other'] }
        ]);
    } else if (industry === 'retail') {
        // Add retail-specific columns
        addTemplateColumns([
            { name: 'product_id', type: 'string', pattern: 'sku' },
            { name: 'product_name', type: 'string', pattern: 'product' },
            { name: 'price', type: 'number', min: 0.99, max: 999.99 },
            { name: 'quantity', type: 'integer', min: 0, max: 1000 },
            { name: 'category', type: 'category', categories: ['Electronics', 'Clothing', 'Home', 'Food', 'Sports'] }
        ]);
    }
    
    // Switch to manual tab to show the template columns
    document.querySelector('[data-tab="manual"]').click();
    
    // Show notification
    showNotification(`${template.name} template applied`, 'success');
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
    const tables = document.querySelectorAll('.table-definition');
    let totalRows = 0;
    let totalColumns = 0;
    
    tables.forEach(table => {
        const rows = parseInt(table.querySelector('.table-rows').value) || 0;
        const columns = table.querySelectorAll('.column-item').length;
        totalRows += rows;
        totalColumns += columns;
    });
    
    // Estimate file size (more complex for related data)
    const estimatedBytes = totalRows * totalColumns * 60; // Slightly larger for relationships
    const fileSize = formatFileSize(estimatedBytes);
    
    document.getElementById('multi-table-size').textContent = fileSize;
    
    // Calculate token cost
    const tokenCost = calculateMultiTableTokenCost(tables);
    document.getElementById('multi-table-token-cost').textContent = `${tokenCost} tokens`;
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

// Make functions available globally for onclick handlers
window.downloadGeneratedData = downloadGeneratedData;
window.previewGeneratedData = previewGeneratedData;

export { setupDataGenerator };