# ====================================
# Dockerfile for Sham Coffee Admin
# نظام إدارة قهوة الشام
# ====================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# إضافة الأدوات اللازمة
RUN apk add --no-cache libc6-compat

# نسخ ملفات الحزم
COPY package.json package-lock.json* ./

# تثبيت جميع المكتبات (بما فيها devDependencies للبناء)
RUN npm ci

# ====================================
# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# نسخ المكتبات من المرحلة السابقة
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# متغيرات البيئة للبناء
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Firebase env vars (passed as build args, baked into static export)
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_DATABASE_URL
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_DATABASE_URL=$NEXT_PUBLIC_FIREBASE_DATABASE_URL
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

# بناء التطبيق
RUN npm run build

# ====================================
# Stage 3: Production Runner (Static Server)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# تثبيت serve لتقديم الملفات الثابتة
RUN npm install -g serve

# إنشاء مستخدم غير root للأمان
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# نسخ ملفات البناء الثابتة
COPY --from=builder --chown=nextjs:nodejs /app/build ./build
COPY --from=builder --chown=nextjs:nodejs /app/serve.json ./serve.json

USER nextjs

EXPOSE 3000

ENV PORT=3000

# تشغيل serve مع ملف الإعدادات
CMD ["serve", "-c", "serve.json", "-l", "3000"]

# ====================================
# Stage 4: Firebase Hosting Build (Static Export)
FROM node:20-alpine AS firebase-builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# متغيرات Firebase
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_DATABASE_URL
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_DATABASE_URL=$NEXT_PUBLIC_FIREBASE_DATABASE_URL
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# بناء التطبيق للتصدير الثابت
RUN npm run build

# ====================================
# مرحلة Firebase CLI للنشر
FROM node:20-alpine AS deployer
WORKDIR /app

# تثبيت Firebase CLI
RUN npm install -g firebase-tools

# نسخ ملفات البناء
COPY --from=firebase-builder /app/build ./build
COPY firebase.json ./

# النشر يتم عبر الأوامر التالية
# firebase login --no-localhost
# firebase deploy --only hosting
