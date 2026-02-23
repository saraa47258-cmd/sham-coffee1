@echo off
REM ====================================
REM Deploy to Firebase Hosting via Docker
REM نشر على Firebase Hosting باستخدام Docker
REM ====================================

echo.
echo ╔════════════════════════════════════════════╗
echo ║   Sham Coffee - Firebase Docker Deploy     ║
echo ║   نشر قهوة الشام على Firebase              ║
echo ╚════════════════════════════════════════════╝
echo.

REM التحقق من Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker غير مثبت. الرجاء تثبيت Docker أولاً
    echo    https://docs.docker.com/get-docker/
    exit /b 1
)

echo 📦 الخطوة 1: بناء التطبيق في Docker...
echo.

cd /d "%~dp0"

REM بناء صورة Docker
docker build -t sham-coffee-build -f admin-next/Dockerfile --target firebase-builder admin-next

if errorlevel 1 (
    echo ❌ فشل في بناء Docker Image
    exit /b 1
)

echo.
echo ✅ تم البناء بنجاح!
echo.

echo 📂 الخطوة 2: استخراج ملفات البناء...
echo.

REM إنشاء container مؤقت ونسخ الملفات
docker create --name sham-temp sham-coffee-build
docker cp sham-temp:/app/build admin-next/build
docker rm sham-temp

echo ✅ تم استخراج الملفات إلى admin-next/build
echo.

echo 🚀 الخطوة 3: النشر على Firebase...
echo.

REM التحقق من Firebase CLI
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Firebase CLI غير مثبت
    echo    تثبيت: npm install -g firebase-tools
    echo.
    echo    بعد التثبيت، قم بتسجيل الدخول:
    echo    firebase login
    echo.
    echo    ثم النشر:
    echo    firebase deploy --only hosting
    exit /b 0
)

REM النشر
firebase deploy --only hosting

if errorlevel 1 (
    echo ❌ فشل في النشر
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════╗
echo ║   ✅ تم النشر بنجاح!                       ║
echo ║   🌐 https://sham-coffee.web.app          ║
echo ╚════════════════════════════════════════════╝
echo.

pause
