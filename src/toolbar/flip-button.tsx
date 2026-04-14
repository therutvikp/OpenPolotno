'use client';

import React from 'react';
import { Button, Position, Menu, MenuItem } from '@blueprintjs/core';
import { Popover } from '@blueprintjs/core';
import { ArrowsHorizontal, ArrowsVertical } from '@blueprintjs/icons';
import { t } from '../utils/l10n';

export const FlipButton = ({ element, elements }: { element?: any; elements: any[] }) =>
  React.createElement(
    Popover,
    {
      content: React.createElement(
        Menu,
        null,
        React.createElement(MenuItem, {
          shouldDismissPopover: false,
          icon: React.createElement(ArrowsHorizontal, null),
          text: t('toolbar.flipHorizontally'),
          onClick: () => { elements.forEach((el) => { el.set({ flipX: !el.flipX }); }); },
        }),
        React.createElement(MenuItem, {
          shouldDismissPopover: false,
          text: t('toolbar.flipVertically'),
          icon: React.createElement(ArrowsVertical, null),
          onClick: () => { elements.forEach((el) => { el.set({ flipY: !el.flipY }); }); },
        }),
      ),
      position: Position.BOTTOM,
    },
    React.createElement(Button, { text: t('toolbar.flip'), minimal: true }),
  );

export default FlipButton;
