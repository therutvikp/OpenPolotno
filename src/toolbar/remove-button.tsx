'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Tooltip } from '@blueprintjs/core';
import { Trash } from '@blueprintjs/icons';
import { t } from '../utils/l10n';
import { useRemoveElement } from './use-remove-element';

export const RemoveButton = observer(({ store }: { store: any }) => {
  const { disabled, remove } = useRemoveElement({ store });
  return React.createElement(
    Tooltip,
    { content: t('toolbar.removeElements'), disabled, position: 'bottom' },
    React.createElement(Button, {
      icon: React.createElement(Trash, null),
      minimal: true,
      onClick: () => remove(),
      disabled,
      style: { marginLeft: 'auto' },
      'aria-label': t('toolbar.removeElements'),
    }),
  );
});
