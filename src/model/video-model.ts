import { Instance } from 'mobx-state-tree';
import { ImageElement } from './image-model';

export const VideoElement = ImageElement.named('Video').props({
  type: 'video',
  duration: 0,
  startTime: 0,
  endTime: 1,
  volume: 1,
});

export type VideoElementType = Instance<typeof VideoElement>;
