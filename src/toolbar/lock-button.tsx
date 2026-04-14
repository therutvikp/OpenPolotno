'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Tooltip } from '@blueprintjs/core';
import { Lock, Unlock } from '@blueprintjs/icons';
import { t } from '../utils/l10n';
import { useLock } from './use-lock';

export const LockButton = observer(({ store }: { store: any }) => {
  const { lock, locked, disabled } = useLock({ store });
  const icon = locked ? React.createElement(Lock, null) : React.createElement(Unlock, null);
  const label = t(locked ? 'toolbar.lockedDescription' : 'toolbar.unlockedDescription');
  return React.createElement(
    Tooltip,
    { content: label, disabled, position: 'bottom' },
    React.createElement(Button, {
      minimal: true,
      disabled,
      icon,
      onClick: () => lock(),
      'aria-label': label,
    }),
  );
});
