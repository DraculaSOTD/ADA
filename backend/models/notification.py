"""
Notification Models for ADA Platform
Handles user notifications, preferences, and delivery tracking
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import os

from models.base import Base
from core.db_types import get_uuid_type, JSONField

# Check if we're using SQLite
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Notification content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default='info')  # info, warning, error, success, alert
    category = Column(String(50))  # model_training, data_processing, system, billing, etc.
    
    # Priority and urgency
    priority = Column(String(20), default='normal')  # low, normal, high, critical
    requires_action = Column(Boolean, default=False)
    action_url = Column(String(500))  # URL to navigate to for action
    
    # Additional data
    data = Column(JSONField)  # Any additional structured data
    notification_metadata = Column(JSONField)  # System metadata
    
    # Read status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    
    # Delivery status
    delivery_method = Column(String(50), default='in_app')  # in_app, email, sms, webhook
    is_delivered = Column(Boolean, default=False)
    delivered_at = Column(DateTime)
    delivery_attempts = Column(Integer, default=0)
    delivery_error = Column(Text)
    
    # Expiration
    expires_at = Column(DateTime)
    is_expired = Column(Boolean, default=False)
    
    # Related entities
    related_model_id = Column(Integer, ForeignKey("models.id"))
    related_job_id = Column(Integer, ForeignKey("model_jobs.id"))
    related_team_id = Column(get_uuid_type(), ForeignKey("teams.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # For backwards compatibility
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    related_model = relationship("Model")
    related_job = relationship("ModelJob")
    # related_team = relationship("Team")  # Comment out to avoid circular import
    
    # Indexes
    __table_args__ = (
        Index('ix_notifications_user_unread', 'user_id', 'is_read'),
        Index('ix_notifications_created', 'created_at'),
        Index('ix_notifications_priority', 'priority', 'is_read'),
    )


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Email preferences
    email_notifications = Column(Boolean, default=True)
    email_daily_digest = Column(Boolean, default=False)
    email_weekly_summary = Column(Boolean, default=False)
    marketing_emails = Column(Boolean, default=False)
    
    # Notification categories
    model_completion_alerts = Column(Boolean, default=True)
    data_processing_alerts = Column(Boolean, default=True)
    error_alerts = Column(Boolean, default=True)
    billing_alerts = Column(Boolean, default=True)
    team_activity_alerts = Column(Boolean, default=True)
    system_maintenance_alerts = Column(Boolean, default=True)
    api_usage_warnings = Column(Boolean, default=True)
    weekly_reports = Column(Boolean, default=False)
    
    # Delivery preferences
    preferred_delivery_method = Column(String(50), default='in_app')  # in_app, email, both
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5))  # HH:MM format
    quiet_hours_end = Column(String(5))  # HH:MM format
    timezone = Column(String(50), default='UTC')
    
    # Thresholds
    min_priority = Column(String(20), default='normal')  # Only notify for this priority or higher
    batch_notifications = Column(Boolean, default=False)  # Batch similar notifications
    batch_interval_minutes = Column(Integer, default=60)
    
    # Mobile/Push notifications (for future)
    push_notifications = Column(Boolean, default=False)
    push_token = Column(String(500))
    device_type = Column(String(50))  # ios, android, web
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    
    # Template identification
    template_key = Column(String(100), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(50), nullable=False)
    
    # Template content
    title_template = Column(Text, nullable=False)  # Can include {{variables}}
    message_template = Column(Text, nullable=False)  # Can include {{variables}}
    html_template = Column(Text)  # For email notifications
    
    # Default settings
    default_priority = Column(String(20), default='normal')
    default_type = Column(String(50), default='info')
    requires_action = Column(Boolean, default=False)
    
    # Variables
    required_variables = Column(JSONField, default=list)  # List of required template variables
    optional_variables = Column(JSONField, default=list)  # List of optional template variables
    
    # Usage
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NotificationLog(Base):
    __tablename__ = "notification_logs"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"))
    
    # Delivery attempt information
    attempt_number = Column(Integer, default=1)
    delivery_method = Column(String(50), nullable=False)
    
    # Status
    status = Column(String(20), nullable=False)  # pending, sent, delivered, failed, bounced
    
    # Response
    provider_response = Column(JSONField)  # Response from email/SMS provider
    error_message = Column(Text)
    
    # Metadata
    recipient_address = Column(String(500))  # Email, phone number, etc.
    message_id = Column(String(255))  # Provider's message ID
    
    attempted_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    notification = relationship("Notification")