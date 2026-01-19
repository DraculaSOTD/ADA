"""
Enhanced Data Isolation Models for ADA Platform
Models for improved multi-tenancy, resource allocation, and data lineage tracking
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import os

from models.base import Base
from core.db_types import get_uuid_type, JSONField

# Check if we're using SQLite
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"


# NOTE: JobResourceAllocation is now defined in models/compute.py to avoid duplication
# Commenting out duplicate definition to prevent SQLAlchemy table conflicts
# class JobResourceAllocation(Base):
#     """Links jobs to specific resource allocations for isolation tracking"""
#     __tablename__ = "job_resource_allocations"
#
#     id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
#     job_id = Column(Integer, ForeignKey("model_jobs.id", ondelete="CASCADE"), nullable=False)
#     allocation_id = Column(get_uuid_type(), ForeignKey("resource_allocations.id", ondelete="CASCADE"), nullable=False)
#     allocated_at = Column(DateTime, default=datetime.utcnow)
#     released_at = Column(DateTime)
#     status = Column(String(20), default='active')  # active, released, failed
#     resource_usage_summary = Column(JSONField, default=lambda: {})
#     cost_breakdown = Column(JSONField, default=lambda: {})
#
#     # Relationships
#     job = relationship("ModelJob", back_populates="job_resource_allocations")
#     allocation = relationship("ResourceAllocation")
#
#     # Constraints
#     __table_args__ = (UniqueConstraint('job_id', 'allocation_id', name='unique_job_allocation'),)


class DataAccessPolicy(Base):
    """Enhanced fine-grained data access control policies"""
    __tablename__ = "data_access_policies"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    resource_type = Column(String(50), nullable=False)  # model, upload, job, generated_data
    resource_id = Column(String(255), nullable=False)
    policy_name = Column(String(255), nullable=False)
    policy_type = Column(String(50), default='access_control')  # access_control, data_retention, encryption
    
    # Subject (who the policy applies to)
    subject_type = Column(String(20), nullable=False)  # user, team, role, public
    subject_id = Column(String(255))  # null for public policies
    
    # Conditions and rules
    conditions = Column(JSONField, default=lambda: {})  # Time, IP, device restrictions
    permissions = Column(JSONField, nullable=False)  # Specific permissions granted
    restrictions = Column(JSONField, default=lambda: {})  # Rate limits, download limits, etc.
    
    # Policy metadata
    priority = Column(Integer, default=100)  # Lower number = higher priority
    is_active = Column(Boolean, default=True)
    effective_from = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    last_modified_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    modifier = relationship("User", foreign_keys=[last_modified_by])


class ResourceBillingLog(Base):
    """Tracks actual resource usage and billing for jobs"""
    __tablename__ = "resource_billing_log"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(get_uuid_type(), ForeignKey("teams.id"))
    job_id = Column(Integer, ForeignKey("model_jobs.id"))
    allocation_id = Column(get_uuid_type(), ForeignKey("resource_allocations.id"))
    
    # Billing details
    billing_type = Column(String(50), nullable=False)  # compute, storage, api_call, data_transfer
    resource_type = Column(String(50), nullable=False)  # cpu, gpu, memory, storage
    quantity = Column(Float, nullable=False)  # Amount consumed
    unit = Column(String(20), nullable=False)  # hours, gb, calls, mb
    rate_per_unit = Column(Integer, nullable=False)  # Tokens per unit
    total_tokens = Column(Integer, nullable=False)  # Total cost
    
    # Time tracking
    billing_period_start = Column(DateTime, nullable=False)
    billing_period_end = Column(DateTime, nullable=False)
    billed_at = Column(DateTime, default=datetime.utcnow)
    
    # Metadata
    billing_details = Column(JSONField, default=lambda: {})  # Additional billing context
    invoice_id = Column(String(255))  # Link to external billing system
    status = Column(String(20), default='pending')  # pending, processed, refunded
    
    # Relationships
    user = relationship("User")
    team = relationship("Team")
    job = relationship("ModelJob")
    allocation = relationship("ResourceAllocation")


class DataTransformationLog(Base):
    """Complete data lineage tracking for all transformations"""
    __tablename__ = "data_transformation_log"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    transformation_id = Column(String(255), nullable=False)  # Unique ID for this transformation
    parent_transformation_id = Column(String(255))  # Chain transformations
    
    # Source data
    source_data = Column(JSONField, nullable=False)  # List of source data references
    source_checksums = Column(JSONField, default=lambda: {})  # Data integrity verification
    
    # Target data
    target_data = Column(JSONField, nullable=False)  # List of output data references
    target_checksums = Column(JSONField, default=lambda: {})
    
    # Transformation details
    transformation_type = Column(String(50), nullable=False)
    algorithm = Column(String(100))  # ML algorithm used
    parameters = Column(JSONField, default=lambda: {})  # All parameters used
    code_version = Column(String(100))  # Version of processing code
    environment_info = Column(JSONField, default=lambda: {})  # Python version, dependencies
    
    # Processing context
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(get_uuid_type(), ForeignKey("teams.id"))
    job_id = Column(Integer, ForeignKey("model_jobs.id"))
    compute_instance_id = Column(get_uuid_type(), ForeignKey("compute_instances.id"))
    
    # Quality and validation
    input_data_quality = Column(JSONField, default=lambda: {})
    output_data_quality = Column(JSONField, default=lambda: {})
    validation_results = Column(JSONField, default=lambda: {})
    performance_metrics = Column(JSONField, default=lambda: {})
    
    # Reproducibility
    seed_values = Column(JSONField, default=lambda: {})  # Random seeds for reproducibility
    execution_environment = Column(JSONField, default=lambda: {})  # Container/environment details
    
    # Timing
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=False)
    processing_time_seconds = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    team = relationship("Team")
    job = relationship("ModelJob", back_populates="transformation_logs")
    compute_instance = relationship("ComputeInstance")


class ResourcePoolAssignment(Base):
    """Assigns compute instances to resource pools"""
    __tablename__ = "resource_pool_assignments"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    pool_id = Column(get_uuid_type(), ForeignKey("resource_pools.id", ondelete="CASCADE"), nullable=False)
    instance_id = Column(get_uuid_type(), ForeignKey("compute_instances.id", ondelete="CASCADE"), nullable=False)
    assignment_type = Column(String(20), default='automatic')  # automatic, manual, reserved
    priority = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    assigned_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    pool = relationship("ResourcePool")
    instance = relationship("ComputeInstance")
    assigner = relationship("User")
    
    # Constraints
    __table_args__ = (UniqueConstraint('pool_id', 'instance_id', name='unique_pool_instance'),)


# NOTE: TeamResourceQuota is now defined in models/compute.py to avoid duplication
# Commenting out duplicate definition to prevent SQLAlchemy table conflicts
# class TeamResourceQuota(Base):
#     """Resource quotas specifically for teams (separate from individual user quotas)"""
#     __tablename__ = "team_resource_quotas"
#
#     id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
#     team_id = Column(get_uuid_type(), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, unique=True)
#
#     # Compute quotas
#     max_concurrent_jobs = Column(Integer, default=10)
#     max_cpu_hours_daily = Column(Integer, default=100)
#     max_gpu_hours_daily = Column(Integer, default=10)
#     max_memory_gb_hours_daily = Column(Integer, default=500)
#     max_storage_gb = Column(Integer, default=1000)
#
#     # Model and data quotas
#     max_models = Column(Integer, default=50)
#     max_uploads_per_day = Column(Integer, default=100)
#     max_upload_size_gb = Column(Integer, default=10)
#     max_generated_data_gb = Column(Integer, default=100)
#
#     # Cost controls
#     daily_token_limit = Column(Integer, default=10000)
#     monthly_token_limit = Column(Integer, default=300000)
#     cost_alert_threshold = Column(Integer, default=8000)  # Alert at 80% of daily limit
#
#     # Access controls
#     allowed_instance_types = Column(JSONField, default=lambda: [])  # Empty = all allowed
#     blocked_instance_types = Column(JSONField, default=lambda: [])
#     max_job_duration_hours = Column(Integer, default=48)
#     can_use_gpu = Column(Boolean, default=True)
#     can_use_premium_instances = Column(Boolean, default=False)
#
#     created_at = Column(DateTime, default=datetime.utcnow)
#     updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
#
#     # Relationships
#     team = relationship("Team", back_populates="resource_quota")


class DataClassification(Base):
    """Automatic and manual data classification for compliance and security"""
    __tablename__ = "data_classification"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    data_type = Column(String(50), nullable=False)  # upload, generated_data, model_output
    data_id = Column(String(255), nullable=False)
    
    # Classification
    sensitivity_level = Column(String(20), default='internal')  # public, internal, confidential, restricted
    data_categories = Column(JSONField, default=lambda: [])  # PII, financial, health, etc.
    compliance_requirements = Column(JSONField, default=lambda: [])  # GDPR, HIPAA, etc.
    
    # Detection method
    classified_by = Column(String(50), default='automatic')  # automatic, manual, user_declared
    classification_confidence = Column(Float)  # 0.0-1.0 for automatic classification
    detection_rules = Column(JSONField, default=lambda: [])  # Rules that triggered classification
    
    # Access implications
    encryption_required = Column(Boolean, default=False)
    retention_period_days = Column(Integer)  # How long to keep the data
    deletion_required_by = Column(DateTime)  # Hard deadline for deletion
    export_restrictions = Column(JSONField, default=lambda: {})  # Geographic or other restrictions
    
    # Metadata
    classified_at = Column(DateTime, default=datetime.utcnow)
    last_reviewed = Column(DateTime)
    review_required_by = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    creator = relationship("User")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('data_type', 'data_id', name='unique_data_classification'),
        Index('idx_classification_sensitivity', 'sensitivity_level'),
        Index('idx_classification_compliance', 'compliance_requirements'),
        Index('idx_classification_review', 'review_required_by')
    )