'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Position, Slider, NumericInput, Tooltip } from '@blueprintjs/core';
import { Popover } from '@blueprintjs/core';
// @ts-ignore
import MdOpacity from '@meronex/icons/md/MdOpacity.js';
import { t } from '../utils/l10n';

export const OpacityPicker = observer(({ store }: { store: any }) => {
  const hasShapes = store.selectedShapes.length > 0;
  const setValue = (val: number) => {
    val = Math.max(0, Math.min(val, 100));
    store.selectedShapes.forEach((shape: any) => { shape.set({ opacity: val / 100 }); });
  };
  const value = Math.round(100 * (store.selectedShapes[0]?.opacity ?? 1));

  return React.createElement(
    Popover,
    {
      disabled: !hasShapes,
      minimal: false,
      content: React.createElement(
        'div',
        { style: { padding: '10px 20px' } },
        React.createElement('div', { style: { textAlign: 'center' } }, t('toolbar.transparency')),
        React.createElement(
          'div',
          { style: { display: 'flex' } },
          React.createElement(
            'div',
            { style: { paddingTop: '8px', paddingRight: '20px' } },
            React.createElement(Slider, { value, labelRenderer: false, onChange: setValue, min: 0, max: 100 }),
          ),
          React.createElement(NumericInput, { value, onValueChange: setValue, min: 0, max: 100, buttonPosition: 'none', style: { width: '50px' }, selectAllOnFocus: true }),
        ),
      ),
      position: Position.BOTTOM,
    },
    React.createElement(
      Tooltip,
      { content: t('toolbar.transparency'), disabled: !hasShapes, position: Position.BOTTOM },
      React.createElement(Button, { minimal: true, disabled: !hasShapes, 'aria-label': t('toolbar.transparency') },
        React.createElement(MdOpacity, { className: 'bp5-icon', style: { fontSize: '20px' } }),
      ),
    ),
  );
});
