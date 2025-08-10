// Progress Monitor Component
class ProgressMonitor {
    constructor() {
        this.container = null;
        this.options = {
            title: 'Processing...',
            showLogs: true,
            allowPause: true,
            allowCancel: true,
            autoClose: false,
            onComplete: null,
            onCancel: null,
            onPause: null,
            onResume: null
        };
        
        this.state = {
            isPaused: false,
            isCancelled: false,
            isCompleted: false,
            startTime: null,
            totalItems: 0,
            processedItems: 0,
            currentStage: '',
            logs: [],
            speed: 0,
            lastUpdateTime: null,
            lastProcessedCount: 0
        };
        
        this.updateInterval = null;
    }

    initialize(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('ProgressMonitor: Container not found');
            return;
        }
        
        this.options = { ...this.options, ...options };
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Pause/Resume button
        const pauseBtn = this.container.querySelector('#pauseButton');
        const resumeBtn = this.container.querySelector('#resumeButton');
        
        if (pauseBtn && this.options.allowPause) {
            pauseBtn.addEventListener('click', () => this.pauseProgress());
        } else if (pauseBtn) {
            pauseBtn.style.display = 'none';
        }
        
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.resumeProgress());
        }
        
        // Cancel button
        const cancelBtn = this.container.querySelector('#cancelButton');
        if (cancelBtn && this.options.allowCancel) {
            cancelBtn.addEventListener('click', () => this.cancelProgress());
        } else if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        
        // Log toggle
        const logHeader = this.container.querySelector('#logHeader');
        if (logHeader) {
            logHeader.addEventListener('click', () => this.toggleLogs());
        }
        
        // Log controls
        const clearLogsBtn = this.container.querySelector('#clearLogsButton');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => this.clearLogs());
        }
        
        const exportLogsBtn = this.container.querySelector('#exportLogsButton');
        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', () => this.exportLogs());
        }
        
        // Summary actions
        const viewReportBtn = this.container.querySelector('#viewReportButton');
        if (viewReportBtn) {
            viewReportBtn.addEventListener('click', () => this.viewReport());
        }
        
        const closeBtn = this.container.querySelector('#closeMonitorButton');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    startProgress(totalItems, operationName = 'Processing') {
        this.state.totalItems = totalItems;
        this.state.processedItems = 0;
        this.state.startTime = Date.now();
        this.state.isCompleted = false;
        this.state.isCancelled = false;
        this.state.isPaused = false;
        
        // Update title
        const titleEl = this.container.querySelector('#progressTitle');
        if (titleEl) {
            titleEl.textContent = operationName;
        }
        
        // Start update interval
        this.updateInterval = setInterval(() => this.updateStats(), 1000);
        
        // Add initial log
        this.addLog(`Started: ${operationName}`, 'info');
        
        // Show progress monitor
        this.container.classList.add('processing');
        this.updateUI();
    }

    updateProgress(currentItem, stage = '', message = '') {
        if (this.state.isCancelled || this.state.isCompleted) return;
        
        this.state.processedItems = currentItem;
        this.state.currentStage = stage;
        
        // Update progress bar
        const percentage = Math.round((currentItem / this.state.totalItems) * 100);
        const progressFill = this.container.querySelector('#progressFill');
        const progressPercentage = this.container.querySelector('#progressPercentage');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${percentage}%`;
        }
        
        // Update stage text
        const stageText = this.container.querySelector('#stageText');
        if (stageText && stage) {
            stageText.textContent = stage;
        }
        
        // Add log if message provided
        if (message) {
            this.addLog(message, 'info');
        }
        
        // Update stats
        this.updateStats();
        
        // Check if completed
        if (currentItem >= this.state.totalItems) {
            this.completeProgress();
        }
    }

    updateStats() {
        const now = Date.now();
        const elapsed = now - this.state.startTime;
        
        // Update items processed
        const itemsProcessedEl = this.container.querySelector('#itemsProcessed');
        if (itemsProcessedEl) {
            itemsProcessedEl.textContent = this.formatNumber(this.state.processedItems);
        }
        
        // Update time elapsed
        const timeElapsedEl = this.container.querySelector('#timeElapsed');
        if (timeElapsedEl) {
            timeElapsedEl.textContent = this.formatTime(elapsed);
        }
        
        // Calculate and update speed
        if (this.state.lastUpdateTime) {
            const timeDiff = (now - this.state.lastUpdateTime) / 1000; // in seconds
            const itemsDiff = this.state.processedItems - this.state.lastProcessedCount;
            this.state.speed = itemsDiff / timeDiff;
            
            const speedEl = this.container.querySelector('#processingSpeed');
            if (speedEl) {
                speedEl.textContent = Math.round(this.state.speed);
            }
        }
        
        // Update ETA
        if (this.state.speed > 0 && this.state.processedItems < this.state.totalItems) {
            const remainingItems = this.state.totalItems - this.state.processedItems;
            const eta = remainingItems / this.state.speed * 1000; // in milliseconds
            
            const timeRemainingEl = this.container.querySelector('#timeRemaining');
            if (timeRemainingEl) {
                timeRemainingEl.textContent = this.formatTime(eta);
            }
        }
        
        this.state.lastUpdateTime = now;
        this.state.lastProcessedCount = this.state.processedItems;
    }

    pauseProgress() {
        if (this.state.isPaused || this.state.isCompleted || this.state.isCancelled) return;
        
        this.state.isPaused = true;
        this.container.classList.add('paused');
        
        // Toggle buttons
        const pauseBtn = this.container.querySelector('#pauseButton');
        const resumeBtn = this.container.querySelector('#resumeButton');
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'flex';
        
        // Clear update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.addLog('Progress paused', 'warning');
        
        if (this.options.onPause) {
            this.options.onPause();
        }
    }

    resumeProgress() {
        if (!this.state.isPaused || this.state.isCompleted || this.state.isCancelled) return;
        
        this.state.isPaused = false;
        this.container.classList.remove('paused');
        
        // Toggle buttons
        const pauseBtn = this.container.querySelector('#pauseButton');
        const resumeBtn = this.container.querySelector('#resumeButton');
        if (pauseBtn) pauseBtn.style.display = 'flex';
        if (resumeBtn) resumeBtn.style.display = 'none';
        
        // Restart update interval
        this.updateInterval = setInterval(() => this.updateStats(), 1000);
        
        this.addLog('Progress resumed', 'success');
        
        if (this.options.onResume) {
            this.options.onResume();
        }
    }

    cancelProgress() {
        if (this.state.isCompleted || this.state.isCancelled) return;
        
        if (confirm('Are you sure you want to cancel this operation?')) {
            this.state.isCancelled = true;
            this.container.classList.add('cancelled');
            
            // Clear update interval
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            
            this.addLog('Operation cancelled by user', 'error');
            
            // Show summary
            this.showSummary('cancelled');
            
            if (this.options.onCancel) {
                this.options.onCancel();
            }
        }
    }

    completeProgress(summary = {}) {
        if (this.state.isCompleted || this.state.isCancelled) return;
        
        this.state.isCompleted = true;
        this.container.classList.remove('processing');
        this.container.classList.add('completed');
        
        // Clear update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Final update
        const progressFill = this.container.querySelector('#progressFill');
        const progressPercentage = this.container.querySelector('#progressPercentage');
        if (progressFill) progressFill.style.width = '100%';
        if (progressPercentage) progressPercentage.textContent = '100%';
        
        this.addLog('Operation completed successfully', 'success');
        
        // Show summary
        this.showSummary('success', summary);
        
        if (this.options.onComplete) {
            this.options.onComplete(summary);
        }
        
        if (this.options.autoClose) {
            setTimeout(() => this.close(), 5000);
        }
    }

    showSummary(status, summary = {}) {
        const summaryEl = this.container.querySelector('#progressSummary');
        if (!summaryEl) return;
        
        // Hide progress elements
        const progressElements = [
            '.progress-controls',
            '.current-stage',
            '.progress-stats'
        ];
        progressElements.forEach(selector => {
            const el = this.container.querySelector(selector);
            if (el) el.style.display = 'none';
        });
        
        // Update summary icon and title
        const summaryIcon = this.container.querySelector('#summaryIcon');
        const summaryTitle = this.container.querySelector('#summaryTitle');
        const summaryMessage = this.container.querySelector('#summaryMessage');
        
        if (status === 'success') {
            summaryIcon.className = 'fas fa-check-circle';
            summaryTitle.textContent = 'Operation Complete';
            summaryMessage.textContent = summary.message || 'Successfully processed all items.';
        } else if (status === 'cancelled') {
            summaryIcon.className = 'fas fa-exclamation-circle';
            summaryTitle.textContent = 'Operation Cancelled';
            summaryMessage.textContent = 'The operation was cancelled by the user.';
        } else if (status === 'error') {
            summaryIcon.className = 'fas fa-exclamation-triangle';
            summaryTitle.textContent = 'Operation Failed';
            summaryMessage.textContent = summary.message || 'An error occurred during processing.';
        }
        
        // Add summary statistics
        const elapsed = Date.now() - this.state.startTime;
        const summaryStats = this.container.querySelector('#summaryStats');
        if (summaryStats) {
            summaryStats.innerHTML = `
                <div class="summary-stat">
                    <span class="summary-stat-value">${this.formatNumber(this.state.processedItems)}</span>
                    <span class="summary-stat-label">Items Processed</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-stat-value">${this.formatTime(elapsed)}</span>
                    <span class="summary-stat-label">Total Time</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-stat-value">${Math.round(this.state.speed || 0)}</span>
                    <span class="summary-stat-label">Avg. Items/sec</span>
                </div>
            `;
        }
        
        // Show summary
        summaryEl.style.display = 'block';
    }

    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { timestamp, message, type };
        this.state.logs.push(logEntry);
        
        // Update log count
        const logCount = this.container.querySelector('#logCount');
        if (logCount) {
            logCount.textContent = `(${this.state.logs.length})`;
        }
        
        // Add to log content
        const logContent = this.container.querySelector('#logContent');
        if (logContent) {
            const logEl = document.createElement('div');
            logEl.className = `log-entry ${type}`;
            logEl.innerHTML = `
                <span class="log-timestamp">[${timestamp}]</span>
                <span class="log-message">${message}</span>
            `;
            logContent.appendChild(logEl);
            
            // Auto-scroll if enabled
            const autoScroll = this.container.querySelector('#autoScrollLogs');
            if (autoScroll && autoScroll.checked) {
                logContent.scrollTop = logContent.scrollHeight;
            }
        }
    }

    toggleLogs() {
        const logViewer = this.container.querySelector('#logViewer');
        const toggleIcon = this.container.querySelector('#logToggleIcon');
        
        if (logViewer) {
            const isVisible = logViewer.style.display !== 'none';
            logViewer.style.display = isVisible ? 'none' : 'block';
            
            if (toggleIcon) {
                toggleIcon.classList.toggle('rotated', !isVisible);
            }
        }
    }

    clearLogs() {
        this.state.logs = [];
        const logContent = this.container.querySelector('#logContent');
        if (logContent) {
            logContent.innerHTML = '';
        }
        const logCount = this.container.querySelector('#logCount');
        if (logCount) {
            logCount.textContent = '(0)';
        }
    }

    exportLogs() {
        const logsText = this.state.logs
            .map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`)
            .join('\n');
        
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `progress-logs-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    viewReport() {
        // This can be customized based on the operation
        console.log('View report clicked');
    }

    close() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Clean up
        this.container.innerHTML = '';
        this.container.classList.remove('processing', 'completed', 'cancelled', 'paused');
    }

    updateUI() {
        // Update title if provided
        const titleEl = this.container.querySelector('#progressTitle');
        if (titleEl && this.options.title) {
            titleEl.textContent = this.options.title;
        }
        
        // Show/hide logs section
        const logSection = this.container.querySelector('.log-section');
        if (logSection && !this.options.showLogs) {
            logSection.style.display = 'none';
        }
    }

    formatNumber(num) {
        return num.toLocaleString();
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            const mins = minutes % 60;
            return `${hours}:${mins.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.container = null;
        this.state = {};
    }
}

// Export for use
window.ProgressMonitor = ProgressMonitor;