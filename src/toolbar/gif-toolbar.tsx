'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { ElementContainer, extendToolbar } from './element-container';
import FiltersPicker from './filters-picker';
import { AnimationsPicker } from './animations-picker';
import { flags } from '../utils/flags';

const defaultGifComponents: Record<string, any> = {
  GifFilters: FiltersPicker,
  GifAnimations: AnimationsPicker,
};

export const GifToolbar = observer(({ store, components }: any) => {
  const elements = store.selectedElements;
  const usedItems = ['GifFilters', flags.animationsEnabled && 'GifAnimations'].filter(Boolean) as string[];
  const items = extendToolbar({ type: 'gif', usedItems, components });
  return React.createElement(ElementContainer, {
    items,
    itemRender: (key: string) => {
      const Component = components[key] || defaultGifComponents[key];
      return React.createElement(Component, { elements, element: elements[0], store, key });
    },
  });
});

export default GifToolbar;
