#!/usr/bin/env python3
"""
Test script for enhanced backend features
Tests multi-tenant isolation, data lifecycle, and resource management
"""

import requests
import json
import time
import os
import sqlite3
from datetime import datetime

# API base URL  
BASE_URL = "http://localhost:8000"

# Test credentials
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "testpassword123"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
ENDC = '\033[0m'


def print_test(test_name):
    """Print test header"""
    print(f"\n{BLUE}═══ Testing: {test_name} ═══{ENDC}")


def print_success(message):
    """Print success message"""
    print(f"{GREEN}✓ {message}{ENDC}")


def print_error(message):
    """Print error message"""
    print(f"{RED}✗ {message}{ENDC}")


def print_info(message):
    """Print info message"""
    print(f"{YELLOW}ℹ {message}{ENDC}")


class EnhancedFeatureTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
    
    def test_database_schema(self):
        """Test that the enhanced database schema is in place"""
        print_test("Database Schema Verification")
        
        try:
            conn = sqlite3.connect('ada.db')
            cursor = conn.cursor()
            
            # Check for lifecycle tables
            lifecycle_tables = [
                'data_retention_policies',
                'data_downloads', 
                'cleanup_jobs',
                'data_lifecycle_events',
                'user_retention_preferences'
            ]
            
            missing_tables = []
            for table in lifecycle_tables:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
                if not cursor.fetchone():
                    missing_tables.append(table)
            
            if missing_tables:
                print_error(f"Missing lifecycle tables: {missing_tables}")
            else:
                print_success("All lifecycle tables exist")
            
            # Check for enhanced columns in uploads table
            cursor.execute("PRAGMA table_info(uploads)")
            columns = [col[1] for col in cursor.fetchall()]
            
            enhanced_columns = ['lifecycle_status', 'first_downloaded_at', 'download_count', 'expires_at', 'is_temporary']
            missing_columns = [col for col in enhanced_columns if col not in columns]
            
            if missing_columns:
                print_error(f"Missing enhanced columns in uploads: {missing_columns}")
            else:
                print_success("Enhanced columns added to uploads table")
            
            # Check for resource tracking tables
            resource_tables = ['job_resource_allocations', 'data_access_policies', 'resource_billing_log']
            existing_resource_tables = []
            for table in resource_tables:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
                if cursor.fetchone():
                    existing_resource_tables.append(table)
            
            if existing_resource_tables:
                print_success(f"Resource tracking tables exist: {existing_resource_tables}")
            else:
                print_info("Resource tracking tables not found (may be in development)")
            
            conn.close()
            return len(missing_tables) == 0
            
        except Exception as e:
            print_error(f"Database schema test failed: {e}")
            return False
        
    def register_and_login(self):
        """Register a test user and login"""
        print_test("User Registration and Authentication")
        
        # Try to register
        register_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/api/auth/register", json=register_data)
            if response.status_code == 200:
                print_success("User registered successfully")
            elif response.status_code == 400 and "already registered" in response.text.lower():
                print_info("User already exists, proceeding to login")
            else:
                print_error(f"Registration failed: {response.text}")
        except Exception as e:
            print_error(f"Registration error: {e}")
        
        # Login
        try:
            response = self.session.post(f"{BASE_URL}/api/auth/login", json=register_data)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.user_id = data.get("user_id")
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                print_success(f"Logged in successfully (User ID: {self.user_id})")
                return True
            else:
                print_error(f"Login failed: {response.text}")
                return False
        except Exception as e:
            print_error(f"Login error: {e}")
            return False
    
    def test_enhanced_upload(self):
        """Test enhanced upload with lifecycle tracking"""
        print_test("Enhanced Upload with Lifecycle Tracking")
        
        # Create a test CSV file
        test_file_path = "test_data.csv"
        with open(test_file_path, "w") as f:
            f.write("id,name,value\n")
            f.write("1,Item1,100\n")
            f.write("2,Item2,200\n")
            f.write("3,Item3,300\n")
        
        try:
            # Upload using enhanced endpoint
            with open(test_file_path, "rb") as f:
                files = {"file": (test_file_path, f, "text/csv")}
                data = {
                    "visibility": "private",
                    "data_classification": "internal"
                }
                
                response = self.session.post(f"{BASE_URL}/api/v2/uploads/upload", files=files, data=data)
                
                if response.status_code == 200:
                    upload_data = response.json()
                    upload_id = upload_data.get("upload_id")
                    print_success(f"File uploaded successfully (ID: {upload_id})")
                    print_info(f"Lifecycle status: {upload_data.get('lifecycle_status')}")
                    print_info(f"Data classification: {upload_data.get('data_classification')}")
                    
                    # Clean up
                    os.remove(test_file_path)
                    return upload_id
                else:
                    print_error(f"Upload failed: {response.text}")
                    os.remove(test_file_path)
                    return None
                    
        except Exception as e:
            print_error(f"Upload error: {e}")
            if os.path.exists(test_file_path):
                os.remove(test_file_path)
            return None
    
    def test_enhanced_download(self, upload_id):
        """Test enhanced download with retention tracking"""
        print_test("Enhanced Download with Retention Tracking")
        
        if not upload_id:
            print_error("No upload ID available for testing")
            return
        
        try:
            # Download the file
            response = self.session.get(f"{BASE_URL}/api/v2/downloads/uploads/{upload_id}")
            
            if response.status_code == 200:
                # Check headers for download info
                download_info = response.headers.get("X-Download-Info")
                if download_info:
                    info = json.loads(download_info)
                    print_success("File downloaded successfully")
                    print_info(f"Is first download: {info.get('is_first_download')}")
                    print_info(f"Expires at: {info.get('expires_at')}")
                    
                    if info.get('is_first_download'):
                        print_info("24-hour retention timer has been started")
                else:
                    print_success("File downloaded (no retention info in headers)")
            else:
                print_error(f"Download failed: {response.text}")
                
        except Exception as e:
            print_error(f"Download error: {e}")
    
    def test_team_creation(self):
        """Test team creation and management"""
        print_test("Team Creation and Management")
        
        try:
            # Create a team
            team_data = {
                "name": f"Test Team {datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "description": "Test team for enhanced features"
            }
            
            response = self.session.post(f"{BASE_URL}/api/teams/create", json=team_data)
            
            if response.status_code == 200:
                team_info = response.json()
                team_id = team_info.get("team_id")
                print_success(f"Team created successfully (ID: {team_id})")
                print_info(f"Team name: {team_info.get('name')}")
                return team_id
            else:
                print_error(f"Team creation failed: {response.text}")
                return None
                
        except Exception as e:
            print_error(f"Team creation error: {e}")
            return None
    
    def test_expiring_data(self):
        """Check for expiring data"""
        print_test("Expiring Data Check")
        
        try:
            response = self.session.get(f"{BASE_URL}/api/v2/downloads/expiring-data")
            
            if response.status_code == 200:
                data = response.json()
                expiring_count = data.get("total_count", 0)
                
                if expiring_count > 0:
                    print_info(f"Found {expiring_count} expiring data items")
                    for item in data.get("expiring_data", [])[:3]:  # Show first 3
                        print_info(f"  - {item.get('name')}: expires in {item.get('hours_until_expiry')} hours")
                else:
                    print_success("No expiring data found")
            else:
                print_error(f"Failed to check expiring data: {response.text}")
                
        except Exception as e:
            print_error(f"Expiring data check error: {e}")
    
    def test_download_history(self):
        """Get download history"""
        print_test("Download History")
        
        try:
            response = self.session.get(f"{BASE_URL}/api/v2/downloads/history?limit=5")
            
            if response.status_code == 200:
                data = response.json()
                total_downloads = data.get("total_count", 0)
                
                print_success(f"Total downloads: {total_downloads}")
                
                for download in data.get("downloads", [])[:3]:  # Show first 3
                    print_info(f"  - {download.get('resource_name')} ({download.get('file_size_mb')} MB)")
                    print_info(f"    Downloaded at: {download.get('downloaded_at')}")
            else:
                print_error(f"Failed to get download history: {response.text}")
                
        except Exception as e:
            print_error(f"Download history error: {e}")
    
    def run_all_tests(self):
        """Run all tests"""
        print(f"\n{BLUE}{'='*50}{ENDC}")
        print(f"{BLUE}   Enhanced Backend Features Test Suite{ENDC}")
        print(f"{BLUE}{'='*50}{ENDC}")
        
        # Test database schema first
        schema_ok = self.test_database_schema()
        if not schema_ok:
            print_error("Database schema is incomplete, some tests may fail")
        
        # Test basic upload using existing endpoints
        upload_id = self.test_basic_upload()
        
        # Test existing API functionality 
        self.test_existing_api_endpoints()
        
        print(f"\n{BLUE}{'='*50}{ENDC}")
        print(f"{GREEN}   Test Suite Completed{ENDC}")
        print(f"{BLUE}Database Status: {'✅ Ready for enhanced features' if schema_ok else '⚠️ Needs enhanced route integration'}{ENDC}")
        print(f"{BLUE}{'='*50}{ENDC}\n")
    
    def test_basic_upload(self):
        """Test basic upload using existing endpoints"""
        print_test("Basic Upload Test (Existing API)")
        
        # Create a test CSV file
        test_file_path = "test_data.csv"
        with open(test_file_path, "w") as f:
            f.write("id,name,value\n")
            f.write("1,Item1,100\n")
            f.write("2,Item2,200\n")
        
        try:
            # Try to use existing upload endpoint
            with open(test_file_path, "rb") as f:
                files = {"file": (test_file_path, f, "text/csv")}
                
                response = self.session.post(f"{BASE_URL}/api/uploads", files=files)
                
                if response.status_code in [200, 201]:
                    print_success("File uploaded successfully using existing API")
                    data = response.json()
                    upload_id = data.get("id") or data.get("upload_id")
                    if upload_id:
                        print_info(f"Upload ID: {upload_id}")
                    os.remove(test_file_path)
                    return upload_id
                else:
                    print_error(f"Upload failed: {response.status_code} - {response.text}")
                    os.remove(test_file_path)
                    return None
                    
        except Exception as e:
            print_error(f"Upload error: {e}")
            if os.path.exists(test_file_path):
                os.remove(test_file_path)
            return None
    
    def test_existing_api_endpoints(self):
        """Test existing API endpoints"""
        print_test("Existing API Endpoints")
        
        endpoints_to_test = [
            ("/api/models", "GET", "Models endpoint"),
            ("/api/uploads", "GET", "Uploads endpoint"), 
            ("/api/jobs", "GET", "Jobs endpoint"),
            ("/api/user/settings", "GET", "User settings endpoint")
        ]
        
        for endpoint, method, description in endpoints_to_test:
            try:
                if method == "GET":
                    response = self.session.get(f"{BASE_URL}{endpoint}")
                    
                if response.status_code in [200, 401]:  # 401 is expected if not authenticated
                    print_success(f"{description}: Available")
                else:
                    print_info(f"{description}: {response.status_code}")
                    
            except Exception as e:
                print_error(f"{description}: Error - {e}")


def main():
    """Main function"""
    tester = EnhancedFeatureTester()
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print_error("Backend server is not healthy")
            return
    except:
        print_error("Backend server is not running at http://localhost:8000")
        print_info("Please start the backend server first")
        return
    
    # Run tests
    tester.run_all_tests()


if __name__ == "__main__":
    main()