@echo off
:: ============================================================================
:: Hentikan TataDana - Shutdown Utility
:: Mematikan server localhost:3000 dan Telegram polling bridge dengan bersih.
:: ============================================================================

setlocal enabledelayedexpansion
title Hentikan TataDana Server

echo ======================================================================
echo                  MENGHENTIKAN SERVER TATADANA
echo ======================================================================
echo.

set "KILLED=0"

:: 1. Cari PID yang sedang mendengarkan port 3000 (menggunakan regex batas kata :3000)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr /r ":3000\>"') do (
    set "PORT_PID=%%a"
    if defined PORT_PID (
        echo [INFO] Menemukan server aktif di port 3000 (PID: !PORT_PID!)
        taskkill /F /T /PID !PORT_PID! >nul 2>&1
        if !ERRORLEVEL% EQU 0 (
            echo [OK] Proses server port 3000 berhasil dihentikan.
            set "KILLED=1"
        )
    )
)

:: 2. Hentikan sisa proses node terkait spesifik proyek TataDana
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Caption -eq 'node.exe') -and ($_.CommandLine -like '*tatadana*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Write-Output ('[OK] Menghentikan proses background: ' + $_.ProcessId) }" 2>nul

echo.
if "!KILLED!"=="1" (
    echo [SUKSES] Semua layanan background TataDana telah berhasil dihentikan!
) else (
    echo [INFO] Layanan TataDana sedang tidak aktif atau sudah berhenti.
)
echo.
echo Jendela ini akan tertutup otomatis dalam 3 detik...
timeout /t 3 >nul
exit /b 0
