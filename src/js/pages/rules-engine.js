function setupRulesEngine() {
    const rulesList = document.getElementById('rules-list');
    const addRuleButton = document.getElementById('add-rule-button');
    const totalTokenCostElement = document.getElementById('total-token-cost');

    if (!rulesList || !addRuleButton || !totalTokenCostElement) return;

    let totalTokenCost = 0;

    function createRuleElement() {
        const ruleId = Date.now();
        const ruleElement = document.createElement('div');
        ruleElement.classList.add('rule');
        ruleElement.dataset.id = ruleId;
        ruleElement.innerHTML = `
            <span>If</span>
            <input type="text" placeholder="this">
            <select class="operator-select">
                <option value="equals">equals</option>
                <option value="greater-than">greater than</option>
                <option value="less-than">less than</option>
            </select>
            <input type="text" placeholder="this">
            <span>then</span>
            <input type="text" placeholder="pass">
            <select class="api-select">
                <option value="">No API</option>
                <option value="internal">Internal API</option>
                <option value="external">External API</option>
            </select>
            <button class="delete-rule-button"><i class="fas fa-minus-circle"></i></button>
        `;
        return ruleElement;
    }

    function addRule() {
        const ruleElement = createRuleElement();
        rulesList.appendChild(ruleElement);
        updateTotalTokenCost();
    }

    function deleteRule(ruleElement) {
        ruleElement.remove();
        updateTotalTokenCost();
    }

    function updateTotalTokenCost() {
        const rules = document.querySelectorAll('.rule');
        totalTokenCost = rules.length * 10; // Example cost per rule
        totalTokenCostElement.textContent = totalTokenCost;
    }

    addRuleButton.addEventListener('click', addRule);

    rulesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-rule-button')) {
            const ruleElement = e.target.closest('.rule');
            deleteRule(ruleElement);
        }
    });

    // Add initial rule
    addRule();
}

export { setupRulesEngine };
