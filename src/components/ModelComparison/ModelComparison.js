/**
 * Model Comparison Component
 * Allows users to compare multiple trained models side-by-side
 */

import { loadComponentCSS } from '../../js/services/componentLoader.js';

class ModelComparison {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            maxModels: 4,
            showCharts: true,
            showMetrics: true,
            showFeatureImportance: true,
            ...options
        };
        
        this.selectedModels = [];
        this.comparisonData = null;
        this.charts = {};
        
        this.init();
    }
    
    async init() {
        await loadComponentCSS('src/components/ModelComparison/ModelComparison.css');
        this.render();
        this.setupEventListeners();
        await this.loadAvailableModels();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="model-comparison">
                <!-- Header -->
                <div class="comparison-header">
                    <h2>Model Comparison</h2>
                    <p>Compare performance and characteristics of different models</p>
                    
                    <div class="comparison-controls">
                        <div class="model-selector">
                            <label for="model-selector-dropdown">Add Model to Comparison:</label>
                            <select id="model-selector-dropdown" class="form-control">
                                <option value="">Select a model...</option>
                            </select>
                            <button id="add-model-btn" class="btn btn-primary" disabled>
                                <i class="fas fa-plus"></i> Add Model
                            </button>
                        </div>
                        
                        <div class="comparison-actions">
                            <button id="clear-comparison-btn" class="btn btn-secondary">
                                <i class="fas fa-trash"></i> Clear All
                            </button>
                            <button id="export-comparison-btn" class="btn btn-secondary">
                                <i class="fas fa-download"></i> Export Report
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Selected Models -->
                <div class="selected-models" id="selected-models">
                    <div class="no-models-message">
                        <i class="fas fa-chart-bar"></i>
                        <h3>No Models Selected</h3>
                        <p>Select models from the dropdown above to start comparing</p>
                    </div>
                </div>
                
                <!-- Comparison Content -->
                <div class="comparison-content" id="comparison-content" style="display: none;">
                    <!-- Quick Summary -->
                    <div class="comparison-summary card">
                        <h3>Quick Summary</h3>
                        <div class="summary-grid" id="summary-grid">
                            <!-- Summary will be populated by JavaScript -->
                        </div>
                    </div>
                    
                    <!-- Detailed Metrics -->
                    <div class="detailed-metrics card">
                        <h3>Detailed Metrics Comparison</h3>
                        <div class="metrics-table-container">
                            <table class="metrics-table" id="metrics-table">
                                <thead>
                                    <tr>
                                        <th>Metric</th>
                                        <!-- Model columns will be added dynamically -->
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Metrics rows will be populated by JavaScript -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Performance Charts -->
                    <div class="performance-charts card">
                        <h3>Performance Visualization</h3>
                        <div class="chart-controls">
                            <div class="chart-type-selector">
                                <label for="chart-type">Chart Type:</label>
                                <select id="chart-type" class="form-control">
                                    <option value="bar">Bar Chart</option>
                                    <option value="radar">Radar Chart</option>
                                    <option value="line">Line Chart</option>
                                </select>
                            </div>
                            <div class="metric-selector">
                                <label for="chart-metric">Metric:</label>
                                <select id="chart-metric" class="form-control">
                                    <option value="accuracy">Accuracy</option>
                                    <option value="precision">Precision</option>
                                    <option value="recall">Recall</option>
                                    <option value="f1_score">F1 Score</option>
                                    <option value="training_time">Training Time</option>
                                </select>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="performance-chart"></canvas>
                        </div>
                    </div>
                    
                    <!-- Feature Importance Comparison -->
                    <div class="feature-importance card">
                        <h3>Feature Importance Comparison</h3>
                        <div class="feature-charts-container" id="feature-charts-container">
                            <!-- Feature importance charts will be populated -->
                        </div>
                    </div>
                    
                    <!-- Configuration Comparison -->
                    <div class="configuration-comparison card">
                        <h3>Model Configuration</h3>
                        <div class="config-table-container">
                            <table class="config-table" id="config-table">
                                <thead>
                                    <tr>
                                        <th>Configuration</th>
                                        <!-- Model columns will be added dynamically -->
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Configuration rows will be populated -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Recommendations -->
                    <div class="recommendations card">
                        <h3>Recommendations</h3>
                        <div class="recommendation-content" id="recommendation-content">
                            <!-- AI-generated recommendations will be displayed -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Model selector
        const modelDropdown = document.getElementById('model-selector-dropdown');
        const addModelBtn = document.getElementById('add-model-btn');
        
        modelDropdown.addEventListener('change', () => {
            addModelBtn.disabled = !modelDropdown.value || this.selectedModels.length >= this.options.maxModels;
        });
        
        addModelBtn.addEventListener('click', () => {
            const modelId = modelDropdown.value;
            if (modelId && !this.selectedModels.find(m => m.id === modelId)) {
                this.addModelToComparison(modelId);
            }
        });
        
        // Actions
        document.getElementById('clear-comparison-btn').addEventListener('click', () => {
            this.clearComparison();
        });
        
        document.getElementById('export-comparison-btn').addEventListener('click', () => {
            this.exportComparison();
        });
        
        // Chart controls
        document.getElementById('chart-type').addEventListener('change', () => {
            this.updatePerformanceChart();
        });
        
        document.getElementById('chart-metric').addEventListener('change', () => {
            this.updatePerformanceChart();
        });
    }
    
    async loadAvailableModels() {
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
            console.error('Failed to load models:', error);
        }
    }
    
    populateModelDropdown(models) {
        const dropdown = document.getElementById('model-selector-dropdown');
        
        // Clear existing options (except first)
        while (dropdown.children.length > 1) {
            dropdown.removeChild(dropdown.lastChild);
        }
        
        // Add model options
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${model.type || 'Unknown'})`;
            dropdown.appendChild(option);
        });
    }
    
    async addModelToComparison(modelId) {
        if (this.selectedModels.length >= this.options.maxModels) {
            this.showMessage('Maximum number of models reached', 'warning');
            return;
        }
        
        try {
            // Fetch model details
            const modelData = await this.fetchModelData(modelId);
            
            if (modelData) {
                this.selectedModels.push(modelData);
                this.updateSelectedModelsDisplay();
                this.updateComparison();
                
                // Reset dropdown
                document.getElementById('model-selector-dropdown').value = '';
                document.getElementById('add-model-btn').disabled = true;
            }
        } catch (error) {
            console.error('Failed to add model:', error);
            this.showMessage('Failed to load model data', 'error');
        }
    }
    
    async fetchModelData(modelId) {
        try {
            // Fetch model details
            const modelResponse = await fetch(`/api/models/${modelId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!modelResponse.ok) {
                throw new Error('Failed to fetch model');
            }
            
            const model = await modelResponse.json();
            
            // Try to fetch training results if available
            let trainingResult = null;
            try {
                const resultResponse = await fetch(`/api/models/training-result/${model.job_id || modelId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (resultResponse.ok) {
                    trainingResult = await resultResponse.json();
                }
            } catch (e) {
                console.warn('No training result found for model:', modelId);
            }
            
            return {
                id: modelId,
                ...model,
                trainingResult
            };
        } catch (error) {
            console.error('Error fetching model data:', error);
            return null;
        }
    }
    
    removeModelFromComparison(modelId) {
        this.selectedModels = this.selectedModels.filter(m => m.id !== modelId);
        this.updateSelectedModelsDisplay();
        this.updateComparison();
        
        // Re-enable add button if under limit
        const addBtn = document.getElementById('add-model-btn');
        const dropdown = document.getElementById('model-selector-dropdown');
        addBtn.disabled = !dropdown.value || this.selectedModels.length >= this.options.maxModels;
    }
    
    updateSelectedModelsDisplay() {
        const container = document.getElementById('selected-models');
        
        if (this.selectedModels.length === 0) {
            container.innerHTML = `
                <div class="no-models-message">
                    <i class="fas fa-chart-bar"></i>
                    <h3>No Models Selected</h3>
                    <p>Select models from the dropdown above to start comparing</p>
                </div>
            `;
            document.getElementById('comparison-content').style.display = 'none';
            return;
        }
        
        container.innerHTML = `
            <div class="selected-models-grid">
                ${this.selectedModels.map(model => this.createModelCard(model)).join('')}
            </div>
        `;
        
        document.getElementById('comparison-content').style.display = 'block';
    }
    
    createModelCard(model) {
        const metrics = model.trainingResult?.metrics || {};
        const accuracy = metrics.accuracy || metrics.r2_score || 0;
        const trainingTime = model.trainingResult?.training_time_seconds || 0;
        
        return `
            <div class="model-card" data-model-id="${model.id}">
                <div class="model-card-header">
                    <h4>${model.name}</h4>
                    <button class="remove-model-btn" data-model-id="${model.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="model-card-content">
                    <div class="model-algorithm">
                        <span class="algorithm-badge">${model.algorithm || model.type || 'Unknown'}</span>
                    </div>
                    
                    <div class="model-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Accuracy:</span>
                            <span class="metric-value">${(accuracy * 100).toFixed(1)}%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Training Time:</span>
                            <span class="metric-value">${trainingTime.toFixed(1)}s</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Status:</span>
                            <span class="metric-value status-${model.status || 'unknown'}">${model.status || 'Unknown'}</span>
                        </div>
                    </div>
                    
                    <div class="model-actions">
                        <button class="btn btn-sm btn-secondary view-details-btn" data-model-id="${model.id}">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    updateComparison() {
        if (this.selectedModels.length < 2) {
            return;
        }
        
        this.updateSummaryGrid();
        this.updateMetricsTable();
        this.updateConfigurationTable();
        this.updatePerformanceChart();
        this.updateFeatureImportanceCharts();
        this.generateRecommendations();
        
        // Setup event listeners for new elements
        this.setupComparisonEventListeners();
    }
    
    setupComparisonEventListeners() {
        // Remove model buttons
        document.querySelectorAll('.remove-model-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modelId = e.target.closest('.remove-model-btn').dataset.modelId;
                this.removeModelFromComparison(modelId);
            });
        });
        
        // View details buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modelId = e.target.closest('.view-details-btn').dataset.modelId;
                this.showModelDetails(modelId);
            });
        });
    }
    
    updateSummaryGrid() {
        const grid = document.getElementById('summary-grid');
        
        // Find best performing model for each metric
        const bestAccuracy = this.findBestModel('accuracy');
        const bestTrainingTime = this.findBestModel('training_time', true); // Lower is better
        const bestF1Score = this.findBestModel('f1_score');
        
        grid.innerHTML = `
            <div class="summary-item">
                <div class="summary-icon">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="summary-content">
                    <h4>Best Accuracy</h4>
                    <p class="summary-model">${bestAccuracy?.name || 'N/A'}</p>
                    <p class="summary-value">${bestAccuracy ? (bestAccuracy.accuracy * 100).toFixed(1) + '%' : 'N/A'}</p>
                </div>
            </div>
            
            <div class="summary-item">
                <div class="summary-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="summary-content">
                    <h4>Fastest Training</h4>
                    <p class="summary-model">${bestTrainingTime?.name || 'N/A'}</p>
                    <p class="summary-value">${bestTrainingTime ? bestTrainingTime.training_time.toFixed(1) + 's' : 'N/A'}</p>
                </div>
            </div>
            
            <div class="summary-item">
                <div class="summary-icon">
                    <i class="fas fa-balance-scale"></i>
                </div>
                <div class="summary-content">
                    <h4>Best F1 Score</h4>
                    <p class="summary-model">${bestF1Score?.name || 'N/A'}</p>
                    <p class="summary-value">${bestF1Score ? bestF1Score.f1_score.toFixed(3) : 'N/A'}</p>
                </div>
            </div>
            
            <div class="summary-item">
                <div class="summary-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="summary-content">
                    <h4>Total Models</h4>
                    <p class="summary-model">Compared</p>
                    <p class="summary-value">${this.selectedModels.length}</p>
                </div>
            </div>
        `;
    }
    
    findBestModel(metric, lowerIsBetter = false) {
        let bestModel = null;
        let bestValue = lowerIsBetter ? Infinity : -Infinity;
        
        for (const model of this.selectedModels) {
            const metrics = model.trainingResult?.metrics || {};
            let value;
            
            if (metric === 'accuracy') {
                value = metrics.accuracy || metrics.r2_score || 0;
            } else if (metric === 'training_time') {
                value = model.trainingResult?.training_time_seconds || 0;
            } else {
                value = metrics[metric] || 0;
            }
            
            if ((lowerIsBetter && value < bestValue) || (!lowerIsBetter && value > bestValue)) {
                bestValue = value;
                bestModel = {
                    ...model,
                    [metric]: value
                };
            }
        }
        
        return bestModel;
    }
    
    updateMetricsTable() {
        const table = document.getElementById('metrics-table');
        const thead = table.querySelector('thead tr');
        const tbody = table.querySelector('tbody');
        
        // Clear existing content
        while (thead.children.length > 1) {
            thead.removeChild(thead.lastChild);
        }
        tbody.innerHTML = '';
        
        // Add model columns
        this.selectedModels.forEach(model => {
            const th = document.createElement('th');
            th.textContent = model.name;
            thead.appendChild(th);
        });
        
        // Add metric rows
        const metrics = ['accuracy', 'precision', 'recall', 'f1_score', 'training_time_seconds'];
        
        metrics.forEach(metric => {
            const row = document.createElement('tr');
            
            // Metric name
            const metricCell = document.createElement('td');
            metricCell.textContent = this.formatMetricName(metric);
            metricCell.className = 'metric-name';
            row.appendChild(metricCell);
            
            // Model values
            this.selectedModels.forEach(model => {
                const cell = document.createElement('td');
                const value = this.getMetricValue(model, metric);
                cell.textContent = this.formatMetricValue(metric, value);
                cell.className = 'metric-value';
                
                // Highlight best value
                if (this.isBestValue(metric, value)) {
                    cell.classList.add('best-value');
                }
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
    }
    
    getMetricValue(model, metric) {
        const metrics = model.trainingResult?.metrics || {};
        
        switch (metric) {
            case 'accuracy':
                return metrics.accuracy || metrics.r2_score || 0;
            case 'training_time_seconds':
                return model.trainingResult?.training_time_seconds || 0;
            default:
                return metrics[metric] || 0;
        }
    }
    
    formatMetricName(metric) {
        const names = {
            'accuracy': 'Accuracy',
            'precision': 'Precision',
            'recall': 'Recall',
            'f1_score': 'F1 Score',
            'training_time_seconds': 'Training Time'
        };
        return names[metric] || metric;
    }
    
    formatMetricValue(metric, value) {
        if (metric === 'training_time_seconds') {
            return value.toFixed(1) + 's';
        } else if (metric === 'accuracy') {
            return (value * 100).toFixed(1) + '%';
        } else {
            return value.toFixed(3);
        }
    }
    
    isBestValue(metric, value) {
        const allValues = this.selectedModels.map(model => this.getMetricValue(model, metric));
        
        if (metric === 'training_time_seconds') {
            return value === Math.min(...allValues);
        } else {
            return value === Math.max(...allValues);
        }
    }
    
    updateConfigurationTable() {
        const table = document.getElementById('config-table');
        const thead = table.querySelector('thead tr');
        const tbody = table.querySelector('tbody');
        
        // Clear existing content
        while (thead.children.length > 1) {
            thead.removeChild(thead.lastChild);
        }
        tbody.innerHTML = '';
        
        // Add model columns
        this.selectedModels.forEach(model => {
            const th = document.createElement('th');
            th.textContent = model.name;
            thead.appendChild(th);
        });
        
        // Configuration rows
        const configs = [
            'algorithm',
            'test_split',
            'random_seed',
            'cross_validation',
            'preprocessing_enabled',
            'hyperparameter_tuning'
        ];
        
        configs.forEach(config => {
            const row = document.createElement('tr');
            
            // Config name
            const configCell = document.createElement('td');
            configCell.textContent = this.formatConfigName(config);
            configCell.className = 'config-name';
            row.appendChild(configCell);
            
            // Model values
            this.selectedModels.forEach(model => {
                const cell = document.createElement('td');
                cell.textContent = this.getConfigValue(model, config);
                cell.className = 'config-value';
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
    }
    
    getConfigValue(model, config) {
        const trainingConfig = model.trainingResult?.config || {};
        
        switch (config) {
            case 'algorithm':
                return model.algorithm || model.type || 'Unknown';
            case 'test_split':
                return trainingConfig.training_config?.test_split || 'N/A';
            case 'random_seed':
                return trainingConfig.training_config?.random_seed || 'N/A';
            case 'cross_validation':
                return trainingConfig.training_config?.cross_validation || 'N/A';
            case 'preprocessing_enabled':
                return trainingConfig.preprocessing_config ? 'Yes' : 'No';
            case 'hyperparameter_tuning':
                return trainingConfig.optimization_config?.hyperparameter_tuning ? 'Yes' : 'No';
            default:
                return 'N/A';
        }
    }
    
    formatConfigName(config) {
        const names = {
            'algorithm': 'Algorithm',
            'test_split': 'Test Split',
            'random_seed': 'Random Seed',
            'cross_validation': 'Cross Validation',
            'preprocessing_enabled': 'Preprocessing',
            'hyperparameter_tuning': 'Hyperparameter Tuning'
        };
        return names[config] || config;
    }
    
    updatePerformanceChart() {
        if (this.selectedModels.length === 0) return;
        
        const chartType = document.getElementById('chart-type').value;
        const metric = document.getElementById('chart-metric').value;
        const canvas = document.getElementById('performance-chart');
        
        if (!canvas) return;
        
        // Destroy existing chart if it exists
        if (this.charts.performanceChart) {
            this.charts.performanceChart.destroy();
        }
        
        // Prepare data
        const labels = this.selectedModels.map(model => model.name);
        const data = this.selectedModels.map(model => {
            const value = this.getMetricValue(model, metric);
            // Convert percentages to 0-100 scale for better visualization
            if (metric === 'accuracy') {
                return value * 100;
            }
            return value;
        });
        
        // Color scheme for different models
        const colors = [
            '#4f46e5', '#06b6d4', '#10b981', '#f59e0b',
            '#ef4444', '#8b5cf6', '#f97316', '#84cc16'
        ];
        
        const backgroundColor = colors.slice(0, this.selectedModels.length);
        const borderColor = backgroundColor.map(color => color);
        
        let chartConfig = {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: this.formatMetricName(metric),
                    data: data,
                    backgroundColor: chartType === 'line' ? 'rgba(79, 70, 229, 0.1)' : backgroundColor,
                    borderColor: chartType === 'line' ? '#4f46e5' : borderColor,
                    borderWidth: 2,
                    fill: chartType === 'line' ? true : false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${this.formatMetricName(metric)} Comparison`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: chartType !== 'radar',
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y || context.parsed;
                                return `${context.dataset.label}: ${this.formatMetricValue(metric, metric === 'accuracy' ? value / 100 : value)}`;
                            }
                        }
                    }
                },
                scales: this.getChartScales(chartType, metric)
            }
        };
        
        // Special configuration for radar chart
        if (chartType === 'radar') {
            chartConfig = this.configureRadarChart(metric);
        }
        
        // Create new chart
        try {
            this.charts.performanceChart = new Chart(canvas, chartConfig);
        } catch (error) {
            console.error('Error creating chart:', error);
            this.showChartError(canvas.parentElement, 'Failed to create performance chart');
        }
    }
    
    getChartScales(chartType, metric) {
        if (chartType === 'radar') return {};
        
        const scales = {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: this.formatMetricName(metric)
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Models'
                }
            }
        };
        
        // Set appropriate scale limits based on metric
        if (metric === 'accuracy') {
            scales.y.max = 100;
            scales.y.ticks = {
                callback: function(value) {
                    return value + '%';
                }
            };
        } else if (metric === 'training_time_seconds') {
            scales.y.ticks = {
                callback: function(value) {
                    return value + 's';
                }
            };
        } else {
            scales.y.max = 1;
            scales.y.ticks = {
                callback: function(value) {
                    return value.toFixed(2);
                }
            };
        }
        
        return scales;
    }
    
    configureRadarChart(selectedMetric) {
        // For radar chart, show multiple metrics for comparison
        const metrics = ['accuracy', 'precision', 'recall', 'f1_score'];
        const datasets = this.selectedModels.map((model, index) => {
            const colors = [
                '#4f46e5', '#06b6d4', '#10b981', '#f59e0b',
                '#ef4444', '#8b5cf6', '#f97316', '#84cc16'
            ];
            
            const color = colors[index % colors.length];
            
            return {
                label: model.name,
                data: metrics.map(metric => {
                    const value = this.getMetricValue(model, metric);
                    return metric === 'accuracy' ? value * 100 : value * 100; // Scale all to 0-100
                }),
                backgroundColor: `${color}20`,
                borderColor: color,
                borderWidth: 2,
                pointBackgroundColor: color,
                pointBorderColor: '#ffffff',
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: color
            };
        });
        
        return {
            type: 'radar',
            data: {
                labels: metrics.map(m => this.formatMetricName(m)),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Multi-Metric Performance Comparison',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        };
    }
    
    showChartError(container, message) {
        container.innerHTML = `
            <div class="chart-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
    
    updateFeatureImportanceCharts() {
        const container = document.getElementById('feature-charts-container');
        
        if (!this.selectedModels.some(m => m.trainingResult?.feature_importance)) {
            container.innerHTML = '<p class="no-data">No feature importance data available</p>';
            return;
        }
        
        container.innerHTML = this.selectedModels.map(model => {
            if (!model.trainingResult?.feature_importance) {
                return `<div class="feature-chart-placeholder">No data for ${model.name}</div>`;
            }
            
            const importance = model.trainingResult.feature_importance;
            const sortedFeatures = Object.entries(importance)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            
            return `
                <div class="feature-chart">
                    <h4>${model.name}</h4>
                    <div class="feature-bars">
                        ${sortedFeatures.map(([feature, value]) => `
                            <div class="feature-bar">
                                <span class="feature-name">${feature}</span>
                                <div class="bar-container">
                                    <div class="bar-fill" style="width: ${(value * 100).toFixed(1)}%"></div>
                                </div>
                                <span class="feature-value">${value.toFixed(3)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    generateRecommendations() {
        const container = document.getElementById('recommendation-content');
        const recommendations = this.analyzeModels();
        
        container.innerHTML = `
            <div class="recommendations-list">
                ${recommendations.map(rec => `
                    <div class="recommendation-item ${rec.type}">
                        <div class="recommendation-icon">
                            <i class="fas ${rec.icon}"></i>
                        </div>
                        <div class="recommendation-text">
                            <h4>${rec.title}</h4>
                            <p>${rec.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    analyzeModels() {
        const recommendations = [];
        
        if (this.selectedModels.length < 2) {
            return recommendations;
        }
        
        // Find best and worst performers
        const bestAccuracy = this.findBestModel('accuracy');
        const worstAccuracy = this.selectedModels.reduce((worst, model) => {
            const accuracy = this.getMetricValue(model, 'accuracy');
            const worstAcc = this.getMetricValue(worst, 'accuracy');
            return accuracy < worstAcc ? model : worst;
        });
        
        // Performance gap analysis
        const bestAcc = this.getMetricValue(bestAccuracy, 'accuracy');
        const worstAcc = this.getMetricValue(worstAccuracy, 'accuracy');
        const gap = bestAcc - worstAcc;
        
        if (gap > 0.1) {
            recommendations.push({
                type: 'warning',
                icon: 'fa-exclamation-triangle',
                title: 'Large Performance Gap Detected',
                description: `There's a significant accuracy difference (${(gap * 100).toFixed(1)}%) between your best (${bestAccuracy.name}) and worst (${worstAccuracy.name}) performing models. Consider investigating the configuration differences.`
            });
        }
        
        // Training time analysis
        const fastestModel = this.findBestModel('training_time', true);
        const slowestModel = this.selectedModels.reduce((slowest, model) => {
            const time = this.getMetricValue(model, 'training_time_seconds');
            const slowestTime = this.getMetricValue(slowest, 'training_time_seconds');
            return time > slowestTime ? model : slowest;
        });
        
        const timeRatio = this.getMetricValue(slowestModel, 'training_time_seconds') / 
                         this.getMetricValue(fastestModel, 'training_time_seconds');
        
        if (timeRatio > 3) {
            recommendations.push({
                type: 'info',
                icon: 'fa-clock',
                title: 'Training Time Optimization Opportunity',
                description: `${fastestModel.name} trains ${timeRatio.toFixed(1)}x faster than ${slowestModel.name} with similar accuracy. Consider using faster algorithms for rapid prototyping.`
            });
        }
        
        // Algorithm diversity
        const algorithms = [...new Set(this.selectedModels.map(m => m.algorithm || m.type))];
        if (algorithms.length === 1) {
            recommendations.push({
                type: 'suggestion',
                icon: 'fa-lightbulb',
                title: 'Try Different Algorithms',
                description: 'All your models use the same algorithm. Consider experimenting with different algorithms like Random Forest, SVM, or Neural Networks to potentially improve performance.'
            });
        }
        
        // General recommendation
        recommendations.push({
            type: 'success',
            icon: 'fa-thumbs-up',
            title: 'Model Selection Recommendation',
            description: `Based on your comparison, ${bestAccuracy.name} offers the best accuracy at ${(bestAcc * 100).toFixed(1)}%. Consider this model for production deployment.`
        });
        
        return recommendations;
    }
    
    clearComparison() {
        this.selectedModels = [];
        this.updateSelectedModelsDisplay();
        
        // Reset controls
        document.getElementById('model-selector-dropdown').value = '';
        document.getElementById('add-model-btn').disabled = true;
    }
    
    exportComparison() {
        if (this.selectedModels.length === 0) {
            this.showMessage('No models to export', 'warning');
            return;
        }
        
        const report = {
            timestamp: new Date().toISOString(),
            models: this.selectedModels.map(model => ({
                id: model.id,
                name: model.name,
                algorithm: model.algorithm || model.type,
                metrics: model.trainingResult?.metrics || {},
                training_time: model.trainingResult?.training_time_seconds || 0,
                configuration: model.trainingResult?.config || {}
            })),
            recommendations: this.analyzeModels()
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `model_comparison_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage('Comparison report exported successfully', 'success');
    }
    
    showModelDetails(modelId) {
        const model = this.selectedModels.find(m => m.id === modelId);
        if (!model) return;
        
        // This would open a detailed modal or navigate to model details page
        console.log('Show details for model:', model);
        this.showMessage(`Viewing details for ${model.name}`, 'info');
    }
    
    showMessage(message, type = 'info') {
        // Simple message display - in production would use a proper notification system
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info'}-circle"></i>
            ${message}
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            background: var(--${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'}-color);
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

export { ModelComparison };