/**
 * Enhanced Form Validation Service
 * Provides comprehensive form validation with helpful error messages
 */

class FormValidationService {
    constructor() {
        // Validation rules registry
        this.rules = {
            required: (value) => {
                const valid = value !== null && value !== undefined && value.toString().trim() !== '';
                return {
                    valid,
                    message: 'This field is required'
                };
            },
            
            email: (value) => {
                const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const valid = !value || pattern.test(value);
                return {
                    valid,
                    message: 'Please enter a valid email address'
                };
            },
            
            minLength: (min) => (value) => {
                const valid = !value || value.toString().length >= min;
                return {
                    valid,
                    message: `Must be at least ${min} characters long`
                };
            },
            
            maxLength: (max) => (value) => {
                const valid = !value || value.toString().length <= max;
                return {
                    valid,
                    message: `Must be no more than ${max} characters`
                };
            },
            
            min: (min) => (value) => {
                const num = parseFloat(value);
                const valid = !value || !isNaN(num) && num >= min;
                return {
                    valid,
                    message: `Must be at least ${min}`
                };
            },
            
            max: (max) => (value) => {
                const num = parseFloat(value);
                const valid = !value || !isNaN(num) && num <= max;
                return {
                    valid,
                    message: `Must be no more than ${max}`
                };
            },
            
            range: (min, max) => (value) => {
                const num = parseFloat(value);
                const valid = !value || !isNaN(num) && num >= min && num <= max;
                return {
                    valid,
                    message: `Must be between ${min} and ${max}`
                };
            },
            
            pattern: (pattern, message) => (value) => {
                const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
                const valid = !value || regex.test(value);
                return {
                    valid,
                    message: message || 'Invalid format'
                };
            },
            
            alphanumeric: (value) => {
                const pattern = /^[a-zA-Z0-9]+$/;
                const valid = !value || pattern.test(value);
                return {
                    valid,
                    message: 'Only letters and numbers are allowed'
                };
            },
            
            numeric: (value) => {
                const valid = !value || !isNaN(parseFloat(value)) && isFinite(value);
                return {
                    valid,
                    message: 'Must be a valid number'
                };
            },
            
            integer: (value) => {
                const valid = !value || Number.isInteger(parseFloat(value));
                return {
                    valid,
                    message: 'Must be a whole number'
                };
            },
            
            fileSize: (maxSizeMB) => (file) => {
                const valid = !file || file.size <= maxSizeMB * 1024 * 1024;
                return {
                    valid,
                    message: `File size must not exceed ${maxSizeMB}MB`
                };
            },
            
            fileType: (allowedTypes) => (file) => {
                if (!file) return { valid: true };
                const extension = file.name.split('.').pop().toLowerCase();
                const valid = allowedTypes.includes(extension);
                return {
                    valid,
                    message: `File type must be: ${allowedTypes.join(', ')}`
                };
            },
            
            uniqueIn: (array) => (value) => {
                const valid = !value || !array.includes(value);
                return {
                    valid,
                    message: 'This value is already taken'
                };
            },
            
            modelName: (value) => {
                if (!value) return { valid: false, message: 'Model name is required' };
                if (value.length < 3) return { valid: false, message: 'Model name must be at least 3 characters' };
                if (value.length > 50) return { valid: false, message: 'Model name must be less than 50 characters' };
                if (!/^[a-zA-Z0-9_\- ]+$/.test(value)) {
                    return { valid: false, message: 'Model name can only contain letters, numbers, spaces, hyphens and underscores' };
                }
                return { valid: true };
            },
            
            algorithm: (value) => {
                const validAlgorithms = [
                    'random_forest_clf', 'logistic_regression', 'svm_clf', 'neural_network_clf', 'xgboost_clf',
                    'linear_regression', 'random_forest_reg', 'ridge_regression', 'lasso_regression', 'svm_reg',
                    'neural_network_reg', 'xgboost_reg', 'kmeans', 'dbscan'
                ];
                const valid = validAlgorithms.includes(value);
                return {
                    valid,
                    message: 'Please select a valid algorithm'
                };
            }
        };
        
        // Error display styles
        this.errorStyles = `
            .validation-error {
                color: #dc3545;
                font-size: 0.875rem;
                margin-top: 0.25rem;
                display: block;
                animation: slideDown 0.2s ease-out;
            }
            
            .validation-success {
                color: #28a745;
                font-size: 0.875rem;
                margin-top: 0.25rem;
                display: block;
            }
            
            .field-error {
                border-color: #dc3545 !important;
                box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1) !important;
            }
            
            .field-success {
                border-color: #28a745 !important;
                box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.1) !important;
            }
            
            .field-warning {
                border-color: #ffc107 !important;
                box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.1) !important;
            }
            
            .validation-tooltip {
                position: absolute;
                background: #333;
                color: white;
                padding: 0.5rem 0.75rem;
                border-radius: 4px;
                font-size: 0.875rem;
                z-index: 1000;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
            }
            
            .validation-tooltip.show {
                opacity: 1;
            }
            
            .validation-tooltip::before {
                content: '';
                position: absolute;
                top: -4px;
                left: 50%;
                transform: translateX(-50%);
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-bottom: 4px solid #333;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-5px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .validation-summary {
                background: #f8d7da;
                color: #721c24;
                padding: 1rem;
                border-radius: 4px;
                margin-bottom: 1rem;
                border: 1px solid #f5c6cb;
            }
            
            .validation-summary h4 {
                margin: 0 0 0.5rem 0;
                font-size: 1rem;
            }
            
            .validation-summary ul {
                margin: 0;
                padding-left: 1.5rem;
            }
            
            .validation-summary li {
                margin-bottom: 0.25rem;
            }
            
            .field-hint {
                color: #6c757d;
                font-size: 0.8rem;
                margin-top: 0.25rem;
                display: block;
            }
            
            .required-indicator {
                color: #dc3545;
                margin-left: 0.25rem;
            }
        `;
        
        this.injectStyles();
        this.fieldValidations = new Map();
        this.formValidations = new Map();
    }
    
    /**
     * Inject validation styles
     */
    injectStyles() {
        if (!document.getElementById('validation-styles')) {
            const style = document.createElement('style');
            style.id = 'validation-styles';
            style.innerHTML = this.errorStyles;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Validate a single field
     */
    validateField(field, rules, options = {}) {
        const value = this.getFieldValue(field);
        const errors = [];
        const warnings = [];
        
        // Apply each rule
        for (const rule of rules) {
            let result;
            
            if (typeof rule === 'function') {
                result = rule(value);
            } else if (typeof rule === 'string' && this.rules[rule]) {
                result = this.rules[rule](value);
            } else if (rule.type && this.rules[rule.type]) {
                const ruleFunc = typeof this.rules[rule.type] === 'function' 
                    ? this.rules[rule.type] 
                    : this.rules[rule.type](...(rule.params || []));
                result = ruleFunc(value);
                if (!result.valid && rule.message) {
                    result.message = rule.message;
                }
            }
            
            if (result && !result.valid) {
                if (rule.warning) {
                    warnings.push(result.message);
                } else {
                    errors.push(result.message);
                }
            }
        }
        
        // Display validation result
        this.displayFieldValidation(field, errors, warnings, options);
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Validate entire form
     */
    validateForm(form, validationConfig, options = {}) {
        const results = {};
        const allErrors = [];
        let isValid = true;
        
        // Validate each field
        for (const [fieldName, rules] of Object.entries(validationConfig)) {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (!field) continue;
            
            const fieldResult = this.validateField(field, rules, { silent: true });
            results[fieldName] = fieldResult;
            
            if (!fieldResult.valid) {
                isValid = false;
                allErrors.push({
                    field: fieldName,
                    errors: fieldResult.errors
                });
            }
        }
        
        // Display summary if needed
        if (!options.silent && !isValid) {
            this.displayValidationSummary(form, allErrors);
        }
        
        return {
            valid: isValid,
            results,
            errors: allErrors
        };
    }
    
    /**
     * Setup real-time validation
     */
    setupRealtimeValidation(field, rules, options = {}) {
        const validateOnEvents = options.validateOn || ['blur', 'change'];
        const debounceDelay = options.debounce || 300;
        
        let timeout;
        const debouncedValidate = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.validateField(field, rules, options);
            }, debounceDelay);
        };
        
        // Add event listeners
        validateOnEvents.forEach(event => {
            if (event === 'input' && options.debounce) {
                field.addEventListener(event, debouncedValidate);
            } else {
                field.addEventListener(event, () => this.validateField(field, rules, options));
            }
        });
        
        // Store validation config for later use
        this.fieldValidations.set(field, { rules, options });
        
        // Add required indicator if needed
        if (rules.some(r => r === 'required' || r.type === 'required')) {
            this.addRequiredIndicator(field);
        }
        
        // Add hint if provided
        if (options.hint) {
            this.addFieldHint(field, options.hint);
        }
    }
    
    /**
     * Setup form-wide validation
     */
    setupFormValidation(form, validationConfig, options = {}) {
        // Setup individual field validations
        for (const [fieldName, rules] of Object.entries(validationConfig)) {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field) {
                this.setupRealtimeValidation(field, rules, options.fieldOptions?.[fieldName] || {});
            }
        }
        
        // Store form validation config
        this.formValidations.set(form, { validationConfig, options });
        
        // Handle form submit
        if (options.validateOnSubmit !== false) {
            form.addEventListener('submit', (e) => {
                const result = this.validateForm(form, validationConfig, { silent: false });
                
                if (!result.valid) {
                    e.preventDefault();
                    
                    // Focus first error field
                    const firstError = result.errors[0];
                    if (firstError) {
                        const field = form.querySelector(`[name="${firstError.field}"], #${firstError.field}`);
                        if (field) {
                            field.focus();
                            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                    
                    // Call error callback
                    if (options.onValidationError) {
                        options.onValidationError(result);
                    }
                } else {
                    // Call success callback
                    if (options.onValidationSuccess) {
                        options.onValidationSuccess(result);
                    }
                }
            });
        }
    }
    
    /**
     * Display field validation result
     */
    displayFieldValidation(field, errors, warnings, options = {}) {
        // Remove existing validation messages
        this.clearFieldValidation(field);
        
        if (options.silent) return;
        
        // Add field styling
        if (errors.length > 0) {
            field.classList.add('field-error');
            field.classList.remove('field-success', 'field-warning');
            
            // Display first error
            if (!options.hideMessage) {
                const errorElement = document.createElement('span');
                errorElement.className = 'validation-error';
                errorElement.textContent = errors[0];
                errorElement.id = `${field.id || field.name}-error`;
                field.parentNode.insertBefore(errorElement, field.nextSibling);
                
                // Set ARIA attributes
                field.setAttribute('aria-invalid', 'true');
                field.setAttribute('aria-describedby', errorElement.id);
            }
            
            // Show tooltip on hover if enabled
            if (options.showTooltip) {
                this.addTooltip(field, errors.join(', '));
            }
        } else if (warnings.length > 0) {
            field.classList.add('field-warning');
            field.classList.remove('field-error', 'field-success');
            
            if (!options.hideMessage) {
                const warningElement = document.createElement('span');
                warningElement.className = 'validation-warning';
                warningElement.style.color = '#ffc107';
                warningElement.textContent = warnings[0];
                field.parentNode.insertBefore(warningElement, field.nextSibling);
            }
        } else if (field.value) {
            field.classList.add('field-success');
            field.classList.remove('field-error', 'field-warning');
            field.setAttribute('aria-invalid', 'false');
        }
    }
    
    /**
     * Clear field validation display
     */
    clearFieldValidation(field) {
        field.classList.remove('field-error', 'field-success', 'field-warning');
        
        // Remove error messages
        const errorElement = field.parentNode.querySelector('.validation-error, .validation-warning, .validation-success');
        if (errorElement) {
            errorElement.remove();
        }
        
        // Remove ARIA attributes
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
        
        // Remove tooltip
        this.removeTooltip(field);
    }
    
    /**
     * Display validation summary
     */
    displayValidationSummary(form, errors) {
        // Remove existing summary
        const existingSummary = form.querySelector('.validation-summary');
        if (existingSummary) {
            existingSummary.remove();
        }
        
        if (errors.length === 0) return;
        
        // Create summary element
        const summary = document.createElement('div');
        summary.className = 'validation-summary';
        summary.innerHTML = `
            <h4><i class="fas fa-exclamation-triangle"></i> Please correct the following errors:</h4>
            <ul>
                ${errors.map(error => `
                    <li>
                        <strong>${this.getFieldLabel(form, error.field)}:</strong> 
                        ${error.errors.join(', ')}
                    </li>
                `).join('')}
            </ul>
        `;
        
        // Insert at top of form
        form.insertBefore(summary, form.firstChild);
        
        // Auto-hide after delay
        setTimeout(() => {
            summary.style.opacity = '0';
            setTimeout(() => summary.remove(), 300);
        }, 10000);
    }
    
    /**
     * Add required indicator
     */
    addRequiredIndicator(field) {
        const label = this.getFieldLabel(field);
        if (label && !label.querySelector('.required-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'required-indicator';
            indicator.textContent = '*';
            indicator.title = 'Required field';
            label.appendChild(indicator);
        }
    }
    
    /**
     * Add field hint
     */
    addFieldHint(field, hint) {
        if (!field.parentNode.querySelector('.field-hint')) {
            const hintElement = document.createElement('span');
            hintElement.className = 'field-hint';
            hintElement.textContent = hint;
            field.parentNode.appendChild(hintElement);
        }
    }
    
    /**
     * Add tooltip
     */
    addTooltip(field, message) {
        this.removeTooltip(field);
        
        const tooltip = document.createElement('div');
        tooltip.className = 'validation-tooltip';
        tooltip.textContent = message;
        document.body.appendChild(tooltip);
        
        field.addEventListener('mouseenter', () => {
            const rect = field.getBoundingClientRect();
            tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
            tooltip.style.top = rect.bottom + 5 + 'px';
            tooltip.classList.add('show');
        });
        
        field.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
        });
        
        field._validationTooltip = tooltip;
    }
    
    /**
     * Remove tooltip
     */
    removeTooltip(field) {
        if (field._validationTooltip) {
            field._validationTooltip.remove();
            delete field._validationTooltip;
        }
    }
    
    /**
     * Get field value
     */
    getFieldValue(field) {
        if (field.type === 'checkbox') {
            return field.checked;
        } else if (field.type === 'radio') {
            const checked = document.querySelector(`[name="${field.name}"]:checked`);
            return checked ? checked.value : null;
        } else if (field.tagName === 'SELECT' && field.multiple) {
            return Array.from(field.selectedOptions).map(opt => opt.value);
        } else if (field.files) {
            return field.files[0];
        } else {
            return field.value;
        }
    }
    
    /**
     * Get field label
     */
    getFieldLabel(formOrField, fieldName) {
        let field = formOrField;
        if (fieldName) {
            field = formOrField.querySelector(`[name="${fieldName}"], #${fieldName}`);
        }
        
        if (!field) return fieldName || 'Field';
        
        // Try to find associated label
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) {
            return label.textContent.replace('*', '').trim();
        }
        
        // Try parent label
        const parentLabel = field.closest('label');
        if (parentLabel) {
            return parentLabel.textContent.replace('*', '').trim();
        }
        
        // Use placeholder or name
        return field.placeholder || field.name || 'Field';
    }
    
    /**
     * Clear all validations
     */
    clearAllValidations(form) {
        const fields = form.querySelectorAll('.field-error, .field-success, .field-warning');
        fields.forEach(field => this.clearFieldValidation(field));
        
        const summary = form.querySelector('.validation-summary');
        if (summary) {
            summary.remove();
        }
    }
    
    /**
     * Create custom validator
     */
    createCustomValidator(validationFunc, message) {
        return (value) => ({
            valid: validationFunc(value),
            message
        });
    }
    
    /**
     * Async validation
     */
    async validateAsync(field, asyncValidator, options = {}) {
        // Show loading state
        field.classList.add('validating');
        
        try {
            const value = this.getFieldValue(field);
            const result = await asyncValidator(value);
            
            if (!result.valid) {
                this.displayFieldValidation(field, [result.message], [], options);
            } else {
                this.displayFieldValidation(field, [], [], options);
            }
            
            return result;
        } catch (error) {
            console.error('Async validation error:', error);
            return { valid: false, message: 'Validation error' };
        } finally {
            field.classList.remove('validating');
        }
    }
}

// Create singleton instance
const formValidation = new FormValidationService();

// Export for use
export default formValidation;