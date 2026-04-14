'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button } from '@blueprintjs/core';
import { t } from '../utils/l10n';

export const GroupButton = observer(({ store }: { store: any }) => {
  const canGroup = store.selectedElements.length > 1;
  const canUngroup = store.selectedElements.length === 1 && store.selectedElements[0].type === 'group';
  return React.createElement(
    React.Fragment,
    null,
    canGroup && React.createElement(Button, {
      minimal: true,
      onClick: () => { store.groupElements(store.selectedElements.map((e: any) => e.id)); },
      style: { marginLeft: 'auto' },
    }, t('toolbar.groupElements')),
    canUngroup && React.createElement(Button, {
      minimal: true,
      onClick: () => { store.ungroupElements([store.selectedElements[0].id]); },
      style: { marginLeft: 'auto' },
    }, t('toolbar.ungroupElements')),
  );
});
