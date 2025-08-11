from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text, String
from sqlalchemy.orm import relationship
from models.base import Base
from core.db_types import JSONField

class ModelJob(Base):
    __tablename__ = "model_jobs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    job_type = Column(Text)
    progress = Column(Integer, default=0)
    status = Column(Text)
    parameters = Column(JSONField)
    token_cost = Column(Integer)
    error_message = Column(Text)
    duration_seconds = Column(Integer)
    retry_of_job_id = Column(Integer, ForeignKey("model_jobs.id"))
    created_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    ended_at = Column(DateTime)  # Keep for backwards compatibility

    user = relationship("User", back_populates="jobs")
    model = relationship("Model", back_populates="jobs")
    logs = relationship("JobLog", back_populates="job", cascade="all, delete-orphan")
    retry_of = relationship("ModelJob", remote_side=[id])

class JobLog(Base):
    __tablename__ = "job_logs"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("model_jobs.id"))
    timestamp = Column(DateTime, server_default=func.now())
    log_level = Column(String(20), default="INFO")
    message = Column(Text)

    job = relationship("ModelJob", back_populates="logs")

class PredictionResult(Base):
    __tablename__ = "prediction_results"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    result_file_path = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="predictions")

class GeneratedData(Base):
    __tablename__ = "generated_data"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    instance_name = Column(Text)
    description = Column(Text)
    rows = Column(Integer)
    columns = Column(Integer)
    file_size = Column(Integer)  # Changed to Integer for bytes
    token_cost = Column(Integer)
    file_path = Column(Text)
    data_type = Column(Text, default="generated")  # New field
    generation_config = Column(Text)  # New field to store JSON config
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="generated_data")
