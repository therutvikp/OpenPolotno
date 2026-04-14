'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { ElementContainer, extendToolbar } from './element-container';
import { Button, Popover, NumericInput, Navbar, NavbarGroup, Slider } from '@blueprintjs/core';
import { AnimationsPicker } from './animations-picker';
import { flags } from '../utils/flags';
import { getVideoDuration, getVideoObjectPreview, getVideoSize } from '../utils/video';
import { t } from '../utils/l10n';
import { Cut, VolumeUp } from '@blueprintjs/icons';

export const VideoTrim = observer(({ store, components, element }: any) => {
  const barRef = React.useRef<HTMLDivElement>(null);
  const [previews, setPreviews] = React.useState<string[]>([]);
  React.useEffect(() => { setPreviews([]); }, [element.src]);

  const startDrag = (e: React.MouseEvent, handle: 'start' | 'end') => {
    e.preventDefault();
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const { clientX } = e;
      const { left, width } = barRef.current!.getBoundingClientRect();
      const ratio = (clientX - left) / width;
      if (handle === 'start') element.set({ startTime: Math.min(element.endTime, Math.max(0, ratio)) });
      else element.set({ endTime: Math.min(1, Math.max(element.startTime, ratio)) });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', () => { window.removeEventListener('mousemove', onMove); });
  };

  return React.createElement(
    Popover,
    {
      position: 'bottom',
      onOpened: async () => {
        if (!element.src || previews.length) return;
        const { width, height } = await getVideoSize(element.src);
        const aspectRatio = width / height;
        const barH = barRef.current!.offsetHeight;
        const barW = barRef.current!.offsetWidth;
        const previewW = barH * aspectRatio;
        const count = Math.ceil(barW / previewW);
        const duration = await getVideoDuration(element.src);
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = element.src;
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        try {
          await new Promise<void>((resolve, reject) => {
            video.addEventListener('loadeddata', () => {
              const r = video.videoWidth / video.videoHeight;
              canvas.height = 480 / r;
              resolve();
            });
            video.addEventListener('error', reject);
          });
          setPreviews([]);
          for (let i = 0; i < count; i++) {
            const time = (i * duration) / count;
            const dataUrl = await getVideoObjectPreview(video, canvas, time);
            setPreviews((prev) => prev.concat(dataUrl));
          }
        } catch (err) {
          console.error('Error generating previews:', err);
        }
      },
      content: React.createElement(
        Navbar,
        { style: { boxShadow: 'none', backgroundColor: 'transparent', width: 'calc(100vw - 300px)' } },
        React.createElement(
          NavbarGroup,
          null,
          React.createElement(NumericInput, {
            style: { width: '80px' },
            value: parseFloat((element.duration * (element.endTime - element.startTime) / 1000).toFixed(2)),
            minorStepSize: 0.01,
            stepSize: 0.1,
            buttonPosition: 'none',
            readOnly: true,
          }),
          React.createElement(
            'div',
            { style: { width: 'calc(100vw - 420px)', height: '30px', display: 'flex', position: 'relative', overflow: 'hidden', marginLeft: '10px' }, ref: barRef },
            ...previews.map((src, i) => React.createElement('img', { key: i, src, style: { width: 'auto', height: '100%', objectFit: 'cover' } })),
            React.createElement('div', { style: { position: 'absolute', top: 0, left: 0, width: `${100 * element.startTime}%`, height: '30px', backgroundColor: 'rgba(0,0,0,0.5)' } }),
            React.createElement('div', { style: { position: 'absolute', top: 0, right: '0%', width: `${100 - 100 * element.endTime}%`, height: '30px', backgroundColor: 'rgba(0,0,0,0.5)' } }),
            React.createElement('div', { style: { position: 'absolute', top: 0, left: `${100 * element.startTime}%`, width: '10px', height: '30px', backgroundColor: 'rgba(0,161,255,0.9)', cursor: 'ew-resize' }, onMouseDown: (e: any) => startDrag(e, 'start') }),
            React.createElement('div', { style: { position: 'absolute', top: 0, right: `${100 - 100 * element.endTime}%`, width: '10px', height: '30px', backgroundColor: 'rgba(0,161,255,0.9)', cursor: 'ew-resize' }, onMouseDown: (e: any) => startDrag(e, 'end') }),
          ),
        ),
      ),
    },
    React.createElement(Button, { icon: React.createElement(Cut, null), minimal: true }, 'Trim'),
  );
});

const VideoVolume = observer(({ element }: any) => {
  const volumePct = Math.round(100 * element.volume);
  const setVolume = (v: number) => { element.set({ volume: v / 100 }); };
  return React.createElement(
    Popover,
    {
      position: 'bottom',
      content: React.createElement(
        'div',
        { style: { padding: '10px', width: '250px' } },
        React.createElement(
          'div',
          { style: { display: 'flex', width: '100%', justifyContent: 'space-between' } },
          React.createElement('div', { style: { paddingTop: '7px', paddingLeft: '10px', width: 'calc(100% - 80px)' } },
            React.createElement(Slider, { value: volumePct, onChange: setVolume, min: 0, max: 100, labelStepSize: 50, showTrackFill: false, labelRenderer: false }),
          ),
          React.createElement(NumericInput, { value: volumePct, onValueChange: (v: number) => setVolume(Math.max(0, Math.min(100, v))), buttonPosition: 'none', style: { width: '50px', padding: '0 5px', marginLeft: '10px' }, min: 0, max: 100 }),
        ),
      ),
    },
    React.createElement(Button, { icon: React.createElement(VolumeUp, null), minimal: true, 'aria-label': 'Volume' }),
  );
});

export const VideoClip = observer(({ element, store }: any) => {
  if (!element.contentEditable) return null;
  if (element.clipSrc) {
    return React.createElement(Button, { text: t('toolbar.removeClip'), minimal: true, onClickCapture: () => { element.set({ clipSrc: '' }); } });
  }
  return React.createElement(Button, { minimal: true, text: t('toolbar.clip'), onClickCapture: (e: any) => { e.stopPropagation(); store.openSidePanel('image-clip'); } });
});

const defaultVideoComponents: Record<string, any> = {
  VideoTrim,
  VideoAnimations: AnimationsPicker,
  VideoVolume,
  VideoClip,
};

export const VideoToolbar = observer(({ store, components }: any) => {
  const elements = store.selectedElements;
  const usedItems = ['VideoTrim', 'VideoVolume', 'VideoClip', flags.animationsEnabled && 'VideoAnimations'].filter(Boolean) as string[];
  const items = extendToolbar({ type: 'video', usedItems, components });
  return React.createElement(ElementContainer, {
    items,
    itemRender: (key: string) => {
      const Component = components[key] || defaultVideoComponents[key];
      return React.createElement(Component, { elements, element: elements[0], store, key });
    },
  });
});

export default VideoToolbar;
