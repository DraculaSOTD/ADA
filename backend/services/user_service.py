from sqlalchemy.orm import Session
from models import schemas
from services import security, token_service
from models.user import User, UserProfile

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    # New users get 1000 tokens as a starting bonus
    db_user = User(email=user.email, password_hash=hashed_password, token_balance=1000)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    db_user_profile = UserProfile(
        user_id=db_user.id,
        full_name=user.full_name,
        phone_number=user.phone_number
    )
    db.add(db_user_profile)
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
        print(f"Failed to create initial token transaction: {e}")
    
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    try:
        user = get_user_by_email(db, email)
        if not user:
            return False
        if not security.verify_password(password, user.password_hash):
            return False
        return user
    except Exception as e:
        # Log the error for debugging
        print(f"Authentication error: {str(e)}")
        return False

def get_user_profile(db: Session, user_id: int):
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
