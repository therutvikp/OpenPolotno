import { getImageSize } from '../utils/image';
import { StoreType } from '../model/store';
import { NodeType } from '../model/node-model';

type Props = {
  store: StoreType;
  src: string;
  droppedPos?: { x: number; y: number };
  targetElement?: NodeType;
};

export const selectSvg = async ({ src, droppedPos, targetElement, store }: Props): Promise<void> => {
  if (targetElement && targetElement.type === 'image' && (targetElement as any).contentEditable) {
    (targetElement as any).set({ clipSrc: src });
    return;
  }
  if (targetElement && targetElement.type === 'video' && (targetElement as any).contentEditable) {
    (targetElement as any).set({ clipSrc: src });
    return;
  }
  const { width, height } = await getImageSize(src);
  const x = ((droppedPos?.x) || store.width / 2) - width / 2;
  const y = ((droppedPos?.y) || store.height / 2) - height / 2;
  store.activePage?.addElement({ type: 'svg', width, height, x, y, src });
};
