// Button Component

class ButtonComponent extends BaseComponent {
    getDefaultProps() {
        return {
            text: 'Button',
            type: 'button', // button, submit, reset
            variant: 'primary', // primary, secondary, success, danger, warning, info, light, dark
            size: 'md', // sm, md, lg
            disabled: false,
            loading: false,
            icon: null,
            iconPosition: 'left', // left, right
            fullWidth: false,
            onClick: null,
            className: '',
            id: null,
            ariaLabel: null,
            tooltip: null
        };
    }

    async createHTML() {
        const {
            text,
            type,
            variant,
            size,
            disabled,
            loading,
            icon,
            iconPosition,
            fullWidth,
            className,
            id,
            ariaLabel,
            tooltip
        } = this.props;

        const classes = [
            'btn',
            `btn--${variant}`,
            `btn--${size}`,
            fullWidth ? 'btn--full-width' : '',
            loading ? 'btn--loading' : '',
            disabled ? 'btn--disabled' : '',
            className
        ].filter(Boolean).join(' ');

        const buttonId = id || this.generateId();
        const buttonAriaLabel = ariaLabel || text;

        let iconHTML = '';
        if (icon && !loading) {
            iconHTML = `<span class="btn__icon btn__icon--${iconPosition}">${icon}</span>`;
        }

        let loadingHTML = '';
        if (loading) {
            loadingHTML = '<span class="btn__spinner"></span>';
        }

        const contentHTML = iconPosition === 'right' 
            ? `${loadingHTML}<span class="btn__text">${text}</span>${iconHTML}`
            : `${loadingHTML}${iconHTML}<span class="btn__text">${text}</span>`;

        return `
            <button 
                id="${buttonId}"
                type="${type}"
                class="${classes}"
                ${disabled || loading ? 'disabled' : ''}
                aria-label="${buttonAriaLabel}"
                ${tooltip ? `title="${tooltip}"` : ''}
            >
                ${contentHTML}
            </button>
        `;
    }

    bindEvents() {
        const { onClick, disabled, loading } = this.props;

        if (onClick && !disabled && !loading) {
            this.addEventListener(this.element, 'click', (e) => {
                e.preventDefault();
                onClick(e);
            });
        }

        // Add hover effects
        this.addEventListener(this.element, 'mouseenter', () => {
            if (!this.props.disabled && !this.props.loading) {
                this.element.classList.add('btn--hover');
            }
        });

        this.addEventListener(this.element, 'mouseleave', () => {
            this.element.classList.remove('btn--hover');
        });

        // Add keyboard support
        this.addEventListener(this.element, 'keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (!this.props.disabled && !this.props.loading && this.props.onClick) {
                    e.preventDefault();
                    this.props.onClick(e);
                }
            }
        });
    }

    setLoading(loading) {
        this.update({ loading });
    }

    setDisabled(disabled) {
        this.update({ disabled });
    }

    setText(text) {
        this.update({ text });
    }

    click() {
        if (!this.props.disabled && !this.props.loading && this.element) {
            this.element.click();
        }
    }

    focus() {
        if (this.element) {
            this.element.focus();
        }
    }

    blur() {
        if (this.element) {
            this.element.blur();
        }
    }
}

// Button Group Component
class ButtonGroupComponent extends BaseComponent {
    getDefaultProps() {
        return {
            buttons: [],
            variant: 'primary',
            size: 'md',
            orientation: 'horizontal', // horizontal, vertical
            className: ''
        };
    }

    async createHTML() {
        const { orientation, className } = this.props;

        const classes = [
            'btn-group',
            `btn-group--${orientation}`,
            className
        ].filter(Boolean).join(' ');

        return `<div class="${classes}"></div>`;
    }

    async renderChildren() {
        const { buttons, variant, size } = this.props;

        for (const buttonProps of buttons) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'btn-group__item';
            this.element.appendChild(buttonContainer);

            const button = new ButtonComponent(buttonContainer, {
                variant,
                size,
                ...buttonProps
            });

            await button.render();
            this.addChild(button);
        }
    }
}

// Export for use in other modules
window.ButtonComponent = ButtonComponent;
window.ButtonGroupComponent = ButtonGroupComponent;