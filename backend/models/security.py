"""
Security and Data Isolation Models for ADA Platform
Handles audit logging, data lineage, and fine-grained permissions
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import os

from models.base import Base
from core.db_types import get_uuid_type, JSONField

# Check if we're using SQLite
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"


class DataAccessLog(Base):
    __tablename__ = "data_access_log"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(get_uuid_type(), ForeignKey("teams.id"))
    
    # Resource being accessed
    resource_type = Column(String(50), nullable=False)  # model, upload, generated_data, job, rule
    resource_id = Column(String(255), nullable=False)
    resource_owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Access details
    action = Column(String(50), nullable=False)  # read, write, delete, share, download, execute
    method = Column(String(10))  # GET, POST, PUT, DELETE
    endpoint = Column(String(255))
    
    # Request context
    ip_address = Column(String(45))  # Support IPv6
    user_agent = Column(Text)
    session_id = Column(String(255))
    request_id = Column(String(255))
    
    # Authorization
    permission_source = Column(String(50))  # owner, team, shared, admin
    authorization_level = Column(String(20))  # read, write, admin
    
    # Result
    success = Column(Boolean, nullable=False)
    error_code = Column(String(20))
    error_message = Column(Text)
    response_size_bytes = Column(Integer)
    processing_time_ms = Column(Integer)
    
    # Additional context
    details = Column(JSONField, default=lambda: {})
    request_metadata = Column(JSONField, default=lambda: {})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    team = relationship("Team")
    resource_owner = relationship("User", foreign_keys=[resource_owner_id])


class DataLineage(Base):
    __tablename__ = "data_lineage"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    
    # Source data
    source_id = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False)  # upload, generated, model_output, cleaned
    source_name = Column(String(255))
    source_checksum = Column(String(255))  # For data integrity verification
    
    # Target data
    target_id = Column(String(255), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_name = Column(String(255))
    target_checksum = Column(String(255))
    
    # Transformation details
    transformation_type = Column(String(50), nullable=False)  # clean, transform, split, merge, train, predict
    transformation_config = Column(JSONField, default=lambda: {})
    transformation_code_hash = Column(String(255))  # Hash of code used for transformation
    
    # Process context
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("model_jobs.id"))
    processing_node = Column(String(255))  # Which compute instance processed this
    
    # Quality and validation
    data_quality_before = Column(JSONField, default=lambda: {})
    data_quality_after = Column(JSONField, default=lambda: {})
    validation_results = Column(JSONField, default=lambda: {})
    
    # Timing
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    job = relationship("ModelJob")


class DataPermission(Base):
    __tablename__ = "data_permissions"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    
    # Resource being shared
    data_id = Column(String(255), nullable=False)
    data_type = Column(String(50), nullable=False)  # upload, generated_data, model, job_result
    data_name = Column(String(255))  # Cached name for faster queries
    
    # Permission recipient
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(get_uuid_type(), ForeignKey("teams.id"))  # If shared with team
    
    # Permission grantor
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    granted_reason = Column(Text)
    
    # Permissions granted
    permissions = Column(JSONField, nullable=False)  # ["read", "write", "share", "delete"]
    access_level = Column(String(20), default='read')  # read, write, admin
    
    # Access restrictions
    ip_restrictions = Column(JSONField, default=lambda: [])  # List of allowed IP ranges
    time_restrictions = Column(JSONField, default=lambda: {})  # Time-based access rules
    usage_limits = Column(JSONField, default=lambda: {})  # Max downloads, views, etc.
    
    # Expiration
    expires_at = Column(DateTime)
    is_revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime)
    revoked_by = Column(Integer, ForeignKey("users.id"))
    revocation_reason = Column(Text)
    
    # Tracking
    access_count = Column(Integer, default=0)
    last_accessed = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    team = relationship("Team")
    grantor = relationship("User", foreign_keys=[granted_by])
    revoker = relationship("User", foreign_keys=[revoked_by])


class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    
    # Event classification
    event_type = Column(String(50), nullable=False)  # login, permission_denied, data_breach, suspicious_activity
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    category = Column(String(50))  # authentication, authorization, data_access, system
    
    # User and context
    user_id = Column(Integer, ForeignKey("users.id"))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    session_id = Column(String(255))
    
    # Event details
    description = Column(Text, nullable=False)
    resource_affected = Column(String(255))
    action_attempted = Column(String(100))
    
    # System state
    system_state = Column(JSONField, default=lambda: {})
    request_data = Column(JSONField, default=lambda: {})
    response_data = Column(JSONField, default=lambda: {})
    
    # Detection and response
    detected_by = Column(String(50))  # system, admin, automated_rule
    automatic_response = Column(String(100))  # blocked, rate_limited, account_locked
    requires_investigation = Column(Boolean, default=False)
    investigated = Column(Boolean, default=False)
    investigation_notes = Column(Text)
    
    # Resolution
    resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    resolver = relationship("User", foreign_keys=[resolved_by])


class ApiKeyUsage(Base):
    __tablename__ = "api_key_usage"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Request details
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Response details
    status_code = Column(Integer)
    response_size_bytes = Column(Integer)
    processing_time_ms = Column(Integer)
    
    # Resource usage
    tokens_consumed = Column(Integer, default=0)
    compute_seconds = Column(Integer, default=0)
    
    # Rate limiting
    rate_limit_bucket = Column(String(100))
    rate_limit_remaining = Column(Integer)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    api_key = relationship("ApiKey")
    user = relationship("User")


class ComplianceLog(Base):
    __tablename__ = "compliance_log"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    
    # Compliance framework
    framework = Column(String(50), nullable=False)  # GDPR, HIPAA, SOX, PCI_DSS
    regulation = Column(String(100))  # Specific regulation within framework
    
    # Event details
    event_type = Column(String(50), nullable=False)  # data_processed, consent_given, data_deleted
    description = Column(Text, nullable=False)
    
    # Data subject
    user_id = Column(Integer, ForeignKey("users.id"))
    data_subject_id = Column(String(255))  # May be different from user_id
    
    # Data details
    data_types = Column(JSONField, default=lambda: [])  # Types of personal data involved
    data_categories = Column(JSONField, default=lambda: [])  # Categories like PII, financial, health
    processing_purpose = Column(String(255))
    legal_basis = Column(String(100))
    
    # Location and jurisdiction
    processing_location = Column(String(100))
    data_location = Column(String(100))
    jurisdiction = Column(String(50))
    
    # Retention and deletion
    retention_period = Column(Integer)  # Days
    scheduled_deletion = Column(DateTime)
    actual_deletion = Column(DateTime)
    
    # Audit trail
    performed_by = Column(Integer, ForeignKey("users.id"))
    automated = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    performer = relationship("User", foreign_keys=[performed_by])