"""
Data Cleaning Models
Database models for tracking data cleaning operations and history
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from .base import Base


class CleaningTier(enum.Enum):
    BASIC = "basic"
    ADVANCED = "advanced"
    AI_POWERED = "ai-powered"


class CleaningStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CleaningJob(Base):
    """Model for tracking data cleaning jobs"""
    __tablename__ = "cleaning_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # File information
    filename = Column(String(255), nullable=False)
    original_file_path = Column(String(500))
    cleaned_file_path = Column(String(500))
    file_size = Column(Integer)  # in bytes
    
    # Job configuration
    tier = Column(Enum(CleaningTier), nullable=False)
    template = Column(String(100))  # Industry template used
    cleaning_config = Column(JSON)  # Store detailed cleaning configuration
    
    # Data statistics
    total_rows = Column(Integer)
    total_columns = Column(Integer)
    rows_cleaned = Column(Integer)
    rows_removed = Column(Integer)
    
    # Quality metrics
    quality_score_before = Column(Float)
    quality_score_after = Column(Float)
    duplicates_removed = Column(Integer)
    missing_values_handled = Column(Integer)
    outliers_detected = Column(Integer)
    
    # Token usage
    token_cost = Column(Integer, default=0)
    
    # Status and timing
    status = Column(Enum(CleaningStatus), default=CleaningStatus.PENDING)
    error_message = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="cleaning_jobs")
    profiles = relationship("DataProfile", back_populates="cleaning_job", cascade="all, delete-orphan")
    report = relationship("CleaningReport", back_populates="cleaning_job", uselist=False, cascade="all, delete-orphan")
    transformation_logs = relationship("DataTransformationLog", back_populates="cleaning_job", cascade="all, delete-orphan")


class DataProfile(Base):
    """Model for storing data profiling results"""
    __tablename__ = "data_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    cleaning_job_id = Column(Integer, ForeignKey("cleaning_jobs.id"), nullable=False)
    
    # Column information
    column_name = Column(String(255), nullable=False)
    data_type = Column(String(50))
    
    # Statistics
    null_count = Column(Integer)
    null_percentage = Column(Float)
    unique_count = Column(Integer)
    unique_percentage = Column(Float)
    
    # Distribution statistics (for numeric columns)
    min_value = Column(Float)
    max_value = Column(Float)
    mean_value = Column(Float)
    median_value = Column(Float)
    std_deviation = Column(Float)
    
    # Pattern detection
    detected_patterns = Column(JSON)  # Store pattern information
    quality_issues = Column(JSON)  # Store detected quality issues
    
    # Categorical statistics
    top_values = Column(JSON)  # Top N values with frequencies
    
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    cleaning_job = relationship("CleaningJob", back_populates="profiles")


class CleaningReport(Base):
    """Model for storing detailed cleaning reports"""
    __tablename__ = "cleaning_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    cleaning_job_id = Column(Integer, ForeignKey("cleaning_jobs.id"), nullable=False)
    
    # Report sections
    summary = Column(JSON)  # Overall summary statistics
    operations_performed = Column(JSON)  # List of cleaning operations
    quality_improvements = Column(JSON)  # Before/after quality metrics
    
    # Detailed metrics
    column_transformations = Column(JSON)  # Per-column transformations
    data_issues_found = Column(JSON)  # List of detected issues
    recommendations = Column(JSON)  # Suggested further actions
    
    # Compliance and privacy
    compliance_checks = Column(JSON)  # GDPR, HIPAA, PCI compliance results
    privacy_metrics = Column(JSON)  # K-anonymity, l-diversity metrics
    
    # AI operations (if applicable)
    ai_corrections = Column(JSON)  # GPT-powered corrections made
    ml_model_results = Column(JSON)  # Industry ML model results
    
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    cleaning_job = relationship("CleaningJob", back_populates="report")


class CleaningTemplate(Base):
    """Model for storing reusable cleaning templates"""
    __tablename__ = "cleaning_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    industry = Column(String(100))
    
    # Template configuration
    tier = Column(Enum(CleaningTier), nullable=False)
    cleaning_steps = Column(JSON)  # Ordered list of cleaning operations
    validation_rules = Column(JSON)  # Data validation rules
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=False)  # Whether template is shared
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    user = relationship("User")


class DataTransformationLog(Base):
    """Model for logging data transformation operations"""
    __tablename__ = "data_transformation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Source tracking
    cleaning_job_id = Column(Integer, ForeignKey("cleaning_jobs.id"))
    job_id = Column(Integer, ForeignKey("model_jobs.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Transformation details
    transformation_type = Column(String(50), nullable=False)
    transformation_name = Column(String(100))
    
    # Target data
    target_column = Column(String(255))
    target_rows = Column(JSON)
    
    # Before/After
    before_snapshot = Column(JSON)
    after_snapshot = Column(JSON)
    
    # Statistics
    rows_affected = Column(Integer)
    values_changed = Column(Integer)
    null_values_before = Column(Integer)
    null_values_after = Column(Integer)
    
    # Parameters used
    parameters = Column(JSON)
    
    # Validation
    validation_passed = Column(Boolean, default=True)
    validation_errors = Column(JSON, default=list)
    
    # Performance
    execution_time_ms = Column(Integer)
    
    # Reversibility
    is_reversible = Column(Boolean, default=False)
    reversal_config = Column(JSON)
    
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    cleaning_job = relationship("CleaningJob", back_populates="transformation_logs")
    job = relationship("ModelJob", back_populates="transformation_logs")
    user = relationship("User")


class DataQualityMetric(Base):
    """Model for tracking data quality metrics"""
    __tablename__ = "data_quality_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Resource being measured
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(255), nullable=False)
    
    # Measurement context
    measurement_type = Column(String(50), nullable=False)
    measurement_trigger = Column(String(50))
    
    # Quality dimensions
    completeness_score = Column(Float)
    accuracy_score = Column(Float)
    consistency_score = Column(Float)
    validity_score = Column(Float)
    uniqueness_score = Column(Float)
    timeliness_score = Column(Float)
    
    # Overall score
    overall_score = Column(Float, nullable=False)
    score_calculation = Column(JSON)
    
    # Issues found
    issues = Column(JSON, default=list)
    critical_issues = Column(Integer, default=0)
    warnings = Column(Integer, default=0)
    
    # Recommendations
    recommendations = Column(JSON, default=list)
    auto_fix_available = Column(Boolean, default=False)
    
    # Column-level metrics
    column_metrics = Column(JSON, default=dict)
    
    measured_at = Column(DateTime, server_default=func.now())
    measured_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    measurer = relationship("User")


class DataValidationRule(Base):
    """Model for data validation rules"""
    __tablename__ = "data_validation_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Rule ownership
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Rule definition
    rule_name = Column(String(255), nullable=False)
    description = Column(Text)
    rule_type = Column(String(50), nullable=False)
    
    # Target
    target_column = Column(String(255))
    target_data_type = Column(String(50))
    
    # Validation logic
    validation_logic = Column(JSON, nullable=False)
    error_message = Column(String(500))
    severity = Column(String(20), default='warning')
    
    # Auto-fix configuration
    auto_fix_enabled = Column(Boolean, default=False)
    auto_fix_strategy = Column(JSON)
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    violations_found = Column(Integer, default=0)
    violations_fixed = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")