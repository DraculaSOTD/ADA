from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text, BigInteger, String
from sqlalchemy.orm import relationship
from models.base import Base

class Upload(Base):
    __tablename__ = "uploads"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    filename = Column(Text)
    path = Column(Text)
    file_size = Column(BigInteger, default=0)
    file_type = Column(String(10))
    uploaded_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="uploads")
    mappings = relationship("DataMapping", back_populates="upload", cascade="all, delete-orphan")

class DataMapping(Base):
    __tablename__ = "data_mappings"
    id = Column(Integer, primary_key=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    column_name = Column(Text)
    mapped_field = Column(Text)

    upload = relationship("Upload", back_populates="mappings")
