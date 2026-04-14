'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Tooltip } from '@blueprintjs/core';
import { Duplicate } from '@blueprintjs/icons';
import { t } from '../utils/l10n';
import { useDuplicateElement } from './use-duplicate-element';

export const DuplicateButton = observer(({ store }: { store: any }) => {
  const { disabled, duplicate } = useDuplicateElement({ store });
  return React.createElement(
    Tooltip,
    { content: t('toolbar.duplicateElements'), disabled, position: 'bottom' },
    React.createElement(Button, {
      icon: React.createElement(Duplicate, null),
      minimal: true,
      onClick: () => duplicate(),
      disabled,
      'aria-label': t('toolbar.duplicateElements'),
    }),
  );
});
