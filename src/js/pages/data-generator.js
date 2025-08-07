import { fetchAuthenticatedData } from '../services/api.js';

let currentFile = null;
let analysisResult = null;
let generationHistory = [];

function setupDataGenerator() {
    console.log('Setting up advanced data generator...');
    
    // Initialize all components
    setupTabNavigation();
    setupFileUpload();
    setupManualConfiguration();
    setupHistoryTab();
    loadGenerationHistory();
    
    // Set up event listeners for generation buttons
    const generateFromPatternBtn = document.getElementById('generate-from-pattern');
    const generateManualBtn = document.getElementById('generate-manual');
    
    if (generateFromPatternBtn) {
        generateFromPatternBtn.addEventListener('click', handlePatternBasedGeneration);
    }
    
    if (generateManualBtn) {
        generateManualBtn.addEventListener('click', handleManualGeneration);
    }
    
    // Update estimates on input change
    setupEstimateUpdates();
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
    
    const config = {
        rows: parseInt(document.getElementById('gen-rows').value),
        format: document.getElementById('gen-format').value,
        preserve_relationships: document.getElementById('preserve-relationships').checked,
        include_outliers: document.getElementById('include-outliers').checked,
        add_missing: document.getElementById('add-missing').checked,
        patterns: analysisResult.patterns
    };
    
    await generateData(config, 'pattern');
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

// Make functions available globally for onclick handlers
window.downloadGeneratedData = downloadGeneratedData;
window.previewGeneratedData = previewGeneratedData;

export { setupDataGenerator };