@echo off
title AquaNex AI - YOLO11 Training Pipeline
echo =====================================================================
echo                AquaNex AI - Marine Debris YOLO11 Trainer
echo =====================================================================
echo.
set EPOCHS=%1
if "%EPOCHS%"=="" set EPOCHS=5

echo [AquaNex AI] Starting training for %EPOCHS% epochs...
echo [AquaNex AI] Target weights: backend\models\best.pt
echo.

.\.venv\Scripts\python.exe backend\train_yolo11.py --epochs %EPOCHS% --model-name backend\models\best.pt

echo.
echo =====================================================================
echo  Training complete! Weights saved to backend\models\best.pt
echo =====================================================================
pause
