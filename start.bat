@echo off
title Schedule - Starting...

echo Starting API server...
start "Schedule API" cmd /k "cd /d D:\git\fly\schedule\src\Schedule.Api && dotnet run"

echo Starting frontend dev server...
start "Schedule Web" cmd /k "cd /d D:\git\fly\schedule\src\schedule-web && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   API:      http://localhost:5041
echo   Frontend: http://localhost:5173
echo.
pause
