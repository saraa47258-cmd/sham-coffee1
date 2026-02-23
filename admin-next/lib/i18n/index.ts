import { Language, Direction, TranslationSchema } from './types';
import { ar } from './ar';
import { en } from './en';

export type { Language, Direction, TranslationSchema };

export const translations: Record<Language, TranslationSchema> = { ar, en };

export function getDirection(lang: Language): Direction {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function getTranslation(lang: Language): TranslationSchema {
  return translations[lang];
}

export const DEFAULT_LANGUAGE: Language = 'ar';

export const LANGUAGE_STORAGE_KEY = 'sham-coffee-lang';
