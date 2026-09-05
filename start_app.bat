@echo off
title AquaNex AI - Marine Intelligence Platform
echo =====================================================================
echo               AquaNex AI - Marine Intelligence Platform
echo =====================================================================
echo.
echo Launching AquaNex AI FastAPI Server & Web App on http://127.0.0.1:8000 ...
echo Opening your web browser...
start http://127.0.0.1:8000/
echo.
.\.venv\Scripts\python.exe backend\main.py
pause
