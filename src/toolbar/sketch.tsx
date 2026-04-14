'use client';

import React from 'react';
import { ReactCSS } from 'reactcss';
import merge from 'lodash/merge.js';
import { Button } from '@blueprintjs/core';
// @ts-ignore
import CgColorPicker from '@meronex/icons/cg/CgColorPicker.js';
import Konva from 'konva';
import { ColorWrap, Saturation, Hue, Alpha, Checkboard } from 'react-color/lib/components/common/index.js';
import { SketchFields } from 'react-color/lib/components/sketch/SketchFields.js';
import { SketchPresetColors } from 'react-color/lib/components/sketch/SketchPresetColors.js';

const useEventCallback = (fn: (...args: any[]) => any) => {
  const ref = React.useRef(fn);
  ref.current = fn;
  return React.useCallback((...args: any[]) => ref.current(...args), []);
};

export const Sketch = ({
  width = 200,
  rgb,
  hex,
  hsv,
  hsl,
  onChange,
  onSwatchHover,
  disableAlpha = false,
  presetColors = ['#D0021B','#F5A623','#F8E71C','#8B572A','#7ED321','#417505','#BD10E0','#9013FE','#4A90E2','#50E3C2','#B8E986','#000000','#4A4A4A','#9B9B9B','#FFFFFF'],
  renderers,
  styles: customStyles = {},
  className = '',
}: any) => {
  const styles: any = ReactCSS(
    merge(
      {
        default: {
          picker: { width, padding: '10px 10px 0', boxSizing: 'initial', background: '#fff', borderRadius: '4px', boxShadow: '0 0 0 1px rgba(0,0,0,.15), 0 8px 16px rgba(0,0,0,.15)' },
          saturation: { width: '100%', paddingBottom: '75%', position: 'relative', overflow: 'hidden' },
          Saturation: { radius: '3px', shadow: 'inset 0 0 0 1px rgba(0,0,0,.15), inset 0 0 4px rgba(0,0,0,.25)' },
          controls: { display: 'flex' },
          sliders: { padding: '4px 0', flex: '1' },
          color: { width: '24px', height: '24px', position: 'relative', marginTop: '4px', marginLeft: '4px', borderRadius: '3px' },
          activeColor: { absolute: '0px 0px 0px 0px', borderRadius: '2px', background: `rgba(${(rgb as any).r},${(rgb as any).g},${(rgb as any).b},${(rgb as any).a})`, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15), inset 0 0 4px rgba(0,0,0,.25)' },
          hue: { position: 'relative', height: '10px', overflow: 'hidden' },
          Hue: { radius: '2px', shadow: 'inset 0 0 0 1px rgba(0,0,0,.15), inset 0 0 4px rgba(0,0,0,.25)' },
          alpha: { position: 'relative', height: '10px', marginTop: '4px', overflow: 'hidden' },
          Alpha: { radius: '2px', shadow: 'inset 0 0 0 1px rgba(0,0,0,.15), inset 0 0 4px rgba(0,0,0,.25)' },
        },
        ...customStyles,
        disableAlpha: { color: { height: '10px' }, hue: { height: '10px' }, alpha: { display: 'none' } },
      },
      customStyles,
    ),
    { disableAlpha },
  );

  const [picking, setPicking] = React.useState(false);
  const pickerCircleRef = React.useRef<any>(null);

  const handleMouseDown = useEventCallback((e: MouseEvent) => {
    if (picking) {
      const stage = (Konva as any).stages?.find((s: any) => {
        const r = s.getContent().parentElement.parentElement.getBoundingClientRect();
        return r.left < e.clientX && r.left + r.width > e.clientX && r.top < e.clientY && r.top + r.height > e.clientY;
      });
      if (!stage) { cleanupPicker(); setPicking(false); return; }
      const stageRect = stage.getContent().getBoundingClientRect();
      const px = e.clientX - stageRect.left;
      const py = e.clientY - stageRect.top;
      const layer = stage.children[0];
      const canvas = layer.getNativeCanvasElement();
      const ratio = layer.getCanvas().getPixelRatio();
      const { data } = canvas.getContext('2d').getImageData(px * ratio, py * ratio, 1, 1);
      const color = `rgb(${data[0]},${data[1]},${data[2]})`;
      const guidesLayer = stage.findOne('.line-guides');
      if (guidesLayer) {
        if (!guidesLayer.findOne('.picker')) {
          if (pickerCircleRef.current) pickerCircleRef.current.destroy();
          pickerCircleRef.current = new Konva.Circle({ name: 'picker', radius: 14, stroke: 'black', strokeWidth: 1 });
          guidesLayer.add(pickerCircleRef.current);
        }
        pickerCircleRef.current.setAbsolutePosition({ x: px - 15, y: py - 15 });
        pickerCircleRef.current.fill(color);
      }
      if (pickerCircleRef.current) {
        onChange(Konva.Util.colorToRGBA(pickerCircleRef.current.fill()));
      }
      cleanupPicker();
      const isPickerBtn = (() => {
        let t = e.target as HTMLElement | null;
        while (t) { if (t.classList.contains('color-picker-button')) return true; t = t.parentElement; }
        return false;
      })();
      if (!isPickerBtn) setPicking(false);
      e.stopPropagation();
      (e as any).stopImmediatePropagation?.();
    }
  });

  const handleMouseMove = useEventCallback((e: MouseEvent) => {
    if (!picking) return;
    const stage = (Konva as any).stages?.find((s: any) => {
      const r = s.getContent().parentElement.parentElement.getBoundingClientRect();
      return r.left < e.clientX && r.left + r.width > e.clientX && r.top < e.clientY && r.top + r.height > e.clientY;
    });
    if (!stage) { cleanupPicker(); return; }
    const stageRect = stage.getContent().getBoundingClientRect();
    const px = e.clientX - stageRect.left;
    const py = e.clientY - stageRect.top;
    const layer = stage.children[0];
    const canvas = layer.getNativeCanvasElement();
    const ratio = layer.getCanvas().getPixelRatio();
    const { data } = canvas.getContext('2d').getImageData(px * ratio, py * ratio, 1, 1);
    const color = `rgb(${data[0]},${data[1]},${data[2]})`;
    const guidesLayer = stage.findOne('.line-guides');
    if (guidesLayer) {
      if (!guidesLayer.findOne('.picker')) {
        if (pickerCircleRef.current) pickerCircleRef.current.destroy();
        pickerCircleRef.current = new Konva.Circle({ name: 'picker', radius: 14, stroke: 'black', strokeWidth: 1 });
        guidesLayer.add(pickerCircleRef.current);
      }
      pickerCircleRef.current.setAbsolutePosition({ x: px - 15, y: py - 15 });
      pickerCircleRef.current.fill(color);
    }
  });

  const cleanupPicker = useEventCallback(() => {
    if (pickerCircleRef.current) { pickerCircleRef.current.destroy(); pickerCircleRef.current = null; }
  });

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('touchstart', handleMouseDown, true);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('touchstart', handleMouseDown, true);
      cleanupPicker();
    };
  }, []);

  React.useEffect(() => { if (!picking) cleanupPicker(); }, [picking]);
  React.useEffect(() => {
    if (picking) document.body.style.cursor = 'crosshair';
    return () => { document.body.style.cursor = 'default'; };
  }, [picking]);

  return React.createElement(
    'div',
    { style: styles.picker, className: `sketch-picker ${className}` },
    React.createElement('div', { style: styles.saturation }, React.createElement(Saturation, { style: styles.Saturation, hsl, hsv, onChange })),
    React.createElement(
      'div',
      { style: styles.controls, className: 'flexbox-fix' },
      React.createElement(
        'div',
        { style: styles.sliders },
        React.createElement('div', { style: styles.hue }, React.createElement(Hue, { style: styles.Hue, hsl, onChange })),
        React.createElement('div', { style: styles.alpha }, React.createElement(Alpha, { style: styles.Alpha, rgb, hsl, renderers, onChange })),
      ),
      React.createElement(
        'div',
        { style: styles.color },
        React.createElement(Checkboard, { size: 8, white: 'transparent', grey: 'rgba(0,0,0,.08)' }),
        React.createElement('div', { style: styles.activeColor }),
      ),
      React.createElement(
        'div',
        { style: styles.color },
        React.createElement(Button, {
          icon: React.createElement(CgColorPicker, null),
          className: 'color-picker-button',
          minimal: true,
          style: { width: '24px', height: '24px', minWidth: '24px', minHeight: '24px', padding: 0, margin: 0 },
          active: picking,
          onClickCapture: (e: any) => { setPicking((p) => !p); e.stopPropagation(); },
        }),
      ),
    ),
    React.createElement(SketchFields, { rgb, hsl, hex, onChange, disableAlpha }),
    React.createElement(SketchPresetColors, { colors: presetColors, onClick: onChange, onSwatchHover }),
  );
};

export default ColorWrap(Sketch);
