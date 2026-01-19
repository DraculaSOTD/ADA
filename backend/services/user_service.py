from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from models import schemas
from services import security, token_service
from models.user import User, UserProfile, UserSettings
from models.compute import ResourceQuota
import logging

logger = logging.getLogger(__name__)

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    
    # Create user with enhanced security fields
    db_user = User(
        email=user.email, 
        password_hash=hashed_password, 
        token_balance=1000,
        account_status='active',
        failed_login_attempts=0,
        password_changed_at=datetime.utcnow(),
        requires_password_change=False,
        last_activity_at=datetime.utcnow(),
        total_compute_hours=0,
        total_models_created=0,
        # Set default consent - user can update later
        consent_given={
            "data_processing": True,  # Required for service
            "analytics": False,  # Optional analytics
            "marketing": False  # Optional marketing
        },
        privacy_settings={
            "profile_visible": False,
            "activity_tracking": True,
            "share_with_team": True
        },
        data_retention_policy={
            "auto_delete_days": 365,
            "delete_on_account_close": True
        }
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Create user profile
    db_user_profile = UserProfile(
        user_id=db_user.id,
        full_name=user.full_name,
        phone_number=user.phone_number
    )
    db.add(db_user_profile)
    
    # Create user settings with defaults
    db_user_settings = UserSettings(
        user_id=db_user.id,
        dark_mode=False,
        auto_save=True,
        language='en',
        timezone='UTC',
        email_notifications=True,
        model_completion_alerts=True,
        api_usage_warnings=True,
        weekly_reports=False,
        data_analytics=True,
        session_timeout_minutes=30,
        data_retention_days=60,
        api_rate_limiting_enabled=True,
        debug_mode=False,
        cache_duration_minutes=5
    )
    db.add(db_user_settings)
    
    # Create default resource quota for new user
    try:
        # Check if we're using SQLite
        import os
        USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"
        
        if USE_SQLITE:
            import uuid
            quota_id = str(uuid.uuid4())
        else:
            import uuid
            quota_id = uuid.uuid4()
            
        db_resource_quota = ResourceQuota(
            id=quota_id,
            entity_type='user',
            entity_id=str(db_user.id),
            max_concurrent_jobs=3,  # Free tier limits
            max_gpu_hours_daily=0,  # No GPU for free tier
            max_cpu_hours_daily=10,
            max_storage_gb=10,
            max_memory_gb_per_job=4,
            max_job_duration_hours=2,
            priority_level=1,
            can_preempt=False,
            can_use_spot_instances=True,
            daily_token_limit=1000,
            monthly_token_limit=10000
        )
        db.add(db_resource_quota)
    except Exception as e:
        logger.warning(f"Failed to create resource quota for user {db_user.id}: {e}")
    
    db.commit()
    
    # Create initial token transaction for the welcome bonus
    try:
        token_transaction = schemas.TokenTransactionCreate(
            user_id=db_user.id,
            change=1000,
            reason="Welcome bonus - initial tokens",
            reference_type="registration",
            reference_id=str(db_user.id)
        )
        token_service.create_token_transaction(db=db, transaction=token_transaction)
    except Exception as e:
        # Log but don't fail registration if transaction creation fails
        logger.warning(f"Failed to create initial token transaction: {e}")
    
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    try:
        user = get_user_by_email(db, email)
        if not user:
            return False
        
        # Check if account is active
        if user.account_status != 'active':
            # Check if account is locked temporarily
            if user.account_status == 'locked' and user.account_locked_until:
                if datetime.utcnow() < user.account_locked_until:
                    logger.warning(f"Login attempt for locked account: {email}")
                    return False
                else:
                    # Unlock the account if lock period has expired
                    user.account_status = 'active'
                    user.failed_login_attempts = 0
                    user.account_locked_until = None
                    db.commit()
            elif user.account_status in ['suspended', 'inactive']:
                logger.warning(f"Login attempt for {user.account_status} account: {email}")
                return False
        
        # Verify password
        if not security.verify_password(password, user.password_hash):
            # Increment failed login attempts
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            
            # Lock account after 5 failed attempts
            if user.failed_login_attempts >= 5:
                user.account_status = 'locked'
                user.account_locked_until = datetime.utcnow() + timedelta(minutes=30)  # Lock for 30 minutes
                logger.warning(f"Account locked due to too many failed attempts: {email}")
            
            db.commit()
            return False
        
        # Reset failed attempts on successful login
        user.failed_login_attempts = 0
        user.last_login_at = datetime.utcnow()
        user.last_activity_at = datetime.utcnow()
        db.commit()
        
        return user
    except Exception as e:
        # Log the error for debugging
        logger.error(f"Authentication error: {str(e)}")
        return False

def get_user_profile(db: Session, user_id: int):
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
