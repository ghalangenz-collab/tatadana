@echo off
:: ============================================================================
:: PASANG AUTOSTART & SHORTCUT DESKTOP TATADANA
:: Klik 2x file ini untuk memasang autostart Windows dan shortcut Desktop.
:: ============================================================================

setlocal enabledelayedexpansion
title Pemasangan Autostart TataDana

echo ======================================================================
echo             PEMASANGAN AUTOSTART & SHORTCUT TATADANA
echo ======================================================================
echo.

set "SCRIPTS_DIR=%~dp0"
if "%SCRIPTS_DIR:~-1%"=="\" set "SCRIPTS_DIR=%SCRIPTS_DIR:~0,-1%"

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "ONEDRIVE_DESKTOP=%USERPROFILE%\OneDrive\Desktop"

echo 1. Memasang script autostart ke folder Startup Windows...
if not exist "%STARTUP_DIR%" (
    mkdir "%STARTUP_DIR%" >nul 2>&1
)

copy /Y "%SCRIPTS_DIR%\TataDana-Autostart.vbs" "%STARTUP_DIR%\TataDana-Autostart.vbs" >nul
if %ERRORLEVEL% EQU 0 (
    echo    [OK] File berhasil dipasang di folder Startup:
    echo         "%STARTUP_DIR%\TataDana-Autostart.vbs"
) else (
    echo    [PERINGATAN] Gagal menyalin ke folder Startup. Pastikan izin akses tersedia.
)

echo.
echo 2. Memasang shortcut ke Desktop pengguna...
set "COPIED_DESKTOP=0"

if exist "%DESKTOP_DIR%" (
    copy /Y "%SCRIPTS_DIR%\buka-tatadana.bat" "%DESKTOP_DIR%\Buka TataDana.bat" >nul
    copy /Y "%SCRIPTS_DIR%\hentikan-tatadana.bat" "%DESKTOP_DIR%\Hentikan TataDana.bat" >nul
    if %ERRORLEVEL% EQU 0 (
        echo    [OK] Shortcut berhasil dipasang di Desktop standar:
        echo         - "%DESKTOP_DIR%\Buka TataDana.bat"
        echo         - "%DESKTOP_DIR%\Hentikan TataDana.bat"
        set "COPIED_DESKTOP=1"
    )
)

if exist "%ONEDRIVE_DESKTOP%" (
    copy /Y "%SCRIPTS_DIR%\buka-tatadana.bat" "%ONEDRIVE_DESKTOP%\Buka TataDana.bat" >nul
    copy /Y "%SCRIPTS_DIR%\hentikan-tatadana.bat" "%ONEDRIVE_DESKTOP%\Hentikan TataDana.bat" >nul
    if %ERRORLEVEL% EQU 0 (
        echo    [OK] Shortcut berhasil dipasang di OneDrive Desktop:
        echo         - "%ONEDRIVE_DESKTOP%\Buka TataDana.bat"
        echo         - "%ONEDRIVE_DESKTOP%\Hentikan TataDana.bat"
        set "COPIED_DESKTOP=1"
    )
)

if "!COPIED_DESKTOP!"=="0" (
    echo    [PERINGATAN] Folder Desktop tidak dapat ditemukan.
)

echo.
echo 3. Menjalankan server TataDana sekarang juga di background...
wscript.exe "%SCRIPTS_DIR%\tatadana-silent.vbs"

echo.
echo ======================================================================
echo                        PEMASANGAN SUKSES!
echo ======================================================================
echo.
echo Setiap kali laptop dinyalakan / di-reboot:
echo - Server TataDana akan OTOMATIS berjalan di background tanpa pop-up hitam.
echo - Fitur Warmup ("Boost 5 Menit") otomatis meng-cache halaman aplikasi.
echo - Akses localhost:3000 instan kapan saja tanpa refresh / kompilasi lama.
echo - Cukup klik 2x "Buka TataDana.bat" di Desktop Anda.
echo.
echo Jendela ini dapat Anda tutup sekarang.
pause
