// Dashboard Page Component

class DashboardPage extends BaseComponent {
    getDefaultProps() {
        return {
            user: null,
            apiService: null,
            wsManager: null
        };
    }

    getInitialState() {
        return {
            metrics: {
                activeModels: 0,
                tokenBalance: 0,
                processingJobs: 0,
                recentActivity: []
            },
            loading: true
        };
    }

    async createHTML() {
        const { metrics, loading } = this.state;
        const { user } = this.props;

        return `
            <div class="dashboard">
                <div class="dashboard__header">
                    <h1>Welcome to ADA Platform</h1>
                    ${user ? `<p>Hello, ${user.name}!</p>` : ''}
                </div>

                ${loading ? '<div class="loading">Loading dashboard...</div>' : ''}

                <div class="dashboard__metrics">
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-card__icon">📊</div>
                            <div class="metric-card__content">
                                <h3>Active Models</h3>
                                <p class="metric-card__value">${metrics.activeModels}</p>
                            </div>
                        </div>

                        <div class="metric-card">
                            <div class="metric-card__icon">💰</div>
                            <div class="metric-card__content">
                                <h3>Token Balance</h3>
                                <p class="metric-card__value">${metrics.tokenBalance}</p>
                            </div>
                        </div>

                        <div class="metric-card">
                            <div class="metric-card__icon">⚙️</div>
                            <div class="metric-card__content">
                                <h3>Processing Jobs</h3>
                                <p class="metric-card__value">${metrics.processingJobs}</p>
                            </div>
                        </div>

                        <div class="metric-card">
                            <div class="metric-card__icon">📈</div>
                            <div class="metric-card__content">
                                <h3>Recent Activity</h3>
                                <p class="metric-card__value">${metrics.recentActivity.length} events</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dashboard__actions">
                    <h2>Quick Actions</h2>
                    <div class="action-buttons">
                        <button class="btn btn--primary btn--lg" id="create-model-btn">
                            Create New Model
                        </button>
                        <button class="btn btn--secondary btn--lg" id="generate-data-btn">
                            Generate Data
                        </button>
                        <button class="btn btn--secondary btn--lg" id="view-models-btn">
                            View All Models
                        </button>
                        <button class="btn btn--secondary btn--lg" id="rules-engine-btn">
                            Rules Engine
                        </button>
                    </div>
                </div>

                <div class="dashboard__charts">
                    <div class="chart-container">
                        <h3>Usage Over Time</h3>
                        <div id="usage-chart" class="chart-placeholder">Chart will be rendered here</div>
                    </div>
                    <div class="chart-container">
                        <h3>Model Performance</h3>
                        <div id="performance-chart" class="chart-placeholder">Chart will be rendered here</div>
                    </div>
                </div>

                <div class="dashboard__recent">
                    <h2>Recent Activity</h2>
                    <div id="activity-list" class="activity-list"></div>
                </div>
            </div>
        `;
    }

    async onMount() {
        await this.loadDashboardData();
        this.setupWebSocketListeners();
    }

    bindEvents() {
        // Quick action buttons
        this.addEventListener('#create-model-btn', 'click', () => {
            window.app.router.navigate('/models/create');
        });

        this.addEventListener('#generate-data-btn', 'click', () => {
            window.app.router.navigate('/data/generate');
        });

        this.addEventListener('#view-models-btn', 'click', () => {
            window.app.router.navigate('/models');
        });

        this.addEventListener('#rules-engine-btn', 'click', () => {
            window.app.router.navigate('/rules');
        });
    }

    async loadDashboardData() {
        try {
            this.setState({ loading: true });

            // Fetch dashboard metrics
            const response = await this.props.apiService.get('/dashboard/metrics');
            
            if (response.success) {
                this.setState({
                    metrics: response.data,
                    loading: false
                });

                // Render activity list
                this.renderActivityList(response.data.recentActivity);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.setState({ loading: false });
        }
    }

    setupWebSocketListeners() {
        if (!this.props.wsManager) return;

        // Subscribe to dashboard updates
        this.props.wsManager.subscribe('dashboard', (data) => {
            this.handleDashboardUpdate(data);
        });
    }

    handleDashboardUpdate(data) {
        // Update metrics in real-time
        if (data.metrics) {
            this.setState({
                metrics: { ...this.state.metrics, ...data.metrics }
            });
        }

        // Add new activity
        if (data.activity) {
            this.addActivity(data.activity);
        }
    }

    renderActivityList(activities) {
        const container = this.find('#activity-list');
        if (!container) return;

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
                <span class="activity-message">${activity.message}</span>
            </div>
        `).join('');
    }

    addActivity(activity) {
        const container = this.find('#activity-list');
        if (!container) return;

        const activityHTML = `
            <div class="activity-item activity-item--new">
                <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
                <span class="activity-message">${activity.message}</span>
            </div>
        `;

        container.insertAdjacentHTML('afterbegin', activityHTML);

        // Limit number of activities shown
        const items = container.querySelectorAll('.activity-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }

    async onDestroy() {
        // Unsubscribe from WebSocket
        if (this.props.wsManager) {
            this.props.wsManager.unsubscribe('dashboard');
        }
    }
}

window.DashboardPage = DashboardPage;