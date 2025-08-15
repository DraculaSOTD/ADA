// ADA Platform Configuration

window.ADAConfig = {
    // API Configuration
    apiBaseUrl: window.location.origin + '/api',
    wsUrl: `ws://${window.location.host}/ws`,
    
    // Application Settings
    appName: 'ADA Platform',
    version: '1.0.0',
    environment: 'development',
    
    // Feature Flags
    features: {
        websocket: true,
        notifications: true,
        darkMode: false,
        analytics: false,
        debug: true
    },
    
    // Authentication
    auth: {
        tokenKey: 'ada_auth_token',
        refreshTokenKey: 'ada_refresh_token',
        tokenExpiry: 3600000, // 1 hour in milliseconds
        rememberMeDuration: 604800000 // 7 days in milliseconds
    },
    
    // UI Configuration
    ui: {
        defaultTheme: 'light',
        animationsEnabled: true,
        pageSize: 20,
        maxNotifications: 5,
        toastDuration: 5000,
        debounceDelay: 300,
        throttleDelay: 100
    },
    
    // Model Configuration
    models: {
        maxNameLength: 100,
        maxDescriptionLength: 500,
        supportedTypes: ['classification', 'regression', 'clustering', 'anomaly_detection'],
        supportedFormats: ['csv', 'json', 'parquet'],
        maxFileSize: 104857600, // 100MB in bytes
        minPUs: 1,
        maxPUs: 100,
        defaultPUs: 10
    },
    
    // Data Generation
    dataGeneration: {
        minRows: 100,
        maxRows: 1000000,
        defaultRows: 1000,
        complexityLevels: ['simple', 'moderate', 'complex', 'very_complex'],
        defaultComplexity: 'moderate',
        maxFeatures: 100
    },
    
    // Rules Engine
    rulesEngine: {
        maxConditions: 20,
        maxActions: 10,
        operators: [
            { value: 'equals', label: 'Equals', types: ['string', 'number', 'boolean'] },
            { value: 'not_equals', label: 'Not Equals', types: ['string', 'number', 'boolean'] },
            { value: 'contains', label: 'Contains', types: ['string'] },
            { value: 'not_contains', label: 'Not Contains', types: ['string'] },
            { value: 'starts_with', label: 'Starts With', types: ['string'] },
            { value: 'ends_with', label: 'Ends With', types: ['string'] },
            { value: 'greater_than', label: 'Greater Than', types: ['number'] },
            { value: 'less_than', label: 'Less Than', types: ['number'] },
            { value: 'greater_or_equal', label: 'Greater or Equal', types: ['number'] },
            { value: 'less_or_equal', label: 'Less or Equal', types: ['number'] },
            { value: 'in', label: 'In List', types: ['string', 'number'] },
            { value: 'not_in', label: 'Not In List', types: ['string', 'number'] },
            { value: 'is_null', label: 'Is Null', types: ['all'] },
            { value: 'is_not_null', label: 'Is Not Null', types: ['all'] }
        ],
        actionTypes: [
            'send_notification',
            'update_field',
            'call_webhook',
            'trigger_job',
            'send_email',
            'log_event'
        ]
    },
    
    // WebSocket Configuration
    websocket: {
        reconnectInterval: 5000,
        maxReconnectAttempts: 10,
        heartbeatInterval: 30000,
        messageTimeout: 10000
    },
    
    // Admin Configuration
    admin: {
        requireMFA: false,
        sessionTimeout: 1800000, // 30 minutes
        maxLoginAttempts: 5,
        lockoutDuration: 900000 // 15 minutes
    },
    
    // Monitoring
    monitoring: {
        enableMetrics: true,
        metricsInterval: 60000, // 1 minute
        enableErrorTracking: true,
        errorSampleRate: 1.0
    },
    
    // API Endpoints
    endpoints: {
        // Auth
        login: '/auth/login',
        logout: '/auth/logout',
        register: '/auth/register',
        verify: '/auth/verify',
        refresh: '/auth/refresh',
        
        // Models
        models: '/models',
        modelCreate: '/models/create',
        modelDetail: '/models/:id',
        modelTrain: '/models/:id/train',
        modelPredict: '/models/:id/predict',
        modelDelete: '/models/:id',
        
        // Data
        dataUpload: '/data/upload',
        dataGenerate: '/data/generate',
        dataPreview: '/data/preview',
        dataValidate: '/data/validate',
        
        // Jobs
        jobs: '/jobs',
        jobDetail: '/jobs/:id',
        jobCancel: '/jobs/:id/cancel',
        jobLogs: '/jobs/:id/logs',
        
        // Rules
        rules: '/rules',
        ruleCreate: '/rules/create',
        ruleDetail: '/rules/:id',
        ruleTest: '/rules/:id/test',
        ruleDelete: '/rules/:id',
        
        // Admin
        adminUsers: '/admin/users',
        adminDevices: '/admin/devices',
        adminMetrics: '/admin/metrics',
        adminLogs: '/admin/logs',
        
        // User
        userProfile: '/user/profile',
        userTokens: '/user/tokens',
        userSettings: '/user/settings',
        userNotifications: '/user/notifications'
    },
    
    // Validation Rules
    validation: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
        username: /^[a-zA-Z0-9_]{3,20}$/,
        modelName: /^[a-zA-Z0-9_\- ]{3,100}$/,
        apiKey: /^[A-Za-z0-9]{32,}$/
    },
    
    // Error Messages
    errors: {
        network: 'Network error. Please check your connection.',
        unauthorized: 'You are not authorized to perform this action.',
        forbidden: 'Access forbidden.',
        notFound: 'The requested resource was not found.',
        serverError: 'Server error. Please try again later.',
        validationError: 'Please check your input and try again.',
        sessionExpired: 'Your session has expired. Please login again.'
    },
    
    // Success Messages
    messages: {
        loginSuccess: 'Successfully logged in!',
        logoutSuccess: 'Successfully logged out!',
        modelCreated: 'Model created successfully!',
        dataGenerated: 'Data generated successfully!',
        ruleCreated: 'Rule created successfully!',
        settingsSaved: 'Settings saved successfully!'
    }
};

// Helper function to get config value
window.getConfig = function(path, defaultValue = null) {
    const keys = path.split('.');
    let value = window.ADAConfig;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return defaultValue;
        }
    }
    
    return value;
};

// Helper function to set config value
window.setConfig = function(path, value) {
    const keys = path.split('.');
    let obj = window.ADAConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in obj) || typeof obj[key] !== 'object') {
            obj[key] = {};
        }
        obj = obj[key];
    }
    
    obj[keys[keys.length - 1]] = value;
};

// Helper function to build API URL
window.buildApiUrl = function(endpoint, params = {}) {
    let url = window.ADAConfig.endpoints[endpoint] || endpoint;
    
    // Replace path parameters
    for (const [key, value] of Object.entries(params)) {
        url = url.replace(`:${key}`, value);
    }
    
    return window.ADAConfig.apiBaseUrl + url;
};