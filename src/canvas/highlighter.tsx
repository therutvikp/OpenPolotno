'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Rect } from 'react-konva';
import { RectConfig } from 'konva/lib/shapes/Rect';

const highlighterStyle: RectConfig = {
  stroke: 'rgb(0, 161, 255)',
  strokeWidth: 2,
};

export const setHighlighterStyle = (style: RectConfig) => {
  Object.assign(highlighterStyle, style);
};

type SimplifiedElement = {
  a: {
    x: number;
    y: number;
    rotation: number;
    width: number;
    height: number;
  };
};

export const Highlighter = observer(
  ({ element }: { element: SimplifiedElement }) =>
    React.createElement(Rect, {
      name: 'highlighter',
      x: element.a.x,
      y: element.a.y,
      rotation: element.a.rotation,
      width: element.a.width,
      height: element.a.height,
      listening: false,
      strokeScaleEnabled: false,
      ...highlighterStyle,
    }),
) as ((props: { element: SimplifiedElement }) => React.JSX.Element) & { displayName: string };

Highlighter.displayName = 'Highlighter';
