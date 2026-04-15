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
  pointer-events: auto;
  cursor: row-resize;
  user-select: none;
  z-index: 10;
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
  pointer-events: auto;
  cursor: col-resize;
  user-select: none;
  z-index: 10;
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

const HGuideLine = styled('div', React.forwardRef)`
  position: absolute;
  left: 0;
  width: 100%;
  height: 1px;
  background: rgba(0, 120, 255, 0.75);
  pointer-events: auto;
  cursor: row-resize;
  z-index: 5;
`;

const VGuideLine = styled('div', React.forwardRef)`
  position: absolute;
  top: 0;
  height: 100%;
  width: 1px;
  background: rgba(0, 120, 255, 0.75);
  pointer-events: auto;
  cursor: col-resize;
  z-index: 5;
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
  const [previewGuide, setPreviewGuide] = React.useState<{
    orientation: 'H' | 'V';
    screenPos: number;
  } | null>(null);

  if (!store.activePage) return null;

  const page = store.activePage;
  const pageWidth = (page as any).computedWidth * store.scale;
  const pageHeight = (page as any).computedHeight * store.scale;
  const offsetX = (width - pageWidth) / 2;
  const pgOffsetY = (height - pageHeight) / 2;

  const toPixels = (unitVal: number) =>
    unitToPx({ unitVal, dpi: (store as any).dpi, unit: (store as any).unit }) * store.scale;

  const stepSize = RULER_STEPS.find((s) => toPixels(s) > 30) || 10000;
  const stepPx = unitToPx({ unitVal: stepSize, dpi: (store as any).dpi, unit: (store as any).unit }) * store.scale;
  const numXTicks = Math.round(pageWidth / stepPx) + 1;
  const numYTicks = Math.round(pageHeight / stepPx) + 1;

  const selectedRect = getTotalClientRect(store.selectedShapes as any[]);
  const formatLabel = (val: number) =>
    (store as any).unit === 'px' || stepSize >= 1 ? Math.round(val) : val.toFixed(1);

  const getContainerRect = () => containerRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 };

  // Drag from X ruler → horizontal guide
  const handleXRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setPreviewGuide({ orientation: 'H', screenPos: e.clientY });

    const onMove = (ev: MouseEvent) => {
      setPreviewGuide({ orientation: 'H', screenPos: ev.clientY });
    };
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const { top } = getContainerRect();
      const mouseYInContainer = ev.clientY - top;
      const pageY = (mouseYInContainer - pgOffsetY) / store.scale;
      if (pageY >= 0 && pageY <= (page as any).computedHeight) {
        (store as any).addGuide(pageY, 'H');
      }
      setPreviewGuide(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Drag from Y ruler → vertical guide
  const handleYRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setPreviewGuide({ orientation: 'V', screenPos: e.clientX });

    const onMove = (ev: MouseEvent) => {
      setPreviewGuide({ orientation: 'V', screenPos: ev.clientX });
    };
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const { left } = getContainerRect();
      const mouseXInContainer = ev.clientX - left;
      const pageX = (mouseXInContainer - offsetX) / store.scale;
      if (pageX >= 0 && pageX <= (page as any).computedWidth) {
        (store as any).addGuide(pageX, 'V');
      }
      setPreviewGuide(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Drag existing guide to reposition; drag outside canvas to delete
  const handleGuideMouseDown = (e: React.MouseEvent, guideId: string, orientation: 'H' | 'V') => {
    e.preventDefault();
    e.stopPropagation();

    const onMove = (ev: MouseEvent) => {
      const { top, left } = getContainerRect();
      if (orientation === 'H') {
        const pageY = (ev.clientY - top - pgOffsetY) / store.scale;
        (store as any).updateGuidePosition(guideId, Math.max(0, Math.min(pageY, (page as any).computedHeight)));
      } else {
        const pageX = (ev.clientX - left - offsetX) / store.scale;
        (store as any).updateGuidePosition(guideId, Math.max(0, Math.min(pageX, (page as any).computedWidth)));
      }
    };
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      // Remove guide if dragged back onto the ruler
      const { top, left } = getContainerRect();
      if (orientation === 'H') {
        const mouseYInContainer = ev.clientY - top;
        if (mouseYInContainer < 14) (store as any).removeGuide(guideId);
      } else {
        const mouseXInContainer = ev.clientX - left;
        if (mouseXInContainer < 14) (store as any).removeGuide(guideId);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Preview line screen position relative to the container
  const previewScreenPos = previewGuide
    ? (() => {
        const rect = getContainerRect();
        return previewGuide.orientation === 'H'
          ? previewGuide.screenPos - rect.top
          : previewGuide.screenPos - rect.left;
      })()
    : 0;

  const guides: any[] = (store as any).guides || [];

  const children: React.ReactNode[] = [
    // Existing guide lines
    ...guides.map((guide: any) =>
      guide.orientation === 'H'
        ? React.createElement(HGuideLine, {
            key: guide.id,
            style: { top: pgOffsetY + guide.position * store.scale + 'px' },
            onMouseDown: (e: React.MouseEvent) => handleGuideMouseDown(e, guide.id, 'H'),
            onDoubleClick: () => (store as any).removeGuide(guide.id),
            title: 'Drag to move • Double-click to remove',
          })
        : React.createElement(VGuideLine, {
            key: guide.id,
            style: { left: offsetX + guide.position * store.scale + 'px' },
            onMouseDown: (e: React.MouseEvent) => handleGuideMouseDown(e, guide.id, 'V'),
            onDoubleClick: () => (store as any).removeGuide(guide.id),
            title: 'Drag to move • Double-click to remove',
          }),
    ),
    // Preview guide while dragging from a ruler
    previewGuide
      ? React.createElement(
          previewGuide.orientation === 'H' ? HGuideLine : VGuideLine,
          {
            key: '__preview__',
            style: {
              [previewGuide.orientation === 'H' ? 'top' : 'left']: previewScreenPos + 'px',
              opacity: 0.45,
              pointerEvents: 'none' as React.CSSProperties['pointerEvents'],
            },
          },
        )
      : null,
    // X Ruler
    React.createElement(
      XRuler,
      {
        style: { width: width + 'px' },
        className: 'raeditor-x-ruler',
        onMouseDown: handleXRulerMouseDown,
      },
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
    // Y Rulers (one per page)
    ...store.pages.map((pg) => {
      const pgH = (pg as any).computedHeight * store.scale;
      const pgOY = (height - pgH) / 2;
      return React.createElement(
        YRuler,
        {
          key: pg.id,
          style: { height: height - 14 + 'px' },
          className: 'raeditor-y-ruler',
          onMouseDown: handleYRulerMouseDown,
        },
        [...Array(numYTicks)].map((_, j) =>
          React.createElement(
            YTick,
            { key: j, style: { top: pgOY + j * stepPx - 14 + 'px', width: stepPx + 'px' } },
            formatLabel(stepSize * j),
          ),
        ),
        (store.selectedShapes[0] as any)?.page === pg &&
          React.createElement('div', {
            style: {
              position: 'absolute',
              top: pgOY + selectedRect.y * store.scale - 14 + 'px',
              width: '14px',
              height: selectedRect.height * store.scale,
              backgroundColor: 'rgba(0,0,0,0.15)',
            },
          }),
      );
    }),
  ];

  return React.createElement(
    RulersContainer,
    { ref: containerRef, className: 'raeditor-rulers' },
    ...children,
  );
}) as ((props: PageProps) => React.JSX.Element) & { displayName: string };

TopRules.displayName = 'TopRules';

export function LeftRules(): React.JSX.Element {
  return React.createElement('div', null, React.createElement('h1', null, 'Top rules'));
}
