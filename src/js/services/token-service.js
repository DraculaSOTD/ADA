/**
 * Token Service
 * Manages token calculations and pricing for the ADA platform
 */

// Define tokenService object
const tokenService = {
    // Base token costs for different operations
    costs: {
        basic: 10,
        moderate: 25,
        complex: 50,
        condition: 5,
        action: 10,
        apiCall: 15,
        modelInference: 30
    },

    /**
     * Calculate token cost for rules
     * @param {number} conditionCount - Number of conditions in the rule
     * @param {number} actionCount - Number of actions in the rule
     * @param {string} complexity - Complexity level ('basic', 'moderate', 'complex')
     * @returns {number} Total token cost
     */
    calculateRulesCost(conditionCount, actionCount, complexity = 'basic') {
        let baseCost = this.costs[complexity] || this.costs.basic;
        let conditionCost = conditionCount * this.costs.condition;
        let actionCost = actionCount * this.costs.action;
        
        // Apply multipliers for complex rules
        let multiplier = 1;
        if (complexity === 'moderate') {
            multiplier = 1.5;
        } else if (complexity === 'complex') {
            multiplier = 2;
        }
        
        return Math.round((baseCost + conditionCost + actionCost) * multiplier);
    },

    /**
     * Calculate token cost for model operations
     * @param {string} modelType - Type of model
     * @param {string} operation - Operation type ('train', 'predict', 'evaluate')
     * @param {number} dataSize - Size of data in MB
     * @returns {number} Total token cost
     */
    calculateModelCost(modelType, operation, dataSize) {
        const baseCosts = {
            train: 100,
            predict: 10,
            evaluate: 20
        };

        const modelMultipliers = {
            'simple': 1,
            'neural_network': 2,
            'deep_learning': 3,
            'transformer': 5
        };

        const base = baseCosts[operation] || 10;
        const multiplier = modelMultipliers[modelType] || 1;
        const sizeFactor = Math.ceil(dataSize / 10); // Cost per 10MB

        return Math.round(base * multiplier * sizeFactor);
    },

    /**
     * Calculate token cost for data generation
     * @param {number} rows - Number of rows to generate
     * @param {number} columns - Number of columns
     * @param {string} complexity - Data complexity level
     * @returns {number} Total token cost
     */
    calculateDataGenerationCost(rows, columns, complexity = 'basic') {
        const complexityMultipliers = {
            'basic': 0.1,
            'moderate': 0.5,
            'complex': 1,
            'advanced': 2
        };

        const multiplier = complexityMultipliers[complexity] || 0.1;
        const baseCost = Math.ceil((rows * columns) / 1000); // Cost per 1000 cells
        
        return Math.round(baseCost * multiplier * 10); // Base unit is 10 tokens
    },

    /**
     * Format token display with appropriate units
     * @param {number} tokens - Number of tokens
     * @returns {string} Formatted token string
     */
    formatTokens(tokens) {
        if (tokens >= 1000000) {
            return `${(tokens / 1000000).toFixed(2)}M`;
        } else if (tokens >= 1000) {
            return `${(tokens / 1000).toFixed(1)}K`;
        }
        return tokens.toLocaleString();
    },

    /**
     * Check if user has sufficient tokens
     * @param {number} required - Required tokens
     * @param {number} available - Available tokens
     * @returns {boolean} True if sufficient tokens
     */
    hasSufficientTokens(required, available) {
        return available >= required;
    },

    /**
     * Get token cost estimate for an operation
     * @param {string} operationType - Type of operation
     * @param {object} params - Operation parameters
     * @returns {object} Cost estimate with breakdown
     */
    getEstimate(operationType, params = {}) {
        let total = 0;
        let breakdown = {};

        switch(operationType) {
            case 'rule':
                total = this.calculateRulesCost(
                    params.conditions || 0,
                    params.actions || 0,
                    params.complexity || 'basic'
                );
                breakdown = {
                    base: this.costs[params.complexity || 'basic'],
                    conditions: (params.conditions || 0) * this.costs.condition,
                    actions: (params.actions || 0) * this.costs.action
                };
                break;

            case 'model':
                total = this.calculateModelCost(
                    params.modelType || 'simple',
                    params.operation || 'predict',
                    params.dataSize || 1
                );
                breakdown = {
                    operation: params.operation,
                    modelType: params.modelType,
                    dataSize: `${params.dataSize}MB`
                };
                break;

            case 'data':
                total = this.calculateDataGenerationCost(
                    params.rows || 100,
                    params.columns || 10,
                    params.complexity || 'basic'
                );
                breakdown = {
                    rows: params.rows || 100,
                    columns: params.columns || 10,
                    complexity: params.complexity || 'basic'
                };
                break;

            default:
                total = this.costs.basic;
                breakdown = { base: this.costs.basic };
        }

        return {
            total,
            breakdown,
            formatted: this.formatTokens(total)
        };
    }
};

// Make available globally for browser (non-module scripts)
if (typeof window !== 'undefined') {
    window.tokenService = tokenService;
}

// Export for CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = tokenService;
}