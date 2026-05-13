@echo off
:: Start nx-search dev-preview server on port 3002
:: Uses vite preview so /api/ and /v1/ are proxied to neuronx.jagatab.uk

set "PROJECT_DIR=E:\Newfolder4\nx-search"

:: Check if already running on port 3002
netstat -ano | findstr ":3002" | findstr "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo nx-search already running on port 3002
    exit /b 0
)

echo Starting nx-search on port 3002...
start "" /min cmd /c "cd /d "%PROJECT_DIR%" && npx vite preview --port 3002"
timeout /t 4 /nobreak >nul
netstat -ano | findstr ":3002" | findstr "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo nx-search running on http://localhost:3002
) else (
    echo ERROR: Failed to start nx-search
)
