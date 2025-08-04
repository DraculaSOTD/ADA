from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import schemas
from services import generator_service
from core.database import get_db

router = APIRouter(prefix="/generator", tags=["Generator"])

@router.post("/", response_model=schemas.GeneratedData)
def create_generated_data(data: schemas.GeneratedDataCreate, db: Session = Depends(get_db)):
    return generator_service.create_generated_data(db=db, data=data)
