import { getCrop } from '../utils/image';
import { StoreType } from '../model/store';
import { NodeType } from '../model/node-model';

type Props = {
  store: StoreType;
  src: string;
  droppedPos?: { x: number; y: number };
  targetElement?: NodeType;
  attrs?: any;
};

export const selectVideo = async ({ src, droppedPos, targetElement, store, attrs = {} }: Props) => {
  let width = attrs.width || 300;
  let height = attrs.height || 200;

  if (targetElement && targetElement.type === 'video' && (targetElement as any).contentEditable) {
    const crop = getCrop(targetElement as any, { width, height });
    (targetElement as any).set(Object.assign({ src }, crop));
    return;
  }

  const ratio = 0.8 * Math.min(store.width / width, store.height / height, 1);
  width *= ratio;
  height *= ratio;
  const x = ((droppedPos?.x) || store.width / 2) - width / 2;
  const y = ((droppedPos?.y) || store.height / 2) - height / 2;

  return store.activePage?.addElement({ type: 'video', src, width, height, x, y });
};
