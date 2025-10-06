/**
 * WebSocket Service for Real-time Updates
 * Manages WebSocket connections and handles real-time training updates
 */

class WebSocketService {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.messageQueue = [];
        this.subscriptions = new Map(); // job_id -> callback functions
        this.eventHandlers = new Map();
        this.pingInterval = null;
        this.connectionPromise = null;
    }
    
    /**
     * Connect to WebSocket server
     */
    async connect() {
        if (this.isConnected || this.connectionPromise) {
            return this.connectionPromise;
        }
        
        this.connectionPromise = new Promise((resolve, reject) => {
            const token = localStorage.getItem('token');
            if (!token) {
                reject(new Error('No authentication token found'));
                return;
            }
            
            // Determine WebSocket URL based on current location
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
            const wsUrl = `${protocol}//${host}:${port}/ws?token=${token}`;
            
            try {
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Process queued messages
                    this.processMessageQueue();
                    
                    // Start ping interval
                    this.startPingInterval();
                    
                    // Trigger connected event
                    this.triggerEvent('connected');
                    
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.triggerEvent('error', error);
                };
                
                this.ws.onclose = (event) => {
                    console.log('WebSocket disconnected:', event.code, event.reason);
                    this.isConnected = false;
                    this.connectionPromise = null;
                    
                    // Clear ping interval
                    this.stopPingInterval();
                    
                    // Trigger disconnected event
                    this.triggerEvent('disconnected', event);
                    
                    // Attempt reconnection
                    if (this.shouldReconnect(event.code)) {
                        this.reconnect();
                    }
                    
                    reject(new Error(`WebSocket closed: ${event.reason}`));
                };
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                this.connectionPromise = null;
                reject(error);
            }
        });
        
        return this.connectionPromise;
    }
    
    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.ws) {
            this.isConnected = false;
            this.stopPingInterval();
            this.ws.close();
            this.ws = null;
        }
    }
    
    /**
     * Reconnect to WebSocket server
     */
    async reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.triggerEvent('reconnect_failed');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(async () => {
            try {
                await this.connect();
                
                // Re-subscribe to all active jobs
                for (const jobId of this.subscriptions.keys()) {
                    await this.subscribeToJob(jobId);
                }
            } catch (error) {
                console.error('Reconnection failed:', error);
            }
        }, delay);
    }
    
    /**
     * Check if should attempt reconnection based on close code
     */
    shouldReconnect(code) {
        // Don't reconnect for authentication errors or normal closure
        const noReconnectCodes = [1000, 1001, 1008];
        return !noReconnectCodes.includes(code);
    }
    
    /**
     * Send a message to the server
     */
    send(message) {
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message for later
            this.messageQueue.push(message);
            
            // Try to connect if not connected
            if (!this.isConnected) {
                this.connect().catch(console.error);
            }
        }
    }
    
    /**
     * Process queued messages
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }
    
    /**
     * Handle incoming messages
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            // Handle ping/pong
            if (message.type === 'ping') {
                this.send({ type: 'pong' });
                return;
            }
            
            // Log message for debugging
            console.log('WebSocket message received:', message);
            
            // Trigger event handlers
            this.triggerEvent('message', message);
            
            // Handle specific message types
            switch (message.type) {
                case 'training_progress':
                    this.handleTrainingProgress(message.data);
                    break;
                
                case 'training_complete':
                    this.handleTrainingComplete(message.data);
                    break;
                
                case 'training_failed':
                    this.handleTrainingFailed(message.data);
                    break;
                
                case 'validation_progress':
                    this.handleValidationProgress(message.data);
                    break;
                
                case 'model_update':
                    this.handleModelUpdate(message.data);
                    break;
                
                case 'connection':
                    this.handleConnectionMessage(message.data);
                    break;
                
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }
    
    /**
     * Subscribe to training job updates
     */
    async subscribeToJob(jobId, callbacks = {}) {
        // Store callbacks
        this.subscriptions.set(jobId, callbacks);
        
        // Send subscription message
        this.send({
            type: 'subscribe',
            job_id: jobId
        });
        
        console.log(`Subscribed to job ${jobId}`);
    }
    
    /**
     * Unsubscribe from training job updates
     */
    unsubscribeFromJob(jobId) {
        // Remove callbacks
        this.subscriptions.delete(jobId);
        
        // Send unsubscribe message
        this.send({
            type: 'unsubscribe',
            job_id: jobId
        });
        
        console.log(`Unsubscribed from job ${jobId}`);
    }
    
    /**
     * Handle training progress updates
     */
    handleTrainingProgress(data) {
        const jobId = data.job_id;
        const callbacks = this.subscriptions.get(jobId);
        
        if (callbacks && callbacks.onProgress) {
            callbacks.onProgress(data);
        }
        
        // Trigger global event
        this.triggerEvent('training_progress', data);
        
        // Update UI elements if they exist
        this.updateProgressUI(data);
    }
    
    /**
     * Handle training completion
     */
    handleTrainingComplete(data) {
        const jobId = data.job_id;
        const callbacks = this.subscriptions.get(jobId);
        
        if (callbacks && callbacks.onComplete) {
            callbacks.onComplete(data);
        }
        
        // Trigger global event
        this.triggerEvent('training_complete', data);
        
        // Unsubscribe from job
        this.unsubscribeFromJob(jobId);
        
        // Show completion notification
        this.showNotification('Training Complete', `Model training completed successfully!`, 'success');
    }
    
    /**
     * Handle training failure
     */
    handleTrainingFailed(data) {
        const jobId = data.job_id;
        const callbacks = this.subscriptions.get(jobId);
        
        if (callbacks && callbacks.onError) {
            callbacks.onError(data);
        }
        
        // Trigger global event
        this.triggerEvent('training_failed', data);
        
        // Unsubscribe from job
        this.unsubscribeFromJob(jobId);
        
        // Show error notification
        this.showNotification('Training Failed', data.error_message || 'Model training failed', 'error');
    }
    
    /**
     * Handle validation progress updates
     */
    handleValidationProgress(data) {
        this.triggerEvent('validation_progress', data);
    }
    
    /**
     * Handle model updates
     */
    handleModelUpdate(data) {
        this.triggerEvent('model_update', data);
    }
    
    /**
     * Handle connection messages
     */
    handleConnectionMessage(data) {
        console.log('Connection message:', data);
        
        if (data.status === 'subscribed') {
            console.log(`Successfully subscribed to job ${data.job_id}`);
        } else if (data.status === 'unsubscribed') {
            console.log(`Successfully unsubscribed from job ${data.job_id}`);
        }
    }
    
    /**
     * Update progress UI elements
     */
    updateProgressUI(data) {
        // Update progress modal if it exists
        const progressFill = document.getElementById('generation-progress-fill');
        if (progressFill) {
            progressFill.style.width = data.progress_percentage + '%';
            
            const progressPercentage = progressFill.parentElement.querySelector('.progress-percentage');
            if (progressPercentage) {
                progressPercentage.textContent = Math.round(data.progress_percentage) + '%';
            }
        }
        
        // Update status message
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = data.message;
        }
        
        // Update stage indicators
        const stages = document.querySelectorAll('.stage-item');
        stages.forEach(stage => {
            const stageName = stage.dataset.stage;
            if (stageName === data.current_stage) {
                stage.classList.add('active');
                stage.classList.remove('completed');
            } else if (this.isStageCompleted(stageName, data.current_stage)) {
                stage.classList.add('completed');
                stage.classList.remove('active');
            } else {
                stage.classList.remove('active', 'completed');
            }
        });
        
        // Update metrics if available
        if (data.metrics) {
            this.updateMetricsDisplay(data.metrics);
        }
    }
    
    /**
     * Check if a stage is completed based on current stage
     */
    isStageCompleted(stageName, currentStage) {
        const stageOrder = ['initializing', 'preprocessing', 'training', 'evaluating', 'finalizing'];
        const stageIndex = stageOrder.indexOf(stageName);
        const currentIndex = stageOrder.indexOf(currentStage);
        return stageIndex < currentIndex;
    }
    
    /**
     * Update metrics display
     */
    updateMetricsDisplay(metrics) {
        // Update accuracy if available
        if (metrics.accuracy !== undefined) {
            const accuracyElement = document.getElementById('current-accuracy');
            if (accuracyElement) {
                accuracyElement.textContent = (metrics.accuracy * 100).toFixed(1) + '%';
            }
        }
        
        // Update other metrics
        for (const [key, value] of Object.entries(metrics)) {
            const element = document.getElementById(`metric-${key}`);
            if (element) {
                if (typeof value === 'number') {
                    element.textContent = value.toFixed(3);
                } else {
                    element.textContent = value;
                }
            }
        }
    }
    
    /**
     * Show notification
     */
    showNotification(title, message, type = 'info') {
        // Check if we have a notification system
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            // Fallback to console
            console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
        }
    }
    
    /**
     * Register event handler
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    /**
     * Remove event handler
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * Trigger event
     */
    triggerEvent(event, data = null) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Start ping interval to keep connection alive
     */
    startPingInterval() {
        this.stopPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.isConnected) {
                // Server will send ping, we respond with pong
            }
        }, 30000); // Every 30 seconds
    }
    
    /**
     * Stop ping interval
     */
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    /**
     * Get connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            activeSubscriptions: Array.from(this.subscriptions.keys())
        };
    }
}

// Create singleton instance
const wsService = new WebSocketService();

// Auto-connect when page loads if user is authenticated
if (localStorage.getItem('token')) {
    wsService.connect().catch(console.error);
}

export default wsService;