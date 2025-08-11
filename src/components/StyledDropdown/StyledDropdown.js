export class StyledDropdown {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            id: options.id || 'dropdown-' + Date.now(),
            label: options.label || '',
            placeholder: options.placeholder || 'Select an option',
            helperText: options.helperText || '',
            options: options.options || [],
            value: options.value || null,
            onChange: options.onChange || (() => {}),
            disabled: options.disabled || false,
            loading: options.loading || false,
            searchable: options.searchable || false
        };
        
        this.selectedOption = null;
        this.isOpen = false;
        this.focusedIndex = -1;
        
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        
        // Set initial value if provided
        if (this.options.value) {
            this.setValue(this.options.value);
        }
    }
    
    render() {
        const template = `
            <div class="styled-dropdown-container">
                ${this.options.label ? `<label class="dropdown-label" id="dropdown-label-${this.options.id}">${this.options.label}</label>` : ''}
                <div class="dropdown-wrapper">
                    <div class="dropdown-trigger ${this.options.disabled ? 'disabled' : ''} ${this.options.loading ? 'loading' : ''}" 
                         tabindex="${this.options.disabled ? -1 : 0}" 
                         role="button" 
                         aria-haspopup="listbox" 
                         aria-expanded="false" 
                         aria-labelledby="dropdown-label-${this.options.id}"
                         data-placeholder="true">
                        <div class="selected-option">
                            <i class="option-icon fas"></i>
                            <span class="option-text">${this.options.placeholder}</span>
                        </div>
                        <i class="fas fa-chevron-down dropdown-arrow"></i>
                    </div>
                    <div class="dropdown-menu" role="listbox" aria-labelledby="dropdown-label-${this.options.id}">
                        ${this.renderOptions()}
                    </div>
                </div>
                ${this.options.helperText ? `<small class="dropdown-helper-text">${this.options.helperText}</small>` : ''}
            </div>
        `;
        
        this.container.innerHTML = template;
        
        // Cache DOM elements
        this.trigger = this.container.querySelector('.dropdown-trigger');
        this.menu = this.container.querySelector('.dropdown-menu');
        this.selectedText = this.container.querySelector('.option-text');
        this.selectedIcon = this.container.querySelector('.option-icon');
    }
    
    renderOptions() {
        return this.options.options.map((option, index) => `
            <div class="dropdown-option" 
                 role="option" 
                 tabindex="-1" 
                 data-value="${option.value}"
                 data-index="${index}">
                ${option.icon ? `<i class="dropdown-option-icon ${option.icon}"></i>` : ''}
                <div class="dropdown-option-content">
                    <div class="dropdown-option-title">${option.title}</div>
                    ${option.description ? `<div class="dropdown-option-description">${option.description}</div>` : ''}
                </div>
                ${option.badge ? `<span class="dropdown-option-badge">${option.badge}</span>` : ''}
            </div>
        `).join('');
    }
    
    attachEventListeners() {
        // Trigger click
        this.trigger.addEventListener('click', () => this.toggle());
        
        // Keyboard navigation on trigger
        this.trigger.addEventListener('keydown', (e) => this.handleTriggerKeydown(e));
        
        // Option clicks
        this.menu.addEventListener('click', (e) => {
            const option = e.target.closest('.dropdown-option');
            if (option) {
                const value = option.dataset.value;
                this.selectOption(value);
            }
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
        
        // Keyboard navigation in menu
        this.menu.addEventListener('keydown', (e) => this.handleMenuKeydown(e));
    }
    
    handleTriggerKeydown(e) {
        switch(e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.toggle();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.open();
                this.focusOption(0);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.open();
                this.focusOption(this.options.options.length - 1);
                break;
            case 'Escape':
                this.close();
                break;
        }
    }
    
    handleMenuKeydown(e) {
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.focusOption(this.focusedIndex + 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.focusOption(this.focusedIndex - 1);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (this.focusedIndex >= 0) {
                    const option = this.options.options[this.focusedIndex];
                    this.selectOption(option.value);
                }
                break;
            case 'Escape':
                this.close();
                this.trigger.focus();
                break;
            case 'Tab':
                this.close();
                break;
        }
    }
    
    focusOption(index) {
        const optionElements = this.menu.querySelectorAll('.dropdown-option');
        
        // Wrap around
        if (index < 0) index = optionElements.length - 1;
        if (index >= optionElements.length) index = 0;
        
        this.focusedIndex = index;
        optionElements[index].focus();
    }
    
    toggle() {
        if (this.options.disabled || this.options.loading) return;
        
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        if (this.options.disabled || this.options.loading) return;
        
        this.isOpen = true;
        this.trigger.classList.add('active');
        this.trigger.setAttribute('aria-expanded', 'true');
        this.menu.classList.add('active');
        
        // Focus first option or selected option
        if (this.selectedOption) {
            const selectedIndex = this.options.options.findIndex(opt => opt.value === this.selectedOption.value);
            this.focusOption(selectedIndex);
        } else {
            this.focusOption(0);
        }
    }
    
    close() {
        this.isOpen = false;
        this.trigger.classList.remove('active');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.menu.classList.remove('active');
        this.focusedIndex = -1;
    }
    
    selectOption(value) {
        const option = this.options.options.find(opt => opt.value === value);
        if (!option) return;
        
        this.selectedOption = option;
        this.updateDisplay();
        this.close();
        this.trigger.focus();
        
        // Call onChange callback
        this.options.onChange(value, option);
    }
    
    updateDisplay() {
        if (this.selectedOption) {
            this.selectedText.textContent = this.selectedOption.title;
            this.trigger.removeAttribute('data-placeholder');
            
            if (this.selectedOption.icon) {
                this.selectedIcon.className = `option-icon ${this.selectedOption.icon}`;
                this.selectedIcon.style.display = 'block';
            } else {
                this.selectedIcon.style.display = 'none';
            }
            
            // Update selected state in menu
            this.menu.querySelectorAll('.dropdown-option').forEach(opt => {
                if (opt.dataset.value === this.selectedOption.value) {
                    opt.classList.add('selected');
                    opt.setAttribute('aria-selected', 'true');
                } else {
                    opt.classList.remove('selected');
                    opt.setAttribute('aria-selected', 'false');
                }
            });
        }
    }
    
    setValue(value) {
        this.selectOption(value);
    }
    
    getValue() {
        return this.selectedOption ? this.selectedOption.value : null;
    }
    
    setOptions(options) {
        this.options.options = options;
        this.menu.innerHTML = this.renderOptions();
        
        // Re-select current option if it still exists
        if (this.selectedOption) {
            const stillExists = options.find(opt => opt.value === this.selectedOption.value);
            if (stillExists) {
                this.updateDisplay();
            } else {
                this.reset();
            }
        }
    }
    
    setLoading(loading) {
        this.options.loading = loading;
        if (loading) {
            this.trigger.classList.add('loading');
            this.trigger.setAttribute('tabindex', '-1');
        } else {
            this.trigger.classList.remove('loading');
            this.trigger.setAttribute('tabindex', '0');
        }
    }
    
    setDisabled(disabled) {
        this.options.disabled = disabled;
        if (disabled) {
            this.trigger.classList.add('disabled');
            this.trigger.setAttribute('tabindex', '-1');
            this.close();
        } else {
            this.trigger.classList.remove('disabled');
            this.trigger.setAttribute('tabindex', '0');
        }
    }
    
    reset() {
        this.selectedOption = null;
        this.selectedText.textContent = this.options.placeholder;
        this.trigger.setAttribute('data-placeholder', 'true');
        this.selectedIcon.style.display = 'none';
        
        this.menu.querySelectorAll('.dropdown-option').forEach(opt => {
            opt.classList.remove('selected');
            opt.setAttribute('aria-selected', 'false');
        });
    }
    
    destroy() {
        this.container.innerHTML = '';
    }
}