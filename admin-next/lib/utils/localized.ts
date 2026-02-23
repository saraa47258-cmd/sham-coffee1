import { Language } from '../i18n/types';

/**
 * نظام ترجمة البيانات القادمة من Firebase
 * يعيد الاسم المناسب حسب اللغة المختارة
 * 
 * إذا كانت اللغة إنجليزية ويوجد nameEn، يعيد nameEn
 * وإلا يعيد name (الافتراضي - عربي)
 */

interface Localizable {
  name: string;
  nameEn?: string;
}

interface LocalizableWithDescription extends Localizable {
  description?: string;
  descriptionEn?: string;
}

/**
 * الحصول على الاسم حسب اللغة المختارة
 * @param item العنصر الذي يحتوي على name و nameEn
 * @param language اللغة المختارة
 * @returns الاسم المناسب حسب اللغة
 */
export function getLocalizedName(item: Localizable | null | undefined, language: Language): string {
  if (!item) return '';
  if (language === 'en' && item.nameEn) {
    return item.nameEn;
  }
  return item.name || '';
}

/**
 * الحصول على الوصف حسب اللغة المختارة
 * @param item العنصر الذي يحتوي على description و descriptionEn
 * @param language اللغة المختارة
 * @returns الوصف المناسب حسب اللغة
 */
export function getLocalizedDescription(item: LocalizableWithDescription | null | undefined, language: Language): string {
  if (!item) return '';
  if (language === 'en' && item.descriptionEn) {
    return item.descriptionEn;
  }
  return item.description || '';
}

/**
 * الحصول على اسم التصنيف مع الأيقونة حسب اللغة
 */
export function getLocalizedCategoryName(
  category: (Localizable & { icon?: string; emoji?: string }) | null | undefined,
  language: Language
): string {
  if (!category) return '';
  const icon = category.icon || category.emoji || '';
  const name = getLocalizedName(category, language);
  return icon ? `${icon} ${name}` : name;
}
