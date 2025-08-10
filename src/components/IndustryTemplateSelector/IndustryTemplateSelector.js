// Industry Template Selector Component
// Check if class already exists to prevent redeclaration
if (typeof IndustryTemplateSelector === 'undefined') {
class IndustryTemplateSelector {
    constructor() {
        this.selectedTemplate = null;
        this.templates = {
            healthcare: {
                name: 'Healthcare',
                icon: 'fa-hospital',
                description: 'FHIR compliance, ICD-10 validation, PHI handling',
                cleaningOptions: {
                    basic: ['FHIR format validation', 'ICD-10 code verification', 'Patient ID deduplication'],
                    advanced: ['PHI de-identification', 'Medical terminology standardization', 'Clinical data validation'],
                    aiPowered: ['Medical entity recognition', 'Diagnosis code prediction', 'Treatment pathway optimization']
                },
                dataTypes: ['Patient Records', 'Lab Results', 'Claims Data', 'Clinical Trials'],
                regulations: ['HIPAA', 'FHIR', 'HL7', 'ICD-10']
            },
            finance: {
                name: 'Finance',
                icon: 'fa-chart-line',
                description: 'AML compliance, fraud detection, SOX validation',
                cleaningOptions: {
                    basic: ['Transaction validation', 'Account number verification', 'Currency standardization'],
                    advanced: ['AML pattern detection', 'Fraud risk scoring', 'Regulatory compliance checks'],
                    aiPowered: ['Anomaly detection', 'Risk prediction models', 'Compliance automation']
                },
                dataTypes: ['Transactions', 'Account Data', 'Trading Records', 'Risk Metrics'],
                regulations: ['SOX', 'AML', 'KYC', 'GDPR']
            },
            insurance: {
                name: 'Insurance',
                icon: 'fa-shield-alt',
                description: 'Claims processing, actuarial models, risk assessment',
                cleaningOptions: {
                    basic: ['Policy number validation', 'Claims data standardization', 'Customer deduplication'],
                    advanced: ['Risk score calculation', 'Claims fraud detection', 'Actuarial data validation'],
                    aiPowered: ['Predictive underwriting', 'Claims automation', 'Risk modeling']
                },
                dataTypes: ['Policies', 'Claims', 'Underwriting Data', 'Risk Assessments'],
                regulations: ['NAIC', 'Solvency II', 'IFRS 17']
            },
            retail: {
                name: 'Retail',
                icon: 'fa-shopping-cart',
                description: 'Product catalogs, inventory management, customer analytics',
                cleaningOptions: {
                    basic: ['SKU validation', 'Price standardization', 'Product categorization'],
                    advanced: ['Inventory optimization', 'Customer segmentation', 'Sales pattern analysis'],
                    aiPowered: ['Demand forecasting', 'Personalization models', 'Dynamic pricing']
                },
                dataTypes: ['Product Catalogs', 'Inventory', 'Sales Data', 'Customer Data'],
                regulations: ['PCI DSS', 'CCPA', 'GDPR']
            },
            manufacturing: {
                name: 'Manufacturing',
                icon: 'fa-industry',
                description: 'Supply chain, quality control, production analytics',
                cleaningOptions: {
                    basic: ['BOM validation', 'Part number standardization', 'Supplier data cleaning'],
                    advanced: ['Quality metrics analysis', 'Supply chain optimization', 'Production efficiency'],
                    aiPowered: ['Predictive maintenance', 'Quality prediction', 'Supply chain forecasting']
                },
                dataTypes: ['Bill of Materials', 'Production Data', 'Quality Metrics', 'Supply Chain'],
                regulations: ['ISO 9001', 'Six Sigma', 'Industry 4.0']
            },
            custom: {
                name: 'Custom',
                icon: 'fa-cog',
                description: 'Build your own template from scratch',
                cleaningOptions: {
                    basic: ['Custom validation rules', 'User-defined transformations', 'Flexible deduplication'],
                    advanced: ['Custom ML models', 'Advanced pattern matching', 'Complex transformations'],
                    aiPowered: ['Custom AI pipelines', 'Transfer learning', 'Domain adaptation']
                },
                dataTypes: ['Any data type'],
                regulations: ['User-defined']
            }
        };
        this.onTemplateSelect = null; // Callback function
    }

    initialize(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('IndustryTemplateSelector: Container not found');
            return;
        }

        this.onTemplateSelect = options.onTemplateSelect || null;
        this.selectedTemplate = options.defaultTemplate || null;

        this.render();
        this.setupEventListeners();
    }

    render() {
        // Component is loaded via HTML, just update if needed
        if (this.selectedTemplate) {
            this.selectTemplate(this.selectedTemplate);
        }
    }

    setupEventListeners() {
        // Template card clicks
        const templateCards = this.container.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.select-template-btn')) {
                    const industry = card.getAttribute('data-industry');
                    this.highlightCard(industry);
                }
            });
        });

        // Select template buttons
        const selectButtons = this.container.querySelectorAll('.select-template-btn');
        selectButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const industry = button.getAttribute('data-industry');
                this.selectTemplate(industry);
            });
        });

        // Change template button
        const changeBtn = this.container.querySelector('#changeTemplateBtn');
        if (changeBtn) {
            changeBtn.addEventListener('click', () => {
                this.showTemplateGrid();
            });
        }
    }

    highlightCard(industry) {
        // Remove all selections
        const cards = this.container.querySelectorAll('.template-card');
        cards.forEach(card => card.classList.remove('selected'));

        // Add selection to clicked card
        const selectedCard = this.container.querySelector(`.template-card[data-industry="${industry}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }

    selectTemplate(industry) {
        this.selectedTemplate = industry;
        this.highlightCard(industry);

        // Show preview
        this.showTemplatePreview(industry);

        // Trigger callback
        if (this.onTemplateSelect) {
            this.onTemplateSelect(industry, this.templates[industry]);
        }

        // Show notification
        this.showNotification(`${this.templates[industry].name} template selected`, 'success');
    }

    showTemplatePreview(industry) {
        const template = this.templates[industry];
        const preview = this.container.querySelector('#selectedTemplatePreview');
        const previewContent = this.container.querySelector('#previewContent');
        const templateName = this.container.querySelector('#selectedTemplateName');

        if (!preview || !template) return;

        // Update template name
        templateName.textContent = template.name;

        // Generate preview content
        previewContent.innerHTML = `
            <div class="preview-section">
                <h5><i class="fas fa-check-square"></i> Cleaning Options</h5>
                <div class="preview-options">
                    <strong>Basic Tier:</strong>
                    ${template.cleaningOptions.basic.map(opt => `
                        <div class="preview-option">
                            <input type="checkbox" checked disabled>
                            <label>${opt}</label>
                        </div>
                    `).join('')}
                </div>
                <div class="preview-options" style="margin-top: var(--spacing-medium);">
                    <strong>Advanced Tier:</strong>
                    ${template.cleaningOptions.advanced.map(opt => `
                        <div class="preview-option">
                            <input type="checkbox" checked disabled>
                            <label>${opt}</label>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="preview-section">
                <h5><i class="fas fa-database"></i> Supported Data Types</h5>
                <div class="preview-options">
                    ${template.dataTypes.map(type => `
                        <div class="preview-option">
                            <i class="fas fa-file-alt" style="color: var(--primary-color);"></i>
                            <span>${type}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="preview-section">
                <h5><i class="fas fa-shield-alt"></i> Compliance & Regulations</h5>
                <div class="preview-options">
                    ${template.regulations.map(reg => `
                        <div class="preview-option">
                            <i class="fas fa-certificate" style="color: var(--success-color);"></i>
                            <span>${reg}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Show preview and hide grid
        preview.style.display = 'block';
        this.container.querySelector('.template-grid').style.display = 'none';
    }

    showTemplateGrid() {
        const preview = this.container.querySelector('#selectedTemplatePreview');
        const grid = this.container.querySelector('.template-grid');

        preview.style.display = 'none';
        grid.style.display = 'grid';

        // Clear selection
        this.selectedTemplate = null;
        const cards = this.container.querySelectorAll('.template-card');
        cards.forEach(card => card.classList.remove('selected'));
    }

    getSelectedTemplate() {
        return this.selectedTemplate ? {
            industry: this.selectedTemplate,
            ...this.templates[this.selectedTemplate]
        } : null;
    }

    getCleaningOptions(tier = 'basic') {
        if (!this.selectedTemplate) return [];
        
        const template = this.templates[this.selectedTemplate];
        return template.cleaningOptions[tier] || [];
    }

    applyTemplateSettings(settings) {
        // Apply template-specific settings to the cleaning configuration
        console.log('Applying template settings:', settings);
        
        // This would integrate with the data cleaning configuration
        if (window.dataCleaningPage) {
            window.dataCleaningPage.applyTemplateSettings(settings);
        }
    }

    showNotification(message, type = 'info') {
        // Use global notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    destroy() {
        // Clean up event listeners
        const templateCards = this.container.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.replaceWith(card.cloneNode(true));
        });
    }
}

// Export for use
window.IndustryTemplateSelector = IndustryTemplateSelector;
} // End of if (typeof IndustryTemplateSelector === 'undefined')