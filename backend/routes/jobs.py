from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import schemas
from services import job_service
from core.database import get_db

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/", response_model=schemas.ModelJob)
def create_job(job: schemas.ModelJobCreate, db: Session = Depends(get_db)):
    return job_service.create_job(db=db, job=job)

@router.get("/{job_id}", response_model=schemas.ModelJob)
def get_job(job_id: int, db: Session = Depends(get_db)):
    return job_service.get_job(db=db, job_id=job_id)
