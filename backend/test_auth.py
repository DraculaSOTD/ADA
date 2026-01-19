#!/usr/bin/env python3
"""
Test Authentication System with Enhanced Database
Tests user signup, signin, and all related record creation
"""

import os
import sys
import json
from datetime import datetime

# Set up environment
os.environ["USE_SQLITE"] = "true"
os.environ["SQLITE_DB_PATH"] = "./ada.db"

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings
from models import schemas
from models.user import User, UserProfile, UserSettings
from models.compute import ResourceQuota
from services import user_service, security
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_session():
    """Create a database session"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def test_user_signup():
    """Test creating a new user"""
    print("\n" + "="*50)
    print("Testing User Signup")
    print("="*50)
    
    db = get_db_session()
    
    try:
        # Create test user data
        test_user = schemas.UserCreate(
            email="testuser@example.com",
            password="TestPass123!",
            full_name="Test User",
            phone_number="1234567890"
        )
        
        # Check if user already exists
        existing_user = user_service.get_user_by_email(db, test_user.email)
        if existing_user:
            print(f"⚠️  User {test_user.email} already exists, skipping creation")
            return existing_user
        
        # Create user
        print(f"Creating user: {test_user.email}")
        created_user = user_service.create_user(db, test_user)
        
        print(f"✅ User created successfully!")
        print(f"   ID: {created_user.id}")
        print(f"   Email: {created_user.email}")
        print(f"   Token Balance: {created_user.token_balance}")
        print(f"   Account Status: {created_user.account_status}")
        
        # Verify profile was created
        profile = db.query(UserProfile).filter(UserProfile.user_id == created_user.id).first()
        if profile:
            print(f"✅ UserProfile created")
            print(f"   Full Name: {profile.full_name}")
            print(f"   Phone: {profile.phone_number}")
        else:
            print("❌ UserProfile not created")
        
        # Verify settings were created
        settings = db.query(UserSettings).filter(UserSettings.user_id == created_user.id).first()
        if settings:
            print(f"✅ UserSettings created")
            print(f"   Dark Mode: {settings.dark_mode}")
            print(f"   Language: {settings.language}")
            print(f"   Timezone: {settings.timezone}")
        else:
            print("❌ UserSettings not created")
        
        # Verify resource quota was created
        quota = db.query(ResourceQuota).filter(
            ResourceQuota.entity_type == "user",
            ResourceQuota.entity_id == str(created_user.id)
        ).first()
        if quota:
            print(f"✅ ResourceQuota created")
            print(f"   Max Concurrent Jobs: {quota.max_concurrent_jobs}")
            print(f"   Max CPU Hours Daily: {quota.max_cpu_hours_daily}")
            print(f"   Max Storage GB: {quota.max_storage_gb}")
        else:
            print("❌ ResourceQuota not created")
        
        return created_user
        
    except Exception as e:
        logger.error(f"Error during signup test: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()

def test_user_signin(email: str, password: str):
    """Test user authentication"""
    print("\n" + "="*50)
    print("Testing User Signin")
    print("="*50)
    
    db = get_db_session()
    
    try:
        print(f"Attempting to authenticate: {email}")
        
        # Test authentication
        authenticated_user = user_service.authenticate_user(db, email, password)
        
        if authenticated_user:
            print(f"✅ Authentication successful!")
            print(f"   User ID: {authenticated_user.id}")
            print(f"   Last Login: {authenticated_user.last_login_at}")
            print(f"   Failed Attempts: {authenticated_user.failed_login_attempts}")
            
            # Generate access token
            access_token = security.create_access_token(data={"sub": email})
            print(f"✅ Access token generated")
            print(f"   Token (first 50 chars): {access_token[:50]}...")
            
            return True
        else:
            print(f"❌ Authentication failed for {email}")
            
            # Check if account is locked
            user = user_service.get_user_by_email(db, email)
            if user:
                print(f"   Account Status: {user.account_status}")
                print(f"   Failed Attempts: {user.failed_login_attempts}")
                if user.account_locked_until:
                    print(f"   Locked Until: {user.account_locked_until}")
            
            return False
            
    except Exception as e:
        logger.error(f"Error during signin test: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_failed_login_attempts():
    """Test account locking after failed attempts"""
    print("\n" + "="*50)
    print("Testing Failed Login Attempts & Account Locking")
    print("="*50)
    
    db = get_db_session()
    
    try:
        # Create a test user for this
        test_email = "locktest@example.com"
        test_password = "CorrectPass123!"
        
        # Check if user exists
        existing_user = user_service.get_user_by_email(db, test_email)
        if not existing_user:
            print(f"Creating test user: {test_email}")
            test_user = schemas.UserCreate(
                email=test_email,
                password=test_password,
                full_name="Lock Test User",
                phone_number="9876543210"
            )
            user_service.create_user(db, test_user)
        
        # Test failed login attempts
        print("\nTesting failed login attempts...")
        for i in range(6):  # Try 6 times to trigger lock
            print(f"  Attempt {i+1}: ", end="")
            result = user_service.authenticate_user(db, test_email, "WrongPassword")
            if result:
                print("✅ Success (unexpected)")
            else:
                user = user_service.get_user_by_email(db, test_email)
                print(f"❌ Failed (Attempts: {user.failed_login_attempts}, Status: {user.account_status})")
                
                if user.account_status == 'locked':
                    print(f"  🔒 Account locked until: {user.account_locked_until}")
                    break
        
        # Try correct password while locked
        print("\nTrying correct password while account is locked...")
        result = user_service.authenticate_user(db, test_email, test_password)
        if result:
            print("✅ Login successful (account unlocked)")
        else:
            print("❌ Login failed (account still locked)")
        
    except Exception as e:
        logger.error(f"Error during lock test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def test_admin_user():
    """Test that admin user exists and can login"""
    print("\n" + "="*50)
    print("Testing Admin User")
    print("="*50)
    
    admin_email = "admin@ada.local"
    admin_password = "admin123"
    
    print(f"Testing admin login: {admin_email}")
    result = test_user_signin(admin_email, admin_password)
    
    if result:
        print("✅ Admin user authentication successful")
    else:
        print("❌ Admin user authentication failed")
    
    return result

def main():
    """Run all authentication tests"""
    print("\n" + "🔐 ADA Authentication System Test Suite 🔐")
    print("Testing authentication with enhanced security features\n")
    
    # Test 1: Admin user
    print("\n📍 Test 1: Admin User")
    test_admin_user()
    
    # Test 2: User signup
    print("\n📍 Test 2: User Signup")
    created_user = test_user_signup()
    
    # Test 3: User signin
    if created_user:
        print("\n📍 Test 3: User Signin")
        test_user_signin("testuser@example.com", "TestPass123!")
    
    # Test 4: Failed attempts and locking
    print("\n📍 Test 4: Account Locking")
    test_failed_login_attempts()
    
    print("\n" + "="*50)
    print("✅ All tests completed!")
    print("="*50)

if __name__ == "__main__":
    main()