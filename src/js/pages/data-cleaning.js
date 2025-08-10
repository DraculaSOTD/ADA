// Data Cleaning Page Controller
import tokenService from '../services/token_service.js';

class DataCleaningPage {
    constructor() {
        this.currentTab = 'upload';
        this.selectedTier = null;
        this.uploadedFile = null;
        this.selectedTemplate = null;
        this.workflowSteps = [];
        this.cleaningJobs = [];
        this.currentTokens = 1000000; // Default tokens
        this.processingInterval = null;
    }

    async initialize() {
        await this.loadIndustryTemplateSelector();
        await this.loadProgressMonitor();
        this.setupEventListeners();
        this.loadCleaningHistory();
    }

    async loadProgressMonitor() {
        // Load HTML
        const response = await fetch('/src/components/ProgressMonitor/ProgressMonitor.html');
        const html = await response.text();
        const container = document.getElementById('progressMonitorContainer');
        if (container) {
            container.innerHTML = html;
        }

        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/src/components/ProgressMonitor/ProgressMonitor.css';
        document.head.appendChild(link);

        // Load JavaScript
        const script = document.createElement('script');
        script.src = '/src/components/ProgressMonitor/ProgressMonitor.js';
        document.body.appendChild(script);
    }

    async loadIndustryTemplateSelector() {
        // Load the component HTML and CSS
        const response = await fetch('src/components/IndustryTemplateSelector/IndustryTemplateSelector.html');
        const html = await response.text();
        const container = document.getElementById('industryTemplateSelectorContainer');
        if (container) {
            container.innerHTML = html;
        }

        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'src/components/IndustryTemplateSelector/IndustryTemplateSelector.css';
        document.head.appendChild(link);

        // Load JavaScript
        const script = document.createElement('script');
        script.src = 'src/components/IndustryTemplateSelector/IndustryTemplateSelector.js';
        script.onload = () => {
            // Initialize the selector
            if (window.IndustryTemplateSelector) {
                this.industrySelector = new IndustryTemplateSelector();
                this.industrySelector.initialize('industryTemplateSelectorContainer', {
                    onTemplateSelect: (industry, template) => {
                        this.applyTemplate(industry);
                    }
                });
            }
        };
        document.body.appendChild(script);
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Workflow builder drag and drop
        this.setupWorkflowBuilder();

        // Cleaning tier selection
        document.querySelectorAll('.tier-card').forEach(card => {
            card.addEventListener('click', () => {
                const tier = card.getAttribute('data-tier');
                this.selectTier(tier);
            });
        });
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-tab') === tab);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });

        this.currentTab = tab;
    }

    handleFiles(files) {
        if (files.length === 0) return;

        const file = files[0];
        this.uploadedFile = file;

        // Show upload progress
        const uploadProgress = document.getElementById('uploadProgress');
        uploadProgress.style.display = 'block';

        // Simulate file upload with progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;

            document.getElementById('progressFill').style.width = `${progress}%`;
            document.getElementById('progressPercent').textContent = Math.floor(progress);

            if (progress === 100) {
                clearInterval(interval);
                setTimeout(() => {
                    this.profileData();
                }, 500);
            }
        }, 200);
    }

    profileData() {
        // Simulate data profiling
        const profilingResults = document.getElementById('profilingResults');
        profilingResults.style.display = 'block';

        // Update stats
        document.getElementById('totalRows').textContent = '1,245,678';
        document.getElementById('totalColumns').textContent = '24';
        document.getElementById('qualityScore').textContent = '78%';

        // Generate column profiles
        const columnProfiles = document.getElementById('columnProfiles');
        columnProfiles.innerHTML = `
            <h3>Column Analysis</h3>
            <div class="column-grid">
                ${this.generateColumnProfiles()}
            </div>
        `;
    }

    generateColumnProfiles() {
        const columns = [
            { name: 'customer_id', type: 'integer', nulls: '0%', unique: '100%' },
            { name: 'email', type: 'string', nulls: '2.3%', unique: '98.5%' },
            { name: 'purchase_date', type: 'date', nulls: '0%', unique: '15%' },
            { name: 'amount', type: 'decimal', nulls: '1.2%', unique: '45%' }
        ];

        return columns.map(col => `
            <div class="column-card">
                <h4>${col.name}</h4>
                <div class="column-stats">
                    <span>Type: ${col.type}</span>
                    <span>Nulls: ${col.nulls}</span>
                    <span>Unique: ${col.unique}</span>
                </div>
            </div>
        `).join('');
    }

    applyTemplate(industry) {
        this.selectedTemplate = industry;
        
        // Show template applied notification
        this.showNotification(`${industry.charAt(0).toUpperCase() + industry.slice(1)} template applied`, 'success');
        
        // Update cleaning options based on template
        this.updateCleaningOptions(industry);
    }

    selectTier(tier) {
        this.selectedTier = tier;
        
        // Update UI
        document.querySelectorAll('.tier-card').forEach(card => {
            card.classList.toggle('selected', card.getAttribute('data-tier') === tier);
        });

        // Show cleaning options
        const cleaningOptions = document.getElementById('cleaningOptions');
        cleaningOptions.style.display = 'block';
        this.updateCleaningOptions();
    }

    updateCleaningOptions(template = null) {
        const optionsContent = document.getElementById('cleaningOptionsContent');
        const tier = this.selectedTier;

        let options = '';

        if (tier === 'basic') {
            options = `
                <div class="cleaning-options-group">
                    <h4>Data Quality</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="removeDuplicates" checked> 
                            Remove duplicate rows
                            <span class="option-info">Identifies and removes exact duplicate records</span>
                        </label>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="validateTypes" checked> 
                            Validate data types
                            <span class="option-info">Ensures data conforms to expected types</span>
                        </label>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Missing Data</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="handleMissing" checked> 
                            Handle missing values
                            <span class="option-info">Fill, interpolate, or remove missing data</span>
                        </label>
                        <div class="sub-options">
                            <select id="missingStrategy" class="option-select">
                                <option value="remove">Remove rows with missing values</option>
                                <option value="mean">Fill with mean (numeric)</option>
                                <option value="median">Fill with median (numeric)</option>
                                <option value="mode">Fill with mode (categorical)</option>
                                <option value="forward">Forward fill</option>
                                <option value="backward">Backward fill</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Standardization</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="standardizeFormats" checked> 
                            Standardize formats
                            <span class="option-info">Normalize dates, numbers, and text formats</span>
                        </label>
                        <div class="sub-options">
                            <label class="sub-option">
                                <input type="checkbox" id="standardizeDates" checked> Date formats (YYYY-MM-DD)
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="standardizeNumbers" checked> Number formats (remove commas)
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="standardizeCase" checked> Text case (proper case for names)
                            </label>
                        </div>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="trimWhitespace" checked> 
                            Trim whitespace
                            <span class="option-info">Remove leading/trailing spaces</span>
                        </label>
                    </div>
                </div>
            `;
        } else if (tier === 'advanced') {
            options = `
                <div class="cleaning-options-group">
                    <h4>Anomaly Detection</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="aiAnomalyDetection" checked> 
                            AI-powered anomaly detection
                            <span class="option-info">Uses machine learning to identify unusual patterns</span>
                        </label>
                        <div class="sub-options">
                            <label class="sub-option">
                                <input type="checkbox" id="detectNumericOutliers" checked> Numeric outliers (IQR method)
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="detectCategoricalAnomalies" checked> Categorical anomalies
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="detectTimeSeriesAnomalies"> Time series anomalies
                            </label>
                        </div>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="statisticalOutliers" checked> 
                            Statistical outlier detection
                            <span class="option-info">Z-score and isolation forest methods</span>
                        </label>
                        <div class="sub-options">
                            <label>Sensitivity threshold:</label>
                            <input type="range" id="outlierSensitivity" min="1" max="5" value="3" class="sensitivity-slider">
                            <span id="sensitivityValue">3</span>
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Fuzzy Matching</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="fuzzyMatching" checked> 
                            Fuzzy matching (Jaro-Winkler)
                            <span class="option-info">Identifies similar but not exact matches</span>
                        </label>
                        <div class="sub-options">
                            <label>Similarity threshold:</label>
                            <select id="fuzzyThreshold" class="option-select">
                                <option value="0.95">Very High (95%)</option>
                                <option value="0.90" selected>High (90%)</option>
                                <option value="0.85">Medium (85%)</option>
                                <option value="0.80">Low (80%)</option>
                            </select>
                            <label class="sub-option">
                                <input type="checkbox" id="fuzzyNames" checked> Apply to name fields
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="fuzzyAddresses" checked> Apply to addresses
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="fuzzyProducts"> Apply to product names
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Smart Features</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="smartColumnMapping"> 
                            Smart column mapping
                            <span class="option-info">Automatically maps and standardizes column names</span>
                        </label>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="dataEnrichment" checked> 
                            Data enrichment
                            <span class="option-info">Enhance data with derived features</span>
                        </label>
                        <div class="sub-options">
                            <label class="sub-option">
                                <input type="checkbox" id="enrichDates" checked> Extract date components
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="enrichGeo" checked> Geocode addresses
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="enrichCategories"> Create category hierarchies
                            </label>
                        </div>
                    </div>
                </div>
            `;
        } else if (tier === 'ai-powered') {
            options = `
                <div class="cleaning-options-group">
                    <h4>AI-Powered Correction</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="gptDataCorrection" checked> 
                            GPT-4 powered data correction
                            <span class="option-info">Uses advanced language models to understand and fix data issues</span>
                        </label>
                        <div class="sub-options">
                            <label class="sub-option">
                                <input type="checkbox" id="gptAddressCorrection" checked> Address standardization & correction
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="gptNameCorrection" checked> Name parsing & formatting
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="gptDescriptionEnhancement" checked> Product description enhancement
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="gptCategoryPrediction"> Category prediction
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Industry ML Models</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="industryMLModels" checked> 
                            Industry-specific ML models
                            <span class="option-info">Pre-trained models for your industry vertical</span>
                        </label>
                        <div class="sub-options">
                            ${this.getIndustryModelOptions()}
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Advanced Features</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="predictiveQuality"> 
                            Predictive quality assessment
                            <span class="option-info">Predicts data quality issues before they occur</span>
                        </label>
                        <div class="sub-options">
                            <label class="sub-option">
                                <input type="checkbox" id="qualityScoring"> Generate quality scores per record
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="qualityAlerts"> Set up quality threshold alerts
                            </label>
                        </div>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="syntheticData"> 
                            Generate synthetic data for gaps
                            <span class="option-info">Creates realistic synthetic data to fill missing values</span>
                        </label>
                        <div class="sub-options">
                            <select id="syntheticMethod" class="option-select">
                                <option value="statistical">Statistical generation</option>
                                <option value="gan">GAN-based generation</option>
                                <option value="llm" selected>LLM-based generation</option>
                            </select>
                        </div>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="entityResolution" checked> 
                            Advanced entity resolution
                            <span class="option-info">Identifies same entities across different representations</span>
                        </label>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="semanticValidation" checked> 
                            Semantic validation
                            <span class="option-info">Validates data meaning and relationships</span>
                        </label>
                    </div>
                </div>
            `;
        }

        // Add template-specific options
        if (template === 'healthcare') {
            options += `
                <div class="cleaning-option">
                    <label>
                        <input type="checkbox" checked> FHIR compliance validation
                    </label>
                </div>
                <div class="cleaning-option">
                    <label>
                        <input type="checkbox" checked> PHI de-identification
                    </label>
                </div>
            `;
        }

        optionsContent.innerHTML = options;
        
        // Add event listeners for dynamic elements
        if (tier === 'advanced') {
            const sensitivitySlider = document.getElementById('outlierSensitivity');
            const sensitivityValue = document.getElementById('sensitivityValue');
            if (sensitivitySlider && sensitivityValue) {
                sensitivitySlider.addEventListener('input', (e) => {
                    sensitivityValue.textContent = e.target.value;
                });
            }
        }
    }

    startCleaning() {
        if (!this.uploadedFile || !this.selectedTier) {
            this.showNotification('Please upload a file and select a cleaning tier', 'error');
            return;
        }

        // Collect selected cleaning options
        const cleaningConfig = this.collectCleaningOptions();
        
        // Calculate token cost using centralized token service
        const rows = 1245678; // Simulated
        const selectedOperations = this.getSelectedOperations();
        const tokenCost = tokenService.calculateCleaningCost(rows, this.selectedTier, selectedOperations);

        // Use tokenUsageTracker to check and deduct tokens
        if (window.tokenUsageTracker && !window.tokenUsageTracker.useTokens(tokenCost, 'cleaning')) {
            return; // Token usage failed, tracker will show appropriate message
        }

        // Show processing modal
        this.showProcessingModal();
        
        // Start processing with configuration
        this.simulateProcessing(tokenCost, cleaningConfig);
    }

    collectCleaningOptions() {
        const config = {
            tier: this.selectedTier,
            template: this.selectedTemplate,
            options: {}
        };

        if (this.selectedTier === 'basic') {
            config.options = {
                removeDuplicates: document.getElementById('removeDuplicates')?.checked || false,
                validateTypes: document.getElementById('validateTypes')?.checked || false,
                handleMissing: document.getElementById('handleMissing')?.checked || false,
                missingStrategy: document.getElementById('missingStrategy')?.value || 'remove',
                standardizeFormats: document.getElementById('standardizeFormats')?.checked || false,
                standardizeDates: document.getElementById('standardizeDates')?.checked || false,
                standardizeNumbers: document.getElementById('standardizeNumbers')?.checked || false,
                standardizeCase: document.getElementById('standardizeCase')?.checked || false,
                trimWhitespace: document.getElementById('trimWhitespace')?.checked || false
            };
        } else if (this.selectedTier === 'advanced') {
            config.options = {
                // Include basic options
                ...this.getBasicOptions(),
                // Advanced options
                aiAnomalyDetection: document.getElementById('aiAnomalyDetection')?.checked || false,
                detectNumericOutliers: document.getElementById('detectNumericOutliers')?.checked || false,
                detectCategoricalAnomalies: document.getElementById('detectCategoricalAnomalies')?.checked || false,
                detectTimeSeriesAnomalies: document.getElementById('detectTimeSeriesAnomalies')?.checked || false,
                statisticalOutliers: document.getElementById('statisticalOutliers')?.checked || false,
                outlierSensitivity: document.getElementById('outlierSensitivity')?.value || 3,
                fuzzyMatching: document.getElementById('fuzzyMatching')?.checked || false,
                fuzzyThreshold: document.getElementById('fuzzyThreshold')?.value || '0.90',
                fuzzyNames: document.getElementById('fuzzyNames')?.checked || false,
                fuzzyAddresses: document.getElementById('fuzzyAddresses')?.checked || false,
                fuzzyProducts: document.getElementById('fuzzyProducts')?.checked || false,
                smartColumnMapping: document.getElementById('smartColumnMapping')?.checked || false,
                dataEnrichment: document.getElementById('dataEnrichment')?.checked || false,
                enrichDates: document.getElementById('enrichDates')?.checked || false,
                enrichGeo: document.getElementById('enrichGeo')?.checked || false,
                enrichCategories: document.getElementById('enrichCategories')?.checked || false
            };
        } else if (this.selectedTier === 'ai-powered') {
            config.options = {
                // Include advanced options
                ...this.getBasicOptions(),
                ...this.getAdvancedOptions(),
                // AI-powered specific options
                gptDataCorrection: document.getElementById('gptDataCorrection')?.checked || false,
                gptAddressCorrection: document.getElementById('gptAddressCorrection')?.checked || false,
                gptNameCorrection: document.getElementById('gptNameCorrection')?.checked || false,
                gptDescriptionEnhancement: document.getElementById('gptDescriptionEnhancement')?.checked || false,
                gptCategoryPrediction: document.getElementById('gptCategoryPrediction')?.checked || false,
                industryMLModels: document.getElementById('industryMLModels')?.checked || false,
                predictiveQuality: document.getElementById('predictiveQuality')?.checked || false,
                qualityScoring: document.getElementById('qualityScoring')?.checked || false,
                qualityAlerts: document.getElementById('qualityAlerts')?.checked || false,
                syntheticData: document.getElementById('syntheticData')?.checked || false,
                syntheticMethod: document.getElementById('syntheticMethod')?.value || 'llm',
                entityResolution: document.getElementById('entityResolution')?.checked || false,
                semanticValidation: document.getElementById('semanticValidation')?.checked || false,
                // Industry-specific model options
                ...this.collectIndustryModelOptions()
            };
        }

        return config;
    }
    
    getSelectedOperations() {
        // Map selected options to operation names for token calculation
        const operations = [];
        
        if (this.selectedTier === 'basic') {
            if (document.getElementById('removeDuplicates')?.checked) operations.push('deduplication');
            if (document.getElementById('validateTypes')?.checked) operations.push('typeValidation');
            if (document.getElementById('handleMissing')?.checked) operations.push('missingValues');
            if (document.getElementById('standardizeFormats')?.checked) operations.push('formatStandard');
        } else if (this.selectedTier === 'advanced') {
            if (document.getElementById('anomalyDetection')?.checked) operations.push('anomalyDetection');
            if (document.getElementById('fuzzyMatching')?.checked) operations.push('fuzzyMatching');
            if (document.getElementById('outlierDetection')?.checked) operations.push('outlierDetection');
            if (document.getElementById('smartMapping')?.checked) operations.push('columnMapping');
        } else if (this.selectedTier === 'ai-powered') {
            if (document.getElementById('gptCorrection')?.checked) operations.push('gptCorrection');
            if (document.getElementById('industryModels')?.checked) operations.push('industryModels');
            if (document.getElementById('qualityPrediction')?.checked) operations.push('predictiveQuality');
            if (document.getElementById('syntheticAugmentation')?.checked) operations.push('syntheticGeneration');
        }
        
        return operations;
    }

    getBasicOptions() {
        return {
            removeDuplicates: true,
            validateTypes: true,
            handleMissing: true,
            missingStrategy: 'remove',
            standardizeFormats: true,
            trimWhitespace: true
        };
    }

    getAdvancedOptions() {
        return {
            aiAnomalyDetection: true,
            statisticalOutliers: true,
            fuzzyMatching: true,
            fuzzyThreshold: '0.90',
            dataEnrichment: true
        };
    }

    collectIndustryModelOptions() {
        const options = {};
        const modelCheckboxes = [
            'modelDiagnosisValidation', 'modelProcedureCoding', 'modelPatientMatching',
            'modelFraudDetection', 'modelAMLScreening', 'modelRiskScoring',
            'modelClaimsValidation', 'modelRiskAssessment', 'modelPolicyMatching',
            'modelProductCategorization', 'modelInventoryPrediction', 'modelCustomerSegmentation',
            'modelGeneralClassification', 'modelAnomalyDetection', 'modelPatternRecognition'
        ];
        
        modelCheckboxes.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                options[id] = element.checked;
            }
        });
        
        return options;
    }

    getIndustryModelOptions() {
        const template = this.selectedTemplate;
        
        if (template === 'healthcare') {
            return `
                <label class="sub-option">
                    <input type="checkbox" id="modelDiagnosisValidation" checked> Diagnosis code validation
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelProcedureCoding" checked> Procedure coding assistance
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelPatientMatching"> Patient record matching
                </label>
            `;
        } else if (template === 'finance') {
            return `
                <label class="sub-option">
                    <input type="checkbox" id="modelFraudDetection" checked> Fraud pattern detection
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelAMLScreening" checked> AML screening
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelRiskScoring"> Risk scoring models
                </label>
            `;
        } else if (template === 'insurance') {
            return `
                <label class="sub-option">
                    <input type="checkbox" id="modelClaimsValidation" checked> Claims validation
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelRiskAssessment" checked> Risk assessment
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelPolicyMatching"> Policy matching
                </label>
            `;
        } else if (template === 'retail') {
            return `
                <label class="sub-option">
                    <input type="checkbox" id="modelProductCategorization" checked> Product categorization
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelInventoryPrediction" checked> Inventory prediction
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelCustomerSegmentation"> Customer segmentation
                </label>
            `;
        } else {
            return `
                <label class="sub-option">
                    <input type="checkbox" id="modelGeneralClassification" checked> General classification
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelAnomalyDetection" checked> Anomaly detection
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelPatternRecognition"> Pattern recognition
                </label>
            `;
        }
    }

    showProcessingModal() {
        const modal = document.getElementById('processingModal');
        modal.classList.add('active');
        
        // Initialize progress monitor
        if (window.ProgressMonitor) {
            this.progressMonitor = new ProgressMonitor();
            this.progressMonitor.initialize('progressMonitorContainer', {
                title: 'Data Cleaning in Progress',
                showLogs: true,
                allowPause: true,
                allowCancel: true,
                onComplete: (summary) => {
                    this.completeProcessing(summary.tokenCost);
                },
                onCancel: () => {
                    modal.classList.remove('active');
                    this.showNotification('Data cleaning cancelled', 'warning');
                }
            });
        }
    }

    simulateProcessing(tokenCost, cleaningConfig) {
        const totalRows = 1245678;
        
        // Generate stages based on selected options
        const stages = this.generateProcessingStages(cleaningConfig);
        let currentStage = 0;
        let rowsProcessed = 0;

        // Start progress monitor
        if (this.progressMonitor) {
            this.progressMonitor.startProgress(totalRows, 'Cleaning Dataset');
        }

        this.processingInterval = setInterval(() => {
            // Simulate progress
            const increment = Math.floor(Math.random() * 50000) + 10000;
            rowsProcessed = Math.min(rowsProcessed + increment, totalRows);
            
            // Calculate which stage we should be in
            const progress = (rowsProcessed / totalRows) * 100;
            const stageIndex = Math.floor((progress / 100) * stages.length);
            
            if (stageIndex !== currentStage && stageIndex < stages.length) {
                currentStage = stageIndex;
                if (this.progressMonitor) {
                    this.progressMonitor.addLog(`Started: ${stages[stageIndex]}`, 'info');
                }
            }
            
            // Update progress monitor
            if (this.progressMonitor) {
                const currentStageName = stages[Math.min(currentStage, stages.length - 1)];
                this.progressMonitor.updateProgress(
                    rowsProcessed, 
                    currentStageName,
                    `Processing row ${rowsProcessed.toLocaleString()} of ${totalRows.toLocaleString()}`
                );
            }

            if (rowsProcessed >= totalRows) {
                clearInterval(this.processingInterval);
                if (this.progressMonitor) {
                    this.progressMonitor.completeProgress({
                        tokenCost: tokenCost,
                        message: 'Data cleaning completed successfully!'
                    });
                }
            }
        }, 500);
    }


    generateProcessingStages(cleaningConfig) {
        const stages = ['Analyzing data structure'];
        
        // Basic cleaning stages
        if (cleaningConfig.options.removeDuplicates) {
            stages.push('Removing duplicate rows');
        }
        if (cleaningConfig.options.validateTypes) {
            stages.push('Validating data types');
        }
        if (cleaningConfig.options.handleMissing) {
            stages.push(`Handling missing values (${cleaningConfig.options.missingStrategy})`);
        }
        if (cleaningConfig.options.standardizeFormats) {
            stages.push('Standardizing formats');
        }
        if (cleaningConfig.options.trimWhitespace) {
            stages.push('Trimming whitespace');
        }
        
        // Advanced cleaning stages
        if (cleaningConfig.options.aiAnomalyDetection) {
            stages.push('Detecting anomalies with AI');
        }
        if (cleaningConfig.options.statisticalOutliers) {
            stages.push('Identifying statistical outliers');
        }
        if (cleaningConfig.options.fuzzyMatching) {
            stages.push(`Applying fuzzy matching (${cleaningConfig.options.fuzzyThreshold} threshold)`);
        }
        if (cleaningConfig.options.smartColumnMapping) {
            stages.push('Mapping columns intelligently');
        }
        if (cleaningConfig.options.dataEnrichment) {
            stages.push('Enriching data with derived features');
        }
        
        // AI-powered cleaning stages
        if (cleaningConfig.options.gptDataCorrection) {
            stages.push('Applying GPT-4 data corrections');
        }
        if (cleaningConfig.options.industryMLModels) {
            stages.push('Running industry-specific ML models');
        }
        if (cleaningConfig.options.predictiveQuality) {
            stages.push('Performing predictive quality assessment');
        }
        if (cleaningConfig.options.syntheticData) {
            stages.push(`Generating synthetic data (${cleaningConfig.options.syntheticMethod})`);
        }
        if (cleaningConfig.options.entityResolution) {
            stages.push('Resolving entities across records');
        }
        if (cleaningConfig.options.semanticValidation) {
            stages.push('Validating semantic relationships');
        }
        
        stages.push('Validating results', 'Generating quality report');
        
        return stages;
    }

    completeProcessing(tokenCost) {
        // Add to history
        const job = {
            id: Date.now(),
            filename: this.uploadedFile.name,
            date: new Date().toLocaleDateString(),
            rows: 1245678,
            tier: this.selectedTier,
            status: 'completed',
            tokens: tokenCost
        };
        this.cleaningJobs.unshift(job);
        this.saveCleaningHistory();

        // Show completion
        setTimeout(() => {
            document.getElementById('processingModal').classList.remove('active');
            this.showNotification('Data cleaning completed successfully!', 'success');
            this.switchTab('history');
            this.loadCleaningHistory();
        }, 3000); // Give user time to see the completion summary
    }

    setupWorkflowBuilder() {
        const canvas = document.getElementById('workflowCanvas');
        const tools = document.querySelectorAll('.workflow-tool');

        tools.forEach(tool => {
            tool.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('tool', tool.getAttribute('data-tool'));
            });
        });

        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            canvas.classList.add('drag-over');
        });

        canvas.addEventListener('dragleave', () => {
            canvas.classList.remove('drag-over');
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            canvas.classList.remove('drag-over');
            
            const toolType = e.dataTransfer.getData('tool');
            this.addWorkflowStep(toolType);
        });
    }

    addWorkflowStep(toolType) {
        const canvas = document.getElementById('workflowCanvas');
        
        // Remove placeholder if it's the first step
        if (this.workflowSteps.length === 0) {
            canvas.innerHTML = '';
        }

        const step = {
            id: Date.now(),
            type: toolType,
            config: {}
        };
        
        this.workflowSteps.push(step);
        
        // Create step element
        const stepElement = document.createElement('div');
        stepElement.className = 'workflow-step';
        stepElement.innerHTML = `
            <div class="step-header">
                <i class="fas fa-${this.getToolIcon(toolType)}"></i>
                <span>${this.getToolName(toolType)}</span>
                <button class="step-remove" onclick="dataCleaningPage.removeWorkflowStep(${step.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        canvas.appendChild(stepElement);
    }

    getToolIcon(toolType) {
        const icons = {
            'dedupe': 'copy',
            'validate': 'check-circle',
            'transform': 'exchange-alt',
            'ai-clean': 'brain',
            'export': 'download'
        };
        return icons[toolType] || 'cog';
    }

    getToolName(toolType) {
        const names = {
            'dedupe': 'Deduplication',
            'validate': 'Validation',
            'transform': 'Transform',
            'ai-clean': 'AI Cleaning',
            'export': 'Export'
        };
        return names[toolType] || toolType;
    }

    removeWorkflowStep(stepId) {
        this.workflowSteps = this.workflowSteps.filter(s => s.id !== stepId);
        this.renderWorkflow();
    }

    renderWorkflow() {
        const canvas = document.getElementById('workflowCanvas');
        
        if (this.workflowSteps.length === 0) {
            canvas.innerHTML = '<p class="workflow-placeholder">Drag tools here to build your workflow</p>';
            return;
        }

        canvas.innerHTML = this.workflowSteps.map(step => `
            <div class="workflow-step">
                <div class="step-header">
                    <i class="fas fa-${this.getToolIcon(step.type)}"></i>
                    <span>${this.getToolName(step.type)}</span>
                    <button class="step-remove" onclick="dataCleaningPage.removeWorkflowStep(${step.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    saveWorkflow() {
        if (this.workflowSteps.length === 0) {
            this.showNotification('Please add steps to your workflow', 'error');
            return;
        }

        // Save workflow to localStorage
        const workflows = JSON.parse(localStorage.getItem('cleaningWorkflows') || '[]');
        workflows.push({
            id: Date.now(),
            name: `Workflow ${workflows.length + 1}`,
            steps: this.workflowSteps,
            created: new Date().toISOString()
        });
        localStorage.setItem('cleaningWorkflows', JSON.stringify(workflows));
        
        this.showNotification('Workflow saved successfully!', 'success');
    }

    runWorkflow() {
        if (this.workflowSteps.length === 0) {
            this.showNotification('Please create a workflow first', 'error');
            return;
        }

        if (!this.uploadedFile) {
            this.showNotification('Please upload a file first', 'error');
            this.switchTab('upload');
            return;
        }

        // Start workflow execution
        this.showProcessingModal();
        this.simulateProcessing(5); // Simulate 5 tokens for workflow
    }

    loadCleaningHistory() {
        const historyContainer = document.getElementById('cleaningHistory');
        const jobs = JSON.parse(localStorage.getItem('cleaningJobs') || '[]');
        
        if (jobs.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No cleaning jobs yet</p>
                    <p class="empty-state-subtitle">Your cleaning history will appear here</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = jobs.map(job => `
            <div class="history-item">
                <div class="history-info">
                    <h4>${job.filename}</h4>
                    <div class="history-meta">
                        <span><i class="fas fa-calendar"></i> ${job.date}</span>
                        <span><i class="fas fa-database"></i> ${job.rows.toLocaleString()} rows</span>
                        <span><i class="fas fa-layer-group"></i> ${job.tier} tier</span>
                        <span><i class="fas fa-coins"></i> ${job.tokens} tokens</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="secondary-button" onclick="dataCleaningPage.downloadResults(${job.id})">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="secondary-button" onclick="dataCleaningPage.viewReport(${job.id})">
                        <i class="fas fa-chart-bar"></i> Report
                    </button>
                </div>
            </div>
        `).join('');
    }

    saveCleaningHistory() {
        localStorage.setItem('cleaningJobs', JSON.stringify(this.cleaningJobs));
    }

    downloadResults(jobId) {
        this.showNotification('Downloading cleaned data...', 'info');
        // Simulate download
        setTimeout(() => {
            this.showNotification('Download started', 'success');
        }, 1000);
    }

    viewReport(jobId) {
        this.showNotification('Opening cleaning report...', 'info');
        // Would open a detailed report modal
    }

    showPricingModal() {
        // Use tokenUsageTracker's pricing modal
        if (window.tokenUsageTracker) {
            window.tokenUsageTracker.showPricingModal();
        }
    }

    closePricingModal() {
        const modal = document.getElementById('pricingModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
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
}

// Initialize the page controller
const dataCleaningPage = new DataCleaningPage();

// Export for use in router
window.dataCleaningPage = dataCleaningPage;