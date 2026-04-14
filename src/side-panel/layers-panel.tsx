'use client';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, EditableText, Card } from '@blueprintjs/core';
import { t as s } from '../utils/l10n';
import { isMobile } from '../utils/screen';
import { ReactSortable } from 'react-sortablejs';
import { removeTags } from '../utils/text';
import { DragHandleVertical, Trash, Lock, Unlock, EyeOpen, EyeOff } from '@blueprintjs/icons';
import { StoreType } from '../model/store';

const LayerItem = observer(({ element, store }: { element: any; store: StoreType }) => {
  const selected = store.selectedElements.indexOf(element) >= 0;
  const [editing, setEditing] = React.useState(false);
  const stopEditing = () => setEditing(false);
  const displayName = editing ? element.name : element.name || removeTags(element.text) || `#${element.id}`;

  return React.createElement(
    Card,
    {
      onMouseDown: (e: any) => {
        const ids = e.ctrlKey || e.metaKey || e.shiftKey ? [...store.selectedElementsIds] : [];
        if (ids.indexOf(element.id) < 0) ids.push(element.id);
        store.selectElements(ids);
      },
      className: selected ? 'selected' : '',
      style: {
        padding: '5px',
        margin: '0px 1px 5px 1px',
        backgroundColor: selected ? 'rgb(0, 161, 255, 0.2)' : '',
        display: element.selectable || store.role === 'admin' ? 'auto' : 'none',
      },
    },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between' } },
      React.createElement(
        'div',
        { style: { lineHeight: '30px', display: 'flex' } },
        React.createElement(
          'div',
          { className: 'drag-handle', style: { display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'move', height: '30px' } },
          React.createElement(DragHandleVertical, null)
        ),
        React.createElement('div', { style: { padding: '0 7px', opacity: 0.5, width: '60px' } }, s('sidePanel.layerTypes.' + element.type)),
        React.createElement(
          'div',
          { style: { maxWidth: '142px' } },
          React.createElement(EditableText, {
            minWidth: 130,
            placeholder: s('sidePanel.namePlaceholder'),
            value: displayName,
            maxLines: 1,
            onEdit: () => setEditing(true),
            onCancel: stopEditing,
            onConfirm: stopEditing,
            onChange: (v: string) => { element.set({ name: v }); },
          })
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(Button, {
          minimal: true,
          icon: element?.visible ? React.createElement(EyeOpen, null) : React.createElement(EyeOff, null),
          onClick: () => { element.set({ visible: !element.visible }); },
        }),
        React.createElement(Button, {
          minimal: true,
          icon: element?.locked ? React.createElement(Lock, null) : React.createElement(Unlock, null),
          onClick: () => {
            element.set({
              draggable: element.locked,
              contentEditable: element.locked,
              styleEditable: element.locked,
              resizable: element.locked,
              removable: element.locked,
            });
          },
        }),
        React.createElement(Button, {
          icon: React.createElement(Trash, null),
          minimal: true,
          disabled: !element.removable,
          onClick: () => { store.deleteElements([element.id]); },
          style: { marginLeft: 'auto' },
        })
      )
    )
  );
});

export const LayersPanel = observer(({ store }: { store: StoreType }) => {
  const items = (store.activePage?.children.map((e: any) => ({ id: e.id })) || []).reverse();
  const mobile = isMobile();

  return React.createElement(
    'div',
    { style: { height: '100%', overflow: 'auto' } },
    React.createElement('div', { style: { height: '40px', paddingTop: '5px' } }, s('sidePanel.layersTip')),
    React.createElement(
      'div',
      null,
      items.length === 0 ? React.createElement('div', null, s('sidePanel.noLayers')) : null,
      React.createElement(
        ReactSortable,
        {
          list: items,
          setList: (newList: any[]) => {
            newList.forEach(({ id }: any, idx: number) => {
              const zIndex = newList.length - idx - 1;
              const el = store.getElementById(id);
              if (store.activePage?.children.indexOf(el) !== zIndex) {
                store.activePage?.setElementZIndex(el.id, zIndex);
              }
            });
          },
          direction: 'horizontal',
          handle: mobile ? '.drag-handle' : undefined,
        } as any,
        items.map(({ id }: any) => {
          const el = store.getElementById(id);
          return React.createElement(LayerItem, { element: el, store, key: id });
        })
      )
    )
  );
});
