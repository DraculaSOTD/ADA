from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
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
def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    unread_only: bool = False,
    notification_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Get user notifications with filtering options."""
    notifications = notification_service.get_notifications_by_user(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        unread_only=unread_only,
        notification_type=notification_type
    )
    return notifications

@router.get("/count")
def get_notification_count(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Get notification counts."""
    total = notification_service.get_notification_count(db, current_user.id)
    unread = notification_service.get_notification_count(db, current_user.id, unread_only=True)
    
    return {
        "total": total,
        "unread": unread
    }

@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Mark a notification as read."""
    notification = notification_service.get_notification_by_id(db, notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    notification_service.mark_as_read(db, notification_id)
    return {"message": "Notification marked as read"}

@router.put("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Mark all user notifications as read."""
    count = notification_service.mark_all_as_read(db, current_user.id)
    return {
        "message": f"{count} notifications marked as read",
        "count": count
    }

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Delete a notification."""
    notification = notification_service.get_notification_by_id(db, notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    notification_service.delete_notification(db, notification_id)
    return {"message": "Notification deleted"}

@router.delete("/")
def delete_all_notifications(
    notification_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Delete all notifications or by type."""
    count = notification_service.delete_all_notifications(
        db,
        current_user.id,
        notification_type=notification_type
    )
    return {
        "message": f"{count} notifications deleted",
        "count": count
    }

@router.get("/preferences")
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Get user's notification preferences."""
    preferences = notification_service.get_user_preferences(db, current_user.id)
    
    if not preferences:
        # Return default preferences
        return {
            "email_notifications": True,
            "model_completion_alerts": True,
            "api_usage_warnings": True,
            "weekly_reports": False,
            "marketing_emails": False
        }
    
    return preferences

@router.put("/preferences")
def update_notification_preferences(
    preferences: schemas.NotificationPreferences,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(security.get_current_user)
):
    """Update user's notification preferences."""
    updated_preferences = notification_service.update_user_preferences(
        db,
        current_user.id,
        preferences
    )
    return updated_preferences
