#!/usr/bin/env python3
"""
Test Authentication API Endpoints
Tests the actual FastAPI signup and signin endpoints
"""

import os
import sys
import json
import time
import subprocess
import requests
from datetime import datetime

# Set up environment
os.environ["USE_SQLITE"] = "true"
os.environ["SQLITE_DB_PATH"] = "./ada.db"

def start_server():
    """Start the FastAPI server in background"""
    print("🚀 Starting FastAPI server...")
    
    # Start server in background
    server_process = subprocess.Popen([
        "bash", "-c", 
        "source venv/bin/activate && export USE_SQLITE=true && uvicorn main:app --port 8000 --host 0.0.0.0"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Wait a bit for server to start
    time.sleep(5)
    
    # Test if server is running
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server started successfully")
            return server_process
        else:
            print(f"❌ Server health check failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Server not responding: {e}")
        return None

def test_api_auth():
    """Test API authentication endpoints"""
    print("🔐 API Authentication Test")
    print("="*50)
    
    base_url = "http://localhost:8000"
    
    # Test 1: Health check
    print("\n1. Testing Server Health...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Server health check passed")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Test 2: User Registration
    print("\n2. Testing User Registration...")
    
    signup_data = {
        "email": "apitest@example.com",
        "password": "APITest123!",
        "full_name": "API Test User",
        "phone_number": "9876543210"
    }
    
    try:
        response = requests.post(f"{base_url}/api/register", json=signup_data)
        print(f"Registration response status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ User registration successful")
            user_data = response.json()
            print(f"   User ID: {user_data.get('id')}")
            print(f"   Email: {user_data.get('email')}")
            print(f"   Token Balance: {user_data.get('token_balance')}")
        elif response.status_code == 400:
            error_detail = response.json().get('detail', 'Unknown error')
            if "already registered" in error_detail:
                print(f"⚠️  User already exists: {error_detail}")
            else:
                print(f"❌ Registration failed: {error_detail}")
        else:
            print(f"❌ Registration failed with status {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Registration request failed: {e}")
    
    # Test 3: User Login
    print("\n3. Testing User Login...")
    
    login_data = {
        "username": "apitest@example.com",  # OAuth2 uses 'username' field
        "password": "APITest123!"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/login", 
            data=login_data,  # Form data for OAuth2
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        print(f"Login response status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ User login successful")
            auth_data = response.json()
            access_token = auth_data.get('access_token')
            token_type = auth_data.get('token_type')
            print(f"   Token Type: {token_type}")
            print(f"   Access Token (first 50 chars): {access_token[:50] if access_token else 'None'}...")
            
            # Test 4: Authenticated Request
            print("\n4. Testing Authenticated Request...")
            
            if access_token:
                headers = {"Authorization": f"Bearer {access_token}"}
                response = requests.get(f"{base_url}/api/profile", headers=headers)
                
                if response.status_code == 200:
                    print("✅ Authenticated request successful")
                    profile_data = response.json()
                    print(f"   Full Name: {profile_data.get('full_name')}")
                    print(f"   Phone: {profile_data.get('phone_number')}")
                else:
                    print(f"❌ Authenticated request failed: {response.status_code}")
                    print(f"   Response: {response.text}")
        else:
            print(f"❌ Login failed with status {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Login request failed: {e}")
    
    # Test 5: Login with Admin User
    print("\n5. Testing Admin Login...")
    
    admin_login_data = {
        "username": "admin@ada.local",
        "password": "admin123"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/login", 
            data=admin_login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            print("✅ Admin login successful")
            auth_data = response.json()
            access_token = auth_data.get('access_token')
            print(f"   Admin token obtained: {access_token[:50] if access_token else 'None'}...")
        else:
            print(f"❌ Admin login failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Admin login request failed: {e}")
    
    print("\n" + "="*50)
    print("✅ API authentication test completed!")
    return True

def main():
    """Main test function"""
    server_process = None
    
    try:
        # Start server
        server_process = start_server()
        if not server_process:
            print("❌ Failed to start server")
            return
        
        # Run tests
        test_api_auth()
        
    finally:
        # Clean up server
        if server_process:
            print("\n🛑 Stopping server...")
            server_process.terminate()
            server_process.wait()
            print("✅ Server stopped")

if __name__ == "__main__":
    main()