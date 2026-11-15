@echo off
title Raghuram Finance - Launcher
echo ========================================================
echo Starting Raghuram Finance System (Backend + Frontend)...
echo ========================================================

cd /d "%~dp0backend"
start "Raghuram Finance Backend (Port 5000)" cmd /k "npm run dev"

cd /d "%~dp0client"
start "Raghuram Finance Frontend (Port 5173)" cmd /k "npm run dev"

echo.
echo Both Backend (http://localhost:5000) and Frontend (http://localhost:5173) are running!
echo You can now use your application smoothly without interruptions.
echo ========================================================
timeout /t 5

