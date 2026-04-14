'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Dialog, Classes } from '@blueprintjs/core';
import { removeBackground } from '../utils/api';
import { t } from '../utils/l10n';

let removeBackgroundFn = async (url: string): Promise<string> => {
  const resp = await fetch(removeBackground(), {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  if (resp.status !== 200) {
    alert(t('error.removeBackground'));
    return url;
  }
  return (await resp.json()).url;
};

export function setRemoveBackgroundFunc(fn: (url: string) => Promise<string>) {
  removeBackgroundFn = fn;
}

export const RemoveBackgroundDialog = observer(({ isOpen, onClose, element }: any) => {
  const [preview, setPreview] = React.useState(element.src);
  React.useEffect(() => { setPreview(element.src); }, [element.src]);
  const [loading, setLoading] = React.useState(false);
  const isModified = preview !== element.src;

  return React.createElement(
    Dialog,
    { onClose, title: t('toolbar.removeBackgroundTitle'), isOpen, style: { width: '80%', maxWidth: '700px' } },
    React.createElement('div', { className: Classes.DIALOG_BODY },
      React.createElement('img', { src: preview, style: { width: '100%', maxHeight: '400px', objectFit: 'contain' } }),
    ),
    React.createElement(
      'div',
      { className: Classes.DIALOG_FOOTER, style: { position: 'relative' } },
      React.createElement(
        'div',
        { className: Classes.DIALOG_FOOTER_ACTIONS },
        !isModified && React.createElement(Button, {
          onClick: async () => {
            setLoading(true);
            try { setPreview(await removeBackgroundFn(element.src)); } catch (e) { console.error(e); }
            setLoading(false);
          },
          loading,
        }, t('toolbar.removeBackground')),
        isModified && React.createElement(
          React.Fragment,
          null,
          React.createElement(Button, { onClick: () => { setPreview(element.src); onClose(); }, loading }, t('toolbar.cancelRemoveBackground')),
          React.createElement(Button, { onClick: () => { element.set({ src: preview }); onClose(); }, loading, intent: 'primary' }, t('toolbar.confirmRemoveBackground')),
        ),
      ),
    ),
  );
});

export const ImageRemoveBackground = ({ element }: any) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Button, { text: t('toolbar.removeBackground'), minimal: true, onClick: () => { setDialogOpen(true); } }),
    React.createElement(RemoveBackgroundDialog, { isOpen: dialogOpen, onClose: () => { setDialogOpen(false); }, element }),
  );
};
