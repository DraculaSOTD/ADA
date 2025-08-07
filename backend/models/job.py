from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text
from sqlalchemy.orm import relationship
from models.base import Base

class ModelJob(Base):
    __tablename__ = "model_jobs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    job_type = Column(Text)
    progress = Column(Integer, default=0)
    status = Column(Text)
    token_cost = Column(Integer)
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime)

    user = relationship("User", back_populates="jobs")
    model = relationship("Model", back_populates="jobs")

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
