from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text
from sqlalchemy.orm import relationship
from models.base import Base
from core.db_types import JSONField

class Model(Base):
    __tablename__ = "models"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(Text)
    description = Column(Text)
    type = Column(Text)
    visibility = Column(Text, default='private')
    status = Column(Text)
    performance = Column(JSONField)
    retrain_from = Column(Integer, ForeignKey("models.id"))
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="models")
    settings = relationship("ModelSettings", back_populates="model", uselist=False, cascade="all, delete-orphan")
    jobs = relationship("ModelJob", back_populates="model")

class ModelSettings(Base):
    __tablename__ = "model_settings"
    id = Column(Integer, primary_key=True)
    model_id = Column(Integer, ForeignKey("models.id"))
    hidden_layers = Column(Text)
    batch_size = Column(Integer)
    epochs = Column(Integer)
    function_type = Column(Text)
    train_fields = Column(JSONField)
    predict_fields = Column(JSONField)

    model = relationship("Model", back_populates="settings")
