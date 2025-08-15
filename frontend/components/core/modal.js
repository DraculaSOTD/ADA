// Modal Component

class ModalComponent extends BaseComponent {
    getDefaultProps() {
        return {
            title: '',
            content: '',
            footer: null,
            size: 'md', // sm, md, lg, xl, full
            showCloseButton: true,
            closeOnOverlay: true,
            closeOnEscape: true,
            centered: true,
            scrollable: false,
            backdrop: true,
            animation: true,
            onOpen: null,
            onClose: null,
            onConfirm: null,
            onCancel: null,
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            showFooter: true,
            className: ''
        };
    }

    getInitialState() {
        return {
            isOpen: false,
            isClosing: false
        };
    }

    async createHTML() {
        const {
            title,
            content,
            size,
            showCloseButton,
            centered,
            scrollable,
            backdrop,
            className,
            showFooter
        } = this.props;

        const { isOpen, isClosing } = this.state;

        const modalClasses = [
            'modal',
            `modal--${size}`,
            centered ? 'modal--centered' : '',
            scrollable ? 'modal--scrollable' : '',
            isOpen ? 'modal--open' : '',
            isClosing ? 'modal--closing' : '',
            className
        ].filter(Boolean).join(' ');

        const backdropClasses = [
            'modal__backdrop',
            !backdrop ? 'modal__backdrop--transparent' : ''
        ].filter(Boolean).join(' ');

        let headerHTML = '';
        if (title || showCloseButton) {
            headerHTML = `
                <div class="modal__header">
                    ${title ? `<h3 class="modal__title">${title}</h3>` : ''}
                    ${showCloseButton ? `
                        <button class="modal__close" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    ` : ''}
                </div>
            `;
        }

        let footerHTML = '';
        if (showFooter) {
            if (this.props.footer) {
                footerHTML = `<div class="modal__footer">${this.props.footer}</div>`;
            } else {
                footerHTML = `
                    <div class="modal__footer">
                        <button class="btn btn--secondary modal__cancel">
                            ${this.props.cancelText}
                        </button>
                        <button class="btn btn--primary modal__confirm">
                            ${this.props.confirmText}
                        </button>
                    </div>
                `;
            }
        }

        return `
            <div class="${modalClasses}">
                <div class="${backdropClasses}"></div>
                <div class="modal__dialog">
                    <div class="modal__content">
                        ${headerHTML}
                        <div class="modal__body">
                            ${content}
                        </div>
                        ${footerHTML}
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Close button
        const closeBtn = this.find('.modal__close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.close());
        }

        // Backdrop click
        if (this.props.closeOnOverlay) {
            const backdrop = this.find('.modal__backdrop');
            if (backdrop) {
                this.addEventListener(backdrop, 'click', () => this.close());
            }
        }

        // Cancel button
        const cancelBtn = this.find('.modal__cancel');
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', () => this.cancel());
        }

        // Confirm button
        const confirmBtn = this.find('.modal__confirm');
        if (confirmBtn) {
            this.addEventListener(confirmBtn, 'click', () => this.confirm());
        }

        // Escape key
        if (this.props.closeOnEscape) {
            this.addEventListener(document, 'keydown', (e) => {
                if (e.key === 'Escape' && this.state.isOpen) {
                    this.close();
                }
            });
        }

        // Prevent body scroll when modal is open
        if (this.state.isOpen) {
            document.body.style.overflow = 'hidden';
        }
    }

    async open() {
        if (this.state.isOpen) return;

        // Add to modal container
        const container = document.getElementById('modal-container');
        if (container && !container.contains(this.element)) {
            container.appendChild(this.element);
        }

        await this.setState({ isOpen: true, isClosing: false });

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Focus management
        this.previousFocus = document.activeElement;
        const firstFocusable = this.find('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }

        // Call onOpen callback
        if (this.props.onOpen) {
            this.props.onOpen();
        }

        // Trigger open event
        this.emit('modal:open');
    }

    async close() {
        if (!this.state.isOpen) return;

        // Add closing animation
        if (this.props.animation) {
            await this.setState({ isClosing: true });
            
            // Wait for animation
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        await this.setState({ isOpen: false, isClosing: false });

        // Restore body scroll
        document.body.style.overflow = '';

        // Restore focus
        if (this.previousFocus) {
            this.previousFocus.focus();
        }

        // Call onClose callback
        if (this.props.onClose) {
            this.props.onClose();
        }

        // Trigger close event
        this.emit('modal:close');
    }

    async confirm() {
        if (this.props.onConfirm) {
            const result = await this.props.onConfirm();
            if (result !== false) {
                this.close();
            }
        } else {
            this.close();
        }
    }

    async cancel() {
        if (this.props.onCancel) {
            await this.props.onCancel();
        }
        this.close();
    }

    setContent(content) {
        const bodyElement = this.find('.modal__body');
        if (bodyElement) {
            bodyElement.innerHTML = content;
        }
    }

    setTitle(title) {
        const titleElement = this.find('.modal__title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    isOpen() {
        return this.state.isOpen;
    }

    async onDestroy() {
        // Ensure modal is closed and body scroll is restored
        if (this.state.isOpen) {
            document.body.style.overflow = '';
        }
    }

    // Static method to show a simple alert
    static async alert(message, title = 'Alert') {
        const container = document.createElement('div');
        document.body.appendChild(container);

        const modal = new ModalComponent(container, {
            title,
            content: message,
            showFooter: true,
            cancelText: 'OK',
            confirmText: '',
            onCancel: () => {
                modal.destroy();
                container.remove();
            }
        });

        await modal.render();
        await modal.open();

        return modal;
    }

    // Static method to show a confirmation dialog
    static async confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const container = document.createElement('div');
            document.body.appendChild(container);

            const modal = new ModalComponent(container, {
                title,
                content: message,
                showFooter: true,
                onConfirm: () => {
                    modal.destroy();
                    container.remove();
                    resolve(true);
                },
                onCancel: () => {
                    modal.destroy();
                    container.remove();
                    resolve(false);
                }
            });

            modal.render().then(() => modal.open());
        });
    }
}

// Export for use in other modules
window.ModalComponent = ModalComponent;