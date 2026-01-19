#!/usr/bin/env python3
"""
Simple Authentication Test
Tests basic user signup and signin functionality without complex relationships
"""

import os
import sys

# Set up environment
os.environ["USE_SQLITE"] = "true"
os.environ["SQLITE_DB_PATH"] = "./ada.db"

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from core.config import settings
from models.user import User, UserProfile, UserSettings
from services import security
from datetime import datetime, timedelta
import logging
import bcrypt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_session():
    """Create a database session"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def test_basic_auth():
    """Test basic authentication functionality"""
    print("🔐 Simple Authentication Test")
    print("="*50)
    
    db = get_db_session()
    
    try:
        # Test 1: Check admin user exists and can authenticate
        print("\n1. Testing Admin User Authentication...")
        
        admin_user = db.query(User).filter(User.email == "admin@ada.local").first()
        if admin_user:
            print(f"✅ Admin user found: {admin_user.email}")
            print(f"   Account Status: {admin_user.account_status}")
            print(f"   Token Balance: {admin_user.token_balance}")
            
            # Test password verification
            admin_password = "admin123"
            if security.verify_password(admin_password, admin_user.password_hash):
                print("✅ Admin password verification successful")
            else:
                print("❌ Admin password verification failed")
        else:
            print("❌ Admin user not found")
        
        # Test 2: Create a new test user
        print("\n2. Testing New User Creation...")
        
        test_email = "testuser@example.com"
        existing_user = db.query(User).filter(User.email == test_email).first()
        
        if existing_user:
            print(f"⚠️  Test user {test_email} already exists")
        else:
            # Create user manually
            hashed_password = security.get_password_hash("TestPassword123!")
            
            new_user = User(
                email=test_email,
                password_hash=hashed_password,
                token_balance=1000,
                account_status='active',
                failed_login_attempts=0,
                password_changed_at=datetime.utcnow(),
                last_activity_at=datetime.utcnow(),
                consent_given={
                    "data_processing": True,
                    "analytics": False
                },
                privacy_settings={
                    "profile_visible": False,
                    "activity_tracking": True
                }
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            print(f"✅ Created test user: {new_user.email} (ID: {new_user.id})")
            
            # Create profile
            profile = UserProfile(
                user_id=new_user.id,
                full_name="Test User",
                phone_number="1234567890"
            )
            db.add(profile)
            
            # Create settings
            user_settings = UserSettings(
                user_id=new_user.id,
                dark_mode=False,
                language='en',
                timezone='UTC'
            )
            db.add(user_settings)
            
            db.commit()
            print("✅ Created user profile and settings")
        
        # Test 3: Test authentication
        print("\n3. Testing Authentication...")
        
        test_user = db.query(User).filter(User.email == test_email).first()
        if test_user:
            # Test correct password
            if security.verify_password("TestPassword123!", test_user.password_hash):
                print("✅ Correct password authentication successful")
                
                # Update login info
                test_user.last_login_at = datetime.utcnow()
                test_user.failed_login_attempts = 0
                db.commit()
                
            else:
                print("❌ Correct password authentication failed")
            
            # Test wrong password
            if not security.verify_password("WrongPassword", test_user.password_hash):
                print("✅ Wrong password correctly rejected")
                
                # Simulate failed attempt tracking
                test_user.failed_login_attempts = (test_user.failed_login_attempts or 0) + 1
                db.commit()
                
            else:
                print("❌ Wrong password incorrectly accepted")
        
        # Test 4: Token generation
        print("\n4. Testing Token Generation...")
        
        try:
            access_token = security.create_access_token(data={"sub": test_email})
            print("✅ Access token generated successfully")
            print(f"   Token (first 50 chars): {access_token[:50]}...")
        except Exception as e:
            print(f"❌ Token generation failed: {e}")
        
        # Test 5: Database structure verification
        print("\n5. Testing Database Structure...")
        
        # Count records
        user_count = db.query(User).count()
        profile_count = db.query(UserProfile).count()
        settings_count = db.query(UserSettings).count()
        
        print(f"✅ Database records:")
        print(f"   Users: {user_count}")
        print(f"   Profiles: {profile_count}")
        print(f"   Settings: {settings_count}")
        
        print("\n" + "="*50)
        print("✅ Simple authentication test completed successfully!")
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        db.close()

if __name__ == "__main__":
    test_basic_auth()