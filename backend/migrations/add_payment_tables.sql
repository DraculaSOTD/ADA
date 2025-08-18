-- Payment Integration Database Schema
-- For ADA Platform with South African Business Support

-- Payment methods configuration
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway VARCHAR(50) NOT NULL, -- 'payfast', 'paystack', 'stripe'
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Display order
    supported_currencies TEXT[] DEFAULT ARRAY['ZAR'],
    min_amount DECIMAL(10,2) DEFAULT 10.00,
    max_amount DECIMAL(10,2) DEFAULT 100000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token packages for purchase
CREATE TABLE IF NOT EXISTS token_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    tokens INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    features JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    gateway VARCHAR(50) NOT NULL,
    gateway_reference VARCHAR(255),
    gateway_response JSONB,
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    status VARCHAR(50) NOT NULL, -- 'pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'
    transaction_type VARCHAR(50) NOT NULL, -- 'token_purchase', 'subscription', 'refund'
    tokens_granted INTEGER DEFAULT 0,
    package_id UUID REFERENCES token_packages(id),
    invoice_number VARCHAR(50),
    invoice_url TEXT,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    billing_period VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    tokens_per_period INTEGER NOT NULL,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    gateway VARCHAR(50) NOT NULL,
    gateway_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'past_due', 'paused', 'expired'
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP,
    pause_start TIMESTAMP,
    pause_end TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment webhooks log
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway VARCHAR(50) NOT NULL,
    event_type VARCHAR(100),
    payload JSONB,
    headers JSONB,
    signature VARCHAR(500),
    signature_valid BOOLEAN,
    processed BOOLEAN DEFAULT false,
    transaction_id UUID REFERENCES transactions(id),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices for tax compliance
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_id UUID REFERENCES transactions(id),
    user_id UUID REFERENCES users(id),
    company_name VARCHAR(255),
    company_vat_number VARCHAR(50),
    billing_address JSONB,
    subtotal DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 15.00, -- South African VAT rate
    vat_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'issued', 'paid', 'cancelled'
    issued_date DATE,
    due_date DATE,
    paid_date DATE,
    pdf_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refunds tracking
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    user_id UUID REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    reason TEXT,
    status VARCHAR(50) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    gateway_refund_id VARCHAR(255),
    gateway_response JSONB,
    tokens_deducted INTEGER DEFAULT 0,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment audit log for compliance
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'transaction', 'subscription', 'refund', 'invoice'
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_gateway ON transactions(gateway);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_payment_webhooks_gateway ON payment_webhooks(gateway);
CREATE INDEX idx_payment_webhooks_processed ON payment_webhooks(processed);

-- Insert default payment methods
INSERT INTO payment_methods (gateway, priority, supported_currencies, min_amount, max_amount) VALUES
('payfast', 1, ARRAY['ZAR'], 10.00, 100000.00),
('paystack', 2, ARRAY['ZAR', 'NGN', 'GHS', 'KES'], 10.00, 100000.00),
('stripe', 3, ARRAY['ZAR', 'USD', 'EUR', 'GBP'], 10.00, 100000.00)
ON CONFLICT DO NOTHING;

-- Insert default token packages
INSERT INTO token_packages (name, tokens, price, discount_percentage, is_popular, sort_order, description) VALUES
('Starter Pack', 1000, 99.00, 0, false, 1, 'Perfect for trying out the platform'),
('Popular Pack', 5000, 449.00, 10, true, 2, 'Most popular choice for regular users'),
('Professional Pack', 10000, 849.00, 15, false, 3, 'Great for professional data scientists'),
('Team Pack', 25000, 1999.00, 20, false, 4, 'Ideal for small teams'),
('Enterprise Pack', 50000, 3749.00, 25, false, 5, 'Best value for large organizations')
ON CONFLICT DO NOTHING;

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, billing_period, tokens_per_period, sort_order) VALUES
('Basic Monthly', 'Essential features for individuals', 199.00, 'monthly', 2000, 1),
('Pro Monthly', 'Advanced features for professionals', 599.00, 'monthly', 10000, 2),
('Team Monthly', 'Complete features for teams', 1499.00, 'monthly', 30000, 3),
('Enterprise Monthly', 'Custom solutions for enterprises', 4999.00, 'monthly', 100000, 4)
ON CONFLICT DO NOTHING;

-- Add token_balance to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_tokens_purchased INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_tokens_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_address JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fica_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fica_verified_at TIMESTAMP;