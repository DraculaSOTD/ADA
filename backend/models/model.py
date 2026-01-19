from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text, Boolean, Float, String
from sqlalchemy.orm import relationship
from models.base import Base
from core.db_types import JSONField, get_uuid_type

class Model(Base):
    __tablename__ = "models"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    team_id = Column(get_uuid_type(), ForeignKey("teams.id"))  # Team ownership
    name = Column(Text)
    description = Column(Text)
    type = Column(Text)
    visibility = Column(Text, default='private')  # private, team, public
    status = Column(Text)
    performance = Column(JSONField)
    retrain_from = Column(Integer, ForeignKey("models.id"))
    
    # Enhanced sharing and security
    share_settings = Column(JSONField, default=lambda: {"public": False, "team": True, "link_sharing": False})
    access_permissions = Column(JSONField, default=lambda: {"read": ["owner"], "write": ["owner"], "admin": ["owner"]})
    is_template = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    # Data lineage
    training_data_id = Column(Text)  # Reference to training dataset
    training_data_checksum = Column(Text)  # For data integrity
    
    # Enhanced model tracking and performance
    training_data_lineage = Column(JSONField, default=lambda: [])
    model_artifacts_path = Column(Text)
    model_size_mb = Column(Float)
    inference_cost_tokens = Column(Integer, default=0)
    total_predictions_made = Column(Integer, default=0)
    model_validation_metrics = Column(JSONField, default=lambda: {})
    deployment_status = Column(String(20), default='inactive')
    last_used_for_prediction = Column(DateTime)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="models")
    # team = relationship("Team")  # Comment out to avoid circular import
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
