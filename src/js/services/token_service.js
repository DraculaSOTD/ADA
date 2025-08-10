// Centralized Token Service for Platform-Wide Token Management
class TokenService {
    constructor() {
        // Token cost configurations per operation type
        this.operationCosts = {
            // Data Cleaning Operations
            cleaning: {
                basic: {
                    baseCost: 1, // per million rows
                    operations: {
                        deduplication: 0.2,
                        typeValidation: 0.2,
                        missingValues: 0.3,
                        formatStandard: 0.3
                    }
                },
                advanced: {
                    baseCost: 3, // per million rows
                    operations: {
                        anomalyDetection: 0.8,
                        fuzzyMatching: 0.7,
                        outlierDetection: 0.7,
                        columnMapping: 0.8
                    }
                },
                aiPowered: {
                    baseCost: 5, // per million rows
                    operations: {
                        gptCorrection: 1.5,
                        industryModels: 1.5,
                        predictiveQuality: 1.0,
                        syntheticGeneration: 1.0
                    }
                }
            },
            
            // Data Generation Operations
            generation: {
                methods: {
                    ctgan: 1.5,     // complexity multiplier
                    timegan: 2.5,   // complexity multiplier
                    vae: 1.2        // complexity multiplier
                },
                features: {
                    differentialPrivacy: 1.5,
                    hierarchicalRelations: 1.3,
                    multiTable: 1.4,
                    industryTemplate: 1.2
                }
            },
            
            // Model Operations
            model: {
                training: {
                    small: 10,      // < 10K rows
                    medium: 50,     // 10K - 100K rows
                    large: 200,     // 100K - 1M rows
                    xlarge: 1000    // > 1M rows
                },
                prediction: {
                    batch: 0.1,     // per 1K predictions
                    realtime: 0.5   // per 1K predictions
                }
            },
            
            // API Operations
            api: {
                standard: 0.01,     // per request
                complex: 0.05,      // per complex query
                streaming: 0.1      // per minute
            }
        };
        
        // Volume discount tiers
        this.volumeDiscounts = [
            { threshold: 10000, discount: 0 },        // No discount < 10K
            { threshold: 100000, discount: 0.15 },    // 15% off 10K-100K
            { threshold: 1000000, discount: 0.25 },   // 25% off 100K-1M
            { threshold: Infinity, discount: 0.35 }   // 35% off > 1M
        ];
    }
    
    // Calculate tokens for data cleaning operation
    calculateCleaningCost(rows, tier, operations = []) {
        const rowsInMillions = rows / 1000000;
        const tierConfig = this.operationCosts.cleaning[tier];
        
        if (!tierConfig) {
            console.error('Invalid cleaning tier:', tier);
            return 0;
        }
        
        let baseCost = tierConfig.baseCost * rowsInMillions;
        
        // Add operation-specific costs
        let operationMultiplier = 1;
        operations.forEach(op => {
            if (tierConfig.operations[op]) {
                operationMultiplier += tierConfig.operations[op];
            }
        });
        
        const totalCost = Math.ceil(baseCost * operationMultiplier);
        return this.applyVolumeDiscount(totalCost);
    }
    
    // Calculate tokens for data generation
    calculateGenerationCost(rows, method, features = {}) {
        // Based on PDF formula
        const inputTokens = rows / 1000;
        const outputTokens = rows / 1000;
        
        const inputRate = 0.005;
        const outputRate = 0.010;
        const processingFee = 0.001;
        
        let complexityMultiplier = this.operationCosts.generation.methods[method] || 1.0;
        
        // Apply feature multipliers
        Object.entries(features).forEach(([feature, enabled]) => {
            if (enabled && this.operationCosts.generation.features[feature]) {
                complexityMultiplier *= this.operationCosts.generation.features[feature];
            }
        });
        
        const totalCostDollars = (inputTokens * inputRate) + 
                                (outputTokens * outputRate) + 
                                (complexityMultiplier * inputTokens * processingFee);
        
        // Convert to tokens (1 token = $0.01)
        const tokenCost = Math.ceil(totalCostDollars / 0.01);
        
        return this.applyVolumeDiscount(tokenCost);
    }
    
    // Calculate tokens for model training
    calculateTrainingCost(datasetSize, modelComplexity = 'medium') {
        let baseCost = 0;
        
        if (datasetSize < 10000) {
            baseCost = this.operationCosts.model.training.small;
        } else if (datasetSize < 100000) {
            baseCost = this.operationCosts.model.training.medium;
        } else if (datasetSize < 1000000) {
            baseCost = this.operationCosts.model.training.large;
        } else {
            baseCost = this.operationCosts.model.training.xlarge;
        }
        
        // Adjust for model complexity
        const complexityMultipliers = {
            simple: 0.5,
            medium: 1.0,
            complex: 2.0,
            advanced: 3.0
        };
        
        const multiplier = complexityMultipliers[modelComplexity] || 1.0;
        return Math.ceil(baseCost * multiplier);
    }
    
    // Calculate tokens for predictions
    calculatePredictionCost(count, type = 'batch') {
        const costPer1K = this.operationCosts.model.prediction[type] || 0.1;
        return Math.ceil((count / 1000) * costPer1K);
    }
    
    // Calculate tokens for API calls
    calculateAPICost(requests, type = 'standard') {
        const costPerRequest = this.operationCosts.api[type] || 0.01;
        return Math.ceil(requests * costPerRequest);
    }
    
    // Apply volume discounts
    applyVolumeDiscount(tokenCost) {
        for (let i = this.volumeDiscounts.length - 1; i >= 0; i--) {
            if (tokenCost >= this.volumeDiscounts[i].threshold) {
                return Math.ceil(tokenCost * (1 - this.volumeDiscounts[i].discount));
            }
        }
        return tokenCost;
    }
    
    // Get operation description for UI
    getOperationDescription(operation, tokens) {
        const descriptions = {
            cleaning: 'Data cleaning and preprocessing',
            generation: 'Synthetic data generation',
            training: 'Model training',
            prediction: 'Model predictions',
            api: 'API usage'
        };
        
        return {
            description: descriptions[operation] || 'Platform usage',
            tokens: tokens,
            timestamp: new Date().toISOString()
        };
    }
    
    // Validate if user has enough tokens
    canAffordOperation(requiredTokens, availableTokens) {
        return availableTokens >= requiredTokens;
    }
    
    // Format token display
    formatTokens(tokens) {
        if (tokens >= 1000000) {
            return (tokens / 1000000).toFixed(1) + 'M';
        } else if (tokens >= 1000) {
            return (tokens / 1000).toFixed(1) + 'K';
        }
        return tokens.toLocaleString();
    }
}

// Create singleton instance
const tokenService = new TokenService();

// Export for use across the platform
export default tokenService;