// Input Component

class InputComponent extends BaseComponent {
    getDefaultProps() {
        return {
            type: 'text', // text, email, password, number, tel, url, search, date, time, datetime-local
            name: '',
            value: '',
            placeholder: '',
            label: '',
            helpText: '',
            required: false,
            disabled: false,
            readOnly: false,
            autoFocus: false,
            autoComplete: 'off',
            min: null,
            max: null,
            step: null,
            pattern: null,
            maxLength: null,
            validation: null, // Function or regex
            errorMessage: '',
            showError: false,
            icon: null,
            iconPosition: 'left', // left, right
            size: 'md', // sm, md, lg
            onChange: null,
            onBlur: null,
            onFocus: null,
            onKeyDown: null,
            onKeyUp: null,
            onInput: null,
            className: '',
            id: null
        };
    }

    getInitialState() {
        return {
            value: this.props.value || '',
            isValid: true,
            isFocused: false,
            isDirty: false,
            errorMessage: ''
        };
    }

    async createHTML() {
        const {
            type,
            name,
            placeholder,
            label,
            helpText,
            required,
            disabled,
            readOnly,
            autoComplete,
            min,
            max,
            step,
            pattern,
            maxLength,
            icon,
            iconPosition,
            size,
            className,
            id,
            showError
        } = this.props;

        const { value, isValid, errorMessage } = this.state;

        const inputId = id || this.generateId();
        const containerClasses = [
            'input-wrapper',
            `input-wrapper--${size}`,
            !isValid ? 'input-wrapper--error' : '',
            disabled ? 'input-wrapper--disabled' : '',
            className
        ].filter(Boolean).join(' ');

        const inputClasses = [
            'input',
            `input--${size}`,
            icon ? `input--with-icon-${iconPosition}` : '',
            !isValid ? 'input--error' : ''
        ].filter(Boolean).join(' ');

        let labelHTML = '';
        if (label) {
            labelHTML = `
                <label for="${inputId}" class="input__label">
                    ${label}
                    ${required ? '<span class="input__required">*</span>' : ''}
                </label>
            `;
        }

        let iconHTML = '';
        if (icon) {
            iconHTML = `<span class="input__icon input__icon--${iconPosition}">${icon}</span>`;
        }

        let helpTextHTML = '';
        if (helpText && isValid) {
            helpTextHTML = `<div class="input__help">${helpText}</div>`;
        }

        let errorHTML = '';
        if (!isValid && showError && errorMessage) {
            errorHTML = `<div class="input__error">${errorMessage}</div>`;
        }

        const inputHTML = `
            <input
                id="${inputId}"
                type="${type}"
                name="${name}"
                value="${this.escapeHTML(value)}"
                placeholder="${placeholder}"
                class="${inputClasses}"
                ${required ? 'required' : ''}
                ${disabled ? 'disabled' : ''}
                ${readOnly ? 'readonly' : ''}
                ${autoComplete ? `autocomplete="${autoComplete}"` : ''}
                ${min !== null ? `min="${min}"` : ''}
                ${max !== null ? `max="${max}"` : ''}
                ${step !== null ? `step="${step}"` : ''}
                ${pattern ? `pattern="${pattern}"` : ''}
                ${maxLength ? `maxlength="${maxLength}"` : ''}
                aria-invalid="${!isValid}"
                aria-describedby="${!isValid ? `${inputId}-error` : ''}"
            />
        `;

        return `
            <div class="${containerClasses}">
                ${labelHTML}
                <div class="input__container">
                    ${iconPosition === 'left' ? iconHTML : ''}
                    ${inputHTML}
                    ${iconPosition === 'right' ? iconHTML : ''}
                </div>
                ${helpTextHTML}
                ${errorHTML}
            </div>
        `;
    }

    bindEvents() {
        const input = this.find('input');
        if (!input) return;

        // Auto focus
        if (this.props.autoFocus) {
            setTimeout(() => input.focus(), 100);
        }

        // Input event
        this.addEventListener(input, 'input', (e) => {
            this.handleInput(e);
        });

        // Change event
        this.addEventListener(input, 'change', (e) => {
            this.handleChange(e);
        });

        // Focus event
        this.addEventListener(input, 'focus', (e) => {
            this.handleFocus(e);
        });

        // Blur event
        this.addEventListener(input, 'blur', (e) => {
            this.handleBlur(e);
        });

        // KeyDown event
        if (this.props.onKeyDown) {
            this.addEventListener(input, 'keydown', (e) => {
                this.props.onKeyDown(e);
            });
        }

        // KeyUp event
        if (this.props.onKeyUp) {
            this.addEventListener(input, 'keyup', (e) => {
                this.props.onKeyUp(e);
            });
        }
    }

    handleInput(e) {
        const value = e.target.value;
        
        // Update state
        this.setState({
            value,
            isDirty: true
        });

        // Validate on input if already dirty
        if (this.state.isDirty) {
            this.validate(value);
        }

        // Call onInput callback
        if (this.props.onInput) {
            this.props.onInput(value, e);
        }
    }

    handleChange(e) {
        const value = e.target.value;
        
        // Validate
        this.validate(value);

        // Call onChange callback
        if (this.props.onChange) {
            this.props.onChange(value, e);
        }
    }

    handleFocus(e) {
        this.setState({ isFocused: true });

        if (this.props.onFocus) {
            this.props.onFocus(e);
        }
    }

    handleBlur(e) {
        const value = e.target.value;
        
        this.setState({ 
            isFocused: false,
            isDirty: true
        });

        // Validate on blur
        this.validate(value);

        if (this.props.onBlur) {
            this.props.onBlur(value, e);
        }
    }

    validate(value = this.state.value) {
        const { validation, required, type, min, max, pattern } = this.props;
        
        let isValid = true;
        let errorMessage = '';

        // Required validation
        if (required && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }

        // Type-specific validation
        if (isValid && value) {
            switch (type) {
                case 'email':
                    if (!this.isValidEmail(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    }
                    break;
                case 'url':
                    if (!this.isValidURL(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid URL';
                    }
                    break;
                case 'number':
                    if (min !== null && parseFloat(value) < min) {
                        isValid = false;
                        errorMessage = `Value must be at least ${min}`;
                    }
                    if (max !== null && parseFloat(value) > max) {
                        isValid = false;
                        errorMessage = `Value must be at most ${max}`;
                    }
                    break;
            }
        }

        // Pattern validation
        if (isValid && pattern && value) {
            const regex = new RegExp(pattern);
            if (!regex.test(value)) {
                isValid = false;
                errorMessage = 'Please match the requested format';
            }
        }

        // Custom validation
        if (isValid && validation && value) {
            if (typeof validation === 'function') {
                const result = validation(value);
                if (result !== true) {
                    isValid = false;
                    errorMessage = typeof result === 'string' ? result : 'Invalid value';
                }
            } else if (validation instanceof RegExp) {
                if (!validation.test(value)) {
                    isValid = false;
                    errorMessage = 'Invalid value';
                }
            }
        }

        // Update state
        this.setState({
            isValid,
            errorMessage: errorMessage || this.props.errorMessage
        });

        return isValid;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    getValue() {
        return this.state.value;
    }

    setValue(value) {
        this.setState({ value });
        
        // Update input element directly
        const input = this.find('input');
        if (input) {
            input.value = value;
        }
    }

    isValid() {
        return this.validate();
    }

    reset() {
        this.setState({
            value: this.props.value || '',
            isValid: true,
            isDirty: false,
            errorMessage: ''
        });

        // Reset input element
        const input = this.find('input');
        if (input) {
            input.value = this.props.value || '';
        }
    }

    focus() {
        const input = this.find('input');
        if (input) {
            input.focus();
        }
    }

    blur() {
        const input = this.find('input');
        if (input) {
            input.blur();
        }
    }

    setError(errorMessage) {
        this.setState({
            isValid: false,
            errorMessage
        });
    }

    clearError() {
        this.setState({
            isValid: true,
            errorMessage: ''
        });
    }
}

// Export for use in other modules
window.InputComponent = InputComponent;