#!/usr/bin/env python3
"""
Script to fix the ADA backend database connectivity issue.

The backend is currently failing to load the /api/models/validate-data endpoint
because of a missing psycopg2 dependency. This script provides the solution.
"""

print("""
ADA Backend HTTP 405 Error Fix
==============================

Problem: The /api/models/validate-data endpoint returns HTTP 405 Method Not Allowed

Root Cause: Missing psycopg2 dependency preventing the models router from loading properly

Solution Options:

1. QUICK FIX - Switch to SQLite:
   Create /srv/ada-backend/.env with:
   USE_SQLITE=true
   SQLITE_DB_PATH=/srv/ada-backend/ada.db
   
   Then restart the service:
   sudo systemctl restart ada-backend.service

2. PROPER FIX - Install missing dependency:
   cd /srv/ada-backend
   ./venv/bin/pip install psycopg2-binary
   sudo systemctl restart ada-backend.service

3. ALTERNATIVE - Update database URL to use psycopg3 syntax:
   Change DATABASE_URL format in config.py from postgresql:// to postgresql+psycopg://

The SQLite option is the fastest fix and the ada.db file already exists.
""")

# Test if we can access the backend directory
import os
backend_dir = "/srv/ada-backend"
if os.path.exists(backend_dir):
    print(f"\n✓ Backend directory exists: {backend_dir}")
    if os.path.exists(f"{backend_dir}/ada.db"):
        print("✓ SQLite database file exists")
    if os.path.exists(f"{backend_dir}/venv"):
        print("✓ Virtual environment exists")
else:
    print(f"✗ Backend directory not accessible: {backend_dir}")

print("\nRecommendation: Use the SQLite quick fix for immediate resolution.")