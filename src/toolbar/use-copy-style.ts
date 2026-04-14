'use client';

import { useEffect, useState } from 'react';
import { intersect } from '../utils/array';

const BASE_PROPS = [
  'opacity', 'visible', 'height', 'width',
  'shadowEnabled', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY',
  'blurEnabled', 'blurRadius',
  'brightnessEnabled', 'brightness',
  'sepiaEnabled', 'grayscaleEnabled',
];

const TEXT_PROPS = [
  ...BASE_PROPS,
  'fontSize', 'fontWeight', 'fontFamily', 'lineHeight',
  'stroke', 'strokeWidth', 'textDecoration', 'fill', 'align', 'verticalAlign', 'letterSpacing',
  'backgroundEnabled', 'backgroundColor', 'backgroundOpacity', 'backgroundCornerRadius', 'backgroundPadding',
];

const IMAGE_PROPS = [
  ...BASE_PROPS,
  'flipX', 'flipY', 'keepRatio', 'borderColor', 'borderSize', 'cornerRadius',
  'cropX', 'cropY', 'cropWidth', 'cropHeight',
];

const VIDEO_PROPS = [
  ...BASE_PROPS,
  'flipX', 'flipY', 'keepRatio', 'borderColor', 'borderSize', 'cornerRadius',
  'cropX', 'cropY', 'cropWidth', 'cropHeight',
];

const LINE_PROPS = [
  ...BASE_PROPS,
  'color', 'dash', 'endHead', 'startHead',
];

const TYPE_PROPS: Record<string, string[]> = {
  figure: [...BASE_PROPS, 'dash', 'cornerRadius', 'fill', 'stroke', 'strokeWidth'],
  image: IMAGE_PROPS,
  line: LINE_PROPS,
  svg: [...BASE_PROPS, 'cornerRadius', 'borderColor', 'borderSize', 'colorsReplace', 'cropHeight', 'cropWidth', 'cropX', 'cropY', 'flipX', 'flipY', 'keepRatio'],
  text: TEXT_PROPS,
  video: VIDEO_PROPS,
};

// Props excluded when copying between different types
const EXCLUDE_ON_TYPE_MISMATCH = ['width', 'height'];

export const useCopyStyle = (store: any) => {
  const [elementToCopy, setElementToCopy] = useState<any>(null);

  useEffect(() => {
    const elements = store.selectedElements;
    if (elementToCopy) {
      elements.forEach((el: any) => {
        const sharedProps = intersect(TYPE_PROPS[el.type] ?? [], TYPE_PROPS[elementToCopy.type] ?? []);
        const props = sharedProps.reduce((acc: any, key: string) => {
          let val = elementToCopy[key];
          if (Array.isArray(val)) val = [...val];
          else if (typeof val === 'object' && val !== null) val = { ...val };
          return { ...acc, [key]: val };
        }, {});
        if (el.type !== elementToCopy.type) {
          EXCLUDE_ON_TYPE_MISMATCH.forEach((k) => { delete props[k]; });
        }
        el.set({ ...props });
      });
      setElementToCopy(null);
    }
  }, [store.selectedElements[0]]);

  const disabled = store.selectedElements.length !== 1;

  return { elementToCopy, disabled, setElementToCopy };
};
