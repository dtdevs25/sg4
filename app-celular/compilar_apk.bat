@echo off
chcp 65001 >nul
echo ==========================================================
echo   SG4 SST MOBILE - COMPILAR APK ASSINADO (1 CLIQUE)
echo ==========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_android_app.ps1"
echo.
pause

