from sqlalchemy.orm import Session
from models.job import ModelJob
from models import schemas

def create_job(db: Session, job: schemas.ModelJobCreate):
    db_job = ModelJob(**job.dict())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

def get_job(db: Session, job_id: int):
    return db.query(ModelJob).filter(ModelJob.id == job_id).first()
