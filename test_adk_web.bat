@echo off
echo ============================================================
echo HTKK AI - ADK Web Native Test
echo ============================================================

echo Checking agents directory...
if not exist "agents\backend\agent.py" (
    echo ERROR: agents\backend\agent.py not found
    pause
    exit /b 1
)

echo ✅ Agents directory structure OK

echo.
echo Starting ADK Web server...
echo ADK Web UI: http://localhost:8080
echo FastAPI included via ADK Web native
echo.

adk web --host 0.0.0.0 --port 8080 --reload --verbose agents
