'use client';

import React from 'react';
import { Button, OverflowList, Position, Boundary, Popover } from '@blueprintjs/core';
import { More } from '@blueprintjs/icons';
import styled from '../utils/styled';
import { mobileStyle } from '../utils/screen';

const Container = styled('div', React.forwardRef)`
  ${mobileStyle(`
    width: auto !important;
  `)}
`;

export const extendToolbar = ({
  type,
  usedItems,
  components,
}: {
  type: string;
  usedItems: Array<string | undefined>;
  components: any;
}): string[] => {
  const extra: string[] = [];
  Object.keys(components).forEach((key) => {
    if (
      key.toLowerCase().indexOf(type) === 0 &&
      key.toLowerCase() !== type
    ) {
      if (components[key]) {
        if (!usedItems.includes(key)) extra.push(key);
      } else {
        console.error(`Raeditor error: Toolbar has invalid React component "${key}"`);
      }
    }
  });
  return usedItems.filter(Boolean).concat(extra) as string[];
};

export const ElementContainer = ({ items, itemRender }: { items: any; itemRender: any }) => {
  const [width, setWidth] = React.useState(0);
  const ref = React.useRef<HTMLDivElement | null>(null);

  const updateWidth = () => {
    if (!ref.current) return;
    const parent = ref.current.parentElement!;
    let siblingsW = 0;
    [...parent.children].forEach((child) => {
      if (child !== ref.current) siblingsW += (child as HTMLElement).offsetWidth;
    });
    setWidth(Math.max(20, parent.offsetWidth - siblingsW - 10));
  };

  React.useLayoutEffect(() => { updateWidth(); });

  React.useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    const parent = el?.parentElement;
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(updateWidth);
      if (el) ro.observe(el);
      if (parent) ro.observe(parent);
      const mo = new MutationObserver(updateWidth);
      if (el) mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
      return () => { ro.disconnect(); mo.disconnect(); };
    } else {
      const id = setInterval(updateWidth, 100);
      return () => clearInterval(id);
    }
  }, []);

  return React.createElement(
    Container,
    { style: { width: width + 'px' }, ref, className: 'bp5-navbar-group bp5-align-left' },
    React.createElement(OverflowList, {
      items,
      style: { width: '100%' },
      visibleItemRenderer: itemRender,
      collapseFrom: Boundary.END,
      overflowRenderer: (overflow: any[]) =>
        React.createElement(
          Popover,
          {
            content: React.createElement('div', { style: { padding: '10px', display: 'flex' } }, overflow.map(itemRender)),
            position: Position.BOTTOM,
          },
          React.createElement(Button, {
            icon: React.createElement(More, null),
            minimal: true,
            style: { marginLeft: '10px' },
            onMouseDownCapture: (e: React.MouseEvent) => { e.preventDefault(); },
          }),
        ),
    }),
  );
};
