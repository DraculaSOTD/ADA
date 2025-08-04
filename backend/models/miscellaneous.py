from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from models.base import Base

class Rule(Base):
    __tablename__ = "rules"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    rule_name = Column(Text)
    logic_json = Column(JSONB)
    token_cost = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="rules")

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
    read = Column(Boolean, default=False)
    timestamp = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="notifications")
