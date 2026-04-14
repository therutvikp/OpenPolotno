'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Position, Slider } from '@blueprintjs/core';
import { Popover } from '@blueprintjs/core';
import { Settings } from '@blueprintjs/icons';
import ColorPicker from './color-picker';
import { AnimationsPicker } from './animations-picker';
import { NumberInput } from './filters-picker';
import { ElementContainer, extendToolbar } from './element-container';
import { getMiddlePoints, getLinePositionFromMiddlePoints } from '../canvas/line-element';
import { t } from '../utils/l10n';
import { flags } from '../utils/flags';

export const LineSettings = observer(({ store, elements }: any) => {
  const setAll = (props: any) => { store.history.transaction(() => { elements.forEach((el: any) => { el.set(props); }); }); };
  const setHeight = (height: number) => {
    store.history.transaction(() => {
      elements.forEach((el: any) => {
        const { middleLeft, middleRight } = getMiddlePoints(el);
        const { x, y, rotation } = getLinePositionFromMiddlePoints(middleLeft, middleRight, height);
        el.set({ x, y, rotation, height });
      });
    });
  };

  const first = elements[0];

  return React.createElement(
    Popover,
    {
      content: React.createElement(
        'div',
        { style: { padding: '15px', paddingTop: '15px', width: '230px' } },
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '5px' } },
          React.createElement('div', null, t('toolbar.lineSize')),
          React.createElement('div', null,
            React.createElement(NumberInput, { value: first.height, onValueChange: setHeight, style: { width: '50px' }, min: 1, max: 100, buttonPosition: 'none' }),
          ),
        ),
        React.createElement(Slider, { value: first.height, onChange: setHeight, min: 1, max: 100, labelRenderer: false }),
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '5px', paddingTop: '15px' } },
          React.createElement(Button, { onClick: () => setAll({ dash: [] }), active: first.dash.length === 0 },
            React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' },
              React.createElement('line', { x2: '24', y1: '50%', y2: '50%', stroke: 'currentColor', strokeWidth: '2' }),
            ),
          ),
          React.createElement(Button, { onClick: () => setAll({ dash: [4, 1] }), active: first.dash[0] === 4 },
            React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' },
              React.createElement('line', { x1: '-1', x2: '25', y1: '50%', y2: '50%', stroke: 'currentColor', strokeDasharray: '12 2', strokeWidth: '2' }),
            ),
          ),
          React.createElement(Button, { onClick: () => setAll({ dash: [2, 1] }), active: first.dash[0] === 2 },
            React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' },
              React.createElement('line', { x1: '1', x2: '23', y1: '50%', y2: '50%', stroke: 'currentColor', strokeDasharray: '6 2', strokeWidth: '2' }),
            ),
          ),
          React.createElement(Button, { onClick: () => setAll({ dash: [1, 1] }), active: first.dash[0] === 1 },
            React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' },
              React.createElement('line', { x1: '1', x2: '23', y1: '50%', y2: '50%', stroke: 'currentColor', strokeDasharray: '2 2', strokeWidth: '2' }),
            ),
          ),
        ),
      ),
      position: Position.BOTTOM,
    },
    React.createElement(Button, { icon: React.createElement(Settings, null), minimal: true, 'aria-label': 'Line style' }),
  );
});

export const LineColor = observer(({ elements, store }: any) =>
  React.createElement(ColorPicker, {
    value: elements[0].color,
    style: { marginRight: '5px' },
    gradientEnabled: false,
    onChange: (c: string) => store.history.transaction(() => { elements.forEach((el: any) => { el.set({ color: c }); }); }),
    store,
  }),
);

const HEAD_ICONS: Record<string, any> = {
  '': React.createElement('span', { 'aria-hidden': 'true', className: 'bp5-icon' },
    React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16 },
      React.createElement('path', { stroke: 'currentColor', strokeWidth: '2', d: 'M 1 8 L 16 8' }),
    ),
  ),
  arrow: React.createElement('span', { 'aria-hidden': 'true', className: 'bp5-icon' },
    React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16 },
      React.createElement('path', { stroke: 'currentColor', strokeWidth: '2', d: 'M 8 3 L 1 8 L 8 13', fill: 'none', strokeLinejoin: 'round', strokeLinecap: 'round' }),
      React.createElement('path', { stroke: 'currentColor', strokeWidth: '2', d: 'M 1 8 L 15 8', strokeLinejoin: 'round', strokeLinecap: 'round' }),
    ),
  ),
  triangle: React.createElement('span', { 'aria-hidden': 'true', className: 'bp5-icon' },
    React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16 },
      React.createElement('path', { stroke: 'currentColor', strokeWidth: '2', d: 'M 8 3 L 1 8 L 8 13 Z', fill: 'currentColor', strokeLinejoin: 'round', strokeLinecap: 'round' }),
      React.createElement('path', { stroke: 'currentColor', strokeWidth: '2', d: 'M 1 8 L 15 8', strokeLinejoin: 'round', strokeLinecap: 'round' }),
    ),
  ),
  bar: React.createElement('span', { 'aria-hidden': 'true', className: 'bp5-icon' },
    React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16 },
      React.createElement('path', { stroke: 'currentColor', strokeWidth: '2', d: 'M 1 3 L 1 13', strokeLinejoin: 'round', strokeLinecap: 'round' }),
      React.createElement('path', { stroke: 'currentColor', strokeWidth: '2', d: 'M 1 8 L 15 8', strokeLinejoin: 'round', strokeLinecap: 'round' }),
    ),
  ),
  square: React.createElement('span', { 'aria-hidden': 'true', className: 'bp5-icon' },
    React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16 },
      React.createElement('path', { stroke: 'currentColor', strokeWidth: '2', d: 'M 1 4 L 9 4 L 9 12 L 1 12 Z', fill: 'currentColor', strokeLinejoin: 'round', strokeLinecap: 'round' }),
      React.createElement('path', { stroke: 'currentColor', strokeWidth: '2', d: 'M 1 8 L 15 8', strokeLinejoin: 'round', strokeLinecap: 'round' }),
    ),
  ),
  circle: React.createElement('span', { 'aria-hidden': 'true', className: 'bp5-icon' },
    React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16 },
      React.createElement('circle', { cx: 4, cy: 8, r: 4, fill: 'currentColor' }),
      React.createElement('path', { stroke: 'currentColor', strokeWidth: '2', d: 'M 1 8 L 15 8', strokeLinejoin: 'round', strokeLinecap: 'round' }),
    ),
  ),
};

const HeadButton = ({ type, active, onClick, flipped }: any) => {
  const icon = HEAD_ICONS[type];
  return React.createElement(Button, {
    icon: flipped ? React.createElement('span', { style: { transform: 'scaleX(-1)' } }, icon) : icon,
    minimal: true,
    onClick,
    active,
  });
};

export const BasicHead = observer(({ elements, store, property }: any) => {
  const isEnd = property === 'endHead';
  const currentIcon = HEAD_ICONS[elements[0][property]];
  const displayIcon = isEnd ? React.createElement('span', { style: { transform: 'scaleX(-1)' } }, currentIcon) : currentIcon;
  const setHead = (val: string) => { store.history.transaction(() => { elements.forEach((el: any) => { el.set({ [property]: val }); }); }); };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Popover,
      {
        content: React.createElement(
          'div',
          { style: { width: '150px', padding: '10px' } },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            ['', 'arrow', 'triangle'].map((type) =>
              React.createElement(HeadButton, { key: type, type, active: elements[0][property] === type, onClick: () => setHead(type), flipped: isEnd }),
            ),
          ),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            ['bar', 'square', 'circle'].map((type) =>
              React.createElement(HeadButton, { key: type, type, active: elements[0][property] === type, onClick: () => setHead(type), flipped: isEnd }),
            ),
          ),
        ),
        position: Position.BOTTOM,
      },
      React.createElement(Button, { icon: displayIcon, minimal: true, 'aria-label': `Line ${property === 'startHead' ? 'start' : 'end'} head` }),
    ),
  );
});

export const LineHeads = observer(({ elements, store }: any) =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement(BasicHead, { elements, store, property: 'startHead' }),
    React.createElement(BasicHead, { elements, store, property: 'endHead' }),
  ),
);

const defaultLineComponents: Record<string, any> = {
  LineSettings,
  LineColor,
  LineHeads,
  LineAnimations: AnimationsPicker,
};

export const LineToolbar = observer(({ store, components }: any) => {
  const element = store.selectedElements[0];
  const usedItems = ['LineColor', 'LineSettings', 'LineHeads', flags.animationsEnabled && 'LineAnimations'].filter(Boolean) as string[];
  const items = extendToolbar({ type: 'line', usedItems, components });
  return React.createElement(ElementContainer, {
    items,
    itemRender: (key: string) => {
      const Component = components[key] || defaultLineComponents[key];
      return React.createElement(Component, { element, store, key, elements: store.selectedElements });
    },
  });
});

export default LineToolbar;
