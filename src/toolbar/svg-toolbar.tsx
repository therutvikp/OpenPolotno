'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import * as svgUtils from '../utils/svg';
import { ElementContainer, extendToolbar } from './element-container';
import FiltersPicker from './filters-picker';
import ColorPicker from './color-picker';
import FlipButton from './flip-button';
import { AnimationsPicker } from './animations-picker';
import { flags } from '../utils/flags';

const findColorKey = (map: Map<string, string>, color: string): string | undefined =>
  Array.from(map.keys()).find((k) => svgUtils.sameColors(k, color));

const getReplacedColor = (map: Map<string, string>, color: string): string => {
  const key = findColorKey(map, color);
  return map.get(key || '') || color;
};

const SvgColors = observer(({ element, elements, store }: any) => {
  const colors = svgUtils.useSvgColors(element.src);
  return React.createElement(
    React.Fragment,
    null,
    !element.maskSrc && colors.slice(0, 5).map((color: string) =>
      React.createElement(ColorPicker, {
        key: color,
        value: getReplacedColor(element.colorsReplace, color),
        style: { marginLeft: '5px' },
        onChange: (newColor: string) => {
          const key = findColorKey(element.colorsReplace, color) || color;
          element.replaceColor(key, newColor);
        },
        store,
        gradientEnabled: true,
      }),
    ),
  );
});

const defaultSvgComponents: Record<string, any> = {
  SvgFlip: FlipButton,
  SvgFilters: FiltersPicker,
  SvgColors,
  SvgAnimations: AnimationsPicker,
};

export const SvgToolbar = observer(({ store, hideSvgEffects, components }: any) => {
  const elements = store.selectedElements;
  const usedItems = [
    'SvgFlip',
    !hideSvgEffects && 'SvgFilters',
    'SvgColors',
    flags.animationsEnabled && 'SvgAnimations',
  ].filter(Boolean) as string[];
  const items = extendToolbar({ type: 'svg', usedItems, components });
  return React.createElement(ElementContainer, {
    items,
    itemRender: (key: string) => {
      const Component = components[key] || defaultSvgComponents[key];
      return React.createElement(Component, { elements, element: elements[0], store, key });
    },
  });
});

export default SvgToolbar;
