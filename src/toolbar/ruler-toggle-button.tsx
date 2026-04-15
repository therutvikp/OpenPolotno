'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Tooltip } from '@blueprintjs/core';

// Simple inline SVG ruler icon
const RulerIcon = () =>
  React.createElement(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'currentColor' },
    React.createElement('rect', { x: 1, y: 4, width: 14, height: 8, rx: 1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }),
    React.createElement('line', { x1: 4, y1: 4, x2: 4, y2: 8, stroke: 'currentColor', strokeWidth: 1.2 }),
    React.createElement('line', { x1: 7, y1: 4, x2: 7, y2: 6, stroke: 'currentColor', strokeWidth: 1.2 }),
    React.createElement('line', { x1: 10, y1: 4, x2: 10, y2: 8, stroke: 'currentColor', strokeWidth: 1.2 }),
    React.createElement('line', { x1: 13, y1: 4, x2: 13, y2: 6, stroke: 'currentColor', strokeWidth: 1.2 }),
  );

export const RulerToggleButton = observer(({ store }: { store: any }) => {
  const visible = store.rulesVisible;
  const label = visible ? 'Hide Rulers & Guides' : 'Show Rulers & Guides';

  return React.createElement(
    Tooltip,
    { content: label, position: 'bottom' },
    React.createElement(Button, {
      minimal: true,
      active: visible,
      icon: React.createElement(RulerIcon),
      onClick: () => store.toggleRulers(),
      'aria-label': label,
    }),
  );
});
