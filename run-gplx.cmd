@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title TDYTOOLS-GPLX Server Manager
cd /d "%~dp0"

if /i "%~1"=="start" goto CMD_START
if /i "%~1"=="stop" goto CMD_STOP
if /i "%~1"=="restart" goto CMD_RESTART
if /i "%~1"=="status" goto CMD_STATUS

:MENU
cls
echo ========================================================
echo       TDYTOOLS-GPLX - QUAN LY DEV SERVER PORT 3000
echo ========================================================
call :GET_PID
if defined PORT_PID (
    echo  [TRANG THAI] Server DANG CHAY [PID: !PORT_PID!]
    echo  [DIA CHI]    http://localhost:3000/
) else (
    echo  [TRANG THAI] Server DANG DUNG [Port 3000 trong]
)
echo ========================================================
echo  1. Bat Server [Chay dev server va mo trinh duyet]
echo  2. Tat Server [Dong dev server, giai phong port 3000]
echo  3. Khoi dong lai Server [Restart]
echo  4. Mo Web App tren trinh duyet [http://localhost:3000/]
echo  0. Thoat
echo ========================================================
set "choice="
set /p choice="Nhap lua chon [0-4]: "

if "%choice%"=="1" goto DO_START
if "%choice%"=="2" goto DO_STOP
if "%choice%"=="3" goto DO_RESTART
if "%choice%"=="4" goto DO_BROWSER
if "%choice%"=="0" exit /b 0
goto MENU

:DO_START
echo.
call :GET_PID
if defined PORT_PID (
    echo [THONG BAO] Server da dang chay tai http://localhost:3000/ [PID: !PORT_PID!]
) else (
    echo [DANG KHOI CHAY] Mo Vite dev server tai port 3000...
    start "TDYTOOLS-GPLX Dev Server" /d "%~dp0" cmd /k "npm run dev"
    ping -n 3 127.0.0.1 >nul
)
echo [MO TRINH DUYET] http://localhost:3000/
start http://localhost:3000/
echo [HOAN TAT] Server da san sang.
ping -n 2 127.0.0.1 >nul
goto MENU

:DO_STOP
echo.
call :GET_PID
if not defined PORT_PID (
    echo [THONG BAO] Khong co tien trinh nao dang chay tai port 3000.
) else (
    echo [DANG DUNG] Tat toan bo tien trinh chiem port 3000...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr /c:":3000 " ^| findstr "LISTENING"') do (
        taskkill /F /T /PID %%a >nul 2>&1
    )
    echo [THANH CONG] Da dung server va giai phong port 3000.
)
ping -n 2 127.0.0.1 >nul
goto MENU

:DO_RESTART
echo.
echo [RESTART] Dang dung server cu...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /c:":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>&1
)
ping -n 2 127.0.0.1 >nul
echo [RESTART] Dang khoi chay server moi...
start "TDYTOOLS-GPLX Dev Server" /d "%~dp0" cmd /k "npm run dev"
ping -n 3 127.0.0.1 >nul
start http://localhost:3000/
echo [THANH CONG] Server da khoi dong lai tai http://localhost:3000/
ping -n 2 127.0.0.1 >nul
goto MENU

:DO_BROWSER
echo.
echo [MO TRINH DUYET] http://localhost:3000/
start http://localhost:3000/
goto MENU

:: --- Command-line arguments ---
:CMD_START
call :GET_PID
if defined PORT_PID (
    echo [TDYTOOLS-GPLX] Server da dang chay [PID: !PORT_PID!].
) else (
    echo [TDYTOOLS-GPLX] Khoi dong server...
    start "TDYTOOLS-GPLX Dev Server" /d "%~dp0" cmd /k "npm run dev"
    ping -n 3 127.0.0.1 >nul
)
start http://localhost:3000/
exit /b 0

:CMD_STOP
call :GET_PID
if not defined PORT_PID (
    echo [TDYTOOLS-GPLX] Server khong chay.
    exit /b 0
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /c:":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>&1
)
echo [TDYTOOLS-GPLX] Da dung server port 3000.
exit /b 0

:CMD_RESTART
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /c:":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>&1
)
ping -n 2 127.0.0.1 >nul
start "TDYTOOLS-GPLX Dev Server" /d "%~dp0" cmd /k "npm run dev"
ping -n 3 127.0.0.1 >nul
start http://localhost:3000/
echo [TDYTOOLS-GPLX] Da khoi dong lai server.
exit /b 0

:CMD_STATUS
call :GET_PID
if defined PORT_PID (
    echo [TDYTOOLS-GPLX] Server DANG CHAY [PID: !PORT_PID!] tai http://localhost:3000/
) else (
    echo [TDYTOOLS-GPLX] Server DANG DUNG.
)
exit /b 0

:GET_PID
set "PORT_PID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /c:":3000 " ^| findstr "LISTENING"') do (
    set "PORT_PID=%%a"
)
exit /b
