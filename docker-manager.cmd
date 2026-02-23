@echo off
REM ====================================
REM Docker Runner Script - Sham Coffee
REM سكربت تشغيل Docker لقهوة الشام
REM ====================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║       Sham Coffee Docker Manager                       ║
echo ║       مدير Docker لقهوة الشام                          ║
echo ╚════════════════════════════════════════════════════════╝
echo.

if "%1"=="" goto menu
goto %1

:menu
echo اختر العملية المطلوبة:
echo.
echo   [1] تشغيل التطبيق (Start App)
echo   [2] إيقاف التطبيق (Stop App)
echo   [3] بناء ونشر على Firebase (Build ^& Deploy)
echo   [4] نسخ احتياطي (Backup Data)
echo   [5] استعادة البيانات (Restore Data)
echo   [6] تصدير البيانات (Export Data)
echo   [7] استيراد البيانات (Import Data)
echo   [8] عرض Logs
echo   [9] إعادة بناء (Rebuild)
echo   [0] خروج (Exit)
echo.
set /p choice="اختيارك: "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto deploy
if "%choice%"=="4" goto backup
if "%choice%"=="5" goto restore
if "%choice%"=="6" goto export
if "%choice%"=="7" goto import
if "%choice%"=="8" goto logs
if "%choice%"=="9" goto rebuild
if "%choice%"=="0" goto end
goto menu

:start
echo.
echo 🚀 جاري تشغيل التطبيق...
docker compose up -d admin-app
if errorlevel 1 (
    echo ❌ فشل في التشغيل
    goto end
)
echo.
echo ✅ التطبيق يعمل على: http://localhost:3000
echo.
pause
goto menu

:stop
echo.
echo 🛑 جاري إيقاف التطبيق...
docker compose down
echo ✅ تم الإيقاف
echo.
pause
goto menu

:deploy
echo.
echo 🔨 جاري البناء والنشر...
call docker-deploy.cmd
pause
goto menu

:backup
echo.
echo 📦 جاري النسخ الاحتياطي...
docker compose --profile backup run --rm backup-service
echo ✅ تم النسخ الاحتياطي في مجلد firebase-backups
echo.
pause
goto menu

:restore
echo.
echo 📥 استعادة البيانات...
echo المجلدات المتاحة:
dir /b firebase-backups 2>nul
echo.
set /p backup_folder="أدخل اسم المجلد (أو اضغط Enter لأحدث نسخة): "
if "%backup_folder%"=="" set backup_folder=latest
set BACKUP_FOLDER=%backup_folder%
docker compose --profile restore run --rm restore-service
echo.
pause
goto menu

:export
echo.
echo 📤 تصدير البيانات...
cd admin-next
npm run migrate -- export
cd ..
echo.
pause
goto menu

:import
echo.
echo 📥 استيراد البيانات...
set /p import_path="أدخل مسار الملف أو المجلد: "
cd admin-next
npm run migrate -- import "%import_path%"
cd ..
echo.
pause
goto menu

:logs
echo.
echo 📋 عرض Logs (اضغط Ctrl+C للخروج)...
docker compose logs -f admin-app
goto menu

:rebuild
echo.
echo 🔄 إعادة بناء الصور...
docker compose build --no-cache
echo ✅ تم إعادة البناء
echo.
pause
goto menu

:end
echo.
echo 👋 مع السلامة!
exit /b 0
