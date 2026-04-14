import { getImageSize } from '../utils/image';
import { StoreType } from '../model/store';
import { NodeType } from '../model/node-model';

type Props = {
  store: StoreType;
  src: string;
  droppedPos?: { x: number; y: number };
  targetElement?: NodeType;
};

export const selectGif = async ({ src, droppedPos, targetElement, store }: Props): Promise<void> => {
  const { width, height } = await getImageSize(src);
  const x = ((droppedPos?.x) || store.width / 2) - width / 2;
  const y = ((droppedPos?.y) || store.height / 2) - height / 2;
  store.activePage?.addElement({ type: 'gif', width, height, x, y, src });
};
