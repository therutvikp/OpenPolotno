'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Group, Line, Rect, Circle } from 'react-konva';
import { useColor } from './use-color';
import { Portal } from 'react-konva-utils';
import { useAnchorSnap } from './use-transformer-snap';
import { isTouchDevice } from '../utils/screen';
import { StoreType } from '../model/store';
import { LineElementType } from '../model/line-model';

type LineProps = {
  store: StoreType;
  element: LineElementType;
};

export function getMiddlePoints(element: any) {
  const { x, y, width, height, rotation } = element.a;
  const radians = (rotation * Math.PI) / 180;
  const middleLeft = {
    x: x + (height / 2) * Math.cos(radians + Math.PI / 2),
    y: y + (height / 2) * Math.sin(radians + Math.PI / 2),
  };
  return {
    middleLeft,
    middleRight: {
      x: middleLeft.x + width * Math.cos(radians),
      y: middleLeft.y + width * Math.sin(radians),
    },
  };
}

export function getLinePositionFromMiddlePoints(
  middleLeft: any,
  middleRight: any,
  height: any,
) {
  const width = Math.sqrt(
    Math.pow(middleRight.x - middleLeft.x, 2) + Math.pow(middleRight.y - middleLeft.y, 2),
  );
  const angle = Math.atan2(middleRight.y - middleLeft.y, middleRight.x - middleLeft.x);
  const rotation = (180 * angle) / Math.PI;
  return {
    x: middleLeft.x + Math.cos(angle - Math.PI / 2) * height / 2,
    y: middleLeft.y + Math.sin(angle - Math.PI / 2) * height / 2,
    width,
    height,
    rotation,
  };
}

function anchorProps(scale: number, store: any) {
  return {
    offsetX: 5 / scale,
    offsetY: 5 / scale,
    width: 10 / scale,
    height: 10 / scale,
    fill: 'white',
    stroke: 'rgb(0, 161, 255)',
    strokeWidth: 2,
    strokeScaleEnabled: false,
    draggable: true,
    dragDistance: 0,
    onMouseEnter: (e: any) => { e.target.getStage().container().style.cursor = 'crosshair'; },
    onMouseLeave: (e: any) => { e.target.getStage().container().style.cursor = ''; },
    onDragStart: () => { store.history.startTransaction(); },
    onDragEnd: () => { store.history.endTransaction(); },
  };
}

const LineHead = observer(({ element, type }: { element: any; type: string }) => {
  const colorFill = useColor(element, element.a.color, 'fill');
  const colorStroke = useColor(element, element.a.color, 'stroke');
  const headProps = {
    strokeWidth: element.height,
    lineCap: 'round',
    lineJoin: 'round',
    ...colorStroke,
    ...colorFill,
    opacity: element.a.opacity,
    hideInExport: !element.showInExport,
  };
  return React.createElement(
    React.Fragment,
    null,
    type === 'arrow' &&
      React.createElement(Line, { points: [3 * element.height, 2 * -element.height, 0, 0, 3 * element.height, 2 * element.height], ...headProps }),
    type === 'triangle' &&
      React.createElement(Line, { points: [3 * element.height, 2 * -element.height, 0, 0, 3 * element.height, 2 * element.height], closed: true, ...headProps }),
    type === 'bar' &&
      React.createElement(Line, { points: [0, 2 * -element.height, 0, 2 * element.height], closed: true, ...headProps }),
    type === 'square' &&
      React.createElement(Line, { points: [0, 2 * -element.height, 4 * element.height, 2 * -element.height, 4 * element.height, 2 * element.height, 0, 2 * element.height], closed: true, ...headProps }),
    type === 'circle' &&
      React.createElement(Circle, { x: 2 * element.height, y: 0, radius: 2 * element.height, ...headProps }),
  );
});

export const LineElement = observer(({ element, store }: LineProps) => {
  const lineRef = React.useRef<any>(null);
  const anchorLeftRef = React.useRef<any>(null);
  const anchorRightRef = React.useRef<any>(null);

  const isSelectable = element.selectable || (store as any).role === 'admin';
  const isTouch = isTouchDevice();
  const isOnlySelected =
    store.selectedElements.indexOf(element as any) >= 0 && store.selectedElements.length === 1;
  const isSelected = store.selectedShapes.indexOf(element as any) >= 0 && element.selectable;

  const { middleLeft, middleRight } = getMiddlePoints(element);
  useAnchorSnap(anchorLeftRef, [lineRef], [isOnlySelected]);
  useAnchorSnap(anchorRightRef, [lineRef], [isOnlySelected]);

  const strokeColor = useColor(element as any, (element as any).a.color, 'stroke');

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Line, {
      ref: lineRef,
      name: 'element',
      id: element.id,
      x: (element as any).a.x,
      y: (element as any).a.y,
      points: [0, 0, (element as any).a.width, 0],
      offsetY: -(element as any).a.height / 2,
      strokeWidth: (element as any).a.height,
      hitStrokeWidth: Math.max((element as any).a.height, 20),
      dash: (element as any).dash.map((d: number) => d * (element as any).a.height),
      ...strokeColor,
      rotation: (element as any).a.rotation,
      opacity: (element as any).animated('opacity'),
      shadowEnabled: (element as any).shadowEnabled,
      shadowBlur: (element as any).shadowBlur,
      shadowOffsetX: (element as any).shadowOffsetX,
      shadowOffsetY: (element as any).shadowOffsetY,
      shadowColor: (element as any).shadowColor,
      shadowOpacity: (element as any).shadowOpacity,
      listening: isSelectable,
      draggable: isTouch ? (element as any).draggable && isSelected : (element as any).draggable,
      preventDefault: !isTouch || isSelected,
      hideInExport: !element.showInExport,
      onDragMove: (e: any) => { element.set({ x: e.target.x(), y: e.target.y() }); },
      onDragEnd: (e: any) => { element.set({ x: e.target.x(), y: e.target.y() }); },
      onTransform: (e: any) => {
        const scale = e.target.scaleX();
        e.target.scaleX(1);
        e.target.scaleY(1);
        element.set({
          height: element.height * scale,
          width: element.width * scale,
          x: e.target.x(),
          y: e.target.y(),
          rotation: e.target.rotation(),
        });
      },
    }),
    React.createElement(
      Group,
      { x: middleLeft.x, y: middleLeft.y, rotation: element.rotation, hideInExport: !element.showInExport },
      React.createElement(LineHead, { element, type: (element as any).startHead }),
    ),
    React.createElement(
      Group,
      { x: middleRight.x, y: middleRight.y, rotation: element.rotation + 180 },
      React.createElement(LineHead, { element, type: (element as any).endHead }),
    ),
    isOnlySelected &&
      (element as any).resizable &&
      React.createElement(
        Portal,
        { selector: '.page-abs-container', enabled: true },
        React.createElement(
          Group,
          { visible: isOnlySelected },
          React.createElement(Rect, {
            x: middleLeft.x,
            y: middleLeft.y,
            ref: anchorLeftRef,
            name: 'line-anchor',
            ...anchorProps(store.scale, store),
            onDragMove: (e: any) => {
              const pos = getLinePositionFromMiddlePoints(e.target.position(), middleRight, element.height);
              element.set({ x: pos.x, y: pos.y, width: pos.width, rotation: pos.rotation });
            },
          }),
          React.createElement(Rect, {
            x: middleRight.x,
            y: middleRight.y,
            ref: anchorRightRef,
            name: 'line-anchor',
            ...anchorProps(store.scale, store),
            onDragMove: (e: any) => {
              const pos = getLinePositionFromMiddlePoints(middleLeft, e.target.position(), element.height);
              element.set({ x: pos.x, y: pos.y, width: pos.width, rotation: pos.rotation });
            },
          }),
        ),
      ),
  );
}) as ((props: LineProps) => React.JSX.Element) & { displayName: string };

LineElement.displayName = 'LineElement';
