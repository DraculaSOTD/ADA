from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, func, Text, UniqueConstraint, Float
from sqlalchemy.orm import relationship
from models.base import Base
from core.db_types import JSONField

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    token_balance = Column(Integer, default=0)
    subscription_plan = Column(Text, default='free')
    two_factor_enabled = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)
    
    # Enhanced security for multi-tenancy
    account_status = Column(String(20), default='active')  # active, suspended, locked, pending
    failed_login_attempts = Column(Integer, default=0)
    account_locked_until = Column(DateTime)
    password_changed_at = Column(DateTime)
    requires_password_change = Column(Boolean, default=False)
    
    # Data governance
    data_retention_policy = Column(JSONField, default=lambda: {"auto_delete_days": 365})
    privacy_settings = Column(JSONField, default=lambda: {"profile_visible": False, "activity_tracking": True})
    consent_given = Column(JSONField, default=lambda: {"data_processing": False, "analytics": False})
    
    # Usage tracking
    last_activity_at = Column(DateTime)
    total_compute_hours = Column(Integer, default=0)
    total_models_created = Column(Integer, default=0)
    
    # Enhanced usage and resource tracking
    current_active_jobs = Column(Integer, default=0)
    daily_token_usage = Column(Integer, default=0)
    monthly_token_usage = Column(Integer, default=0)
    total_data_uploaded_gb = Column(Float, default=0.0)
    total_predictions_made = Column(Integer, default=0)
    preferred_compute_region = Column(String(50), default='local')
    
    created_at = Column(DateTime, server_default=func.now())

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    models = relationship("Model", back_populates="user")
    uploads = relationship("Upload", back_populates="user")
    jobs = relationship("ModelJob", back_populates="user")
    predictions = relationship("PredictionResult", back_populates="user")
    generated_data = relationship("GeneratedData", back_populates="user")
    rules = relationship("Rule", back_populates="user")
    votes = relationship("ModelVote", back_populates="user")
    token_transactions = relationship("TokenTransaction", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    cleaning_jobs = relationship("CleaningJob", back_populates="user")
    retention_preferences = relationship("UserRetentionPreference", back_populates="user", uselist=False)
    
    # Team relationships
    team_memberships = relationship("TeamMember", foreign_keys="TeamMember.user_id", back_populates="user")
    created_teams = relationship("Team", foreign_keys="Team.owner_id", back_populates="owner")
    sent_invitations = relationship("TeamInvitation", foreign_keys="TeamInvitation.invited_by", back_populates="inviter")
    
    # Security and audit relationships  
    access_logs = relationship("DataAccessLog", foreign_keys="DataAccessLog.user_id", back_populates="user")
    security_events = relationship("SecurityEvent", foreign_keys="SecurityEvent.user_id", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name = Column(Text)
    phone_number = Column(Text)
    company = Column(Text)
    position = Column(Text)
    avatar_url = Column(Text)

    user = relationship("User", back_populates="profile")

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_type = Column(Text, nullable=False)
    hashed_key = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    last_used_at = Column(DateTime)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="api_keys")
    __table_args__ = (UniqueConstraint('user_id', 'key_type', name='_user_key_type_uc'),)

class UserSettings(Base):
    __tablename__ = "user_settings"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    dark_mode = Column(Boolean, default=False)
    auto_save = Column(Boolean, default=True)
    language = Column(String(10), default='en')
    timezone = Column(String(50), default='UTC')
    email_notifications = Column(Boolean, default=True)
    model_completion_alerts = Column(Boolean, default=True)
    api_usage_warnings = Column(Boolean, default=True)
    weekly_reports = Column(Boolean, default=False)
    data_analytics = Column(Boolean, default=True)
    session_timeout_minutes = Column(Integer, default=30)
    data_retention_days = Column(Integer, default=60)
    api_rate_limiting_enabled = Column(Boolean, default=True)
    debug_mode = Column(Boolean, default=False)
    cache_duration_minutes = Column(Integer, default=5)

    user = relationship("User", back_populates="settings")
