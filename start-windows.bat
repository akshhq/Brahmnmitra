@echo off
echo Starting local server for BrahmnMitra...
echo.
echo Open your browser to:  http://localhost:8000
echo Press Ctrl+C in this window to stop.
echo.
cd /d "%~dp0"
python -m http.server 8000 || py -m http.server 8000
pause
