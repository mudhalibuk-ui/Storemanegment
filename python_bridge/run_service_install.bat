
@echo off
TITLE SmartStock Pro - Service Installer
COLOR 0A

echo ===================================================
echo   SMARTSTOCK PRO - BACKGROUND SERVICE SETUP
echo ===================================================
echo.
echo This script will help you run the Python Monitor automatically
echo when the computer starts, without opening a window.
echo.

:CHOICE
echo [1] Run Automatically via Task Scheduler (Recommended)
echo [2] Run Manually Now (Testing)
echo.
set /p c=Dooro 1 ama 2: 

if "%c%"=="1" goto INSTALL
if "%c%"=="2" goto RUN
goto CHOICE

:INSTALL
echo.
echo Installing 'SmartStockMonitor' task...
echo.
:: Get current directory
set "SCRIPT_DIR=%~dp0"
set "PYTHON_EXE=python" 

:: Create a VBS script wrapper to hide the console window
echo Set WshShell = CreateObject("WScript.Shell") > launch_invisible.vbs
echo WshShell.Run chr(34) ^& "%SCRIPT_DIR%advanced_monitor.py" ^& chr(34), 0 >> launch_invisible.vbs
echo Set WshShell = Nothing >> launch_invisible.vbs

:: Create the Task
schtasks /create /tn "SmartStockMonitor" /tr "wscript.exe \"%SCRIPT_DIR%launch_invisible.vbs\"" /sc onstart /rl highest /f

if %errorlevel% equ 0 (
    echo.
    echo ✅ GUUL! Adeega waa la rakibay.
    echo Kumbuyuutarka marka uu kaco, toos ayuu u shaqayn doonaa.
    echo Si aad hada u tijaabiso, restart garee kombiyuutarka ama ku qor:
    echo schtasks /run /tn "SmartStockMonitor"
) else (
    echo.
    echo ❌ CILAD: Fadlan "Run as Administrator" ku fur file-kan.
)
pause
exit

:RUN
python advanced_monitor.py
pause
