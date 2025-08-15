// WebSocket Manager - Real-time communication handler

class WebSocketManager {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.connected = false;
        this.reconnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = window.getConfig('websocket.maxReconnectAttempts', 10);
        this.reconnectInterval = window.getConfig('websocket.reconnectInterval', 5000);
        this.heartbeatInterval = window.getConfig('websocket.heartbeatInterval', 30000);
        this.messageTimeout = window.getConfig('websocket.messageTimeout', 10000);
        
        this.eventHandlers = new Map();
        this.messageQueue = [];
        this.subscriptions = new Set();
        this.pendingRequests = new Map();
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.send = this.send.bind(this);
        this.reconnect = this.reconnect.bind(this);
    }

    // Connect to WebSocket server
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log('Connecting to WebSocket:', this.url);
                
                // Create WebSocket connection
                this.ws = new WebSocket(this.url);
                
                // Set up event handlers
                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.connected = true;
                    this.reconnecting = false;
                    this.reconnectAttempts = 0;
                    
                    // Start heartbeat
                    this.startHeartbeat();
                    
                    // Process queued messages
                    this.processMessageQueue();
                    
                    // Restore subscriptions
                    this.restoreSubscriptions();
                    
                    // Trigger connect event
                    this.trigger('connect', { timestamp: Date.now() });
                    
                    resolve(true);
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.trigger('error', error);
                };
                
                this.ws.onclose = (event) => {
                    console.log('WebSocket closed:', event.code, event.reason);
                    this.connected = false;
                    
                    // Stop heartbeat
                    this.stopHeartbeat();
                    
                    // Trigger disconnect event
                    this.trigger('disconnect', { code: event.code, reason: event.reason });
                    
                    // Attempt reconnection if not deliberate close
                    if (event.code !== 1000 && !this.reconnecting) {
                        this.scheduleReconnect();
                    }
                };
                
                // Set connection timeout
                setTimeout(() => {
                    if (!this.connected) {
                        this.ws.close();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 10000);
                
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                reject(error);
            }
        });
    }

    // Disconnect from WebSocket server
    disconnect() {
        if (this.ws) {
            // Clear timers
            this.stopHeartbeat();
            this.clearReconnectTimer();
            
            // Close connection
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
            this.connected = false;
            
            console.log('WebSocket disconnected');
        }
    }

    // Send message through WebSocket
    send(type, data = {}, requestId = null) {
        const message = {
            type,
            data,
            timestamp: Date.now(),
            id: requestId || this.generateId()
        };
        
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
                console.log('WebSocket message sent:', type);
                return message.id;
            } catch (error) {
                console.error('Failed to send WebSocket message:', error);
                this.queueMessage(message);
            }
        } else {
            // Queue message if not connected
            this.queueMessage(message);
            console.log('Message queued (not connected):', type);
        }
        
        return message.id;
    }

    // Send request and wait for response
    async request(type, data = {}, timeout = null) {
        return new Promise((resolve, reject) => {
            const requestId = this.generateId();
            const timeoutMs = timeout || this.messageTimeout;
            
            // Set up timeout
            const timer = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout: ${type}`));
            }, timeoutMs);
            
            // Store pending request
            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                timer,
                type
            });
            
            // Send request
            this.send(type, data, requestId);
        });
    }

    // Handle incoming message
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log('WebSocket message received:', message.type);
            
            // Check if it's a response to a pending request
            if (message.requestId && this.pendingRequests.has(message.requestId)) {
                const request = this.pendingRequests.get(message.requestId);
                clearTimeout(request.timer);
                this.pendingRequests.delete(message.requestId);
                
                if (message.error) {
                    request.reject(new Error(message.error));
                } else {
                    request.resolve(message.data);
                }
                return;
            }
            
            // Handle different message types
            switch (message.type) {
                case 'pong':
                    // Heartbeat response
                    this.handlePong();
                    break;
                    
                case 'error':
                    this.trigger('error', message.data);
                    break;
                    
                case 'subscription_confirm':
                    this.handleSubscriptionConfirm(message.data);
                    break;
                    
                case 'subscription_data':
                    this.handleSubscriptionData(message.data);
                    break;
                    
                default:
                    // Trigger custom event
                    this.trigger('message', message);
                    this.trigger(message.type, message.data);
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    // Subscribe to a channel
    subscribe(channel, callback) {
        // Add to subscriptions
        this.subscriptions.add(channel);
        
        // Register callback
        this.on(`subscription:${channel}`, callback);
        
        // Send subscription request if connected
        if (this.connected) {
            this.send('subscribe', { channel });
        }
        
        console.log('Subscribed to channel:', channel);
    }

    // Unsubscribe from a channel
    unsubscribe(channel) {
        // Remove from subscriptions
        this.subscriptions.delete(channel);
        
        // Remove callbacks
        this.off(`subscription:${channel}`);
        
        // Send unsubscribe request if connected
        if (this.connected) {
            this.send('unsubscribe', { channel });
        }
        
        console.log('Unsubscribed from channel:', channel);
    }

    // Handle subscription confirmation
    handleSubscriptionConfirm(data) {
        console.log('Subscription confirmed:', data.channel);
        this.trigger(`subscription_confirm:${data.channel}`, data);
    }

    // Handle subscription data
    handleSubscriptionData(data) {
        this.trigger(`subscription:${data.channel}`, data.payload);
    }

    // Restore subscriptions after reconnection
    restoreSubscriptions() {
        for (const channel of this.subscriptions) {
            this.send('subscribe', { channel });
        }
    }

    // Queue message for later sending
    queueMessage(message) {
        this.messageQueue.push(message);
    }

    // Process queued messages
    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.connected) {
            const message = this.messageQueue.shift();
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Failed to send queued message:', error);
                // Re-queue the message
                this.messageQueue.unshift(message);
                break;
            }
        }
    }

    // Schedule reconnection attempt
    scheduleReconnect() {
        if (this.reconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            this.trigger('reconnect_failed');
            return;
        }
        
        this.reconnecting = true;
        this.reconnectAttempts++;
        
        const delay = Math.min(
            this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
            30000
        );
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnect();
        }, delay);
    }

    // Attempt to reconnect
    async reconnect() {
        try {
            await this.connect();
            console.log('Reconnection successful');
            this.trigger('reconnect_success');
        } catch (error) {
            console.error('Reconnection failed:', error);
            this.scheduleReconnect();
        }
    }

    // Clear reconnect timer
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // Start heartbeat
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            if (this.connected) {
                this.send('ping');
            }
        }, this.heartbeatInterval);
    }

    // Stop heartbeat
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // Handle pong response
    handlePong() {
        // Heartbeat received, connection is alive
        console.log('Heartbeat pong received');
    }

    // Register event handler
    on(event, callback) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(callback);
    }

    // Remove event handler
    off(event, callback = null) {
        if (!this.eventHandlers.has(event)) return;
        
        if (callback) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(callback);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        } else {
            // Remove all handlers for this event
            this.eventHandlers.delete(event);
        }
    }

    // Trigger event
    trigger(event, data = {}) {
        if (!this.eventHandlers.has(event)) return;
        
        const handlers = this.eventHandlers.get(event);
        for (const handler of handlers) {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        }
    }

    // Generate unique ID
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get connection state
    getState() {
        if (!this.ws) return 'disconnected';
        
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'connecting';
            case WebSocket.OPEN:
                return 'connected';
            case WebSocket.CLOSING:
                return 'closing';
            case WebSocket.CLOSED:
                return 'closed';
            default:
                return 'unknown';
        }
    }

    // Check if connected
    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    // Get statistics
    getStats() {
        return {
            connected: this.connected,
            state: this.getState(),
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            subscriptions: this.subscriptions.size,
            pendingRequests: this.pendingRequests.size
        };
    }
}

// Export for use in other modules
window.WebSocketManager = WebSocketManager;