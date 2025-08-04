from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import schemas
from services import notification_service, security
from core.database import get_db

router = APIRouter(
    prefix="/api/notifications",
    tags=["notifications"],
    dependencies=[Depends(security.get_current_user)]
)

@router.get("/", response_model=List[schemas.Notification])
def get_notifications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(security.get_current_user)):
    notifications = notification_service.get_notifications_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return notifications
