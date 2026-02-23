'use client';

import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';

interface LanguageSwitcherProps {
  variant?: 'sidebar' | 'topbar' | 'compact';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'sidebar', className = '' }: LanguageSwitcherProps) {
  const { language, toggleLanguage, t, isRtl } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleLanguage}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
          bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/10 ${className}`}
        title={t.language.switchLanguage}
      >
        <span className="text-sm">🌐</span>
        <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
      </button>
    );
  }

  if (variant === 'topbar') {
    return (
      <button
        onClick={toggleLanguage}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
          bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 ${className}`}
        title={t.language.switchLanguage}
      >
        <span>🌐</span>
        <span>{language === 'ar' ? 'English' : 'العربية'}</span>
      </button>
    );
  }

  // Sidebar variant (default) — modern toggle pill design
  const isArabic = language === 'ar';

  return (
    <div
      className={className}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* Toggle Switch */}
      <button
        onClick={toggleLanguage}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={t.language.switchLanguage}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          background: isHovered
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%)'
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: `1px solid ${isHovered ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.15)'}`,
          borderRadius: '14px',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          direction: 'ltr',
          transform: isHovered ? 'translateY(-1px)' : 'none',
          boxShadow: isHovered ? '0 4px 15px rgba(99, 102, 241, 0.15)' : 'none',
        }}
      >
        {/* Globe icon */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.25) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0,
          transition: 'transform 0.3s ease',
          transform: isHovered ? 'rotate(20deg)' : 'none',
        }}>
          🌐
        </div>

        {/* Toggle Pill */}
        <div style={{
          flex: 1,
          height: '34px',
          borderRadius: '17px',
          background: 'rgba(0, 0, 0, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          {/* Sliding indicator */}
          <div style={{
            position: 'absolute',
            top: '3px',
            [isArabic ? 'left' : 'right']: '3px',
            width: 'calc(50% - 4px)',
            height: '28px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
          }} />

          {/* Arabic option */}
          <div style={{
            flex: 1,
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: isArabic ? 700 : 500,
            color: isArabic ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.3s ease',
            fontFamily: "'IBM Plex Sans Arabic', sans-serif",
            letterSpacing: isArabic ? '0.5px' : '0',
          }}>
            عربي
          </div>

          {/* English option */}
          <div style={{
            flex: 1,
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: !isArabic ? 700 : 500,
            color: !isArabic ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.3s ease',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: !isArabic ? '0.5px' : '0',
          }}>
            EN
          </div>
        </div>
      </button>
    </div>
  );
}
