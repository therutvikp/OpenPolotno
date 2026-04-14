'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Html } from 'react-konva-utils';
import { Navbar, NavbarGroup } from '@blueprintjs/core';
import { getTotalClientRect } from '../utils/math';
import { extendToolbar } from '../toolbar/element-container';
import { StoreType } from '../model/store';
import { PageType } from '../model/page-model';

// Lazy imports for toolbar components to avoid circular deps
let TextAiWrite: any = () => null;
let DuplicateButton: any = () => null;
let RemoveButton: any = () => null;
let PositionPicker: any = () => null;
let GroupButton: any = () => null;

try {
  import('../toolbar/text-ai-write').then((m) => { TextAiWrite = m.TextAiWrite; });
  import('../toolbar/duplicate-button').then((m) => { DuplicateButton = m.DuplicateButton; });
  import('../toolbar/remove-button').then((m) => { RemoveButton = m.RemoveButton; });
  import('../toolbar/position-picker').then((m) => { PositionPicker = m.PositionPicker; });
  import('../toolbar/group-button').then((m) => { GroupButton = m.GroupButton; });
} catch (_) {}

const LockPlaceholder = () => null;

function findAncestorWithClass(el: HTMLElement | null, className: string): HTMLElement | null {
  if (!el) return null;
  if (el.classList.contains(className)) return el;
  return findAncestorWithClass(el.parentElement, className);
}

export const Tooltip = observer(({
  store,
  page,
  components,
  stageRef,
}: {
  store: StoreType;
  page: PageType;
  components?: any;
  stageRef?: any;
}) => {
  const allOnCurrentPage = (store as any).selectedShapes.every((el: any) => el.page === page);
  const tooltipRef = React.useRef<HTMLDivElement | null>(null);
  const [isTransforming, setIsTransforming] = React.useState(false);
  const hasCroppedImages = (store as any)._hasCroppedImages;

  // Track drag/transform state
  (store as any).selectedElements.length; // observe
  React.useEffect(() => {
    const stage = stageRef?.current;
    if (!stage) return;
    const onStart = () => setIsTransforming(true);
    const onEnd = () => setIsTransforming(false);
    stage.on('dragstart', onStart);
    stage.on('dragend', onEnd);
    const transformer = stage.findOne('Transformer');
    transformer?.on('transformstart', onStart);
    transformer?.on('transformend', onEnd);
    return () => {
      stage.off('dragstart', onStart);
      stage.off('dragend', onEnd);
      transformer?.off('transformstart', onStart);
      transformer?.off('transformend', onEnd);
    };
  }, []);

  // Fit/position state
  const [position, setPosition] = React.useState({ fit: true, needCalculate: false, token: Math.random() });

  function checkFit() {
    if (!tooltipRef.current) return;
    if (!position.needCalculate) return;
    const container = findAncestorWithClass(tooltipRef.current, 'raeditor-workspace-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const top = tooltipRect.top - containerRect.top;
    const bottom = tooltipRect.bottom - containerRect.top;
    if (top < 20 && position.fit) {
      setPosition({ fit: false, needCalculate: false, token: position.token });
    } else if (bottom - containerRect.height > -20 && !position.fit) {
      setPosition({ fit: true, needCalculate: false, token: position.token });
    } else {
      setPosition({ fit: position.fit, needCalculate: false, token: position.token });
    }
  }

  React.useEffect(() => {
    if ((store as any).selectedElements.length !== 0) {
      setPosition({ fit: true, needCalculate: true, token: Math.random() });
    }
  }, [(store as any).selectedElements, isTransforming]);

  React.useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => { checkFit(); });
    return () => cancelAnimationFrame(raf);
  }, [position.needCalculate, tooltipRef.current, position.token]);

  // Scroll listener
  React.useEffect(() => {
    if (!stageRef?.current) return;
    const inner = findAncestorWithClass(stageRef.current.content, 'raeditor-workspace-inner');
    if (!inner) return;
    const onScroll = () => {
      if ((store as any).selectedElements.length) {
        setPosition({ fit: true, needCalculate: true, token: Math.random() });
      }
    };
    inner.addEventListener('scroll', onScroll);
    return () => inner.removeEventListener('scroll', onScroll);
  }, []);

  if ((store as any).selectedShapes.length === 0) return null;
  if (isTransforming) return null;
  if (!allOnCurrentPage) return null;
  if ((store as any).activePage !== page) return null;
  if (hasCroppedImages) return null;

  const rect = getTotalClientRect((store as any).selectedShapes as any[]);

  const Position = components?.Position || PositionPicker;
  const Duplicate = components?.Duplicate || DuplicateButton;
  const Remove = components?.Remove || RemoveButton;
  const Group = components?.Group || GroupButton;
  const Lock = components?.Lock || LockPlaceholder;

  const firstType = (store as any).selectedElements[0]?.type;
  const extendedComponents = { TextAiWrite, ...components };
  const extraItems = extendToolbar({ components: extendedComponents, type: firstType, usedItems: [] });

  const transformer = stageRef?.current?.findOne('Transformer');
  const transformerRotation = transformer?.rotation() || 0;

  let offsetY = 30;
  if (Math.abs(transformerRotation) < 30 && position.fit) offsetY = 80;
  if (Math.abs(transformerRotation) > 140 && !position.fit) offsetY = 80;

  return React.createElement(
    Html,
    {
      parentNodeFunc: ({ stage }: any) =>
        stage?.container()?.closest('.raeditor-workspace-container') ||
        stage?.container()?.parentNode,
      transformFunc: (tf: any) => {
        const cx = rect.x + rect.width / 2;
        const cy = position.fit
          ? rect.y * tf.scaleY - offsetY
          : rect.y * tf.scaleY + rect.height * tf.scaleY + offsetY;

        const stageEl = stageRef?.current?.container();
        const stageRect = stageEl?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) };
        const workspaceEl = stageEl?.closest('.raeditor-workspace-container');
        const workspaceRect = workspaceEl?.getBoundingClientRect() || { left: 0, top: 0, width: Number.POSITIVE_INFINITY, height: Number.POSITIVE_INFINITY, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) };

        const stageOffsetX = stageRect.left - workspaceRect.left;
        const stageOffsetY = stageRect.top - workspaceRect.top;

        let tooltipX = stageOffsetX + tf.x + cx * tf.scaleX;
        const left = tooltipX - rect.width * tf.scaleX / 2;
        const right = tooltipX + rect.width * tf.scaleX / 2;
        const edge = Math.min(50, rect.width / 2 * tf.scaleX);
        const fits = right >= edge && left <= workspaceRect.width - edge;
        const tooltipWidth = tooltipRef.current?.getBoundingClientRect().width || 0;

        if (Number.isFinite(workspaceRect.width) && tooltipWidth > 0 && fits) {
          const minX = 8 + tooltipWidth / 2;
          const maxX = workspaceRect.width - 8 - tooltipWidth / 2;
          if (maxX >= minX) tooltipX = Math.max(minX, Math.min(tooltipX, maxX));
        }
        if (right < edge) tooltipX -= tooltipWidth + 8;
        if (left > workspaceRect.width - edge) tooltipX += tooltipWidth + 8;

        return { ...tf, x: tooltipX, y: stageOffsetY + tf.y + cy, scaleX: 1, scaleY: 1 };
      },
      divProps: {
        style: {
          pointerEvents: 'none',
          position: 'absolute',
          visibility: position.needCalculate ? 'hidden' : 'visible',
          zIndex: 9,
        },
      },
    },
    React.createElement(
      'div',
      {
        ref: (el: any) => {
          tooltipRef.current = el;
          if (!tooltipRef.current && el) checkFit();
        },
        style: { pointerEvents: 'none' },
      },
      React.createElement(
        Navbar,
        { style: { padding: '2px', borderRadius: '5px', height: '34px', transform: 'translate(-50%, -50%)', pointerEvents: 'auto' } },
        React.createElement(
          NavbarGroup,
          { style: { height: '30px' } },
          ...extraItems.map((name: string) => {
            const Comp = extendedComponents[name];
            return React.createElement(Comp, {
              elements: (store as any).selectedElements,
              element: (store as any).selectedElements[0],
              store,
              key: name,
            });
          }),
          React.createElement(Group, { store }),
          React.createElement(Lock, { store }),
          React.createElement(Duplicate, { store }),
          React.createElement(Remove, { store }),
          React.createElement(Position, { store }),
        ),
      ),
    ),
  );
}) as ((props: { store: StoreType; page: PageType; components?: any; stageRef?: any }) => React.JSX.Element) & { displayName: string };

Tooltip.displayName = 'Tooltip';
