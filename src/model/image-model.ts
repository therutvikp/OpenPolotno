import { observable } from 'mobx';
import { Instance } from 'mobx-state-tree';
import { Shape } from './shape-model';

export const ImageElement = Shape.named('Image')
  .props({
    type: 'image',
    width: 100,
    height: 100,
    src: '',
    cropX: 0,
    cropY: 0,
    cropWidth: 1,
    cropHeight: 1,
    cornerRadius: 0,
    flipX: false,
    flipY: false,
    clipSrc: '',
    borderColor: 'black',
    borderSize: 0,
    keepRatio: false,
    stretchEnabled: false,
  })
  .extend((self) => {
    const cropModeEnabled = observable.box(false);
    let inTransaction = false;

    return {
      views: {
        get _cropModeEnabled() {
          return cropModeEnabled.get();
        },
      },
      actions: {
        toggleCropMode(value?: boolean) {
          const next = value != null ? value : !cropModeEnabled.get();
          cropModeEnabled.set(next);
          if (next && !inTransaction) {
            (self as any).store.history.startTransaction();
            inTransaction = true;
          } else if (!next && inTransaction) {
            (self as any).store.history.endTransaction();
            inTransaction = false;
          }
        },
        beforeDestroy() {
          if (inTransaction) {
            (self as any).store.history.endTransaction();
            inTransaction = false;
          }
        },
      },
    };
  });

export type ImageElementType = Instance<typeof ImageElement>;
