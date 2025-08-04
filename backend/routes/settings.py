from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import schemas
from services import settings_service, security
from core.database import get_db

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
    dependencies=[Depends(security.get_current_user)]
)

@router.get("/", response_model=schemas.UserSettings)
def get_settings(db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    settings = settings_service.get_user_settings(db, user_id=current_user.id)
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings

@router.put("/", response_model=schemas.UserSettings)
def update_settings(settings: schemas.UserSettingsUpdate, db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    return settings_service.update_user_settings(db, user_id=current_user.id, settings=settings)
