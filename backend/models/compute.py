"""
Compute Resource Management Models for ADA Platform
Handles compute instances, resource allocations, and job isolation
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, DECIMAL
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import os

from models.base import Base
from core.db_types import get_uuid_type, JSONField

# Check if we're using SQLite
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"


class ComputeInstance(Base):
    __tablename__ = "compute_instances"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    name = Column(String(255), nullable=False)
    instance_type = Column(String(50), nullable=False)  # gpu-small, gpu-large, cpu-optimized
    cpu_cores = Column(Integer, nullable=False)
    memory_gb = Column(Integer, nullable=False)
    gpu_count = Column(Integer, default=0)
    gpu_type = Column(String(50))  # V100, A100, RTX4090, etc
    storage_gb = Column(Integer, default=100)
    network_bandwidth_gbps = Column(Float, default=1.0)
    
    # Pricing
    hourly_cost_tokens = Column(Integer, nullable=False)
    setup_cost_tokens = Column(Integer, default=0)
    
    # Status and availability
    status = Column(String(20), default='available')  # available, busy, maintenance, offline
    region = Column(String(50), default='us-east-1')
    zone = Column(String(50))
    provider = Column(String(50), default='internal')  # internal, aws, gcp, azure
    
    # Configuration
    docker_image = Column(String(255))
    environment_config = Column(JSONField, default=lambda: {})
    resource_limits = Column(JSONField, default=lambda: {})
    
    # Monitoring
    last_heartbeat = Column(DateTime)
    health_status = Column(String(20), default='healthy')  # healthy, degraded, unhealthy
    metrics = Column(JSONField, default=lambda: {})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    allocations = relationship("ResourceAllocation", back_populates="instance")


class ResourceAllocation(Base):
    __tablename__ = "resource_allocations"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    job_id = Column(Integer, ForeignKey("model_jobs.id", ondelete="CASCADE"), nullable=False)
    instance_id = Column(get_uuid_type(), ForeignKey("compute_instances.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(get_uuid_type(), ForeignKey("teams.id"))
    
    # Allocation details
    container_id = Column(String(255))  # Docker container ID
    process_id = Column(String(255))    # Process ID for isolation
    allocated_cpu = Column(Integer)     # Number of CPU cores allocated
    allocated_memory_gb = Column(Integer)
    allocated_gpu_count = Column(Integer, default=0)
    allocated_storage_gb = Column(Integer)
    
    # Timing
    allocated_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    released_at = Column(DateTime)
    
    # Cost tracking
    estimated_cost_tokens = Column(Integer)
    actual_cost_tokens = Column(Integer)
    cost_breakdown = Column(JSONField, default=lambda: {})
    
    # Resource usage monitoring
    peak_cpu_usage = Column(Float)      # 0.0 to 1.0
    peak_memory_usage = Column(Float)   # 0.0 to 1.0
    peak_gpu_usage = Column(Float)      # 0.0 to 1.0
    total_io_bytes = Column(Integer, default=0)
    resource_usage_history = Column(JSONField, default=lambda: [])
    
    # Status
    status = Column(String(20), default='allocated')  # allocated, running, completed, failed, cancelled
    failure_reason = Column(Text)
    
    # Relationships
    job = relationship("ModelJob")
    instance = relationship("ComputeInstance", back_populates="allocations")
    user = relationship("User")
    # team = relationship("Team")  # Comment out to avoid circular import


class ResourceQuota(Base):
    __tablename__ = "resource_quotas"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    entity_type = Column(String(20), nullable=False)  # user, team
    entity_id = Column(String(255), nullable=False)
    
    # Limits
    max_concurrent_jobs = Column(Integer, default=5)
    max_gpu_hours_daily = Column(Integer, default=24)
    max_cpu_hours_daily = Column(Integer, default=100)
    max_storage_gb = Column(Integer, default=100)
    max_memory_gb_per_job = Column(Integer, default=32)
    max_job_duration_hours = Column(Integer, default=24)
    
    # Priority and scheduling
    priority_level = Column(Integer, default=1)  # 1=low, 5=high
    can_preempt = Column(Boolean, default=False)
    can_use_spot_instances = Column(Boolean, default=True)
    
    # Cost limits
    daily_token_limit = Column(Integer)
    monthly_token_limit = Column(Integer)
    
    # Time restrictions
    allowed_time_windows = Column(JSONField, default=lambda: [])  # Time windows when jobs can run
    timezone = Column(String(50), default='UTC')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ResourceUsageLog(Base):
    __tablename__ = "resource_usage_log"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    allocation_id = Column(get_uuid_type(), ForeignKey("resource_allocations.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    instance_id = Column(get_uuid_type(), ForeignKey("compute_instances.id"))
    
    # Usage metrics
    timestamp = Column(DateTime, default=datetime.utcnow)
    cpu_usage_percent = Column(Float)
    memory_usage_percent = Column(Float)
    gpu_usage_percent = Column(Float)
    disk_io_mbps = Column(Float)
    network_io_mbps = Column(Float)
    
    # Cost calculation
    tokens_consumed_this_period = Column(Integer, default=0)
    billing_period_seconds = Column(Integer, default=60)  # Usually 1 minute
    
    # Custom metrics
    custom_metrics = Column(JSONField, default=lambda: {})
    
    # Relationships
    allocation = relationship("ResourceAllocation")
    user = relationship("User")
    instance = relationship("ComputeInstance")


class JobResourceAllocation(Base):
    __tablename__ = "job_resource_allocations"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    job_id = Column(Integer, ForeignKey("model_jobs.id", ondelete="CASCADE"), nullable=False)
    allocation_id = Column(get_uuid_type(), ForeignKey("resource_allocations.id"))
    
    # Resource details
    resource_type = Column(String(50), nullable=False)  # cpu, gpu, memory, storage
    quantity_allocated = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)  # cores, GB, TB, etc.
    
    # Priority and scheduling
    priority = Column(Integer, default=1)
    preemptible = Column(Boolean, default=False)
    
    # Cost tracking
    cost_per_unit = Column(Integer, default=0)
    total_cost = Column(Integer, default=0)
    
    # Status
    status = Column(String(20), default='allocated')  # allocated, active, released
    
    created_at = Column(DateTime, default=datetime.utcnow)
    released_at = Column(DateTime)
    
    # Relationships
    job = relationship("ModelJob", back_populates="job_resource_allocations")
    allocation = relationship("ResourceAllocation")


class TeamResourceQuota(Base):
    __tablename__ = "team_resource_quotas"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    team_id = Column(get_uuid_type(), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Resource limits
    max_concurrent_jobs = Column(Integer, default=10)
    max_gpu_hours_monthly = Column(Integer, default=100)
    max_cpu_hours_monthly = Column(Integer, default=1000)
    max_storage_gb = Column(Integer, default=500)
    max_memory_gb_per_job = Column(Integer, default=32)
    max_job_duration_hours = Column(Integer, default=24)
    
    # Instance limits
    max_gpu_instances = Column(Integer, default=2)
    max_cpu_instances = Column(Integer, default=10)
    
    # Cost limits
    daily_token_limit = Column(Integer, default=5000)
    monthly_token_limit = Column(Integer, default=50000)
    
    # Current usage (updated periodically)
    current_jobs_running = Column(Integer, default=0)
    current_gpu_hours_used = Column(Float, default=0.0)
    current_cpu_hours_used = Column(Float, default=0.0)
    current_storage_gb_used = Column(Float, default=0.0)
    current_tokens_used = Column(Integer, default=0)
    usage_last_updated = Column(DateTime, default=datetime.utcnow)
    
    # Priority
    priority_level = Column(Integer, default=1)  # 1=low, 5=high
    can_use_spot_instances = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="resource_quota")


class ResourcePool(Base):
    __tablename__ = "resource_pools"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Pool configuration
    pool_type = Column(String(50), nullable=False)  # shared, dedicated, spot
    instance_types = Column(JSONField, default=lambda: [])  # Allowed instance types
    max_instances = Column(Integer, default=10)
    auto_scaling = Column(Boolean, default=True)
    
    # Access control
    allowed_users = Column(JSONField, default=lambda: [])
    allowed_teams = Column(JSONField, default=lambda: [])
    minimum_role = Column(String(50), default='user')  # user, premium, enterprise
    
    # Scheduling
    priority_queue = Column(Boolean, default=False)
    preemption_policy = Column(String(50), default='none')  # none, priority, time_limit
    
    # Cost and billing
    cost_multiplier = Column(DECIMAL(3, 2), default=1.0)  # Cost adjustment factor
    billing_model = Column(String(20), default='per_hour')  # per_hour, per_minute, per_job
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)