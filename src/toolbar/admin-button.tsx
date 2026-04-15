'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Position, Popover, Switch, Alignment } from '@blueprintjs/core';
import { Cog } from '@blueprintjs/icons';
import { t } from '../utils/l10n';

export const AdminButton = observer(({ store }: { store: any }) => {
  const hasElements = store.selectedElements.length > 0;
  const first = store.selectedElements[0] || {};
  const setAll = (props: any) => {
    store.selectedElements.forEach((el: any) => { el.set(props); });
  };

  return React.createElement(
    Popover,
    {
      disabled: !hasElements,
      minimal: false,
      content: React.createElement(
        'div',
        { style: { padding: '15px', paddingTop: '25px', width: '220px' } },
        React.createElement(Switch, { checked: first.selectable, label: t('toolbar.selectable'), onChange: (e: any) => { setAll({ selectable: e.target.checked }); }, alignIndicator: Alignment.RIGHT }),
        React.createElement(Switch, { checked: first.draggable, label: t('toolbar.draggable'), onChange: (e: any) => { setAll({ draggable: e.target.checked }); }, alignIndicator: Alignment.RIGHT }),
        React.createElement(Switch, { checked: first.removable, label: t('toolbar.removable'), onChange: (e: any) => { setAll({ removable: e.target.checked }); }, alignIndicator: Alignment.RIGHT }),
        React.createElement(Switch, { checked: first.resizable, label: t('toolbar.resizable'), onChange: (e: any) => { setAll({ resizable: e.target.checked }); }, alignIndicator: Alignment.RIGHT }),
        React.createElement(Switch, { checked: first.contentEditable, label: t('toolbar.contentEditable'), onChange: (e: any) => { setAll({ contentEditable: e.target.checked }); }, alignIndicator: Alignment.RIGHT }),
        React.createElement(Switch, { checked: first.styleEditable, label: t('toolbar.styleEditable'), onChange: (e: any) => { setAll({ styleEditable: e.target.checked }); }, alignIndicator: Alignment.RIGHT }),
        React.createElement(Switch, { checked: first.alwaysOnTop, label: t('toolbar.alwaysOnTop'), onChange: (e: any) => { setAll({ alwaysOnTop: e.target.checked }); }, alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
        React.createElement(Switch, { checked: first.showInExport, label: t('toolbar.showInExport'), onChange: (e: any) => { setAll({ showInExport: e.target.checked }); }, alignIndicator: Alignment.RIGHT, style: { marginTop: '20px' } }),
      ),
      placement: 'bottom',
    },
    React.createElement(Button, { icon: React.createElement(Cog, null), minimal: true, disabled: !hasElements, 'aria-label': 'Admin settings' }),
  );
});
