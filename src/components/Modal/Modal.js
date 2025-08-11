export class Modal {
    constructor(options = {}) {
        this.options = {
            title: options.title || '',
            content: options.content || '',
            size: options.size || 'medium', // small, medium, large, xlarge
            centered: options.centered !== false,
            backdrop: options.backdrop !== false,
            keyboard: options.keyboard !== false,
            closeButton: options.closeButton !== false,
            footer: options.footer || null,
            footerButtons: options.footerButtons || [],
            onShow: options.onShow || null,
            onShown: options.onShown || null,
            onHide: options.onHide || null,
            onHidden: options.onHidden || null,
            animate: options.animate !== false,
            ...options
        };
        
        this.isOpen = false;
        this.modalElement = null;
        this.backdropElement = null;
        
        this.init();
    }
    
    init() {
        this.createModal();
        this.attachEventListeners();
    }
    
    createModal() {
        // Create backdrop
        this.backdropElement = document.createElement('div');
        this.backdropElement.className = 'modal-backdrop';
        if (this.options.animate) {
            this.backdropElement.classList.add('fade');
        }
        // Force backdrop styles
        this.backdropElement.style.position = 'fixed';
        this.backdropElement.style.top = '0';
        this.backdropElement.style.left = '0';
        this.backdropElement.style.width = '100%';
        this.backdropElement.style.height = '100%';
        this.backdropElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.backdropElement.style.zIndex = '1040';
        
        // Create modal
        this.modalElement = document.createElement('div');
        this.modalElement.className = `modal ${this.options.animate ? 'fade' : ''}`;
        this.modalElement.setAttribute('tabindex', '-1');
        this.modalElement.setAttribute('role', 'dialog');
        this.modalElement.setAttribute('aria-hidden', 'true');
        // Force modal styles
        this.modalElement.style.position = 'fixed';
        this.modalElement.style.top = '0';
        this.modalElement.style.left = '0';
        this.modalElement.style.width = '100%';
        this.modalElement.style.height = '100%';
        this.modalElement.style.zIndex = '1050';
        this.modalElement.style.overflow = 'auto';
        
        const modalDialog = document.createElement('div');
        modalDialog.className = `modal-dialog modal-${this.options.size} ${this.options.centered ? 'modal-dialog-centered' : ''}`;
        modalDialog.setAttribute('role', 'document');
        // Force modal dialog styles
        modalDialog.style.position = 'relative';
        modalDialog.style.margin = '1.75rem auto';
        modalDialog.style.pointerEvents = 'none';
        modalDialog.style.display = 'flex';
        modalDialog.style.alignItems = 'center';
        modalDialog.style.minHeight = 'calc(100% - 3.5rem)';
        modalDialog.style.maxWidth = this.options.size === 'large' ? '800px' : '500px';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        // Force modal content styles
        modalContent.style.position = 'relative';
        modalContent.style.display = 'flex';
        modalContent.style.flexDirection = 'column';
        modalContent.style.width = '100%';
        modalContent.style.pointerEvents = 'auto';
        modalContent.style.backgroundColor = '#ffffff';
        modalContent.style.border = '1px solid #e0e0e0';
        modalContent.style.borderRadius = '8px';
        modalContent.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
        modalContent.style.outline = '0';
        
        modalContent.innerHTML = `
            ${this.renderHeader()}
            ${this.renderBody()}
            ${this.renderFooter()}
        `;
        
        modalDialog.appendChild(modalContent);
        this.modalElement.appendChild(modalDialog);
    }
    
    renderHeader() {
        if (!this.options.title && !this.options.closeButton) return '';
        
        return `
            <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0;">
                ${this.options.title ? `<h5 class="modal-title" style="margin: 0; font-size: 1.25rem; font-weight: 500;">${this.options.title}</h5>` : ''}
                ${this.options.closeButton ? `
                    <button type="button" class="modal-close" aria-label="Close" style="padding: 0; background: transparent; border: 0; font-size: 1.5rem; font-weight: 700; line-height: 1; color: #999; cursor: pointer;">
                        <span aria-hidden="true">&times;</span>
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    renderBody() {
        return `
            <div class="modal-body" style="padding: 1.5rem;">
                ${this.options.content}
            </div>
        `;
    }
    
    renderFooter() {
        if (!this.options.footer && this.options.footerButtons.length === 0) return '';
        
        const buttons = this.options.footerButtons.map(button => {
            const btnClass = button.class || 'btn-secondary';
            const btnText = button.text || 'Button';
            const btnId = button.id || `modal-btn-${Date.now()}`;
            
            return `
                <button 
                    type="button" 
                    class="btn ${btnClass}" 
                    id="${btnId}"
                    ${button.disabled ? 'disabled' : ''}
                    style="padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.95rem; ${btnClass.includes('primary') ? 'background: #6a5acd; color: white; border: none;' : 'background: #f0f2f5; color: #333; border: 1px solid #e0e0e0;'}"
                >
                    ${button.icon ? `<i class="${button.icon}"></i> ` : ''}
                    ${btnText}
                </button>
            `;
        }).join('');
        
        return `
            <div class="modal-footer" style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; padding: 1rem 1.5rem; border-top: 1px solid #e0e0e0;">
                ${this.options.footer || ''}
                ${buttons}
            </div>
        `;
    }
    
    attachEventListeners() {
        // Close button
        const closeBtn = this.modalElement.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Backdrop click
        if (this.options.backdrop) {
            this.modalElement.addEventListener('click', (e) => {
                if (e.target === this.modalElement) {
                    this.hide();
                }
            });
        }
        
        // Keyboard events
        if (this.options.keyboard) {
            this.handleKeyboard = (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.hide();
                }
            };
        }
        
        // Footer buttons
        this.options.footerButtons.forEach(button => {
            if (button.handler) {
                const btnElement = this.modalElement.querySelector(`#${button.id || `modal-btn-${Date.now()}`}`);
                if (btnElement) {
                    btnElement.addEventListener('click', (e) => {
                        button.handler(e, this);
                    });
                }
            }
        });
    }
    
    show() {
        if (this.isOpen) return;
        
        // Trigger onShow callback
        if (this.options.onShow) {
            this.options.onShow(this);
        }
        
        // Add to DOM
        document.body.appendChild(this.backdropElement);
        document.body.appendChild(this.modalElement);
        
        // Force reflow for animation
        if (this.options.animate) {
            this.modalElement.offsetHeight;
            this.backdropElement.offsetHeight;
        }
        
        // Show modal
        requestAnimationFrame(() => {
            document.body.classList.add('modal-open');
            this.backdropElement.classList.add('show');
            this.modalElement.classList.add('show');
            this.modalElement.style.display = 'block';
            this.modalElement.setAttribute('aria-hidden', 'false');
            
            // Set focus
            const focusableElement = this.modalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusableElement) {
                focusableElement.focus();
            }
            
            this.isOpen = true;
            
            // Add keyboard listener
            if (this.handleKeyboard) {
                document.addEventListener('keydown', this.handleKeyboard);
            }
            
            // Trigger onShown callback after animation
            if (this.options.animate) {
                setTimeout(() => {
                    if (this.options.onShown) {
                        this.options.onShown(this);
                    }
                }, 150);
            } else {
                if (this.options.onShown) {
                    this.options.onShown(this);
                }
            }
        });
    }
    
    hide() {
        if (!this.isOpen) return;
        
        // Trigger onHide callback
        if (this.options.onHide) {
            this.options.onHide(this);
        }
        
        // Hide modal
        this.modalElement.classList.remove('show');
        this.backdropElement.classList.remove('show');
        this.modalElement.setAttribute('aria-hidden', 'true');
        
        const cleanup = () => {
            this.modalElement.style.display = 'none';
            document.body.classList.remove('modal-open');
            
            // Remove from DOM
            if (this.backdropElement.parentNode) {
                this.backdropElement.parentNode.removeChild(this.backdropElement);
            }
            if (this.modalElement.parentNode) {
                this.modalElement.parentNode.removeChild(this.modalElement);
            }
            
            this.isOpen = false;
            
            // Remove keyboard listener
            if (this.handleKeyboard) {
                document.removeEventListener('keydown', this.handleKeyboard);
            }
            
            // Trigger onHidden callback
            if (this.options.onHidden) {
                this.options.onHidden(this);
            }
        };
        
        if (this.options.animate) {
            setTimeout(cleanup, 150);
        } else {
            cleanup();
        }
    }
    
    toggle() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    setTitle(title) {
        this.options.title = title;
        const titleElement = this.modalElement.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }
    
    setContent(content) {
        this.options.content = content;
        const bodyElement = this.modalElement.querySelector('.modal-body');
        if (bodyElement) {
            bodyElement.innerHTML = content;
        }
    }
    
    setFooter(footer) {
        this.options.footer = footer;
        const footerElement = this.modalElement.querySelector('.modal-footer');
        if (footerElement) {
            footerElement.innerHTML = footer;
        }
    }
    
    // Static methods
    static confirm(options = {}) {
        const modal = new Modal({
            title: options.title || 'Confirm',
            content: options.message || 'Are you sure?',
            size: options.size || 'small',
            footerButtons: [
                {
                    text: options.cancelText || 'Cancel',
                    class: 'btn-secondary',
                    handler: (e, modal) => {
                        modal.hide();
                        if (options.onCancel) options.onCancel();
                    }
                },
                {
                    text: options.confirmText || 'Confirm',
                    class: options.confirmClass || 'btn-primary',
                    handler: (e, modal) => {
                        modal.hide();
                        if (options.onConfirm) options.onConfirm();
                    }
                }
            ]
        });
        
        modal.show();
        return modal;
    }
    
    static alert(options = {}) {
        const modal = new Modal({
            title: options.title || 'Alert',
            content: options.message || '',
            size: options.size || 'small',
            footerButtons: [
                {
                    text: options.okText || 'OK',
                    class: 'btn-primary',
                    handler: (e, modal) => {
                        modal.hide();
                        if (options.onOk) options.onOk();
                    }
                }
            ]
        });
        
        modal.show();
        return modal;
    }
    
    static prompt(options = {}) {
        const inputId = `modal-prompt-${Date.now()}`;
        const modal = new Modal({
            title: options.title || 'Input',
            content: `
                <div class="form-group">
                    ${options.label ? `<label for="${inputId}">${options.label}</label>` : ''}
                    <input 
                        type="${options.type || 'text'}" 
                        class="form-control" 
                        id="${inputId}"
                        placeholder="${options.placeholder || ''}"
                        value="${options.defaultValue || ''}"
                    >
                </div>
            `,
            size: options.size || 'small',
            footerButtons: [
                {
                    text: options.cancelText || 'Cancel',
                    class: 'btn-secondary',
                    handler: (e, modal) => {
                        modal.hide();
                        if (options.onCancel) options.onCancel();
                    }
                },
                {
                    text: options.submitText || 'Submit',
                    class: 'btn-primary',
                    handler: (e, modal) => {
                        const input = modal.modalElement.querySelector(`#${inputId}`);
                        const value = input.value;
                        modal.hide();
                        if (options.onSubmit) options.onSubmit(value);
                    }
                }
            ]
        });
        
        modal.show();
        
        // Focus input
        setTimeout(() => {
            const input = modal.modalElement.querySelector(`#${inputId}`);
            if (input) {
                input.focus();
                input.select();
            }
        }, 150);
        
        return modal;
    }
}