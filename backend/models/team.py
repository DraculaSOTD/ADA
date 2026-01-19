"""
Team Management Models for ADA Platform
Handles teams, team membership, and team-based resource sharing
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, UniqueConstraint, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import os

from models.base import Base
from core.db_types import get_uuid_type, JSONField

# Check if we're using SQLite
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"


class Team(Base):
    __tablename__ = "teams"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    visibility = Column(String(20), default='private')  # private, public
    max_members = Column(Integer, default=10)
    storage_limit_gb = Column(Integer, default=100)
    settings = Column(JSONField, default=lambda: {})
    is_active = Column(Boolean, default=True)
    
    # Enhanced usage tracking
    current_cpu_usage = Column(Float, default=0.0)
    current_gpu_usage = Column(Float, default=0.0)
    current_memory_usage = Column(Float, default=0.0)
    current_storage_usage = Column(Float, default=0.0)
    daily_token_usage = Column(Integer, default=0)
    monthly_token_usage = Column(Integer, default=0)
    usage_last_updated = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    resources = relationship("TeamResource", back_populates="team", cascade="all, delete-orphan")
    resource_quota = relationship("TeamResourceQuota", back_populates="team", uselist=False)


class TeamMember(Base):
    __tablename__ = "team_members"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    team_id = Column(get_uuid_type(), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), default='member')  # member, admin, owner
    permissions = Column(JSONField, default=lambda: [])  # Additional permissions
    invited_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default='active')  # active, inactive, removed
    joined_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])
    
    # Constraints
    __table_args__ = (UniqueConstraint('team_id', 'user_id', name='_team_user_uc'),)


class TeamResource(Base):
    __tablename__ = "team_resources"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    team_id = Column(get_uuid_type(), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    resource_type = Column(String(50), nullable=False)  # model, data, job, rule
    resource_id = Column(String(255), nullable=False)
    shared_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    permissions = Column(JSONField, default=lambda: ["read"])  # read, write, delete, share
    resource_metadata = Column(JSONField, default=lambda: {})
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="resources")
    sharer = relationship("User", foreign_keys=[shared_by])
    
    # Constraints
    __table_args__ = (UniqueConstraint('team_id', 'resource_type', 'resource_id', name='_team_resource_uc'),)


class TeamInvitation(Base):
    __tablename__ = "team_invitations"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    team_id = Column(get_uuid_type(), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    role = Column(String(50), default='member')
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    invitation_token = Column(String(255), unique=True, nullable=False)
    status = Column(String(20), default='pending')  # pending, accepted, declined, expired
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team = relationship("Team")
    inviter = relationship("User", foreign_keys=[invited_by])