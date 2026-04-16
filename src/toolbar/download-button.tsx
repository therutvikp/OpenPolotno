'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Position, Menu, MenuItem, Popover } from '@blueprintjs/core';
import { Import, Media, Document, Video } from '@blueprintjs/icons';
import { t } from '../utils/l10n';
import { downloadFile } from '../utils/download';
import { getAPI } from '../utils/api';
import { getKey } from '../utils/validate-key';
import { flags } from '../utils/flags';

function getFileName(store: any): string {
  const words: string[] = [];
  store.pages.forEach((page: any) => {
    page.children.forEach((el: any) => {
      if (el.type === 'text') words.push(el.text);
    });
  });
  return words.join(' ').split(' ').slice(0, 6).join(' ').replace(/\s/g, '-').toLowerCase() || 'raeditor';
}

async function exportVideo({ store, onProgress }: { store: any; onProgress?: (progress: number, status: string) => void }) {
  const design = store.toJSON();
  const resp = await fetch(`${getAPI()}/renders?KEY=${getKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ design, pixelRatio: 1, format: 'mp4' }),
  });
  const job = await resp.json();
  for (;;) {
    const pollResp = await fetch(`${getAPI()}/renders/${job.id}?KEY=${getKey()}`);
    const result = await pollResp.json();
    if (result.status === 'done') {
      downloadFile(result.output, getFileName(store) + '.mp4');
      break;
    }
    if (result.status === 'error') {
      throw new Error('Failed to render video');
    }
    onProgress?.(result.progress || 0, result.status || 'processing');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

export const DownloadButton = observer(({ store }: { store: any }) => {
  const [loading, setLoading] = React.useState(false);

  return React.createElement(
    Popover,
    {
      content: React.createElement(
        Menu,
        null,
        React.createElement(MenuItem, {
          icon: React.createElement(Media, null),
          text: t('toolbar.saveAsImage'),
          onClick: async () => {
            store.pages.forEach((page: any, i: number) => {
              const suffix = store.pages.length > 1 ? '-' + (i + 1) : '';
              store.saveAsImage({ pageId: page.id, fileName: getFileName(store) + suffix + '.png' });
            });
          },
        }),
        React.createElement(MenuItem, {
          icon: React.createElement(Document, null),
          text: t('toolbar.saveAsPDF'),
          onClick: async () => {
            setLoading(true);
            await store.saveAsPDF({ fileName: getFileName(store) + '.pdf' });
            setLoading(false);
          },
        }),
        flags.animationsEnabled && React.createElement(MenuItem, {
          icon: React.createElement(Video, null),
          text: 'Save as GIF',
          onClick: async () => {
            setLoading(true);
            try {
              await store.saveAsGIF({ fileName: getFileName(store) + '.gif' });
            } catch (e) {
              console.error('GIF export failed:', e);
              alert('Failed to export GIF. Please try again.');
            }
            setLoading(false);
          },
        }),
        flags.animationsEnabled && React.createElement(MenuItem, {
          icon: React.createElement(Video, null),
          text: 'Save as Video',
          onClick: async () => {
            setLoading(true);
            try {
              await exportVideo({ store });
            } catch (e) {
              console.error('Video export failed:', e);
              alert('Failed to export video. Please try again.');
            }
            setLoading(false);
          },
        }),
      ),
      position: Position.BOTTOM,
    },
    React.createElement(Button, {
      icon: React.createElement(Import, null),
      className: 'raeditor-download-button',
      text: t('toolbar.download'),
      minimal: true,
      loading,
      'data-tour': 'download',
    } as any),
  );
});

export default DownloadButton;
