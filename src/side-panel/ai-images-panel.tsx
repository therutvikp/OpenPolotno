'use client';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { InputGroup, Button } from '@blueprintjs/core';
import { getKey } from '../utils/validate-key';
import { getImageSize } from '../utils/image';
import { ImagesGrid } from './images-grid';
import { getAPI } from '../utils/api';

export const AiImagesPanel = observer(({ store }: { store: any }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [result, setResult] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const generate = async () => {
    setIsLoading(true);
    setResult(null);
    const res = await fetch(`${getAPI()}/get-stable-diffusion?KEY=${getKey()}&prompt=${inputRef.current!.value}`);
    setIsLoading(false);
    if (!res.ok) { alert('Something went wrong, please try again later...'); return; }
    const data = await res.json();
    setResult(data.output[0]);
  };

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
    React.createElement(
      'div',
      { style: { padding: '15px 0' } },
      'Stable Diffusion is a latent text-to-image diffusion model capable of generating photo-realistic images given any text input'
    ),
    React.createElement(InputGroup, {
      placeholder: 'Type your image generation prompt here...',
      onKeyDown: (e: any) => { if (e.key === 'Enter') generate(); },
      style: { marginBottom: '20px' },
      inputRef,
    }),
    React.createElement(Button, { onClick: generate, intent: 'primary', loading: isLoading, style: { marginBottom: '40px' } }, 'Generate'),
    result && React.createElement(ImagesGrid, {
      shadowEnabled: false,
      images: result ? [result] : [],
      getPreview: (item: any) => item,
      isLoading,
      onSelect: async (item: any, pos: any, el: any) => {
        const src = item as string;
        if (el && el.type === 'svg' && (el as any).contentEditable) { el.set({ maskSrc: src }); return; }
        if (el && el.type === 'image' && (el as any).contentEditable) { el.set({ src }); return; }
        const { width, height } = await getImageSize(src);
        const x = ((pos?.x) || store.width / 2) - width / 2;
        const y = ((pos?.y) || store.height / 2) - height / 2;
        store.activePage?.addElement({ type: 'image', src, width, height, x, y });
      },
      rowsNumber: 1,
    })
  );
});
