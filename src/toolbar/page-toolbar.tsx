'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, NumericInput, Slider } from '@blueprintjs/core';
import { Popover } from '@blueprintjs/core';
import { ElementContainer, extendToolbar } from './element-container';
import { t } from '../utils/l10n';
import { flags } from '../utils/flags';
import { Time } from '@blueprintjs/icons';
import { ColorPicker } from './color-picker';

const NumberInput = ({ value, onValueChange, ...rest }: any) => {
  const [local, setLocal] = React.useState(value.toString());
  React.useEffect(() => { setLocal(value.toString()); }, [value]);
  return React.createElement(NumericInput, {
    value: local,
    onValueChange: (num: number, str: string) => { setLocal(str); if (!Number.isNaN(num)) onValueChange(num); },
    ...rest,
  });
};

const PageBackground = observer(({ store }: any) => {
  if (!store.activePage) return null;
  return React.createElement(ColorPicker, {
    value: store.activePage.background || 'white',
    onChange: (c: string) => { store.activePage.set({ background: c }); },
    store,
    gradientEnabled: true,
  });
});

const PageDuration = observer(({ store }: any) => {
  if (!store.activePage) return null;
  const { duration } = store.activePage;
  return React.createElement(
    Popover,
    {
      position: 'bottom',
      content: React.createElement(
        'div',
        { style: { padding: '15px', paddingTop: '15px', width: '230px' } },
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '5px', paddingBottom: '5px' } },
          React.createElement('div', null, t('toolbar.duration')),
          React.createElement('div', null,
            React.createElement(NumberInput, {
              value: duration / 1000,
              onValueChange: (v: number) => { store.activePage.set({ duration: 1000 * v }); },
              style: { width: '50px' },
              min: 0,
              buttonPosition: 'none',
            }),
          ),
        ),
        React.createElement(Slider, {
          value: Math.min(duration / 1000, 50),
          onChange: (v: number) => { store.activePage.set({ duration: 1000 * v }); },
          min: 0,
          max: 50,
          showTrackFill: false,
          labelRenderer: false,
        }),
      ),
    },
    React.createElement(Button, { icon: React.createElement(Time, null), minimal: true },
      (store.activePage.duration / 1000).toFixed(1), 's',
    ),
  );
});

const defaultPageComponents: Record<string, any> = {
  PageDuration,
  PageBackground,
};

export const PageToolbar = observer(({ store, components }: any) => {
  const usedItems = ['PageBackground', flags.animationsEnabled && 'PageDuration'].filter(Boolean) as string[];
  const items = extendToolbar({ type: 'page', usedItems, components });
  return React.createElement(ElementContainer, {
    items,
    itemRender: (key: string) => {
      const Component = components[key] || defaultPageComponents[key];
      return React.createElement(Component, { store, key });
    },
  });
});

export default PageToolbar;
