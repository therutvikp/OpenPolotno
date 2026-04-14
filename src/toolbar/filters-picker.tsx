'use client';

import React from 'react';
import { Button, Position, Switch, Slider, Alignment, NumericInput } from '@blueprintjs/core';
import { Popover } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import { LeftJoin } from '@blueprintjs/icons';
import ColorPicker from './color-picker';
import { t } from '../utils/l10n';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const NumberInput = ({ value, onValueChange, ...rest }: any) => {
  const [local, setLocal] = React.useState(value.toString());
  React.useEffect(() => { setLocal(value.toString()); }, [value]);
  return React.createElement(NumericInput, {
    value: local,
    onValueChange: (num: number, str: string) => { setLocal(str); if (!Number.isNaN(num)) onValueChange(num); },
    ...rest,
  });
};

const FilterRow = ({ label, enabled, visible = true, onEnabledChange, numberValue, onNumberValueChange, min, max }: any) => {
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
      React.createElement('div', { style: { paddingTop: '7px' } },
        React.createElement(Slider, { value: numberValue, onChange: onNumberValueChange, min, max, labelStepSize: 50, showTrackFill: false, labelRenderer: false }),
      ),
      React.createElement(NumericInput, { value: numberValue, onValueChange: (v: number) => { onNumberValueChange(clamp(v, min, max)); }, buttonPosition: 'none', style: { width: '45px', padding: '0 5px', marginLeft: '10px' }, min, max }),
    ),
  );
};

export const FiltersPicker = observer(({ element, store, elements }: any) => {
  const targets = elements || [element];
  const first = targets[0];
  const isText = first.type === 'text';
  const isImage = first.type === 'image';
  const isSvg = first.type === 'svg';
  const isImgOrSvg = isImage || isSvg;

  const setAll = (props: any) => {
    store.history.transaction(() => { targets.forEach((el: any) => { el.set(props); }); });
  };

  return React.createElement(
    Popover,
    {
      content: React.createElement(
        'div',
        { style: { padding: '15px', paddingTop: '15px', width: '230px', maxHeight: 'calc(100vh - 150px)', overflow: 'auto' } },
        React.createElement(FilterRow, {
          label: t('toolbar.blur'), enabled: first.blurEnabled, visible: isImgOrSvg || isText,
          onEnabledChange: (v: boolean) => setAll({ blurEnabled: v }),
          numberValue: first.blurRadius, onNumberValueChange: (v: number) => setAll({ blurRadius: v }), min: 0, max: 100,
        }),
        React.createElement(FilterRow, {
          label: t('toolbar.brightness'), visible: isImgOrSvg, enabled: first.brightnessEnabled,
          onEnabledChange: (v: boolean) => setAll({ brightnessEnabled: v }),
          numberValue: 100 * first.brightness + 100, onNumberValueChange: (v: number) => setAll({ brightness: (v - 100) / 100 }), min: 0, max: 200,
        }),
        isImgOrSvg && React.createElement(Switch, { checked: first.sepiaEnabled, label: t('toolbar.sepia'), onChange: (e: any) => setAll({ sepiaEnabled: e.target.checked }), alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
        isImgOrSvg && React.createElement(Switch, { checked: first.grayscaleEnabled, label: t('toolbar.grayscale'), onChange: (e: any) => setAll({ grayscaleEnabled: e.target.checked }), alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
        isText && React.createElement(Switch, { checked: !!first.curveEnabled, label: t('toolbar.curvedText') || 'Curved text', onChange: (e: any) => setAll({ curveEnabled: e.target.checked }), alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
        isText && first.curveEnabled && React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
            React.createElement('div', null, t('toolbar.curvePower') || 'Curve'),
            React.createElement('div', null,
              React.createElement(NumberInput, { value: Math.round(100 * first.curvePower), onValueChange: (v: number) => setAll({ curvePower: clamp(v, -100, 100) / 100 }), style: { width: '50px' }, min: -100, max: 100, buttonPosition: 'none' }),
            ),
          ),
          React.createElement(Slider, {
            value: 100 * first.curvePower, onChange: (v: number) => setAll({ curvePower: clamp(v, -100, 100) / 100 }),
            min: -100, max: 100, labelStepSize: 50, labelRenderer: (v: number) => v === 0 ? '0' : v.toString(),
          }),
        ),
        isText && React.createElement(Switch, { checked: !!first.strokeWidth, label: t('toolbar.textStroke'), onChange: (e: any) => setAll({ strokeWidth: e.target.checked ? 2 : 0 }), alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
        isText && !!first.strokeWidth && React.createElement(
          React.Fragment,
          null,
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between' } },
            React.createElement(ColorPicker, { value: first.stroke, size: 30, onChange: (c: string) => setAll({ stroke: c }), store }),
            React.createElement(NumericInput, { defaultValue: first.strokeWidth, onValueChange: (v: number) => setAll({ strokeWidth: clamp(v, 1, 30) }), style: { width: '80px' }, min: 1, max: Math.round(first.fontSize / 2) }),
          ),
        ),
        isText && React.createElement(Switch, { checked: !!first.backgroundEnabled, label: t('toolbar.textBackground'), onChange: (e: any) => setAll({ backgroundEnabled: e.target.checked }), alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
        !!first.backgroundEnabled && React.createElement(
          React.Fragment,
          null,
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
            React.createElement('div', null, t('toolbar.backgroundCornerRadius')),
            React.createElement('div', null, React.createElement(NumberInput, { value: 100 * first.backgroundCornerRadius, onValueChange: (v: number) => setAll({ backgroundCornerRadius: clamp(v, 0, 100) / 100 }), style: { width: '50px' }, min: 0, max: 100, buttonPosition: 'none' })),
          ),
          React.createElement(Slider, { value: 100 * first.backgroundCornerRadius, onChange: (v: number) => setAll({ backgroundCornerRadius: clamp(v, 0, 100) / 100 }), min: 0, max: 100, labelRenderer: false }),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
            React.createElement('div', null, t('toolbar.backgroundPadding')),
            React.createElement('div', null, React.createElement(NumberInput, { value: Math.round(100 * first.backgroundPadding), onValueChange: (v: number) => setAll({ backgroundPadding: clamp(v, 0, 100) / 100 }), style: { width: '50px' }, min: 0, max: 100, buttonPosition: 'none' })),
          ),
          React.createElement(Slider, { value: Math.round(100 * first.backgroundPadding), onChange: (v: number) => setAll({ backgroundPadding: clamp(v, 0, 100) / 100 }), min: 0, max: 100, labelRenderer: false }),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
            React.createElement('div', null, t('toolbar.opacity')),
            React.createElement('div', null, React.createElement(NumberInput, { value: Math.round(100 * first.backgroundOpacity), onValueChange: (v: number) => setAll({ backgroundOpacity: v / 100 }), style: { width: '50px' }, min: 0, max: 100, buttonPosition: 'none' })),
          ),
          React.createElement(Slider, { value: 100 * first.backgroundOpacity, onChange: (v: number) => setAll({ backgroundOpacity: v / 100 }), min: 0, max: 100, labelRenderer: false }),
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
            React.createElement('div', { style: { lineHeight: '30px' } }, t('toolbar.color')),
            React.createElement(ColorPicker, { value: first.backgroundColor, size: 30, onChange: (c: string) => setAll({ backgroundColor: c }), store }),
          ),
        ),
        isImgOrSvg && React.createElement(Switch, { checked: !!first.borderSize, label: t('toolbar.border'), onChange: (e: any) => setAll({ borderSize: e.target.checked ? 2 : 0 }), alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
        !!first.borderSize && React.createElement(
          React.Fragment,
          null,
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between' } },
            React.createElement(ColorPicker, { value: first.borderColor, size: 30, onChange: (c: string) => setAll({ borderColor: c }), store }),
            React.createElement(NumericInput, { defaultValue: first.borderSize, onValueChange: (v: number) => setAll({ borderSize: clamp(v, 1, Math.min(first.width, first.height) / 2) }), style: { width: '80px' }, min: 1, max: Math.max(1, Math.min(first.width, first.height) / 2) }),
          ),
        ),
        isImgOrSvg && React.createElement(Switch, { checked: !!first.cornerRadius, label: t('toolbar.cornerRadius'), onChange: (e: any) => setAll({ cornerRadius: e.target.checked ? Math.min(first.width / 4, first.height / 4) : 0 }), alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
        isImgOrSvg && !!first.cornerRadius && React.createElement(
          'div',
          { style: { display: 'flex', width: '100%', justifyContent: 'space-between' } },
          React.createElement('div', { style: { width: '150px', paddingTop: '7px' } },
            React.createElement(Slider, { value: Math.min(first.cornerRadius, Math.round(Math.min(first.width / 2, first.height / 2))), onChange: (v: number) => setAll({ cornerRadius: v }), min: 1, max: Math.round(Math.min(first.width / 2, first.height / 2)), labelStepSize: 50, showTrackFill: false, labelRenderer: false }),
          ),
          React.createElement(NumericInput, { value: first.cornerRadius, onValueChange: (v: number) => setAll({ cornerRadius: clamp(v, 1, Math.min(first.width, first.height) / 2) }), buttonPosition: 'none', style: { width: '45px', padding: '0 5px' }, min: 1, max: Math.round(Math.min(first.width / 2, first.height / 2)) }),
        ),
        React.createElement(Switch, { checked: first.shadowEnabled, label: t('toolbar.shadow'), onChange: (e: any) => setAll({ shadowEnabled: e.target.checked }), alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
        first.shadowEnabled && React.createElement(
          React.Fragment,
          null,
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
            React.createElement('div', null, t('toolbar.blur')),
            React.createElement('div', null, React.createElement(NumberInput, { value: first.shadowBlur, onValueChange: (v: number) => setAll({ shadowBlur: clamp(v, -50, 50) }), style: { width: '50px' }, min: 0, max: 50, buttonPosition: 'none' })),
          ),
          React.createElement(Slider, { value: first.shadowBlur, onChange: (v: number) => setAll({ shadowBlur: v }), min: 0, max: 50, showTrackFill: false, labelRenderer: false }),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
            React.createElement('div', null, t('toolbar.offsetX')),
            React.createElement('div', null, React.createElement(NumberInput, { value: first.shadowOffsetX, onValueChange: (v: number) => setAll({ shadowOffsetX: clamp(v, -50, 50) }), style: { width: '50px' }, min: -50, max: 50, buttonPosition: 'none' })),
          ),
          React.createElement(Slider, { value: first.shadowOffsetX, onChange: (v: number) => setAll({ shadowOffsetX: v }), min: -50, max: 50, showTrackFill: false, labelRenderer: false }),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
            React.createElement('div', null, t('toolbar.offsetY')),
            React.createElement('div', null, React.createElement(NumberInput, { value: first.shadowOffsetY, onValueChange: (v: number) => setAll({ shadowOffsetY: clamp(v, -50, 50) }), style: { width: '50px' }, min: -50, max: 50, buttonPosition: 'none' })),
          ),
          React.createElement(Slider, { value: first.shadowOffsetY, onChange: (v: number) => setAll({ shadowOffsetY: v }), min: -50, max: 50, showTrackFill: false, labelRenderer: false }),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
            React.createElement('div', null, t('toolbar.opacity')),
            React.createElement('div', null, React.createElement(NumberInput, { value: Math.round(100 * first.shadowOpacity), onValueChange: (v: number) => setAll({ shadowOpacity: v / 100 }), style: { width: '50px' }, min: 0, max: 100, buttonPosition: 'none' })),
          ),
          React.createElement(Slider, { value: 100 * first.shadowOpacity, onChange: (v: number) => setAll({ shadowOpacity: v / 100 }), min: 0, max: 100, labelRenderer: false }),
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
            React.createElement('div', { style: { lineHeight: '30px' } }, t('toolbar.color')),
            React.createElement(ColorPicker, { value: first.shadowColor, size: 30, onChange: (c: string) => setAll({ shadowColor: c }), store }),
          ),
        ),
      ),
      position: Position.BOTTOM,
    },
    React.createElement(Button, { icon: React.createElement(LeftJoin, null), text: t('toolbar.effects'), minimal: true }),
  );
});

export const EffectsPicker = observer(({ element, store }: any) => {
  if (!element.contentEditable) return null;
  return React.createElement(Button, {
    minimal: true,
    icon: React.createElement(LeftJoin, null),
    text: t('toolbar.effects'),
    onClickCapture: (e: any) => { e.stopPropagation(); store.openSidePanel('effects'); },
  });
});

export default FiltersPicker;
