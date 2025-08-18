import { TabNavigation } from '../shared/TabNavigation.js';

export class DataCleaningPage {
    constructor() {
        this.tabNavigation = null;
        this.selectedTier = null;
        this.uploadedFile = null;
        this.init();
    }

    init() {
        this.initializeTabNavigation();
        this.initializeEventListeners();
        this.loadInitialContent();
    }

    initializeTabNavigation() {
        const container = document.getElementById('dataCleaningTabContainer');
        if (!container) return;

        this.tabNavigation = new TabNavigation(container, {
            activeTab: 0,
            onTabChange: (tabId, index) => this.handleTabChange(tabId, index)
        });

        // Set up tabs
        this.tabNavigation.setTabs([
            { id: 'upload', label: 'Upload & Profile', icon: 'fas fa-upload' },
            { id: 'configure', label: 'Configure Cleaning', icon: 'fas fa-cog' },
            { id: 'workflow', label: 'Workflow Builder', icon: 'fas fa-project-diagram' },
            { id: 'history', label: 'Cleaning History', icon: 'fas fa-history' }
        ]);
    }

    handleTabChange(tabId, index) {
        // Hide all tab contents
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => content.classList.remove('active'));

        // Show selected tab content
        const selectedContent = document.getElementById(`${tabId}Tab`);
        if (selectedContent) {
            selectedContent.classList.add('active');
        }
    }

    initializeEventListeners() {
        // Upload area
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
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
            });
        }

        // Epsilon slider
        const epsilonSlider = document.getElementById('epsilon');
        if (epsilonSlider) {
            epsilonSlider.addEventListener('input', this.updatePrivacyLevel.bind(this));
        }

        // Workflow drag and drop
        this.initializeWorkflowBuilder();
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
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
        this.uploadedFile = file;
        
        // Show upload progress
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) {
            uploadProgress.style.display = 'block';
            this.simulateUpload();
        }

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
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        
        const interval = setInterval(() => {
            progress += 10;
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressPercent) progressPercent.textContent = progress;
            
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 200);
    }

    showProfilingResults() {
        const profilingResults = document.getElementById('profilingResults');
        if (profilingResults) {
            profilingResults.style.display = 'block';
            
            // Update stats
            document.getElementById('totalRows').textContent = '10,000';
            document.getElementById('totalColumns').textContent = '15';
            document.getElementById('qualityScore').textContent = '87%';
            
            // Generate column profiles
            this.generateColumnProfiles();
        }
    }

    generateColumnProfiles() {
        const container = document.getElementById('columnProfiles');
        if (!container) return;

        const columns = [
            { name: 'customer_id', type: 'ID', nulls: 0, unique: 100 },
            { name: 'name', type: 'String', nulls: 2.3, unique: 98.5 },
            { name: 'email', type: 'Email', nulls: 1.5, unique: 99.8 },
            { name: 'age', type: 'Integer', nulls: 5.2, unique: 45 },
            { name: 'purchase_date', type: 'Date', nulls: 0.8, unique: 35 }
        ];

        container.innerHTML = `
            <h3>Column Analysis</h3>
            <div class="column-grid">
                ${columns.map(col => `
                    <div class="column-card">
                        <h4>${col.name}</h4>
                        <div class="column-stats">
                            <span>Type: ${col.type}</span>
                            <span>Null: ${col.nulls}%</span>
                            <span>Unique: ${col.unique}%</span>
                        </div>
                    </div>
                `).join('')}
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
                    <input type="checkbox" checked> ${option}
                </label>
            </div>
        `).join('');
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
    }

    initializeWorkflowBuilder() {
        const tools = document.querySelectorAll('.workflow-tool');
        const canvas = document.getElementById('workflowCanvas');

        tools.forEach(tool => {
            tool.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('tool', e.target.dataset.tool);
            });
        });

        if (canvas) {
            canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                const tool = e.dataTransfer.getData('tool');
                this.addWorkflowStep(tool);
            });
        }
    }

    addWorkflowStep(tool) {
        const canvas = document.getElementById('workflowCanvas');
        if (!canvas) return;

        // Remove placeholder if exists
        const placeholder = canvas.querySelector('.workflow-placeholder');
        if (placeholder) placeholder.remove();

        const stepElement = document.createElement('div');
        stepElement.className = 'workflow-step';
        stepElement.innerHTML = `
            <div class="step-header">
                <i class="fas fa-${this.getToolIcon(tool)}"></i>
                <span>${this.getToolName(tool)}</span>
                <button class="step-remove" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        canvas.appendChild(stepElement);
    }

    getToolIcon(tool) {
        const icons = {
            'dedupe': 'copy',
            'validate': 'check-circle',
            'transform': 'exchange-alt',
            'ai-clean': 'brain',
            'export': 'download'
        };
        return icons[tool] || 'cog';
    }

    getToolName(tool) {
        const names = {
            'dedupe': 'Deduplication',
            'validate': 'Validation',
            'transform': 'Transform',
            'ai-clean': 'AI Cleaning',
            'export': 'Export'
        };
        return names[tool] || tool;
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
        
        setTimeout(() => {
            const modal = document.getElementById('processingModal');
            if (modal) modal.classList.remove('active');
            
            // Show success notification
            this.showNotification('Data cleaning completed successfully!', 'success');
            
            // Update history
            this.addToHistory();
        }, 5000);
    }

    addToHistory() {
        const historyContainer = document.getElementById('cleaningHistory');
        if (!historyContainer) return;

        const emptyState = historyContainer.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-info">
                <h4>${this.uploadedFile.name}</h4>
                <div class="history-meta">
                    <span>${new Date().toLocaleString()}</span>
                    <span>${this.selectedTier} cleaning</span>
                    <span>10,000 rows</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="secondary-button">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="secondary-button">
                    <i class="fas fa-eye"></i> View Report
                </button>
            </div>
        `;

        historyContainer.insertBefore(historyItem, historyContainer.firstChild);
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

    saveWorkflow() {
        const steps = document.querySelectorAll('.workflow-step');
        if (steps.length === 0) {
            alert('Please add steps to your workflow');
            return;
        }

        // Save workflow logic
        console.log('Saving workflow with', steps.length, 'steps');
        this.showNotification('Workflow saved successfully!', 'success');
    }

    runWorkflow() {
        const steps = document.querySelectorAll('.workflow-step');
        if (steps.length === 0) {
            alert('Please add steps to your workflow');
            return;
        }

        this.startCleaning();
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