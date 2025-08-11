export class ProgressBar {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            value: options.value || 0,
            max: options.max || 100,
            label: options.label || null,
            showPercentage: options.showPercentage !== false,
            showLabel: options.showLabel !== false,
            size: options.size || 'medium', // small, medium, large
            variant: options.variant || 'primary', // primary, success, warning, danger, info
            striped: options.striped || false,
            animated: options.animated || false,
            indeterminate: options.indeterminate || false,
            segments: options.segments || null, // Array of {value, variant, label}
            onComplete: options.onComplete || null,
            transitionDuration: options.transitionDuration || 300,
            ...options
        };
        
        this.state = {
            currentValue: 0,
            isComplete: false
        };
        
        this.init();
    }
    
    init() {
        this.render();
        this.setValue(this.options.value, false);
    }
    
    render() {
        const percentage = this.getPercentage();
        const sizeClass = `progress-${this.options.size}`;
        const variantClass = `progress-${this.options.variant}`;
        
        const html = `
            <div class="progress-wrapper ${sizeClass}">
                ${this.renderLabel()}
                <div class="progress ${this.options.striped ? 'progress-striped' : ''} ${this.options.animated ? 'progress-animated' : ''}">
                    ${this.options.segments ? this.renderSegments() : this.renderSingleBar()}
                </div>
                ${this.renderPercentage()}
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Store references
        this.progressBar = this.container.querySelector('.progress-bar');
        this.percentageEl = this.container.querySelector('.progress-percentage');
        this.labelEl = this.container.querySelector('.progress-label');
    }
    
    renderLabel() {
        if (!this.options.showLabel || !this.options.label) return '';
        
        return `<div class="progress-label">${this.options.label}</div>`;
    }
    
    renderSingleBar() {
        const percentage = this.getPercentage();
        const variantClass = `progress-bar-${this.options.variant}`;
        
        if (this.options.indeterminate) {
            return `
                <div class="progress-bar ${variantClass} progress-bar-indeterminate" 
                     role="progressbar" 
                     aria-valuenow="${this.state.currentValue}" 
                     aria-valuemin="0" 
                     aria-valuemax="${this.options.max}">
                </div>
            `;
        }
        
        return `
            <div class="progress-bar ${variantClass}" 
                 role="progressbar" 
                 style="width: ${percentage}%"
                 aria-valuenow="${this.state.currentValue}" 
                 aria-valuemin="0" 
                 aria-valuemax="${this.options.max}">
                ${this.options.showPercentage && !this.options.size === 'small' ? `<span>${Math.round(percentage)}%</span>` : ''}
            </div>
        `;
    }
    
    renderSegments() {
        return this.options.segments.map((segment, index) => {
            const segmentPercentage = (segment.value / this.options.max) * 100;
            const variantClass = `progress-bar-${segment.variant || 'primary'}`;
            
            return `
                <div class="progress-bar ${variantClass} progress-segment" 
                     style="width: ${segmentPercentage}%"
                     title="${segment.label || ''}"
                     data-segment="${index}">
                    ${segment.label && this.options.size !== 'small' ? `<span>${segment.label}</span>` : ''}
                </div>
            `;
        }).join('');
    }
    
    renderPercentage() {
        if (!this.options.showPercentage || this.options.indeterminate || this.options.segments) return '';
        
        const percentage = Math.round(this.getPercentage());
        
        return `<div class="progress-percentage">${percentage}%</div>`;
    }
    
    getPercentage() {
        return Math.min(100, Math.max(0, (this.state.currentValue / this.options.max) * 100));
    }
    
    setValue(value, animate = true) {
        const oldValue = this.state.currentValue;
        this.state.currentValue = Math.min(this.options.max, Math.max(0, value));
        
        if (this.progressBar && !this.options.indeterminate && !this.options.segments) {
            const percentage = this.getPercentage();
            
            if (animate) {
                this.progressBar.style.transition = `width ${this.options.transitionDuration}ms ease-out`;
            } else {
                this.progressBar.style.transition = 'none';
            }
            
            this.progressBar.style.width = `${percentage}%`;
            this.progressBar.setAttribute('aria-valuenow', this.state.currentValue);
            
            if (this.progressBar.querySelector('span')) {
                this.progressBar.querySelector('span').textContent = `${Math.round(percentage)}%`;
            }
        }
        
        if (this.percentageEl) {
            this.percentageEl.textContent = `${Math.round(this.getPercentage())}%`;
        }
        
        // Check if complete
        if (!this.state.isComplete && this.state.currentValue >= this.options.max) {
            this.state.isComplete = true;
            this.container.classList.add('progress-complete');
            
            if (this.options.onComplete) {
                setTimeout(() => {
                    this.options.onComplete();
                }, animate ? this.options.transitionDuration : 0);
            }
        } else if (this.state.isComplete && this.state.currentValue < this.options.max) {
            this.state.isComplete = false;
            this.container.classList.remove('progress-complete');
        }
    }
    
    increment(amount = 1, animate = true) {
        this.setValue(this.state.currentValue + amount, animate);
    }
    
    decrement(amount = 1, animate = true) {
        this.setValue(this.state.currentValue - amount, animate);
    }
    
    setLabel(label) {
        this.options.label = label;
        if (this.labelEl) {
            this.labelEl.textContent = label;
        }
    }
    
    setVariant(variant) {
        if (this.progressBar) {
            const oldClass = `progress-bar-${this.options.variant}`;
            const newClass = `progress-bar-${variant}`;
            this.progressBar.classList.remove(oldClass);
            this.progressBar.classList.add(newClass);
        }
        this.options.variant = variant;
    }
    
    setIndeterminate(indeterminate) {
        this.options.indeterminate = indeterminate;
        this.render();
    }
    
    reset(animate = true) {
        this.setValue(0, animate);
    }
    
    complete(animate = true) {
        this.setValue(this.options.max, animate);
    }
    
    // Static factory methods
    static circular(container, options = {}) {
        return new CircularProgressBar(container, options);
    }
    
    static multi(container, segments, options = {}) {
        return new ProgressBar(container, {
            ...options,
            segments: segments
        });
    }
}

// Circular progress bar variant
export class CircularProgressBar {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            value: options.value || 0,
            max: options.max || 100,
            size: options.size || 100,
            strokeWidth: options.strokeWidth || 8,
            variant: options.variant || 'primary',
            showPercentage: options.showPercentage !== false,
            showLabel: options.showLabel || false,
            label: options.label || '',
            animate: options.animate !== false,
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.render();
        this.setValue(this.options.value, false);
    }
    
    render() {
        const radius = (this.options.size - this.options.strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        
        const html = `
            <div class="circular-progress" style="width: ${this.options.size}px; height: ${this.options.size}px;">
                <svg class="circular-progress-svg" width="${this.options.size}" height="${this.options.size}">
                    <circle
                        class="circular-progress-bg"
                        stroke-width="${this.options.strokeWidth}"
                        fill="transparent"
                        r="${radius}"
                        cx="${this.options.size / 2}"
                        cy="${this.options.size / 2}"
                    />
                    <circle
                        class="circular-progress-bar circular-progress-${this.options.variant}"
                        stroke-width="${this.options.strokeWidth}"
                        stroke-dasharray="${circumference} ${circumference}"
                        stroke-dashoffset="${circumference}"
                        stroke-linecap="round"
                        fill="transparent"
                        r="${radius}"
                        cx="${this.options.size / 2}"
                        cy="${this.options.size / 2}"
                        transform="rotate(-90 ${this.options.size / 2} ${this.options.size / 2})"
                    />
                </svg>
                <div class="circular-progress-content">
                    ${this.options.showPercentage ? '<div class="circular-progress-percentage">0%</div>' : ''}
                    ${this.options.showLabel ? `<div class="circular-progress-label">${this.options.label}</div>` : ''}
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        this.progressCircle = this.container.querySelector('.circular-progress-bar');
        this.percentageEl = this.container.querySelector('.circular-progress-percentage');
        this.circumference = circumference;
    }
    
    setValue(value, animate = true) {
        const percentage = Math.min(100, Math.max(0, (value / this.options.max) * 100));
        const offset = this.circumference - (percentage / 100) * this.circumference;
        
        if (this.progressCircle) {
            if (animate && this.options.animate) {
                this.progressCircle.style.transition = 'stroke-dashoffset 0.3s ease-out';
            } else {
                this.progressCircle.style.transition = 'none';
            }
            
            this.progressCircle.style.strokeDashoffset = offset;
        }
        
        if (this.percentageEl) {
            this.percentageEl.textContent = `${Math.round(percentage)}%`;
        }
    }
}