from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text, Boolean
from sqlalchemy.orm import relationship
from models.base import Base
from core.db_types import JSONField

class Rule(Base):
    __tablename__ = "rules"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    rule_name = Column(Text)
    description = Column(Text)
    logic_json = Column(JSONField)
    token_cost = Column(Integer)
    trigger_config = Column(JSONField, default={"type": "manual"})
    input_schema = Column(JSONField, default={})
    output_schema = Column(JSONField, default={})
    is_active = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    parent_rule_id = Column(Integer, ForeignKey("rules.id"))
    execution_mode = Column(Text, default="sequential")
    error_handling = Column(JSONField, default={"strategy": "stop", "maxRetries": 3})
    linked_model_id = Column(Integer, ForeignKey("models.id"))
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="rules")
    linked_model = relationship("Model", foreign_keys=[linked_model_id])
    parent_rule = relationship("Rule", remote_side=[id])
    executions = relationship("RuleExecution", back_populates="rule")

class ModelVote(Base):
    __tablename__ = "model_votes"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    vote_type = Column(Text)

    user = relationship("User", back_populates="votes")

class TokenTransaction(Base):
    __tablename__ = "token_transactions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer)
    change = Column(Integer)
    reason = Column(Text)
    balance_after = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="token_transactions")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(Text)
    message = Column(Text)
    type = Column(Text, default="info")
    data = Column(JSONField)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    timestamp = Column(DateTime, server_default=func.now())  # Keep for backwards compatibility

    user = relationship("User", back_populates="notifications")

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    email_notifications = Column(Boolean, default=True)
    model_completion_alerts = Column(Boolean, default=True)
    api_usage_warnings = Column(Boolean, default=True)
    weekly_reports = Column(Boolean, default=False)
    marketing_emails = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="notification_preferences")

class RuleExecution(Base):
    __tablename__ = "rule_executions"
    id = Column(Integer, primary_key=True)
    rule_id = Column(Integer, ForeignKey("rules.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    trigger_type = Column(Text)
    input_data = Column(JSONField)
    output_data = Column(JSONField)
    status = Column(Text)
    error_message = Column(Text)
    execution_time_ms = Column(Integer)
    token_cost = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)

    rule = relationship("Rule", back_populates="executions")
    user = relationship("User")
