from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import Optional, List, Dict, Any
from datetime import datetime
from models.miscellaneous import Notification, NotificationPreference
from models import schemas

def get_notifications_by_user(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    unread_only: bool = False,
    notification_type: Optional[str] = None
) -> List[Notification]:
    """Get notifications with filtering options."""
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    if notification_type:
        query = query.filter(Notification.type == notification_type)
    
    return query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

def get_notification_by_id(db: Session, notification_id: int) -> Optional[Notification]:
    """Get a specific notification by ID."""
    return db.query(Notification).filter(Notification.id == notification_id).first()

def get_notification_count(
    db: Session,
    user_id: int,
    unread_only: bool = False
) -> int:
    """Get count of notifications."""
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    return query.count()

def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    data: Optional[Dict[str, Any]] = None
) -> Notification:
    """Create a new notification."""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        data=data,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

def mark_as_read(db: Session, notification_id: int) -> bool:
    """Mark a notification as read."""
    notification = get_notification_by_id(db, notification_id)
    if notification:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        return True
    return False

def mark_all_as_read(db: Session, user_id: int) -> int:
    """Mark all user notifications as read."""
    count = db.query(Notification).filter(
        and_(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
    ).update({
        "is_read": True,
        "read_at": datetime.utcnow()
    })
    db.commit()
    return count

def delete_notification(db: Session, notification_id: int) -> bool:
    """Delete a notification."""
    notification = get_notification_by_id(db, notification_id)
    if notification:
        db.delete(notification)
        db.commit()
        return True
    return False

def delete_all_notifications(
    db: Session,
    user_id: int,
    notification_type: Optional[str] = None
) -> int:
    """Delete all notifications or by type."""
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if notification_type:
        query = query.filter(Notification.type == notification_type)
    
    count = query.delete()
    db.commit()
    return count

def get_user_preferences(
    db: Session,
    user_id: int
) -> Optional[Dict[str, bool]]:
    """Get user's notification preferences."""
    pref = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id
    ).first()
    
    if pref:
        return {
            "email_notifications": pref.email_notifications,
            "model_completion_alerts": pref.model_completion_alerts,
            "api_usage_warnings": pref.api_usage_warnings,
            "weekly_reports": pref.weekly_reports,
            "marketing_emails": pref.marketing_emails
        }
    return None

def update_user_preferences(
    db: Session,
    user_id: int,
    preferences: schemas.NotificationPreferences
) -> Dict[str, bool]:
    """Update user's notification preferences."""
    pref = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id
    ).first()
    
    if not pref:
        # Create new preferences
        pref = NotificationPreference(
            user_id=user_id,
            email_notifications=preferences.email_notifications,
            model_completion_alerts=preferences.model_completion_alerts,
            api_usage_warnings=preferences.api_usage_warnings,
            weekly_reports=preferences.weekly_reports,
            marketing_emails=preferences.marketing_emails
        )
        db.add(pref)
    else:
        # Update existing preferences
        pref.email_notifications = preferences.email_notifications
        pref.model_completion_alerts = preferences.model_completion_alerts
        pref.api_usage_warnings = preferences.api_usage_warnings
        pref.weekly_reports = preferences.weekly_reports
        pref.marketing_emails = preferences.marketing_emails
    
    db.commit()
    db.refresh(pref)
    
    return {
        "email_notifications": pref.email_notifications,
        "model_completion_alerts": pref.model_completion_alerts,
        "api_usage_warnings": pref.api_usage_warnings,
        "weekly_reports": pref.weekly_reports,
        "marketing_emails": pref.marketing_emails
    }

def create_system_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    **kwargs
) -> Notification:
    """Create system notifications based on type."""
    templates = {
        "model_complete": {
            "title": "Model Training Complete",
            "message": f"Your model '{kwargs.get('model_name', 'Unknown')}' has finished training with {kwargs.get('accuracy', 0):.1%} accuracy."
        },
        "token_warning": {
            "title": "Token Usage Warning",
            "message": f"You've used {kwargs.get('percentage', 0):.0f}% of your monthly token allowance."
        },
        "job_failed": {
            "title": "Job Failed",
            "message": f"Job '{kwargs.get('job_name', 'Unknown')}' failed: {kwargs.get('error', 'Unknown error')}"
        },
        "data_ready": {
            "title": "Data Generation Complete",
            "message": f"Your synthetic data ({kwargs.get('rows', 0)} rows) is ready for download."
        }
    }
    
    template = templates.get(notification_type, {
        "title": "System Notification",
        "message": kwargs.get('message', 'You have a new notification.')
    })
    
    return create_notification(
        db=db,
        user_id=user_id,
        title=template["title"],
        message=template["message"],
        notification_type=notification_type,
        data=kwargs
    )