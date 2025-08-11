from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import schemas
from services import model_service, security
from core.database import get_db

router = APIRouter(prefix="/api/models", tags=["Models"])

@router.post("/", response_model=schemas.Model)
def create_model(model: schemas.ModelCreateRequest, db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    return model_service.create_model(db=db, model=model, user_id=current_user.id)

@router.get("/me", response_model=list[schemas.Model])
def get_my_models(db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    return model_service.get_models_by_user(db=db, user_id=current_user.id)

@router.get("/community", response_model=list[schemas.Model])
def get_community_models(db: Session = Depends(get_db)):
    return model_service.get_community_models(db=db)

@router.get("/pretrained", response_model=list[schemas.Model])
def get_pretrained_models(db: Session = Depends(get_db)):
    return model_service.get_pretrained_models(db=db)

@router.get("/{model_id}", response_model=schemas.Model)
def get_model_by_id(
    model_id: int, 
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    model = model_service.get_model_by_id(db=db, model_id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    # Check if user has access to this model
    if model.visibility != 'public' and model.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return model

@router.post("/{model_id}/add-to-library", response_model=schemas.Model)
def add_model_to_library(model_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    new_model = model_service.add_model_to_user_library(db=db, user_id=current_user.id, model_id=model_id)
    if not new_model:
        raise HTTPException(status_code=404, detail="Model not found")
    return new_model

@router.get("/active", response_model=list[schemas.Model])
def get_active_models(db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    return model_service.get_models_by_user(db=db, user_id=current_user.id, status="active")

@router.get("/in-progress", response_model=list[schemas.Model])
def get_in_progress_models(db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    return model_service.get_models_by_user(db=db, user_id=current_user.id, status="in-progress")
