'use client';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, NumericInput, Switch, Alignment, Position, Icon, Tooltip, HTMLSelect } from '@blueprintjs/core';
import { t as s } from '../utils/l10n';
import AiOutlineFacebook from '@meronex/icons/ai/AiOutlineFacebook';
import AiOutlineInstagram from '@meronex/icons/ai/AiOutlineInstagram';
import AiOutlineYoutube from '@meronex/icons/ai/AiOutlineYoutube';
import AiOutlineVideoCamera from '@meronex/icons/ai/AiOutlineVideoCamera';
import ZoDocument from '@meronex/icons/zo/ZoDocument';
import AiOutlineIdcard from '@meronex/icons/ai/AiOutlineIdcard';
import AiOutlineLinkedin from '@meronex/icons/ai/AiOutlineLinkedin';
import AiOutlineTwitter from '@meronex/icons/ai/AiOutlineTwitter';
import { Help } from '@blueprintjs/icons';
import { pxToUnit, pxToUnitRounded, unitToPx } from '../utils/unit';
import { StoreType } from '../model/store';

export const SIZE_CATEGORIES = [
  { name: 'Instagram', icon: React.createElement(AiOutlineInstagram, null), sizes: [
    ['Post', 1080, 1080, 'px', React.createElement(AiOutlineInstagram, null)],
    ['Story', 1080, 1920, 'px', React.createElement(AiOutlineInstagram, null)],
    ['Ad', 1080, 1080, 'px', React.createElement(AiOutlineInstagram, null)],
  ]},
  { name: 'Facebook', icon: React.createElement(AiOutlineFacebook, null), sizes: [
    ['Post (Landscape)', 1200, 630, 'px', React.createElement(AiOutlineFacebook, null)],
    ['Post (Square)', 1080, 1080, 'px', React.createElement(AiOutlineFacebook, null)],
    ['Cover', 851, 315, 'px', React.createElement(AiOutlineFacebook, null)],
  ]},
  { name: 'Youtube', icon: React.createElement(AiOutlineYoutube, null), sizes: [
    ['Thumbnail', 1280, 720, 'px', React.createElement(AiOutlineYoutube, null)],
    ['Channel', 2560, 1440, 'px', React.createElement(AiOutlineYoutube, null)],
    ['Short', 1080, 1920, 'px', React.createElement(AiOutlineYoutube, null)],
  ]},
  { name: 'LinkedIn', icon: React.createElement(AiOutlineLinkedin, null), sizes: [
    ['Post', 1200, 627, 'px', React.createElement(AiOutlineLinkedin, null)],
    ['Banner', 1584, 396, 'px', React.createElement(AiOutlineLinkedin, null)],
    ['Square', 1080, 1080, 'px', React.createElement(AiOutlineLinkedin, null)],
  ]},
  { name: 'Twitter', icon: React.createElement(AiOutlineTwitter, null), sizes: [
    ['Post', 1600, 900, 'px', React.createElement(AiOutlineTwitter, null)],
    ['Header', 1500, 500, 'px', React.createElement(AiOutlineTwitter, null)],
    ['Square', 1080, 1080, 'px', React.createElement(AiOutlineTwitter, null)],
  ]},
  { name: 'Video', icon: React.createElement(AiOutlineVideoCamera, null), sizes: [
    ['Full HD', 1920, 1080, 'px', React.createElement(AiOutlineVideoCamera, null)],
    ['4K UHD', 3840, 2160, 'px', React.createElement(AiOutlineVideoCamera, null)],
    ['Vertical HD', 1080, 1920, 'px', React.createElement(AiOutlineVideoCamera, null)],
    ['Square HD', 1080, 1080, 'px', React.createElement(AiOutlineVideoCamera, null)],
  ]},
  { name: 'Print', icon: React.createElement(ZoDocument, null), sizes: [
    ['Invitation', 14, 14, 'cm', React.createElement(ZoDocument, null)],
    ['A4 Portrait', 21, 29.7, 'cm', React.createElement(ZoDocument, null)],
    ['A4 Landscape', 29.7, 21, 'cm', React.createElement(ZoDocument, null)],
    ['A3', 29.7, 42, 'cm', React.createElement(ZoDocument, null)],
    ['Letter Portrait', 8.5, 11, 'in', React.createElement(ZoDocument, null)],
    ['Letter Landscape', 11, 8.5, 'in', React.createElement(ZoDocument, null)],
    ['Business card', 3.5, 2, 'in', React.createElement(AiOutlineIdcard, null)],
    ['Poster', 18, 24, 'in', React.createElement(ZoDocument, null)],
  ]},
];

const DimensionInput = ({ value, onChange, min, ...rest }: any) => {
  const [localValue, setLocalValue] = React.useState(value.toString());
  const localRef = React.useRef(localValue);
  localRef.current = localValue;

  const commit = () => { onChange(Math.max(min || 0, parseFloat(localRef.current))); };

  React.useEffect(() => { setLocalValue(value); }, [value]);

  return React.createElement(NumericInput, {
    ...rest,
    value: localValue.toString(),
    onValueChange: (_num: number, str: string) => { if (!Number.isNaN(_num)) setLocalValue(str); },
    onBlur: commit,
    allowNumericCharactersOnly: false,
    onKeyDown: (e: any) => { if (e.key === 'Enter') commit(); },
  });
};

export const SizePanel = observer(({ store }: { store: StoreType }) => {
  const [magicResize, setMagicResize] = React.useState(true);
  const [widthVal, setWidthVal] = React.useState(store.width);
  const [heightVal, setHeightVal] = React.useState(store.height);

  const minVal = pxToUnit({ px: 10, unit: store.unit, dpi: store.dpi });
  const computedW = store.activePage?.computedWidth || store.width;
  const computedH = store.activePage?.computedHeight || store.height;

  React.useEffect(() => { setWidthVal(pxToUnitRounded({ px: computedW, unit: store.unit, dpi: store.dpi })); }, [computedW, store.unit, store.dpi]);
  React.useEffect(() => { setHeightVal(pxToUnitRounded({ px: computedH, unit: store.unit, dpi: store.dpi })); }, [computedH, store.unit, store.dpi]);

  const applySize = (wUnit: number, hUnit: number, unitStr?: string) => {
    const unit = unitStr || store.unit;
    const wPx = unitToPx({ unitVal: wUnit, dpi: store.dpi, unit });
    const hPx = unitToPx({ unitVal: hUnit, dpi: store.dpi, unit });
    if (unitStr) store.setUnit({ unit, dpi: store.dpi });
    store.setSize(wPx, hPx, magicResize);
    if (store.activePage?.width !== 'auto') store.activePage?.set({ width: wPx });
    if (store.activePage?.height !== 'auto') store.activePage?.set({ height: hPx });
  };

  return React.createElement(
    'div',
    { style: { height: '100%', overflow: 'auto', paddingRight: '3px' } },
    React.createElement(
      'div',
      { style: { paddingBottom: '15px' } },
      React.createElement(
        Switch,
        { checked: magicResize, onChange: (e: any) => setMagicResize(e.target.checked), alignIndicator: Alignment.RIGHT, style: { marginTop: '8px', marginBottom: '25px' } },
        s('sidePanel.useMagicResize'), ' ',
        React.createElement(Tooltip, { content: s('sidePanel.magicResizeDescription'), position: Position.BOTTOM },
          React.createElement(Icon, { icon: React.createElement(Help, null) })
        )
      ),
      React.createElement('div', { style: { width: '50%', display: 'inline-block' } }, s('sidePanel.width'), ' (', store.unit, ')'),
      React.createElement('div', { style: { width: '50%', display: 'inline-block' } },
        React.createElement(DimensionInput, { fill: true, value: widthVal, onChange: (v: number) => { setWidthVal(v || minVal); }, min: minVal, max: 10000, selectAllOnFocus: true, stepSize: store.unit === 'px' ? 1 : 0.1 })
      )
    ),
    React.createElement(
      'div',
      { style: { paddingBottom: '15px' } },
      React.createElement('div', { style: { width: '50%', display: 'inline-block' } }, s('sidePanel.height'), ' (', store.unit, ')'),
      React.createElement('div', { style: { width: '50%', display: 'inline-block' } },
        React.createElement(DimensionInput, { fill: true, value: heightVal, onChange: (v: number) => { setHeightVal(v || minVal); }, min: minVal, max: 10000, selectAllOnFocus: true, stepSize: store.unit === 'px' ? 1 : 0.1 })
      )
    ),
    React.createElement(
      'div',
      { style: { paddingBottom: '15px' } },
      React.createElement('div', { style: { width: '50%', display: 'inline-block' } }, s('sidePanel.units')),
      React.createElement('div', { style: { width: '50%', display: 'inline-block' } },
        React.createElement(HTMLSelect, {
          value: store.unit,
          onChange: (e: any) => { store.setUnit({ unit: e.currentTarget.value, dpi: store.dpi }); },
          options: [{ label: 'px', value: 'px' }, { label: 'cm', value: 'cm' }, { label: 'in', value: 'in' }],
          fill: true,
        })
      )
    ),
    React.createElement(
      'div',
      { style: { paddingBottom: '15px' } },
      React.createElement(Button, {
        fill: true,
        intent: 'primary',
        onClick: () => { applySize(widthVal, heightVal); },
      }, s('sidePanel.resize'))
    ),
    SIZE_CATEGORIES.map(({ name, icon, sizes }: any) =>
      React.createElement(
        React.Fragment,
        { key: name },
        React.createElement('div', { style: { paddingBottom: '15px', paddingTop: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 } }, icon, name),
        React.createElement(
          'div',
          { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' } },
          sizes.map(([label, w, h, unit, ico]: any) =>
            React.createElement(
              Button,
              {
                key: label,
                style: { height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '13px' },
                minimal: true,
                onClick: () => { applySize(w, h, unit); },
              },
              React.createElement('div', { style: { fontSize: '22px', marginBottom: '4px' } }, ico),
              React.createElement('div', null, label),
              React.createElement('div', { style: { fontSize: '0.7rem', opacity: 0.7 } }, w, '×', h, ' ', unit)
            )
          )
        )
      )
    )
  );
});
