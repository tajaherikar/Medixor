@echo off
title Medixor - Medical Inventory System
color 0A

echo.
echo ========================================
echo   Medixor
echo   Medical Inventory Management System
echo ========================================
echo.
echo   Opening Medixor in your browser...
echo.
echo ========================================
echo.

:: Open the Vercel app
start https://medixor.vercel.app/

echo.
echo App opened in your default browser!
echo.
echo If the browser didn't open, go to:
echo https://medixor.vercel.app/
echo.

timeout /t 3 /nobreak >nul
exit
