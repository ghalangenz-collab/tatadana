@echo off
:: ============================================================================
:: TataDana Autostart Engine (Background Service)
:: Starts Next.js server & Telegram polling bot silently with portable Node.js
:: ============================================================================

setlocal enabledelayedexpansion

:: 1. Atur Folder Proyek dan Folder Node.js Portabel
set "PROJECT_DIR=C:\Users\Performance Edition\.gemini\antigravity\scratch\tatadana"
set "NODE_DIR=C:\Users\Performance Edition\.gemini\antigravity\scratch\tools\node-v20.18.0-win-x64"

cd /d "%PROJECT_DIR%"
set "PATH=%NODE_DIR%;%PATH%"

:: 2. Cek apakah server TataDana di port 3000 sudah berjalan (hindari false positive port 30000)
netstat -ano | findstr LISTENING | findstr /r ":3000\>" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Server TataDana sudah aktif di localhost:3000.
    goto CHECK_TELEGRAM
)

:: 3. Jalankan Next.js dev server di background (gunakan path relatif bebas kutip ganda rusak)
echo [INFO] Menjalankan server Next.js TataDana...
start "" /b cmd /c "npm.cmd run dev > scripts\tatadana-server.log 2>&1"

:CHECK_TELEGRAM
:: 4. Jalankan Telegram Bot Polling jika ada dan belum berjalan
set "TELEGRAM_PID="
for /f "tokens=*" %%p in ('powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*telegram-polling*' } | Select-Object -ExpandProperty ProcessId" 2^>nul') do (
    set "TELEGRAM_PID=%%p"
)

if not defined TELEGRAM_PID (
    if exist "scripts\telegram-polling.js" (
        echo [INFO] Menjalankan bridge Telegram Polling...
        start "" /b cmd /c "node scripts\telegram-polling.js > scripts\telegram-polling.log 2>&1"
    )
)

:: 5. Boost & Warmup: Panggil script warmup agar Next.js pre-kompilasi halaman di background
if exist "scripts\warmup.js" (
    echo [INFO] Menjalankan boost / warmup server...
    start "" /b cmd /c "node scripts\warmup.js > scripts\warmup.log 2>&1"
)

exit /b 0
