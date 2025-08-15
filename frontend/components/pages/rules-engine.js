// Rules Engine Page Component

class RulesEnginePage extends BaseComponent {
    getDefaultProps() {
        return {
            apiService: null
        };
    }

    async createHTML() {
        return `
            <div class="rules-engine">
                <h1>Rules Engine</h1>
                <div class="rules-builder">
                    <h2>Create New Rule</h2>
                    <div class="rule-conditions">
                        <h3>Conditions</h3>
                        <div id="conditions-container"></div>
                        <button class="btn btn--secondary" id="add-condition">Add Condition</button>
                    </div>
                    <div class="rule-actions">
                        <h3>Actions</h3>
                        <div id="actions-container"></div>
                        <button class="btn btn--secondary" id="add-action">Add Action</button>
                    </div>
                    <button class="btn btn--primary" id="save-rule">Save Rule</button>
                </div>
                <div class="existing-rules">
                    <h2>Existing Rules</h2>
                    <div id="rules-list"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener('#add-condition', 'click', () => this.addCondition());
        this.addEventListener('#add-action', 'click', () => this.addAction());
        this.addEventListener('#save-rule', 'click', () => this.saveRule());
    }

    addCondition() {
        const container = this.find('#conditions-container');
        const conditionHTML = `
            <div class="condition-row">
                <select class="field-select">
                    <option>Select Field</option>
                </select>
                <select class="operator-select">
                    <option>equals</option>
                    <option>contains</option>
                    <option>greater than</option>
                </select>
                <input type="text" class="value-input" placeholder="Value">
                <button class="btn btn--danger btn--sm remove-condition">Remove</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', conditionHTML);
    }

    addAction() {
        const container = this.find('#actions-container');
        const actionHTML = `
            <div class="action-row">
                <select class="action-type">
                    <option>Send Notification</option>
                    <option>Update Field</option>
                    <option>Trigger Job</option>
                </select>
                <input type="text" class="action-value" placeholder="Action parameters">
                <button class="btn btn--danger btn--sm remove-action">Remove</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', actionHTML);
    }

    async saveRule() {
        // Collect rule data and save
        window.app.showNotification('Rule saved successfully!', 'success');
    }
}

window.RulesEnginePage = RulesEnginePage;