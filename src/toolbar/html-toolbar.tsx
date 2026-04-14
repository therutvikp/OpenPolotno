'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify } from '@blueprintjs/icons';
import { ElementContainer, extendToolbar } from './element-container';
import ColorPicker from './color-picker';
import FiltersPicker from './filters-picker';
// @ts-ignore
import MdFormatTextdirectionRToL from '@meronex/icons/md/MdFormatTextdirectionRToL.js';
// @ts-ignore
import MdFormatTextdirectionLToR from '@meronex/icons/md/MdFormatTextdirectionLToR.js';
// @ts-ignore
import MdcFormatVerticalAlignTop from '@meronex/icons/mdc/MdcFormatVerticalAlignTop.js';
// @ts-ignore
import MdcFormatVerticalAlignCenter from '@meronex/icons/mdc/MdcFormatVerticalAlignCenter.js';
// @ts-ignore
import MdcFormatVerticalAlignBottom from '@meronex/icons/mdc/MdcFormatVerticalAlignBottom.js';
// @ts-ignore
import MdcFormatListBulleted from '@meronex/icons/mdc/MdcFormatListBulleted.js';
// @ts-ignore
import MdcFormatListNumbered from '@meronex/icons/mdc/MdcFormatListNumbered.js';
import { AnimationsPicker } from './animations-picker';
import { flags } from '../utils/flags';
import { TextAiWrite } from './text-ai-write';
import { quillRef, createQuill, setQuillContent } from '../canvas/html-element';
import { TextFontFamily, TextSpacing, TextFontSize, TextTransform, ALIGN_OPTIONS } from './text-toolbar';

const VERTICAL_ALIGN_OPTIONS = ['top', 'middle', 'bottom'];
const VERTICAL_ALIGN_ICONS: Record<string, any> = {
  top: React.createElement('span', { className: 'bp5-icon' }, React.createElement(MdcFormatVerticalAlignTop, null)),
  middle: React.createElement('span', { className: 'bp5-icon' }, React.createElement(MdcFormatVerticalAlignCenter, null)),
  bottom: React.createElement('span', { className: 'bp5-icon' }, React.createElement(MdcFormatVerticalAlignBottom, null)),
};

const createTempQuill = ({ html }: { html: string }) => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  div.style.display = 'none';
  div.style.whiteSpace = 'pre-wrap';
  const q = createQuill(div);
  setQuillContent(q, html);
  return q;
};

const destroyTempQuill = (q: any) => { q.root.parentElement.remove(); };

const FormatButton = observer(({ active, format, element, disableGlobal, enableGlobal, icon, ariaLabel }: any) =>
  React.createElement(Button, {
    minimal: true,
    icon,
    active,
    'aria-label': ariaLabel || format,
    onMouseDown: (e: any) => e.preventDefault(),
    onClick: () => {
      let quill = (window as any).__raeditorQuill;
      if (quill) {
        const sel = quill.getSelection();
        if (sel && sel.length > 0) {
          quill.formatText(sel.index, sel.length, format, !quillRef.currentFormat[format], 'user');
        } else {
          quill.format(format, !quillRef.currentFormat[format], 'user');
        }
        runInAction(() => { quillRef.currentFormat = quill.getFormat(quill.getSelection()); });
        if (active && disableGlobal) disableGlobal();
        return;
      }
      quill = createTempQuill({ html: element.text });
      quill.setSelection(0, quill.getLength(), 'api');
      quill.format(format, false);
      const html = quill.root.innerHTML;
      destroyTempQuill(quill);
      element.set({ text: html });
      if (active) disableGlobal?.();
      else enableGlobal?.();
    },
  }),
);

export const TextBold = observer(({ element, store }: any) =>
  React.createElement(FormatButton, {
    format: 'bold',
    active: quillRef.currentFormat.bold || element.fontWeight === 'bold' || element.fontWeight === '700',
    globalActive: element.fontWeight === 'bold' || element.fontWeight === '700',
    element,
    disableGlobal: () => element.set({ fontWeight: 'normal' }),
    enableGlobal: () => element.set({ fontWeight: 'bold' }),
    icon: React.createElement(Bold, null),
  }),
);

export const FontStyleGroup = observer(({ element, store, elements, components }: any) => {
  const TextBoldComponent = components?.TextBold || TextBold;
  return React.createElement(
    ButtonGroup,
    null,
    React.createElement(TextBoldComponent, { element, store }),
    React.createElement(FormatButton, {
      format: 'italic',
      active: quillRef.currentFormat.italic || element.fontStyle === 'italic',
      globalActive: element.fontStyle === 'italic',
      element,
      disableGlobal: () => element.set({ fontStyle: 'normal' }),
      enableGlobal: () => element.set({ fontStyle: 'italic' }),
      icon: React.createElement(Italic, null),
    }),
    React.createElement(FormatButton, {
      format: 'underline',
      active: quillRef.currentFormat.underline || element.textDecoration.indexOf('underline') >= 0,
      globalActive: element.textDecoration.indexOf('underline') >= 0,
      element,
      disableGlobal: () => { let d = element.textDecoration.split(' '); d = d.filter((p: string) => p !== 'underline'); element.set({ textDecoration: d.join(' ') }); },
      enableGlobal: () => { const d = element.textDecoration.split(' '); d.push('underline'); element.set({ textDecoration: d.join(' ') }); },
      icon: React.createElement(Underline, null),
    }),
    React.createElement(FormatButton, {
      format: 'strike',
      active: quillRef.currentFormat.strike || element.textDecoration.indexOf('line-through') >= 0,
      globalActive: element.textDecoration.indexOf('line-through') >= 0,
      element,
      disableGlobal: () => { let d = element.textDecoration.split(' '); d = d.filter((p: string) => p !== 'line-through'); element.set({ textDecoration: d.join(' ') }); },
      enableGlobal: () => { const d = element.textDecoration.split(' '); d.push('line-through'); element.set({ textDecoration: d.join(' ') }); },
      icon: React.createElement(Strikethrough, null),
    }),
    React.createElement(Button, {
      minimal: true,
      icon: element.align === 'left' ? React.createElement(AlignLeft, null)
        : element.align === 'center' ? React.createElement(AlignCenter, null)
        : element.align === 'right' ? React.createElement(AlignRight, null)
        : React.createElement(AlignJustify, null),
      onClick: () => {
        const nextIdx = (ALIGN_OPTIONS.indexOf(element.align) + 1 + ALIGN_OPTIONS.length) % ALIGN_OPTIONS.length;
        store.history.transaction(() => { elements.forEach((el: any) => { el.set({ align: ALIGN_OPTIONS[nextIdx] }); }); });
      },
      'aria-label': 'Text align',
    }),
    flags.textVerticalResizeEnabled && React.createElement(Button, {
      minimal: true,
      icon: VERTICAL_ALIGN_ICONS[element.verticalAlign],
      onClick: () => {
        const nextIdx = (VERTICAL_ALIGN_OPTIONS.indexOf(element.verticalAlign) + 1 + VERTICAL_ALIGN_OPTIONS.length) % VERTICAL_ALIGN_OPTIONS.length;
        store.history.transaction(() => { element.set({ verticalAlign: VERTICAL_ALIGN_OPTIONS[nextIdx] }); });
      },
      'aria-label': 'Vertical align',
    }),
    React.createElement(Button, {
      minimal: true,
      icon: quillRef.currentFormat.list === 'bullet'
        ? React.createElement('span', { className: 'bp5-icon' }, React.createElement(MdcFormatListNumbered, { style: { width: '20px', height: '20px' } }))
        : React.createElement('span', { className: 'bp5-icon' }, React.createElement(MdcFormatListBulleted, { style: { width: '20px', height: '20px' } })),
      onMouseDown: (e: any) => e.preventDefault(),
      onClick: () => {
        let quill = (window as any).__raeditorQuill;
        const isTemp = !quill;
        quill = quill || createTempQuill({ html: element.text });
        if (isTemp) quill.setSelection(0, quill.getLength(), 'api');
        const fmt = quill.getFormat();
        if (fmt.list) {
          if (fmt.list === 'bullet') quill.format('list', 'ordered');
          else quill.format('list', false);
        } else {
          quill.format('list', 'bullet');
        }
        if (isTemp) { element.set({ text: quill.root.innerHTML }); destroyTempQuill(quill); }
      },
      'aria-label': 'List format',
    }),
  );
});

export const FontColorInput = observer(({ element, store }: any) => {
  const [savedSel, setSavedSel] = React.useState<any>(null);
  return React.createElement(ColorPicker, {
    value: quillRef.currentFormat.color || element.fill,
    gradientEnabled: true,
    onOpen: () => {
      const quill = (window as any).__raeditorQuill;
      if (quill) setSavedSel(quill.getSelection());
    },
    onClose: () => {
      const quill = (window as any).__raeditorQuill;
      if (quill) quill.setSelection(savedSel);
    },
    onChange: (color: string) => {
      const quill = (window as any).__raeditorQuill;
      const sel = quill?.getSelection() || savedSel;
      if (!sel) {
        const cleaned = element.text.replace(/style=".*?"/g, '');
        element.set({ fill: color, text: cleaned });
        return;
      }
      const isAll = (sel?.length ?? 0) >= (quill?.getLength() ?? 0) - 1;
      if (quill && !isAll && sel?.length) {
        quill.formatText(sel.index, sel.length, 'color', color, 'user');
      } else {
        const cleaned = element.text.replace(/style=".*?"/g, '');
        element.set({ fill: color, text: cleaned });
      }
    },
    store,
  });
});

export const DirectionInput = observer(({ element }: any) => {
  const IconComp = element.dir === 'rtl' ? MdFormatTextdirectionRToL : MdFormatTextdirectionLToR;
  return React.createElement(Button, {
    icon: React.createElement(IconComp, { className: 'bp5-icon', style: { fontSize: '20px' } }),
    minimal: true,
    onClick: () => { element.set({ dir: element.dir === 'rtl' ? 'ltr' : 'rtl' }); },
  });
});

const defaultHtmlComponents: Record<string, any> = {
  TextFontFamily,
  TextFontSize,
  TextFontVariant: FontStyleGroup,
  TextTransform,
  TextFilters: FiltersPicker,
  TextFill: FontColorInput,
  TextSpacing,
  TextDirection: DirectionInput,
  TextAnimations: AnimationsPicker,
  TextAiWrite,
};

export const HtmlToolbar = observer(({ store, components }: any) => {
  const elements = store.selectedElements;
  const element = store.selectedElements[0];
  const usedItems = [
    'TextFill', 'TextFontFamily', 'TextFontSize', 'TextFontVariant', 'TextSpacing', 'TextTransform',
    'TextFilters', flags.animationsEnabled && 'TextAnimations', 'TextAiWrite',
  ];
  const items = extendToolbar({ type: 'text', usedItems, components });
  return React.createElement(ElementContainer, {
    items,
    itemRender: (key: string) => {
      if (key === 'TextBold') return null;
      const Component = components[key] || defaultHtmlComponents[key];
      return React.createElement(Component, { element, elements, store, key, components });
    },
  });
});
