'use client';

import { observer } from 'mobx-react-lite';
import { ContextMenuPopover, Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import React from 'react';
import { t } from '../../utils/l10n';
import { ChevronDown, ChevronUp, DoubleChevronDown, DoubleChevronUp, Duplicate, Layers, Lock, Trash, Unlock } from '@blueprintjs/icons';

// These hooks will be imported from the toolbar when it's reconstructed
// For now, stub them with simple implementations
function useDuplicateElement({ store }: { store: any }) {
  return {
    disabled: store.selectedElements.length === 0,
    duplicate: () => {
      const { duplicateElements } = require('../../utils/duplicate');
      duplicateElements(store.selectedElements, store);
    },
  };
}

function useRemoveElement({ store }: { store: any }) {
  return {
    disabled: store.selectedElements.filter((el: any) => el.removable).length === 0,
    remove: () => {
      const ids = store.selectedElements.filter((el: any) => el.removable).map((el: any) => el.id);
      store.deleteElements(ids);
    },
  };
}

function useCopyStyle(store: any) {
  return { setElementToCopy: (_el: any) => {} };
}

function useLock({ store }: { store: any }) {
  const locked = store.selectedElements.every((el: any) => el.locked);
  return {
    disabled: store.selectedElements.length === 0,
    locked,
    lock: () => {
      store.selectedElements.forEach((el: any) => el.set({ selectable: locked }));
    },
  };
}

export const ContextMenu = observer(
  ({ store, isOpen, offset, setIsOpen }: { store: any; isOpen: boolean; offset: { x: number; y: number }; setIsOpen: (v: boolean) => void }) => {
    const { disabled: dupDisabled, duplicate } = useDuplicateElement({ store });
    const { disabled: removeDisabled, remove } = useRemoveElement({ store });
    const { setElementToCopy } = useCopyStyle(store);
    const { disabled: lockDisabled, lock, locked } = useLock({ store });
    const lockIcon = locked ? React.createElement(Lock, null) : React.createElement(Unlock, null);
    const ids = store.selectedElementsIds;

    if (store.selectedElements.length === 0) return null;

    return React.createElement(
      ContextMenuPopover,
      {
        isOpen,
        onClose: () => { setIsOpen(false); },
        content: React.createElement(
          Menu,
          null,
          React.createElement(MenuItem, {
            shouldDismissPopover: false,
            icon: lockIcon,
            text: t(locked ? 'contextMenu.unlock' : 'contextMenu.lock'),
            onClick: lock,
            disabled: lockDisabled,
          }),
          React.createElement(MenuItem, {
            icon: React.createElement(Duplicate, null),
            text: t('contextMenu.duplicate'),
            onClick: duplicate,
            disabled: dupDisabled,
          }),
          React.createElement(MenuItem, {
            icon: React.createElement(Trash, null),
            text: t('contextMenu.remove'),
            onClick: remove,
            disabled: removeDisabled,
          }),
          React.createElement(MenuDivider, null),
          React.createElement(
            MenuItem,
            { icon: React.createElement(Layers, null), text: t('toolbar.layering') },
            React.createElement(MenuItem, {
              shouldDismissPopover: false,
              icon: React.createElement(DoubleChevronUp, null),
              text: t('toolbar.toForward'),
              disabled: !store.activePage?.canMoveElementsTop(ids),
              onClick: () => { store.activePage?.moveElementsTop(ids); },
            }),
            React.createElement(MenuItem, {
              shouldDismissPopover: false,
              icon: React.createElement(ChevronUp, null),
              text: t('toolbar.up'),
              disabled: !store.activePage?.canMoveElementsUp(ids),
              onClick: () => { store.activePage?.moveElementsUp(ids); },
            }),
            React.createElement(MenuItem, {
              shouldDismissPopover: false,
              icon: React.createElement(ChevronDown, null),
              text: t('toolbar.down'),
              disabled: !store.activePage?.canMoveElementsDown(ids),
              onClick: () => { store.activePage?.moveElementsDown(ids); },
            }),
            React.createElement(MenuItem, {
              shouldDismissPopover: false,
              icon: React.createElement(DoubleChevronDown, null),
              text: t('toolbar.toBottom'),
              disabled: !store.activePage?.canMoveElementsBottom(ids),
              onClick: () => { store.activePage?.moveElementsBottom(ids); },
            }),
          ),
        ),
        targetOffset: { top: offset.y, left: offset.x },
      },
    );
  },
);
