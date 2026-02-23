/**
 * Add English Translations Script
 * سكربت إضافة الترجمة الإنجليزية للمنتجات والتصنيفات
 * 
 * الاستخدام:
 *   node scripts/add-english-translations.js
 * 
 * هذا السكربت يضيف حقل nameEn لكل منتج وتصنيف وتنوع في Firebase
 */

const https = require('https');
const fs = require('fs');

// ====================================
// الإعدادات
// ====================================
const CONFIG = {
  DATABASE_URL: process.env.FIREBASE_DATABASE_URL || 'https://sham-coffee-default-rtdb.firebaseio.com',
  RESTAURANT_ID: process.env.RESTAURANT_ID || 'sham-coffee-1',
};

// ====================================
// ترجمة التصنيفات
// ====================================
const CATEGORY_TRANSLATIONS = {
  'المشروبات  الساخنة': 'Hot Drinks',
  'المشروبات الساخنة': 'Hot Drinks',
  'شيشة': 'Hookah',
  'القهوة الساخنة الكلاسيكية': 'Classic Hot Coffee',
  '🥛 قهوة بالحليب': 'Milk Coffee',
  'قهوة بالحليب': 'Milk Coffee',
  '🍫 قهوة منكهة': 'Flavored Coffee',
  'قهوة منكهة': 'Flavored Coffee',
  '❄️ قهوة باردة (Ice Coffee)': 'Iced Coffee',
  'قهوة باردة (Ice Coffee)': 'Iced Coffee',
  '🌍 قهوة خاصة ومميزة': 'Special Coffee',
  'قهوة خاصة ومميزة': 'Special Coffee',
  '🍊 العصائر الطبيعية': 'Fresh Juices',
  'العصائر الطبيعية': 'Fresh Juices',
  '🥐 قائمة الطعام7': 'Food Menu',
  'قائمة الطعام': 'Food Menu',
  'المياة': 'Water',
  'مشروبات غازية': 'Soft Drinks',
  'مقبلات وسلطات': 'Appetizers & Salads',
};

// ====================================
// ترجمة المنتجات
// ====================================
const PRODUCT_TRANSLATIONS = {
  // شيشة - Hookah
  'تفاحتين نعناع': 'Double Apple Mint',
  'نعناع': 'Mint',
  'خوخ': 'Peach',
  'زغلول': 'Zaghloul',
  'تفاحتين': 'Double Apple',
  'سلوم': 'Salloum',
  'بطيخ': 'Watermelon',
  'عنب': 'Grape',
  'كابتشينو': 'Cappuccino',
  'ليمون': 'Lemon',
  'علكة': 'Gum',
  'علكة قرفة': 'Cinnamon Gum',
  'علكة نعناع': 'Mint Gum',
  'باشن': 'Passion',
  'بلو بيري': 'Blueberry',
  'عنب نعناع': 'Grape Mint',
  'قص': 'Qass',
  'تغير راس': 'Head Change',

  // عصائر - Juices
  'برتقال': 'Orange Juice',
  'مانجو': 'Mango Juice',
  'فراولة': 'Strawberry Juice',
  'أناناس': 'Pineapple Juice',
  'رمان': 'Pomegranate Juice',
  'افجادو': 'Avocado Juice',
  'موز': 'Banana Juice',
  'ليمون نعناع': 'Lemon Mint Juice',

  // شاي - Tea
  'شاي أحمر': 'Black Tea',
  'شاي أخضر': 'Green Tea',
  'شاي نعناع': 'Mint Tea',
  'شاي كرك': 'Karak Tea',
  'شاي مغربي': 'Moroccan Tea',

  // قهوة - Coffee
  'إسبريسو': 'Espresso',
  'أمريكانو': 'Americano',
  'قهوة تركية': 'Turkish Coffee',
  'قهوة عربية': 'Arabic Coffee',
  'لاتيه': 'Latte',
  'فلات وايت': 'Flat White',
  'موكا': 'Mocha',
  'كورتادو': 'Cortado',
  'فانيليا لاتيه': 'Vanilla Latte',
  'كراميل لاتيه': 'Caramel Latte',
  'شوكولاتة موكا': 'Chocolate Mocha',
  'بندق': 'Hazelnut',
  'آيس لاتيه': 'Iced Latte',
  'آيس أمريكانو': 'Iced Americano',
  'كولد برو': 'Cold Brew',
  'فرابيه': 'Frappe',
  'سبانش لاتيه': 'Spanish Latte',
  'نسكافية': 'Nescafe',

  // مياة - Water
  'المياة الغازية': 'Sparkling Water',
  'مياة عادية': 'Still Water',

  // طعام - Food
  'فطيرة جبنه عسل': 'Cheese & Honey Pie',
  'فطيرة جبنة زعتر': 'Cheese & Thyme Pie',
  'فطيرة جبنة نقانق': 'Cheese & Sausage Pie',
  'سندويش زنجر': 'Zinger Sandwich',
  'سندويش نقانق': 'Sausage Sandwich',
  'برجر دجاج': 'Chicken Burger',
  'برجر لحم': 'Beef Burger',

  // مشروبات غازية - Soft Drinks
  'كنزا': 'Kinza',

  // سلطات ومقبلات - Salads & Appetizers
  'سلطة فتوش': 'Fattoush Salad',
  'سلطة يونانية': 'Greek Salad',
  'سلطة سيزر': 'Caesar Salad',
  'سلطة فواكة': 'Fruit Salad',
  'فروت كات': 'Fruit Cut',

  // مشروبات ساخنة إضافية
  'شاي زنجبيل': 'Ginger Tea',
  'شاي زنجبيل ليمون عسل': 'Ginger Lemon Honey Tea',
  'كمون ليمون': 'Cumin Lemon',
  'ينسون': 'Anise Tea',
  'حلبة': 'Fenugreek Tea',
  'قهوة حليب': 'Coffee with Milk',
  'فيمتو': 'Vimto',
  'كركدية': 'Hibiscus',
  'عصير كوكتيل': 'Cocktail Juice',
};

// ====================================
// ترجمة التنوعات (Variations)
// ====================================
const VARIATION_TRANSLATIONS = {
  'شيشة مصرية': 'Egyptian Hookah',
  'شيشة مصرية ': 'Egyptian Hookah',
  'شيشة مصرية بالثلج': 'Egyptian Hookah with Ice',
  'شيشة مصرية بالثلج ': 'Egyptian Hookah with Ice',
  'شيشة مصرية الثلج ': 'Egyptian Hookah with Ice',
  'سبايدر': 'Spider',
  'سبايدر ': 'Spider',
  'emy': 'EMY',
  'eym': 'EYM',
  'كبير': 'Large',
  'صغير': 'Small',
  'السنجل': 'Single',
  'دبل': 'Double',
  'دبل ': 'Double',
  'شوت': 'Shot',
  'دبل شوت': 'Double Shot',
  'حجم كبير': 'Large',
  'حجم صغير': 'Small',
  'كركدية ساخن': 'Hot Hibiscus',
  'كركدية بارد': 'Cold Hibiscus',
};

// ====================================
// دوال HTTP
// ====================================
function fetchFromFirebase(path) {
  return new Promise((resolve, reject) => {
    const urlParsed = new URL(CONFIG.DATABASE_URL);
    const options = {
      hostname: urlParsed.hostname,
      port: 443,
      path: `${path}.json`,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GET ${path} -> HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function patchFirebase(path, data) {
  return new Promise((resolve, reject) => {
    const urlParsed = new URL(CONFIG.DATABASE_URL);
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlParsed.hostname,
      port: 443,
      path: `${path}.json`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`PATCH ${path} -> HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ====================================
// ترجمة التصنيفات
// ====================================
async function translateCategories() {
  console.log('\n📂 ترجمة التصنيفات...');
  const basePath = `/restaurant-system/categories/${CONFIG.RESTAURANT_ID}`;
  const categories = await fetchFromFirebase(basePath);

  if (!categories) {
    console.log('   ⚠️ لا توجد تصنيفات');
    return;
  }

  let translated = 0;
  let skipped = 0;

  for (const [id, cat] of Object.entries(categories)) {
    const name = cat.name?.trim();
    // Try exact match first, then try stripping emojis
    let nameEn = CATEGORY_TRANSLATIONS[cat.name] || CATEGORY_TRANSLATIONS[name];
    
    if (!nameEn) {
      // Try stripping emojis/icons from name
      const stripped = name?.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
      nameEn = CATEGORY_TRANSLATIONS[stripped];
    }

    if (nameEn) {
      try {
        await patchFirebase(`${basePath}/${id}`, { nameEn });
        console.log(`   ✅ ${cat.name} → ${nameEn}`);
        translated++;
      } catch (err) {
        console.log(`   ❌ ${cat.name}: ${err.message}`);
      }
    } else {
      console.log(`   ⏭️ لا توجد ترجمة لـ: "${cat.name}"`);
      skipped++;
    }
  }

  console.log(`   📊 تم ترجمة ${translated} تصنيف، تم تخطي ${skipped}`);
}

// ====================================
// ترجمة المنتجات والتنوعات
// ====================================
async function translateProducts() {
  console.log('\n🍽️ ترجمة المنتجات...');
  const basePath = `/restaurant-system/menu/${CONFIG.RESTAURANT_ID}`;
  const products = await fetchFromFirebase(basePath);

  if (!products) {
    console.log('   ⚠️ لا توجد منتجات');
    return;
  }

  let translatedProducts = 0;
  let translatedVariations = 0;
  let skippedProducts = 0;
  let skippedVariations = 0;

  for (const [id, product] of Object.entries(products)) {
    const name = product.name?.trim();
    const nameEn = PRODUCT_TRANSLATIONS[product.name] || PRODUCT_TRANSLATIONS[name];

    // Translate product name
    if (nameEn) {
      try {
        await patchFirebase(`${basePath}/${id}`, { nameEn });
        console.log(`   ✅ ${product.name} → ${nameEn}`);
        translatedProducts++;
      } catch (err) {
        console.log(`   ❌ ${product.name}: ${err.message}`);
      }
    } else {
      console.log(`   ⏭️ لا توجد ترجمة لـ: "${product.name}"`);
      skippedProducts++;
    }

    // Translate variations
    if (product.variations && Array.isArray(product.variations)) {
      for (let i = 0; i < product.variations.length; i++) {
        const variation = product.variations[i];
        const varName = variation.name?.trim();
        const varNameEn = VARIATION_TRANSLATIONS[variation.name] || VARIATION_TRANSLATIONS[varName];

        if (varNameEn) {
          try {
            await patchFirebase(`${basePath}/${id}/variations/${i}`, { nameEn: varNameEn });
            console.log(`      ✅ ${variation.name} → ${varNameEn}`);
            translatedVariations++;
          } catch (err) {
            console.log(`      ❌ ${variation.name}: ${err.message}`);
          }
        } else {
          console.log(`      ⏭️ لا توجد ترجمة لتنوع: "${variation.name}"`);
          skippedVariations++;
        }
      }
    }
  }

  console.log(`\n   📊 المنتجات: ترجم ${translatedProducts}، تخطي ${skippedProducts}`);
  console.log(`   📊 التنوعات: ترجم ${translatedVariations}، تخطي ${skippedVariations}`);
}

// ====================================
// التشغيل
// ====================================
async function main() {
  console.log('🌐 بدء إضافة الترجمة الإنجليزية...');
  console.log(`   قاعدة البيانات: ${CONFIG.DATABASE_URL}`);
  console.log(`   المطعم: ${CONFIG.RESTAURANT_ID}`);

  try {
    await translateCategories();
    await translateProducts();
    console.log('\n🎉 تم الانتهاء من إضافة الترجمة الإنجليزية بنجاح!');
  } catch (err) {
    console.error('\n❌ خطأ:', err.message);
    process.exit(1);
  }
}

main();
