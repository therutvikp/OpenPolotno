'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Menu, MenuItem, Popover, Tooltip, MenuDivider } from '@blueprintjs/core';

// Icon: cursor with multi-select dots
const AdvancedSelectIcon = () =>
  React.createElement(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'currentColor' },
    React.createElement('path', {
      d: 'M3 1 L3 11 L6 8.5 L8 13 L9.5 12.3 L7.5 7.5 L11 7.5 Z',
      fill: 'currentColor',
      stroke: 'none',
    }),
    React.createElement('circle', { cx: 12, cy: 4, r: 1.5, fill: 'currentColor', opacity: 0.6 }),
    React.createElement('circle', { cx: 14, cy: 7, r: 1.5, fill: 'currentColor', opacity: 0.6 }),
    React.createElement('circle', { cx: 12, cy: 10, r: 1.5, fill: 'currentColor', opacity: 0.6 }),
  );

/**
 * Get the primary "fill" color of an element for color-based matching.
 * Returns null if the element type doesn't have a meaningful fill.
 */
function getElementColor(el: any): string | null {
  if (el.fill != null) return el.fill;
  return null;
}

export const AdvancedSelectButton = observer(({ store }: { store: any }) => {
  const selected = store.selectedElements;
  if (!selected || selected.length === 0) return null;

  const first = selected[0];
  const allElements: any[] = store.activePage?.children?.slice() ?? [];

  const selectSameType = () => {
    const type = first.type;
    const ids = allElements.filter((el) => el.type === type).map((el) => el.id);
    store.selectElements(ids);
  };

  const selectSameColor = () => {
    const color = getElementColor(first);
    if (color == null) return;
    const ids = allElements
      .filter((el) => getElementColor(el) === color)
      .map((el) => el.id);
    store.selectElements(ids);
  };

  const selectSameFont = () => {
    const font = first.fontFamily;
    if (!font) return;
    const ids = allElements
      .filter((el) => el.type === 'text' && el.fontFamily === font)
      .map((el) => el.id);
    store.selectElements(ids);
  };

  const firstColor = getElementColor(first);
  const isText = first.type === 'text';

  const menu = React.createElement(
    Menu,
    null,
    React.createElement(MenuDivider, { title: 'Select all on page…' }),
    React.createElement(MenuItem, {
      text: `Same Type  (${first.type})`,
      icon: 'filter',
      onClick: selectSameType,
    }),
    firstColor != null &&
      React.createElement(MenuItem, {
        text: 'Same Color',
        icon: React.createElement(
          'span',
          {
            style: {
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: 2,
              background: firstColor,
              border: '1px solid rgba(0,0,0,0.2)',
              verticalAlign: 'middle',
            },
          },
        ),
        onClick: selectSameColor,
      }),
    isText &&
      React.createElement(MenuItem, {
        text: `Same Font  (${first.fontFamily})`,
        icon: 'font',
        onClick: selectSameFont,
      }),
  );

  return React.createElement(
    Tooltip,
    { content: 'Advanced Selection', position: 'bottom' },
    React.createElement(
      Popover,
      { content: menu, position: 'bottom-right', minimal: true },
      React.createElement(Button, {
        minimal: true,
        icon: React.createElement(AdvancedSelectIcon),
        'aria-label': 'Advanced Selection',
      }),
    ),
  );
});
