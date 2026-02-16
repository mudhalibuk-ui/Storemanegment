
@echo off
TITLE SmartStock Pro - Auto Start Setup
COLOR 0B
cd /d "%~dp0"

echo ===================================================
echo   SMARTSTOCK PRO - STARTUP CONFIGURATION
echo ===================================================
echo.

:: 1. Check if EXE exists
if not exist "SmartStockMonitor.exe" (
    echo.
    echo [!] CILAD (ERROR): 'SmartStockMonitor.exe' lama helin!
    echo.
    echo FADLAN OGOW:
    echo 1. Waa inaad marka hore samaysaa 'Build' adigoo riixaya 'build_exe.bat'.
    echo 2. Kadib gal folder-ka cusub ee 'dist' ee samaysma.
    echo 3. Halkaas ka dhex wad file-kan 'Install_Auto_Start.bat'.
    echo.
    echo Ha wadin file-kan asagoo ku jira folder-ka 'python_bridge' ee Source-ka.
    echo Waa inuu la socdaa EXE-ga.
    echo.
    pause
    exit
)

:: 2. Check if .env exists
if not exist ".env" (
    echo [!] CILAD: File-ka '.env' lama helin!
    echo.
    echo Barnaamijku wuxuu u baahan yahay .env si uu u shaqeeyo.
    echo Fadlan 'build_exe.bat' soo isticmaal ama gacanta kusoo copy-garee.
    echo.
    pause
    exit
)

echo [1/3] Removing old settings...
schtasks /delete /tn "SmartStockMonitor" /f >nul 2>&1

echo [2/3] Configuring Auto-Start...
set "EXE_PATH=%~dp0SmartStockMonitor.exe"

:: Create Task with High Privileges
schtasks /create /tn "SmartStockMonitor" /tr "\"%EXE_PATH%\"" /sc onlogon /rl highest /f

if %errorlevel% neq 0 (
    echo.
    echo [!] FASHILANTAY (FAILED):
    echo Fadlan file-kan "Right-Click" ku dheh, kadibna dooro
    echo "Run as Administrator".
    pause
    exit
)

echo [3/3] Starting Service Now...
start "" "SmartStockMonitor.exe"

echo.
echo ===================================================
echo   GUUL! (SUCCESS)
echo   SmartStockMonitor hadda toos ayuu u shaqaynayaa.
echo   Wuxuu qaadan karaa 20 ilbiriqsi inuu bilaabo.
echo ===================================================
timeout /t 10
