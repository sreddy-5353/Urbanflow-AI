@echo off
echo ===================================================
echo UrbanFlow AI - Launching Smart Mobility Ecosystem...
echo ===================================================

echo [1/2] Launching Python FastAPI Backend...
start cmd /k "echo Starting Backend... && cd backend && python run.py"

echo [2/2] Launching React Vite Frontend...
start cmd /k "echo Starting Frontend... && cd frontend && npm run dev"

echo.
echo ---------------------------------------------------
echo Dispatched launch commands!
echo ---------------------------------------------------
echo  - Backend UI (Docs): http://localhost:8000/docs
echo  - Frontend App: http://localhost:5173
echo ---------------------------------------------------
pause
