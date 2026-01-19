"""
Migration Tracking Models for ADA Platform
Tracks database migrations and schema versions
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from datetime import datetime

from models.base import Base


class MigrationHistory(Base):
    __tablename__ = "migration_history"
    
    id = Column(Integer, primary_key=True)
    migration_name = Column(String(255), nullable=False, unique=True)
    version = Column(String(50))
    description = Column(Text)
    executed_at = Column(DateTime, default=datetime.utcnow)
    executed_by = Column(String(255))
    success = Column(Boolean, default=True)
    rollback_at = Column(DateTime)
    error_message = Column(Text)
    execution_time_seconds = Column(Integer)
    
    # Migration metadata
    sql_statements_count = Column(Integer)
    tables_created = Column(Integer, default=0)
    tables_modified = Column(Integer, default=0)
    tables_dropped = Column(Integer, default=0)
    indexes_created = Column(Integer, default=0)
    constraints_added = Column(Integer, default=0)