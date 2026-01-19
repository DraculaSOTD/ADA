from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text, Boolean
from sqlalchemy.orm import relationship
from models.base import Base
from core.db_types import JSONField

# Rule model has been moved to rule.py to avoid conflicts
# This file now only contains legacy/miscellaneous models

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

# Notification models have been moved to notification.py to avoid conflicts

# RuleExecution model has been moved to rule.py to avoid conflicts
