"""
Payment Models for ADA Platform
Handles transactions, subscriptions, and payment-related entities
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey, DECIMAL, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import os

from models.base import Base
from core.db_types import get_uuid_type, get_array_type

# Check if we're using SQLite
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"


class PaymentMethod(Base):
    __tablename__ = "payment_methods"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    gateway = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    supported_currencies = Column(get_array_type(String), default=['ZAR'])
    min_amount = Column(DECIMAL(10, 2), default=10.00)
    max_amount = Column(DECIMAL(10, 2), default=100000.00)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TokenPackage(Base):
    __tablename__ = "token_packages"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    name = Column(String(100), nullable=False)
    tokens = Column(Integer, nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='ZAR')
    discount_percentage = Column(DECIMAL(5, 2), default=0)
    is_popular = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    description = Column(Text)
    features = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transactions = relationship("Transaction", back_populates="package")


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    gateway = Column(String(50), nullable=False)
    gateway_reference = Column(String(255))
    gateway_response = Column(JSON)
    amount = Column(DECIMAL(10, 2), nullable=False)
    vat_amount = Column(DECIMAL(10, 2), default=0)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='ZAR')
    status = Column(String(50), nullable=False)  # pending, processing, success, failed, refunded, cancelled
    transaction_type = Column(String(50), nullable=False)  # token_purchase, subscription, refund
    tokens_granted = Column(Integer, default=0)
    package_id = Column(get_uuid_type(), ForeignKey("token_packages.id"))
    invoice_number = Column(String(50))
    invoice_url = Column(Text)
    payment_metadata = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    package = relationship("TokenPackage", back_populates="transactions")
    invoice = relationship("Invoice", back_populates="transaction", uselist=False)
    refunds = relationship("Refund", back_populates="transaction")
    webhooks = relationship("PaymentWebhook", back_populates="transaction")


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    price = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='ZAR')
    billing_period = Column(String(20), nullable=False)  # monthly, quarterly, yearly
    tokens_per_period = Column(Integer, nullable=False)
    features = Column(JSON)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    plan_id = Column(get_uuid_type(), ForeignKey("subscription_plans.id"))
    gateway = Column(String(50), nullable=False)
    gateway_subscription_id = Column(String(255))
    status = Column(String(50), nullable=False)  # active, cancelled, past_due, paused, expired
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    cancel_at_period_end = Column(Boolean, default=False)
    cancelled_at = Column(DateTime)
    pause_start = Column(DateTime)
    pause_end = Column(DateTime)
    trial_start = Column(DateTime)
    trial_end = Column(DateTime)
    payment_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")


class PaymentWebhook(Base):
    __tablename__ = "payment_webhooks"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    gateway = Column(String(50), nullable=False)
    event_type = Column(String(100))
    payload = Column(JSON)
    headers = Column(JSON)
    signature = Column(String(500))
    signature_valid = Column(Boolean)
    processed = Column(Boolean, default=False)
    transaction_id = Column(get_uuid_type(), ForeignKey("transactions.id"))
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    transaction = relationship("Transaction", back_populates="webhooks")


class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    invoice_number = Column(String(50), unique=True, nullable=False)
    transaction_id = Column(get_uuid_type(), ForeignKey("transactions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    company_name = Column(String(255))
    company_vat_number = Column(String(50))
    billing_address = Column(JSON)
    subtotal = Column(DECIMAL(10, 2), nullable=False)
    vat_rate = Column(DECIMAL(5, 2), default=15.00)  # SA VAT rate
    vat_amount = Column(DECIMAL(10, 2), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='ZAR')
    status = Column(String(50), default='draft')  # draft, issued, paid, cancelled
    issued_date = Column(DateTime)
    due_date = Column(DateTime)
    paid_date = Column(DateTime)
    pdf_url = Column(Text)
    payment_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transaction = relationship("Transaction", back_populates="invoice")
    user = relationship("User", foreign_keys=[user_id])


class Refund(Base):
    __tablename__ = "refunds"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    transaction_id = Column(get_uuid_type(), ForeignKey("transactions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='ZAR')
    reason = Column(Text)
    status = Column(String(50), nullable=False)  # pending, processing, completed, failed
    gateway_refund_id = Column(String(255))
    gateway_response = Column(JSON)
    tokens_deducted = Column(Integer, default=0)
    processed_by = Column(Integer, ForeignKey("users.id"))
    processed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transaction = relationship("Transaction", back_populates="refunds")
    user = relationship("User", foreign_keys=[user_id], backref="refunds_received")
    processor = relationship("User", foreign_keys=[processed_by], backref="refunds_processed")


class PaymentAuditLog(Base):
    __tablename__ = "payment_audit_log"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50))  # transaction, subscription, refund, invoice
    entity_id = Column(get_uuid_type())
    old_values = Column(JSON)
    new_values = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    payment_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")