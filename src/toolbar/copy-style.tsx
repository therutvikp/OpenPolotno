'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Tooltip } from '@blueprintjs/core';
import { t } from '../utils/l10n';
import { useCopyStyle } from './use-copy-style';

export const PAINT_ICON = React.createElement(
  'span',
  { className: 'bp5-icon' },
  React.createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '3', strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('rect', { width: '16', height: '6', x: '2', y: '2', rx: '2' }),
    React.createElement('path', { d: 'M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2' }),
    React.createElement('rect', { width: '4', height: '6', x: '8', y: '16', rx: '1' }),
  ),
);

export const CopyStyleButton = observer(({ store }: { store: any }) => {
  const { disabled, elementToCopy, setElementToCopy } = useCopyStyle(store);

  return React.createElement(
    Tooltip,
    { content: t('toolbar.copyStyle'), disabled },
    React.createElement(Button, {
      icon: PAINT_ICON,
      active: !!elementToCopy,
      intent: elementToCopy ? 'primary' : 'none',
      minimal: true,
      disabled,
      onClick: () => { setElementToCopy(store.selectedElements[0]); },
      'aria-label': t('toolbar.copyStyle'),
    }),
  );
});
