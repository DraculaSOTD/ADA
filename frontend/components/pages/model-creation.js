// Model Creation Page Component

class ModelCreationPage extends BaseComponent {
    getDefaultProps() {
        return {
            apiService: null,
            wsManager: null
        };
    }

    getInitialState() {
        return {
            currentStep: 1,
            totalSteps: 5,
            modelData: {
                name: '',
                description: '',
                type: '',
                taskType: '',
                dataFile: null,
                columns: [],
                puCount: 10,
                settings: {}
            }
        };
    }

    async createHTML() {
        const { currentStep, totalSteps } = this.state;

        return `
            <div class="model-creation">
                <h1>Create New Model</h1>
                
                <div class="wizard">
                    <div class="wizard__progress">
                        ${this.createProgressSteps()}
                    </div>
                    
                    <div class="wizard__content">
                        ${this.getStepContent(currentStep)}
                    </div>
                    
                    <div class="wizard__actions">
                        <button class="btn btn--secondary" id="prev-step" ${currentStep === 1 ? 'disabled' : ''}>
                            Previous
                        </button>
                        <button class="btn btn--primary" id="next-step">
                            ${currentStep === totalSteps ? 'Create Model' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    createProgressSteps() {
        const steps = ['Basic Info', 'Data Upload', 'Processing', 'Settings', 'Review'];
        return steps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === this.state.currentStep;
            const isCompleted = stepNum < this.state.currentStep;
            
            return `
                <div class="wizard__step ${isActive ? 'wizard__step--active' : ''} ${isCompleted ? 'wizard__step--completed' : ''}">
                    <span class="wizard__step-number">${stepNum}</span>
                    <span class="wizard__step-label">${step}</span>
                </div>
            `;
        }).join('');
    }

    getStepContent(step) {
        switch(step) {
            case 1:
                return this.getBasicInfoStep();
            case 2:
                return this.getDataUploadStep();
            case 3:
                return this.getProcessingStep();
            case 4:
                return this.getSettingsStep();
            case 5:
                return this.getReviewStep();
            default:
                return '';
        }
    }

    getBasicInfoStep() {
        return `
            <div class="step-content">
                <h2>Basic Information</h2>
                <div class="form-group">
                    <label>Model Name</label>
                    <input type="text" class="form-control" id="model-name" placeholder="Enter model name">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="model-description" placeholder="Enter model description"></textarea>
                </div>
                <div class="form-group">
                    <label>Model Type</label>
                    <select class="form-control" id="model-type">
                        <option value="">Select model type</option>
                        <option value="neural_network">Neural Network</option>
                        <option value="random_forest">Random Forest</option>
                        <option value="svm">Support Vector Machine</option>
                    </select>
                </div>
            </div>
        `;
    }

    getDataUploadStep() {
        return `
            <div class="step-content">
                <h2>Upload Training Data</h2>
                <div class="upload-area">
                    <input type="file" id="data-file" accept=".csv,.json,.parquet">
                    <p>Drag and drop your file here or click to browse</p>
                </div>
                <div id="data-preview"></div>
            </div>
        `;
    }

    getProcessingStep() {
        return `
            <div class="step-content">
                <h2>Processing Configuration</h2>
                <div class="form-group">
                    <label>Processing Units (PUs)</label>
                    <input type="range" id="pu-slider" min="1" max="100" value="10">
                    <span id="pu-value">10 PUs</span>
                </div>
                <div class="cost-estimate">
                    <h3>Estimated Cost</h3>
                    <p id="cost-display">Calculating...</p>
                </div>
            </div>
        `;
    }

    getSettingsStep() {
        return `
            <div class="step-content">
                <h2>Model Settings</h2>
                <div id="dynamic-settings">
                    <!-- Dynamic settings based on model type -->
                </div>
            </div>
        `;
    }

    getReviewStep() {
        return `
            <div class="step-content">
                <h2>Review & Create</h2>
                <div class="review-summary">
                    <h3>Model Configuration Summary</h3>
                    <div id="config-summary"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('#next-step', 'click', () => this.nextStep());
        this.addEventListener('#prev-step', 'click', () => this.prevStep());
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.state.currentStep === this.state.totalSteps) {
                this.createModel();
            } else {
                this.setState({ currentStep: this.state.currentStep + 1 });
            }
        }
    }

    prevStep() {
        if (this.state.currentStep > 1) {
            this.setState({ currentStep: this.state.currentStep - 1 });
        }
    }

    validateCurrentStep() {
        // Add validation logic for each step
        return true;
    }

    async createModel() {
        try {
            const response = await this.props.apiService.post('/models/create', this.state.modelData);
            if (response.success) {
                window.app.showNotification('Model created successfully!', 'success');
                window.app.router.navigate('/models');
            }
        } catch (error) {
            window.app.showError('Failed to create model');
        }
    }
}

window.ModelCreationPage = ModelCreationPage;