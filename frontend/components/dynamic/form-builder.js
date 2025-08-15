// Form Builder Component

class FormBuilder extends BaseComponent {
    getDefaultProps() {
        return {
            fields: [],
            values: {},
            validation: {},
            submitText: 'Submit',
            cancelText: 'Cancel',
            onSubmit: null,
            onCancel: null,
            onChange: null,
            layout: 'vertical' // vertical, horizontal, grid
        };
    }

    getInitialState() {
        return {
            formData: { ...this.props.values },
            errors: {},
            touched: {},
            isSubmitting: false
        };
    }

    async createHTML() {
        const { fields, submitText, cancelText, layout } = this.props;
        const { formData, errors } = this.state;

        const formClasses = [
            'form-builder',
            `form-builder--${layout}`
        ].join(' ');

        let fieldsHTML = '';
        for (const field of fields) {
            fieldsHTML += this.createFieldHTML(field, formData[field.name], errors[field.name]);
        }

        return `
            <form class="${formClasses}">
                <div class="form-builder__fields">
                    ${fieldsHTML}
                </div>
                <div class="form-builder__actions">
                    <button type="button" class="btn btn--secondary form-builder__cancel">
                        ${cancelText}
                    </button>
                    <button type="submit" class="btn btn--primary form-builder__submit">
                        ${submitText}
                    </button>
                </div>
            </form>
        `;
    }

    createFieldHTML(field, value = '', error = null) {
        const { type, name, label, required, options, placeholder, helpText } = field;
        
        let inputHTML = '';
        
        switch (type) {
            case 'text':
            case 'email':
            case 'password':
            case 'number':
            case 'date':
            case 'time':
                inputHTML = `
                    <input
                        type="${type}"
                        name="${name}"
                        id="field_${name}"
                        class="form-control"
                        value="${this.escapeHTML(value || '')}"
                        placeholder="${placeholder || ''}"
                        ${required ? 'required' : ''}
                    />
                `;
                break;
                
            case 'textarea':
                inputHTML = `
                    <textarea
                        name="${name}"
                        id="field_${name}"
                        class="form-control"
                        placeholder="${placeholder || ''}"
                        ${required ? 'required' : ''}
                    >${this.escapeHTML(value || '')}</textarea>
                `;
                break;
                
            case 'select':
                inputHTML = `
                    <select
                        name="${name}"
                        id="field_${name}"
                        class="form-control"
                        ${required ? 'required' : ''}
                    >
                        <option value="">Select...</option>
                        ${options.map(opt => `
                            <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>
                                ${opt.label}
                            </option>
                        `).join('')}
                    </select>
                `;
                break;
                
            case 'checkbox':
                inputHTML = `
                    <input
                        type="checkbox"
                        name="${name}"
                        id="field_${name}"
                        class="form-check"
                        ${value ? 'checked' : ''}
                    />
                `;
                break;
                
            case 'radio':
                inputHTML = options.map(opt => `
                    <label class="form-radio">
                        <input
                            type="radio"
                            name="${name}"
                            value="${opt.value}"
                            ${value === opt.value ? 'checked' : ''}
                        />
                        ${opt.label}
                    </label>
                `).join('');
                break;
        }

        return `
            <div class="form-field ${error ? 'form-field--error' : ''}">
                ${label ? `
                    <label for="field_${name}" class="form-label">
                        ${label}
                        ${required ? '<span class="form-required">*</span>' : ''}
                    </label>
                ` : ''}
                ${inputHTML}
                ${helpText ? `<div class="form-help">${helpText}</div>` : ''}
                ${error ? `<div class="form-error">${error}</div>` : ''}
            </div>
        `;
    }

    bindEvents() {
        // Form submission
        this.addEventListener(this.element, 'submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Cancel button
        const cancelBtn = this.find('.form-builder__cancel');
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', () => {
                if (this.props.onCancel) {
                    this.props.onCancel();
                }
            });
        }

        // Field changes
        this.findAll('input, select, textarea').forEach(field => {
            this.addEventListener(field, 'change', (e) => {
                this.handleFieldChange(field.name, field.value, field.type);
            });

            this.addEventListener(field, 'blur', () => {
                this.handleFieldBlur(field.name);
            });
        });
    }

    handleFieldChange(name, value, type) {
        // Handle checkbox specially
        if (type === 'checkbox') {
            value = this.find(`[name="${name}"]`).checked;
        }

        const formData = { ...this.state.formData, [name]: value };
        this.setState({ formData });

        if (this.props.onChange) {
            this.props.onChange(name, value, formData);
        }
    }

    handleFieldBlur(name) {
        const touched = { ...this.state.touched, [name]: true };
        this.setState({ touched });
        
        // Validate field
        this.validateField(name);
    }

    validateField(name) {
        const field = this.props.fields.find(f => f.name === name);
        if (!field) return true;

        const value = this.state.formData[name];
        let error = null;

        // Required validation
        if (field.required && !value) {
            error = `${field.label || name} is required`;
        }

        // Custom validation
        if (!error && field.validate) {
            const result = field.validate(value, this.state.formData);
            if (result !== true) {
                error = result;
            }
        }

        const errors = { ...this.state.errors };
        if (error) {
            errors[name] = error;
        } else {
            delete errors[name];
        }

        this.setState({ errors });
        return !error;
    }

    validateForm() {
        let isValid = true;
        const errors = {};

        for (const field of this.props.fields) {
            const value = this.state.formData[field.name];
            
            // Required validation
            if (field.required && !value) {
                errors[field.name] = `${field.label || field.name} is required`;
                isValid = false;
            }

            // Custom validation
            if (field.validate && value) {
                const result = field.validate(value, this.state.formData);
                if (result !== true) {
                    errors[field.name] = result;
                    isValid = false;
                }
            }
        }

        this.setState({ errors });
        return isValid;
    }

    async handleSubmit() {
        if (!this.validateForm()) {
            return;
        }

        this.setState({ isSubmitting: true });

        try {
            if (this.props.onSubmit) {
                await this.props.onSubmit(this.state.formData);
            }
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            this.setState({ isSubmitting: false });
        }
    }

    getFormData() {
        return { ...this.state.formData };
    }

    setFormData(data) {
        this.setState({ formData: { ...this.state.formData, ...data } });
    }

    reset() {
        this.setState({
            formData: { ...this.props.values },
            errors: {},
            touched: {}
        });
    }
}

window.FormBuilder = FormBuilder;