export class DataCleaningPage {
    constructor() {
        this.selectedTier = null;
        this.uploadedFile = null;
        this.uploadedData = null;
        this.columnNames = [];
        this.init();
    }

    init() {
        this.initializeEventListeners();
        this.loadInitialContent();
    }

    initializeEventListeners() {
        // File upload functionality (Model Editor style)
        const csvUpload = document.getElementById('csv-upload');
        const uploadButton = document.getElementById('upload-button');
        const fileName = document.getElementById('file-name');

        if (csvUpload) {
            csvUpload.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    this.uploadedFile = file;
                    // Update file name display
                    if (fileName) {
                        fileName.textContent = file.name;
                    }
                    // Update cost calculator
                    this.updateCostCalculator(file);
                    // Auto-process for CSV files
                    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                        this.handleFileUpload(file);
                    }
                }
            });
        }

        if (uploadButton) {
            uploadButton.addEventListener('click', () => {
                if (this.uploadedFile) {
                    this.processFile(this.uploadedFile);
                }
            });
        }

        // Clear file on re-selection
        if (csvUpload) {
            csvUpload.addEventListener('click', () => {
                csvUpload.value = '';
            });
        }

        // Tier selection
        const tierCards = document.querySelectorAll('.tier-card');
        tierCards.forEach(card => {
            card.addEventListener('click', () => this.selectTier(card.dataset.tier));
        });

        // Differential privacy toggle
        const diffPrivacyCheckbox = document.getElementById('differential-privacy');
        if (diffPrivacyCheckbox) {
            diffPrivacyCheckbox.addEventListener('change', (e) => {
                const privacyOptions = document.querySelector('.privacy-options');
                if (privacyOptions) {
                    privacyOptions.style.display = e.target.checked ? 'block' : 'none';
                }
                // Recalculate cost summary when privacy settings change
                this.calculateAccurateCostSummary();
            });
        }

        // Epsilon slider
        const epsilonSlider = document.getElementById('epsilon');
        if (epsilonSlider) {
            epsilonSlider.addEventListener('input', this.updatePrivacyLevel.bind(this));
        }
    }

    clearFile() {
        this.uploadedFile = null;
        this.uploadedData = null;
        this.columnNames = [];
        
        const csvUpload = document.getElementById('csv-upload');
        const fileName = document.getElementById('file-name');
        const profilingResults = document.getElementById('profilingResults');
        
        if (csvUpload) csvUpload.value = '';
        if (fileName) fileName.textContent = 'No file chosen';
        if (profilingResults) profilingResults.style.display = 'none';
        
        // Reset cost calculator
        this.resetCostCalculator();
    }

    handleFileUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const csvText = e.target.result;
            const parsedData = this.parseCSVData(csvText);
            
            if (parsedData) {
                this.uploadedData = parsedData;
                
                // Detect columns and analyze data
                const columns = this.detectColumns(parsedData);
                this.displayDetectedColumns(columns);
                
                // Perform initial analysis
                const analysis = this.performInitialAnalysis(parsedData, columns);
                this.displayInitialAnalysis(analysis, parsedData);
                
                this.processFile(file);
            }
        };
        reader.readAsText(file);
    }

    parseCSVData(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 0) return null;

        // Parse CSV with proper handling of quotes and delimiters
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
                        i++;
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
        
        // Check if first row contains headers
        const hasHeaders = headers.some(h => {
            const cleaned = h.replace(/['"]/g, '');
            return isNaN(parseFloat(cleaned)) || 
                   cleaned.length > 20 || 
                   /[a-zA-Z]{2,}/.test(cleaned);
        });
        
        if (hasHeaders) {
            this.columnNames = headers.map(h => h.replace(/['"]/g, '') || `Column${headers.indexOf(h) + 1}`);
        } else {
            this.columnNames = headers.map((_, index) => `Column${index + 1}`);
        }

        // Parse data rows
        const dataStartIndex = hasHeaders ? 1 : 0;
        const data = [];
        for (let i = dataStartIndex; i < Math.min(lines.length, 100); i++) {
            if (lines[i].trim()) {
                const row = parseCSVLine(lines[i]);
                data.push(row);
            }
        }

        return {
            headers: this.columnNames,
            data: data,
            rowCount: lines.length - (hasHeaders ? 1 : 0)
        };
    }

    processFile(file) {
        this.uploadedFile = file;
        
        // Show upload progress using standard progress-bar
        const progressBar = document.getElementById('progress-bar');
        const uploadStatus = document.getElementById('upload-status');
        
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.classList.add('uploading');
        }
        if (uploadStatus) {
            uploadStatus.textContent = 'Processing...';
        }
        
        this.simulateUpload();

        // Update file info
        const fileName = file.name;
        const fileSize = this.formatFileSize(file.size);
        
        console.log(`Processing file: ${fileName} (${fileSize})`);
        
        // After upload, show profiling results
        setTimeout(() => {
            this.showProfilingResults();
        }, 2000);
    }

    simulateUpload() {
        let progress = 0;
        const progressBar = document.getElementById('progress-bar');
        const uploadStatus = document.getElementById('upload-status');
        const eta = document.getElementById('eta');
        
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
                if (progressBar) {
                    progressBar.classList.remove('uploading');
                    progressBar.classList.add('complete');
                }
                if (uploadStatus) {
                    uploadStatus.textContent = 'Complete';
                }
                if (eta) {
                    eta.textContent = '';
                }
                // Reset progress bar after completion
                setTimeout(() => {
                    if (progressBar) {
                        progressBar.style.width = '0%';
                        progressBar.classList.remove('complete');
                    }
                    if (uploadStatus) {
                        uploadStatus.textContent = '';
                    }
                }, 1500);
            }
        }, 200);
    }

    showProfilingResults() {
        const profilingResults = document.getElementById('profilingResults');
        if (profilingResults) {
            profilingResults.style.display = 'block';
            
            // Update stats based on uploaded data
            if (this.uploadedData) {
                document.getElementById('totalRows').textContent = this.uploadedData.rowCount.toLocaleString();
                document.getElementById('totalColumns').textContent = this.columnNames.length;
                
                // Calculate quality score
                const qualityScore = this.calculateDataQuality();
                document.getElementById('qualityScore').textContent = `${qualityScore}%`;
                // Also update the data quality score in Cost Summary
                const qualityScoreElement = document.getElementById('data-quality-score');
                if (qualityScoreElement) {
                    qualityScoreElement.textContent = `${qualityScore}%`;
                }
            } else {
                // Default values if no data parsed
                document.getElementById('totalRows').textContent = '10,000';
                document.getElementById('totalColumns').textContent = '15';
                document.getElementById('qualityScore').textContent = '87%';
                // Also update the data quality score in Cost Summary
                const qualityScoreElement = document.getElementById('data-quality-score');
                if (qualityScoreElement) {
                    qualityScoreElement.textContent = '87%';
                }
            }
            
            // Generate column profiles
            this.generateColumnProfiles();
            
            // Update cost summary if we have a selected tier
            if (this.selectedTier) {
                this.calculateAccurateCostSummary();
            }
        }
    }

    calculateDataQuality() {
        if (!this.uploadedData || !this.uploadedData.data || this.uploadedData.data.length === 0) {
            return 0;
        }

        let nullCount = 0;
        let totalCells = 0;

        // Analyze data quality
        this.uploadedData.data.forEach(row => {
            row.forEach(value => {
                totalCells++;
                if (!value || value === '' || value.toLowerCase() === 'null' || value.toLowerCase() === 'nan') {
                    nullCount++;
                }
            });
        });

        // Calculate quality score (0-100)
        const completeness = totalCells > 0 ? ((totalCells - nullCount) / totalCells) * 100 : 0;
        return Math.round(completeness);
    }

    generateColumnProfiles() {
        const container = document.getElementById('columnProfiles');
        if (!container) return;

        // Use actual column names if available
        let columns;
        if (this.columnNames && this.columnNames.length > 0) {
            columns = this.columnNames.map((name, index) => {
                // Analyze column data
                let nullCount = 0;
                let uniqueValues = new Set();
                let isNumeric = true;

                if (this.uploadedData && this.uploadedData.data) {
                    this.uploadedData.data.forEach(row => {
                        const value = row[index];
                        if (!value || value === '') {
                            nullCount++;
                        } else {
                            uniqueValues.add(value);
                            if (isNaN(parseFloat(value))) {
                                isNumeric = false;
                            }
                        }
                    });
                }

                const nullPercentage = this.uploadedData ? 
                    ((nullCount / this.uploadedData.data.length) * 100).toFixed(1) : 
                    (Math.random() * 5).toFixed(1);
                
                const uniquePercentage = this.uploadedData ? 
                    ((uniqueValues.size / this.uploadedData.data.length) * 100).toFixed(0) : 
                    (50 + Math.random() * 50).toFixed(0);

                return {
                    name: name,
                    type: isNumeric ? 'Numeric' : 'String',
                    nulls: nullPercentage,
                    unique: uniquePercentage
                };
            });
        } else {
            // Default columns for demo
            columns = [
                { name: 'customer_id', type: 'ID', nulls: 0, unique: 100 },
                { name: 'name', type: 'String', nulls: 2.3, unique: 98.5 },
                { name: 'email', type: 'Email', nulls: 1.5, unique: 99.8 },
                { name: 'age', type: 'Integer', nulls: 5.2, unique: 45 },
                { name: 'purchase_date', type: 'Date', nulls: 0.8, unique: 35 }
            ];
        }

        container.innerHTML = `
            <h3>Column Analysis</h3>
            <div class="column-grid">
                ${columns.slice(0, 10).map(col => `
                    <div class="column-card">
                        <h4>${col.name}</h4>
                        <div class="column-stats">
                            <span>Type: ${col.type}</span>
                            <span>Null: ${col.nulls}%</span>
                            <span>Unique: ${col.unique}%</span>
                        </div>
                    </div>
                `).join('')}
                ${columns.length > 10 ? `
                    <div class="column-card more-columns">
                        <p>+${columns.length - 10} more columns</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    selectTier(tier) {
        this.selectedTier = tier;
        
        // Update UI
        const tierCards = document.querySelectorAll('.tier-card');
        tierCards.forEach(card => {
            if (card.dataset.tier === tier) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Show cleaning options
        const cleaningOptions = document.getElementById('cleaningOptions');
        if (cleaningOptions) {
            cleaningOptions.style.display = 'block';
            this.loadCleaningOptions(tier);
        }
        
        // Update accurate cost summary with all factors
        this.calculateAccurateCostSummary();
    }

    loadCleaningOptions(tier) {
        const container = document.getElementById('cleaningOptionsContent');
        if (!container) return;

        let options = [];
        switch(tier) {
            case 'basic':
                options = [
                    'Remove duplicate rows',
                    'Standardize data formats',
                    'Handle missing values',
                    'Validate data types'
                ];
                break;
            case 'advanced':
                options = [
                    'AI-powered anomaly detection',
                    'Fuzzy matching for duplicates',
                    'Statistical outlier removal',
                    'Smart column mapping',
                    'Cross-field validation'
                ];
                break;
            case 'ai-powered':
                options = [
                    'GPT-4 data correction',
                    'Industry-specific ML models',
                    'Predictive quality assessment',
                    'Synthetic data generation for missing values',
                    'Context-aware data enrichment'
                ];
                break;
        }

        container.innerHTML = options.map(option => `
            <div class="cleaning-option">
                <label>
                    <input type="checkbox" checked class="cleaning-option-checkbox"> ${option}
                </label>
            </div>
        `).join('');
        
        // Add event listeners to all checkboxes for real-time updates
        const checkboxes = container.querySelectorAll('.cleaning-option-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.calculateAccurateCostSummary();
            });
        });
    }

    updatePrivacyLevel(e) {
        const value = parseFloat(e.target.value);
        const epsilonValue = document.getElementById('epsilon-value');
        const privacyLevel = document.getElementById('privacy-level');
        
        if (epsilonValue) epsilonValue.textContent = value.toFixed(1);
        
        if (privacyLevel) {
            if (value < 1) {
                privacyLevel.textContent = 'Very High';
                privacyLevel.className = 'level-very-high';
            } else if (value < 3) {
                privacyLevel.textContent = 'High';
                privacyLevel.className = 'level-high';
            } else if (value < 5) {
                privacyLevel.textContent = 'Medium';
                privacyLevel.className = 'level-medium';
            } else {
                privacyLevel.textContent = 'Low';
                privacyLevel.className = 'level-low';
            }
        }

        this.updatePrivacyMetrics(value);
    }

    updatePrivacyMetrics(epsilon) {
        const reidentRisk = document.getElementById('reidentification-risk');
        const attrRisk = document.getElementById('attribute-risk');
        const utilityScore = document.getElementById('utility-score');

        if (reidentRisk) {
            const risk = Math.min(0.5, 0.01 * epsilon).toFixed(2);
            reidentRisk.textContent = `Low (< ${risk}%)`;
        }

        if (attrRisk) {
            attrRisk.textContent = epsilon < 3 ? 'Low' : 'Medium';
        }

        if (utilityScore) {
            const utility = Math.max(85, 100 - epsilon * 3);
            utilityScore.textContent = `${utility}%`;
        }
        
        // Recalculate cost summary when privacy level changes
        this.calculateAccurateCostSummary();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    startCleaning() {
        if (!this.uploadedFile || !this.selectedTier) {
            alert('Please upload a file and select a cleaning tier');
            return;
        }

        // Show processing modal
        const modal = document.getElementById('processingModal');
        if (modal) {
            modal.classList.add('active');
            this.simulateProcessing();
        }
    }

    simulateProcessing() {
        // Simulate processing with progress updates
        console.log('Starting data cleaning process...');
        
        // Simulate cleaning metrics based on data
        const totalRows = this.parsedData ? this.parsedData.length : 1000;
        const cleanedRows = Math.floor(totalRows * 0.85);
        const removedRows = Math.floor(totalRows * 0.05);
        const changedValues = Math.floor(totalRows * 2.5); // Multiple values per row
        const qualityScore = this.selectedTier === 'ai-powered' ? 95 : 
                            this.selectedTier === 'advanced' ? 85 : 75;
        
        // Update metrics during processing
        setTimeout(() => {
            this.updateCleaningMetrics(cleanedRows, removedRows, changedValues, qualityScore);
        }, 2000);
        
        setTimeout(() => {
            const modal = document.getElementById('processingModal');
            if (modal) modal.classList.remove('active');
            
            // Show success notification
            this.showNotification('Data cleaning completed successfully!', 'success');
        }, 5000);
    }

    updateCostCalculator(file) {
        if (!file) return;
        
        // Store file for later use
        this.uploadedFile = file;
        
        // Calculate accurate cost summary with all factors
        if (this.selectedTier) {
            this.calculateAccurateCostSummary();
        } else {
            // If no tier selected yet, just update basic info
            const sizeElement = document.getElementById('total-data-size');
            if (sizeElement) {
                sizeElement.textContent = this.formatFileSize(file.size);
            }
        }
    }
    
    resetCostCalculator() {
        const elements = {
            'total-data-size': '0 MB',
            'total-token-cost': '0 tokens',
            'estimated-time': '< 1 minute',
            'quality-improvement': '+0%',
            'data-quality-score': '0%',
            'cleaned-rows': '0',
            'removed-rows': '0',
            'changed-values': '0'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    updateCleaningMetrics(cleanedRows, removedRows, changedValues, qualityScore) {
        const metrics = {
            'cleaned-rows': cleanedRows || 0,
            'removed-rows': removedRows || 0,
            'changed-values': changedValues || 0,
            'data-quality-score': qualityScore ? `${qualityScore}%` : '0%'
        };
        
        Object.entries(metrics).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
            }
        });
    }

    // Calculate accurate cost summary based on all factors
    calculateAccurateCostSummary() {
        if (!this.uploadedFile) return;
        
        // Get actual data metrics
        const rowCount = this.parsedData ? this.parsedData.length : 
                        (this.uploadedData ? this.uploadedData.rowCount : 1000);
        const columnCount = this.columnNames ? this.columnNames.length : 10;
        const fileSizeMB = this.uploadedFile.size / (1024 * 1024);
        
        // Get selected cleaning options
        const checkedOptions = this.getCheckedCleaningOptions();
        const optionCount = checkedOptions.length;
        
        // Check if privacy is enabled
        const privacyEnabled = document.getElementById('differential-privacy')?.checked || false;
        const privacyMultiplier = privacyEnabled ? 1.5 : 1.0;
        
        // Calculate token cost with all factors
        const baseTokensPerMillion = {
            'basic': 1,
            'advanced': 3,
            'ai-powered': 5
        };
        
        const baseCost = baseTokensPerMillion[this.selectedTier] || 1;
        const optionMultiplier = 1 + (optionCount * 0.1); // Each option adds 10% cost
        const rowsInMillions = rowCount / 1000000;
        
        const totalTokens = Math.ceil(
            baseCost * rowsInMillions * optionMultiplier * privacyMultiplier * 1000
        );
        
        // Update token cost
        const tokenElement = document.getElementById('total-token-cost');
        if (tokenElement) {
            tokenElement.textContent = `${totalTokens.toLocaleString()} tokens`;
        }
        
        // Calculate processing time
        const baseTimeMinutes = fileSizeMB / 10; // 10MB per minute base
        const tierMultiplier = {
            'basic': 1,
            'advanced': 1.5,
            'ai-powered': 2
        }[this.selectedTier] || 1;
        
        const totalTimeMinutes = Math.ceil(
            baseTimeMinutes * tierMultiplier * optionMultiplier * privacyMultiplier
        );
        
        const timeElement = document.getElementById('estimated-time');
        if (timeElement) {
            if (totalTimeMinutes < 1) {
                timeElement.textContent = '< 1 minute';
            } else if (totalTimeMinutes < 60) {
                timeElement.textContent = `${totalTimeMinutes} minute${totalTimeMinutes > 1 ? 's' : ''}`;
            } else {
                const hours = Math.floor(totalTimeMinutes / 60);
                const mins = totalTimeMinutes % 60;
                timeElement.textContent = `${hours}h ${mins}m`;
            }
        }
        
        // Calculate cleaning metrics based on analysis
        if (this.dataAnalysis) {
            const totalIssues = this.dataAnalysis.formatIssues + 
                               this.dataAnalysis.inconsistencies + 
                               this.dataAnalysis.missingValues;
            
            // Estimate based on selected tier and options
            const cleaningEfficiency = {
                'basic': 0.7,
                'advanced': 0.85,
                'ai-powered': 0.95
            }[this.selectedTier] || 0.7;
            
            const adjustedEfficiency = Math.min(1, cleaningEfficiency * optionMultiplier);
            
            const cleanedRows = Math.floor(rowCount - this.dataAnalysis.duplicates);
            const removedRows = this.dataAnalysis.duplicates;
            const changedValues = Math.floor(totalIssues * adjustedEfficiency);
            
            // Calculate quality improvement
            const currentQuality = this.calculateDataQuality();
            const expectedQuality = Math.min(100, currentQuality + (adjustedEfficiency * (100 - currentQuality)));
            const qualityImprovement = Math.round(expectedQuality - currentQuality);
            
            // Update metrics
            this.updateCleaningMetrics(cleanedRows, removedRows, changedValues, Math.round(expectedQuality));
            
            const qualityElement = document.getElementById('quality-improvement');
            if (qualityElement) {
                qualityElement.textContent = `+${qualityImprovement}%`;
            }
        }
        
        // Update data size (always current)
        const sizeElement = document.getElementById('total-data-size');
        if (sizeElement) {
            sizeElement.textContent = this.formatFileSize(this.uploadedFile.size);
        }
    }
    
    // Get list of checked cleaning options
    getCheckedCleaningOptions() {
        const checkboxes = document.querySelectorAll('.cleaning-option input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.parentElement.textContent.trim());
    }

    // Detect columns and their data types
    detectColumns(data) {
        if (!data || data.length === 0) return [];
        
        const headers = Object.keys(data[0]);
        const columns = headers.map(header => {
            const samples = data.slice(0, Math.min(100, data.length)).map(row => row[header]);
            const type = this.detectDataType(samples);
            const nullCount = samples.filter(v => !v || v === '' || v === 'null' || v === 'NULL').length;
            
            return {
                name: header,
                type: type,
                nullCount: nullCount,
                totalRows: data.length,
                sampleValues: samples.filter(v => v && v !== '').slice(0, 5)
            };
        });
        
        return columns;
    }
    
    // Detect data type from sample values
    detectDataType(samples) {
        const nonEmpty = samples.filter(v => v && v !== '' && v !== 'null' && v !== 'NULL');
        if (nonEmpty.length === 0) return 'Unknown';
        
        // Check for boolean
        const boolValues = ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'];
        if (nonEmpty.every(v => boolValues.includes(String(v).toLowerCase()))) {
            return 'Boolean';
        }
        
        // Check for dates
        const datePatterns = [
            /^\d{4}-\d{2}-\d{2}$/,
            /^\d{2}\/\d{2}\/\d{4}$/,
            /^\d{2}-\d{2}-\d{4}$/
        ];
        if (nonEmpty.every(v => {
            const str = String(v);
            return datePatterns.some(pattern => pattern.test(str)) || !isNaN(Date.parse(str));
        })) {
            return 'Date';
        }
        
        // Check for numbers
        if (nonEmpty.every(v => !isNaN(v) && !isNaN(parseFloat(v)))) {
            if (nonEmpty.every(v => Number.isInteger(Number(v)))) {
                return 'Integer';
            }
            return 'Float';
        }
        
        // Check for email
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (nonEmpty.filter(v => emailPattern.test(String(v))).length > nonEmpty.length * 0.8) {
            return 'Email';
        }
        
        // Default to string
        return 'String';
    }
    
    // Display detected columns in Tagged Data style
    displayDetectedColumns(columns) {
        const container = document.getElementById('detected-columns-content');
        const section = document.getElementById('detectedColumns');
        
        if (!container || !columns || columns.length === 0) return;
        
        // Show the section
        section.style.display = 'block';
        
        // Build the HTML
        let html = `
            <div class="template-mapping">
                <div class="mapping-header">
                    <h4>Detected ${columns.length} columns from your file:</h4>
                </div>
        `;
        
        columns.forEach(col => {
            const nullPercentage = ((col.nullCount / col.totalRows) * 100).toFixed(1);
            const description = col.nullCount > 0 ? 
                `${col.nullCount} missing values (${nullPercentage}%)` : 
                'No missing values';
                
            html += `
                <div class="mapping-row">
                    <div class="csv-column-select">
                        <span class="column-name">${col.name}</span>
                    </div>
                    <span class="arrow">→</span>
                    <div class="required-field">
                        <span class="field-type">${col.type}</span>
                        <span>${description}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    // Perform initial data quality analysis
    performInitialAnalysis(data, columns) {
        const analysis = {
            formatIssues: 0,
            inconsistencies: 0,
            missingValues: 0,
            duplicates: 0,
            details: []
        };
        
        // Count missing values
        columns.forEach(col => {
            analysis.missingValues += col.nullCount;
            if (col.nullCount > 0) {
                const percentage = ((col.nullCount / col.totalRows) * 100).toFixed(1);
                analysis.details.push({
                    type: 'missing',
                    column: col.name,
                    message: `${col.nullCount} missing values (${percentage}%)`,
                    severity: col.nullCount > col.totalRows * 0.3 ? 'error' : 'warning'
                });
            }
        });
        
        // Check for duplicates
        const seen = new Set();
        let dupCount = 0;
        data.forEach(row => {
            const key = JSON.stringify(row);
            if (seen.has(key)) {
                dupCount++;
            }
            seen.add(key);
        });
        analysis.duplicates = dupCount;
        
        if (dupCount > 0) {
            analysis.details.push({
                type: 'duplicates',
                column: 'All columns',
                message: `${dupCount} duplicate rows found`,
                severity: 'info'
            });
        }
        
        // Check for format issues and inconsistencies
        columns.forEach(col => {
            const values = data.map(row => row[col.name]).filter(v => v && v !== '');
            if (values.length === 0) return;
            
            // Check for mixed types (inconsistencies)
            const types = new Set();
            values.forEach(v => {
                if (!isNaN(v) && !isNaN(parseFloat(v))) types.add('number');
                else if (!isNaN(Date.parse(v))) types.add('date');
                else types.add('string');
            });
            
            if (types.size > 1) {
                analysis.inconsistencies++;
                analysis.details.push({
                    type: 'inconsistency',
                    column: col.name,
                    message: 'Mixed data types detected',
                    severity: 'warning'
                });
            }
            
            // Check for format issues based on detected type
            if (col.type === 'Date') {
                const invalidDates = values.filter(v => isNaN(Date.parse(v)));
                if (invalidDates.length > 0) {
                    analysis.formatIssues += invalidDates.length;
                    analysis.details.push({
                        type: 'format',
                        column: col.name,
                        message: `${invalidDates.length} invalid date formats`,
                        severity: 'error'
                    });
                }
            } else if (col.type === 'Email') {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const invalidEmails = values.filter(v => !emailPattern.test(String(v)));
                if (invalidEmails.length > 0) {
                    analysis.formatIssues += invalidEmails.length;
                    analysis.details.push({
                        type: 'format',
                        column: col.name,
                        message: `${invalidEmails.length} invalid email formats`,
                        severity: 'error'
                    });
                }
            }
        });
        
        return analysis;
    }
    
    // Display initial analysis results
    displayInitialAnalysis(analysis, data) {
        const section = document.getElementById('initialAnalysis');
        if (!section) return;
        
        // Store analysis for later use
        this.dataAnalysis = analysis;
        
        // Show the section
        section.style.display = 'block';
        
        // Update metrics
        document.getElementById('format-issues').textContent = analysis.formatIssues.toLocaleString();
        document.getElementById('inconsistencies').textContent = analysis.inconsistencies.toLocaleString();
        document.getElementById('missing-values').textContent = analysis.missingValues.toLocaleString();
        document.getElementById('duplicates').textContent = analysis.duplicates.toLocaleString();
        
        // Calculate accurate cost summary with all current settings
        this.calculateAccurateCostSummary();
        
        // Show details if there are issues
        if (analysis.details.length > 0) {
            const detailsDiv = document.getElementById('issueDetails');
            const issuesList = detailsDiv.querySelector('.issues-list');
            
            if (issuesList) {
                let detailsHTML = '';
                analysis.details.forEach(issue => {
                    const severityIcon = issue.severity === 'error' ? 'exclamation-triangle' :
                                        issue.severity === 'warning' ? 'exclamation-circle' : 'info-circle';
                    detailsHTML += `
                        <div class="issue-item">
                            <i class="fas fa-${severityIcon}"></i>
                            <strong>${issue.column}:</strong> ${issue.message}
                        </div>
                    `;
                });
                
                issuesList.innerHTML = detailsHTML;
                detailsDiv.style.display = 'block';
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type} show`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    loadInitialContent() {
        // Initialize any default content
        console.log('Data Cleaning Page initialized');
    }
}

// Export for use in router
window.DataCleaningPage = DataCleaningPage;

// Initialize when DOM is ready (fallback for direct script load)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.dataCleaningPage) {
            window.dataCleaningPage = new DataCleaningPage();
        }
    });
} else if (!window.dataCleaningPage) {
    // DOM already loaded, initialize if not already done
    window.dataCleaningPage = new DataCleaningPage();
}