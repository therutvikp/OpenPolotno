'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import Page from './page';
import { TopRules } from './rules';
import { AudioElement } from './audio';
import { handleHotkey } from './hotkeys';
import { t } from '../utils/l10n';
import { StoreType } from '../model/store';

const DEFAULT_SNAP_DASH = [4, 6];

// Shown when store has no pages
const NoPages = ({ store }: { store: any }) =>
  React.createElement(
    'div',
    { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' } },
    React.createElement('p', null, t('workspace.noPages')),
    React.createElement('button', { onClick: () => { store.addPage(); } }, t('workspace.addPage')),
  );

// Placeholder for off-screen pages (preserves scroll height without rendering Konva)
const PagePlaceholder = ({
  width, height, xPadding, yPadding, backgroundColor,
}: { width: number; height: number; xPadding: number; yPadding: number; backgroundColor: string }) =>
  React.createElement(
    'div',
    {
      style: {
        width: width + 'px', height: height + 'px', backgroundColor,
        paddingLeft: xPadding + 'px', paddingRight: xPadding + 'px',
        paddingTop: yPadding + 'px', paddingBottom: yPadding + 'px',
      },
    },
    React.createElement('div', { style: { width: '100%', height: '100%', backgroundColor: 'white' } }),
  );

// Smooth scroll animation helper
function smoothScrollTo({
  element, scrollTop = 0, duration = 300, onFinish = () => {},
}: { element: HTMLElement; scrollTop?: number; duration?: number; onFinish?: () => void }): () => void {
  const start = element.scrollTop;
  const delta = scrollTop - start;
  let elapsed = 0;
  let cancelled = false;

  if (duration === 0) { element.scrollTop = scrollTop; return () => {}; }

  const easeInOut = (t: number, b: number, c: number, d: number) =>
    (t /= d / 2) < 1 ? (c / 2) * t * t + b : (-c / 2) * (--t * (t - 2) - 1) + b;

  const step = () => {
    if (cancelled) return;
    elapsed += 20;
    element.scrollTop = easeInOut(elapsed, start, delta, duration);
    if (elapsed < duration) setTimeout(step, 20);
    else onFinish();
  };
  step();
  return () => { cancelled = true; };
}

// Hook: preserve scroll position proportionally when canvas size changes
function useScrollPreservation(
  scrollRef: React.RefObject<HTMLDivElement>,
  totalWidth: number,
  totalHeight: number,
  scale: number,
  store: any,
  isBlockedRef: React.RefObject<boolean>,
) {
  const prevSize = React.useRef({ width: totalWidth, height: totalHeight });
  const scrollPos = React.useRef({ top: 0, left: 0 });
  const pageCountRef = React.useRef(store.pages.length);
  const pageCountChanged = pageCountRef.current !== store.pages.length;
  pageCountRef.current = store.pages.length;

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => { scrollPos.current = { top: el.scrollTop, left: el.scrollLeft }; };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  React.useLayoutEffect(() => {
    if (!scrollRef.current || pageCountChanged) return;
    const el = scrollRef.current;
    const px = (scrollPos.current.left + el.offsetWidth / 2) / prevSize.current.width;
    const py = (scrollPos.current.top + el.offsetHeight / 2) / prevSize.current.height;
    (isBlockedRef as any).current = true;
    el.scrollLeft = px * totalWidth - el.offsetWidth / 2;
    el.scrollTop = py * totalHeight - el.offsetHeight / 2;
    prevSize.current = { width: totalWidth, height: totalHeight };
  }, [scale, totalWidth, totalHeight]);
}

// Hook: auto-scroll to active page when it changes
function useActivePageScroll(
  scrollRef: React.RefObject<HTMLDivElement>,
  pageHeight: number,
  store: any,
  viewportHeight: number,
  isBlockedRef: React.RefObject<boolean>,
  renderOnlyActivePage: boolean,
) {
  const isAnimatingRef = React.useRef(false);
  const animationRef = React.useRef<(() => void) | null>(null);
  const pendingRef = React.useRef(false);
  const activePageIdx = store.pages.indexOf(store.activePage);

  React.useLayoutEffect(() => {
    if (renderOnlyActivePage) return;
    if (!store.activePage) return;
    if (!scrollRef.current) return;
    if (isAnimatingRef.current) return;
    const el = scrollRef.current;
    const targetTop = activePageIdx * pageHeight;
    if (Math.abs(targetTop - el.scrollTop) > 0.5 * pageHeight || pendingRef.current) {
      pendingRef.current = true;
      isAnimatingRef.current = true;
      animationRef.current = smoothScrollTo({
        element: el,
        scrollTop: targetTop,
        onFinish: () => { isAnimatingRef.current = false; pendingRef.current = false; },
        duration: store.isPlaying ? 0 : 300,
      });
    }
    return () => { animationRef.current?.(); };
  }, [store.activePage, activePageIdx, store.isPlaying, renderOnlyActivePage]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (renderOnlyActivePage) return;
    if (isAnimatingRef.current) return;
    (isBlockedRef as any).current = true;
    clearTimeout((handleScroll as any)._timer);
    (handleScroll as any)._timer = setTimeout(() => { (isBlockedRef as any).current = false; }, 300);

    const target = e.currentTarget;
    const singlePageH = target.childNodes[0] ? (target.childNodes[0] as HTMLElement).offsetHeight : pageHeight;
    const idx = Math.floor((target.scrollTop + viewportHeight / 3) / singlePageH);
    const pg = store.pages[idx];
    if (pg && store.activePage !== pg) pg.select();
  };

  return { handleScroll };
}

export type WorkspaceProps = {
  store: StoreType;
  pageControlsEnabled?: boolean;
  backgroundColor?: string;
  pageBorderColor?: string;
  activePageBorderColor?: string;
  bleedColor?: string;
  snapGuideStroke?: string;
  snapGuideStrokeWidth?: number;
  snapGuideDash?: number[];
  selectionRectFill?: string;
  selectionRectStroke?: string;
  selectionRectStrokeWidth?: number;
  transformLabelFill?: string;
  transformLabelTextFill?: string;
  distanceGuideStroke?: string;
  distanceLabelFill?: string;
  distanceLabelTextFill?: string;
  components?: any;
  onKeyDown?: (e: KeyboardEvent, store: StoreType) => void;
  paddingX?: number;
  paddingY?: number;
  altCloneEnabled?: boolean;
  visiblePagesOffset?: number;
  renderOnlyActivePage?: boolean;
};

export const WorkspaceCanvas = observer(({
  store, pageControlsEnabled, backgroundColor,
  pageBorderColor, activePageBorderColor, bleedColor,
  snapGuideStroke, snapGuideStrokeWidth, snapGuideDash,
  selectionRectFill, selectionRectStroke, selectionRectStrokeWidth,
  transformLabelFill, transformLabelTextFill,
  distanceGuideStroke, distanceLabelFill, distanceLabelTextFill,
  components, onKeyDown, paddingX, paddingY,
  altCloneEnabled = true, visiblePagesOffset, renderOnlyActivePage,
}: WorkspaceProps) => {
  const xPad = paddingX ?? 20;
  const yPad = paddingY ?? 55;

  const [viewportSize, setViewportSize] = React.useState({ width: 100, height: 100 });
  const prevViewportSize = React.useRef(viewportSize);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const maxBleed = (store as any).bleedVisible
    ? Math.max(0, ...(store as any).pages.map((p: any) => p.bleed))
    : 0;
  const maxPageW = Math.max(...(store as any).pages.map((p: any) => p.computedWidth));
  const maxPageH = Math.max(...(store as any).pages.map((p: any) => p.computedHeight));
  const activePageH = (store as any).activePage?.computedHeight || 0;
  const totalW = maxPageW + 2 * maxBleed;
  const totalH = (renderOnlyActivePage ? activePageH : maxPageH) + 2 * maxBleed;

  // Auto-fit scale computation
  const fitScale = async ({ skipTimeout = false } = {}) => {
    if (!skipTimeout) await new Promise((r) => setTimeout(r, 50));
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Raeditor warning: <Workspace /> component can not automatically detect its size.\nWidth or height of parent elements is equal 0.\nPlease make sure it has non-zero size. You may need to adjust it with your styles. <Workspace /> will automatically fit into parent container.\nFor simpler debugging here is the log of the parent element:');
      console.log(containerRef.current);
    }
    const w = (scrollRef.current?.clientWidth) || rect.width;
    const size = { width: w, height: rect.height };
    if (prevViewportSize.current.width !== size.width || prevViewportSize.current.height !== size.height) {
      setViewportSize(size);
      prevViewportSize.current = size;
    }
    const scaleX = (w - 2 * xPad) / totalW;
    const minPages = (store as any).pages.length > 1 ? 3.1 : 2;
    const scaleY = (rect.height - yPad * minPages) / totalH;
    const newScale = (store as any).pages.length ? Math.max(Math.min(scaleX, scaleY), 0.01) : 1;
    if ((store as any).scaleToFit !== newScale) {
      (store as any).setScale(newScale);
      (store as any)._setScaleToFit(newScale);
    }
  };

  React.useLayoutEffect(() => { fitScale({ skipTimeout: true }); }, []);
  React.useEffect(() => { fitScale(); }, [totalW, totalH, yPad, xPad]);
  React.useLayoutEffect(() => { fitScale({ skipTimeout: true }); }, [(store as any).openedSidePanel]);

  // ResizeObserver to refit on container size changes
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => fitScale({ skipTimeout: true }));
      ro.observe(el);
      return () => ro.unobserve(el);
    } else {
      const id = setInterval(() => fitScale({ skipTimeout: true }), 100);
      return () => clearInterval(id);
    }
  }, [totalW, totalH]);

  const xPadActual = Math.max(xPad, (viewportSize.width - totalW * (store as any).scale) / 2);
  const numPages = renderOnlyActivePage ? 1 : (store as any).pages.length;
  const scrollH = totalH * (store as any).scale * numPages;
  const yPadActual = Math.max(yPad, (viewportSize.height - scrollH) / numPages / 2);

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { (onKeyDown || handleHotkey)(e, store as any); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Ctrl+wheel zoom
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const minScale = Math.min(0.1, (store as any).scaleToFit);
        const maxScale = Math.max(5, (store as any).scaleToFit);
        const factor = 0.03;
        const newScale = e.deltaY < 0
          ? (store as any).scale * (1 + factor)
          : (store as any).scale / (1 + factor);
        (store as any).setScale(Math.max(minScale, Math.min(maxScale, newScale)));
      }
    };
    el.addEventListener('wheel', onWheel);
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Initialize store
  React.useEffect(() => { (store as any).__(); }, []);

  const scrollBlockedRef = React.useRef(false);
  useScrollPreservation(
    scrollRef as any,
    totalW * (store as any).scale + 2 * xPadActual,
    totalH * (store as any).scale + 2 * yPadActual,
    (store as any).scale,
    store,
    scrollBlockedRef,
  );

  const singlePageScrollH = totalH * (store as any).scale + 2 * yPadActual;
  const { handleScroll } = useActivePageScroll(
    scrollRef as any,
    singlePageScrollH,
    store,
    viewportSize.height,
    scrollBlockedRef,
    renderOnlyActivePage || false,
  );

  const bgColor = backgroundColor || 'rgba(232, 232, 232, 0.9)';
  const activePageIdx = (store as any).pages.indexOf((store as any).activePage);
  const pageCanvasW = totalW * (store as any).scale + 2 * xPadActual;
  const pageCanvasH = totalH * (store as any).scale + 2 * yPadActual;
  const noHorizontalScroll = viewportSize.width >= totalW * (store as any).scale + 2 * xPadActual;
  const NoPagesFallback = components?.NoPages || NoPages;
  const visibleOffset = visiblePagesOffset ?? Math.min(3, Math.max(1, Math.ceil(viewportSize.height / 2 / (totalH * (store as any).scale))));

  return React.createElement(
    'div',
    {
      ref: containerRef,
      style: { width: '100%', height: '100%', position: 'relative', outline: 'none', flex: 1, backgroundColor: bgColor, overflow: 'hidden' },
      tabIndex: 0,
      className: 'raeditor-workspace-container',
    },
    React.createElement(
      'div',
      {
        ref: scrollRef,
        onScroll: handleScroll,
        style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'auto', overflowX: noHorizontalScroll ? 'hidden' : 'auto' },
        className: 'raeditor-workspace-inner',
      },
      (store as any).pages.map((pg: any, idx: number) => {
        const isActive = pg === (store as any).activePage;
        if (renderOnlyActivePage && !isActive && !pg._exportingOrRendering && !pg._forceMount) {
          return null;
        }
        if (!(Math.abs(idx - activePageIdx) <= visibleOffset || pg._exportingOrRendering || pg._forceMount)) {
          return React.createElement(PagePlaceholder, {
            key: pg.id,
            width: pageCanvasW, height: pageCanvasH,
            backgroundColor: bgColor, xPadding: xPadActual, yPadding: yPadActual,
          });
        }
        const pageEl = React.createElement(Page, {
          key: pg.id,
          page: pg,
          xPadding: xPadActual, yPadding: yPadActual,
          width: pageCanvasW, height: pageCanvasH,
          store,
          pageControlsEnabled,
          backColor: bgColor,
          pageBorderColor: pageBorderColor || 'lightgrey',
          activePageBorderColor: activePageBorderColor || 'rgb(0, 161, 255)',
          altCloneEnabled,
          bleedColor: bleedColor || 'rgba(255, 0, 0, 0.1)',
          selectionRectFill,
          selectionRectStroke,
          selectionRectStrokeWidth,
          snapGuideStroke: snapGuideStroke || 'rgb(0, 161, 255)',
          snapGuideStrokeWidth: snapGuideStrokeWidth || 1,
          snapGuideDash: snapGuideDash || DEFAULT_SNAP_DASH,
          transformLabelFill,
          transformLabelTextFill,
          distanceGuideStroke: distanceGuideStroke || 'rgb(0, 161, 255)',
          distanceLabelFill: distanceLabelFill || 'rgb(0, 161, 255)',
          distanceLabelTextFill: distanceLabelTextFill || 'white',
          components,
          viewportSize,
        });
        if ((pg._exportingOrRendering || pg._forceMount) && !isActive && renderOnlyActivePage) {
          return React.createElement('div', { style: { display: 'none' }, key: pg.id }, pageEl);
        }
        return pageEl;
      }),
      (store as any).rulesVisible && React.createElement(TopRules, {
        store,
        xPadding: xPadActual, yPadding: yPadActual,
        width: pageCanvasW, height: pageCanvasH,
      }),
      (store as any).pages.length === 0 && React.createElement(NoPagesFallback, { store }),
      (store as any).audios?.map((audio: any) =>
        React.createElement(AudioElement, { key: audio.id, audio, store }),
      ),
    ),
  );
}) as ((props: WorkspaceProps) => React.JSX.Element) & { displayName: string };

WorkspaceCanvas.displayName = 'WorkspaceCanvas';

export default WorkspaceCanvas;
