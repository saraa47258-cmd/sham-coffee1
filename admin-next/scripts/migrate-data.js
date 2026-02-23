/**
 * Firebase Data Migration Script
 * سكربت نقل وتخزين البيانات في Firebase
 * 
 * الاستخدام:
 *   node scripts/migrate-data.js
 *   node scripts/migrate-data.js --backup-first
 *   node scripts/migrate-data.js --from-file ./data.json
 * 
 * هذا السكربت يقوم بـ:
 * 1. نسخ احتياطي للبيانات الحالية (اختياري)
 * 2. تحميل البيانات من ملف أو مصدر آخر
 * 3. تخزين البيانات في Firebase Realtime Database
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ====================================
// الإعدادات
// ====================================

const CONFIG = {
  DATABASE_URL: process.env.FIREBASE_DATABASE_URL || 'https://sham-coffee-default-rtdb.firebaseio.com',
  RESTAURANT_ID: process.env.RESTAURANT_ID || 'sham-coffee-1',
  AUTH_TOKEN: process.env.FIREBASE_AUTH_TOKEN || null, // للكتابة تحتاج token
};

// المجموعات المدعومة
const COLLECTIONS = [
  'orders',
  'menu',
  'categories',
  'workers',
  'tables',
  'rooms',
  'daily_closings',
  'invoices',
];

// ====================================
// دوال المساعدة
// ====================================

function log(message, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    loading: '🔄',
  };
  console.log(`${icons[type] || ''} ${message}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ====================================
// قراءة البيانات من Firebase
// ====================================

function fetchFromFirebase(collection) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.DATABASE_URL}/restaurant-system/${collection}/${CONFIG.RESTAURANT_ID}.json`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// ====================================
// كتابة البيانات إلى Firebase
// ====================================

function writeToFirebase(collection, data) {
  return new Promise((resolve, reject) => {
    const urlPath = `/restaurant-system/${collection}/${CONFIG.RESTAURANT_ID}.json`;
    const urlParsed = new URL(CONFIG.DATABASE_URL);
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlParsed.hostname,
      port: 443,
      path: urlPath,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ====================================
// نسخ احتياطي سريع
// ====================================

async function backupCurrent() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFolder = path.join(__dirname, '..', 'backups', `pre-migration-${timestamp}`);
  
  ensureDir(backupFolder);
  
  log(`Creating backup to ${backupFolder}`, 'loading');
  
  for (const collection of COLLECTIONS) {
    try {
      const data = await fetchFromFirebase(collection);
      if (data) {
        const filePath = path.join(backupFolder, `${collection}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        log(`Backed up ${collection}`, 'success');
      }
    } catch (err) {
      log(`Failed to backup ${collection}: ${err.message}`, 'warning');
    }
  }
  
  return backupFolder;
}

// ====================================
// استيراد من ملف JSON
// ====================================

async function importFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  log(`Importing data from ${filePath}`, 'loading');
  
  // إذا كان الملف يحتوي على مجموعات متعددة
  if (data.collections) {
    for (const [collection, collectionData] of Object.entries(data.collections)) {
      if (COLLECTIONS.includes(collection)) {
        try {
          await writeToFirebase(collection, collectionData);
          log(`Imported ${collection} (${Object.keys(collectionData || {}).length} records)`, 'success');
        } catch (err) {
          log(`Failed to import ${collection}: ${err.message}`, 'error');
        }
      }
    }
  } else {
    // إذا كان الملف يحتوي على مجموعة واحدة
    const collectionName = path.basename(filePath, '.json');
    if (COLLECTIONS.includes(collectionName)) {
      try {
        await writeToFirebase(collectionName, data);
        log(`Imported ${collectionName}`, 'success');
      } catch (err) {
        log(`Failed to import ${collectionName}: ${err.message}`, 'error');
      }
    }
  }
}

// ====================================
// استيراد من مجلد backup
// ====================================

async function importFromBackupFolder(backupFolder) {
  if (!fs.existsSync(backupFolder)) {
    throw new Error(`Backup folder not found: ${backupFolder}`);
  }
  
  log(`Importing from backup folder: ${backupFolder}`, 'loading');
  
  for (const collection of COLLECTIONS) {
    const filePath = path.join(backupFolder, `${collection}.json`);
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        await writeToFirebase(collection, data);
        const count = typeof data === 'object' ? Object.keys(data).length : 0;
        log(`Imported ${collection} (${count} records)`, 'success');
      } catch (err) {
        log(`Failed to import ${collection}: ${err.message}`, 'error');
      }
    }
  }
}

// ====================================
// نقل البيانات بين مشاريع Firebase
// ====================================

async function migrateToProject(targetUrl, targetRestaurantId) {
  log('Starting migration to target project...', 'loading');
  
  for (const collection of COLLECTIONS) {
    try {
      // قراءة من المصدر
      const data = await fetchFromFirebase(collection);
      
      if (data) {
        // كتابة إلى الهدف
        const targetConfig = { ...CONFIG };
        CONFIG.DATABASE_URL = targetUrl;
        CONFIG.RESTAURANT_ID = targetRestaurantId;
        
        await writeToFirebase(collection, data);
        
        // إعادة الإعدادات
        CONFIG.DATABASE_URL = targetConfig.DATABASE_URL;
        CONFIG.RESTAURANT_ID = targetConfig.RESTAURANT_ID;
        
        const count = typeof data === 'object' ? Object.keys(data).length : 0;
        log(`Migrated ${collection} (${count} records)`, 'success');
      }
    } catch (err) {
      log(`Failed to migrate ${collection}: ${err.message}`, 'error');
    }
  }
}

// ====================================
// تصدير البيانات إلى ملف
// ====================================

async function exportToFile(outputPath) {
  ensureDir(path.dirname(outputPath));
  
  log('Exporting all data to file...', 'loading');
  
  const exportData = {
    exportDate: new Date().toISOString(),
    restaurantId: CONFIG.RESTAURANT_ID,
    collections: {},
  };
  
  for (const collection of COLLECTIONS) {
    try {
      const data = await fetchFromFirebase(collection);
      if (data) {
        exportData.collections[collection] = data;
        const count = typeof data === 'object' ? Object.keys(data).length : 0;
        log(`Exported ${collection} (${count} records)`, 'success');
      }
    } catch (err) {
      log(`Failed to export ${collection}: ${err.message}`, 'warning');
    }
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
  log(`Data exported to: ${outputPath}`, 'success');
  
  return outputPath;
}

// ====================================
// الدالة الرئيسية
// ====================================

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Firebase Data Migration Tool             ║');
  console.log('║   أداة نقل بيانات Firebase                 ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  
  const args = process.argv.slice(2);
  
  // تحليل الأوامر
  const command = args[0] || 'help';
  
  try {
    switch (command) {
      case 'backup':
        const backupPath = await backupCurrent();
        log(`Backup created at: ${backupPath}`, 'success');
        break;
        
      case 'export':
        const exportPath = args[1] || path.join(__dirname, '..', 'exports', `export-${Date.now()}.json`);
        await exportToFile(exportPath);
        break;
        
      case 'import':
        const importPath = args[1];
        if (!importPath) {
          log('Usage: node migrate-data.js import <file-or-folder>', 'error');
          process.exit(1);
        }
        
        const stats = fs.statSync(importPath);
        if (stats.isDirectory()) {
          await importFromBackupFolder(importPath);
        } else {
          await importFromFile(importPath);
        }
        break;
        
      case 'migrate':
        const targetUrl = args[1];
        const targetId = args[2] || CONFIG.RESTAURANT_ID;
        if (!targetUrl) {
          log('Usage: node migrate-data.js migrate <target-database-url> [restaurant-id]', 'error');
          process.exit(1);
        }
        
        // نسخ احتياطي أولاً
        await backupCurrent();
        await migrateToProject(targetUrl, targetId);
        break;
        
      case 'help':
      default:
        console.log('الاستخدام:');
        console.log('');
        console.log('  node migrate-data.js backup');
        console.log('      نسخ احتياطي للبيانات الحالية');
        console.log('');
        console.log('  node migrate-data.js export [output-file]');
        console.log('      تصدير البيانات إلى ملف JSON');
        console.log('');
        console.log('  node migrate-data.js import <file-or-folder>');
        console.log('      استيراد البيانات من ملف JSON أو مجلد backup');
        console.log('');
        console.log('  node migrate-data.js migrate <target-url> [restaurant-id]');
        console.log('      نقل البيانات إلى مشروع Firebase آخر');
        console.log('');
        break;
    }
  } catch (err) {
    log(`Error: ${err.message}`, 'error');
    process.exit(1);
  }
  
  console.log('');
  log('Migration complete!', 'success');
}

// تشغيل
main().catch(console.error);
