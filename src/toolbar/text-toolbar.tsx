'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, ButtonGroup, InputGroup, Menu, MenuDivider, MenuItem, NumericInput, Popover, Position, Slider, Tooltip } from '@blueprintjs/core';
import { FixedSizeList } from 'react-window';
import useSWR from 'swr';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, CaretDown, Italic, Search, Strikethrough, Underline } from '@blueprintjs/icons';
import { getFontsList, globalFonts, isGoogleFontChanged } from '../utils/fonts';
import { getGoogleFontImage, getGoogleFontsListAPI } from '../utils/api';
import ColorPicker from './color-picker';
import FiltersPicker from './filters-picker';
import { AnimationsPicker } from './animations-picker';
import { ElementContainer, extendToolbar } from './element-container';
import { TextAiWrite } from './text-ai-write';
// @ts-ignore
import MdcFormatLineSpacing from '@meronex/icons/mdc/MdcFormatLineSpacing.js';
// @ts-ignore
import MdcFormatLetterCase from '@meronex/icons/mdc/MdcFormatLetterCase.js';
import styled from '../utils/styled';
// @ts-ignore
import MdcFormatVerticalAlignTop from '@meronex/icons/mdc/MdcFormatVerticalAlignTop.js';
// @ts-ignore
import MdcFormatVerticalAlignCenter from '@meronex/icons/mdc/MdcFormatVerticalAlignCenter.js';
// @ts-ignore
import MdcFormatVerticalAlignBottom from '@meronex/icons/mdc/MdcFormatVerticalAlignBottom.js';
import { t } from '../utils/l10n';
import { flags } from '../utils/flags';

const FontImg = styled('img')`
  height: 20px;

  .bp5-dark & {
    filter: invert(1);
  }
`;

const localFontsList = getFontsList();

const FontItem = ({ fontFamily, handleClick, modifiers, store, isCustom }: any) => {
  const [useImage, setUseImage] = React.useState(!isCustom);
  React.useEffect(() => {
    if (!useImage) store.loadFont(fontFamily);
  }, [fontFamily, useImage]);
  if (fontFamily === '_divider') {
    return React.createElement('div', { style: { paddingTop: '10px' } }, React.createElement(MenuDivider, null));
  }
  const label = useImage
    ? React.createElement(FontImg, { src: getGoogleFontImage(fontFamily), alt: fontFamily, onError: () => { setUseImage(false); } })
    : fontFamily;
  return React.createElement(MenuItem, { text: label, active: modifiers.active, disabled: modifiers.disabled, onClick: handleClick, style: { fontFamily: `"${fontFamily}"` } });
};

const FontSearch = ({ onChange, defaultValue }: any) => {
  const inputRef = React.useRef<any>(null);
  React.useEffect(() => { inputRef.current?.focus(); }, []);
  return React.createElement(InputGroup, { leftIcon: React.createElement(Search, null), inputRef, defaultValue, onChange: (e: any) => onChange(e.target.value) });
};

const FontPicker = ({ store, fonts, activeFont, activeFontLabel, onFontSelect }: any) => {
  const [search, setSearch] = React.useState('');
  const filtered = fonts.filter((f: string) => f.toLowerCase().includes(search.toLowerCase()));
  return React.createElement(
    Popover,
    {
      content: React.createElement(
        'div',
        null,
        React.createElement(FontSearch, { onChange: setSearch, defaultValue: search }),
        React.createElement(
          'div',
          { style: { paddingTop: '5px' } },
          React.createElement(FixedSizeList, {
            innerElementType: React.forwardRef((props: any, ref: any) => React.createElement(Menu, { ref, ...props })),
            height: Math.min(400, 30 * filtered.length) + 10,
            width: 210,
            itemCount: filtered.length,
            itemSize: 30,
            children: ({ index, style }: any) => {
              const fontFamily = filtered[index];
              return React.createElement(
                'div',
                { style },
                React.createElement(FontItem, {
                  key: fontFamily,
                  fontFamily,
                  modifiers: { active: activeFont === fontFamily },
                  handleClick: () => onFontSelect(fontFamily),
                  store,
                  isCustom: store.fonts.find((f: any) => f.fontFamily === fontFamily) || globalFonts.find((f: any) => f.fontFamily === fontFamily),
                }),
              );
            },
          }),
        ),
      ),
    },
    React.createElement(Button, {
      text: activeFontLabel,
      rightIcon: React.createElement(CaretDown, null),
      minimal: true,
      style: { marginRight: '5px', fontFamily: `"${activeFont}"`, overflow: 'hidden', whiteSpace: 'nowrap', maxHeight: '30px' },
    }),
  );
};

const swrCache: Record<string, any> = {};
export const fetcher = (url: string) =>
  swrCache[url] ? Promise.resolve(swrCache[url]) : fetch(url).then((r) => r.json()).then((d) => { swrCache[url] = d; return d; });

export const TextFontFamily = observer(({ elements, store }: any) => {
  const { data, mutate } = useSWR(getGoogleFontsListAPI(), fetcher, { isPaused: () => isGoogleFontChanged(), fallbackData: [] });
  React.useEffect(() => { mutate(); }, [isGoogleFontChanged()]);
  const customAndGlobal = store.fonts.concat(globalFonts).map((f: any) => f.fontFamily);
  const googleFonts = (data?.length && !isGoogleFontChanged()) ? data : localFontsList;
  const allFonts = customAndGlobal.concat(googleFonts);
  let label = elements[0].fontFamily;
  if (label.length > 15) label = label.slice(0, 15) + '...';
  const usedFonts: string[] = [];
  store.find((el: any) => { if (el.type === 'text') usedFonts.push(el.fontFamily); return false; });
  const fonts = [...new Set([...usedFonts, '_divider', ...allFonts])];
  return React.createElement(FontPicker, {
    fonts,
    activeFont: elements[0].fontFamily,
    activeFontLabel: label,
    store,
    onFontSelect: (font: string) => {
      store.history.transaction(() => { elements.forEach((el: any) => { el.set({ fontFamily: font }); }); });
    },
  });
});

export const TextFontSize = observer(({ elements, store }: any) =>
  React.createElement(NumericInput, {
    onValueChange: (v: number) => {
      if (Number.isNaN(v)) return;
      store.history.transaction(() => { elements.forEach((el: any) => { el.set({ fontSize: v, width: Math.max(v, el.width) }); }); });
    },
    value: Math.round(elements[0].fontSize),
    style: { width: '50px' },
    min: 5,
    max: 4 * store.height,
  }),
);

export const ALIGN_OPTIONS = ['left', 'center', 'right', 'justify'];
const VERTICAL_ALIGN_OPTIONS = ['top', 'middle', 'bottom'];

const VERTICAL_ALIGN_ICONS: Record<string, any> = {
  top: React.createElement('span', { className: 'bp5-icon' }, React.createElement(MdcFormatVerticalAlignTop, null)),
  middle: React.createElement('span', { className: 'bp5-icon' }, React.createElement(MdcFormatVerticalAlignCenter, null)),
  bottom: React.createElement('span', { className: 'bp5-icon' }, React.createElement(MdcFormatVerticalAlignBottom, null)),
};

export const TextFontVariant = observer(({ elements, store }: any) => {
  const first = elements[0];
  const alignIcon =
    first.align === 'left' ? React.createElement(AlignLeft, null)
    : first.align === 'center' ? React.createElement(AlignCenter, null)
    : first.align === 'right' ? React.createElement(AlignRight, null)
    : React.createElement(AlignJustify, null);

  return React.createElement(
    ButtonGroup,
    null,
    React.createElement(Button, {
      minimal: true,
      icon: alignIcon,
      onMouseDown: (e: any) => e.preventDefault(),
      onClick: () => {
        const nextIdx = (ALIGN_OPTIONS.indexOf(first.align) + 1 + ALIGN_OPTIONS.length) % ALIGN_OPTIONS.length;
        const align = ALIGN_OPTIONS[nextIdx];
        store.history.transaction(() => { elements.forEach((el: any) => { el.set({ align }); }); });
      },
      'aria-label': 'Text align',
    }),
    flags.textVerticalResizeEnabled && React.createElement(Button, {
      minimal: true,
      icon: VERTICAL_ALIGN_ICONS[first.verticalAlign],
      onMouseDown: (e: any) => e.preventDefault(),
      onClick: () => {
        const nextIdx = (VERTICAL_ALIGN_OPTIONS.indexOf(first.verticalAlign) + 1 + VERTICAL_ALIGN_OPTIONS.length) % VERTICAL_ALIGN_OPTIONS.length;
        const verticalAlign = VERTICAL_ALIGN_OPTIONS[nextIdx];
        store.history.transaction(() => { elements.forEach((el: any) => { el.set({ verticalAlign }); }); });
      },
      'aria-label': 'Vertical align',
    }),
    React.createElement(Button, {
      minimal: true,
      icon: React.createElement(Bold, null),
      active: first.fontWeight === 'bold' || first.fontWeight === '700',
      onMouseDown: (e: any) => e.preventDefault(),
      onClick: () => {
        const isBold = first.fontWeight === 'bold' || first.fontWeight === '700';
        store.history.transaction(() => { elements.forEach((el: any) => { el.set({ fontWeight: isBold ? 'normal' : 'bold' }); }); });
      },
      'aria-label': 'Bold',
    }),
    React.createElement(Button, {
      minimal: true,
      icon: React.createElement(Italic, null),
      active: first.fontStyle === 'italic',
      onMouseDown: (e: any) => e.preventDefault(),
      onClick: () => {
        const isItalic = first.fontStyle === 'italic';
        store.history.transaction(() => { elements.forEach((el: any) => { el.set({ fontStyle: isItalic ? 'normal' : 'italic' }); }); });
      },
      'aria-label': 'Italic',
    }),
    React.createElement(Button, {
      minimal: true,
      icon: React.createElement(Underline, null),
      active: first.textDecoration.indexOf('underline') >= 0,
      onMouseDown: (e: any) => e.preventDefault(),
      onClick: () => {
        let parts = first.textDecoration.split(' ');
        if (parts.indexOf('underline') >= 0) parts = parts.filter((p: string) => p !== 'underline');
        else parts.push('underline');
        store.history.transaction(() => { elements.forEach((el: any) => { el.set({ textDecoration: parts.join(' ') }); }); });
      },
      'aria-label': 'Underline',
    }),
    React.createElement(Button, {
      minimal: true,
      icon: React.createElement(Strikethrough, null),
      active: first.textDecoration.indexOf('line-through') >= 0,
      onMouseDown: (e: any) => e.preventDefault(),
      onClick: () => {
        let parts = first.textDecoration.split(' ');
        if (parts.indexOf('line-through') >= 0) parts = parts.filter((p: string) => p !== 'line-through');
        else parts.push('line-through');
        store.history.transaction(() => { elements.forEach((el: any) => { el.set({ textDecoration: parts.join(' ') }); }); });
      },
      'aria-label': 'Strikethrough',
    }),
  );
});

export const TextTransform = observer(({ elements, store }: any) =>
  React.createElement(
    ButtonGroup,
    null,
    React.createElement(
      Tooltip,
      { content: t('toolbar.uppercase') },
      React.createElement(Button, {
        variant: 'minimal',
        active: elements[0].textTransform === 'uppercase',
        icon: React.createElement('span', { className: 'bp5-icon' }, React.createElement(MdcFormatLetterCase, { size: 16 })),
        onMouseDown: (e: any) => e.preventDefault(),
        onClick: () => {
          store.history.transaction(() => {
            elements.forEach((el: any) => { el.set({ textTransform: el.textTransform === 'uppercase' ? 'none' : 'uppercase' }); });
          });
        },
      }),
    ),
  ),
);

export const TextFill = observer(({ elements, store }: any) =>
  React.createElement(ColorPicker, {
    value: elements[0].fill,
    style: { marginRight: '5px' },
    gradientEnabled: true,
    onChange: (c: string) => store.history.transaction(() => { elements.forEach((el: any) => { el.set({ fill: c }); }); }),
    store,
  }),
);

export const NumberInput = ({ value, onValueChange, ...rest }: any) => {
  const [local, setLocal] = React.useState(value.toString());
  React.useEffect(() => { setLocal(value.toString()); }, [value]);
  return React.createElement(NumericInput, {
    value: local,
    onValueChange: (num: number, str: string) => { setLocal(str); if (!Number.isNaN(num)) onValueChange(num); },
    ...rest,
  });
};

export const TextSpacing = observer(({ elements, store }: any) => {
  const first = elements[0];
  const setAll = (props: any) => { store.history.transaction(() => { elements.forEach((el: any) => { el.set(props); }); }); };
  const lineHeight = typeof first.lineHeight === 'number' ? 100 * first.lineHeight : 120;

  return React.createElement(
    Popover,
    {
      content: React.createElement(
        'div',
        { style: { padding: '15px', width: '230px' } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
          React.createElement('div', null, t('toolbar.lineHeight')),
          React.createElement('div', null, React.createElement(NumberInput, { value: Math.round(lineHeight), onValueChange: (v: number) => setAll({ lineHeight: v / 100 }), style: { width: '50px' }, min: 50, max: 250, buttonPosition: 'none' })),
        ),
        React.createElement(Slider, { value: Math.round(lineHeight), onChange: (v: number) => setAll({ lineHeight: v / 100 }), min: 50, max: 250, stepSize: 1, showTrackFill: false, labelRenderer: false }),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
          React.createElement('div', null, t('toolbar.letterSpacing')),
          React.createElement('div', null, React.createElement(NumberInput, { value: Math.round(100 * first.letterSpacing), onValueChange: (v: number) => setAll({ letterSpacing: v / 100 }), style: { width: '50px' }, min: -50, max: 250, buttonPosition: 'none' })),
        ),
        React.createElement(Slider, { value: Math.round(100 * first.letterSpacing), onChange: (v: number) => setAll({ letterSpacing: v / 100 }), min: -50, max: 250, stepSize: 1, showTrackFill: false, labelRenderer: false }),
      ),
      position: Position.BOTTOM,
    },
    React.createElement(Button, {
      icon: React.createElement('span', { className: 'bp5-icon' }, React.createElement(MdcFormatLineSpacing, { style: { fontSize: '20px' } })),
      minimal: true,
    }),
  );
});

const defaultTextComponents: Record<string, any> = {
  TextFontFamily,
  TextFontSize,
  TextFontVariant,
  TextTransform,
  TextFill,
  TextSpacing,
  TextAiWrite,
  TextFilters: FiltersPicker,
  TextAnimations: AnimationsPicker,
};

export const TextToolbar = observer(({ store, components }: any) => {
  const elements = store.selectedElements;
  const usedItems = [
    'TextFill', 'TextFontFamily', 'TextFontSize', 'TextFontVariant', 'TextSpacing', 'TextTransform',
    'TextFilters', flags.animationsEnabled && 'TextAnimations', 'TextAiWrite',
  ];
  const items = extendToolbar({ type: 'text', usedItems, components });
  return React.createElement(ElementContainer, {
    items,
    itemRender: (key: string) => {
      const Component = components[key] || defaultTextComponents[key];
      return React.createElement(Component, { elements, element: elements[0], store, key });
    },
  });
});

export default TextToolbar;
