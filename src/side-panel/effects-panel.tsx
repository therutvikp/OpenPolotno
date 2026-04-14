'use client';
import React from 'react';
import { Alignment, Button, NumericInput, Slider, Switch } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import { INDEPENDENT_FILTERS } from '../model/shape-model';
import ColorPicker from '../toolbar/color-picker';
import { t as s } from '../utils/l10n';
import { Cross } from '@blueprintjs/icons';
import { EffectCard } from './effect-card';
import { Effects } from '../utils/filters';
import { StoreType } from '../model/store';

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const NumberInput = ({ value, onValueChange, ...rest }: any) => {
  const [local, setLocal] = React.useState(value.toString());
  React.useEffect(() => { setLocal(value.toString()); }, [value]);
  return React.createElement(NumericInput, {
    value: local,
    onValueChange: (num: number, str: string) => { setLocal(str); if (!Number.isNaN(num)) onValueChange(num); },
    ...rest,
  });
};

const EffectRow = ({ label, enabled, visible = true, onEnabledChange, numberValue, onNumberValueChange, min, max }: any) => {
  if (!visible) return null;
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Switch, {
      checked: enabled,
      label,
      onChange: (e: any) => { onEnabledChange(e.target.checked); },
      alignIndicator: Alignment.RIGHT,
      style: { marginTop: '20px' },
    }),
    enabled && React.createElement(
      'div',
      { style: { display: 'flex', width: '100%', justifyContent: 'space-between' } },
      React.createElement('div', { style: { paddingTop: '7px', paddingLeft: '10px', width: 'calc(100% - 80px)' } },
        React.createElement(Slider, { value: numberValue, onChange: onNumberValueChange, min, max, labelStepSize: 50, showTrackFill: false, labelRenderer: false })
      ),
      React.createElement(NumericInput, { value: numberValue, onValueChange: (v: number) => { onNumberValueChange(clamp(v, min, max)); }, buttonPosition: 'none', style: { width: '50px', padding: '0 5px', marginLeft: '10px' }, min, max })
    )
  );
};

export const EffectsPanel = observer(({ store }: { store: StoreType }) => {
  const elements = store.selectedElements;
  const el = elements[0] as any;
  const getIds = () => store.selectedElements.map((e: any) => e.id).join(',');
  const initialIds = React.useMemo(getIds, []);
  const currentIds = getIds();

  React.useEffect(() => {
    if (initialIds !== currentIds) store.openSidePanel(store.previousOpenedSidePanel);
  }, [initialIds, currentIds]);

  if (!el || !el.filters) return null;

  const isText = el.type === 'text';
  const isImage = el.type === 'image';
  const isSvg = el.type === 'svg';
  const isImageOrSvg = isImage || isSvg;

  const setAttrs = (attrs: any) => {
    store.history.transaction(() => { elements.forEach((e: any) => { e.set(attrs); }); });
  };

  const setFilter = (name: string, value: any) => {
    store.history.transaction(() => {
      elements.forEach((e: any) => {
        let val = +value;
        if (value === 0 || !value) val = e.filters.has(name) ? null : 1;
        if (!INDEPENDENT_FILTERS.includes(name)) e.set({ grayscaleEnabled: name === 'grayscale' && value, sepiaEnabled: name === 'sepia' && value });
        e.setFilter(name, val);
      });
    });
  };

  const getFilterIntensity = (name: string) => el.filters.get(name)?.intensity ?? 0;

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '0 10px' } },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between' } },
      React.createElement('h3', { style: { margin: 0, lineHeight: '30px' } }, s('sidePanel.effects')),
      React.createElement(Button, { minimal: true, icon: React.createElement(Cross, null), onClick: () => store.openSidePanel(store.previousOpenedSidePanel) })
    ),
    isImageOrSvg && React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' } },
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '16px', flexWrap: 'wrap' } },
        React.createElement(EffectCard, { active: el.grayscaleEnabled, onClick: () => { setFilter('grayscale', !el.grayscaleEnabled); }, title: s('toolbar.grayscale'), imageSrc: el.src, effect: Effects.grayscale }),
        React.createElement(EffectCard, { active: el.sepiaEnabled, onClick: () => { setFilter('sepia', !el.sepiaEnabled); }, title: s('toolbar.sepia'), imageSrc: el.src, effect: Effects.sepia }),
        React.createElement(EffectCard, { active: el.filters.has('cold'), onClick: () => { setFilter('cold', el.filters.has('cold') ? null : 1); }, title: s('toolbar.cold'), imageSrc: el.src, effect: Effects.cold }),
        React.createElement(EffectCard, { active: el.filters.has('natural'), onClick: () => { setFilter('natural', el.filters.has('natural') ? null : 1); }, title: s('toolbar.natural'), imageSrc: el.src, effect: Effects.natural }),
        React.createElement(EffectCard, { active: el.filters.has('warm'), onClick: () => { setFilter('warm', el.filters.has('warm') ? null : 1); }, title: s('toolbar.warm'), imageSrc: el.src, effect: Effects.warm })
      )
    ),
    React.createElement(EffectRow, { label: s('toolbar.blur'), enabled: el.blurEnabled, visible: isImageOrSvg || isText, onEnabledChange: (v: boolean) => { setAttrs({ blurEnabled: v }); }, numberValue: el.blurRadius, onNumberValueChange: (v: number) => { setAttrs({ blurRadius: v }); }, min: 0, max: 100 }),
    React.createElement(EffectRow, { label: s('toolbar.brightness'), visible: isImageOrSvg, enabled: el.brightnessEnabled, onEnabledChange: (v: boolean) => { setAttrs({ brightnessEnabled: v }); }, numberValue: Math.round(100 * el.brightness), onNumberValueChange: (v: number) => { setAttrs({ brightness: v / 100 }); }, min: -100, max: 100 }),
    React.createElement(EffectRow, { label: s('toolbar.temperature'), visible: isImageOrSvg, enabled: el.filters.has('temperature'), onEnabledChange: (v: boolean) => { setFilter('temperature', v ? 0 : null); }, numberValue: Math.round(100 * getFilterIntensity('temperature')), onNumberValueChange: (v: number) => { setFilter('temperature', v / 100); }, min: -100, max: 100 }),
    React.createElement(EffectRow, { label: s('toolbar.contrast'), visible: isImageOrSvg, enabled: el.filters.has('contrast'), onEnabledChange: (v: boolean) => { setFilter('contrast', v ? 0 : null); }, numberValue: Math.round(100 * getFilterIntensity('contrast')), onNumberValueChange: (v: number) => { setFilter('contrast', v / 100); }, min: -100, max: 100 }),
    React.createElement(EffectRow, { label: s('toolbar.shadows'), visible: isImageOrSvg, enabled: el.filters.has('shadows'), onEnabledChange: (v: boolean) => { setFilter('shadows', v ? 0 : null); }, numberValue: Math.round(100 * getFilterIntensity('shadows')), onNumberValueChange: (v: number) => { setFilter('shadows', v / 100); }, min: -100, max: 100 }),
    React.createElement(EffectRow, { label: s('toolbar.white'), visible: isImageOrSvg, enabled: el.filters.has('white'), onEnabledChange: (v: boolean) => { setFilter('white', v ? 0 : null); }, numberValue: Math.round(100 * getFilterIntensity('white')), onNumberValueChange: (v: number) => { setFilter('white', v / 100); }, min: -100, max: 100 }),
    React.createElement(EffectRow, { label: s('toolbar.black'), visible: isImageOrSvg, enabled: el.filters.has('black'), onEnabledChange: (v: boolean) => { setFilter('black', v ? 0 : null); }, numberValue: Math.round(100 * getFilterIntensity('black')), onNumberValueChange: (v: number) => { setFilter('black', v / 100); }, min: -100, max: 100 }),
    React.createElement(EffectRow, { label: s('toolbar.vibrance'), visible: isImageOrSvg, enabled: el.filters.has('vibrance'), onEnabledChange: (v: boolean) => { setFilter('vibrance', v ? 0 : null); }, numberValue: Math.round(100 * getFilterIntensity('vibrance')), onNumberValueChange: (v: number) => { setFilter('vibrance', v / 100); }, min: -100, max: 100 }),
    React.createElement(EffectRow, { label: s('toolbar.saturation'), visible: isImageOrSvg, enabled: el.filters.has('saturation'), onEnabledChange: (v: boolean) => { setFilter('saturation', v ? 0 : null); }, numberValue: Math.round(100 * getFilterIntensity('saturation')), onNumberValueChange: (v: number) => { setFilter('saturation', v / 100); }, min: -100, max: 100 }),
    // Curved text
    isText && React.createElement(Switch, { checked: !!el.curveEnabled, label: s('toolbar.curvedText') || 'Curved text', onChange: (e: any) => { setAttrs({ curveEnabled: e.target.checked }); }, alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
    isText && el.curveEnabled && React.createElement(
      React.Fragment,
      null,
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', null, s('toolbar.curvePower') || 'Curve'),
        React.createElement('div', null, React.createElement(NumberInput, { value: Math.round(100 * el.curvePower), onValueChange: (v: number) => { setAttrs({ curvePower: clamp(v, -100, 100) / 100 }); }, style: { width: '50px' }, min: -100, max: 100, buttonPosition: 'none' }))
      ),
      React.createElement('div', null, React.createElement(Slider, { value: Math.round(100 * el.curvePower), onChange: (v: number) => { setAttrs({ curvePower: clamp(v, -100, 100) / 100 }); }, min: -100, max: 100, labelStepSize: 50, labelRenderer: (v: number) => v === 0 ? '0' : v.toString() }))
    ),
    // Text stroke
    isText && React.createElement(Switch, { checked: !!el.strokeWidth, label: s('toolbar.textStroke'), onChange: (e: any) => { setAttrs({ strokeWidth: e.target.checked ? 2 : 0 }); }, alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
    isText && !!el.strokeWidth && React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between' } },
      React.createElement(ColorPicker, { value: el.stroke, size: 30, onChange: (c: string) => { setAttrs({ stroke: c }); }, store }),
      React.createElement(NumericInput, { defaultValue: el.strokeWidth, onValueChange: (v: number) => { setAttrs({ strokeWidth: clamp(v, 1, 30) }); }, style: { width: '80px' }, min: 1, max: Math.round(el.fontSize / 2) })
    ),
    // Text background
    isText && React.createElement(Switch, { checked: !!el.backgroundEnabled, label: s('toolbar.textBackground'), onChange: (e: any) => { setAttrs({ backgroundEnabled: e.target.checked }); }, alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
    isText && !!el.backgroundEnabled && React.createElement(
      React.Fragment,
      null,
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', null, s('toolbar.backgroundCornerRadius')),
        React.createElement('div', null, React.createElement(NumberInput, { value: 100 * el.backgroundCornerRadius, onValueChange: (v: number) => { setAttrs({ backgroundCornerRadius: clamp(v, 0, 100) / 100 }); }, style: { width: '50px' }, min: 0, max: 100, buttonPosition: 'none' }))
      ),
      React.createElement('div', null, React.createElement(Slider, { value: 100 * el.backgroundCornerRadius, onChange: (v: number) => { setAttrs({ backgroundCornerRadius: clamp(v, 0, 100) / 100 }); }, min: 0, max: 100, labelRenderer: false })),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', null, s('toolbar.backgroundPadding')),
        React.createElement('div', null, React.createElement(NumberInput, { value: Math.round(100 * el.backgroundPadding), onValueChange: (v: number) => { setAttrs({ backgroundPadding: clamp(v, 0, 100) / 100 }); }, style: { width: '50px' }, min: 0, max: 100, buttonPosition: 'none' }))
      ),
      React.createElement('div', null, React.createElement(Slider, { value: Math.round(100 * el.backgroundPadding), onChange: (v: number) => { setAttrs({ backgroundPadding: clamp(v, 0, 100) / 100 }); }, min: 0, max: 100, labelRenderer: false })),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', null, s('toolbar.opacity')),
        React.createElement('div', null, React.createElement(NumberInput, { value: Math.round(100 * el.backgroundOpacity), onValueChange: (v: number) => { setAttrs({ backgroundOpacity: v / 100 }); }, style: { width: '50px' }, min: 0, max: 100, buttonPosition: 'none' }))
      ),
      React.createElement('div', null, React.createElement(Slider, { value: 100 * el.backgroundOpacity, onChange: (v: number) => { setAttrs({ backgroundOpacity: v / 100 }); }, min: 0, max: 100, labelRenderer: false })),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', { style: { lineHeight: '30px' } }, s('toolbar.color')),
        React.createElement(ColorPicker, { value: el.backgroundColor, size: 30, onChange: (c: string) => { setAttrs({ backgroundColor: c }); }, store })
      )
    ),
    // Border (image/svg)
    isImageOrSvg && React.createElement(Switch, { checked: !!el.borderSize, label: s('toolbar.border'), onChange: (e: any) => { setAttrs({ borderSize: e.target.checked ? 2 : 0 }); }, alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
    isImageOrSvg && !!el.borderSize && React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between' } },
      React.createElement(ColorPicker, { value: el.borderColor, size: 30, onChange: (c: string) => { setAttrs({ borderColor: c }); }, store }),
      React.createElement(NumericInput, { defaultValue: el.borderSize, onValueChange: (v: number) => { setAttrs({ borderSize: clamp(v, 1, Math.min(el.width, el.height) / 2) }); }, style: { width: '80px' }, min: 1, max: Math.max(1, Math.min(el.width, el.height) / 2) })
    ),
    isImageOrSvg && React.createElement(EffectRow, {
      label: s('toolbar.cornerRadius'), visible: isImageOrSvg,
      enabled: el.cornerRadius !== 0,
      onEnabledChange: (v: boolean) => { setAttrs({ cornerRadius: v ? Math.min(el.width / 4, el.height / 4) : 0 }); },
      numberValue: Math.min(el.cornerRadius, Math.round(Math.min(el.width / 2, el.height / 2))),
      onNumberValueChange: (v: number) => { setAttrs({ cornerRadius: v }); },
      min: 1, max: Math.round(Math.min(el.width / 2, el.height / 2)),
    }),
    // Shadow
    React.createElement(Switch, { checked: el.shadowEnabled, label: s('toolbar.shadow'), onChange: (e: any) => { setAttrs({ shadowEnabled: e.target.checked }); }, alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
    el.shadowEnabled && React.createElement(
      React.Fragment,
      null,
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', null, s('toolbar.blur')),
        React.createElement('div', null, React.createElement(NumberInput, { value: el.shadowBlur, onValueChange: (v: number) => { setAttrs({ shadowBlur: clamp(v, -50, 50) }); }, style: { width: '50px' }, min: 0, max: 50, buttonPosition: 'none' }))
      ),
      React.createElement('div', null, React.createElement(Slider, { value: el.shadowBlur, onChange: (v: number) => { setAttrs({ shadowBlur: v }); }, min: 0, max: 50, showTrackFill: false, labelRenderer: false })),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', null, s('toolbar.offsetX')),
        React.createElement('div', null, React.createElement(NumberInput, { value: el.shadowOffsetX, onValueChange: (v: number) => { setAttrs({ shadowOffsetX: clamp(v, -50, 50) }); }, style: { width: '50px' }, min: -50, max: 50, buttonPosition: 'none' }))
      ),
      React.createElement('div', null, React.createElement(Slider, { value: el.shadowOffsetX, onChange: (v: number) => { setAttrs({ shadowOffsetX: v }); }, min: -50, max: 50, showTrackFill: false, labelRenderer: false })),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', null, s('toolbar.offsetY')),
        React.createElement('div', null, React.createElement(NumberInput, { value: el.shadowOffsetY, onValueChange: (v: number) => { setAttrs({ shadowOffsetY: clamp(v, -50, 50) }); }, style: { width: '50px' }, min: -50, max: 50, buttonPosition: 'none' }))
      ),
      React.createElement('div', null, React.createElement(Slider, { value: el.shadowOffsetY, onChange: (v: number) => { setAttrs({ shadowOffsetY: v }); }, min: -50, max: 50, showTrackFill: false, labelRenderer: false })),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', null, s('toolbar.opacity')),
        React.createElement('div', null, React.createElement(NumberInput, { value: Math.round(100 * el.shadowOpacity), onValueChange: (v: number) => { setAttrs({ shadowOpacity: v / 100 }); }, style: { width: '50px' }, min: 0, max: 100, buttonPosition: 'none' }))
      ),
      React.createElement('div', null, React.createElement(Slider, { value: 100 * el.shadowOpacity, onChange: (v: number) => { setAttrs({ shadowOpacity: v / 100 }); }, min: 0, max: 100, labelRenderer: false })),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
        React.createElement('div', { style: { lineHeight: '30px' } }, s('toolbar.color')),
        React.createElement(ColorPicker, { value: el.shadowColor, size: 30, onChange: (c: string) => { setAttrs({ shadowColor: c }); }, store })
      )
    )
  );
});
