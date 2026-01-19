from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text, BigInteger, String, Boolean
from sqlalchemy.orm import relationship
from models.base import Base
from core.db_types import JSONField, get_uuid_type

class Upload(Base):
    __tablename__ = "uploads"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    team_id = Column(get_uuid_type(), ForeignKey("teams.id"))  # Team ownership
    model_id = Column(Integer, ForeignKey("models.id"))
    filename = Column(Text)
    original_filename = Column(Text)  # Store original filename
    path = Column(Text)
    file_size = Column(BigInteger, default=0)
    file_type = Column(String(10))
    
    # Enhanced metadata
    content_type = Column(String(100))
    encoding = Column(String(50))
    checksum = Column(String(255))  # For integrity verification
    
    # Data quality and validation
    validation_status = Column(String(20), default='pending')  # pending, valid, invalid, processing
    quality_score = Column(Integer)  # 0-100
    validation_results = Column(JSONField, default=lambda: {})
    
    # Security and access
    visibility = Column(String(20), default='private')  # private, team, public
    is_sensitive = Column(Boolean, default=False)
    data_classification = Column(String(50))  # public, internal, confidential, restricted
    access_permissions = Column(JSONField, default=lambda: {"read": ["owner"], "download": ["owner"]})
    
    # Processing tracking
    processed = Column(Boolean, default=False)
    processing_errors = Column(JSONField, default=lambda: [])
    last_accessed = Column(DateTime)
    access_count = Column(Integer, default=0)
    
    # Enhanced data lineage and tracking
    data_lineage_id = Column(String(255))  # Link to transformation log
    source_transformation_id = Column(String(255))  # If generated from another dataset
    preprocessing_applied = Column(JSONField, default=lambda: [])
    usage_count = Column(Integer, default=0)  # How many times used in training
    last_used_at = Column(DateTime)
    retention_expires_at = Column(DateTime)  # Keep for backward compatibility
    
    # Enhanced lifecycle tracking
    lifecycle_status = Column(String(50), default='active')  # active, downloaded, expired, scheduled_for_deletion
    first_downloaded_at = Column(DateTime)
    download_count = Column(Integer, default=0)
    retention_policy_id = Column(get_uuid_type(), ForeignKey('data_retention_policies.id'))
    expires_at = Column(DateTime)  # Calculated based on retention policy
    expiry_notified_at = Column(DateTime)
    user_extended_until = Column(DateTime)
    scheduled_deletion_at = Column(DateTime)
    temporary_workspace_path = Column(Text)  # Path to temporary training workspace
    is_temporary = Column(Boolean, default=False)  # True for temporary training copies
    
    uploaded_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="uploads")
    # team = relationship("Team")  # Comment out to avoid circular import
    mappings = relationship("DataMapping", back_populates="upload", cascade="all, delete-orphan")

class DataMapping(Base):
    __tablename__ = "data_mappings"
    id = Column(Integer, primary_key=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    column_name = Column(Text)
    mapped_field = Column(Text)

    upload = relationship("Upload", back_populates="mappings")
