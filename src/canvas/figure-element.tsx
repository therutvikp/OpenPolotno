'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Group, Rect, Path } from 'react-konva';
import { subTypeToPathDataFunc } from '../utils/figure-to-svg';
import { isTouchDevice } from '../utils/screen';
import { useColor } from './use-color';
import { StoreType } from '../model/store';
import { FigureElementType } from '../model/figure-model';

type FigureProps = {
  store: StoreType;
  element: FigureElementType;
};

// Cache of subtype -> shape component
const shapeComponentCache: Record<string, React.ComponentType<any>> = {};

function getShapeComponent(subType: string): React.ComponentType<any> {
  if (shapeComponentCache[subType]) return shapeComponentCache[subType];

  const pathFunc = subTypeToPathDataFunc(subType);

  const ShapeComponent = observer(
    ({ element, fillProps, strokeProps }: { element: any; fillProps: any; strokeProps: any }) => {
      let pathData = pathFunc({ width: element.a.width, height: element.a.height, cornerRadius: element.cornerRadius });
      let scaleX = 1;
      let scaleY = 1;

      if (typeof pathData !== 'string') {
        scaleX = pathData.scaleX;
        scaleY = pathData.scaleY;
        pathData = pathData.path;
      }

      const pathRef = React.useRef<any>(null);

      return React.createElement(
        React.Fragment,
        null,
        React.createElement(Rect, { width: element.width, height: element.height, fill: 'transparent' }),
        React.createElement(Path, { ...fillProps, ref: pathRef, data: pathData, scaleX, scaleY }),
        React.createElement(
          Group,
          {
            clipFunc: (ctx: any) => {
              const pathNode = pathRef.current;
              if (!pathNode) return;
              const dataArray = pathNode.dataArray;
              ctx.beginPath();
              for (const segment of dataArray) {
                const { command: cmd, points: pts } = segment;
                switch (cmd) {
                  case 'L': ctx.lineTo(pts[0], pts[1]); break;
                  case 'M': ctx.moveTo(pts[0], pts[1]); break;
                  case 'C': ctx.bezierCurveTo(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]); break;
                  case 'Q': ctx.quadraticCurveTo(pts[0], pts[1], pts[2], pts[3]); break;
                  case 'A': {
                    const [cx, cy, rx, ry, startAngle, deltaAngle, ccw, rotation] = pts;
                    const scale = rx > ry ? rx : ry;
                    const sx = rx > ry ? 1 : rx / ry;
                    const sy = rx > ry ? ry / rx : 1;
                    ctx.translate(cx, cy);
                    ctx.rotate(rotation);
                    ctx.scale(sx, sy);
                    ctx.arc(0, 0, scale, startAngle, startAngle + deltaAngle, 1 - ccw);
                    ctx.scale(1 / sx, 1 / sy);
                    ctx.rotate(-rotation);
                    ctx.translate(-cx, -cy);
                    break;
                  }
                  case 'z': ctx.closePath(); break;
                }
              }
            },
            scaleX,
            scaleY,
          },
          React.createElement(Path, {
            ...strokeProps,
            x: 0,
            y: 0,
            data: pathData,
            strokeWidth: 2 * strokeProps.strokeWidth,
            dash: strokeProps.dash.map((d: number) => d),
          }),
        ),
      );
    },
  );

  shapeComponentCache[subType] = ShapeComponent;
  return ShapeComponent;
}

export const FigureElement = observer(({ element, store }: FigureProps) => {
  const isSelectable = element.selectable || (store as any).role === 'admin';
  const isTouch = isTouchDevice();
  const isSelected = store.selectedShapes.indexOf(element as any) >= 0 && element.selectable;

  const strokeWidth = Math.min((element as any).strokeWidth, element.width / 2, element.height / 2);
  const cornerRadius = Math.max(0, Math.min(element.width / 2, element.height / 2, (element as any).cornerRadius));

  const fillProps = {
    ...useColor(element as any, (element as any).a.fill, 'fill'),
    width: (element as any).a.width,
    height: (element as any).a.height,
    cornerRadius,
    opacity: (element as any).animated('opacity'),
    shadowEnabled: (element as any).shadowEnabled,
    shadowBlur: (element as any).shadowBlur,
    shadowOffsetX: (element as any).shadowOffsetX,
    shadowOffsetY: (element as any).shadowOffsetY,
    shadowColor: (element as any).shadowColor,
    shadowOpacity: (element as any).shadowOpacity,
    preventDefault: !isTouch || isSelected,
    hideInExport: !element.showInExport,
  };

  const strokeColorProps = useColor(element as any, (element as any).stroke, 'stroke');
  const strokeProps = {
    ...strokeColorProps,
    visible: strokeWidth > 0,
    x: strokeWidth / 2,
    y: strokeWidth / 2,
    width: (element as any).a.width - strokeWidth,
    height: (element as any).a.height - strokeWidth,
    strokeWidth,
    cornerRadius: Math.max(0, cornerRadius - strokeWidth),
    dash: (element as any).dash.map((d: number) => d * strokeWidth),
    opacity: (element as any).animated('opacity'),
    hideInExport: !element.showInExport,
    listening: false,
  };

  const ShapeComp = getShapeComponent((element as any).subType);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Group,
      {
        id: element.id,
        x: (element as any).a.x,
        y: (element as any).a.y,
        rotation: (element as any).a.rotation,
        opacity: (element as any).a.opacity,
        listening: isSelectable,
        draggable: isTouch ? (element as any).draggable && isSelected : (element as any).draggable,
        name: 'element',
        onDragMove: (e: any) => { element.set({ x: e.target.x(), y: e.target.y() }); },
        onDragEnd: (e: any) => { element.set({ x: e.target.x(), y: e.target.y() }); },
        onTransform: (e: any) => {
          const scale = e.target.scale();
          e.target.scaleX(1);
          e.target.scaleY(1);
          element.set({
            width: element.width * scale.x,
            height: element.height * scale.y,
            x: e.target.x(),
            y: e.target.y(),
            rotation: e.target.rotation(),
          });
        },
      },
      React.createElement(ShapeComp, { element, fillProps, strokeProps }),
    ),
  );
}) as ((props: FigureProps) => React.JSX.Element) & { displayName: string };

FigureElement.displayName = 'FigureElement';
