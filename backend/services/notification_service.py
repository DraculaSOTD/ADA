from sqlalchemy.orm import Session
from models.miscellaneous import Notification

def get_notifications_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(Notification).filter(Notification.user_id == user_id).offset(skip).limit(limit).all()
