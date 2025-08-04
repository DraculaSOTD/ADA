@echo off
echo Starting build servers...

REM Start the frontend preview server
start "Frontend" cmd /c "npm run preview"

REM Start the backend server
start "Backend" /D "server" cmd /c "npm start"

echo Both servers are starting in separate windows.
