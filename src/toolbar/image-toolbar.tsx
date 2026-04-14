'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Navbar, Tooltip } from '@blueprintjs/core';
import { ElementContainer, extendToolbar } from './element-container';
import { Crop, Tick, Cross } from '@blueprintjs/icons';
import FiltersPicker from './filters-picker';
import { AnimationsPicker } from './animations-picker';
import FlipButton from './flip-button';
import { flags } from '../utils/flags';
import { ImageRemoveBackground } from './image-remove-background-button';
export { ImageRemoveBackground } from './image-remove-background-button';
import { getCrop, getImageSize } from '../utils/image';
import { t } from '../utils/l10n';

export const ImageFitToBackground = ({ element }: any) =>
  React.createElement(Button, {
    text: t('toolbar.fitToBackground'),
    minimal: true,
    onClick: async () => {
      const { page } = element;
      const w = page.computedWidth + 2 * page.bleed;
      const h = page.computedHeight + 2 * page.bleed;
      const imgSize = await getImageSize(element.src);
      const crop = element.stretchEnabled ? { cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1 } : getCrop({ width: w, height: h }, imgSize);
      element.set({ x: -page.bleed, y: -page.bleed, width: w, height: h, rotation: 0, ...crop });
    },
  });

export const ImageClip = observer(({ element, store, elements }: any) => {
  if (!element.contentEditable) return null;
  if (element.clipSrc) {
    return React.createElement(Button, {
      text: t('toolbar.removeClip'),
      minimal: true,
      onClickCapture: () => { elements.forEach((el: any) => { el.set({ clipSrc: '' }); }); },
    });
  }
  return React.createElement(Button, {
    minimal: true,
    text: t('toolbar.clip'),
    onClickCapture: (e: any) => { e.stopPropagation(); store.openSidePanel('image-clip'); },
  });
});

export const ImageCrop = observer(({ element, store }: any) => {
  if (!element.contentEditable || element.stretchEnabled) return null;
  return React.createElement(
    Tooltip,
    { content: t('toolbar.crop'), position: 'bottom' },
    React.createElement(Button, {
      minimal: true,
      icon: React.createElement(Crop, null),
      onClickCapture: (e: any) => { e.stopPropagation(); element.toggleCropMode(true); },
      'aria-label': t('toolbar.crop'),
    }),
  );
});

export const ImageRemoveClip = observer(({ element }: any) => {
  if (!element.clipSrc) return null;
  return React.createElement(Button, {
    text: t('toolbar.removeClip'),
    minimal: true,
    onClickCapture: () => { element.set({ clipSrc: '' }); },
  });
});

const defaultImageComponents: Record<string, any> = {
  ImageFlip: FlipButton,
  ImageFilters: FiltersPicker,
  ImageFitToBackground,
  ImageCrop,
  ImageClip,
  ImageRemoveBackground,
  ImageAnimations: AnimationsPicker,
};

export const ImageToolbar = observer(({ store, components }: any) => {
  const element = store.selectedElements[0];
  const isCropMode = element._cropModeEnabled;
  const savedCropState = React.useRef<any>({});

  React.useEffect(() => {
    if (isCropMode) {
      savedCropState.current = { x: element.x, y: element.y, width: element.width, height: element.height, cropX: element.cropX, cropY: element.cropY, cropWidth: element.cropWidth, cropHeight: element.cropHeight };
    }
  }, [isCropMode]);

  const usedItems = [
    'ImageFlip', 'ImageFilters', 'ImageFitToBackground', 'ImageClip', 'ImageCrop',
    flags.animationsEnabled && 'ImageAnimations',
    flags.removeBackgroundEnabled && 'ImageRemoveBackground',
  ];
  const items = extendToolbar({ type: 'image', usedItems, components });

  return React.createElement(
    React.Fragment,
    null,
    !isCropMode && React.createElement(ElementContainer, {
      items,
      itemRender: (key: string) => {
        const Component = components[key] || defaultImageComponents[key];
        return React.createElement(Component, { element, store, key, elements: store.selectedElements });
      },
    }),
    isCropMode && React.createElement(
      Navbar.Group,
      null,
      React.createElement(Button, { text: t('toolbar.cropDone'), minimal: true, icon: React.createElement(Tick, null), onClickCapture: () => { element.toggleCropMode(false); } }),
      React.createElement(Button, {
        text: t('toolbar.cropCancel'),
        minimal: true,
        icon: React.createElement(Cross, null),
        onClickCapture: () => { element.set({ ...savedCropState.current }); element.toggleCropMode(false); },
      }),
    ),
  );
});

export default ImageToolbar;
