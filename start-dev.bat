@echo off
setlocal

cd /d "%~dp0"

for /f %%P in ('powershell -NoProfile -Command "$ports=8000..8010; foreach($p in $ports){ if(-not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)){ Write-Output $p; break } }"') do set "BACKEND_PORT=%%P"
for /f %%P in ('powershell -NoProfile -Command "$ports=5173..5183; foreach($p in $ports){ if(-not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)){ Write-Output $p; break } }"') do set "FRONTEND_PORT=%%P"

if not defined BACKEND_PORT (
  echo No free backend port found in range 8000-8010.
  goto :end
)

if not defined FRONTEND_PORT (
  echo No free frontend port found in range 5173-5183.
  goto :end
)

if exist "backend\.venv\Scripts\python.exe" (
  set "BACKEND_PYTHON=%CD%\backend\.venv\Scripts\python.exe"
) else (
  set "BACKEND_PYTHON=python"
)

echo Starting backend on http://127.0.0.1:%BACKEND_PORT%
start "Local LLM Node Lab - Backend" cmd /k "cd /d "%CD%\backend" && "%BACKEND_PYTHON%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port %BACKEND_PORT%"

echo Starting frontend on http://127.0.0.1:%FRONTEND_PORT%
start "Local LLM Node Lab - Frontend" cmd /k "cd /d "%CD%\frontend" && set VITE_BACKEND_TARGET=http://127.0.0.1:%BACKEND_PORT% && npm run dev -- --port %FRONTEND_PORT%"

echo.
echo Backend:  http://127.0.0.1:%BACKEND_PORT%
echo Frontend: http://127.0.0.1:%FRONTEND_PORT%
echo.
echo Two terminal windows were opened. Close them to stop the servers.

:end
endlocal
