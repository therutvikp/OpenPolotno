'use client';
import React from 'react';
import { Button } from '@blueprintjs/core';
import { Plus } from '@blueprintjs/icons';
import { getVideoPreview } from '../utils/video';
import { localFileToURL } from '../utils/file';
import { ImagesGrid } from './images-grid';
import { t as s } from '../utils/l10n';
import { selectImage } from './select-image';
import { selectVideo } from './select-video';
import { selectSvg } from './select-svg';
import { selectGif } from './select-gif';
import { StoreType } from '../model/store';

let uploadFunc: (file: File) => Promise<string> = async (f) => localFileToURL(f);
export function setUploadFunc(func: any) { uploadFunc = func; }

let cachedFiles: any[] = [];

function getFileType(file: File) {
  const { type } = file;
  if (type.indexOf('svg') >= 0) return 'svg';
  if (type.indexOf('gif') >= 0) return 'gif';
  if (type.indexOf('image') >= 0) return 'image';
  if (type.indexOf('video') >= 0) return 'video';
  if (type.indexOf('audio') >= 0) return 'audio';
  return 'image';
}

function createAudioPlaceholder() {
  const blob = new Blob([`
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
      <path d="M40,35 L40,65 L55,50 L70,50 M70,35 Q80,50 70,65" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}

export const UploadPanel = ({ store }: { store: StoreType }) => {
  const [files, setFiles] = React.useState<any[]>(cachedFiles);
  const [isLoading, setIsLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { cachedFiles = files; }, [files]);

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
    React.createElement('div', { style: { height: '45px', paddingTop: '5px' } }, s('sidePanel.uploadTip')),
    React.createElement(
      'div',
      { style: { marginBottom: '20px' } },
      React.createElement(
        'label',
        { htmlFor: 'input-file' },
        React.createElement(
          Button,
          { icon: React.createElement(Plus, null), style: { width: '100%' }, onClick: () => { inputRef.current?.click(); } },
          s('sidePanel.uploadImage')
        ),
        React.createElement('input', {
          type: 'file',
          ref: inputRef,
          style: { display: 'none' },
          onChange: async (e: any) => {
            const { target } = e;
            setIsLoading(true);
            try {
              for (const file of target.files) {
                const url = await uploadFunc(file);
                const type = getFileType(file);
                let preview = url;
                if (type === 'video') preview = await getVideoPreview(url);
                else if (type === 'audio') preview = createAudioPlaceholder();
                setFiles((prev) => prev.concat([{ url, type, preview }]));
              }
            } catch (err) { console.error(err); }
            setIsLoading(false);
            target.value = '';
          },
          multiple: true,
        })
      )
    ),
    React.createElement(ImagesGrid, {
      images: files,
      isLoading,
      getPreview: (item: any) => item.preview,
      hideNoResults: true,
      onSelect: async (item: any, pos: any, el: any) => {
        const src = item.url;
        const type = item.type;
        if (type === 'image') selectImage({ src, store, droppedPos: pos, targetElement: el });
        else if (type === 'video') selectVideo({ src, store, droppedPos: pos, targetElement: el });
        else if (type === 'gif') selectGif({ src, store, droppedPos: pos, targetElement: el });
        else if (type === 'svg') selectSvg({ src, store, droppedPos: pos, targetElement: el });
        else if (type === 'audio') (store as any).addAudio({ src });
      },
    })
  );
};
