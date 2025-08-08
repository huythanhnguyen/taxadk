@echo off
echo ============================================================
echo HTKK AI - Testing ADK CLI
echo ============================================================

echo Setting up environment...
set PYTHONPATH=%CD%
echo PYTHONPATH: %PYTHONPATH%
echo Working directory: %CD%

echo.
echo Starting ADK CLI server...
echo ADK Web UI: http://localhost:8080
echo.

python -m google.adk run --port 8080
