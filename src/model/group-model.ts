import { types, detach, Instance, IAnyModelType } from 'mobx-state-tree';
import { nanoid } from 'nanoid';
import { Node } from './node-model';
import { Shape } from './shape-model';
import { TextElement } from './text-model';
import { ImageElement } from './image-model';
import { VideoElement } from './video-model';
import { LineElement } from './line-model';
import { SVGElement } from './svg-model';
import { FigureElement } from './figure-model';
import { GifElement } from './gif-model';

/** Recursively walk every descendant of a node snapshot or instance */
export const forEveryChild = (node: any, callback: (child: any) => boolean | void) => {
  if (node.children) {
    for (const child of node.children) {
      if (callback(child) === true) break;
      forEveryChild(child, callback);
    }
  }
};

// Slot array for custom registered types (up to 20)
const customTypeSlots: IAnyModelType[] = [];
const lateCustomTypes = [...new Array(20)].map((_v, idx) =>
  types.late<IAnyModelType>(() => customTypeSlots[idx]),
);

export const ElementTypes: IAnyModelType = types.union(
  {
    dispatcher: (snap: any) => {
      const model = TYPES_MAP[snap.type as string];
      if (!model) {
        throw new Error(`Unknown element type: "${snap.type}"`);
      }
      return model;
    },
  },
  SVGElement,
  TextElement,
  ImageElement,
  LineElement,
  VideoElement,
  FigureElement,
  GifElement,
  types.late(() => GroupElement),
  ...lateCustomTypes,
);

export const GroupElement = Node.named('Group')
  .props({
    type: types.optional(types.string, 'group'),
    children: types.array(ElementTypes),
  })
  .views((self) => ({
    get draggable() {
      let result = true;
      forEveryChild(self, (child: any) => {
        if (!child.draggable) result = false;
      });
      return result;
    },
    get resizable() {
      let result = true;
      forEveryChild(self, (child: any) => {
        if (!child.resizable) result = false;
      });
      return result;
    },
    get contentEditable() {
      let result = true;
      forEveryChild(self, (child: any) => {
        if (!child.contentEditable) result = false;
      });
      return result;
    },
    get styleEditable() {
      let result = true;
      forEveryChild(self, (child: any) => {
        if (!child.styleEditable) result = false;
      });
      return result;
    },
    get locked() {
      let result = true;
      forEveryChild(self, (child: any) => {
        if (!child.locked) result = false;
      });
      return result;
    },
  }))
  .actions((self) => ({
    set({
      draggable,
      contentEditable,
      styleEditable,
      resizable,
      ...rest
    }: Record<string, any>) {
      if (draggable !== undefined) forEveryChild(self, (c: any) => c.set({ draggable }));
      if (contentEditable !== undefined) forEveryChild(self, (c: any) => c.set({ contentEditable }));
      if (styleEditable !== undefined) forEveryChild(self, (c: any) => c.set({ styleEditable }));
      if (resizable !== undefined) forEveryChild(self, (c: any) => c.set({ resizable }));
      Object.assign(self, rest);
    },

    addElement(attrs: Record<string, any>, { skipSelect = false } = {}): any {
      const model = TYPES_MAP[attrs.type as string];
      if (!model) {
        console.error('Can not find model with type ' + attrs.type);
        return;
      }
      if (attrs.children) {
        (attrs.children as any[]).forEach((child) => {
          child.id = child.id || nanoid(10);
        });
      }
      const element = model.create({ id: nanoid(10), ...attrs });
      self.children.push(element);
      if (element.selectable && !skipSelect) {
        (self as any).store.selectElements([element.id]);
      }
      return element;
    },

    setElementZIndex(id: string, zIndex: number) {
      const element = self.children.find((c: any) => c.id === id);
      if (element) {
        detach(element);
        self.children.remove(element);
        self.children.splice(zIndex, 0, element);
      }
    },
  }));

export type GroupElementType = Instance<typeof GroupElement>;
export type ElementType = Instance<typeof ElementTypes>;

export const TYPES_MAP: Record<string, IAnyModelType> = {
  svg: SVGElement,
  text: TextElement,
  image: ImageElement,
  group: GroupElement,
  line: LineElement,
  video: VideoElement,
  figure: FigureElement,
  gif: GifElement,
};

export function registerShapeModel(
  props: Record<string, any> & { type: string },
  extender?: (model: IAnyModelType) => IAnyModelType,
) {
  const typeName = props.type;
  if (!typeName) {
    throw new Error('You must pass "type" attribute to custom model.');
  }
  let model: IAnyModelType = Shape.named(typeName).props(props);
  if (extender) {
    model = extender(model);
  }
  TYPES_MAP[typeName] = model;
  customTypeSlots.push(model);
}
