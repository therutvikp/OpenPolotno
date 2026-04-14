'use client';

import React from 'react';
import { getTotalClientRect } from '../utils/math';
import { unitToPx } from '../utils/unit';
import { observer } from 'mobx-react-lite';
import { styled } from '../utils/goober';
import { StoreType } from '../model/store';

const RulersContainer = styled('div', React.forwardRef)`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
`;

const XRuler = styled('div', React.forwardRef)`
  height: 14px;
  position: sticky;
  font-size: 8px;
  line-height: 14px;
  top: 0;
  left: 0;
  color: grey;
  border-bottom: 1px solid grey;
  background-color: #e8e8e8;
  overflow: hidden;
`;

const YRuler = styled('div', React.forwardRef)`
  left: 0;
  width: 14px;
  position: sticky;
  font-size: 8px;
  line-height: 14px;
  color: grey;
  border-right: 1px solid grey;
  background-color: #e8e8e8;
  overflow: hidden;
`;

const XTick = styled('div', React.forwardRef)`
  position: absolute;
  border-left: 1px solid grey;
  padding-left: 2px;
`;

const YTick = styled('div', React.forwardRef)`
  position: absolute;
  left: 14px;
  border-left: 1px solid grey;
  padding-left: 2px;
  transform: rotate(90deg);
  transform-origin: left top;
  overflow: hidden;
`;

const RULER_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

type PageProps = {
  store: StoreType;
  xPadding: number;
  yPadding: number;
  width: number;
  height: number;
};

export const TopRules = observer(({ store, width, height }: PageProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  if (!store.activePage) return null;

  const page = store.activePage;
  const pageWidth = (page as any).computedWidth * store.scale;
  const pageHeight = (page as any).computedHeight * store.scale;
  const offsetX = (width - pageWidth) / 2;

  const toPixels = (unitVal: number) =>
    unitToPx({ unitVal, dpi: (store as any).dpi, unit: (store as any).unit }) * store.scale;

  const stepSize =
    RULER_STEPS.find((s) => toPixels(s) > 30) || 10000;

  const stepPx = unitToPx({ unitVal: stepSize, dpi: (store as any).dpi, unit: (store as any).unit }) * store.scale;
  const numXTicks = Math.round(pageWidth / stepPx) + 1;
  const numYTicks = Math.round(pageHeight / stepPx) + 1;

  const selectedRect = getTotalClientRect(store.selectedShapes as any[]);

  const formatLabel = (val: number) =>
    (store as any).unit === 'px' || stepSize >= 1
      ? Math.round(val)
      : val.toFixed(1);

  return React.createElement(
    RulersContainer,
    { ref: containerRef, className: 'raeditor-rulers' },
    React.createElement(
      XRuler,
      { style: { width: width + 'px' }, className: 'raeditor-x-ruler' },
      [...Array(numXTicks)].map((_, i) =>
        React.createElement(
          XTick,
          { key: i, style: { left: offsetX + i * stepPx + 'px', width: stepPx + 'px' } },
          formatLabel(stepSize * i),
        ),
      ),
      !!store.selectedShapes.length &&
        React.createElement('div', {
          style: {
            position: 'absolute',
            left: offsetX + selectedRect.x * store.scale + 'px',
            height: '14px',
            width: selectedRect.width * store.scale,
            backgroundColor: 'rgba(0,0,0,0.15)',
          },
        }),
    ),
    store.pages.map((pg, i) => {
      const pgHeight = (pg as any).computedHeight * store.scale;
      const pgOffsetY = (height - pgHeight) / 2;
      return React.createElement(
        YRuler,
        { key: pg.id, style: { height: height - 14 + 'px' }, className: 'raeditor-y-ruler' },
        [...Array(numYTicks)].map((_, j) =>
          React.createElement(
            YTick,
            { key: j, style: { top: pgOffsetY + j * stepPx - 14 + 'px', width: stepPx + 'px' } },
            formatLabel(stepSize * j),
          ),
        ),
        (store.selectedShapes[0] as any)?.page === pg &&
          React.createElement('div', {
            style: {
              position: 'absolute',
              top: pgOffsetY + selectedRect.y * store.scale - 14 + 'px',
              width: '14px',
              height: selectedRect.height * store.scale,
              backgroundColor: 'rgba(0,0,0,0.15)',
            },
          }),
      );
    }),
  );
}) as ((props: PageProps) => React.JSX.Element) & { displayName: string };

TopRules.displayName = 'TopRules';

export function LeftRules(): React.JSX.Element {
  return React.createElement('div', null, React.createElement('h1', null, 'Top rules'));
}
