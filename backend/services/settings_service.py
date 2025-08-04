from sqlalchemy.orm import Session
from models.user import UserSettings
from models import schemas

def get_user_settings(db: Session, user_id: int):
    return db.query(UserSettings).filter(UserSettings.user_id == user_id).first()

def update_user_settings(db: Session, user_id: int, settings: schemas.UserSettingsUpdate):
    db_settings = get_user_settings(db, user_id)
    if not db_settings:
        db_settings = UserSettings(user_id=user_id)
        db.add(db_settings)
    
    for key, value in settings.dict(exclude_unset=True).items():
        setattr(db_settings, key, value)
        
    db.commit()
    db.refresh(db_settings)
    return db_settings
