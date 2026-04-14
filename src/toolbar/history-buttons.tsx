'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Navbar, Alignment } from '@blueprintjs/core';
import { Undo, Redo } from '@blueprintjs/icons';

export const HistoryButtons = observer(({ store }: { store: any }) =>
  React.createElement(
    Navbar.Group,
    { align: Alignment.LEFT, style: { paddingRight: '10px' } },
    React.createElement(Button, { icon: React.createElement(Undo, null), minimal: true, onClick: () => store.history.undo(), disabled: !store.history.canUndo, 'aria-label': 'Undo' }),
    React.createElement(Button, { icon: React.createElement(Redo, null), minimal: true, onClick: () => store.history.redo(), disabled: !store.history.canRedo, 'aria-label': 'Redo' }),
  ),
);
