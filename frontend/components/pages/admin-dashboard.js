// Admin Dashboard Page Component

class AdminDashboardPage extends BaseComponent {
    getDefaultProps() {
        return {
            apiService: null,
            wsManager: null,
            user: null
        };
    }

    async createHTML() {
        return `
            <div class="admin-dashboard">
                <h1>Admin Dashboard</h1>
                
                <div class="admin-metrics">
                    <div class="metric-card">
                        <h3>Total Users</h3>
                        <p class="metric-value" id="total-users">0</p>
                    </div>
                    <div class="metric-card">
                        <h3>Active Devices</h3>
                        <p class="metric-value" id="active-devices">0</p>
                    </div>
                    <div class="metric-card">
                        <h3>System Load</h3>
                        <p class="metric-value" id="system-load">0%</p>
                    </div>
                    <div class="metric-card">
                        <h3>Total Jobs</h3>
                        <p class="metric-value" id="total-jobs">0</p>
                    </div>
                </div>

                <div class="admin-sections">
                    <div class="admin-section">
                        <h2>User Management</h2>
                        <div id="users-table"></div>
                    </div>
                    
                    <div class="admin-section">
                        <h2>Device Management</h2>
                        <div id="devices-grid"></div>
                    </div>
                    
                    <div class="admin-section">
                        <h2>System Logs</h2>
                        <div id="system-logs"></div>
                    </div>
                </div>
            </div>
        `;
    }

    async onMount() {
        await this.loadAdminData();
        this.setupWebSocketSubscriptions();
    }

    async loadAdminData() {
        try {
            const [users, devices, metrics] = await Promise.all([
                this.props.apiService.get('/admin/users'),
                this.props.apiService.get('/admin/devices'),
                this.props.apiService.get('/admin/metrics')
            ]);

            this.updateMetrics(metrics.data);
            this.renderUsersTable(users.data);
            this.renderDevicesGrid(devices.data);
        } catch (error) {
            window.app.showError('Failed to load admin data');
        }
    }

    updateMetrics(metrics) {
        this.find('#total-users').textContent = metrics.totalUsers || 0;
        this.find('#active-devices').textContent = metrics.activeDevices || 0;
        this.find('#system-load').textContent = `${metrics.systemLoad || 0}%`;
        this.find('#total-jobs').textContent = metrics.totalJobs || 0;
    }

    renderUsersTable(users) {
        const container = this.find('#users-table');
        // Create data table for users
        const table = new DataTableComponent(container, {
            columns: [
                { key: 'id', label: 'ID' },
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'tokenBalance', label: 'Tokens' },
                { key: 'status', label: 'Status' }
            ],
            data: users
        });
        table.render();
    }

    renderDevicesGrid(devices) {
        const container = this.find('#devices-grid');
        container.innerHTML = devices.map(device => `
            <div class="device-card">
                <h4>${device.name}</h4>
                <p>Status: ${device.status}</p>
                <p>Load: ${device.load}%</p>
                <button class="btn btn--sm" onclick="app.manageDevice('${device.id}')">Manage</button>
            </div>
        `).join('');
    }

    setupWebSocketSubscriptions() {
        if (this.props.wsManager) {
            this.props.wsManager.subscribe('admin', (data) => {
                if (data.type === 'metrics') {
                    this.updateMetrics(data.metrics);
                }
            });
        }
    }
}

window.AdminDashboardPage = AdminDashboardPage;