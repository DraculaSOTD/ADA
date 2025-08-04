from sqlalchemy.orm import Session
from models.job import GeneratedData
from models import schemas

def create_generated_data(db: Session, data: schemas.GeneratedDataCreate):
    db_data = GeneratedData(**data.dict())
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    return db_data
