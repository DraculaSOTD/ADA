"""
Data Lifecycle Management Models for ADA Platform
Handles data retention, download tracking, and automatic cleanup policies
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import enum
import uuid
import os

from models.base import Base
from core.db_types import get_uuid_type, JSONField

# Check if we're using SQLite
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"


class DataLifecycleStatus(enum.Enum):
    ACTIVE = "active"
    DOWNLOADED = "downloaded"
    EXPIRED = "expired" 
    SCHEDULED_FOR_DELETION = "scheduled_for_deletion"
    DELETED = "deleted"


class RetentionPolicyType(enum.Enum):
    IMMEDIATE = "immediate"  # Delete immediately after use
    HOURS_24 = "24_hours"    # Delete 24 hours after download
    DAYS_7 = "7_days"        # Delete after 7 days
    DAYS_30 = "30_days"      # Delete after 30 days
    PERMANENT = "permanent"  # Never auto-delete
    TRAINING_COMPLETE = "training_complete"  # Delete when training finishes


class DataDownload(Base):
    """Track all data download events"""
    __tablename__ = "data_downloads"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Resource being downloaded
    resource_type = Column(String(50), nullable=False)  # upload, generated_data, prediction, model_artifact
    resource_id = Column(String(255), nullable=False)
    resource_name = Column(String(255))
    
    # Download details
    download_method = Column(String(50), default='api')  # api, bulk, preview
    file_path = Column(Text)
    file_size_bytes = Column(Integer)
    download_duration_seconds = Column(Float)
    
    # Network and session info
    ip_address = Column(String(45))
    user_agent = Column(Text)
    session_id = Column(String(255))
    
    # Status tracking
    download_started_at = Column(DateTime, default=datetime.utcnow)
    download_completed_at = Column(DateTime)
    download_successful = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Retention impact
    retention_timer_started = Column(Boolean, default=False)
    is_first_download = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")


class DataRetentionPolicy(Base):
    """Configurable data retention policies"""
    __tablename__ = "data_retention_policies"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    
    # Policy identification
    policy_name = Column(String(255), nullable=False)
    resource_type = Column(String(50), nullable=False)  # upload, generated_data, prediction, model
    
    # Retention rules
    retention_type = Column(SQLEnum(RetentionPolicyType), nullable=False)
    retention_hours = Column(Integer)  # Hours to keep data after trigger
    
    # Trigger conditions
    trigger_on_creation = Column(Boolean, default=False)
    trigger_on_first_download = Column(Boolean, default=True)
    trigger_on_job_completion = Column(Boolean, default=False)
    trigger_on_last_access = Column(Boolean, default=False)
    
    # Policy settings
    send_notifications = Column(Boolean, default=True)
    notification_hours_before = Column(Integer, default=2)  # Warn 2 hours before deletion
    allow_user_extension = Column(Boolean, default=False)
    max_extension_hours = Column(Integer, default=168)  # Max 7 days extension
    
    # Scope
    applies_to_all_users = Column(Boolean, default=True)
    specific_user_id = Column(Integer, ForeignKey("users.id"))
    specific_team_id = Column(get_uuid_type(), ForeignKey("teams.id"))
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    specific_user = relationship("User", foreign_keys=[specific_user_id])
    specific_team = relationship("Team", foreign_keys=[specific_team_id])


class CleanupJob(Base):
    """Track cleanup operations and status"""
    __tablename__ = "cleanup_jobs"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    
    # Job identification
    job_type = Column(String(50), nullable=False)  # scheduled_cleanup, manual_cleanup, emergency_cleanup
    cleanup_reason = Column(String(100))  # retention_expired, user_requested, system_maintenance
    
    # Scope
    resource_type = Column(String(50))  # upload, generated_data, prediction, all
    resource_ids = Column(JSONField, default=list)  # List of specific resource IDs
    user_filter = Column(Integer, ForeignKey("users.id"))  # Clean specific user's data
    team_filter = Column(get_uuid_type(), ForeignKey("teams.id"))  # Clean specific team's data
    
    # Execution details
    scheduled_at = Column(DateTime, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Status and results
    status = Column(String(20), default='scheduled')  # scheduled, running, completed, failed, cancelled
    items_processed = Column(Integer, default=0)
    items_deleted = Column(Integer, default=0)
    items_failed = Column(Integer, default=0)
    bytes_freed = Column(Integer, default=0)
    
    # Error handling
    error_count = Column(Integer, default=0)
    last_error = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Execution metadata
    execution_log = Column(JSONField, default=list)
    performance_metrics = Column(JSONField, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user_filter_rel = relationship("User", foreign_keys=[user_filter])
    team_filter_rel = relationship("Team", foreign_keys=[team_filter])


class DataLifecycleEvent(Base):
    """Complete audit trail of data lifecycle events"""
    __tablename__ = "data_lifecycle_events"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    
    # Resource identification
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(255), nullable=False)
    resource_name = Column(String(255))
    
    # Event details
    event_type = Column(String(50), nullable=False)  # created, downloaded, expired, deleted, extended
    event_description = Column(Text)
    
    # Context
    user_id = Column(Integer, ForeignKey("users.id"))
    triggered_by = Column(String(50))  # user_action, policy, system, api
    related_policy_id = Column(get_uuid_type(), ForeignKey("data_retention_policies.id"))
    related_cleanup_job_id = Column(get_uuid_type(), ForeignKey("cleanup_jobs.id"))
    
    # Lifecycle state changes
    previous_status = Column(String(50))
    new_status = Column(String(50))
    previous_expiration = Column(DateTime)
    new_expiration = Column(DateTime)
    
    # Additional metadata
    event_metadata = Column(JSONField, default=dict)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    policy = relationship("DataRetentionPolicy")
    cleanup_job = relationship("CleanupJob")


class UserRetentionPreference(Base):
    """User-specific retention preferences and settings"""
    __tablename__ = "user_retention_preferences"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True)
    notification_hours_before = Column(Integer, default=2)
    send_daily_summary = Column(Boolean, default=False)
    
    # Default retention preferences
    default_generated_data_retention = Column(SQLEnum(RetentionPolicyType), default=RetentionPolicyType.HOURS_24)
    default_prediction_retention = Column(SQLEnum(RetentionPolicyType), default=RetentionPolicyType.HOURS_24)
    default_training_data_retention = Column(SQLEnum(RetentionPolicyType), default=RetentionPolicyType.TRAINING_COMPLETE)
    
    # Extension preferences
    auto_extend_before_expiry = Column(Boolean, default=False)
    max_auto_extensions = Column(Integer, default=3)
    
    # Storage preferences
    compress_old_data = Column(Boolean, default=True)
    archive_instead_of_delete = Column(Boolean, default=False)
    archive_location = Column(String(255))  # S3 bucket, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="retention_preferences")


# Update existing models with lifecycle tracking
def add_lifecycle_columns():
    """
    These columns should be added to existing data models:
    
    For Upload, GeneratedData, PredictionResult models:
    - lifecycle_status: DataLifecycleStatus
    - first_downloaded_at: DateTime
    - download_count: Integer
    - retention_policy_id: ForeignKey to DataRetentionPolicy
    - expires_at: DateTime (calculated based on policy)
    - expiry_notified_at: DateTime
    - user_extended_until: DateTime (if user requested extension)
    - scheduled_deletion_at: DateTime
    """
    pass