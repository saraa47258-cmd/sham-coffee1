'use client';

import ProtectedRoute from '@/lib/components/ProtectedRoute';
import Sidebar from '@/lib/components/Sidebar';
import { useState, useEffect, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageContext';

// Breakpoints
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isClient, setIsClient] = useState(false);
  const { t, isRtl } = useTranslation();

  const getScreenSize = useCallback((width: number) => {
    if (width < BREAKPOINTS.mobile) return 'mobile';
    if (width < BREAKPOINTS.tablet) return 'tablet';
    return 'desktop';
  }, []);

  useEffect(() => {
    setIsClient(true);
    
    const handleResize = () => {
      const newSize = getScreenSize(window.innerWidth);
      setScreenSize(newSize);
      
      // Close sidebar when resizing to desktop
      if (newSize === 'desktop') {
        setSidebarOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getScreenSize]);

  const isMobileOrTablet = screenSize === 'mobile' || screenSize === 'tablet';
  const showSidebar = isClient ? (!isMobileOrTablet || sidebarOpen) : true;

  // Dynamic sidebar width based on screen size
  const sidebarWidth = screenSize === 'tablet' ? 260 : 280;

  // Sidebar margin and button position based on language direction
  const sidebarSide = isRtl ? 'right' : 'left';
  const mainMargin = (isClient && isMobileOrTablet) ? '0' : `${sidebarWidth}px`;

  return (
    <ProtectedRoute>
      <div style={{ 
        backgroundColor: '#f1f5f9',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Mobile/Tablet Menu Button */}
        {isClient && isMobileOrTablet && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? t.common.close : t.nav.mainMenu}
            style={{
              position: 'fixed',
              top: '12px',
              [sidebarSide]: '12px',
              zIndex: 1100,
              width: screenSize === 'mobile' ? '44px' : '48px',
              height: screenSize === 'mobile' ? '44px' : '48px',
              borderRadius: '12px',
              backgroundColor: '#0f172a',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.2s ease',
            }}
          >
            {sidebarOpen ? (
              <X style={{ width: '22px', height: '22px', color: '#ffffff' }} />
            ) : (
              <Menu style={{ width: '22px', height: '22px', color: '#ffffff' }} />
            )}
          </button>
        )}

        {/* Mobile/Tablet Overlay */}
        {isClient && isMobileOrTablet && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
              animation: 'fadeIn 0.2s ease',
            }}
          />
        )}

        {/* Sidebar */}
        <Sidebar 
          isOpen={showSidebar} 
          onClose={() => setSidebarOpen(false)}
          isMobile={isClient && isMobileOrTablet}
          width={sidebarWidth}
        />

        {/* Main Content */}
        <main style={{ 
          ...(isRtl 
            ? { marginRight: mainMargin } 
            : { marginLeft: mainMargin }
          ),
          padding: screenSize === 'mobile' 
            ? '70px 12px 20px' 
            : screenSize === 'tablet'
              ? '70px 16px 24px'
              : '20px 24px',
          minHeight: '100vh',
          width: (isClient && isMobileOrTablet) ? '100%' : `calc(100% - ${sidebarWidth}px)`,
          transition: 'margin 0.3s ease, width 0.3s ease, padding 0.3s ease',
          overflowX: 'hidden',
        }}>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
