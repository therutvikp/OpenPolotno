'use client';

import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
import React from 'react';
import { onSnapshot } from 'mobx-state-tree';
import { Button, Popover, Menu, MenuItem, Position } from '@blueprintjs/core';
import { Play, Plus, Pause, Duplicate, Insert, Trash, More } from '@blueprintjs/icons';
import { ReactSortable } from 'react-sortablejs';
import { flags } from '../utils/flags';
import styled from '../utils/styled';
import { t } from '../utils/l10n';
import { deepEqual } from '../utils/deep-equal';

// ─── Constants ────────────────────────────────────────────────────────────────

export const LAYER_ROW_H = 26;
const RULER_H = 22;
const PAGE_ROW_H = 60;

// ─── Styled components ────────────────────────────────────────────────────────

// The zero-height wrapper that holds the "Pages" toggle button (floats above canvas)
const TimelineWrapper = styled('div')`
  position: relative;
  height: 0px;
`;

const TimelineFloating = styled('div')`
  position: absolute;
  bottom: 5px;
  width: auto;
  left: 5px;
  overflow: hidden;
  box-shadow: 0 0 4px lightgrey;
  border-radius: 5px;
  z-index: 1;
`;

// The dark full-width panel shown when timeline is open
const TimelinePanel = styled('div')`
  width: 100%;
  background: #181818;
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
`;

const TimelineTopBar = styled('div')`
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 10px;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
`;

const PageContainer = styled('div', React.forwardRef)`
  display: flex;
  position: relative;
  border-radius: 6px;
  cursor: pointer;
  &:hover .raeditor-page-menu {
    opacity: 1;
    pointer-events: auto;
  }
`;

const PageMenuOverlay = styled('div')`
  position: absolute;
  z-index: 20;
  top: 5px;
  right: 5px;
  opacity: 0;
  pointer-events: none;
`;

const AudioTrackWrapper = styled('div')`
  position: relative;
  &:hover .raeditor-audio-menu {
    opacity: 1;
    pointer-events: auto;
  }
`;

const AudioMenuOverlay = styled('div')`
  position: absolute;
  z-index: 20;
  top: -5px;
  right: 8px;
  opacity: 0;
  pointer-events: none;
`;

const Spinner = styled('div')`
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-left-color: #09f;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (ms: number): string => {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

// ─── Time Ruler ───────────────────────────────────────────────────────────────

const TimeRuler = ({ duration, scale }: { duration: number; scale: number }) => {
  // Show a tick every 500ms when zoomed in enough, otherwise every 1s
  const stepMs = scale >= 0.08 ? 500 : 1000;
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += stepMs) ticks.push(t);

  return React.createElement(
    'div',
    { style: { position: 'relative', height: RULER_H + 'px', minWidth: duration * scale + 'px' } },
    ticks.map((tick) =>
      React.createElement(
        'div',
        {
          key: tick,
          style: {
            position: 'absolute',
            left: tick * scale + 'px',
            top: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          },
        },
        React.createElement('div', {
          style: {
            width: '1px',
            height: tick % 1000 === 0 ? '8px' : '4px',
            backgroundColor: tick % 1000 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)',
          },
        }),
        tick % 1000 === 0 &&
          React.createElement(
            'div',
            {
              style: {
                fontSize: '9px',
                color: 'rgba(255,255,255,0.4)',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                paddingTop: '1px',
                userSelect: 'none',
              },
            },
            tick === 0 ? '0s' : `${tick / 1000}s`,
          ),
      ),
    ),
  );
};

// ─── Playhead ─────────────────────────────────────────────────────────────────

const Playhead = observer(({ store, scale, height }: { store: any; scale: number; height: number }) => {
  const time = store.isPlaying ? store.currentTime : (store.activePage?.startTime ?? 0);
  return React.createElement(
    'div',
    {
      style: {
        position: 'absolute',
        left: time * scale + 'px',
        top: 0,
        width: '2px',
        height: height + 'px',
        backgroundColor: 'rgba(0,161,255,0.9)',
        pointerEvents: 'none',
        zIndex: 10,
      },
    },
    // Downward triangle at top
    React.createElement('div', {
      style: {
        position: 'absolute',
        top: '-6px',
        left: '-5px',
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '7px solid rgba(0,161,255,0.9)',
      },
    }),
  );
});

// ─── Preview queue ─────────────────────────────────────────────────────────────

type PreviewTask = { page: any; setPreview: (url: string) => void };
let previewQueue: PreviewTask[] = [];
let isRendering = false;

const drainPreviewQueue = async () => {
  if (isRendering || previewQueue.length === 0) return;
  isRendering = true;
  const { page, setPreview } = previewQueue.shift()!;
  try {
    setPreview(await page.store.toDataURL({ pageId: page.id, pixelRatio: 0.1, quickMode: true }));
  } catch (err: any) {
    if (err.message?.includes('Canvas was unmounted.')) return;
    throw err;
  }
  isRendering = false;
  drainPreviewQueue();
};

// ─── PageThumb ─────────────────────────────────────────────────────────────────

const PageThumb = observer(({ page, scale }: { page: any; scale: number }) => {
  const [preview, setPreview] = React.useState<string | null>(null);
  const isActive = page.store.activePage === page || page.store._selectedPagesIds.includes(page.id);
  const store = page.store;
  const visibleRef = React.useRef(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pageIndex = page.store.pages.indexOf(page);
  const thumbWidth = (60 / page.computedHeight) * page.computedWidth;
  const width = flags.animationsEnabled ? page.duration * scale : thumbWidth;
  const hasMultiplePages = store.pages.length > 1;

  React.useLayoutEffect(() => {
    if (containerRef.current) containerRef.current.style.width = width + 'px';
  }, [pageIndex, width]);

  React.useEffect(() => {
    const enqueue = () => { previewQueue.push({ page, setPreview }); drainPreviewQueue(); };
    let debounceTimer: any = null;
    let throttleTimer: any = null;
    let lastRender = Date.now();

    const scheduleRender = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (!visibleRef.current) return;
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          if (Date.now() - lastRender >= 6000) { enqueue(); lastRender = Date.now(); throttleTimer = null; }
        }, 6000);
      }
      debounceTimer = setTimeout(() => {
        enqueue(); lastRender = Date.now(); debounceTimer = null;
        if (throttleTimer) { clearTimeout(throttleTimer); throttleTimer = null; }
      }, 300);
    };

    let lastSnapshot: any = null;
    const unsubSnapshot = onSnapshot(page, (snap) => { if (!deepEqual(lastSnapshot, snap)) { scheduleRender(); lastSnapshot = snap; } });
    const unsubReaction = reaction(() => page.children.some((el: any) => el._editModeEnabled), (active) => { if (!active) scheduleRender(); });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { visibleRef.current = true; scheduleRender(); }
        else {
          if (debounceTimer) clearTimeout(debounceTimer);
          if (throttleTimer) clearTimeout(throttleTimer);
          visibleRef.current = false;
        }
      });
    }, { threshold: 0.1 });

    if (containerRef.current) io.observe(containerRef.current);
    return () => {
      io.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (throttleTimer) clearTimeout(throttleTimer);
      unsubSnapshot();
      unsubReaction();
      previewQueue = previewQueue.filter((t) => t.page !== page);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    const currentSelected = store._selectedPagesIds.length ? store._selectedPagesIds : [store.activePage?.id];
    const isSelected = currentSelected.includes(page.id);
    const shift = e && e.shiftKey;
    if (shift && isSelected) store.selectPages(currentSelected.filter((id: string) => id !== page.id));
    else if (shift && !isSelected) store.selectPages(currentSelected.concat([page.id]));
    else store.selectPages([page.id]);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const { clientX } = e;
      const { left, width: w } = containerRef.current!.getBoundingClientRect();
      const ratio = (clientX - left - (-7)) / w;
      page.set({ duration: Math.max(1000, ratio * page.duration) });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', () => { window.removeEventListener('mousemove', onMove); });
  };

  return React.createElement(
    PageContainer,
    {
      style: { width: width + 'px', marginRight: '2px', height: PAGE_ROW_H + 'px' },
      ref: containerRef,
      className: `raeditor-page-container${isActive ? ' sortable-selected' : ''}`,
    },
    // Film strip background
    React.createElement('div', {
      style: {
        width: '100%',
        height: '100%',
        borderRadius: '6px',
        backgroundImage: preview ? `url("${preview}")` : 'none',
        backgroundRepeat: 'repeat-x',
        backgroundSize: 'auto 100%',
        backgroundColor: '#2a2a2a',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      onClick: handleClick,
    },
      !preview && React.createElement(Spinner, null),
    ),
    // Border overlay
    React.createElement('div', {
      style: {
        position: 'absolute',
        top: 0, left: 0, bottom: 0, right: 0,
        borderRadius: '6px',
        border: isActive ? '2px solid rgba(0,161,255,0.9)' : '1px solid rgba(255,255,255,0.12)',
        zIndex: 1,
        pointerEvents: 'none',
      },
    }),
    // Duration badge
    flags.animationsEnabled && React.createElement('div', {
      style: {
        position: 'absolute', zIndex: 2, bottom: '5px', left: '6px',
        backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',
        padding: '1px 6px', fontSize: '11px', borderRadius: '4px',
        pointerEvents: 'none',
      },
    }, (page.duration / 1000).toFixed(1), 's'),
    // Resize handle
    flags.animationsEnabled && React.createElement('div', {
      style: {
        position: 'absolute', zIndex: 2, top: '50%', right: '0px',
        width: '7px', height: '40%',
        transform: 'translateY(-50%) translateX(-2px)',
        borderRadius: '4px',
        backgroundColor: 'rgba(255,255,255,0.35)',
        cursor: 'ew-resize',
      },
      onMouseDown: handleResizeMouseDown,
    }),
    // Page menu
    isActive && React.createElement(
      PageMenuOverlay,
      { className: 'raeditor-page-menu', onClick: (e: any) => e.stopPropagation() },
      React.createElement(
        Popover,
        {
          content: React.createElement(
            Menu,
            { style: { width: '140px' } },
            React.createElement(MenuItem, {
              icon: React.createElement(Duplicate, null),
              text: t('pagesTimeline.duplicatePage'),
              onClick: () => {
                const selectedPages = (store.selectedPages || []).filter(Boolean);
                const targets = selectedPages.length ? selectedPages : store.activePage ? [store.activePage] : [];
                if (!targets.length) return;
                const ids = new Set(targets.map((p: any) => p.id));
                const toClone = store.pages.filter((p: any) => ids.has(p.id));
                const lastPage = toClone[toClone.length - 1];
                const clones = toClone.map((p: any) => p.clone());
                const insertIdx = store.pages.indexOf(lastPage);
                clones.forEach((clone: any, i: number) => { clone.setZIndex(insertIdx + 1 + i); });
                store.selectPages(clones.map((c: any) => c.id));
              },
            }),
            React.createElement(MenuItem, {
              icon: React.createElement(Insert, null),
              text: t('pagesTimeline.addPage'),
              onClick: () => {
                const newPage = store.addPage({ bleed: store.activePage?.bleed || 0, width: store.activePage?.width || 'auto', height: store.activePage?.height || 'auto' });
                const idx = store.pages.indexOf(page);
                newPage.setZIndex(idx + 1);
              },
            }),
            hasMultiplePages && React.createElement(MenuItem, {
              icon: React.createElement(Trash, null),
              text: t('pagesTimeline.removePage'),
              onClick: () => {
                const selectedPages = (store.selectedPages || []).filter(Boolean);
                const idsToDelete = selectedPages.length ? selectedPages.map((p: any) => p.id) : store.activePage ? [store.activePage.id] : [];
                if (idsToDelete.length) store.deletePages(idsToDelete);
              },
            }),
          ),
          position: Position.TOP,
        },
        React.createElement(Button, {
          icon: React.createElement(More, null),
          style: { minHeight: '20px', borderRadius: '10px', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' },
        }),
      ),
    ),
  );
});

// ─── Pages sortable list ───────────────────────────────────────────────────────

export const Pages = observer(({ store, scale }: { store: any; scale: number }) => {
  const list = store.pages.map((p: any) => ({ id: p.id }));
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      ReactSortable,
      {
        list,
        setList: (newList: any[]) => {
          newList.forEach(({ id }, i) => {
            const page = store.pages.find((p: any) => p.id === id);
            if (store.pages.indexOf(page) !== i) page.setZIndex(i);
          });
        },
        direction: 'horizontal',
        style: { display: 'flex', flexDirection: 'row' },
        delay: 500,
        delayOnTouchOnly: true,
        className: 'raeditor-pages-container',
      },
      ...list.map(({ id }: any) => {
        const page = store.pages.find((p: any) => p.id === id);
        return React.createElement(PageThumb, { page, scale, key: id });
      }),
    ),
  );
});

// ─── Audio waveform ───────────────────────────────────────────────────────────

function useAudioWaveform(src: string | null) {
  const [data, setData] = React.useState<number[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<any>(null);

  React.useEffect(() => {
    if (!src) { setData(null); return; }
    setIsLoading(true);
    const ctx = new AudioContext();
    fetch(src).then((r) => r.arrayBuffer()).then((buf) => ctx.decodeAudioData(buf)).then((decoded) => {
      const samples = decoded.getChannelData(0);
      const step = Math.max(1, Math.floor(samples.length / 100));
      const peaks: number[] = [];
      for (let i = 0; i < samples.length; i += step) {
        let max = 0;
        for (let j = 0; j < step && i + j < samples.length; j++) max = Math.max(max, Math.abs(samples[i + j]));
        peaks.push(max);
      }
      setData(peaks);
      setIsLoading(false);
    }).catch((err) => { console.error('Error generating waveform:', err); setError(err); setIsLoading(false); });
  }, [src]);

  return { data, isLoading, error };
}

function buildWaveformPath(data: number[], width: number, startTime: number, endTime: number, height = 20): string {
  if (!data || width <= 0) return '';
  const mid = height / 2;
  const startIdx = Math.floor(data.length * startTime);
  const endIdx = Math.ceil(data.length * endTime);
  const slice = data.slice(startIdx, endIdx);
  if (slice.length === 0) return '';
  let path = '';
  slice.forEach((val, i) => {
    const x = (i / (slice.length - 1)) * width;
    const y = mid - val * mid;
    path += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
  });
  for (let i = slice.length - 1; i >= 0; i--) {
    const x = (i / (slice.length - 1)) * width;
    const y = mid + slice[i] * mid;
    path += ` L ${x},${y}`;
  }
  return path + ' Z';
}

const AudioTrack = observer(({ audio, scale, store, index }: any) => {
  const maxWidth = store.duration * scale - audio.delay * scale;
  const clipWidth = Math.min((audio.endTime - audio.startTime) * audio.duration * scale, maxWidth);
  const offsetLeft = audio.delay * scale;
  const { data, isLoading } = useAudioWaveform(audio.src);
  const waveformWidth = (audio.endTime - audio.startTime) * audio.duration * scale;

  const snapToPage = (ms: number): number | null => {
    for (const page of store.pages) {
      const start = page.startTime;
      const end = page.startTime + page.duration;
      if (Math.abs(ms - start) < 10 / scale) return start;
      if (Math.abs(ms - end) < 10 / scale) return end;
    }
    return null;
  };

  const startHandleMouseDown = (e: React.MouseEvent, handle: 'start' | 'end') => {
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX;
    const origDelay = offsetLeft;
    const origClip = clipWidth;
    const origEnd = audio.endTime;
    const origStart = audio.startTime;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const dx = (e.clientX - startX) / scale;
      if (handle === 'start') {
        let newDelay = Math.max(0, origDelay / scale + dx);
        newDelay = snapToPage(newDelay) ?? newDelay;
        const offsetInAudio = dx / audio.duration;
        const newStart = Math.min(audio.endTime - 0.1, Math.max(0, origStart + offsetInAudio));
        audio.set({ delay: newDelay, startTime: newStart });
      } else {
        const newRight = origDelay / scale + origClip / scale + dx;
        let newEnd = snapToPage(newRight) ?? newRight;
        const delta = (newEnd - origDelay / scale - origClip / scale) / audio.duration;
        const endTime = Math.min(1, Math.max(audio.startTime + 0.1, origEnd + delta));
        audio.set({ endTime });
      }
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onTrackMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const origDelay = offsetLeft;
    e.preventDefault();
    const duration = (audio.endTime - audio.startTime) * audio.duration;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const dx = (e.clientX - startX) / scale;
      let newDelay = Math.max(0, origDelay / scale + dx);
      const snapLeft = snapToPage(newDelay);
      const snapRight = snapToPage(newDelay + duration / scale);
      const dLeft = snapLeft !== null ? Math.abs(newDelay - snapLeft) : Infinity;
      const dRight = snapRight !== null ? Math.abs(newDelay + duration / scale - snapRight) : Infinity;
      if (snapLeft !== null && dLeft < dRight) newDelay = Math.max(0, snapLeft);
      else if (snapRight !== null) newDelay = Math.max(0, snapRight - duration / scale);
      audio.set({ delay: newDelay });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const waveformPath = buildWaveformPath(data || [], waveformWidth, audio.startTime, audio.endTime);

  return React.createElement(
    AudioTrackWrapper,
    {
      style: { position: 'absolute', left: `${offsetLeft}px`, top: 20 * index + 'px', width: `${clipWidth}px`, height: '20px', backgroundColor: 'rgba(0,161,255,0.45)', borderRadius: '8px', cursor: 'move', overflow: 'hidden' },
      onMouseDown: onTrackMouseDown,
      className: 'raeditor-audio-container',
    },
    waveformPath && React.createElement('svg', { width: waveformWidth, height: '100%', viewBox: `0 0 ${waveformWidth} 20`, preserveAspectRatio: 'none' },
      React.createElement('path', { d: waveformPath, fill: 'rgba(255,255,255,0.5)' }),
    ),
    isLoading && React.createElement('div', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' } }, React.createElement(Spinner, null)),
    React.createElement('div', { style: { position: 'absolute', left: 0, top: 0, width: '10px', height: '100%', cursor: 'ew-resize' }, onMouseDown: (e: any) => startHandleMouseDown(e, 'start') }),
    React.createElement('div', { style: { position: 'absolute', right: 0, top: 0, width: '10px', height: '100%', cursor: 'ew-resize' }, onMouseDown: (e: any) => startHandleMouseDown(e, 'end') }),
    React.createElement(
      AudioMenuOverlay,
      { className: 'raeditor-audio-menu', onClick: (e: any) => e.stopPropagation() },
      React.createElement(
        Popover,
        {
          content: React.createElement(Menu, { style: { width: '100px' } },
            React.createElement(MenuItem, { icon: React.createElement(Trash, null), text: t('pagesTimeline.removeAudio'), onClick: () => { store.removeAudio(audio.id); } }),
          ),
          position: Position.TOP,
        },
        React.createElement(Button, { icon: React.createElement(More, null), style: { minHeight: '20px', borderRadius: '10px', padding: '0px' } }),
      ),
    ),
  );
});

const AudioTracks = observer(({ store, scale }: { store: any; scale: number }) =>
  React.createElement('div', { style: { position: 'absolute', bottom: '-15px', paddingTop: '5px' }, className: 'raeditor-audios-container' },
    store.audios.map((audio: any, i: number) =>
      React.createElement(AudioTrack, { key: audio.id, audio, scale, store, index: i }),
    ),
  ),
);

// ─── Layers timeline ──────────────────────────────────────────────────────────

const LayerRow = observer(({ element, scale, pageDuration, pageStartTime, totalDuration }: { element: any; scale: number; pageDuration: number; pageStartTime: number; totalDuration: number }) => {
  const effectiveEnd = element.endOffset < 0 || element.endOffset == null ? pageDuration : element.endOffset;
  const barLeft = (pageStartTime + (element.startOffset || 0)) * scale;
  const barWidth = Math.max(28, (effectiveEnd - (element.startOffset || 0)) * scale);
  const isSelected = (element.store.selectedElementsIds as string[]).includes(element.id);
  const label = element.name || element.type || 'layer';

  const handleBarMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.resize) return;
    e.preventDefault();
    element.store.selectElements([element.id]);
    const startX = e.clientX;
    const origStart = element.startOffset || 0;
    const origDuration = effectiveEnd - origStart;
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const newStart = Math.max(0, Math.min(pageDuration - origDuration, origStart + dx));
      const newEnd = newStart + origDuration;
      element.set({ startOffset: Math.round(newStart), endOffset: newEnd >= pageDuration - 10 ? -1 : Math.round(newEnd) });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX;
    const origStart = element.startOffset || 0;
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const newStart = Math.max(0, Math.min(effectiveEnd - 100, origStart + dx));
      element.set({ startOffset: Math.round(newStart) });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX;
    const origEnd = effectiveEnd;
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const newEnd = Math.max((element.startOffset || 0) + 100, Math.min(pageDuration, origEnd + dx));
      element.set({ endOffset: newEnd >= pageDuration - 10 ? -1 : Math.round(newEnd) });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const CIRCLE = 14;
  const barBg = isSelected ? 'rgba(0,110,190,0.85)' : 'rgba(18,80,150,0.72)';
  const borderColor = isSelected ? 'rgba(0,161,255,0.9)' : 'rgba(80,140,200,0.35)';

  return React.createElement(
    'div',
    { style: { position: 'relative', height: LAYER_ROW_H + 'px', borderTop: '1px solid rgba(255,255,255,0.04)', minWidth: totalDuration * scale + 'px' } },
    // Subtle row background — scoped to this page's time range
    React.createElement('div', {
      style: { position: 'absolute', left: pageStartTime * scale + 'px', top: 0, width: pageDuration * scale + 'px', height: '100%', backgroundColor: 'rgba(255,255,255,0.015)' },
    }),
    // The bar
    React.createElement(
      'div',
      {
        style: {
          position: 'absolute',
          left: barLeft + 'px',
          top: '4px',
          width: barWidth + 'px',
          height: (LAYER_ROW_H - 8) + 'px',
          backgroundColor: barBg,
          borderRadius: '10px',
          border: `1.5px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          overflow: 'hidden',
          userSelect: 'none',
          boxSizing: 'border-box',
        },
        onMouseDown: handleBarMouseDown,
      },
      // Left circle handle
      React.createElement('div', {
        'data-resize': 'left',
        style: {
          width: CIRCLE + 'px',
          height: CIRCLE + 'px',
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.55)',
          flexShrink: 0,
          marginLeft: '2px',
          cursor: 'ew-resize',
          boxSizing: 'border-box',
        },
        onMouseDown: handleLeftMouseDown,
      }),
      // Label
      React.createElement('div', {
        style: {
          flex: 1,
          paddingLeft: '5px',
          paddingRight: '5px',
          fontSize: '11px',
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.8)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, label),
      // Right circle handle
      React.createElement('div', {
        'data-resize': 'right',
        style: {
          width: CIRCLE + 'px',
          height: CIRCLE + 'px',
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.55)',
          flexShrink: 0,
          marginRight: '2px',
          cursor: 'ew-resize',
          boxSizing: 'border-box',
        },
        onMouseDown: handleRightMouseDown,
      }),
    ),
  );
});

export const LayersTimeline = observer(({ store, scale }: { store: any; scale: number }) => {
  if (!store.pages?.length) return null;
  const totalDuration = store.duration;
  // Gather all elements across all pages, top-most layer first within each page
  const rows: Array<{ el: any; page: any }> = [];
  for (const page of store.pages) {
    const reversed = [...page.children].reverse();
    for (const el of reversed) rows.push({ el, page });
  }
  return React.createElement(
    React.Fragment,
    null,
    rows.map(({ el, page }) =>
      React.createElement(LayerRow, {
        key: el.id,
        element: el,
        scale,
        pageDuration: page.duration,
        pageStartTime: page.startTime,
        totalDuration,
      }),
    ),
  );
});

// ─── Main export ────────────────────────────────────────────────────────────────

export const PagesTimeline = observer(({ store, defaultOpened = false }: { store: any; defaultOpened?: boolean }) => {
  const [opened, setOpened] = React.useState(defaultOpened);
  const [scale, setScale] = React.useState(0.1); // px per ms; 0.1 = 100px/s
  const [panelHeight, setPanelHeight] = React.useState(180);

  const zoomIn = () => setScale((s) => Math.min(0.5, parseFloat((s * 1.5).toFixed(4))));
  const zoomOut = () => setScale((s) => Math.max(0.012, parseFloat((s / 1.5).toFixed(4))));

  const handleResizeDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panelHeight;
    const onMove = (ev: MouseEvent) => {
      // Dragging the top edge upward increases height
      setPanelHeight(Math.max(80, Math.min(700, startH + (startY - ev.clientY))));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const elementCount = flags.animationsEnabled
    ? (store.pages as any[]).reduce((sum: number, p: any) => sum + (p.children?.length || 0), 0)
    : 0;
  const audioRows = store.audios?.length || 0;

  // Total natural content height (used to size inner scroll container)
  const contentHeight = RULER_H + PAGE_ROW_H + audioRows * 20 + elementCount * LAYER_ROW_H + 8;

  return React.createElement(
    React.Fragment,
    null,

    // ── Floating "Pages" toggle button (sits above the canvas edge) ──
    React.createElement(
      TimelineWrapper,
      null,
      React.createElement(
        TimelineFloating,
        null,
        React.createElement(
          'div',
          { style: { height: '35px', padding: '0 5px', display: 'flex', alignItems: 'center' } },
          React.createElement(Button, {
            minimal: true,
            onClick: () => setOpened(!opened),
            icon: flags.animationsEnabled && !opened ? React.createElement(Play, null) : null,
          }, t('pagesTimeline.pages')),
        ),
      ),
    ),

    // ── Dark timeline panel ──
    React.createElement(
      TimelinePanel,
      {
        style: { display: opened ? 'flex' : 'none', flexDirection: 'column', height: panelHeight + 'px' },
        className: 'raeditor-pages-timeline',
      },

      // Drag-to-resize handle (top edge)
      React.createElement('div', {
        style: {
          height: '6px',
          cursor: 'ns-resize',
          flexShrink: 0,
          background: 'transparent',
          borderTop: '2px solid rgba(255,255,255,0.08)',
        },
        onMouseDown: handleResizeDragStart,
      }),

      // Top bar: play controls (center) + zoom (right)
      React.createElement(
        TimelineTopBar,
        null,
        // Left spacer
        React.createElement('div', { style: { flex: 1 } }),

        // Play / time display (center)
        flags.animationsEnabled && React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
          React.createElement('span', {
            style: { fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums', minWidth: '90px', textAlign: 'right' },
          }, formatTime(store.currentTime), ' / ', formatTime(store.duration)),
          React.createElement(Button, {
            minimal: true,
            icon: store.isPlaying
              ? React.createElement(Pause, { size: 18 } as any)
              : React.createElement(Play, { size: 18 } as any),
            style: { color: 'white' },
            onClick: () => {
              if (store.isPlaying) {
                const page = store.activePage;
                store.stop();
                if (page) store.selectPage(page.id);
              } else {
                store.play({ startTime: store.activePage?.startTime || 0 });
              }
            },
          }),
        ),

        // Right spacer
        React.createElement('div', { style: { flex: 1 } }),

        // Zoom controls (right)
        flags.animationsEnabled && React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '2px' } },
          React.createElement('span', {
            style: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginRight: '4px', userSelect: 'none' },
          }, 'Zoom timeline'),
          React.createElement(Button, {
            minimal: true, small: true,
            style: { color: 'rgba(255,255,255,0.7)', minWidth: '26px', fontSize: '16px' },
            onClick: zoomOut,
          }, '—'),
          React.createElement(Button, {
            minimal: true, small: true,
            style: { color: 'rgba(255,255,255,0.7)', minWidth: '26px', fontSize: '18px' },
            onClick: zoomIn,
          }, '+'),
        ),
      ),

      // Scrollable timeline content (fills remaining panel height)
      React.createElement(
        'div',
        {
          style: {
            overflowX: 'auto',
            overflowY: 'auto',
            position: 'relative',
            flex: 1,
            minHeight: 0,
          },
        },
        React.createElement(
          'div',
          { style: { padding: '0 8px', position: 'relative', minWidth: 'max-content', minHeight: contentHeight + 'px' } },

          // Time ruler
          flags.animationsEnabled && React.createElement(TimeRuler, {
            duration: store.duration,
            scale,
          }),

          // Pages row
          React.createElement(
            'div',
            { style: { display: 'flex', position: 'relative', height: PAGE_ROW_H + 'px' } },
            React.createElement(
              'div',
              { style: { position: 'relative', flexShrink: 0 } },
              React.createElement(Pages, { store, scale }),
              flags.animationsEnabled && React.createElement(AudioTracks, { store, scale }),
            ),
            React.createElement(Button, {
              icon: React.createElement(Plus, null),
              style: { width: '44px', height: PAGE_ROW_H + 'px', flexShrink: 0, color: 'rgba(255,255,255,0.6)', marginLeft: '4px' },
              onClick: () => { store.addPage({ bleed: store.activePage?.bleed || 0 }); },
              minimal: true,
            }),
          ),

          // Layer rows (active page elements)
          flags.animationsEnabled && React.createElement(LayersTimeline, { store, scale }),

          // Playhead spanning ruler + pages + layers
          flags.animationsEnabled && React.createElement(Playhead, {
            store,
            scale,
            height: contentHeight,
          }),
        ),
      ),
    ),
  );
});
