'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Language,
  Direction,
  TranslationSchema,
  getTranslation,
  getDirection,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
} from '../i18n';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  t: TranslationSchema;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [mounted, setMounted] = useState(false);

  // Load saved language preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
      if (saved === 'ar' || saved === 'en') {
        setLanguageState(saved);
      }
    } catch {
      // localStorage not available
    }
    setMounted(true);
  }, []);

  // Apply language direction to document
  useEffect(() => {
    if (!mounted) return;
    const dir = getDirection(language);
    document.documentElement.lang = language;
    document.documentElement.dir = dir;

    // Update font based on language
    if (language === 'en') {
      document.documentElement.style.fontFamily =
        "'Inter', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, sans-serif";
    } else {
      document.documentElement.style.fontFamily =
        "'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, sans-serif";
    }
  }, [language, mounted]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // localStorage not available
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  }, [language, setLanguage]);

  const value = useMemo<LanguageContextType>(() => ({
    language,
    direction: getDirection(language),
    t: getTranslation(language),
    setLanguage,
    toggleLanguage,
    isRtl: language === 'ar',
  }), [language, setLanguage, toggleLanguage]);

  // Prevent hydration mismatch by rendering with default language first
  if (!mounted) {
    const defaultT = getTranslation(DEFAULT_LANGUAGE);
    return (
      <LanguageContext.Provider value={{
        language: DEFAULT_LANGUAGE,
        direction: getDirection(DEFAULT_LANGUAGE),
        t: defaultT,
        setLanguage,
        toggleLanguage,
        isRtl: DEFAULT_LANGUAGE === 'ar',
      }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export { LanguageContext };
