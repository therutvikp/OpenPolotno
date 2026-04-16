'use client';

import React from 'react';
import { Tab, Tabs, Popover, NumericInput } from '@blueprintjs/core';
import { Slider } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import { t } from '../utils/l10n';
import Sketch from './sketch';
import styled from '../utils/styled';
import { parseColor, parseRadialColor, isGradient, isLinearGradient, isRadialGradient } from '../utils/gradient';
import { isPattern, parsePattern, buildPatternValue, createPatternCanvas, PATTERNS } from '../utils/pattern';
import { sameColors } from '../utils/svg';

export const DEFAULT_COLORS = [
  '#D0021B','#F5A623','#F8E71C','#8B572A','#7ED321','#417505',
  '#BD10E0','#9013FE','#4A90E2','#50E3C2','#B8E986','#000000',
  '#4A4A4A','#9B9B9B','#FFFFFF',
].reverse();

export const getUsedColors = (store: any): string[] => {
  const colors: string[] = [];
  store.pages.forEach((page: any) => {
    page.children.forEach((el: any) => {
      if (el.shadowEnabled) colors.push(el.shadowColor);
      if (el.type === 'text') {
        colors.push(el.fill);
        if (el.backgroundEnabled) colors.push(el.backgroundColor);
        if (el.strokeWidth) colors.push(el.stroke);
      }
      if (el.type === 'svg') colors.push(...el.colorsReplace.values());
      if (el.type === 'figure') { colors.push(el.fill); if (el.strokeWidth) colors.push(el.stroke); }
      if (el.type === 'line') colors.push(el.color);
    });
  });
  const flat: string[] = [];
  colors.forEach((c) => {
    if (isGradient(c)) {
      const { stops } = parseColor(c);
      flat.push(...stops.map((s: any) => s.color));
    } else if (!isPattern(c)) {
      flat.push(c);
    }
  });
  return [...new Set(flat)];
};

const SketchWrapper = styled('div')`
  & .sketch-picker {
    padding: 0px !important;
    box-shadow: none !important;
    background: none !important;
  }

  & .flexbox-fix {
    border-top: none !important;
  }

  .bp5-dark & .sketch-picker {
    background-color: #394b59;
  }

  .bp5-dark & .sketch-picker label {
    color: #f5f8fa !important;
  }
`;

const ColorInput = ({ style, color, onChange, ...rest }: any) => {
  const [localColor, setLocalColor] = React.useState(color);
  React.useEffect(() => { setLocalColor(color); }, [color]);
  const timerRef = React.useRef<any>(null);
  const pendingRef = React.useRef<string | null>(null);

  return React.createElement(
    SketchWrapper,
    { style, onMouseDown: (e: any) => { if (e.target.tagName !== 'INPUT') e.preventDefault(); } },
    React.createElement(Sketch, {
      color: localColor,
      ...rest,
      onChange: (color: any) => {
        const { r, g, b, a } = color.rgb;
        const rgba = `rgba(${r},${g},${b},${a})`;
        setLocalColor(rgba);
        pendingRef.current = rgba;
        if (!timerRef.current) {
          timerRef.current = window.setTimeout(() => {
            timerRef.current = 0;
            onChange(pendingRef.current);
          }, 50);
        }
      },
    }),
  );
};

const stopOffsets = (stops: any[]) => stops.map((s) => `${s.color} ${100 * s.offset}%`).join(',');

const GradientInput = ({ value, onChange, store, preset }: any) => {
  const { rotation, stops } = parseColor(value);
  const stopsRef = React.useRef(stops);
  stopsRef.current = stops;
  const rotationRef = React.useRef(rotation);
  rotationRef.current = rotation;
  const [activeStop, setActiveStop] = React.useState(0);
  const barRef = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  React.useEffect(() => {
    barRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const rect = barRef.current!.getBoundingClientRect();
      const offset = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const isOOB = (e.clientX - rect.left) / rect.width < -0.5 || (e.clientX - rect.left) / rect.width > 1.5;
      if (stopsRef.current.length > 2 && isOOB) {
        setActiveStop(0);
        dragging.current = false;
        stopsRef.current.splice(activeStop, 1);
        onChange(`linear-gradient(${rotationRef.current}deg, ${stopOffsets(stopsRef.current)})`);
        return;
      }
      const updated = [...stopsRef.current];
      updated[activeStop].offset = offset;
      onChange(`linear-gradient(${rotationRef.current}deg, ${stopOffsets(updated)})`);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [activeStop, stopsRef]);

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { style: { width: 'calc(100% - 35px)', height: '60px', position: 'relative' } },
      React.createElement(
        'div',
        {
          ref: barRef,
          tabIndex: 0,
          style: { position: 'absolute', top: 0, left: 0, width: '100%', marginLeft: '15px', height: '100%', zIndex: 0, outline: 'none' },
          onKeyDownCapture: (e: any) => {
            if (e.key === 'Backspace') {
              e.preventDefault(); e.stopPropagation();
              if (stopsRef.current.length <= 2) return;
              stopsRef.current.splice(activeStop, 1);
              onChange(`linear-gradient(${rotationRef.current}deg, ${stopOffsets(stopsRef.current)})`);
            }
          },
          onMouseDown: (e: any) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const offset = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            const color = stops[0].color;
            stops.push({ color, offset });
            stops.sort((a: any, b: any) => a.offset - b.offset);
            const idx = stops.findIndex((s: any) => s.offset === offset);
            setActiveStop(idx);
            dragging.current = true;
            onChange(`linear-gradient(${rotation}deg, ${stopOffsets(stops)})`);
          },
        },
      ),
      stops.map(({ offset, color }: any, i: number) =>
        React.createElement(
          'div',
          {
            key: i,
            style: { position: 'absolute', top: '10px', left: `${100 * offset}%`, border: i === activeStop ? '2px solid rgb(0, 161, 255)' : '2px solid rgba(0,0,0,0)', padding: '2px' },
            onMouseDown: (e: any) => { e.stopPropagation(); setActiveStop(i); dragging.current = true; },
          },
          React.createElement(ColorSwatch, { background: color, style: { margin: 0 } }),
        ),
      ),
    ),
    React.createElement('div', { style: { width: 'calc(100% - 30px)', height: '10px', marginLeft: '15px', background: `linear-gradient(90deg,${stopOffsets(stops)})` } }),
    React.createElement(
      'div',
      { style: { padding: '10px' } },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', null, t('toolbar.colorPicker.angle')),
        React.createElement('div', null,
          React.createElement(NumericInput, {
            value: rotation,
            onValueChange: (val: number) => {
              const clamped = Math.min(360, Math.max(0, val));
              onChange(`linear-gradient(${clamped}deg,${stopOffsets(stops)})`);
            },
            buttonPosition: 'none',
            style: { width: '50px' },
            min: 0,
            max: 360,
          }),
        ),
      ),
      React.createElement(Slider, {
        min: 0,
        max: 360,
        value: rotation,
        showTrackFill: false,
        labelRenderer: false,
        onChange: (val: number) => { onChange(`linear-gradient(${val}deg,${stopOffsets(stops)})`); },
      }),
    ),
    React.createElement(ColorInput, {
      color: stops[activeStop].color,
      presetColors: preset,
      onChange: (c: string) => {
        const updated = [...stops];
        updated[activeStop].color = c;
        onChange(`linear-gradient(${rotation}deg, ${stopOffsets(updated)})`);
      },
    }),
  );
};

const RadialGradientInput = ({ value, onChange, store, preset }: any) => {
  const { stops } = parseRadialColor(value);
  const stopsRef = React.useRef(stops);
  stopsRef.current = stops;
  const [activeStop, setActiveStop] = React.useState(0);
  const barRef = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  React.useEffect(() => { barRef.current?.focus(); }, []);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const rect = barRef.current!.getBoundingClientRect();
      const offset = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const isOOB = (e.clientX - rect.left) / rect.width < -0.5 || (e.clientX - rect.left) / rect.width > 1.5;
      if (stopsRef.current.length > 2 && isOOB) {
        setActiveStop(0);
        dragging.current = false;
        stopsRef.current.splice(activeStop, 1);
        onChange(`radial-gradient(circle, ${stopOffsets(stopsRef.current)})`);
        return;
      }
      const updated = [...stopsRef.current];
      updated[activeStop].offset = offset;
      onChange(`radial-gradient(circle, ${stopOffsets(updated)})`);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [activeStop, stopsRef]);

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { style: { width: 'calc(100% - 35px)', height: '60px', position: 'relative' } },
      React.createElement(
        'div',
        {
          ref: barRef,
          tabIndex: 0,
          style: { position: 'absolute', top: 0, left: 0, width: '100%', marginLeft: '15px', height: '100%', zIndex: 0, outline: 'none' },
          onKeyDownCapture: (e: any) => {
            if (e.key === 'Backspace') {
              e.preventDefault(); e.stopPropagation();
              if (stopsRef.current.length <= 2) return;
              stopsRef.current.splice(activeStop, 1);
              onChange(`radial-gradient(circle, ${stopOffsets(stopsRef.current)})`);
            }
          },
          onMouseDown: (e: any) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const offset = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            const color = stops[0].color;
            stops.push({ color, offset });
            stops.sort((a: any, b: any) => a.offset - b.offset);
            const idx = stops.findIndex((s: any) => s.offset === offset);
            setActiveStop(idx);
            dragging.current = true;
            onChange(`radial-gradient(circle, ${stopOffsets(stops)})`);
          },
        },
      ),
      stops.map(({ offset, color }: any, i: number) =>
        React.createElement(
          'div',
          {
            key: i,
            style: { position: 'absolute', top: '10px', left: `${100 * offset}%`, border: i === activeStop ? '2px solid rgb(0, 161, 255)' : '2px solid rgba(0,0,0,0)', padding: '2px' },
            onMouseDown: (e: any) => { e.stopPropagation(); setActiveStop(i); dragging.current = true; },
          },
          React.createElement(ColorSwatch, { background: color, style: { margin: 0 } }),
        ),
      ),
    ),
    React.createElement('div', { style: { width: 'calc(100% - 30px)', height: '10px', marginLeft: '15px', background: `radial-gradient(circle, ${stopOffsets(stops)})` } }),
    React.createElement(
      'div',
      { style: { padding: '10px' } },
      React.createElement(ColorInput, {
        color: stops[activeStop]?.color,
        presetColors: preset,
        onChange: (c: string) => {
          const updated = [...stops];
          updated[activeStop].color = c;
          onChange(`radial-gradient(circle, ${stopOffsets(updated)})`);
        },
      }),
    ),
  );
};

// Renders a tiled pattern preview on a <canvas> element.
const PatternSwatchCanvas = ({ type, fg, bg, size = 48 }: { type: string; fg: string; bg: string; size?: number }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const tile = createPatternCanvas({ type, fg, bg, scale: 1 });
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    const pat = ctx.createPattern(tile, 'repeat');
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, size, size); }
  }, [type, fg, bg, size]);
  return React.createElement('canvas', { ref, width: size, height: size, style: { display: 'block' } });
};

// Uploaded pattern images are kept for the duration of the browser session so
// the user doesn't have to re-upload when switching between shapes.
const sessionUploadedPatterns: string[] = [];

const PatternPicker = ({ value, onChange, preset }: any) => {
  const config = isPattern(value) ? parsePattern(value) : null;
  const isUploaded = config?.type === 'uploaded';

  const [activeType, setActiveType] = React.useState(config?.type ?? 'dots');
  const [inkFg, setInkFg] = React.useState(isUploaded ? '#000000' : (config?.fg ?? '#000000'));
  const [inkBg, setInkBg] = React.useState(isUploaded ? 'transparent' : (config?.bg ?? 'transparent'));
  const [scale, setScale] = React.useState(config?.scale ?? 1);
  const [uploadedUrl, setUploadedUrl] = React.useState(isUploaded ? (config?.fg ?? '') : '');
  const [uploadedSwatches, setUploadedSwatches] = React.useState<string[]>(() => {
    const initial = [...sessionUploadedPatterns];
    if (isUploaded && config?.fg && !initial.includes(config.fg)) initial.push(config.fg);
    return initial;
  });
  const [fgOpen, setFgOpen] = React.useState(false);
  const [bgOpen, setBgOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const emitBuiltin = (type: string, fg: string, bg: string, s: number) =>
    onChange(buildPatternValue({ type, fg, bg, scale: s }));

  const emitUploaded = (url: string, s: number) =>
    onChange(buildPatternValue({ type: 'uploaded', fg: url, bg: 'transparent', scale: s }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      if (!sessionUploadedPatterns.includes(dataUrl)) sessionUploadedPatterns.push(dataUrl);
      setUploadedSwatches(prev => prev.includes(dataUrl) ? prev : [...prev, dataUrl]);
      setActiveType('uploaded');
      setUploadedUrl(dataUrl);
      emitUploaded(dataUrl, scale);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isBuiltin = activeType !== 'uploaded';

  return React.createElement(
    'div',
    { style: { padding: '8px', width: 240 } },
    // ---- built-in pattern grid ----
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' } },
      PATTERNS.map(({ id, label }) =>
        React.createElement(
          'div',
          {
            key: id,
            title: label,
            onClick: () => { setActiveType(id); emitBuiltin(id, inkFg, inkBg, scale); },
            style: {
              cursor: 'pointer',
              borderRadius: '4px',
              overflow: 'hidden',
              outline: id === activeType ? '2px solid rgb(0, 161, 255)' : '2px solid transparent',
              outlineOffset: '1px',
            },
          },
          React.createElement(PatternSwatchCanvas, { type: id, fg: inkFg, bg: inkBg, size: 48 }),
        ),
      ),
    ),
    // ---- custom / uploaded section ----
    React.createElement('div', { style: { fontSize: 11, color: '#888', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Custom Image'),
    React.createElement(
      'div',
      { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px', alignItems: 'center' } },
      uploadedSwatches.map((url, i) =>
        React.createElement('div', {
          key: i,
          title: 'Use this image as pattern',
          onClick: () => { setActiveType('uploaded'); setUploadedUrl(url); emitUploaded(url, scale); },
          style: {
            width: 48, height: 48, flexShrink: 0,
            backgroundImage: `url(${url})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            borderRadius: 4,
            cursor: 'pointer',
            outline: activeType === 'uploaded' && uploadedUrl === url ? '2px solid rgb(0, 161, 255)' : '2px solid transparent',
            outlineOffset: '1px',
          },
        }),
      ),
      // upload button
      React.createElement(
        'div',
        {
          onClick: () => fileInputRef.current?.click(),
          title: 'Upload image (JPG, PNG, SVG)',
          style: {
            width: 48, height: 48, flexShrink: 0,
            border: '1.5px dashed #888',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            color: '#888',
          },
        },
        React.createElement('span', { style: { fontSize: 20, lineHeight: 1 } }, '+'),
        React.createElement('span', { style: { fontSize: 9 } }, 'Upload'),
      ),
      React.createElement('input', {
        ref: fileInputRef,
        type: 'file',
        accept: 'image/jpeg,image/png,image/svg+xml,.jpg,.jpeg,.png,.svg',
        style: { display: 'none' },
        onChange: handleFile,
      }),
    ),
    // ---- FG/BG — only for built-in patterns ----
    isBuiltin && React.createElement(
      'div',
      null,
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
        React.createElement('span', { style: { minWidth: 72, fontSize: 12 } }, 'Foreground'),
        React.createElement(
          Popover,
          {
            isOpen: fgOpen,
            onInteraction: (s: boolean) => setFgOpen(s),
            autoFocus: false,
            hasBackdrop: true,
            content: React.createElement('div', { style: { padding: '5px' } },
              React.createElement(ColorInput, {
                color: inkFg,
                presetColors: preset,
                onChange: (c: string) => { setInkFg(c); emitBuiltin(activeType, c, inkBg, scale); },
              }),
            ),
          },
          React.createElement(ColorSwatch, { size: 24, background: inkFg, style: { cursor: 'pointer', margin: 0 } }),
        ),
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
        React.createElement('span', { style: { minWidth: 72, fontSize: 12 } }, 'Background'),
        React.createElement(
          Popover,
          {
            isOpen: bgOpen,
            onInteraction: (s: boolean) => setBgOpen(s),
            autoFocus: false,
            hasBackdrop: true,
            content: React.createElement('div', { style: { padding: '5px' } },
              React.createElement(ColorInput, {
                color: inkBg === 'transparent' ? 'rgba(0,0,0,0)' : inkBg,
                presetColors: preset,
                onChange: (c: string) => { setInkBg(c); emitBuiltin(activeType, inkFg, c, scale); },
              }),
            ),
          },
          React.createElement(ColorSwatch, { size: 24, background: inkBg, style: { cursor: 'pointer', margin: 0 } }),
        ),
      ),
    ),
    // ---- scale ----
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' } },
      React.createElement('span', { style: { minWidth: 72, fontSize: 12 } }, 'Scale'),
      React.createElement('div', { style: { flex: 1 } },
        React.createElement(Slider, {
          min: 0.1,
          max: 10,
          stepSize: 0.1,
          value: scale,
          showTrackFill: false,
          labelRenderer: false,
          onChange: (val: number) => {
            const s = Math.round(val * 10) / 10;
            setScale(s);
            if (activeType === 'uploaded') emitUploaded(uploadedUrl, s);
            else emitBuiltin(activeType, inkFg, inkBg, s);
          },
        }),
      ),
      // For uploaded patterns scale=1 means 100px tile, so show px; for built-ins show multiplier
      React.createElement('span', { style: { fontSize: 12, minWidth: 36, textAlign: 'right' } },
        activeType === 'uploaded' ? `${Math.round(scale * 100)}px` : `${scale}×`,
      ),
    ),
  );
};

const GradientColorPicker = observer(({ value, onChange, preset, store }: any) => {
  const initialTab = isLinearGradient(value) ? 'linear' : isRadialGradient(value) ? 'radial' : isPattern(value) ? 'pattern' : 'solid';
  const [tab, setTab] = React.useState<string>(initialTab);

  // When on solid tab but current value is a gradient or pattern, show a usable solid color
  const solidColor = isGradient(value)
    ? parseColor(value).stops[0]?.color ?? value
    : isPattern(value)
    ? (parsePattern(value).type === 'uploaded' ? '#000000' : parsePattern(value).fg)
    : value;

  return React.createElement(
    'div',
    { style: { padding: '5px' } },
    React.createElement(
      Tabs,
      { id: 'colorPickerTabs', selectedTabId: tab, onChange: (id: any) => setTab(id), renderActiveTabPanelOnly: true },
      React.createElement(Tab, {
        id: 'solid',
        title: t('toolbar.colorPicker.solid'),
        panel: React.createElement(ColorInput, { color: solidColor, onChange, presetColors: preset, style: { padding: '0' } }),
      }),
      React.createElement(Tab, {
        id: 'linear',
        title: t('toolbar.colorPicker.linear'),
        panel: React.createElement(GradientInput, { value, onChange, store, preset }),
        panelClassName: 'ember-panel',
      }),
      React.createElement(Tab, {
        id: 'radial',
        title: 'Radial',
        panel: React.createElement(RadialGradientInput, { value, onChange, store, preset }),
        panelClassName: 'ember-panel',
      }),
      React.createElement(Tab, {
        id: 'pattern',
        title: 'Pattern',
        panel: React.createElement(PatternPicker, { value, onChange, preset }),
        panelClassName: 'ember-panel',
      }),
    ),
  );
});

export const ColorSwatch = ({ size = 30, background, style = {}, children = null, ...rest }: any) =>
  React.createElement(
    'div',
    {
      onMouseDown: (e: any) => e.preventDefault(),
      style: {
        width: size + 'px',
        height: size + 'px',
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 8 8'%3E%3Cg fill='rgba(112, 112, 116, 1)' fill-opacity='1'%3E%3Cpath fill-rule='evenodd' d='M0 0h4v4H0V0zm4 4h4v4H4V4z'/%3E%3C/g%3E%3C/svg%3E")`,
        borderRadius: '2px',
        boxShadow: '0 0 2px grey',
        marginBottom: '-4px',
        ...style,
      },
      ...rest,
    },
    React.createElement('div', { style: { width: size + 'px', height: size + 'px', background } }, children),
  );

let getPresetColors = (store: any): string[] => {
  const usedColors = getUsedColors(store).slice(0, 8).filter((c) => !DEFAULT_COLORS.find((d) => sameColors(d, c)));
  return usedColors.concat(DEFAULT_COLORS.slice(0, 16 - usedColors.length).reverse());
};

export function setColorsPresetFunc(fn: (store: any) => string[]) {
  getPresetColors = fn;
}

export const ColorPicker = ({
  value,
  onChange,
  size,
  store,
  gradientEnabled,
  children,
  style,
  position = 'auto',
  onOpen,
  onClose,
}: any) => {
  const preset = getPresetColors(store);
  return React.createElement(
    Popover,
    {
      autoFocus: false,
      enforceFocus: true,
      interactionKind: 'click',
      hasBackdrop: true,
      position,
      onOpening: onOpen,
      onClosed: onClose,
      content: gradientEnabled
        ? React.createElement(GradientColorPicker, { preset, value, onChange, store })
        : React.createElement('div', { style: { padding: '5px' } }, React.createElement(ColorInput, { color: value, onChange, presetColors: preset })),
    },
    React.createElement(ColorSwatch, { size, background: value, style }, children),
  );
};

export default ColorPicker;
