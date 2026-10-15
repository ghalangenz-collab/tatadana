@echo off
:: ============================================================================
:: Buka TataDana - 1-Click Launcher untuk Pengguna
:: Membuka localhost:3000 di browser. Menjalankan server otomatis jika belum aktif.
:: ============================================================================

setlocal
title Membuka TataDana...

set "PROJECT_DIR=C:\Users\Performance Edition\.gemini\antigravity\scratch\tatadana"
cd /d "%PROJECT_DIR%"

:: 1. Cek apakah server sudah aktif di port 3000
netstat -ano | findstr LISTENING | findstr /r ":3000\>" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Server TataDana sudah aktif di localhost:3000. Membuka browser...
    start http://localhost:3000
    exit /b 0
)

:: 2. Jika belum aktif, nyalakan secara background lewat silent VBS
echo [INFO] Server belum aktif. Memulai server TataDana di background...
if exist "%PROJECT_DIR%\scripts\tatadana-silent.vbs" (
    wscript.exe "%PROJECT_DIR%\scripts\tatadana-silent.vbs"
) else (
    start "" /b cmd /c "%PROJECT_DIR%\scripts\autostart-tatadana.bat"
)

:: 3. Tunggu hingga port 3000 aktif sebelum membuka browser (hingga 30 detik)
set /a attempts=0
:WAIT_PORT
set /a attempts+=1
timeout /t 1 /nobreak >nul
netstat -ano | findstr LISTENING | findstr /r ":3000\>" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto READY
if %attempts% LSS 30 goto WAIT_PORT

echo [PERINGATAN] Server Next.js membutuhkan waktu lebih lama untuk inisialisasi.
echo Membuka browser... Jika belum muncul, tunggu beberapa saat lalu refresh (F5).
start http://localhost:3000
exit /b 0

:READY
echo [OK] Server siap! Membuka TataDana di browser...
start http://localhost:3000
exit /b 0
