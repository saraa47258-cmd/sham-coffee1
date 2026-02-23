'use client';

import { getCurrentUser } from '../auth';
import { Bell, Search, Settings } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useScreenSize } from '@/lib/hooks/useScreenSize';

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const user = getCurrentUser();
  const { t } = useTranslation();
  const { isMobile, isTablet } = useScreenSize();

  return (
    <header style={{
      minHeight: isMobile ? '56px' : '70px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: isMobile ? '8px 12px' : isTablet ? '0 16px' : '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      flexWrap: 'wrap',
    }}>
      {/* Title */}
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        {title && (
          <h1 style={{ 
            fontSize: isMobile ? '16px' : '20px', 
            fontWeight: 700, 
            color: '#0f172a', 
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {title}
          </h1>
        )}
        {subtitle && !isMobile && (
          <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px', flexShrink: 0 }}>
        {/* Search - hidden on mobile */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '40px',
            padding: '0 14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            cursor: 'pointer',
          }}>
            <Search style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t.common.search}</span>
          </div>
        )}

        {/* Search icon only on mobile */}
        {isMobile && (
          <button style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#64748b',
          }}>
            <Search style={{ width: '16px', height: '16px' }} />
          </button>
        )}

        {/* Settings - hidden on mobile */}
        {!isMobile && (
          <button style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            color: '#64748b',
          }}>
            <Settings style={{ width: '20px', height: '20px' }} />
          </button>
        )}

        {/* Notifications */}
        <button style={{
          position: 'relative',
          width: isMobile ? '36px' : '40px',
          height: isMobile ? '36px' : '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          color: '#64748b',
        }}>
          <Bell style={{ width: isMobile ? '18px' : '20px', height: isMobile ? '18px' : '20px' }} />
          <span style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            width: '8px',
            height: '8px',
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            border: '2px solid #ffffff',
          }}></span>
        </button>

        {/* Profile */}
        <div style={{
          width: isMobile ? '34px' : '40px',
          height: isMobile ? '34px' : '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: isMobile ? '12px' : '14px',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
          cursor: 'pointer',
          flexShrink: 0,
        }}>
          {user?.name.charAt(0) || 'A'}
        </div>
      </div>
    </header>
  );
}
