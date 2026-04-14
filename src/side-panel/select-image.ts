import { getImageSize, getCrop } from '../utils/image';
import { StoreType } from '../model/store';
import { NodeType } from '../model/node-model';

type Props = {
  store: StoreType;
  src: string;
  droppedPos?: { x: number; y: number };
  targetElement?: NodeType;
};

export const selectImage = async ({ src, droppedPos, targetElement, store }: Props): Promise<void> => {
  if (targetElement && targetElement.type === 'svg' && (targetElement as any).contentEditable) {
    const parent = (targetElement as any).parent;
    const zIndex = (targetElement as any).zIndex;
    const s = Object.assign({}, (targetElement as any).toJSON());
    delete s.id;
    store.deleteElements([targetElement.id]);
    parent.addElement(Object.assign(Object.assign({}, s), { type: 'image', src, clipSrc: s.src })).setZIndex(zIndex);
    return;
  }

  targetElement && targetElement.type === 'figure' && (targetElement as any).contentEditable;

  let { width, height } = await getImageSize(src);

  if (targetElement && targetElement.type === 'image' && (targetElement as any).contentEditable) {
    const crop = getCrop(targetElement as any, { width, height });
    (targetElement as any).set(Object.assign({ src }, crop));
    return;
  }

  const ratio = Math.min(store.width / width, store.height / height, 1);
  width *= ratio;
  height *= ratio;
  const x = ((droppedPos?.x) || store.width / 2) - width / 2;
  const y = ((droppedPos?.y) || store.height / 2) - height / 2;

  store.activePage?.addElement({ type: 'image', src, width, height, x, y });
};
