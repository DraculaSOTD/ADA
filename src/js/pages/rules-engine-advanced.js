import { fetchAuthenticatedData } from '../services/api.js';
import tokenService from '../services/token_service.js';

class AdvancedRulesEngine {
    constructor() {
        this.initialized = false;
        this.hasUnsavedChanges = false;
        this.ruleData = {
            name: '',
            description: '',
            triggers: {
                type: 'manual',
                config: {}
            },
            apiConfig: {
                inputs: {
                    webhook: {
                        enabled: false,
                        url: '',
                        token: '',
                        auth: { type: 'none', config: {} }
                    },
                    schema: [],
                    mapping: {}
                },
                outputs: []
            },
            conditions: {
                id: 'root',
                type: 'group',
                operator: 'AND',
                children: []
            },
            actions: [],
            settings: {
                executionMode: 'sequential',
                errorHandling: 'stop',
                maxRetries: 3
            }
        };
        this.availableModels = [];
        this.conditionIdCounter = 0;
        this.actionIdCounter = 0;
        this.schemaFieldIdCounter = 0;
        this.outputIdCounter = 0;
        this.defaultFields = [
            { value: 'input.field1', label: 'Input Field 1' },
            { value: 'model.output', label: 'Model Output' },
            { value: 'model.confidence', label: 'Model Confidence' },
            { value: 'context.user_id', label: 'User ID' },
            { value: 'context.timestamp', label: 'Timestamp' }
        ];
        this.availableFields = [...this.defaultFields];
    }

    saveState() {
        // Save the current state to sessionStorage
        const stateToSave = {
            ruleData: this.ruleData,
            conditionIdCounter: this.conditionIdCounter,
            actionIdCounter: this.actionIdCounter,
            schemaFieldIdCounter: this.schemaFieldIdCounter,
            outputIdCounter: this.outputIdCounter,
            ruleId: this.ruleId
        };
        sessionStorage.setItem('rulesEngineState', JSON.stringify(stateToSave));
        this.hasUnsavedChanges = true;
    }

    restoreState() {
        // Restore state from sessionStorage if it exists
        const savedState = sessionStorage.getItem('rulesEngineState');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                this.ruleData = parsed.ruleData || this.ruleData;
                this.conditionIdCounter = parsed.conditionIdCounter || 0;
                this.actionIdCounter = parsed.actionIdCounter || 0;
                this.schemaFieldIdCounter = parsed.schemaFieldIdCounter || 0;
                this.outputIdCounter = parsed.outputIdCounter || 0;
                this.ruleId = parsed.ruleId;
                console.log('✅ Restored previous rules engine state');
                return true;
            } catch (error) {
                console.error('Failed to restore state:', error);
                sessionStorage.removeItem('rulesEngineState');
            }
        }
        return false;
    }

    async init() {
        // Prevent multiple initializations
        if (this.initialized) {
            console.log('🔄 Rules engine already initialized, skipping...');
            return;
        }

        console.log('🚀 Initializing Advanced Rules Engine');
        console.log('📄 Document ready state:', document.readyState);
        console.log('🌐 DOM loaded:', document.body ? 'Yes' : 'No');
        
        // Debug: Check all required containers exist
        const containers = [
            'trigger-container',
            'api-inputs-container', 
            'api-outputs-container',
            'conditions-container',
            'actions-container'
        ];
        
        let missingContainers = [];
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`✅ Container found: ${id}`, element);
            } else {
                console.error(`❌ Container missing: ${id}`);
                missingContainers.push(id);
            }
        });
        
        if (missingContainers.length > 0) {
            console.error('❌ Critical: Missing containers will prevent rendering:', missingContainers);
            console.log('🔍 Available elements in document:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
            
            // Try to find container elements by partial match or create debug info
            console.log('🔍 Searching for container elements...');
            containers.forEach(id => {
                const elements = document.querySelectorAll(`[id*="${id}"]`);
                if (elements.length > 0) {
                    console.log(`🔍 Found similar elements for ${id}:`, Array.from(elements).map(el => el.id));
                }
            });
        }
        
        // Set up event listeners first
        this.setupEventListeners();
        
        // Try to restore saved state
        const hasRestoredState = this.restoreState();
        
        // CRITICAL FIX: Render UI immediately, regardless of API status
        console.log('🎨 Rendering UI immediately (before API calls)...');
        this.renderRule();
        
        // If we restored state, update the form fields
        if (hasRestoredState) {
            this.updateFormFields();
        }
        
        // Mark as initialized AFTER rendering to prevent race conditions
        this.initialized = true;
        
        // Load API data in background (won't affect UI rendering)
        console.log('🌐 Loading API data in background...');
        this.loadAvailableModelsAsync();
        
        // Check if we're in edit mode
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const editRuleId = urlParams.get('edit');
        
        if (editRuleId && !hasRestoredState) {
            this.loadRuleAsync(editRuleId);
        }
        
        console.log('✅ Rules engine initialization complete');
        
        // Add beforeunload warning for unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }

    // Async version that doesn't block initialization
    async loadAvailableModelsAsync() {
        try {
            console.log('📡 Fetching available models...');
            const models = await fetchAuthenticatedData('/api/models/me');
            this.availableModels = models || [];
            console.log('✅ Models loaded:', this.availableModels.length);
            
            // Re-render only the sections that need model data
            this.updateModelDependentSections();
        } catch (error) {
            console.error('⚠️ Failed to load models (UI still functional):', error);
            this.availableModels = [];
        }
    }

    // Async version that doesn't block initialization  
    async loadRuleAsync(ruleId) {
        try {
            await this.loadRule(ruleId);
            this.renderRule(); // Re-render with loaded rule data
        } catch (error) {
            console.error('⚠️ Failed to load rule (UI still functional):', error);
        }
    }

    // Update only sections that depend on model data
    updateModelDependentSections() {
        console.log('🔄 Updating model-dependent sections...');
        try {
            // Only re-render triggers and actions if they use model data
            this.renderTriggerConfig();
            
            // Update any action configs that reference models
            const actionItems = document.querySelectorAll('.action-item');
            actionItems.forEach(item => {
                const modelSelect = item.querySelector('.model-select');
                if (modelSelect) {
                    const actionId = item.dataset.id;
                    const action = this.ruleData.actions.find(a => a.id === actionId);
                    if (action) {
                        const config = item.querySelector('.action-config');
                        config.innerHTML = this.renderActionConfig(action);
                    }
                }
            });
            
            console.log('✅ Model-dependent sections updated');
        } catch (error) {
            console.error('⚠️ Error updating model-dependent sections:', error);
        }
    }

    async loadAvailableModels() {
        try {
            const models = await fetchAuthenticatedData('/api/models/me');
            this.availableModels = models || [];
        } catch (error) {
            console.error('Failed to load models:', error);
            this.availableModels = [];
        }
    }

    async loadRule(ruleId) {
        try {
            const rule = await fetchAuthenticatedData(`/api/rules/${ruleId}`);
            if (rule && !rule.error) {
                // Store the rule ID for updates
                this.ruleId = ruleId;
                
                // Populate rule data
                this.ruleData.name = rule.rule_name || '';
                this.ruleData.description = rule.description || '';
                
                // Load logic JSON if available
                if (rule.logic_json) {
                    this.ruleData.triggers = rule.logic_json.triggers || this.ruleData.triggers;
                    this.ruleData.apiConfig = rule.logic_json.apiConfig || this.ruleData.apiConfig;
                    this.ruleData.conditions = rule.logic_json.conditions || this.ruleData.conditions;
                    this.ruleData.actions = rule.logic_json.actions || [];
                    this.ruleData.settings = rule.logic_json.settings || this.ruleData.settings;
                }
                
                // Load trigger config
                if (rule.trigger_config) {
                    this.ruleData.triggers = rule.trigger_config;
                }
                
                // Load execution settings
                if (rule.execution_mode) {
                    this.ruleData.settings.executionMode = rule.execution_mode;
                }
                if (rule.error_handling) {
                    this.ruleData.settings.errorHandling = rule.error_handling.strategy || 'stop';
                    this.ruleData.settings.maxRetries = rule.error_handling.maxRetries || 3;
                }
                
                // Update form fields
                const ruleNameInput = document.getElementById('rule-name');
                if (ruleNameInput) ruleNameInput.value = this.ruleData.name;
                
                const ruleDescriptionInput = document.getElementById('rule-description');
                if (ruleDescriptionInput) ruleDescriptionInput.value = this.ruleData.description;
                
                const executionModeSelect = document.getElementById('execution-mode');
                if (executionModeSelect) executionModeSelect.value = this.ruleData.settings.executionMode;
                
                const errorHandlingSelect = document.getElementById('error-handling');
                if (errorHandlingSelect) errorHandlingSelect.value = this.ruleData.settings.errorHandling;
                
                const maxRetriesInput = document.getElementById('max-retries');
                if (maxRetriesInput) maxRetriesInput.value = this.ruleData.settings.maxRetries;
            }
        } catch (error) {
            console.error('Failed to load rule:', error);
            alert('Failed to load rule. Creating a new rule instead.');
        }
    }

    updateFormFields() {
        // Update form fields with current ruleData values
        const ruleNameInput = document.getElementById('rule-name');
        if (ruleNameInput) ruleNameInput.value = this.ruleData.name;
        
        const ruleDescriptionInput = document.getElementById('rule-description');
        if (ruleDescriptionInput) ruleDescriptionInput.value = this.ruleData.description;
        
        const executionModeSelect = document.getElementById('execution-mode');
        if (executionModeSelect) executionModeSelect.value = this.ruleData.settings.executionMode;
        
        const errorHandlingSelect = document.getElementById('error-handling');
        if (errorHandlingSelect) errorHandlingSelect.value = this.ruleData.settings.errorHandling;
        
        const maxRetriesInput = document.getElementById('max-retries');
        if (maxRetriesInput) maxRetriesInput.value = this.ruleData.settings.maxRetries;
        
        const triggerTypeSelect = document.getElementById('trigger-type');
        if (triggerTypeSelect) triggerTypeSelect.value = this.ruleData.triggers.type;
    }

    setupEventListeners() {
        // Rule name and description
        const ruleNameInput = document.getElementById('rule-name');
        const ruleDescriptionInput = document.getElementById('rule-description');
        
        if (ruleNameInput) {
            ruleNameInput.addEventListener('input', (e) => {
                this.ruleData.name = e.target.value;
                this.saveState();
            });
        }
        
        if (ruleDescriptionInput) {
            ruleDescriptionInput.addEventListener('input', (e) => {
                this.ruleData.description = e.target.value;
                this.saveState();
            });
        }

        // Add condition button
        const addConditionBtn = document.getElementById('add-condition-btn');
        if (addConditionBtn) {
            addConditionBtn.addEventListener('click', () => {
                this.addCondition(this.ruleData.conditions);
                this.renderConditions();
            });
        }

        // Add action button
        const addActionBtn = document.getElementById('add-action-btn');
        if (addActionBtn) {
            addActionBtn.addEventListener('click', () => {
                this.addAction();
                this.renderActions();
            });
        }

        // Save rule button
        const saveRuleBtn = document.getElementById('save-rule-btn');
        if (saveRuleBtn) {
            saveRuleBtn.addEventListener('click', () => this.saveRule());
        }

        // Test rule button
        const testRuleBtn = document.getElementById('test-rule-btn');
        if (testRuleBtn) {
            testRuleBtn.addEventListener('click', () => this.testRule());
        }

        // Trigger type selector
        const triggerTypeSelect = document.getElementById('trigger-type');
        if (triggerTypeSelect) {
            triggerTypeSelect.addEventListener('change', (e) => {
                this.ruleData.triggers.type = e.target.value;
                this.renderTriggerConfig();
            });
        }

        // Rule settings controls
        const executionModeSelect = document.getElementById('execution-mode');
        if (executionModeSelect) {
            executionModeSelect.addEventListener('change', (e) => {
                this.ruleData.settings.executionMode = e.target.value;
            });
        }

        const errorHandlingSelect = document.getElementById('error-handling');
        if (errorHandlingSelect) {
            errorHandlingSelect.addEventListener('change', (e) => {
                this.ruleData.settings.errorHandling = e.target.value;
            });
        }

        const maxRetriesInput = document.getElementById('max-retries');
        if (maxRetriesInput) {
            maxRetriesInput.addEventListener('input', (e) => {
                this.ruleData.settings.maxRetries = parseInt(e.target.value) || 3;
            });
        }
    }

    addCondition(parent, condition = null) {
        const newCondition = condition || {
            id: `condition_${this.conditionIdCounter++}`,
            type: 'condition',
            field: '',
            operator: 'equals',
            value: '',
            connector: parent.children && parent.children.length > 0 ? 'AND' : null
        };

        if (!parent.children) {
            parent.children = [];
        }
        parent.children.push(newCondition);
        this.saveState();
        return newCondition;
    }

    addConditionGroup(parent) {
        const newGroup = {
            id: `group_${this.conditionIdCounter++}`,
            type: 'group',
            operator: 'AND',
            children: [],
            connector: parent.children && parent.children.length > 0 ? 'AND' : null
        };

        if (!parent.children) {
            parent.children = [];
        }
        parent.children.push(newGroup);
        this.saveState();
        return newGroup;
    }

    removeCondition(parent, conditionId) {
        parent.children = parent.children.filter(child => child.id !== conditionId);
        this.saveState();
    }

    addAction() {
        const newAction = {
            id: `action_${this.actionIdCounter++}`,
            type: 'trigger_model',
            config: {}
        };
        // Initialize config based on action type
        this.initializeActionConfig(newAction);
        this.ruleData.actions.push(newAction);
        this.saveState();
        return newAction;
    }

    initializeActionConfig(action) {
        switch (action.type) {
            case 'trigger_model':
                action.config = {
                    modelId: '',
                    inputMapping: {},
                    outputVariable: ''
                };
                break;
            case 'send_notification':
                action.config = {
                    notificationType: 'email',
                    recipients: '',
                    messageTemplate: ''
                };
                break;
            case 'webhook':
                action.config = {
                    url: '',
                    method: 'POST',
                    payload: {}
                };
                break;
            case 'trigger_rule':
                action.config = {
                    ruleId: '',
                    passData: {}
                };
                break;
            case 'store_data':
                action.config = {
                    storageType: 'database',
                    key: '',
                    data: {}
                };
                break;
            case 'transform_data':
                action.config = {
                    transformType: 'jmespath',
                    expression: '',
                    outputVariable: ''
                };
                break;
            default:
                action.config = {};
        }
    }

    removeAction(actionId) {
        this.ruleData.actions = this.ruleData.actions.filter(action => action.id !== actionId);
        this.saveState();
    }

    renderRule() {
        console.log('🎯 Starting renderRule()');
        try {
            console.log('🔥 Rendering triggers...');
            this.renderTriggers();
            
            console.log('🌐 Rendering API config...');
            this.renderApiConfig();
            
            console.log('🎛️ Rendering conditions...');
            this.renderConditions();
            
            console.log('⚡ Rendering actions...');
            this.renderActions();
            
            console.log('💰 Updating token cost...');
            this.updateTokenCost();
            
            console.log('✅ Rules engine render complete');
        } catch (error) {
            console.error('❌ Error during renderRule:', error);
        }
    }

    renderTriggers() {
        console.log('🔥 renderTriggers() called');
        try {
            const triggerContainer = document.getElementById('trigger-container');
            if (!triggerContainer) {
                console.error('❌ Trigger container not found - DOM element missing');
                return;
            }
            console.log('✅ Trigger container found:', triggerContainer);

            const triggerTypes = {
                manual: 'Manual Trigger',
                schedule: 'Scheduled',
                event: 'Event-based',
                model_complete: 'Model Completion',
                webhook: 'Webhook'
            };

            console.log('🔧 Setting trigger container innerHTML...');
            console.log('📝 Previous trigger content length:', triggerContainer.innerHTML.length);
            triggerContainer.innerHTML = `
                <div class="trigger-section">
                    <h3>Trigger Configuration</h3>
                    <div class="form-group">
                        <label>Trigger Type</label>
                        <select id="trigger-type" class="form-control">
                            ${Object.entries(triggerTypes).map(([value, label]) => 
                                `<option value="${value}" ${this.ruleData.triggers.type === value ? 'selected' : ''}>${label}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div id="trigger-config"></div>
                </div>
            `;
            console.log('✅ Trigger innerHTML set successfully');

            this.renderTriggerConfig();
            this.attachTriggerTypeListener();
            console.log('✅ renderTriggers() completed successfully');
        } catch (error) {
            console.error('❌ Error in renderTriggers():', error);
        }
    }

    attachTriggerTypeListener() {
        const triggerTypeSelect = document.getElementById('trigger-type');
        if (triggerTypeSelect) {
            triggerTypeSelect.addEventListener('change', (e) => {
                this.ruleData.triggers.type = e.target.value;
                this.renderTriggerConfig();
            });
        }
    }

    renderTriggerConfig() {
        const configContainer = document.getElementById('trigger-config');
        if (!configContainer) return;

        let configHTML = '';
        
        switch (this.ruleData.triggers.type) {
            case 'schedule':
                configHTML = `
                    <div class="form-group">
                        <label>Cron Expression</label>
                        <input type="text" id="trigger-cron" class="form-control" placeholder="0 0 * * *" value="${this.ruleData.triggers.config.cron || ''}">
                        <small>Run daily at midnight: 0 0 * * *</small>
                    </div>
                `;
                break;
            case 'event':
                configHTML = `
                    <div class="form-group">
                        <label>Event Type</label>
                        <select id="trigger-event-type" class="form-control">
                            <option value="data_upload" ${this.ruleData.triggers.config.eventType === 'data_upload' ? 'selected' : ''}>Data Upload</option>
                            <option value="model_trained" ${this.ruleData.triggers.config.eventType === 'model_trained' ? 'selected' : ''}>Model Trained</option>
                            <option value="prediction_complete" ${this.ruleData.triggers.config.eventType === 'prediction_complete' ? 'selected' : ''}>Prediction Complete</option>
                        </select>
                    </div>
                `;
                break;
            case 'model_complete':
                configHTML = `
                    <div class="form-group">
                        <label>Model</label>
                        <select id="trigger-model" class="form-control">
                            <option value="">Select a model</option>
                            ${this.availableModels.map(model => 
                                `<option value="${model.id}" ${this.ruleData.triggers.config.modelId == model.id ? 'selected' : ''}>${model.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
                break;
            case 'webhook':
                const webhookUrl = this.generateWebhookUrl();
                configHTML = `
                    <div class="form-group">
                        <label>Webhook Endpoint</label>
                        <div class="webhook-url-display">
                            <input type="text" class="form-control" readonly value="${webhookUrl}">
                            <button class="copy-button" onclick="copyToClipboard('${webhookUrl}')">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        </div>
                        <small>POST data to this endpoint to trigger the rule</small>
                    </div>
                `;
                break;
        }

        configContainer.innerHTML = configHTML;
        this.attachTriggerEventListeners();
    }

    attachTriggerEventListeners() {
        switch (this.ruleData.triggers.type) {
            case 'schedule':
                const cronInput = document.getElementById('trigger-cron');
                if (cronInput) {
                    cronInput.addEventListener('input', (e) => {
                        this.ruleData.triggers.config.cron = e.target.value;
                    });
                }
                break;
            case 'event':
                const eventTypeSelect = document.getElementById('trigger-event-type');
                if (eventTypeSelect) {
                    eventTypeSelect.addEventListener('change', (e) => {
                        this.ruleData.triggers.config.eventType = e.target.value;
                    });
                }
                break;
            case 'model_complete':
                const modelSelect = document.getElementById('trigger-model');
                if (modelSelect) {
                    modelSelect.addEventListener('change', (e) => {
                        this.ruleData.triggers.config.modelId = e.target.value;
                    });
                }
                break;
        }
    }

    renderApiConfig() {
        console.log('🌐 renderApiConfig() called');
        try {
            const inputsContainer = document.getElementById('api-inputs-container');
            const outputsContainer = document.getElementById('api-outputs-container');
            
            if (!inputsContainer) {
                console.error('❌ API inputs container not found - DOM element missing');
            } else {
                console.log('✅ API inputs container found, rendering inputs...');
                try {
                    this.renderApiInputs(inputsContainer);
                    console.log('✅ API inputs rendered successfully');
                } catch (error) {
                    console.error('❌ Error rendering API inputs:', error);
                }
            }
            
            if (!outputsContainer) {
                console.error('❌ API outputs container not found - DOM element missing');
            } else {
                console.log('✅ API outputs container found, rendering outputs...');
                try {
                    this.renderApiOutputs(outputsContainer);
                    console.log('✅ API outputs rendered successfully');
                } catch (error) {
                    console.error('❌ Error rendering API outputs:', error);
                }
            }
            
            // Setup tab switching
            const tabButtons = document.querySelectorAll('.api-tabs .tab-button');
            console.log('🔗 Setting up API tab switching for', tabButtons.length, 'buttons');
            
            tabButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tab = e.target.dataset.tab;
                    console.log('🔄 API Tab clicked:', tab);
                    
                    // Update button states
                    document.querySelectorAll('.api-tabs .tab-button').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Update pane visibility
                    document.querySelectorAll('.api-config-section .tab-pane').forEach(pane => pane.classList.remove('active'));
                    const targetPane = document.getElementById(`api-${tab}-tab`);
                    if (targetPane) {
                        console.log('✅ Switching to API tab pane:', targetPane);
                        targetPane.classList.add('active');
                    } else {
                        console.error('❌ API Tab pane not found:', `api-${tab}-tab`);
                    }
                });
            });
            
            console.log('✅ renderApiConfig() completed successfully');
        } catch (error) {
            console.error('❌ Error in renderApiConfig():', error);
        }
    }

    renderApiInputs(container) {
        console.log('🌐 renderApiInputs() called with container:', container);
        console.log('📝 Previous API inputs content length:', container.innerHTML.length);
        const webhookUrl = this.generateWebhookUrl();
        container.innerHTML = `
            <div class="api-input-config">
                <div class="webhook-config">
                    <h4>Webhook Configuration</h4>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="webhook-enabled" ${this.ruleData.apiConfig.inputs.webhook.enabled ? 'checked' : ''}>
                            Enable Webhook Input
                        </label>
                    </div>
                    <div class="webhook-url-display">
                        <input type="text" class="webhook-url" value="${webhookUrl}" readonly>
                        <button class="copy-button" onclick="copyToClipboard('${webhookUrl}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                    <div class="form-group">
                        <label>Authentication Type</label>
                        <select id="webhook-auth-type" class="form-control">
                            <option value="none">None</option>
                            <option value="token">Bearer Token</option>
                            <option value="api_key">API Key</option>
                            <option value="basic">Basic Auth</option>
                        </select>
                    </div>
                </div>
                
                <div class="schema-builder">
                    <h4>Input Schema</h4>
                    <div id="input-schema-fields">
                        ${this.renderInputSchemaFields()}
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="window.rulesEngine.addSchemaField()">
                        <i class="fas fa-plus"></i> Add Field
                    </button>
                </div>
                
                <div class="form-group">
                    <label>Sample Input Payload</label>
                    <textarea class="form-control" id="sample-input" rows="5" readonly>${this.generateSamplePayload()}</textarea>
                </div>
            </div>
        `;
        
        this.attachApiInputEventListeners();
    }

    attachApiInputEventListeners() {
        // Webhook enabled checkbox
        const webhookEnabled = document.getElementById('webhook-enabled');
        if (webhookEnabled) {
            webhookEnabled.addEventListener('change', (e) => {
                this.ruleData.apiConfig.inputs.webhook.enabled = e.target.checked;
                this.updateTokenCost();
            });
        }

        // Webhook auth type
        const webhookAuthType = document.getElementById('webhook-auth-type');
        if (webhookAuthType) {
            webhookAuthType.addEventListener('change', (e) => {
                this.ruleData.apiConfig.inputs.webhook.auth.type = e.target.value;
            });
        }

        // Schema field inputs
        document.querySelectorAll('.schema-field').forEach(fieldDiv => {
            const fieldIndex = parseInt(fieldDiv.dataset.fieldIndex);
            const field = this.ruleData.apiConfig.inputs.schema[fieldIndex];
            if (!field) return;

            // Field name
            const nameInput = fieldDiv.querySelector('.field-name');
            if (nameInput) {
                nameInput.addEventListener('input', (e) => {
                    field.name = e.target.value;
                    this.updateFieldOptions();
                });
            }

            // Field type
            const typeSelect = fieldDiv.querySelector('.field-type');
            if (typeSelect) {
                typeSelect.addEventListener('change', (e) => {
                    field.type = e.target.value;
                });
            }

            // Field required
            const requiredCheckbox = fieldDiv.querySelector('.field-required');
            if (requiredCheckbox) {
                requiredCheckbox.addEventListener('change', (e) => {
                    field.required = e.target.checked;
                });
            }

            // Field default
            const defaultInput = fieldDiv.querySelector('.field-default');
            if (defaultInput) {
                defaultInput.addEventListener('input', (e) => {
                    field.default = e.target.value;
                });
            }
        });

        // Update sample payload when schema changes
        const sampleInput = document.getElementById('sample-input');
        if (sampleInput) {
            sampleInput.value = this.generateSamplePayload();
        }
    }

    renderInputSchemaFields() {
        if (this.ruleData.apiConfig.inputs.schema.length === 0) {
            return '<div class="empty-schema">No fields defined. Add fields to define your input structure.</div>';
        }
        
        return this.ruleData.apiConfig.inputs.schema.map((field, index) => `
            <div class="schema-field" data-field-id="${field.id}" data-field-index="${index}">
                <input type="text" class="field-name" placeholder="Field name" value="${field.name || ''}" data-field="name">
                <select class="field-type" data-field="type">
                    <option value="string" ${field.type === 'string' ? 'selected' : ''}>String</option>
                    <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
                    <option value="boolean" ${field.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                    <option value="array" ${field.type === 'array' ? 'selected' : ''}>Array</option>
                    <option value="object" ${field.type === 'object' ? 'selected' : ''}>Object</option>
                </select>
                <label>
                    <input type="checkbox" class="field-required" ${field.required ? 'checked' : ''} data-field="required">
                    Required
                </label>
                <input type="text" class="field-default" placeholder="Default value" value="${field.default || ''}" data-field="default">
                <button class="btn-remove" onclick="window.rulesEngine.removeSchemaField('${field.id}')">×</button>
            </div>
        `).join('');
    }

    renderApiOutputs(container) {
        console.log('🌐 renderApiOutputs() called with container:', container);
        console.log('📝 Previous API outputs content length:', container.innerHTML.length);
        container.innerHTML = `
            <div class="api-output-config">
                <div class="output-destinations">
                    ${this.renderOutputDestinations()}
                </div>
                <button class="btn btn-sm btn-primary" onclick="window.rulesEngine.addOutputDestination()">
                    <i class="fas fa-plus"></i> Add Output Destination
                </button>
            </div>
        `;
        
        this.attachApiOutputEventListeners();
    }

    attachApiOutputEventListeners() {
        // Output configurations
        document.querySelectorAll('.output-destination').forEach(outputDiv => {
            const outputIndex = parseInt(outputDiv.dataset.outputIndex);
            const output = this.ruleData.apiConfig.outputs[outputIndex];
            if (!output) return;

            // Output name
            const nameInput = outputDiv.querySelector('.output-name');
            if (nameInput) {
                nameInput.addEventListener('input', (e) => {
                    output.name = e.target.value;
                });
            }

            // Output type
            const typeSelect = outputDiv.querySelector('.output-type');
            if (typeSelect) {
                typeSelect.addEventListener('change', (e) => {
                    output.type = e.target.value;
                    this.renderApiOutputs(document.getElementById('api-outputs-container'));
                });
            }

            // Webhook-specific configs
            if (output.type === 'webhook') {
                const urlInput = outputDiv.querySelector('.output-url');
                if (urlInput) {
                    urlInput.addEventListener('input', (e) => {
                        output.config.url = e.target.value;
                    });
                }

                const methodSelect = outputDiv.querySelector('.output-method');
                if (methodSelect) {
                    methodSelect.addEventListener('change', (e) => {
                        output.config.method = e.target.value;
                    });
                }

                const timingSelect = outputDiv.querySelector('.output-timing');
                if (timingSelect) {
                    timingSelect.addEventListener('change', (e) => {
                        output.timing = e.target.value;
                        this.renderApiOutputs(document.getElementById('api-outputs-container'));
                    });
                }

                const scheduleInput = outputDiv.querySelector('.output-schedule');
                if (scheduleInput) {
                    scheduleInput.addEventListener('input', (e) => {
                        output.config.schedule = e.target.value;
                    });
                }
            }
        });
    }

    renderOutputDestinations() {
        if (this.ruleData.apiConfig.outputs.length === 0) {
            return '<div class="empty-outputs">No output destinations configured. Add destinations to send your rule results.</div>';
        }
        
        return this.ruleData.apiConfig.outputs.map((output, index) => `
            <div class="output-destination" data-output-id="${output.id}" data-output-index="${index}">
                <div class="destination-header">
                    <div class="destination-type">
                        <div class="destination-icon">
                            <i class="fas ${this.getOutputIcon(output.type)}"></i>
                        </div>
                        <div>
                            <input type="text" class="output-name form-control" placeholder="Output name" value="${output.name || ''}" data-output-id="${output.id}">
                            <select class="output-type form-control" data-output-id="${output.id}">
                                <option value="webhook" ${output.type === 'webhook' ? 'selected' : ''}>Webhook</option>
                                <option value="database" ${output.type === 'database' ? 'selected' : ''}>Database</option>
                                <option value="model" ${output.type === 'model' ? 'selected' : ''}>Model</option>
                                <option value="storage" ${output.type === 'storage' ? 'selected' : ''}>Cloud Storage</option>
                                <option value="email" ${output.type === 'email' ? 'selected' : ''}>Email</option>
                                <option value="queue" ${output.type === 'queue' ? 'selected' : ''}>Message Queue</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn-remove" onclick="window.rulesEngine.removeOutputDestination('${output.id}')">×</button>
                </div>
                <div class="destination-config">
                    ${this.renderOutputConfig(output)}
                </div>
            </div>
        `).join('');
    }

    renderOutputConfig(output) {
        switch (output.type) {
            case 'webhook':
                return `
                    <div class="form-group">
                        <label>Endpoint URL</label>
                        <input type="text" class="form-control output-url" data-output-id="${output.id}" 
                            placeholder="https://api.example.com/webhook" value="${output.config.url || ''}">
                    </div>
                    <div class="form-group">
                        <label>Method</label>
                        <select class="form-control output-method" data-output-id="${output.id}">
                            <option value="POST" ${output.config.method === 'POST' ? 'selected' : ''}>POST</option>
                            <option value="PUT" ${output.config.method === 'PUT' ? 'selected' : ''}>PUT</option>
                            <option value="PATCH" ${output.config.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Timing</label>
                        <select class="form-control output-timing" data-output-id="${output.id}">
                            <option value="immediate" ${output.timing === 'immediate' ? 'selected' : ''}>Immediate</option>
                            <option value="scheduled" ${output.timing === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                            <option value="batched" ${output.timing === 'batched' ? 'selected' : ''}>Batched</option>
                        </select>
                    </div>
                    ${output.timing === 'scheduled' ? `
                        <div class="form-group">
                            <label>Schedule (Cron Expression)</label>
                            <input type="text" class="form-control output-schedule" data-output-id="${output.id}" 
                                placeholder="0 */6 * * *" value="${output.config.schedule || ''}">
                        </div>
                    ` : ''}
                `;
            default:
                return '<div class="config-placeholder">Configuration for this output type coming soon</div>';
        }
    }

    renderConditions() {
        console.log('🎛️ renderConditions() called');
        try {
            const conditionsContainer = document.getElementById('conditions-container');
            if (!conditionsContainer) {
                console.error('❌ Conditions container not found - DOM element missing');
                return;
            }
            console.log('✅ Conditions container found:', conditionsContainer);

            console.log('🔧 Setting conditions container innerHTML...');
            console.log('📝 Previous conditions content length:', conditionsContainer.innerHTML.length);
            conditionsContainer.innerHTML = `
                <div class="conditions-section">
                    <div class="section-header">
                        <h3>Conditions</h3>
                        <div class="button-group">
                            <button id="add-condition-btn" class="btn btn-sm btn-primary">+ Add Condition</button>
                            <button id="add-group-btn" class="btn btn-sm btn-secondary">+ Add Group</button>
                        </div>
                    </div>
                    <div class="conditions-tree">
                        ${this.renderConditionGroup(this.ruleData.conditions)}
                    </div>
                </div>
            `;
            console.log('✅ Conditions innerHTML set successfully');

            // Re-attach event listeners for the new elements
            this.attachConditionEventListeners();
            console.log('✅ renderConditions() completed successfully');
        } catch (error) {
            console.error('❌ Error in renderConditions():', error);
        }
    }

    renderConditionGroup(group, level = 0) {
        if (group.type !== 'group') return '';

        const indent = level * 20;
        const hasChildren = group.children && group.children.length > 0;

        return `
            <div class="condition-group" data-id="${group.id}" style="margin-left: ${indent}px">
                ${level > 0 ? `
                    <div class="group-header">
                        <span class="group-label">Group (${group.operator})</span>
                        <button class="btn-remove" data-id="${group.id}">×</button>
                    </div>
                ` : ''}
                <div class="group-children">
                    ${hasChildren ? group.children.map((child, index) => {
                        let html = '';
                        
                        // Add connector before this child if it's not the first
                        if (index > 0 && child.connector) {
                            html += `
                                <div class="condition-connector" style="margin-left: ${(level + 1) * 20}px">
                                    <select class="connector-operator" data-id="${child.id}">
                                        <option value="AND" ${child.connector === 'AND' ? 'selected' : ''}>AND</option>
                                        <option value="OR" ${child.connector === 'OR' ? 'selected' : ''}>OR</option>
                                    </select>
                                </div>
                            `;
                        }
                        
                        if (child.type === 'group') {
                            html += this.renderConditionGroup(child, level + 1);
                        } else {
                            html += this.renderConditionItem(child, index, level + 1);
                        }
                        
                        return html;
                    }).join('') : '<div class="empty-group">No conditions. Add a condition or group.</div>'}
                </div>
                <div class="group-actions" style="margin-left: ${(level + 1) * 20}px; margin-top: 10px;">
                    <button class="btn btn-sm btn-secondary add-condition-to-group" data-group-id="${group.id}">+ Add Condition</button>
                    <button class="btn btn-sm btn-secondary add-group-to-group" data-group-id="${group.id}">+ Add Group</button>
                </div>
            </div>
        `;
    }

    renderConditionItem(condition, index, level = 0) {
        const indent = level * 20;
        const operators = {
            'equals': 'Equals',
            'not_equals': 'Not Equals',
            'greater_than': 'Greater Than',
            'less_than': 'Less Than',
            'greater_equal': 'Greater or Equal',
            'less_equal': 'Less or Equal',
            'contains': 'Contains',
            'starts_with': 'Starts With',
            'ends_with': 'Ends With',
            'in_list': 'In List',
            'not_in_list': 'Not In List',
            'is_empty': 'Is Empty',
            'is_not_empty': 'Is Not Empty'
        };

        const fieldOptions = [...this.availableFields];

        return `
            <div class="condition-item" data-id="${condition.id}" style="margin-left: ${indent}px">
                <select class="condition-field" data-id="${condition.id}">
                    <option value="">Select field</option>
                    ${fieldOptions.map(opt => 
                        `<option value="${opt.value}" ${condition.field === opt.value ? 'selected' : ''}>${opt.label}</option>`
                    ).join('')}
                </select>
                <select class="condition-operator" data-id="${condition.id}">
                    ${Object.entries(operators).map(([value, label]) => 
                        `<option value="${value}" ${condition.operator === value ? 'selected' : ''}>${label}</option>`
                    ).join('')}
                </select>
                <input type="text" class="condition-value" data-id="${condition.id}" 
                    placeholder="Value" value="${condition.value || ''}">
                <button class="btn-remove" data-id="${condition.id}">×</button>
            </div>
        `;
    }

    renderActions() {
        console.log('⚡ renderActions() called');
        try {
            const actionsContainer = document.getElementById('actions-container');
            if (!actionsContainer) {
                console.error('❌ Actions container not found - DOM element missing');
                return;
            }
            console.log('✅ Actions container found:', actionsContainer);

            const actionTypes = {
                'trigger_model': 'Trigger Model',
                'send_notification': 'Send Notification',
                'webhook': 'Call Webhook',
                'store_data': 'Store Data',
                'transform_data': 'Transform Data',
                'conditional_action': 'Conditional Action',
                'loop': 'Loop Over Data',
                'trigger_rule': 'Trigger Another Rule'
            };

            console.log('🔧 Setting actions container innerHTML...');
            console.log('📝 Previous actions content length:', actionsContainer.innerHTML.length);
            actionsContainer.innerHTML = `
                <div class="actions-section">
                    <div class="section-header">
                        <h3>Actions</h3>
                        <button id="add-action-btn" class="btn btn-sm btn-primary">+ Add Action</button>
                    </div>
                    <div class="actions-pipeline">
                        ${this.ruleData.actions.length > 0 ? 
                            this.ruleData.actions.map((action, index) => `
                                <div class="action-item" data-id="${action.id}">
                                    <div class="action-header">
                                        <span class="action-number">${index + 1}</span>
                                        <select class="action-type" data-id="${action.id}">
                                            ${Object.entries(actionTypes).map(([value, label]) => 
                                                `<option value="${value}" ${action.type === value ? 'selected' : ''}>${label}</option>`
                                            ).join('')}
                                        </select>
                                        <button class="btn-remove" data-action-id="${action.id}">×</button>
                                    </div>
                                    <div class="action-config">
                                        ${this.renderActionConfig(action)}
                                    </div>
                                    ${index < this.ruleData.actions.length - 1 ? '<div class="action-arrow">↓</div>' : ''}
                                </div>
                            `).join('') : 
                            '<div class="empty-actions">No actions defined. Add an action to get started.</div>'
                        }
                    </div>
                </div>
            `;
            console.log('✅ Actions innerHTML set successfully');

            this.attachActionEventListeners();
            console.log('✅ renderActions() completed successfully');
        } catch (error) {
            console.error('❌ Error in renderActions():', error);
        }
    }

    renderActionConfig(action) {
        switch (action.type) {
            case 'trigger_model':
                return `
                    <div class="form-group">
                        <label>Select Model</label>
                        <select class="form-control model-select" data-action-id="${action.id}">
                            <option value="">Choose a model</option>
                            ${this.availableModels.map(model => 
                                `<option value="${model.id}" ${action.config.modelId === model.id ? 'selected' : ''}>${model.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Input Mapping</label>
                        <textarea class="form-control input-mapping" data-action-id="${action.id}" 
                            placeholder='{"field1": "{{input.data}}", "field2": "{{context.user_id}}"}'>${JSON.stringify(action.config.inputMapping || {}, null, 2)}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Output Variable Name</label>
                        <input type="text" class="form-control output-variable" data-action-id="${action.id}" 
                            placeholder="model_result" value="${action.config.outputVariable || ''}">
                    </div>
                `;
            case 'send_notification':
                return `
                    <div class="form-group">
                        <label>Notification Type</label>
                        <select class="form-control notification-type" data-action-id="${action.id}">
                            <option value="email" ${action.config.notificationType === 'email' ? 'selected' : ''}>Email</option>
                            <option value="sms" ${action.config.notificationType === 'sms' ? 'selected' : ''}>SMS</option>
                            <option value="in_app" ${action.config.notificationType === 'in_app' ? 'selected' : ''}>In-App</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Recipients</label>
                        <input type="text" class="form-control notification-recipients" data-action-id="${action.id}" 
                            placeholder="user@example.com" value="${action.config.recipients || ''}">
                    </div>
                    <div class="form-group">
                        <label>Message Template</label>
                        <textarea class="form-control notification-message" data-action-id="${action.id}" 
                            placeholder="Rule {{rule.name}} triggered with result: {{model_result}}">${action.config.messageTemplate || ''}</textarea>
                    </div>
                `;
            case 'webhook':
                return `
                    <div class="form-group">
                        <label>Webhook URL</label>
                        <input type="text" class="form-control webhook-url" data-action-id="${action.id}" 
                            placeholder="https://api.example.com/webhook" value="${action.config.url || ''}">
                    </div>
                    <div class="form-group">
                        <label>Method</label>
                        <select class="form-control webhook-method" data-action-id="${action.id}">
                            <option value="POST" ${action.config.method === 'POST' ? 'selected' : ''}>POST</option>
                            <option value="GET" ${action.config.method === 'GET' ? 'selected' : ''}>GET</option>
                            <option value="PUT" ${action.config.method === 'PUT' ? 'selected' : ''}>PUT</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Payload</label>
                        <textarea class="form-control webhook-payload" data-action-id="${action.id}" 
                            placeholder='{"data": "{{model_result}}"}'>${action.config.payload ? JSON.stringify(action.config.payload, null, 2) : ''}</textarea>
                    </div>
                `;
            case 'trigger_rule':
                return `
                    <div class="form-group">
                        <label>Select Rule Engine</label>
                        <select class="form-control trigger-rule-select" data-action-id="${action.id}">
                            <option value="">Choose a rule engine</option>
                            ${this.availableModels.filter(m => m.type === 'rules_engine').map(rule => 
                                `<option value="${rule.id}" ${action.config.ruleId == rule.id ? 'selected' : ''}>${rule.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Pass Data</label>
                        <textarea class="form-control trigger-rule-data" data-action-id="${action.id}" 
                            placeholder='{"input": "{{model_result}}"}'>${action.config.passData ? JSON.stringify(action.config.passData, null, 2) : ''}</textarea>
                    </div>
                `;
            case 'store_data':
                return `
                    <div class="form-group">
                        <label>Storage Type</label>
                        <select class="form-control store-type" data-action-id="${action.id}">
                            <option value="database" ${action.config.storageType === 'database' ? 'selected' : ''}>Database</option>
                            <option value="file" ${action.config.storageType === 'file' ? 'selected' : ''}>File</option>
                            <option value="cache" ${action.config.storageType === 'cache' ? 'selected' : ''}>Cache</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Storage Key/Path</label>
                        <input type="text" class="form-control store-key" data-action-id="${action.id}" 
                            placeholder="results/{{rule.name}}/{{timestamp}}" value="${action.config.key || ''}">
                    </div>
                    <div class="form-group">
                        <label>Data to Store</label>
                        <textarea class="form-control store-data" data-action-id="${action.id}" 
                            placeholder='{"result": "{{model_result}}", "metadata": "{{context}}"}'>${action.config.data ? JSON.stringify(action.config.data, null, 2) : ''}</textarea>
                    </div>
                `;
            case 'transform_data':
                return `
                    <div class="form-group">
                        <label>Transformation Type</label>
                        <select class="form-control transform-type" data-action-id="${action.id}">
                            <option value="jmespath" ${action.config.transformType === 'jmespath' ? 'selected' : ''}>JMESPath</option>
                            <option value="javascript" ${action.config.transformType === 'javascript' ? 'selected' : ''}>JavaScript</option>
                            <option value="template" ${action.config.transformType === 'template' ? 'selected' : ''}>Template</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Transformation Expression</label>
                        <textarea class="form-control transform-expression" data-action-id="${action.id}" 
                            placeholder="data.results[?score > 0.5] or return data.map(d => d.value * 2)">${action.config.expression || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Output Variable</label>
                        <input type="text" class="form-control transform-output" data-action-id="${action.id}" 
                            placeholder="transformed_data" value="${action.config.outputVariable || ''}">
                    </div>
                `;
            default:
                return '<div class="config-placeholder">Configuration for this action type coming soon</div>';
        }
    }

    attachConditionEventListeners() {
        // Add condition button (root level)
        const addConditionBtn = document.getElementById('add-condition-btn');
        if (addConditionBtn) {
            addConditionBtn.addEventListener('click', () => {
                this.addCondition(this.ruleData.conditions);
                this.renderConditions();
            });
        }

        // Add group button (root level)
        const addGroupBtn = document.getElementById('add-group-btn');
        if (addGroupBtn) {
            addGroupBtn.addEventListener('click', () => {
                this.addConditionGroup(this.ruleData.conditions);
                this.renderConditions();
            });
        }

        // Add condition to specific group buttons
        document.querySelectorAll('.add-condition-to-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupId = e.target.dataset.groupId;
                const group = this.findConditionById(this.ruleData.conditions, groupId);
                if (group && group.type === 'group') {
                    this.addCondition(group);
                    this.renderConditions();
                }
            });
        });

        // Add group to specific group buttons
        document.querySelectorAll('.add-group-to-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupId = e.target.dataset.groupId;
                const group = this.findConditionById(this.ruleData.conditions, groupId);
                if (group && group.type === 'group') {
                    this.addConditionGroup(group);
                    this.renderConditions();
                }
            });
        })

        // Connector operator changes (AND/OR between conditions)
        document.querySelectorAll('.connector-operator').forEach(select => {
            select.addEventListener('change', (e) => {
                const conditionId = e.target.dataset.id;
                const condition = this.findConditionById(this.ruleData.conditions, conditionId);
                if (condition) {
                    condition.connector = e.target.value;
                    this.saveState();
                }
            });
        });

        // Condition field changes
        document.querySelectorAll('.condition-field').forEach(select => {
            select.addEventListener('change', (e) => {
                const conditionId = e.target.dataset.id;
                const condition = this.findConditionById(this.ruleData.conditions, conditionId);
                if (condition) {
                    condition.field = e.target.value;
                    this.saveState();
                }
            });
        });

        // Condition operator changes
        document.querySelectorAll('.condition-operator').forEach(select => {
            select.addEventListener('change', (e) => {
                const conditionId = e.target.dataset.id;
                const condition = this.findConditionById(this.ruleData.conditions, conditionId);
                if (condition) {
                    condition.operator = e.target.value;
                    this.saveState();
                }
            });
        });

        // Condition value changes
        document.querySelectorAll('.condition-value').forEach(input => {
            input.addEventListener('input', (e) => {
                const conditionId = e.target.dataset.id;
                const condition = this.findConditionById(this.ruleData.conditions, conditionId);
                if (condition) {
                    condition.value = e.target.value;
                    this.saveState();
                }
            });
        });

        // Remove buttons
        document.querySelectorAll('.conditions-tree .btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.removeConditionById(this.ruleData.conditions, id);
                this.renderConditions();
            });
        });
    }

    attachActionEventListeners() {
        // Add action button
        const addActionBtn = document.getElementById('add-action-btn');
        if (addActionBtn) {
            addActionBtn.addEventListener('click', () => {
                this.addAction();
                this.renderActions();
            });
        }

        // Action type changes
        document.querySelectorAll('.action-type').forEach(select => {
            select.addEventListener('change', (e) => {
                const actionId = e.target.dataset.id;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.type = e.target.value;
                    this.initializeActionConfig(action);
                    this.renderActions();
                }
            });
        });

        // Model selection
        document.querySelectorAll('.model-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.modelId = e.target.value;
                }
            });
        });

        // Input mapping
        document.querySelectorAll('.input-mapping').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    try {
                        action.config.inputMapping = JSON.parse(e.target.value);
                    } catch (err) {
                        // Invalid JSON, keep as string for now
                    }
                }
            });
        });

        // Output variable
        document.querySelectorAll('.output-variable').forEach(input => {
            input.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.outputVariable = e.target.value;
                }
            });
        });

        // Remove action buttons
        document.querySelectorAll('.actions-pipeline .btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionId = e.target.dataset.actionId;
                this.removeAction(actionId);
                this.renderActions();
            });
        });

        // Notification action handlers
        document.querySelectorAll('.notification-type').forEach(select => {
            select.addEventListener('change', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.notificationType = e.target.value;
                }
            });
        });

        document.querySelectorAll('.notification-recipients').forEach(input => {
            input.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.recipients = e.target.value;
                }
            });
        });

        document.querySelectorAll('.notification-message').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.messageTemplate = e.target.value;
                }
            });
        });

        // Webhook action handlers
        document.querySelectorAll('.webhook-url').forEach(input => {
            input.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.url = e.target.value;
                }
            });
        });

        document.querySelectorAll('.webhook-method').forEach(select => {
            select.addEventListener('change', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.method = e.target.value;
                }
            });
        });

        document.querySelectorAll('.webhook-payload').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    try {
                        action.config.payload = JSON.parse(e.target.value);
                    } catch (err) {
                        // Invalid JSON, keep as string for now
                    }
                }
            });
        });

        // Trigger rule action handlers
        document.querySelectorAll('.trigger-rule-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.ruleId = e.target.value;
                }
            });
        });

        document.querySelectorAll('.trigger-rule-data').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    try {
                        action.config.passData = JSON.parse(e.target.value);
                    } catch (err) {
                        // Invalid JSON, keep as string for now
                    }
                }
            });
        });

        // Store data action handlers
        document.querySelectorAll('.store-type').forEach(select => {
            select.addEventListener('change', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.storageType = e.target.value;
                }
            });
        });

        document.querySelectorAll('.store-key').forEach(input => {
            input.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.key = e.target.value;
                }
            });
        });

        document.querySelectorAll('.store-data').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    try {
                        action.config.data = JSON.parse(e.target.value);
                    } catch (err) {
                        // Invalid JSON, keep as string for now
                    }
                }
            });
        });

        // Transform data action handlers
        document.querySelectorAll('.transform-type').forEach(select => {
            select.addEventListener('change', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.transformType = e.target.value;
                }
            });
        });

        document.querySelectorAll('.transform-expression').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.expression = e.target.value;
                }
            });
        });

        document.querySelectorAll('.transform-output').forEach(input => {
            input.addEventListener('input', (e) => {
                const actionId = e.target.dataset.actionId;
                const action = this.ruleData.actions.find(a => a.id === actionId);
                if (action) {
                    action.config.outputVariable = e.target.value;
                }
            });
        });
    }

    findConditionById(node, id) {
        if (node.id === id) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = this.findConditionById(child, id);
                if (found) return found;
            }
        }
        return null;
    }

    removeConditionById(node, id) {
        if (node.children) {
            node.children = node.children.filter(child => child.id !== id);
            node.children.forEach(child => this.removeConditionById(child, id));
        }
    }

    updateTokenCost() {
        // Calculate estimated token cost using tokenService
        const conditionCount = this.countConditions(this.ruleData.conditions);
        const actionCount = this.ruleData.actions.length;
        
        // Get the complexity of the rule based on actions
        let complexity = 'basic';
        const hasModelTrigger = this.ruleData.actions.some(a => a.type === 'trigger_model');
        const hasMultipleActions = actionCount > 3;
        const hasComplexConditions = conditionCount > 5;
        const hasApiWebhook = this.ruleData.apiConfig?.inputs?.webhook?.enabled;
        const hasMultipleOutputs = (this.ruleData.apiConfig?.outputs?.length || 0) > 2;
        
        if (hasModelTrigger || hasMultipleActions || hasComplexConditions || hasApiWebhook || hasMultipleOutputs) {
            complexity = 'advanced';
        }
        
        if (hasModelTrigger && (hasMultipleActions || hasComplexConditions) && (hasApiWebhook || hasMultipleOutputs)) {
            complexity = 'complex';
        }
        
        // Use tokenService to calculate cost
        const totalTokens = tokenService.calculateRulesCost(conditionCount, actionCount, complexity);

        const tokenCostElement = document.getElementById('total-token-cost');
        if (tokenCostElement) {
            tokenCostElement.textContent = totalTokens.toLocaleString();
            
            // Update cost breakdown if available
            const breakdownElement = document.querySelector('.cost-breakdown');
            if (breakdownElement) {
                breakdownElement.innerHTML = `
                    <div class="cost-item">
                        <span>Base Rule Cost:</span>
                        <span>${tokenService.costs.rules.baseCost.toLocaleString()} tokens</span>
                    </div>
                    <div class="cost-item">
                        <span>Conditions (${conditionCount}):</span>
                        <span>${(conditionCount * tokenService.costs.rules.perCondition).toLocaleString()} tokens</span>
                    </div>
                    <div class="cost-item">
                        <span>Actions (${actionCount}):</span>
                        <span>${(actionCount * tokenService.costs.rules.perAction).toLocaleString()} tokens</span>
                    </div>
                    ${hasApiWebhook ? `
                        <div class="cost-item">
                            <span>API Webhook:</span>
                            <span>${tokenService.costs.rules.webhookCost.toLocaleString()} tokens</span>
                        </div>
                    ` : ''}
                    ${complexity !== 'basic' ? `
                        <div class="cost-item">
                            <span>Complexity Multiplier (${complexity}):</span>
                            <span>×${tokenService.costs.rules.complexityMultiplier[complexity]}</span>
                        </div>
                    ` : ''}
                    <div class="cost-item total">
                        <span>Total Cost:</span>
                        <span>${totalTokens.toLocaleString()} tokens</span>
                    </div>
                `;
            }
        }
    }

    // API Configuration Helper Methods
    generateWebhookUrl() {
        const ruleId = this.ruleId || 'new';
        const token = this.generateSecureToken();
        const baseUrl = window.location.origin;
        this.ruleData.apiConfig.inputs.webhook.url = `${baseUrl}/api/rules/webhook/${ruleId}`;
        this.ruleData.apiConfig.inputs.webhook.token = token;
        return `${baseUrl}/api/rules/webhook/${ruleId}/${token}`;
    }

    generateSecureToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    generateSamplePayload() {
        const schema = this.ruleData.apiConfig.inputs.schema;
        const payload = {};
        
        schema.forEach(field => {
            if (!field.name) return;
            
            switch (field.type) {
                case 'string':
                    payload[field.name] = field.default || 'sample string';
                    break;
                case 'number':
                    payload[field.name] = field.default !== '' ? parseFloat(field.default) : 123;
                    break;
                case 'boolean':
                    payload[field.name] = field.default === 'true' || field.default === true;
                    break;
                case 'array':
                    try {
                        payload[field.name] = field.default ? JSON.parse(field.default) : [];
                    } catch {
                        payload[field.name] = [];
                    }
                    break;
                case 'object':
                    try {
                        payload[field.name] = field.default ? JSON.parse(field.default) : {};
                    } catch {
                        payload[field.name] = {};
                    }
                    break;
                default:
                    payload[field.name] = field.default || null;
            }
        });
        
        return JSON.stringify(payload, null, 2);
    }

    getOutputIcon(type) {
        const icons = {
            webhook: 'fa-globe',
            database: 'fa-database',
            model: 'fa-brain',
            storage: 'fa-cloud-upload-alt',
            email: 'fa-envelope',
            queue: 'fa-stream'
        };
        return icons[type] || 'fa-plug';
    }

    getOutputTypeLabel(type) {
        const labels = {
            webhook: 'Webhook',
            database: 'Database',
            model: 'Model',
            storage: 'Cloud Storage',
            email: 'Email',
            queue: 'Message Queue'
        };
        return labels[type] || type;
    }

    getApiInputFields() {
        return this.ruleData.apiConfig.inputs.schema
            .filter(field => field.name)
            .map(field => ({
                value: `api.input.${field.name}`,
                label: `API Input: ${field.name}`
            }));
    }

    addSchemaField() {
        const newField = {
            id: `schema_field_${this.schemaFieldIdCounter++}`,
            name: '',
            type: 'string',
            required: false,
            default: ''
        };
        this.ruleData.apiConfig.inputs.schema.push(newField);
        this.renderApiInputs(document.getElementById('api-inputs-container'));
        this.updateTokenCost();
    }

    removeSchemaField(fieldId) {
        this.ruleData.apiConfig.inputs.schema = this.ruleData.apiConfig.inputs.schema.filter(f => f.id !== fieldId);
        this.renderApiInputs(document.getElementById('api-inputs-container'));
        this.updateTokenCost();
    }

    addOutputDestination() {
        const newOutput = {
            id: `output_${this.outputIdCounter++}`,
            type: 'webhook',
            name: '',
            config: {
                url: '',
                method: 'POST',
                headers: {},
                auth: { type: 'none' }
            },
            timing: 'immediate',
            mapping: {}
        };
        this.ruleData.apiConfig.outputs.push(newOutput);
        this.renderApiOutputs(document.getElementById('api-outputs-container'));
        this.updateTokenCost();
    }

    removeOutputDestination(outputId) {
        this.ruleData.apiConfig.outputs = this.ruleData.apiConfig.outputs.filter(o => o.id !== outputId);
        this.renderApiOutputs(document.getElementById('api-outputs-container'));
        this.updateTokenCost();
    }

    updateFieldOptions() {
        // Update available fields by combining default fields with API input fields
        const apiFields = this.getApiInputFields();
        this.availableFields = [...this.defaultFields, ...apiFields];
        
        // Re-render conditions if they exist to update field dropdowns
        if (this.ruleData.conditions.children && this.ruleData.conditions.children.length > 0) {
            this.renderConditions();
        }
    }

    countConditions(node) {
        let count = 0;
        if (node.type === 'condition') count = 1;
        if (node.children) {
            node.children.forEach(child => {
                count += this.countConditions(child);
            });
        }
        return count;
    }

    findInvalidConditions(node, invalid = []) {
        if (node.type === 'condition') {
            if (!node.field || !node.value) {
                invalid.push(node);
            }
        }
        if (node.children) {
            node.children.forEach(child => {
                this.findInvalidConditions(child, invalid);
            });
        }
        return invalid;
    }

    findInvalidActions() {
        const invalid = [];
        this.ruleData.actions.forEach((action, index) => {
            const actionNumber = index + 1;
            switch (action.type) {
                case 'trigger_model':
                    if (!action.config.modelId) {
                        invalid.push(`Action ${actionNumber} (Trigger Model)`);
                    }
                    break;
                case 'send_notification':
                    if (!action.config.recipients || !action.config.messageTemplate) {
                        invalid.push(`Action ${actionNumber} (Send Notification)`);
                    }
                    break;
                case 'webhook':
                    if (!action.config.url) {
                        invalid.push(`Action ${actionNumber} (Webhook)`);
                    }
                    break;
                case 'trigger_rule':
                    if (!action.config.ruleId) {
                        invalid.push(`Action ${actionNumber} (Trigger Rule)`);
                    }
                    break;
                case 'store_data':
                    if (!action.config.key || !action.config.data) {
                        invalid.push(`Action ${actionNumber} (Store Data)`);
                    }
                    break;
                case 'transform_data':
                    if (!action.config.expression || !action.config.outputVariable) {
                        invalid.push(`Action ${actionNumber} (Transform Data)`);
                    }
                    break;
            }
        });
        return invalid;
    }

    async saveRule() {
        // Validation
        if (!this.ruleData.name) {
            alert('Please enter a rule name');
            return;
        }

        if (!this.ruleData.description) {
            alert('Please enter a rule description');
            return;
        }

        // Validate conditions
        if (!this.ruleData.conditions.children || this.ruleData.conditions.children.length === 0) {
            alert('Please add at least one condition to your rule');
            return;
        }

        // Validate that all conditions have required fields
        const invalidConditions = this.findInvalidConditions(this.ruleData.conditions);
        if (invalidConditions.length > 0) {
            alert('Please complete all condition fields. Some conditions are missing field or value information.');
            return;
        }

        // Validate actions
        if (!this.ruleData.actions || this.ruleData.actions.length === 0) {
            alert('Please add at least one action to your rule');
            return;
        }

        // Validate action configurations
        const invalidActions = this.findInvalidActions();
        if (invalidActions.length > 0) {
            alert(`Please complete configuration for the following actions: ${invalidActions.join(', ')}`);
            return;
        }

        const saveButton = document.getElementById('save-rule-btn');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
        }

        try {
            const rulePayload = {
                rule_name: this.ruleData.name,
                description: this.ruleData.description,
                logic_json: {
                    triggers: this.ruleData.triggers,
                    apiConfig: this.ruleData.apiConfig,
                    conditions: this.ruleData.conditions,
                    actions: this.ruleData.actions,
                    settings: this.ruleData.settings
                },
                trigger_config: this.ruleData.triggers,
                input_schema: {},
                output_schema: {},
                execution_mode: this.ruleData.settings.executionMode,
                error_handling: {
                    strategy: this.ruleData.settings.errorHandling,
                    maxRetries: this.ruleData.settings.maxRetries
                },
                create_as_model: true,  // Create as a model so it appears in model lists
                type: 'rules_engine',
                visibility: 'private',
                token_cost: parseInt(document.getElementById('total-token-cost').textContent || '0')
            };

            const url = this.ruleId ? `/api/rules/${this.ruleId}` : '/api/rules/';
            const method = this.ruleId ? 'PUT' : 'POST';

            const response = await fetchAuthenticatedData(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(rulePayload)
            });

            if (response && (response.id || this.ruleId)) {
                const message = this.ruleId ? 'Rule Engine updated successfully!' : 'Rule Engine saved successfully! It will now appear in your models list.';
                alert(message);
                
                // Update token balance after rule creation/update
                if (window.tokenSyncService) {
                    await window.tokenSyncService.forceUpdate();
                    // Track usage
                    const tokensUsed = response.tokens_used || rulePayload.token_cost || 0;
                    if (tokensUsed > 0) {
                        window.tokenSyncService.trackUsage('rule_creation', tokensUsed, {
                            ruleName: this.ruleData.name,
                            conditions: this.ruleData.conditions.children?.length || 0,
                            actions: this.ruleData.actions?.length || 0
                        });
                    }
                }
                
                // Clear saved state and reset unsaved changes flag
                sessionStorage.removeItem('rulesEngineState');
                this.hasUnsavedChanges = false;
                // Redirect to models page
                window.location.hash = '#models';
            }
        } catch (error) {
            console.error('Error saving rule:', error);
            alert('Failed to save rule. Please try again.');
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Save Rule Engine';
            }
        }
    }

    async testRule() {
        const testPanel = document.getElementById('test-panel');
        if (!testPanel) return;

        testPanel.innerHTML = `
            <div class="test-panel-content">
                <h4>Test Rule Execution</h4>
                <div class="form-group">
                    <label>Test Input Data</label>
                    <textarea class="form-control" id="test-input" rows="5" placeholder='{"field1": "value1", "field2": 123}'></textarea>
                </div>
                <button class="btn btn-primary" id="run-test-btn">Run Test</button>
                <div id="test-results" class="test-results"></div>
            </div>
        `;

        document.getElementById('run-test-btn').addEventListener('click', async () => {
            const testInput = document.getElementById('test-input').value;
            const resultsDiv = document.getElementById('test-results');
            
            try {
                const input = JSON.parse(testInput);
                resultsDiv.innerHTML = '<div class="loading">Running test...</div>';
                
                // Simulate test execution
                setTimeout(() => {
                    resultsDiv.innerHTML = `
                        <div class="test-success">
                            <h5>Test Results</h5>
                            <div class="result-item">
                                <strong>Conditions:</strong> 
                                <span class="badge badge-success">Passed</span>
                            </div>
                            <div class="result-item">
                                <strong>Actions Executed:</strong> ${this.ruleData.actions.length}
                            </div>
                            <div class="result-item">
                                <strong>Output:</strong>
                                <pre>${JSON.stringify({
                                    model_result: { prediction: 0.85, label: "positive" },
                                    notifications_sent: 1,
                                    execution_time: "120ms"
                                }, null, 2)}</pre>
                            </div>
                        </div>
                    `;
                }, 1500);
            } catch (error) {
                resultsDiv.innerHTML = `<div class="test-error">Invalid JSON input: ${error.message}</div>`;
            }
        });
    }
}

function setupAdvancedRulesEngine() {
    // Prevent multiple instances
    if (window.rulesEngine && window.rulesEngine.initialized) {
        console.log('🛡️ Rules engine already exists and initialized, skipping setup');
        return;
    }

    console.log('🏗️ Setting up new rules engine instance...');
    const rulesEngine = new AdvancedRulesEngine();
    rulesEngine.init();
    window.rulesEngine = rulesEngine;
    
    console.log('✅ Rules engine setup complete');
}

// Global helper function for copying to clipboard
window.copyToClipboard = function(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        // Show success feedback
        const button = event.target.closest('button');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.backgroundColor = '';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
    
    document.body.removeChild(textarea);
};

export { setupAdvancedRulesEngine };