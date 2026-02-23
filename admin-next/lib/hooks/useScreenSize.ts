'use client';

import { useState, useEffect, useCallback } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'wide';

const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1440,
};

export function useScreenSize(): {
  screenSize: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  isMobileOrTablet: boolean;
  width: number;
} {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  const [width, setWidth] = useState(1200);

  const getScreenSize = useCallback((w: number): ScreenSize => {
    if (w < BREAKPOINTS.mobile) return 'mobile';
    if (w < BREAKPOINTS.tablet) return 'tablet';
    if (w < BREAKPOINTS.desktop) return 'desktop';
    return 'wide';
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWidth(w);
      setScreenSize(getScreenSize(w));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getScreenSize]);

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
    isWide: screenSize === 'wide',
    isMobileOrTablet: screenSize === 'mobile' || screenSize === 'tablet',
    width,
  };
}
