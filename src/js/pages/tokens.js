/**
 * Token Purchase Page
 * Handles token package selection and payment processing
 */

class TokenPurchasePage {
    constructor() {
        this.packages = [];
        this.selectedPackage = null;
        this.selectedGateway = 'payfast'; // Default for South Africa
        this.paymentGateways = [
            {
                id: 'payfast',
                name: 'PayFast',
                description: 'Cards, EFT, SnapScan',
                logo: '💳',
                supported: ['ZAR']
            },
            {
                id: 'paystack',
                name: 'PayStack',
                description: 'Cards, Mobile Money',
                logo: '📱',
                supported: ['ZAR', 'NGN', 'GHS', 'KES']
            },
            {
                id: 'stripe',
                name: 'Stripe',
                description: 'International Cards',
                logo: '🌍',
                supported: ['ZAR', 'USD', 'EUR', 'GBP']
            }
        ];
    }
    
    render() {
        return `
            <div class="token-purchase-page">
                <div class="page-header">
                    <h1>Purchase Tokens</h1>
                    <p>Select a token package that suits your needs</p>
                </div>
                
                <div class="token-balance-card">
                    <div class="balance-info">
                        <span class="balance-label">Current Balance</span>
                        <div class="balance-amount">
                            <i class="fas fa-coins"></i>
                            <span id="current-balance">0</span>
                            <span class="balance-unit">tokens</span>
                        </div>
                    </div>
                </div>
                
                <div class="packages-section">
                    <h2>Token Packages</h2>
                    <div class="token-packages" id="token-packages">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading packages...</p>
                        </div>
                    </div>
                </div>
                
                <div class="payment-section" id="payment-section" style="display: none;">
                    <h2>Payment Method</h2>
                    <div class="payment-methods">
                        ${this.renderPaymentMethods()}
                    </div>
                    
                    <div class="order-summary-card">
                        <h3>Order Summary</h3>
                        <div id="order-summary-content">
                            <!-- Summary will be populated here -->
                        </div>
                        <div class="vat-notice">
                            <i class="fas fa-info-circle"></i>
                            <span>Price includes 15% VAT (South Africa)</span>
                        </div>
                        <button class="btn btn-primary btn-lg btn-block" id="proceed-payment-btn">
                            <i class="fas fa-lock"></i>
                            Proceed to Secure Payment
                        </button>
                    </div>
                </div>
                
                <div class="security-badges">
                    <div class="badge">
                        <i class="fas fa-shield-alt"></i>
                        <span>Secure Payment</span>
                    </div>
                    <div class="badge">
                        <i class="fas fa-lock"></i>
                        <span>SSL Encrypted</span>
                    </div>
                    <div class="badge">
                        <i class="fas fa-check-circle"></i>
                        <span>PCI Compliant</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPaymentMethods() {
        return this.paymentGateways.map(gateway => `
            <div class="payment-method-card ${gateway.id === this.selectedGateway ? 'selected' : ''}" 
                 data-gateway="${gateway.id}">
                <div class="method-header">
                    <span class="method-logo">${gateway.logo}</span>
                    <div class="method-info">
                        <h4>${gateway.name}</h4>
                        <p>${gateway.description}</p>
                    </div>
                    <div class="method-selector">
                        <input type="radio" name="payment-gateway" value="${gateway.id}" 
                               ${gateway.id === this.selectedGateway ? 'checked' : ''}>
                    </div>
                </div>
                ${gateway.id === 'payfast' ? `
                    <div class="method-features">
                        <span class="feature-badge">✓ FNB Direct</span>
                        <span class="feature-badge">✓ Same-day Settlement</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    async afterRender() {
        await this.loadPackages();
        await this.loadUserBalance();
        this.bindEvents();
    }
    
    async loadPackages() {
        try {
            const response = await fetch('http://localhost:8000/api/payment/packages', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load packages');
            
            const data = await response.json();
            this.packages = data.packages;
            this.renderPackages();
        } catch (error) {
            console.error('Error loading packages:', error);
            this.showError('Failed to load token packages');
        }
    }
    
    renderPackages() {
        const container = document.getElementById('token-packages');
        
        if (this.packages.length === 0) {
            container.innerHTML = '<p>No packages available</p>';
            return;
        }
        
        container.innerHTML = this.packages.map(pkg => `
            <div class="package-card ${pkg.is_popular ? 'popular' : ''}" data-package-id="${pkg.id}">
                ${pkg.is_popular ? '<div class="popular-badge">Most Popular</div>' : ''}
                ${pkg.discount_percentage > 0 ? `
                    <div class="discount-badge">${pkg.discount_percentage}% OFF</div>
                ` : ''}
                
                <div class="package-header">
                    <h3>${pkg.name}</h3>
                    <div class="package-tokens">
                        <span class="token-amount">${pkg.tokens.toLocaleString()}</span>
                        <span class="token-label">tokens</span>
                    </div>
                </div>
                
                <div class="package-price">
                    <span class="currency">R</span>
                    <span class="amount">${pkg.price.toFixed(2)}</span>
                    <span class="period">one-time</span>
                </div>
                
                <div class="package-rate">
                    R${(pkg.price / pkg.tokens).toFixed(4)} per token
                </div>
                
                ${pkg.description ? `
                    <p class="package-description">${pkg.description}</p>
                ` : ''}
                
                <button class="btn btn-primary select-package-btn" data-package-id="${pkg.id}">
                    Select Package
                </button>
            </div>
        `).join('');
        
        // Bind package selection events
        document.querySelectorAll('.select-package-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const packageId = e.target.dataset.packageId;
                this.selectPackage(packageId);
            });
        });
    }
    
    async loadUserBalance() {
        try {
            // Get user data from localStorage or API
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const balance = user.tokens || user.token_balance || 0;
                document.getElementById('current-balance').textContent = balance.toLocaleString();
            }
        } catch (error) {
            console.error('Error loading user balance:', error);
        }
    }
    
    selectPackage(packageId) {
        this.selectedPackage = this.packages.find(p => p.id === packageId);
        
        if (!this.selectedPackage) return;
        
        // Update UI
        document.querySelectorAll('.package-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`.package-card[data-package-id="${packageId}"]`).classList.add('selected');
        
        // Show payment section
        document.getElementById('payment-section').style.display = 'block';
        
        // Update order summary
        this.updateOrderSummary();
        
        // Scroll to payment section
        document.getElementById('payment-section').scrollIntoView({ behavior: 'smooth' });
    }
    
    updateOrderSummary() {
        const summaryContent = document.getElementById('order-summary-content');
        
        const subtotal = this.selectedPackage.price / 1.15; // Remove VAT for subtotal
        const vat = this.selectedPackage.price - subtotal;
        
        summaryContent.innerHTML = `
            <div class="summary-item">
                <span>Package</span>
                <strong>${this.selectedPackage.name}</strong>
            </div>
            <div class="summary-item">
                <span>Tokens</span>
                <strong>${this.selectedPackage.tokens.toLocaleString()}</strong>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-item">
                <span>Subtotal</span>
                <span>R ${subtotal.toFixed(2)}</span>
            </div>
            <div class="summary-item">
                <span>VAT (15%)</span>
                <span>R ${vat.toFixed(2)}</span>
            </div>
            ${this.selectedPackage.discount_percentage > 0 ? `
                <div class="summary-item discount">
                    <span>Discount</span>
                    <span class="text-success">-${this.selectedPackage.discount_percentage}%</span>
                </div>
            ` : ''}
            <div class="summary-divider"></div>
            <div class="summary-item total">
                <strong>Total</strong>
                <strong class="text-primary">R ${this.selectedPackage.price.toFixed(2)}</strong>
            </div>
        `;
    }
    
    bindEvents() {
        // Payment method selection
        document.querySelectorAll('.payment-method-card').forEach(card => {
            card.addEventListener('click', () => {
                const gateway = card.dataset.gateway;
                this.selectedGateway = gateway;
                
                // Update UI
                document.querySelectorAll('.payment-method-card').forEach(c => {
                    c.classList.remove('selected');
                });
                card.classList.add('selected');
                
                // Update radio button
                card.querySelector('input[type="radio"]').checked = true;
            });
        });
        
        // Proceed to payment button
        document.getElementById('proceed-payment-btn')?.addEventListener('click', () => {
            this.proceedToPayment();
        });
    }
    
    async proceedToPayment() {
        if (!this.selectedPackage) {
            this.showError('Please select a package');
            return;
        }
        
        const btn = document.getElementById('proceed-payment-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        btn.disabled = true;
        
        try {
            const response = await fetch('http://localhost:8000/api/payment/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    package_id: this.selectedPackage.id,
                    gateway: this.selectedGateway,
                    client_ip: window.location.hostname,
                    user_agent: navigator.userAgent
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Payment initialization failed');
            }
            
            const data = await response.json();
            
            if (data.success && data.payment_url) {
                // Store transaction ID for later verification
                sessionStorage.setItem('pending_transaction', data.transaction_id);
                
                // Redirect to payment gateway
                window.location.href = data.payment_url;
            } else if (data.session_id) {
                // Handle Stripe checkout
                this.handleStripePayment(data.session_id);
            } else if (data.access_code) {
                // Handle PayStack inline payment
                this.handlePayStackPayment(data.access_code);
            } else {
                throw new Error('Invalid payment response');
            }
        } catch (error) {
            console.error('Payment error:', error);
            this.showError(error.message || 'Failed to initialize payment');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
    
    handleStripePayment(sessionId) {
        // This would normally use Stripe.js library
        console.log('Stripe payment session:', sessionId);
        this.showError('Stripe integration pending - please use PayFast for now');
    }
    
    handlePayStackPayment(accessCode) {
        // This would normally use PayStack inline JS
        console.log('PayStack access code:', accessCode);
        this.showError('PayStack integration pending - please use PayFast for now');
    }
    
    showError(message) {
        if (window.app && window.app.showNotification) {
            window.app.showNotification({
                type: 'error',
                title: 'Payment Error',
                message: message,
                duration: 5000
            });
        } else {
            alert(message);
        }
    }
}

// Register page
if (typeof window !== 'undefined') {
    window.TokenPurchasePage = TokenPurchasePage;
}

// Export for ES6 modules
export { TokenPurchasePage };