'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Group, Line, Rect } from 'react-konva';
import { StoreType } from '../model/store';
import { PageType } from '../model/page-model';

// path-to-svg is used here but may not exist yet — import lazily
let pathToSVG: any;
try {
  pathToSVG = require('../utils/path-to-svg').pathToSVG;
} catch (_) {}

type DrawingLayerProps = {
  store: StoreType;
  page: PageType;
};

export const DrawingLayer = observer(({ store, page }: DrawingLayerProps) => {
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [points, setPoints] = React.useState<Array<{ x: number; y: number }>>([]);
  const groupRef = React.useRef<any>(null);

  const isDrawMode = (store as any).editorMode === 'draw';
  const { strokeWidth, strokeColor, opacity, brushType } = (store as any).drawingOptions || {};
  const effectiveOpacity = brushType === 'highlighter' ? 0.5 : opacity;

  const onMouseDown = React.useCallback(
    (e: any) => {
      if (!isDrawMode) return;
      setIsDrawing(true);
      const pos = e.target.getRelativePointerPosition();
      if (pos) setPoints([{ x: pos.x, y: pos.y }]);
    },
    [isDrawMode],
  );

  const onMouseMove = React.useCallback(
    (e: any) => {
      if (!isDrawMode || !isDrawing) return;
      const pos = e.target.getRelativePointerPosition();
      if (pos) setPoints((prev) => [...prev, { x: pos.x, y: pos.y }]);
    },
    [isDrawMode, isDrawing],
  );

  const onMouseUp = React.useCallback(() => {
    if (!isDrawMode || !isDrawing) return;
    setIsDrawing(false);

    if (points.length > 1 && pathToSVG) {
      try {
        const result = pathToSVG(points, {
          strokeColor,
          strokeWidth,
          opacity: effectiveOpacity,
          smooth: true,
        });
        store.history.transaction(() => {
          page.addElement({
            type: 'svg',
            x: result.x,
            y: result.y,
            width: result.width,
            height: result.height,
            src: result.src,
          });
        });
      } catch (err) {
        console.error('Error creating path SVG:', err);
      }
    }
    setPoints([]);
  }, [isDrawMode, isDrawing, points, strokeColor, strokeWidth, effectiveOpacity, page, store.history]);

  const flatPoints = React.useMemo(() => points.flatMap((p) => [p.x, p.y]), [points]);

  // Custom cursor
  React.useEffect(() => {
    if (!isDrawMode || !groupRef.current) return;
    const stage = groupRef.current.getStage();
    if (!stage) return;

    const cursorSize = Math.min(2 * strokeWidth, 32);
    const r = cursorSize / 2;
    const cursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}">
          <circle cx="${r}" cy="${r}" r="${r - 1}" fill="${strokeColor}" opacity="${effectiveOpacity}" stroke="white" stroke-width="1"/>
          <circle cx="${r}" cy="${r}" r="${r - 1}" fill="none" stroke="black" stroke-width="1" opacity="0.3"/>
        </svg>`;
    const cursorUrl = `data:image/svg+xml;base64,${btoa(cursorSvg)}`;
    stage.container().style.cursor = `url("${cursorUrl}") ${r} ${r}, crosshair`;

    return () => {
      if (stage.container()) stage.container().style.cursor = '';
    };
  }, [isDrawMode, strokeColor, strokeWidth, effectiveOpacity]);

  if (!isDrawMode) return null;

  return React.createElement(
    Group,
    { ref: groupRef, listening: isDrawMode },
    React.createElement(Rect, {
      x: 0,
      y: 0,
      width: page.computedWidth,
      height: page.computedHeight,
      fill: 'transparent',
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onTouchStart: onMouseDown,
      onTouchMove: onMouseMove,
      onTouchEnd: onMouseUp,
    }),
    points.length > 0 &&
      React.createElement(Line, {
        points: flatPoints,
        stroke: strokeColor,
        strokeWidth,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: effectiveOpacity,
        tension: 0.5,
        listening: false,
      }),
  );
}) as ((props: DrawingLayerProps) => React.JSX.Element) & { displayName: string };

DrawingLayer.displayName = 'DrawingLayer';
