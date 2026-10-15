@echo off
:: ============================================================================
:: HAPUS AUTOSTART & SHORTCUT DESKTOP TATADANA
:: Menghapus script dari folder Startup dan shortcut dari Desktop.
:: ============================================================================

setlocal
title Hapus Autostart TataDana

echo ======================================================================
echo              HAPUS AUTOSTART & SHORTCUT DESKTOP TATADANA
echo ======================================================================
echo.

set "STARTUP_FILE=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\TataDana-Autostart.vbs"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "ONEDRIVE_DESKTOP=%USERPROFILE%\OneDrive\Desktop"

if exist "%STARTUP_FILE%" (
    del /f /q "%STARTUP_FILE%" >nul 2>&1
    echo [OK] File autostart di folder Startup berhasil dihapus.
) else (
    echo [INFO] File autostart tidak ditemukan di folder Startup.
)

if exist "%DESKTOP_DIR%\Buka TataDana.bat" (
    del /f /q "%DESKTOP_DIR%\Buka TataDana.bat" >nul 2>&1
    echo [OK] Shortcut "Buka TataDana.bat" berhasil dihapus dari Desktop.
)

if exist "%DESKTOP_DIR%\Hentikan TataDana.bat" (
    del /f /q "%DESKTOP_DIR%\Hentikan TataDana.bat" >nul 2>&1
    echo [OK] Shortcut "Hentikan TataDana.bat" berhasil dihapus dari Desktop.
)

if exist "%ONEDRIVE_DESKTOP%\Buka TataDana.bat" (
    del /f /q "%ONEDRIVE_DESKTOP%\Buka TataDana.bat" >nul 2>&1
    echo [OK] Shortcut "Buka TataDana.bat" berhasil dihapus dari OneDrive Desktop.
)

if exist "%ONEDRIVE_DESKTOP%\Hentikan TataDana.bat" (
    del /f /q "%ONEDRIVE_DESKTOP%\Hentikan TataDana.bat" >nul 2>&1
    echo [OK] Shortcut "Hentikan TataDana.bat" berhasil dihapus dari OneDrive Desktop.
)

echo.
echo Menjalankan script penghentian server jika masih aktif...
call "%~dp0hentikan-tatadana.bat"

echo.
echo [SELESAI] Konfigurasi autostart dan shortcut telah dibersihkan.
pause
