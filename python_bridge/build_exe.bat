
@echo off
TITLE SmartStock Pro - Build EXE
COLOR 0B
cd /d "%~dp0"

echo ===================================================
echo   BUILDING SMARTSTOCK SERVICE EXECUTABLE
echo ===================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python not found. Please install Python first.
    pause
    exit
)

:: Install PyInstaller
echo [1/3] Installing PyInstaller...
pip install pyinstaller
pip install -r requirements.txt

:: Build EXE
echo.
echo [2/3] Building EXE (This may take a minute)...
echo.
pyinstaller --noconfirm --onefile --noconsole --name "SmartStockMonitor" --icon "NONE" advanced_monitor.py

:: Cleanup
echo.
echo [3/3] Cleaning up build files...
rmdir /s /q build
del /q SmartStockMonitor.spec

echo.
echo ===================================================
echo   SUCCESS!
echo   Your .exe file is located in the "dist" folder.
echo   Copy "dist\SmartStockMonitor.exe" and ".env"
echo   to the new computer.
echo ===================================================
pause
