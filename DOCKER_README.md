# دليل Docker و Firebase Hosting
# Docker & Firebase Hosting Guide

## المتطلبات | Requirements

1. **Docker Desktop**: https://docs.docker.com/get-docker/
2. **Firebase CLI** (اختياري للنشر المباشر):
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

---

## التشغيل السريع | Quick Start

### الطريقة 1: استخدام المدير التفاعلي
```cmd
docker-manager.cmd
```

### الطريقة 2: الأوامر المباشرة

#### تشغيل التطبيق محلياً
```bash
docker compose up -d admin-app
```
التطبيق سيعمل على: http://localhost:3000

#### إيقاف التطبيق
```bash
docker compose down
```

---

## النشر على Firebase Hosting | Deploy to Firebase

### الطريقة 1: سكربت النشر الآلي
```cmd
docker-deploy.cmd
```

### الطريقة 2: يدوياً
```bash
# بناء التطبيق
docker compose --profile deploy build firebase-deploy

# استخراج الملفات
docker create --name temp sham-coffee-firebase-deploy
docker cp temp:/app/build admin-next/build
docker rm temp

# النشر
firebase deploy --only hosting
```

---

## إدارة البيانات | Data Management

### نسخ احتياطي
```bash
# عبر Docker
docker compose --profile backup run --rm backup-service

# أو مباشرة
cd admin-next
npm run backup
```

### استعادة البيانات
```bash
# عبر Docker
docker compose --profile restore run --rm restore-service

# أو مباشرة
cd admin-next
npm run restore
```

### نقل البيانات
```bash
cd admin-next

# تصدير كل البيانات
npm run migrate export ./all-data.json

# استيراد من ملف
npm run migrate import ./all-data.json

# استيراد من مجلد backup
npm run migrate import ../firebase-backups/2026-01-23_08-22-47/

# نسخ احتياطي قبل أي عملية
npm run migrate backup
```

---

## متغيرات البيئة | Environment Variables

انسخ `.env.example` إلى `.env` وعدّل القيم:

```env
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=your-project
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## الهيكل | Structure

```
sham-coffee/
├── docker-compose.yml      # تكوين Docker
├── docker-deploy.cmd       # سكربت النشر
├── docker-manager.cmd      # المدير التفاعلي
├── .env.example            # نموذج متغيرات البيئة
├── admin-next/
│   ├── Dockerfile          # بناء الصورة
│   ├── .dockerignore       # ملفات مستثناة
│   └── scripts/
│       ├── backup-firebase.js   # نسخ احتياطي
│       ├── restore-firebase.js  # استعادة
│       └── migrate-data.js      # نقل البيانات
└── firebase-backups/       # النسخ الاحتياطية
```

---

## استكشاف الأخطاء | Troubleshooting

### خطأ: Docker غير متصل
```bash
# تأكد من تشغيل Docker Desktop
docker ps
```

### خطأ: فشل البناء
```bash
# إعادة بناء بدون cache
docker compose build --no-cache
```

### خطأ: Firebase Deploy
```bash
# تأكد من تسجيل الدخول
firebase login

# تحقق من المشروع
firebase projects:list
```

---

## الأوامر المرجعية | Command Reference

| الأمر | الوصف |
|-------|-------|
| `docker compose up -d` | تشغيل الخدمات |
| `docker compose down` | إيقاف الخدمات |
| `docker compose logs -f` | عرض السجلات |
| `docker compose build` | بناء الصور |
| `docker compose ps` | عرض حالة الخدمات |
