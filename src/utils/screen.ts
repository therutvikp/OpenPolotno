'use client';

import React from 'react';

export const MOBILE_BREAKPOINT = 800;

export const isMobile = (): boolean =>
  typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;

export const mobileStyle = (css: string): string => `
  @media (max-width: ${MOBILE_BREAKPOINT}px) {
    ${css}
  }

  .raeditor-mobile & {
    ${css}
  }
`;

export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const useMobile = (): boolean => {
  const [mobile, setMobile] = React.useState(isMobile());
  React.useEffect(() => {
    const handler = () => setMobile(isMobile());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
};
