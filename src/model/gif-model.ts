import { Instance } from 'mobx-state-tree';
import { ImageElement } from './image-model';

export const GifElement = ImageElement.named('Gif').props({
  type: 'gif',
  duration: 0,
  keepRatio: true,
});

export type GifElementType = Instance<typeof GifElement>;
