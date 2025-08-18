export class TabNavigation {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            onTabChange: options.onTabChange || (() => {}),
            activeTab: options.activeTab || 0,
            ...options
        };
        this.tabs = [];
        this.init();
    }

    init() {
        if (!this.container) return;
        this.render();
        this.attachEventListeners();
    }

    setTabs(tabs) {
        this.tabs = tabs;
        this.render();
    }

    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="tab-navigation">
                ${this.tabs.map((tab, index) => `
                    <button class="tab-button ${index === this.options.activeTab ? 'active' : ''}" 
                            data-tab="${tab.id || index}"
                            data-index="${index}">
                        ${tab.icon ? `<i class="${tab.icon}"></i>` : ''}
                        ${tab.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    attachEventListeners() {
        this.container.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-button');
            if (!button) return;

            const index = parseInt(button.dataset.index);
            const tabId = button.dataset.tab;
            
            this.setActiveTab(index);
            this.options.onTabChange(tabId, index);
        });
    }

    setActiveTab(index) {
        this.options.activeTab = index;
        
        const buttons = this.container.querySelectorAll('.tab-button');
        buttons.forEach((button, i) => {
            if (i === index) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    getActiveTab() {
        return this.options.activeTab;
    }
}