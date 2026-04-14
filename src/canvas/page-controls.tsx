'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Tooltip } from '@blueprintjs/core';
import { ChevronUp, ChevronDown, Duplicate, Trash, Insert } from '@blueprintjs/icons';
import { t } from '../utils/l10n';
import { StoreType } from '../model/store';
import { PageType } from '../model/page-model';

export const PageControls = observer(
  ({
    store,
    page,
    xPadding,
    yPadding,
  }: {
    store: StoreType;
    page: PageType;
    xPadding: number;
    yPadding: number;
  }) => {
    const hasMultiplePages = store.pages.length > 1;
    const pageIndex = store.pages.indexOf(page);

    return React.createElement(
      'div',
      { style: { position: 'absolute', top: yPadding - 40 + 'px', right: xPadding + 'px' } },
      hasMultiplePages &&
        React.createElement(
          Tooltip,
          { content: t('workspace.moveUp'), disabled: pageIndex === 0 },
          React.createElement(Button, {
            icon: React.createElement(ChevronUp, null),
            minimal: true,
            disabled: pageIndex === 0,
            onClick: () => { (page as any).setZIndex(pageIndex - 1); },
            'aria-label': t('workspace.moveUp'),
          }),
        ),
      hasMultiplePages &&
        React.createElement(
          Tooltip,
          { content: t('workspace.moveDown'), disabled: pageIndex === store.pages.length - 1 },
          React.createElement(Button, {
            icon: React.createElement(ChevronDown, null),
            minimal: true,
            disabled: pageIndex === store.pages.length - 1,
            onClick: () => {
              const idx = store.pages.indexOf(page);
              (page as any).setZIndex(idx + 1);
            },
            'aria-label': t('workspace.moveDown'),
          }),
        ),
      React.createElement(
        Tooltip,
        { content: t('workspace.duplicatePage') },
        React.createElement(Button, {
          icon: React.createElement(Duplicate, null),
          minimal: true,
          'aria-label': t('workspace.duplicatePage'),
          onClick: () => { (page as any).clone(); },
        }),
      ),
      hasMultiplePages &&
        React.createElement(
          Tooltip,
          { content: t('workspace.removePage') },
          React.createElement(Button, {
            icon: React.createElement(Trash, null),
            minimal: true,
            'aria-label': t('workspace.removePage'),
            onClick: () => { store.deletePages([page.id]); },
          }),
        ),
      React.createElement(
        Tooltip,
        { content: t('workspace.addPage') },
        React.createElement(Button, {
          icon: React.createElement(Insert, null),
          minimal: true,
          'aria-label': t('workspace.addPage'),
          onClick: () => {
            const newPage = store.addPage({
              bleed: (store.activePage as any)?.bleed || 0,
              width: (store.activePage as any)?.width || 'auto',
              height: (store.activePage as any)?.height || 'auto',
            });
            const idx = store.pages.indexOf(page);
            (newPage as any).setZIndex(idx + 1);
          },
        }),
      ),
    );
  },
) as ((props: { store: StoreType; page: PageType; xPadding: number; yPadding: number }) => React.JSX.Element) & { displayName: string };

PageControls.displayName = 'PageControls';
