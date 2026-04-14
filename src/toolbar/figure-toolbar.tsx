'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Position, Slider } from '@blueprintjs/core';
import { Disable } from '@blueprintjs/icons';
import { Popover } from '@blueprintjs/core';
// @ts-ignore
import ZoStrokeWidth from '@meronex/icons/zo/ZoStrokeWidth.js';
import ColorPicker from './color-picker';
import { AnimationsPicker } from './animations-picker';
import { NumberInput, FiltersPicker } from './filters-picker';
import { ElementContainer, extendToolbar } from './element-container';
import { t } from '../utils/l10n';
import { flags } from '../utils/flags';

export const FigureFill = observer(({ elements, store }: any) =>
  React.createElement(ColorPicker, {
    value: elements[0].fill,
    style: { marginRight: '5px' },
    gradientEnabled: true,
    onChange: (c: string) => store.history.transaction(() => { elements.forEach((el: any) => { el.set({ fill: c }); }); }),
    store,
  }),
);

export const FigureSettings = observer(({ store, elements, element }: any) => {
  const setAll = (props: any) => { store.history.transaction(() => { elements.forEach((el: any) => { el.set(props); }); }); };
  const first = elements[0];

  return React.createElement(
    Popover,
    {
      content: React.createElement(
        'div',
        { style: { padding: '15px', paddingTop: '15px', width: '270px' } },
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '15px' } },
          React.createElement(Button, { onClick: () => setAll({ strokeWidth: 0 }), active: first.strokeWidth === 0, style: { width: '44px', height: '34px' }, icon: React.createElement(Disable, { size: 20 } as any) }),
          React.createElement(Button, { onClick: () => setAll({ dash: [], strokeWidth: first.strokeWidth || 10 }), active: first.strokeWidth && first.dash.length === 0 },
            React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' },
              React.createElement('line', { x2: '24', y1: '50%', y2: '50%', stroke: 'currentColor', strokeWidth: '2' }),
            ),
          ),
          React.createElement(Button, { onClick: () => setAll({ dash: [4, 1], strokeWidth: first.strokeWidth || 10 }), active: first.strokeWidth && first.dash[0] === 4 },
            React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' },
              React.createElement('line', { x1: '-1', x2: '25', y1: '50%', y2: '50%', stroke: 'currentColor', strokeDasharray: '12 2', strokeWidth: '2' }),
            ),
          ),
          React.createElement(Button, { onClick: () => setAll({ dash: [2, 1], strokeWidth: first.strokeWidth || 10 }), active: first.strokeWidth && first.dash[0] === 2 },
            React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' },
              React.createElement('line', { x1: '1', x2: '23', y1: '50%', y2: '50%', stroke: 'currentColor', strokeDasharray: '6 2', strokeWidth: '2' }),
            ),
          ),
          React.createElement(Button, { onClick: () => setAll({ dash: [1, 1], strokeWidth: first.strokeWidth || 10 }), active: first.strokeWidth && first.dash[0] === 1 },
            React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' },
              React.createElement('line', { x1: '1', x2: '23', y1: '50%', y2: '50%', stroke: 'currentColor', strokeDasharray: '2 2', strokeWidth: '2' }),
            ),
          ),
        ),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '5px' } },
          React.createElement('div', null, t('toolbar.strokeWidth')),
          React.createElement('div', null,
            React.createElement(NumberInput, { value: first.strokeWidth, onValueChange: (v: number) => setAll({ strokeWidth: v }), style: { width: '50px' }, min: 0, max: Math.round(Math.min(element.width, element.height) / 2), buttonPosition: 'none' }),
          ),
        ),
        React.createElement(Slider, { value: first.strokeWidth, onChange: (v: number) => setAll({ strokeWidth: v }), min: 0, max: Math.round(Math.min(element.width, element.height) / 2), labelRenderer: false }),
        element.subType === 'rect' && React.createElement(
          React.Fragment,
          null,
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '15px', paddingBottom: '5px' } },
            React.createElement('div', null, t('toolbar.cornerRadius')),
            React.createElement('div', null,
              React.createElement(NumberInput, { value: first.cornerRadius, onValueChange: (v: number) => setAll({ cornerRadius: v }), style: { width: '50px' }, min: 0, max: Math.round(Math.max(element.width, element.height) / 2), buttonPosition: 'none' }),
            ),
          ),
          React.createElement(Slider, { value: first.cornerRadius, onChange: (v: number) => setAll({ cornerRadius: v }), min: 0, max: Math.round(Math.max(element.width, element.height) / 2), labelRenderer: false }),
        ),
      ),
      position: Position.BOTTOM,
    },
    React.createElement(Button, { icon: React.createElement(ZoStrokeWidth, null), minimal: true, 'aria-label': 'Stroke and corner settings' }),
  );
});

export const FigureStroke = observer(({ elements, store }: any) => {
  if (!elements.find((el: any) => el.strokeWidth)) return null;
  return React.createElement(ColorPicker, {
    value: elements[0].stroke,
    style: { marginRight: '5px' },
    gradientEnabled: false,
    onChange: (c: string) => store.history.transaction(() => { elements.forEach((el: any) => { el.set({ stroke: c }); }); }),
    store,
  });
});

const defaultFigureComponents: Record<string, any> = {
  FigureFill,
  FigureStroke,
  FigureSettings,
  FigureAnimations: AnimationsPicker,
  FigureFilters: FiltersPicker,
};

export const FigureToolbar = observer(({ store, components }: any) => {
  const element = store.selectedElements[0];
  const usedItems = ['FigureFill', 'FigureStroke', 'FigureSettings', 'FigureFilters', flags.animationsEnabled && 'FigureAnimations'].filter(Boolean) as string[];
  const items = extendToolbar({ type: 'figure', usedItems, components });
  return React.createElement(ElementContainer, {
    items,
    itemRender: (key: string) => {
      const Component = components[key] || defaultFigureComponents[key];
      return React.createElement(Component, { element, store, key, elements: store.selectedElements });
    },
  });
});

export default FigureToolbar;
