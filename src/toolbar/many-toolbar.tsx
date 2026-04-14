'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { ElementContainer, extendToolbar } from './element-container';
import { AnimationsPicker } from './animations-picker';
import { flags } from '../utils/flags';

const defaultManyComponents: Record<string, any> = {
  ManyAnimations: AnimationsPicker,
};

export const ManyToolbar = observer(({ store, components }: any) => {
  const elements = store.selectedElements;
  const usedItems = [flags.animationsEnabled && 'ManyAnimations'].filter(Boolean) as string[];
  const items = extendToolbar({ type: 'many', usedItems, components });
  return React.createElement(ElementContainer, {
    items,
    itemRender: (key: string) => {
      const Component = components[key] || defaultManyComponents[key];
      return React.createElement(Component, { elements, element: elements[0], store, key });
    },
  });
});

export default ManyToolbar;
