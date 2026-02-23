import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// قراءة الإعدادات من متغيرات البيئة (مطلوبة — لا توجد قيم افتراضية)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// التحقق من وجود الإعدادات المطلوبة — تحذير فقط أثناء البناء الثابت
const requiredKeys = ['apiKey', 'databaseURL', 'projectId'] as const;
if (typeof window !== 'undefined') {
  for (const key of requiredKeys) {
    if (!firebaseConfig[key]) {
      throw new Error(
        `⚠️ Firebase: متغير البيئة NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()} مطلوب. ` +
        'أنشئ ملف .env.local من .env.example وأضف القيم.'
      );
    }
  }
}

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize services
export const database: Database = getDatabase(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

// Restaurant ID constant - يمكن تغييره من متغيرات البيئة
export const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'sham-coffee-1';

export default app;





