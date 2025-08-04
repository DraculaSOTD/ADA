from sqlalchemy.orm import Session
from models.model import Model
from models import schemas

def create_model(db: Session, model: schemas.ModelCreateRequest, user_id: int):
    db_model = Model(**model.dict(), user_id=user_id)
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

def get_models_by_user(db: Session, user_id: int, status: str = None):
    query = db.query(Model).filter(Model.user_id == user_id)
    if status:
        query = query.filter(Model.status == status)
    return query.all()

def get_community_models(db: Session):
    return db.query(Model).filter(Model.visibility == 'community').all()

def get_pretrained_models(db: Session):
    return db.query(Model).filter(Model.visibility == 'pretrained').all()

def add_model_to_user_library(db: Session, user_id: int, model_id: int):
    model_to_add = db.query(Model).filter(Model.id == model_id).first()
    if not model_to_add:
        return None
    
    new_model = Model(
        user_id=user_id,
        name=model_to_add.name,
        description=model_to_add.description,
        type=model_to_add.type,
        visibility='private',
        status='active',
        performance=model_to_add.performance,
        retrain_from=model_to_add.id
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model
