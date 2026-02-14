
@echo off
TITLE SmartStock Pro - Service Manager
COLOR 0A
cd /d "%~dp0"

echo ===================================================
echo   SMARTSTOCK PRO - BACKGROUND SERVICE MANAGER
echo ===================================================
echo.
echo  Folder: %~dp0
echo.

:CHECK_PYTHON
:: Check for python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
    goto MAIN_MENU
)

:: Check for py launcher if python command fails
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py"
    goto MAIN_MENU
)

echo [!] CILAD: Python kombuyuutarkaaga kama jiro ama Path-ka kuma jiro.
echo Fadlan soo degso Python (Add to PATH) ka hor inta aadan wadin.
echo.
echo Riix fure kasta si aad uga baxdo...
pause >nul
exit

:MAIN_MENU
echo Python found: %PYTHON_CMD%
echo.

:CHOICE
echo.
echo  [1] Rakib oo Ka-dhex-shid Background-ka (Install & Start)
echo      (Wuxuu ku darayaa Task Scheduler si uu mar walba u shaqeeyo)
echo.
echo  [2] Gacanta ku shid (Debug Mode)
echo      (Wuxuu furayaa daaqad madow si aad u aragto hadii cilad jirto)
echo.
echo  [3] Rakib Library-yada (Install Requirements)
echo      (Dooro tan marka ugu horeysa aad isticmaalayso)
echo.
echo  [4] Jooji Adeegga (Stop Service)
echo.
echo  [5] Ka bax (Exit)
echo.
set /p c=Dooro lambarka (1-5): 

if "%c%"=="1" goto INSTALL
if "%c%"=="2" goto RUN
if "%c%"=="3" goto DEPS
if "%c%"=="4" goto STOP
if "%c%"=="5" exit
goto CHOICE

:DEPS
echo.
echo  Wuxuu rakibayaa maktabadaha (libraries)...
%PYTHON_CMD% -m pip install -r requirements.txt
if %errorlevel% neq 0 goto DEPS_FAIL

echo.
echo  [OK] Guul! Wax walba waa la rakibay.
pause
goto CHOICE

:DEPS_FAIL
echo.
echo [!] CILAD: Internet-kaaga hubi ama Python setup-kaaga.
pause
goto CHOICE

:INSTALL
echo.
echo  Wuxuu sameynayaa 'SmartStockMonitor' Task...
echo.
set "SCRIPT_DIR=%~dp0"

:: Create the Task pointing to the start_background.vbs
:: Using a label jump instead of parenthesis block to prevent syntax crashes with paths
schtasks /create /tn "SmartStockMonitor" /tr "wscript.exe \"%SCRIPT_DIR%start_background.vbs\"" /sc onstart /rl highest /f

if %errorlevel% neq 0 goto INSTALL_FAIL

echo.
echo  [OK] GUUL! Adeegga waa la rakibay.
echo  Kumbuyuutarka marka uu kaco, toos ayuu u shaqayn doonaa.
echo.
echo  Hadda ayuu kacayaa (Starting now)...
schtasks /run /tn "SmartStockMonitor"
echo.
echo  Adeeggu gadaal ayuu ka shaqaynayaa (Background).
pause
goto CHOICE

:INSTALL_FAIL
echo.
echo [!] CILAD: Fadlan "Run as Administrator" ku fur file-kan.
pause
goto CHOICE

:RUN
echo.
echo ---------------------------------------------------
echo  Hadda wuxuu u shaqaynayaa si toos ah (Console Mode)
echo  Haddii aad xirto daaqadan, wuu istaagayaa.
echo  Riix Ctrl+C si aad u joojiso.
echo ---------------------------------------------------
echo.
%PYTHON_CMD% advanced_monitor.py
pause
goto CHOICE

:STOP
echo.
echo  Waxaa la joojinayaa adeegga...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq SmartStock*" >nul 2>&1
taskkill /F /FI "IMAGENAME eq python.exe" >nul 2>&1
echo  [OK] Waa la joojiyay wixii Python ah ee shaqaynayay.
pause
goto CHOICE
