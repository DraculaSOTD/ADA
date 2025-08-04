@echo off
echo Initializing the database...
python backend/init_db.py

echo.
echo Starting development servers...

REM Start the frontend dev server
start "Frontend" cmd /c "npm run dev"

REM Start the backend server
start "Backend" cmd /c "uvicorn backend.main:app --reload"

echo Both servers are starting in separate windows.
