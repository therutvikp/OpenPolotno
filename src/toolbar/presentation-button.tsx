'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Tooltip, Spinner } from '@blueprintjs/core';
import ReactDOM from 'react-dom';

// ─── Icons ────────────────────────────────────────────────────────────────────

const PlayIcon = () =>
  React.createElement(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'currentColor' },
    React.createElement('polygon', { points: '4,2 13,8 4,14' }),
  );

const ArrowLeftIcon = () =>
  React.createElement(
    'svg',
    { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '15 18 9 12 15 6' }),
  );

const ArrowRightIcon = () =>
  React.createElement(
    'svg',
    { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '9 18 15 12 9 6' }),
  );

const CloseIcon = () =>
  React.createElement(
    'svg',
    { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' },
    React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
    React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 }),
  );

const FullscreenEnterIcon = () =>
  React.createElement(
    'svg',
    { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '15 3 21 3 21 9' }),
    React.createElement('polyline', { points: '9 21 3 21 3 15' }),
    React.createElement('line', { x1: 21, y1: 3, x2: 14, y2: 10 }),
    React.createElement('line', { x1: 3, y1: 21, x2: 10, y2: 14 }),
  );

const FullscreenExitIcon = () =>
  React.createElement(
    'svg',
    { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '4 14 10 14 10 20' }),
    React.createElement('polyline', { points: '20 10 14 10 14 4' }),
    React.createElement('line', { x1: 10, y1: 14, x2: 3, y2: 21 }),
    React.createElement('line', { x1: 21, y1: 3, x2: 14, y2: 10 }),
  );

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  background: '#000',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
};

const slideAreaStyle: React.CSSProperties = {
  flex: 1,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
};

const navBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.08)',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  cursor: 'pointer',
  width: 52,
  height: 52,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
  zIndex: 2,
};

const topBarStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 13,
  boxSizing: 'border-box',
  flexShrink: 0,
};

const bottomBarStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 16px',
  flexShrink: 0,
};

const dotStyle = (active: boolean): React.CSSProperties => ({
  width: active ? 20 : 8,
  height: 8,
  borderRadius: 4,
  background: active ? '#fff' : 'rgba(255,255,255,0.3)',
  transition: 'all 0.2s',
  cursor: 'pointer',
  border: 'none',
  padding: 0,
  flexShrink: 0,
});

// ─── Slide cache hook ─────────────────────────────────────────────────────────

function useSlideCache(store: any, pages: any[]) {
  const [cache, setCache] = React.useState<Record<string, string | null>>({});
  const renderingRef = React.useRef<Set<string>>(new Set());

  const ensureSlide = React.useCallback(
    async (pageId: string) => {
      if (cache[pageId] !== undefined) return;
      if (renderingRef.current.has(pageId)) return;
      renderingRef.current.add(pageId);
      try {
        const url: string = await store.toDataURL({ pageId, pixelRatio: 1.5, mimeType: 'image/jpeg', quality: 0.92 });
        setCache((prev) => ({ ...prev, [pageId]: url }));
      } catch {
        setCache((prev) => ({ ...prev, [pageId]: null }));
      } finally {
        renderingRef.current.delete(pageId);
      }
    },
    [cache, store],
  );

  return { cache, ensureSlide };
}

// ─── Presentation overlay ─────────────────────────────────────────────────────

const PresentationOverlay = observer(({ store, onClose }: { store: any; onClose: () => void }) => {
  const pages: any[] = store.pages.slice();
  const [index, setIndex] = React.useState(() => {
    const active = store.activePage;
    const idx = pages.findIndex((p: any) => p.id === active?.id);
    return idx >= 0 ? idx : 0;
  });
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [navHover, setNavHover] = React.useState<'left' | 'right' | null>(null);

  const { cache, ensureSlide } = useSlideCache(store, pages);

  // Pre-render current + adjacent slides
  React.useEffect(() => {
    for (const offset of [0, 1, -1, 2, -2]) {
      const i = index + offset;
      if (i >= 0 && i < pages.length) ensureSlide(pages[i].id);
    }
  }, [index, pages, ensureSlide]);

  const go = React.useCallback(
    (delta: number) => {
      setIndex((prev) => Math.max(0, Math.min(pages.length - 1, prev + delta)));
    },
    [pages.length],
  );

  const goTo = React.useCallback((i: number) => setIndex(i), []);

  // Keyboard handler
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go, onClose]);

  // Fullscreen API
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  React.useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Cleanup fullscreen on unmount
  React.useEffect(() => {
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  const currentPageId = pages[index]?.id;
  const slideUrl = currentPageId ? cache[currentPageId] : undefined;
  const isLoading = slideUrl === undefined;

  // Aspect ratio for the slide image
  const aspectW = store.width || 1920;
  const aspectH = store.height || 1080;

  const slide = React.createElement(
    'div',
    {
      style: {
        position: 'relative',
        maxWidth: '90vw',
        maxHeight: '80vh',
        width: '100%',
        aspectRatio: `${aspectW} / ${aspectH}`,
        boxShadow: '0 8px 60px rgba(0,0,0,0.7)',
        background: '#fff',
        borderRadius: 4,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    isLoading
      ? React.createElement(Spinner, { size: 40 })
      : slideUrl
      ? React.createElement('img', {
          src: slideUrl,
          style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
          draggable: false,
        })
      : React.createElement('div', { style: { color: '#888', fontSize: 14 } }, 'Failed to render slide'),
  );

  const dots =
    pages.length <= 20
      ? React.createElement(
          'div',
          { style: bottomBarStyle },
          ...pages.map((_: any, i: number) =>
            React.createElement('button', {
              key: i,
              style: dotStyle(i === index),
              onClick: () => goTo(i),
              'aria-label': `Slide ${i + 1}`,
            }),
          ),
        )
      : React.createElement(
          'div',
          { style: { ...bottomBarStyle, color: 'rgba(255,255,255,0.5)', fontSize: 13 } },
          `${index + 1} / ${pages.length}`,
        );

  const topBar = React.createElement(
    'div',
    { style: topBarStyle },
    React.createElement('span', { style: { fontWeight: 600, color: '#fff' } }, 'Presentation'),
    React.createElement(
      'span',
      { style: { opacity: 0.6, fontSize: 12 } },
      `${index + 1} / ${pages.length}  ·  ← → to navigate  ·  Space to advance  ·  Esc to exit`,
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: 8 } },
      React.createElement(
        'button',
        {
          style: { ...navBtnStyle, position: 'static', transform: 'none', background: 'rgba(255,255,255,0.08)', width: 36, height: 36 },
          onClick: toggleFullscreen,
          title: isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)',
        },
        isFullscreen ? React.createElement(FullscreenExitIcon) : React.createElement(FullscreenEnterIcon),
      ),
      React.createElement(
        'button',
        {
          style: { ...navBtnStyle, position: 'static', transform: 'none', background: 'rgba(255,255,255,0.08)', width: 36, height: 36 },
          onClick: onClose,
          title: 'Exit (Esc)',
        },
        React.createElement(CloseIcon),
      ),
    ),
  );

  const content = React.createElement(
    'div',
    { style: overlayStyle },
    topBar,
    React.createElement(
      'div',
      { style: slideAreaStyle },
      pages.length > 1 &&
        React.createElement(
          'button',
          {
            style: {
              ...navBtnStyle,
              left: 16,
              opacity: index === 0 ? 0.25 : 1,
              background: navHover === 'left' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
            },
            onClick: () => go(-1),
            disabled: index === 0,
            onMouseEnter: () => setNavHover('left'),
            onMouseLeave: () => setNavHover(null),
          },
          React.createElement(ArrowLeftIcon),
        ),
      slide,
      pages.length > 1 &&
        React.createElement(
          'button',
          {
            style: {
              ...navBtnStyle,
              right: 16,
              opacity: index === pages.length - 1 ? 0.25 : 1,
              background: navHover === 'right' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
            },
            onClick: () => go(1),
            disabled: index === pages.length - 1,
            onMouseEnter: () => setNavHover('right'),
            onMouseLeave: () => setNavHover(null),
          },
          React.createElement(ArrowRightIcon),
        ),
    ),
    dots,
  );

  return ReactDOM.createPortal(content, document.body);
});

// ─── Toolbar button ───────────────────────────────────────────────────────────

export const PresentationButton = observer(({ store }: { store: any }) => {
  const [presenting, setPresenting] = React.useState(false);

  if (store.pages.length === 0) return null;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Tooltip,
      { content: 'Present Slideshow', position: 'bottom' },
      React.createElement(Button, {
        minimal: true,
        icon: React.createElement(PlayIcon),
        onClick: () => setPresenting(true),
        'aria-label': 'Present Slideshow',
      }),
    ),
    presenting &&
      React.createElement(PresentationOverlay, {
        store,
        onClose: () => setPresenting(false),
      }),
  );
});
