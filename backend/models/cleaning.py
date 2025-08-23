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