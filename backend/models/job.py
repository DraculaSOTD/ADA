from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text, String, Boolean, Float
from sqlalchemy.orm import relationship
from models.base import Base
from core.db_types import JSONField, get_uuid_type

class ModelJob(Base):
    __tablename__ = "model_jobs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    team_id = Column(get_uuid_type(), ForeignKey("teams.id"))  # Team context
    model_id = Column(Integer, ForeignKey("models.id"))
    job_type = Column(Text)
    progress = Column(Integer, default=0)
    status = Column(Text)
    parameters = Column(JSONField)
    
    # Enhanced resource tracking
    token_cost = Column(Integer)
    estimated_token_cost = Column(Integer)
    resource_requirements = Column(JSONField, default=lambda: {})  # CPU, memory, GPU requirements
    priority = Column(Integer, default=1)  # 1=low, 5=high
    
    # Timing and performance
    error_message = Column(Text)
    duration_seconds = Column(Integer)
    queue_time_seconds = Column(Integer)  # Time spent waiting for resources
    
    # Job dependencies and retries
    retry_of_job_id = Column(Integer, ForeignKey("model_jobs.id"))
    dependent_on_job_id = Column(Integer, ForeignKey("model_jobs.id"))  # Job dependencies
    max_retries = Column(Integer, default=3)
    retry_count = Column(Integer, default=0)
    
    # Security and isolation
    execution_context = Column(JSONField, default=lambda: {})  # Execution environment details
    data_sources = Column(JSONField, default=lambda: [])  # Track data dependencies
    isolation_level = Column(String(20), default='standard')  # standard, enhanced, strict
    
    # Enhanced resource allocation integration
    requires_gpu = Column(Boolean, default=False)
    estimated_memory_gb = Column(Integer, default=4)
    estimated_cpu_cores = Column(Integer, default=2)
    estimated_duration_hours = Column(Integer, default=1)
    actual_resource_cost = Column(Integer, default=0)
    resource_allocation_status = Column(String(20), default='pending')
    allocated_instance_id = Column(get_uuid_type(), ForeignKey("compute_instances.id"))
    container_id = Column(String(255))
    isolation_network_id = Column(String(255))
    data_access_permissions = Column(JSONField, default=lambda: [])
    
    # Temporary workspace management for training isolation
    temporary_workspace_path = Column(Text)
    workspace_cleanup_status = Column(String(20), default='pending')  # pending, cleaned, failed
    workspace_cleaned_at = Column(DateTime)
    data_files_cleaned = Column(Boolean, default=False)
    
    created_at = Column(DateTime, server_default=func.now())
    queued_at = Column(DateTime)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    ended_at = Column(DateTime)  # Keep for backwards compatibility
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="jobs")
    # team = relationship("Team")  # Comment out to avoid circular import
    model = relationship("Model", back_populates="jobs")
    logs = relationship("JobLog", back_populates="job", cascade="all, delete-orphan")
    retry_of = relationship("ModelJob", remote_side=[id], foreign_keys=[retry_of_job_id])
    dependent_on = relationship("ModelJob", remote_side=[id], foreign_keys=[dependent_on_job_id])
    resource_allocations = relationship("ResourceAllocation", back_populates="job")
    job_resource_allocations = relationship("JobResourceAllocation", back_populates="job", cascade="all, delete-orphan")
    allocated_instance = relationship("ComputeInstance", foreign_keys=[allocated_instance_id])
    transformation_logs = relationship("DataTransformationLog", back_populates="job")

class JobLog(Base):
    __tablename__ = "job_logs"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("model_jobs.id"))
    timestamp = Column(DateTime, server_default=func.now())
    log_level = Column(String(20), default="INFO")
    message = Column(Text)

    job = relationship("ModelJob", back_populates="logs")

class PredictionResult(Base):
    __tablename__ = "prediction_results"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    result_file_path = Column(Text)
    
    # Enhanced lifecycle tracking
    lifecycle_status = Column(String(50), default='active')  # active, downloaded, expired, scheduled_for_deletion
    first_downloaded_at = Column(DateTime)
    download_count = Column(Integer, default=0)
    retention_policy_id = Column(get_uuid_type(), ForeignKey('data_retention_policies.id'))
    expires_at = Column(DateTime)
    expiry_notified_at = Column(DateTime)
    user_extended_until = Column(DateTime)
    scheduled_deletion_at = Column(DateTime)
    
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="predictions")

class GeneratedData(Base):
    __tablename__ = "generated_data"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    instance_name = Column(Text)
    description = Column(Text)
    rows = Column(Integer)
    columns = Column(Integer)
    file_size = Column(Integer)  # Changed to Integer for bytes
    token_cost = Column(Integer)
    file_path = Column(Text)
    data_type = Column(Text, default="generated")  # New field
    generation_config = Column(Text)  # New field to store JSON config
    
    # Enhanced lifecycle tracking
    lifecycle_status = Column(String(50), default='active')  # active, downloaded, expired, scheduled_for_deletion
    first_downloaded_at = Column(DateTime)
    download_count = Column(Integer, default=0)
    retention_policy_id = Column(get_uuid_type(), ForeignKey('data_retention_policies.id'))
    expires_at = Column(DateTime)
    expiry_notified_at = Column(DateTime)
    user_extended_until = Column(DateTime)
    scheduled_deletion_at = Column(DateTime)
    is_temporary = Column(Boolean, default=False)
    
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="generated_data")
