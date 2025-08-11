export class Toast {
    constructor(options = {}) {
        this.options = {
            message: options.message || '',
            type: options.type || 'info', // success, error, warning, info
            duration: options.duration || 3000,
            position: options.position || 'top-right', // top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
            animate: options.animate !== false,
            autoHide: options.autoHide !== false,
            closeButton: options.closeButton !== false,
            icon: options.icon || null,
            progress: options.progress !== false,
            onClick: options.onClick || null,
            onClose: options.onClose || null,
            ...options
        };
        
        this.container = null;
        this.toastElement = null;
        this.progressElement = null;
        this.hideTimeout = null;
        this.startTime = null;
        this.remainingTime = this.options.duration;
        
        this.init();
    }
    
    init() {
        this.ensureContainer();
        this.createElement();
        this.show();
    }
    
    ensureContainer() {
        const containerId = `toast-container-${this.options.position}`;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            this.container.className = `toast-container toast-${this.options.position}`;
            document.body.appendChild(this.container);
        }
    }
    
    createElement() {
        this.toastElement = document.createElement('div');
        this.toastElement.className = `toast toast-${this.options.type} ${this.options.animate ? 'toast-animate' : ''}`;
        
        const icon = this.getIcon();
        
        this.toastElement.innerHTML = `
            <div class="toast-content">
                ${icon ? `<div class="toast-icon">${icon}</div>` : ''}
                <div class="toast-body">
                    <div class="toast-message">${this.options.message}</div>
                </div>
                ${this.options.closeButton ? `
                    <button class="toast-close" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                ` : ''}
            </div>
            ${this.options.progress && this.options.autoHide ? `
                <div class="toast-progress">
                    <div class="toast-progress-bar"></div>
                </div>
            ` : ''}
        `;
        
        this.attachEventListeners();
    }
    
    getIcon() {
        if (this.options.icon) {
            return `<i class="${this.options.icon}"></i>`;
        }
        
        const defaultIcons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        
        return defaultIcons[this.options.type] || '';
    }
    
    attachEventListeners() {
        // Close button
        const closeBtn = this.toastElement.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hide();
            });
        }
        
        // Click handler
        if (this.options.onClick) {
            this.toastElement.style.cursor = 'pointer';
            this.toastElement.addEventListener('click', () => {
                this.options.onClick(this);
            });
        }
        
        // Pause on hover
        if (this.options.autoHide) {
            this.toastElement.addEventListener('mouseenter', () => {
                this.pauseTimer();
            });
            
            this.toastElement.addEventListener('mouseleave', () => {
                this.resumeTimer();
            });
        }
    }
    
    show() {
        this.container.appendChild(this.toastElement);
        
        // Force reflow for animation
        if (this.options.animate) {
            this.toastElement.offsetHeight;
        }
        
        requestAnimationFrame(() => {
            this.toastElement.classList.add('show');
            
            if (this.options.autoHide) {
                this.startTimer();
            }
        });
    }
    
    hide() {
        if (!this.toastElement) return;
        
        this.clearTimer();
        
        this.toastElement.classList.remove('show');
        
        const onTransitionEnd = () => {
            if (this.toastElement && this.toastElement.parentNode) {
                this.toastElement.parentNode.removeChild(this.toastElement);
            }
            
            // Remove container if empty
            if (this.container && this.container.children.length === 0) {
                this.container.parentNode.removeChild(this.container);
            }
            
            if (this.options.onClose) {
                this.options.onClose(this);
            }
        };
        
        if (this.options.animate) {
            this.toastElement.addEventListener('transitionend', onTransitionEnd, { once: true });
            setTimeout(onTransitionEnd, 300); // Fallback
        } else {
            onTransitionEnd();
        }
    }
    
    startTimer() {
        if (!this.options.autoHide) return;
        
        this.startTime = Date.now();
        this.progressElement = this.toastElement.querySelector('.toast-progress-bar');
        
        if (this.progressElement) {
            this.progressElement.style.transition = `width ${this.options.duration}ms linear`;
            this.progressElement.style.width = '0%';
        }
        
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, this.options.duration);
    }
    
    pauseTimer() {
        if (!this.hideTimeout) return;
        
        clearTimeout(this.hideTimeout);
        
        if (this.progressElement) {
            const elapsed = Date.now() - this.startTime;
            const progress = (elapsed / this.options.duration) * 100;
            this.remainingTime = this.options.duration - elapsed;
            
            this.progressElement.style.transition = 'none';
            this.progressElement.style.width = `${progress}%`;
        }
    }
    
    resumeTimer() {
        if (!this.options.autoHide || this.remainingTime <= 0) return;
        
        this.startTime = Date.now();
        
        if (this.progressElement) {
            this.progressElement.style.transition = `width ${this.remainingTime}ms linear`;
            this.progressElement.style.width = '0%';
        }
        
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, this.remainingTime);
    }
    
    clearTimer() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }
    
    update(options = {}) {
        if (options.message) {
            const messageEl = this.toastElement.querySelector('.toast-message');
            if (messageEl) {
                messageEl.textContent = options.message;
            }
        }
        
        if (options.type && options.type !== this.options.type) {
            this.toastElement.classList.remove(`toast-${this.options.type}`);
            this.toastElement.classList.add(`toast-${options.type}`);
            this.options.type = options.type;
            
            // Update icon
            const iconEl = this.toastElement.querySelector('.toast-icon');
            if (iconEl) {
                iconEl.innerHTML = this.getIcon();
            }
        }
    }
    
    // Static methods
    static success(message, options = {}) {
        return new Toast({
            ...options,
            message,
            type: 'success'
        });
    }
    
    static error(message, options = {}) {
        return new Toast({
            ...options,
            message,
            type: 'error',
            duration: options.duration || 5000
        });
    }
    
    static warning(message, options = {}) {
        return new Toast({
            ...options,
            message,
            type: 'warning'
        });
    }
    
    static info(message, options = {}) {
        return new Toast({
            ...options,
            message,
            type: 'info'
        });
    }
    
    static clearAll() {
        document.querySelectorAll('.toast-container').forEach(container => {
            container.remove();
        });
    }
}

// Toast Manager for queueing and managing multiple toasts
export class ToastManager {
    constructor(options = {}) {
        this.options = {
            maxToasts: options.maxToasts || 5,
            newestOnTop: options.newestOnTop !== false,
            preventDuplicates: options.preventDuplicates || false,
            ...options
        };
        
        this.toasts = new Map();
    }
    
    show(message, type = 'info', options = {}) {
        // Check for duplicates
        if (this.options.preventDuplicates) {
            for (const [id, toast] of this.toasts) {
                if (toast.options.message === message && toast.options.type === type) {
                    return toast;
                }
            }
        }
        
        // Remove oldest if at max
        if (this.toasts.size >= this.options.maxToasts) {
            const oldestId = this.toasts.keys().next().value;
            const oldestToast = this.toasts.get(oldestId);
            if (oldestToast) {
                oldestToast.hide();
                this.toasts.delete(oldestId);
            }
        }
        
        // Create new toast
        const toast = new Toast({
            ...options,
            message,
            type,
            onClose: (t) => {
                this.toasts.delete(t.id);
                if (options.onClose) {
                    options.onClose(t);
                }
            }
        });
        
        toast.id = Date.now();
        this.toasts.set(toast.id, toast);
        
        return toast;
    }
    
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }
    
    error(message, options = {}) {
        return this.show(message, 'error', options);
    }
    
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }
    
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
    
    clear() {
        this.toasts.forEach(toast => toast.hide());
        this.toasts.clear();
    }
}

// Global instance
export const toastManager = new ToastManager();