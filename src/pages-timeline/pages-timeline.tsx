'use client';

import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
import React from 'react';
import { onSnapshot } from 'mobx-state-tree';
import { Button, Navbar, Popover, Menu, MenuItem, Position } from '@blueprintjs/core';
import { Play, Plus, Pause, Duplicate, Insert, Trash, More } from '@blueprintjs/icons';
import { ReactSortable } from 'react-sortablejs';
import { flags } from '../utils/flags';
import styled from '../utils/styled';
import { t } from '../utils/l10n';
import { deepEqual } from '../utils/deep-equal';

// ─── Styled components ────────────────────────────────────────────────────────

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

const PageContainer = styled('div', React.forwardRef)`
  display: flex;
  position: relative;
  border-radius: 15px;

  &:hover {
    .raeditor-page-menu {
      opacity: 1;
      pointer-events: auto;
    }
  }
`;

const AudioTrackWrapper = styled('div')`
  position: relative;

  &:hover {
    .raeditor-audio-menu {
      opacity: 1;
      pointer-events: auto;
    }
  }
`;

const PageMenuOverlay = styled('div')`
  position: absolute;
  z-index: 20;
  top: 5px;
  right: 5px;
  opacity: 0;
  pointer-events: none;

  &:hover {
    display: block;
  }
`;

const Spinner = styled('div')`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #09f;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const AudioMenuOverlay = styled('div')`
  position: absolute;
  z-index: 20;
  top: -5px;
  right: 8px;
  opacity: 0;
  pointer-events: none;

  &:hover {
    display: block;
  }
`;

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
      style: { width: width + 'px', marginRight: flags.animationsEnabled ? '0px' : '10px', height: '60px' },
      ref: containerRef,
      className: `raeditor-page-container${isActive ? ' sortable-selected' : ''}`,
    },
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          borderRadius: '15px',
          backgroundImage: preview ? `url("${preview}")` : 'none',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
        onClick: handleClick,
      },
      !preview && React.createElement(Spinner, null),
    ),
    React.createElement('div', {
      style: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, borderRadius: '15px', border: isActive ? '2px solid rgba(0, 161, 255, 0.9)' : '2px solid lightgrey', zIndex: 1, pointerEvents: 'none' },
    }),
    flags.animationsEnabled && React.createElement('div', {
      style: { position: 'absolute', zIndex: 1, bottom: '5px', left: '5px', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '2px 7px', textAlign: 'center', borderRadius: '4rem' },
    }, (page.duration / 1000).toFixed(1), 's'),
    flags.animationsEnabled && React.createElement('div', {
      style: { position: 'absolute', zIndex: 1, top: '50%', right: '0px', width: '8px', height: '50%', transform: 'translateY(-50%) translateX(-3px)', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.6)', backgroundColor: 'rgba(0,0,0,0.6)', cursor: 'ew-resize' },
      onMouseDown: handleResizeMouseDown,
    }),
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
        React.createElement(Button, { icon: React.createElement(More, null), style: { minHeight: '20px', borderRadius: '10px' } }),
      ),
    ),
  );
});

// ─── Playhead ─────────────────────────────────────────────────────────────────

const Playhead = observer(({ store, scale }: { store: any; scale: number }) => {
  const time = store.isPlaying ? store.currentTime : (store.activePage?.startTime ?? 0);
  return React.createElement('div', {
    style: { position: 'absolute', left: time * scale + 'px', top: '-5px', width: '2px', height: 'calc(100% + 10px)', backgroundColor: 'rgba(0,161,255,0.9)' },
  });
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
    e.stopPropagation();
    e.preventDefault();
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
      else if (snapRight !== null && snapRight !== null) newDelay = Math.max(0, snapRight - duration / scale);
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
      style: { position: 'absolute', left: `${offsetLeft}px`, top: 20 * index + 'px', width: `${clipWidth}px`, height: '20px', backgroundColor: 'rgba(0,161,255,0.5)', borderRadius: '8px', cursor: 'move', overflow: 'hidden' },
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

// ─── Play controls ─────────────────────────────────────────────────────────────

const formatTime = (ms: number): string => {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const PlayButtonContainer = styled('div')`
  position: absolute;
  top: 5px;
  left: 5px;
  padding-right: 8px;
  z-index: 2;
  width: 100px;
  text-align: center;
`;

const PlayControls = observer(({ store }: { store: any }) =>
  React.createElement(
    PlayButtonContainer,
    { className: 'raeditor-play-button-container' },
    React.createElement(Button, {
      icon: store.isPlaying ? React.createElement(Pause, { size: 25 } as any) : React.createElement(Play, { size: 25 } as any),
      onClick: () => {
        if (store.isPlaying) { const page = store.activePage; store.stop(); if (page) store.selectPage(page.id); }
        else store.play({ startTime: store.activePage?.startTime || 0 });
      },
      style: { width: '60px', height: '60px', borderRadius: '50px' },
    }),
    React.createElement('div', { style: { paddingTop: '5px' } }, formatTime(store.currentTime), ' / ', formatTime(store.duration)),
  ),
);

// ─── Main export ────────────────────────────────────────────────────────────────

export const PagesTimeline = observer(({ store, defaultOpened = false }: { store: any; defaultOpened?: boolean }) => {
  const scale = 0.02;
  const [opened, setOpened] = React.useState(defaultOpened);
  const timelineHeight = flags.animationsEnabled ? 10 * store.audios.length + 90 : 90;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      TimelineWrapper,
      null,
      React.createElement(
        TimelineFloating,
        null,
        React.createElement(
          Navbar,
          { style: { height: '35px', padding: '0 5px' } },
          React.createElement(
            Navbar.Group,
            { style: { height: '35px' } },
            React.createElement(Button, {
              minimal: true,
              onClick: () => setOpened(!opened),
              icon: flags.animationsEnabled && !opened ? React.createElement(Play, null) : null,
            }, t('pagesTimeline.pages')),
          ),
        ),
      ),
    ),
    React.createElement(
      Navbar,
      { style: { padding: '5px', height: 'auto', zIndex: 1, display: opened ? 'block' : 'none' }, className: 'raeditor-pages-timeline' },
      React.createElement(
        'div',
        { style: { width: '100%', position: 'relative', height: timelineHeight } },
        React.createElement(
          'div',
          { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflowX: 'auto', padding: '5px', zIndex: 1, display: 'flex' } },
          React.createElement(
            'div',
            { style: { height: '60px', display: 'flex' } },
            flags.animationsEnabled && React.createElement('div', { style: { width: '90px', paddingRight: '5px', paddingLeft: '60px' } }),
            React.createElement(
              'div',
              { style: { position: 'relative' } },
              React.createElement(Pages, { store, scale }),
              flags.animationsEnabled && React.createElement(Playhead, { store, scale }),
              flags.animationsEnabled && React.createElement(AudioTracks, { store, scale }),
            ),
            React.createElement(Button, {
              icon: React.createElement(Plus, null),
              style: { width: '60px' },
              onClick: () => { store.addPage({ bleed: store.activePage?.bleed || 0 }); },
              minimal: true,
            }),
          ),
        ),
        flags.animationsEnabled && React.createElement(PlayControls, { store }),
      ),
    ),
  );
});
