export class SearchBar {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            placeholder: options.placeholder || 'Search...',
            onSearch: options.onSearch || (() => {}),
            onClear: options.onClear || (() => {}),
            debounceTime: options.debounceTime || 300,
            icon: options.icon || 'fas fa-search',
            showClearButton: options.showClearButton !== false,
            ...options
        };
        this.searchTimeout = null;
        this.currentValue = '';
        this.init();
    }

    init() {
        if (!this.container) return;
        this.render();
        this.attachEventListeners();
    }

    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="search-bar">
                <i class="${this.options.icon} search-icon"></i>
                <input 
                    type="text" 
                    class="search-input" 
                    placeholder="${this.options.placeholder}"
                    value="${this.currentValue}"
                >
                ${this.options.showClearButton ? `
                    <button class="search-clear ${this.currentValue ? '' : 'hidden'}" aria-label="Clear search">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }

    attachEventListeners() {
        const input = this.container.querySelector('.search-input');
        const clearButton = this.container.querySelector('.search-clear');

        if (input) {
            input.addEventListener('input', (e) => {
                this.handleInput(e.target.value);
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch(e.target.value, true);
                }
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clear();
            });
        }
    }

    handleInput(value) {
        this.currentValue = value;
        
        // Update clear button visibility
        const clearButton = this.container.querySelector('.search-clear');
        if (clearButton) {
            if (value) {
                clearButton.classList.remove('hidden');
            } else {
                clearButton.classList.add('hidden');
            }
        }

        // Debounce search
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            this.handleSearch(value, false);
        }, this.options.debounceTime);
    }

    handleSearch(value, immediate = false) {
        if (this.searchTimeout && !immediate) {
            clearTimeout(this.searchTimeout);
        }
        this.options.onSearch(value);
    }

    clear() {
        this.currentValue = '';
        const input = this.container.querySelector('.search-input');
        if (input) {
            input.value = '';
        }
        
        const clearButton = this.container.querySelector('.search-clear');
        if (clearButton) {
            clearButton.classList.add('hidden');
        }
        
        this.options.onClear();
        this.options.onSearch('');
    }

    setValue(value) {
        this.currentValue = value;
        const input = this.container.querySelector('.search-input');
        if (input) {
            input.value = value;
        }
        
        const clearButton = this.container.querySelector('.search-clear');
        if (clearButton) {
            if (value) {
                clearButton.classList.remove('hidden');
            } else {
                clearButton.classList.add('hidden');
            }
        }
    }

    getValue() {
        return this.currentValue;
    }

    focus() {
        const input = this.container.querySelector('.search-input');
        if (input) {
            input.focus();
        }
    }

    disable() {
        const input = this.container.querySelector('.search-input');
        if (input) {
            input.disabled = true;
        }
    }

    enable() {
        const input = this.container.querySelector('.search-input');
        if (input) {
            input.disabled = false;
        }
    }
}