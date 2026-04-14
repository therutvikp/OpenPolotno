'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Navbar, Menu, MenuItem, Popover } from '@blueprintjs/core';
import { ZoomIn, ZoomOut } from '@blueprintjs/icons';
import styled from '../utils/styled';
import { t } from '../utils/l10n';
import { mobileStyle } from '../utils/screen';

const ZoomGroupWrapper = styled('div')`
  position: relative;
  height: 0px;
`;

const ZoomFloating = styled('div')`
  position: absolute;
  bottom: 5px;
  width: auto;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 5px;
  overflow: hidden;
  box-shadow: 0 0 4px lightgrey;

  ${mobileStyle(`
    display: none;
  `)}
`;

const SCALE_PRESETS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5];
const MAX_SCALE = SCALE_PRESETS[SCALE_PRESETS.length - 1];
const MIN_SCALE = SCALE_PRESETS[0];

export const ZoomGroup = observer(({ store }: { store: any }) => {
  const maxScale = Math.max(MAX_SCALE, store.scaleToFit);
  const minScale = Math.min(MIN_SCALE, store.scaleToFit);
  const canZoomIn = store.scale < maxScale;
  const canZoomOut = store.scale > minScale;

  return React.createElement(
    Navbar.Group,
    { style: { height: '35px' } },
    React.createElement(Button, { icon: React.createElement(ZoomOut, null), minimal: true, onClick: () => { store.setScale(store.scale / 1.2); }, disabled: !canZoomOut, 'aria-label': 'Zoom out' }),
    React.createElement(
      Popover,
      {
        content: React.createElement(
          Menu,
          { style: { minWidth: '80px' } },
          ...SCALE_PRESETS.map((scale) =>
            React.createElement(MenuItem, { key: scale, text: Math.round(100 * scale) + '%', onClick: async () => { store.setScale(scale); } }),
          ),
          React.createElement(MenuItem, { text: t('scale.reset'), onClick: async () => { store.setScale(store.scaleToFit); } }),
        ),
      },
      React.createElement(Button, { minimal: true, 'aria-label': 'Zoom level' }, Math.round(100 * store.scale) + '%'),
    ),
    React.createElement(Button, { icon: React.createElement(ZoomIn, null), minimal: true, onClick: () => { store.setScale(1.2 * store.scale); }, disabled: !canZoomIn, 'aria-label': 'Zoom in' }),
  );
});

export const ZoomButtons = observer(({ store }: { store: any }) =>
  React.createElement(
    ZoomGroupWrapper,
    null,
    React.createElement(
      ZoomFloating,
      null,
      React.createElement(
        Navbar,
        { style: { height: '35px', padding: '0 5px' } },
        React.createElement(ZoomGroup, { store }),
      ),
    ),
  ),
);

export default ZoomButtons;
