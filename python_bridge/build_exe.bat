
@echo off
TITLE SmartStock Pro - Build EXE (Debug Mode)
COLOR 0A
cd /d "%~dp0"

echo.
echo ===================================================
echo   SMARTSTOCK PRO - BUILD TOOL (DEBUG MODE)
echo ===================================================
echo.
echo  Step 1: Hubinta Python...
echo.

set "PYTHON_CMD="

python --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
    echo    [OK] Python command found.
    goto SETUP_ENV
)

py --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py"
    echo    [OK] Python Launcher (py) found.
    goto SETUP_ENV
)

echo.
echo [!] CILAD: Python kombuyuutarkaaga kama jiro.
pause
exit

:SETUP_ENV
echo.
echo  Step 2: Rakibida Library-yada (Showing Output)...
echo.
:: Removed >nul to show errors if pip fails
%PYTHON_CMD% -m pip install --upgrade pip
%PYTHON_CMD% -m pip install pyinstaller -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [!] CILAD: Pip install wuu fashilmay.
    echo Fadlan hubi fariimaha kor ku qoran.
    pause
    exit
)
echo    [OK] Libraries installed.

echo.
echo  Step 3: Dhismaha EXE (Building)...
echo.

if not exist "advanced_monitor.py" (
    echo [!] CILAD: 'advanced_monitor.py' lama helin!
    pause
    exit
)

:: Added --clean and specific hidden imports to prevent failures
%PYTHON_CMD% -m PyInstaller --noconfirm --clean --onefile --noconsole --name "SmartStockMonitor" --hidden-import=zk --hidden-import=supabase --hidden-import=flask --hidden-import=flask_cors --hidden-import=dotenv --hidden-import=schedule advanced_monitor.py

if %errorlevel% neq 0 (
    echo.
    echo [!] CILAD: PyInstaller wuu fashilmay.
    echo Fadlan hubi fariimaha guduudan ee kor ku qoran.
    pause
    exit
)

echo.
echo  Step 4: Habaynta Folder-ka 'dist'...

if not exist "dist" mkdir dist

if exist ".env" (
    copy /Y ".env" "dist\.env" >nul
    echo    [OK] .env copied.
) else (
    echo    [!] DIGNIIN: File-ka .env lama helin!
)

echo    [..] Generating Auto-Start Script...
(
echo @echo off
echo TITLE SmartStock Pro - Auto Start
echo COLOR 0A
echo cd /d "%%~dp0"
echo echo.
echo echo ==========================================
echo echo   INSTALLING SMARTSTOCK SERVICE
echo echo ==========================================
echo echo.
echo if not exist "SmartStockMonitor.exe" ^(
echo     echo [!] CILAD: SmartStockMonitor.exe lama helin!
echo     pause
echo     exit
echo ^)
echo echo [1/2] Creating Auto-Start Task...
echo schtasks /create /tn "SmartStockMonitor" /tr "\"%%~dp0SmartStockMonitor.exe\"" /sc onlogon /rl highest /f
echo if %%errorlevel%% neq 0 ^(
echo     echo.
echo     echo [!] FAILED: Fadlan 'Run as Administrator' ku fur file-kan.
echo     pause
echo     exit
echo ^)
echo echo.
echo echo [2/2] Starting Service Now...
echo start "" "SmartStockMonitor.exe"
echo echo.
echo echo [OK] GUUL! Adeegga waa la rakibay oo wuu shaqaynayaa.
echo timeout /t 10
) > "dist\Install_Auto_Start.bat"

echo.
echo ===================================================
echo   GUUL! (SUCCESS)
echo ===================================================
echo.
timeout /t 5 >nul
start "" "dist"
pause
