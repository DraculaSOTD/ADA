"""
Rule Engine Models for ADA Platform
Handles business rules, conditions, actions, and execution tracking
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import os

from models.base import Base
from core.db_types import get_uuid_type, JSONField

# Check if we're using SQLite
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"


class Rule(Base):
    __tablename__ = "rules"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(get_uuid_type(), ForeignKey("teams.id"))
    model_id = Column(Integer, ForeignKey("models.id"))  # Optional link to model
    
    # Basic info
    rule_name = Column(String(255), nullable=False)
    description = Column(Text)
    rule_type = Column(String(50), default='business')  # business, validation, automation, alert
    
    # Rule definition
    logic_json = Column(JSONField, nullable=False)  # Contains conditions and actions
    trigger_config = Column(JSONField)  # When/how to trigger
    input_schema = Column(JSONField)  # Expected input structure
    output_schema = Column(JSONField)  # Expected output structure
    
    # Execution settings
    execution_mode = Column(String(50), default='sequential')  # sequential, parallel, async
    priority = Column(Integer, default=1)  # 1-10 priority for execution order
    max_retries = Column(Integer, default=3)
    timeout_seconds = Column(Integer, default=300)
    error_handling = Column(JSONField)  # Error handling configuration
    
    # Status and versioning
    is_active = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    parent_rule_id = Column(Integer, ForeignKey("rules.id"))  # For versioning
    
    # Performance tracking
    avg_execution_time_ms = Column(Float)
    total_executions = Column(Integer, default=0)
    successful_executions = Column(Integer, default=0)
    failed_executions = Column(Integer, default=0)
    
    # Cost tracking
    token_cost = Column(Integer, default=0)
    estimated_cost_per_execution = Column(Integer, default=0)
    total_token_cost = Column(Integer, default=0)
    
    # Visibility and sharing
    visibility = Column(String(20), default='private')  # private, team, public
    is_template = Column(Boolean, default=False)
    
    # Linked model (if rule creates a model)
    linked_model_id = Column(Integer, ForeignKey("models.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_executed_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="rules")
    # team = relationship("Team")  # Comment out to avoid circular import
    model = relationship("Model", foreign_keys=[model_id])
    linked_model = relationship("Model", foreign_keys=[linked_model_id])
    parent_rule = relationship("Rule", remote_side=[id], foreign_keys=[parent_rule_id])
    executions = relationship("RuleExecution", back_populates="rule", cascade="all, delete-orphan")
    conditions = relationship("RuleCondition", back_populates="rule", cascade="all, delete-orphan")
    actions = relationship("RuleAction", back_populates="rule", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('ix_rules_user_active', 'user_id', 'is_active'),
        Index('ix_rules_team_active', 'team_id', 'is_active'),
        Index('ix_rules_visibility', 'visibility'),
    )


class RuleCondition(Base):
    __tablename__ = "rule_conditions"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    rule_id = Column(Integer, ForeignKey("rules.id", ondelete="CASCADE"), nullable=False)
    
    # Condition definition
    condition_type = Column(String(50), nullable=False)  # field_comparison, regex, threshold, custom
    field_name = Column(String(255))
    operator = Column(String(50))  # equals, contains, greater_than, less_than, regex_match, etc.
    value = Column(JSONField)  # Can be string, number, array, etc.
    
    # Logic
    logic_operator = Column(String(10), default='AND')  # AND, OR, NOT
    group_id = Column(String(50))  # For grouping conditions
    order = Column(Integer, default=0)  # Execution order
    
    # Performance
    avg_evaluation_time_ms = Column(Float)
    total_evaluations = Column(Integer, default=0)
    true_evaluations = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    rule = relationship("Rule", back_populates="conditions")


class RuleAction(Base):
    __tablename__ = "rule_actions"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    rule_id = Column(Integer, ForeignKey("rules.id", ondelete="CASCADE"), nullable=False)
    
    # Action definition
    action_type = Column(String(50), nullable=False)  # notification, update_field, api_call, trigger_job, etc.
    action_config = Column(JSONField, nullable=False)  # Action-specific configuration
    
    # Target
    target_type = Column(String(50))  # field, model, user, external_api
    target_id = Column(String(255))
    
    # Execution
    order = Column(Integer, default=0)  # Execution order
    is_async = Column(Boolean, default=False)
    timeout_seconds = Column(Integer, default=60)
    retry_on_failure = Column(Boolean, default=False)
    
    # Performance
    avg_execution_time_ms = Column(Float)
    total_executions = Column(Integer, default=0)
    successful_executions = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    rule = relationship("Rule", back_populates="actions")


class RuleExecution(Base):
    __tablename__ = "rule_executions"
    
    id = Column(Integer, primary_key=True)
    rule_id = Column(Integer, ForeignKey("rules.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Trigger information
    trigger_type = Column(String(50), nullable=False)  # manual, scheduled, event, api
    trigger_source = Column(String(255))  # What triggered the execution
    trigger_metadata = Column(JSONField)
    
    # Input/Output
    input_data = Column(JSONField)
    output_data = Column(JSONField)
    
    # Execution details
    status = Column(String(20), nullable=False)  # pending, running, completed, failed, cancelled
    conditions_passed = Column(Boolean)
    actions_executed = Column(Integer, default=0)
    
    # Performance
    execution_time_ms = Column(Integer)
    queue_time_ms = Column(Integer)
    
    # Error handling
    error_message = Column(Text)
    error_details = Column(JSONField)
    retry_count = Column(Integer, default=0)
    
    # Cost
    token_cost = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    rule = relationship("Rule", back_populates="executions")
    user = relationship("User")
    execution_logs = relationship("RuleExecutionLog", back_populates="execution", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('ix_rule_executions_rule_status', 'rule_id', 'status'),
        Index('ix_rule_executions_user', 'user_id'),
        Index('ix_rule_executions_created', 'created_at'),
    )


class RuleExecutionLog(Base):
    __tablename__ = "rule_execution_logs"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    execution_id = Column(Integer, ForeignKey("rule_executions.id", ondelete="CASCADE"), nullable=False)
    
    # Log details
    timestamp = Column(DateTime, default=datetime.utcnow)
    log_level = Column(String(20), default='INFO')  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    component = Column(String(50))  # condition_eval, action_exec, error_handler
    message = Column(Text)
    details = Column(JSONField)
    
    # Performance
    duration_ms = Column(Integer)
    
    # Relationships
    execution = relationship("RuleExecution", back_populates="execution_logs")


class RuleTemplate(Base):
    __tablename__ = "rule_templates"
    
    id = Column(get_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()) if USE_SQLITE else uuid.uuid4)
    
    # Template info
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    category = Column(String(50), nullable=False)  # data_validation, business_logic, automation, etc.
    
    # Template definition
    template_config = Column(JSONField, nullable=False)  # Complete rule configuration
    parameters = Column(JSONField)  # Parameters that can be customized
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    rating = Column(Float)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    is_official = Column(Boolean, default=False)  # Official ADA templates
    tags = Column(JSONField, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User")