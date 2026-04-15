'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Menu, MenuDivider, MenuItem, Popover, Position } from '@blueprintjs/core';
import {
  AlignmentBottom, AlignmentHorizontalCenter, AlignmentLeft, AlignmentRight,
  AlignmentTop, AlignmentVerticalCenter, ChevronDown, ChevronUp,
  DoubleChevronDown, DoubleChevronUp, HorizontalDistribution, Layers, VerticalDistribution,
} from '@blueprintjs/icons';
import { getClientRect } from '../utils/math';
import { t } from '../utils/l10n';
import { alignBottom, alignCenter, alignLeft, alignMiddle, alignRight, alignTop } from '../utils/alignment';

function getElementRect(element: any): { x: number; y: number; width: number; height: number } {
  if (element.type !== 'group') return getClientRect(element);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  element.children.forEach((child: any) => {
    const r = getElementRect(child);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function moveElementTo(element: any, x: number, y: number) {
  if (element.type !== 'group') {
    const rect = getClientRect(element);
    element.set({ x: element.x + (x - rect.x), y: element.y + (y - rect.y) });
  } else {
    const dx = x - getElementRect(element).x;
    const dy = y - getElementRect(element).y;
    element.children.forEach((child: any) => {
      const r = getElementRect(child);
      moveElementTo(child, r.x + dx, r.y + dy);
    });
  }
}

export const PositionPicker = observer(({ store }: { store: any }) => {
  const hasElements = store.selectedElements.length > 0;
  const ids = store.selectedElementsIds;
  const allDraggable = store.selectedElements.every((e: any) => e.draggable);
  const canDistribute = allDraggable && store.selectedElements.length > 1;

  return React.createElement(
    Popover,
    {
      disabled: !hasElements,
      content: React.createElement(
        Menu,
        { style: { width: '280px' } },
        React.createElement(MenuDivider, { title: t('toolbar.layering') }),
        React.createElement('div', { style: { display: 'flex' } },
          React.createElement('div', { style: { width: '50%' } },
            React.createElement(MenuItem, { shouldDismissPopover: false, icon: React.createElement(ChevronUp, null), text: t('toolbar.up'), disabled: !store.activePage?.canMoveElementsUp(ids), onClick: () => store.activePage?.moveElementsUp(ids) }),
            React.createElement(MenuItem, { shouldDismissPopover: false, icon: React.createElement(DoubleChevronUp, null), text: t('toolbar.toForward'), disabled: !store.activePage?.canMoveElementsTop(ids), onClick: () => store.activePage?.moveElementsTop(ids) }),
          ),
          React.createElement('div', { style: { width: '50%' } },
            React.createElement(MenuItem, { shouldDismissPopover: false, icon: React.createElement(ChevronDown, null), text: t('toolbar.down'), disabled: !store.activePage?.canMoveElementsDown(ids), onClick: () => store.activePage?.moveElementsDown(ids) }),
            React.createElement(MenuItem, { shouldDismissPopover: false, icon: React.createElement(DoubleChevronDown, null), text: t('toolbar.toBottom'), disabled: !store.activePage?.canMoveElementsBottom(ids), onClick: () => store.activePage?.moveElementsBottom(ids) }),
          ),
        ),
        allDraggable && React.createElement(React.Fragment, null,
          React.createElement(MenuDivider, { title: t('toolbar.position') }),
          React.createElement('div', { style: { display: 'flex' } },
            React.createElement('div', { style: { width: '50%' } },
              React.createElement(MenuItem, { shouldDismissPopover: false, icon: React.createElement(AlignmentLeft, null), text: t('toolbar.alignLeft'), onClick: () => alignLeft(store) }),
              React.createElement(MenuItem, { shouldDismissPopover: false, icon: React.createElement(AlignmentVerticalCenter, null), text: t('toolbar.alignCenter'), onClick: () => alignCenter(store) }),
              React.createElement(MenuItem, { shouldDismissPopover: false, icon: React.createElement(AlignmentRight, null), text: t('toolbar.alignRight'), onClick: () => alignRight(store) }),
            ),
            React.createElement('div', { style: { width: '50%' } },
              React.createElement(MenuItem, { shouldDismissPopover: false, icon: React.createElement(AlignmentTop, null), text: t('toolbar.alignTop'), onClick: () => alignTop(store) }),
              React.createElement(MenuItem, { shouldDismissPopover: false, icon: React.createElement(AlignmentHorizontalCenter, null), text: t('toolbar.alignMiddle'), onClick: () => alignMiddle(store) }),
              React.createElement(MenuItem, { shouldDismissPopover: false, icon: React.createElement(AlignmentBottom, null), text: t('toolbar.alignBottom'), onClick: () => alignBottom(store) }),
            ),
          ),
        ),
        canDistribute && React.createElement(React.Fragment, null,
          React.createElement(MenuDivider, { title: t('toolbar.spaceEvenly') }),
          React.createElement('div', { style: { display: 'flex' } },
            React.createElement('div', { style: { width: '50%' } },
              React.createElement(MenuItem, {
                shouldDismissPopover: false,
                icon: React.createElement(VerticalDistribution, null),
                text: t('toolbar.verticalDistribution'),
                onClick: () => {
                  let minY = store.activePage?.computedHeight ?? 0, maxY = 0, totalH = 0;
                  store.selectedElements.forEach((el: any) => { const r = getElementRect(el); minY = Math.min(minY, r.y); maxY = Math.max(maxY, r.y + r.height); totalH += r.height; });
                  const gap = (maxY - minY - totalH) / (store.selectedElements.length - 1);
                  const sorted = [...store.selectedElements].sort((a: any, b: any) => getElementRect(a).y - getElementRect(b).y);
                  let cursor = 0;
                  sorted.forEach((el: any) => { const r = getElementRect(el); moveElementTo(el, r.x, minY + cursor); cursor += r.height + gap; });
                },
              }),
            ),
            React.createElement('div', { style: { width: '50%' } },
              React.createElement(MenuItem, {
                shouldDismissPopover: false,
                icon: React.createElement(HorizontalDistribution, null),
                text: t('toolbar.horizontalDistribution'),
                onClick: () => {
                  let minX = store.activePage?.computedWidth ?? 0, maxX = 0, totalW = 0;
                  store.selectedElements.forEach((el: any) => { const r = getElementRect(el); minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x + r.width); totalW += r.width; });
                  const gap = (maxX - minX - totalW) / (store.selectedElements.length - 1);
                  const sorted = [...store.selectedElements].sort((a: any, b: any) => getElementRect(a).x - getElementRect(b).x);
                  let cursor = 0;
                  sorted.forEach((el: any) => { const r = getElementRect(el); moveElementTo(el, minX + cursor, r.y); cursor += r.width + gap; });
                },
              }),
            ),
          ),
        ),
      ),
      position: Position.BOTTOM,
      positioningStrategy: 'fixed',
    },
    React.createElement(Button, {
      icon: React.createElement(Layers, null),
      className: 'raeditor-position',
      minimal: true,
      text: t('toolbar.position'),
      disabled: !hasElements,
    }),
  );
});
