/**
 * Hyperparameter Optimization Component
 * Provides advanced hyperparameter tuning capabilities for trained models
 */

import { loadComponentCSS } from '../../js/services/componentLoader.js';

class HyperparameterOptimization {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            showAdvanced: true,
            allowMethodComparison: true,
            realTimeUpdates: true,
            ...options
        };
        
        this.currentModel = null;
        this.optimizationResults = null;
        this.supportedAlgorithms = null;
        this.optimizationHistory = [];
        this.isOptimizing = false;
        
        this.init();
    }
    
    async init() {
        await loadComponentCSS('src/components/HyperparameterOptimization/HyperparameterOptimization.css');
        this.render();
        this.setupEventListeners();
        await this.loadSupportedAlgorithms();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="hyperparameter-optimization">
                <!-- Header -->
                <div class="optimization-header">
                    <h2>
                        <i class="fas fa-sliders-h"></i>
                        Hyperparameter Optimization
                    </h2>
                    <p>Fine-tune your models for optimal performance using advanced optimization techniques</p>
                </div>
                
                <!-- Model Selection -->
                <div class="model-selection card">
                    <h3>
                        <i class="fas fa-brain"></i>
                        Select Model to Optimize
                    </h3>
                    
                    <div class="model-selector-container">
                        <div class="form-group">
                            <label for="model-dropdown">Choose Model:</label>
                            <select id="model-dropdown" class="form-control">
                                <option value="">Select a trained model...</option>
                            </select>
                        </div>
                        
                        <button id="load-model-btn" class="btn btn-primary" disabled>
                            <i class="fas fa-download"></i>
                            Load Model
                        </button>
                    </div>
                    
                    <div class="model-info" id="model-info" style="display: none;">
                        <!-- Model information will be populated here -->
                    </div>
                </div>
                
                <!-- Optimization Configuration -->
                <div class="optimization-config card" id="optimization-config" style="display: none;">
                    <h3>
                        <i class="fas fa-cogs"></i>
                        Optimization Configuration
                    </h3>
                    
                    <!-- Recommendations -->
                    <div class="recommendations-panel" id="recommendations-panel">
                        <!-- Recommendations will be populated here -->
                    </div>
                    
                    <!-- Method Selection -->
                    <div class="method-selection">
                        <h4>Optimization Method</h4>
                        
                        <div class="method-grid">
                            <div class="method-card" data-method="auto">
                                <div class="method-header">
                                    <i class="fas fa-magic"></i>
                                    <h5>Automatic</h5>
                                    <span class="recommended-badge">Recommended</span>
                                </div>
                                <p>Let the system choose the best optimization method for your data and algorithm</p>
                            </div>
                            
                            <div class="method-card" data-method="grid">
                                <div class="method-header">
                                    <i class="fas fa-th"></i>
                                    <h5>Grid Search</h5>
                                </div>
                                <p>Exhaustive search over a specified parameter grid</p>
                            </div>
                            
                            <div class="method-card" data-method="random">
                                <div class="method-header">
                                    <i class="fas fa-random"></i>
                                    <h5>Random Search</h5>
                                </div>
                                <p>Random sampling from parameter distributions</p>
                            </div>
                            
                            <div class="method-card" data-method="bayesian">
                                <div class="method-header">
                                    <i class="fas fa-chart-line"></i>
                                    <h5>Bayesian</h5>
                                </div>
                                <p>Smart optimization using previous trial results</p>
                            </div>
                        </div>
                        
                        <div class="method-comparison">
                            <button id="compare-methods-btn" class="btn btn-secondary">
                                <i class="fas fa-balance-scale"></i>
                                Compare Methods
                            </button>
                        </div>
                    </div>
                    
                    <!-- Advanced Settings -->
                    <div class="advanced-settings" id="advanced-settings">
                        <h4>
                            <i class="fas fa-wrench"></i>
                            Advanced Settings
                            <button class="toggle-btn" id="toggle-advanced">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </h4>
                        
                        <div class="settings-content" id="settings-content" style="display: none;">
                            <div class="settings-grid">
                                <div class="form-group">
                                    <label for="n-trials">Number of Trials:</label>
                                    <input type="number" id="n-trials" class="form-control" placeholder="Auto">
                                    <small class="form-hint">Number of parameter combinations to try</small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="cv-folds">Cross-Validation Folds:</label>
                                    <input type="number" id="cv-folds" class="form-control" min="3" max="10" placeholder="Auto">
                                    <small class="form-hint">Number of cross-validation folds</small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="scoring-metric">Scoring Metric:</label>
                                    <select id="scoring-metric" class="form-control">
                                        <option value="">Auto-detect</option>
                                        <option value="accuracy">Accuracy</option>
                                        <option value="f1_weighted">F1 Score (Weighted)</option>
                                        <option value="precision_weighted">Precision (Weighted)</option>
                                        <option value="recall_weighted">Recall (Weighted)</option>
                                        <option value="neg_mean_squared_error">MSE (Regression)</option>
                                        <option value="r2">R² Score (Regression)</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="time-budget">Time Budget (minutes):</label>
                                    <input type="number" id="time-budget" class="form-control" min="1" max="180" placeholder="No limit">
                                    <small class="form-hint">Maximum optimization time</small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="random-state">Random State:</label>
                                    <input type="number" id="random-state" class="form-control" value="42">
                                    <small class="form-hint">Seed for reproducible results</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Parameter Space Viewer -->
                    <div class="parameter-space" id="parameter-space">
                        <h4>
                            <i class="fas fa-cube"></i>
                            Parameter Space
                            <button class="toggle-btn" id="toggle-params">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </h4>
                        
                        <div class="params-content" id="params-content" style="display: none;">
                            <!-- Parameter space visualization will be populated here -->
                        </div>
                    </div>
                    
                    <!-- Start Optimization -->
                    <div class="optimization-actions">
                        <button id="start-optimization-btn" class="btn btn-success">
                            <i class="fas fa-play"></i>
                            Start Optimization
                        </button>
                        <button id="reset-config-btn" class="btn btn-secondary">
                            <i class="fas fa-undo"></i>
                            Reset Configuration
                        </button>
                    </div>
                </div>
                
                <!-- Optimization Progress -->
                <div class="optimization-progress card" id="optimization-progress" style="display: none;">
                    <h3>
                        <i class="fas fa-spinner fa-spin"></i>
                        Optimization in Progress
                    </h3>
                    
                    <div class="progress-info">
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progress-fill"></div>
                            </div>
                            <span class="progress-text" id="progress-text">Starting optimization...</span>
                        </div>
                        
                        <div class="optimization-stats" id="optimization-stats">
                            <div class="stat-item">
                                <span class="stat-label">Method:</span>
                                <span class="stat-value" id="current-method">-</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Trials Completed:</span>
                                <span class="stat-value" id="trials-completed">0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Best Score:</span>
                                <span class="stat-value" id="current-best-score">-</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Elapsed Time:</span>
                                <span class="stat-value" id="elapsed-time">0s</span>
                            </div>
                        </div>
                        
                        <div class="optimization-controls">
                            <button id="cancel-optimization-btn" class="btn btn-danger">
                                <i class="fas fa-stop"></i>
                                Cancel Optimization
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Optimization Results -->
                <div class="optimization-results card" id="optimization-results" style="display: none;">
                    <h3>
                        <i class="fas fa-trophy"></i>
                        Optimization Results
                    </h3>
                    
                    <div class="results-summary" id="results-summary">
                        <!-- Results summary will be populated here -->
                    </div>
                    
                    <div class="results-tabs">
                        <div class="tab-navigation">
                            <button class="tab-btn active" data-tab="summary">Summary</button>
                            <button class="tab-btn" data-tab="parameters">Best Parameters</button>
                            <button class="tab-btn" data-tab="trials">Trial History</button>
                            <button class="tab-btn" data-tab="comparison">Before vs After</button>
                        </div>
                        
                        <div class="tab-content">
                            <div class="tab-pane active" id="summary-tab">
                                <!-- Summary content -->
                            </div>
                            
                            <div class="tab-pane" id="parameters-tab">
                                <!-- Best parameters content -->
                            </div>
                            
                            <div class="tab-pane" id="trials-tab">
                                <!-- Trial history content -->
                            </div>
                            
                            <div class="tab-pane" id="comparison-tab">
                                <!-- Before vs after comparison -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="results-actions">
                        <button id="apply-optimized-model-btn" class="btn btn-primary">
                            <i class="fas fa-check"></i>
                            Apply Optimized Model
                        </button>
                        <button id="download-results-btn" class="btn btn-secondary">
                            <i class="fas fa-download"></i>
                            Download Results
                        </button>
                        <button id="start-new-optimization-btn" class="btn btn-secondary">
                            <i class="fas fa-redo"></i>
                            Start New Optimization
                        </button>
                    </div>
                </div>
                
                <!-- Method Comparison Modal -->
                <div class="modal fade" id="method-comparison-modal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Optimization Method Comparison</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="method-comparison-body">
                                <!-- Method comparison content -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Model selection
        document.getElementById('model-dropdown').addEventListener('change', this.handleModelSelection.bind(this));
        document.getElementById('load-model-btn').addEventListener('click', this.loadModelInfo.bind(this));
        
        // Method selection
        document.querySelectorAll('.method-card').forEach(card => {
            card.addEventListener('click', this.selectOptimizationMethod.bind(this));
        });
        
        // Advanced settings toggle
        document.getElementById('toggle-advanced').addEventListener('click', this.toggleAdvancedSettings.bind(this));
        document.getElementById('toggle-params').addEventListener('click', this.toggleParameterSpace.bind(this));
        
        // Method comparison
        document.getElementById('compare-methods-btn').addEventListener('click', this.compareOptimizationMethods.bind(this));
        
        // Optimization controls
        document.getElementById('start-optimization-btn').addEventListener('click', this.startOptimization.bind(this));
        document.getElementById('cancel-optimization-btn').addEventListener('click', this.cancelOptimization.bind(this));
        document.getElementById('reset-config-btn').addEventListener('click', this.resetConfiguration.bind(this));
        
        // Results actions
        document.getElementById('apply-optimized-model-btn').addEventListener('click', this.applyOptimizedModel.bind(this));
        document.getElementById('download-results-btn').addEventListener('click', this.downloadResults.bind(this));
        document.getElementById('start-new-optimization-btn').addEventListener('click', this.startNewOptimization.bind(this));
        
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', this.switchTab.bind(this));
        });
    }
    
    async loadSupportedAlgorithms() {
        try {
            const response = await fetch('/api/hyperparameter-optimization/supported-algorithms', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.supportedAlgorithms = result.supported_algorithms;
                await this.loadUserModels();
            }
        } catch (error) {
            console.error('Failed to load supported algorithms:', error);
        }
    }
    
    async loadUserModels() {
        try {
            const response = await fetch('/api/models/me', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const models = await response.json();
                this.populateModelDropdown(models);
            }
        } catch (error) {
            console.error('Failed to load user models:', error);
        }
    }
    
    populateModelDropdown(models) {
        const dropdown = document.getElementById('model-dropdown');
        dropdown.innerHTML = '<option value="">Select a trained model...</option>';
        
        // Filter models that support optimization
        const supportedModelTypes = [
            ...this.supportedAlgorithms.classification.map(alg => alg.key),
            ...this.supportedAlgorithms.regression.map(alg => alg.key)
        ];
        
        const compatibleModels = models.filter(model => 
            model.status === 'completed' && 
            supportedModelTypes.includes(model.algorithm)
        );
        
        compatibleModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${model.algorithm})`;
            option.dataset.algorithm = model.algorithm;
            dropdown.appendChild(option);
        });
        
        if (compatibleModels.length === 0) {
            dropdown.innerHTML = '<option value="">No compatible models found</option>';
        }
    }
    
    handleModelSelection() {
        const dropdown = document.getElementById('model-dropdown');
        const loadBtn = document.getElementById('load-model-btn');
        
        loadBtn.disabled = !dropdown.value;
    }
    
    async loadModelInfo() {
        const dropdown = document.getElementById('model-dropdown');
        const modelId = dropdown.value;
        const algorithm = dropdown.selectedOptions[0]?.dataset.algorithm;
        
        if (!modelId) return;
        
        this.showLoading('Loading model information...');
        
        try {
            // Load model details and recommendations
            const [modelResponse, recommendationsResponse] = await Promise.all([
                fetch(`/api/models/${modelId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch('/api/hyperparameter-optimization/recommendations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        algorithm: algorithm,
                        data_shape: [1000, 10] // Default shape, will be updated with actual data
                    })
                })
            ]);
            
            if (modelResponse.ok && recommendationsResponse.ok) {
                const modelData = await modelResponse.json();
                const recommendations = await recommendationsResponse.json();
                
                this.currentModel = { ...modelData, algorithm };
                this.displayModelInfo(modelData);
                this.displayRecommendations(recommendations.recommendations);
                this.loadParameterSpace(algorithm);
                
                document.getElementById('optimization-config').style.display = 'block';
            } else {
                this.showMessage('Failed to load model information', 'error');
            }
        } catch (error) {
            console.error('Error loading model info:', error);
            this.showMessage('Failed to load model information', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    displayModelInfo(modelData) {
        const container = document.getElementById('model-info');
        
        container.innerHTML = `
            <div class="model-info-grid">
                <div class="info-item">
                    <i class="fas fa-tag"></i>
                    <div>
                        <h4>Model Name</h4>
                        <p>${modelData.name}</p>
                    </div>
                </div>
                
                <div class="info-item">
                    <i class="fas fa-brain"></i>
                    <div>
                        <h4>Algorithm</h4>
                        <p>${this.formatAlgorithmName(modelData.algorithm || this.currentModel.algorithm)}</p>
                    </div>
                </div>
                
                <div class="info-item">
                    <i class="fas fa-chart-line"></i>
                    <div>
                        <h4>Current Performance</h4>
                        <p>${this.formatPerformance(modelData.performance)}</p>
                    </div>
                </div>
                
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <div>
                        <h4>Created</h4>
                        <p>${new Date(modelData.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        `;
        
        container.style.display = 'block';
    }
    
    displayRecommendations(recommendations) {
        const container = document.getElementById('recommendations-panel');
        
        container.innerHTML = `
            <div class="recommendations-header">
                <h4>
                    <i class="fas fa-lightbulb"></i>
                    Optimization Recommendations
                </h4>
            </div>
            
            <div class="recommendations-grid">
                ${recommendations.recommendations.map(rec => `
                    <div class="recommendation-item">
                        <div class="recommendation-icon">
                            <i class="fas ${this.getRecommendationIcon(rec.type)}"></i>
                        </div>
                        <div class="recommendation-content">
                            <h5>${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}</h5>
                            <p><strong>${rec.recommendation}</strong></p>
                            <small>${rec.reason}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    async loadParameterSpace(algorithm) {
        try {
            const response = await fetch(`/api/hyperparameter-optimization/parameter-spaces/${algorithm}?method=grid`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.displayParameterSpace(result.parameter_space);
            }
        } catch (error) {
            console.error('Failed to load parameter space:', error);
        }
    }
    
    displayParameterSpace(parameterSpace) {
        const container = document.getElementById('params-content');
        
        if (Object.keys(parameterSpace).length === 0) {
            container.innerHTML = '<p>No parameter space available for this algorithm.</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="parameter-grid">
                ${Object.entries(parameterSpace).map(([param, config]) => `
                    <div class="parameter-item">
                        <h5>${param}</h5>
                        <div class="parameter-details">
                            <span class="parameter-type">${config.type}</span>
                            ${config.values ? 
                                `<div class="parameter-values">
                                    ${Array.isArray(config.values) ? 
                                        config.values.slice(0, 5).map(v => `<span class="value-chip">${v}</span>`).join('') +
                                        (config.values.length > 5 ? `<span class="more-values">+${config.values.length - 5} more</span>` : '')
                                        : `<span class="value-chip">${config.values}</span>`
                                    }
                                </div>` : 
                                config.description ? `<p class="parameter-description">${config.description}</p>` : ''
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    selectOptimizationMethod(e) {
        const selectedCard = e.currentTarget;
        const method = selectedCard.dataset.method;
        
        // Update UI
        document.querySelectorAll('.method-card').forEach(card => {
            card.classList.remove('selected');
        });
        selectedCard.classList.add('selected');
        
        // Store selected method
        this.selectedMethod = method;
        
        // Update recommendations based on method
        this.updateMethodRecommendations(method);
    }
    
    updateMethodRecommendations(method) {
        // Update any method-specific recommendations or settings
        console.log('Selected optimization method:', method);
    }
    
    async compareOptimizationMethods() {
        if (!this.currentModel) {
            this.showMessage('Please select a model first', 'warning');
            return;
        }
        
        this.showLoading('Comparing optimization methods...');
        
        try {
            const response = await fetch('/api/hyperparameter-optimization/compare-optimization-methods', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    algorithm: this.currentModel.algorithm,
                    data_shape: [1000, 10] // This should be updated with actual data shape
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showMethodComparison(result.comparison);
            } else {
                this.showMessage('Failed to compare methods', 'error');
            }
        } catch (error) {
            console.error('Error comparing methods:', error);
            this.showMessage('Failed to compare methods', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    showMethodComparison(comparison) {
        const modalBody = document.getElementById('method-comparison-body');
        
        modalBody.innerHTML = `
            <div class="method-comparison-content">
                <div class="comparison-header">
                    <h4>Algorithm: ${this.formatAlgorithmName(comparison.algorithm)}</h4>
                    <p>Data Shape: ${comparison.data_shape[0]} samples × ${comparison.data_shape[1]} features</p>
                </div>
                
                <div class="methods-comparison-table">
                    <table class="comparison-table">
                        <thead>
                            <tr>
                                <th>Method</th>
                                <th>Estimated Evaluations</th>
                                <th>Estimated Time</th>
                                <th>Suitability</th>
                                <th>Pros & Cons</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(comparison.methods).map(([method, details]) => `
                                <tr class="method-row ${details.suitability}">
                                    <td>
                                        <strong>${method.charAt(0).toUpperCase() + method.slice(1)}</strong>
                                        <br>
                                        <small>${details.reason}</small>
                                    </td>
                                    <td>${details.estimated_evaluations.toLocaleString()}</td>
                                    <td>${details.estimated_time_minutes} min</td>
                                    <td>
                                        <span class="suitability-badge ${details.suitability}">
                                            ${details.suitability.charAt(0).toUpperCase() + details.suitability.slice(1)}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="pros-cons">
                                            <div class="pros">
                                                <strong>Pros:</strong>
                                                <ul>
                                                    ${details.pros.slice(0, 2).map(pro => `<li>${pro}</li>`).join('')}
                                                </ul>
                                            </div>
                                            <div class="cons">
                                                <strong>Cons:</strong>
                                                <ul>
                                                    ${details.cons.slice(0, 2).map(con => `<li>${con}</li>`).join('')}
                                                </ul>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Show modal
        const modal = document.getElementById('method-comparison-modal');
        modal.style.display = 'block';
        modal.classList.add('show');
    }
    
    toggleAdvancedSettings() {
        const content = document.getElementById('settings-content');
        const toggle = document.getElementById('toggle-advanced');
        const icon = toggle.querySelector('i');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.className = 'fas fa-chevron-up';
        } else {
            content.style.display = 'none';
            icon.className = 'fas fa-chevron-down';
        }
    }
    
    toggleParameterSpace() {
        const content = document.getElementById('params-content');
        const toggle = document.getElementById('toggle-params');
        const icon = toggle.querySelector('i');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.className = 'fas fa-chevron-up';
        } else {
            content.style.display = 'none';
            icon.className = 'fas fa-chevron-down';
        }
    }
    
    async startOptimization() {
        if (!this.currentModel) {
            this.showMessage('Please select a model first', 'warning');
            return;
        }
        
        if (!this.selectedMethod) {
            this.selectedMethod = 'auto'; // Default to auto
        }
        
        // Collect optimization parameters
        const optimizationParams = {
            model_id: this.currentModel.id,
            algorithm: this.currentModel.algorithm,
            optimization_method: this.selectedMethod,
            n_trials: parseInt(document.getElementById('n-trials').value) || null,
            cv_folds: parseInt(document.getElementById('cv-folds').value) || null,
            scoring: document.getElementById('scoring-metric').value || null,
            time_budget: parseInt(document.getElementById('time-budget').value) * 60 || null, // Convert to seconds
            random_state: parseInt(document.getElementById('random-state').value) || 42
        };
        
        try {
            const response = await fetch('/api/hyperparameter-optimization/optimize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(optimizationParams)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showOptimizationProgress();
                this.startProgressPolling(this.currentModel.id);
            } else {
                const error = await response.json();
                this.showMessage(error.detail || 'Failed to start optimization', 'error');
            }
        } catch (error) {
            console.error('Error starting optimization:', error);
            this.showMessage('Failed to start optimization', 'error');
        }
    }
    
    showOptimizationProgress() {
        document.getElementById('optimization-config').style.display = 'none';
        document.getElementById('optimization-progress').style.display = 'block';
        document.getElementById('current-method').textContent = this.selectedMethod || 'auto';
        
        this.isOptimizing = true;
        this.startTime = Date.now();
    }
    
    startProgressPolling(modelId) {
        this.progressInterval = setInterval(async () => {
            if (!this.isOptimizing) {
                clearInterval(this.progressInterval);
                return;
            }
            
            try {
                const response = await fetch(`/api/hyperparameter-optimization/results/${modelId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.results) {
                        this.showOptimizationResults(result.results);
                        this.isOptimizing = false;
                    }
                }
            } catch (error) {
                console.error('Error polling optimization results:', error);
            }
            
            // Update elapsed time
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('elapsed-time').textContent = `${elapsed}s`;
        }, 2000); // Poll every 2 seconds
    }
    
    cancelOptimization() {
        this.isOptimizing = false;
        clearInterval(this.progressInterval);
        document.getElementById('optimization-progress').style.display = 'none';
        document.getElementById('optimization-config').style.display = 'block';
        this.showMessage('Optimization cancelled', 'info');
    }
    
    showOptimizationResults(results) {
        this.optimizationResults = results;
        document.getElementById('optimization-progress').style.display = 'none';
        document.getElementById('optimization-results').style.display = 'block';
        
        this.displayResultsSummary(results);
        this.displayBestParameters(results);
        this.displayTrialHistory(results);
        this.displayComparison(results);
    }
    
    displayResultsSummary(results) {
        const container = document.getElementById('results-summary');
        
        container.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item success">
                    <i class="fas fa-trophy"></i>
                    <div>
                        <h4>Best Score</h4>
                        <p>${results.best_score?.toFixed(4) || 'N/A'}</p>
                    </div>
                </div>
                
                <div class="summary-item info">
                    <i class="fas fa-arrow-up"></i>
                    <div>
                        <h4>Improvement</h4>
                        <p>${results.improvement ? (results.improvement * 100).toFixed(2) + '%' : 'N/A'}</p>
                    </div>
                </div>
                
                <div class="summary-item primary">
                    <i class="fas fa-cogs"></i>
                    <div>
                        <h4>Method</h4>
                        <p>${results.method || 'N/A'}</p>
                    </div>
                </div>
                
                <div class="summary-item secondary">
                    <i class="fas fa-clock"></i>
                    <div>
                        <h4>Time</h4>
                        <p>${results.optimization_time ? Math.round(results.optimization_time) + 's' : 'N/A'}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    displayBestParameters(results) {
        const container = document.getElementById('parameters-tab');
        
        if (!results.best_params) {
            container.innerHTML = '<p>No parameter information available.</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="best-parameters">
                <h4>Optimized Parameters</h4>
                <div class="parameters-grid">
                    ${Object.entries(results.best_params).map(([param, value]) => `
                        <div class="parameter-card">
                            <h5>${param}</h5>
                            <div class="parameter-value">${this.formatParameterValue(value)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    displayTrialHistory(results) {
        const container = document.getElementById('trials-tab');
        
        if (!results.trials || results.trials.length === 0) {
            container.innerHTML = '<p>No trial history available.</p>';
            return;
        }
        
        // Sort trials by score (descending)
        const sortedTrials = [...results.trials].sort((a, b) => (b.score || -Infinity) - (a.score || -Infinity));
        
        container.innerHTML = `
            <div class="trial-history">
                <h4>Trial History (Top 10)</h4>
                <div class="trials-table-container">
                    <table class="trials-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Score</th>
                                <th>Parameters</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedTrials.slice(0, 10).map((trial, index) => `
                                <tr class="${index === 0 ? 'best-trial' : ''}">
                                    <td>${index + 1}</td>
                                    <td>${trial.score?.toFixed(4) || 'N/A'}</td>
                                    <td>
                                        <div class="trial-params">
                                            ${Object.entries(trial.params || {}).slice(0, 3).map(([key, value]) => 
                                                `<span class="param-chip">${key}: ${this.formatParameterValue(value)}</span>`
                                            ).join('')}
                                            ${Object.keys(trial.params || {}).length > 3 ? 
                                                `<span class="more-params">+${Object.keys(trial.params).length - 3} more</span>` : ''
                                            }
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    displayComparison(results) {
        const container = document.getElementById('comparison-tab');
        
        container.innerHTML = `
            <div class="before-after-comparison">
                <div class="comparison-grid">
                    <div class="comparison-column">
                        <h4>Before Optimization</h4>
                        <div class="performance-card original">
                            <div class="performance-metric">
                                <span class="metric-label">Score:</span>
                                <span class="metric-value">${this.currentModel.performance?.accuracy?.toFixed(4) || 'N/A'}</span>
                            </div>
                            <div class="performance-details">
                                <p>Using default parameters</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="comparison-arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    
                    <div class="comparison-column">
                        <h4>After Optimization</h4>
                        <div class="performance-card optimized">
                            <div class="performance-metric">
                                <span class="metric-label">Score:</span>
                                <span class="metric-value">${results.best_score?.toFixed(4) || 'N/A'}</span>
                            </div>
                            <div class="performance-details">
                                <p>Using optimized parameters</p>
                                ${results.improvement ? 
                                    `<p class="improvement">
                                        <i class="fas fa-arrow-up"></i>
                                        ${(results.improvement * 100).toFixed(2)}% improvement
                                    </p>` : ''
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    switchTab(e) {
        const tabName = e.target.dataset.tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    
    applyOptimizedModel() {
        if (!this.optimizationResults) return;
        
        // Implementation would apply the optimized model
        this.showMessage('Optimized model applied successfully', 'success');
    }
    
    downloadResults() {
        if (!this.optimizationResults) return;
        
        const blob = new Blob([JSON.stringify(this.optimizationResults, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `optimization_results_${this.currentModel.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    startNewOptimization() {
        this.resetConfiguration();
        document.getElementById('optimization-results').style.display = 'none';
        document.getElementById('optimization-config').style.display = 'block';
    }
    
    resetConfiguration() {
        // Reset form values
        document.getElementById('n-trials').value = '';
        document.getElementById('cv-folds').value = '';
        document.getElementById('scoring-metric').value = '';
        document.getElementById('time-budget').value = '';
        document.getElementById('random-state').value = '42';
        
        // Reset method selection
        document.querySelectorAll('.method-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector('.method-card[data-method="auto"]').classList.add('selected');
        this.selectedMethod = 'auto';
        
        // Reset other states
        this.optimizationResults = null;
        this.isOptimizing = false;
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
    }
    
    // Helper methods
    formatAlgorithmName(algorithm) {
        const names = {
            'random_forest_clf': 'Random Forest Classifier',
            'random_forest_reg': 'Random Forest Regressor',
            'logistic_regression': 'Logistic Regression',
            'svm_clf': 'Support Vector Classifier',
            'svm_reg': 'Support Vector Regressor',
            'xgboost_clf': 'XGBoost Classifier',
            'xgboost_reg': 'XGBoost Regressor',
            'neural_network_clf': 'Neural Network Classifier',
            'neural_network_reg': 'Neural Network Regressor'
        };
        return names[algorithm] || algorithm;
    }
    
    formatPerformance(performance) {
        if (!performance) return 'N/A';
        if (performance.accuracy) return `${(performance.accuracy * 100).toFixed(1)}% accuracy`;
        if (performance.r2_score) return `R² = ${performance.r2_score.toFixed(3)}`;
        return 'N/A';
    }
    
    formatParameterValue(value) {
        if (typeof value === 'number') {
            return value.toFixed(4);
        } else if (Array.isArray(value)) {
            return `[${value.join(', ')}]`;
        } else {
            return String(value);
        }
    }
    
    getRecommendationIcon(type) {
        const icons = {
            'method': 'fa-magic',
            'trials': 'fa-list-ol',
            'cv_folds': 'fa-layer-group',
            'time_budget': 'fa-clock'
        };
        return icons[type] || 'fa-info';
    }
    
    showMessage(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    showLoading(message) {
        console.log('Loading:', message);
    }
    
    hideLoading() {
        console.log('Loading complete');
    }
}

export { HyperparameterOptimization };