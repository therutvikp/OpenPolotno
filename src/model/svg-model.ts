import { types, Instance } from 'mobx-state-tree';
import { Shape } from './shape-model';

export const SVGElement = Shape.named('SVG')
  .props({
    type: 'svg',
    src: types.optional(types.string, ''),
    maskSrc: types.optional(types.string, ''),
    cropX: types.optional(types.number, 0),
    cropY: types.optional(types.number, 0),
    cropWidth: types.optional(types.number, 1),
    cropHeight: types.optional(types.number, 1),
    keepRatio: types.optional(types.boolean, true),
    stretchEnabled: types.optional(types.boolean, true),
    flipX: types.optional(types.boolean, false),
    flipY: types.optional(types.boolean, false),
    width: types.optional(types.number, 100),
    height: types.optional(types.number, 100),
    borderColor: types.optional(types.string, 'black'),
    borderSize: types.optional(types.number, 0),
    cornerRadius: types.optional(types.number, 0),
    colorsReplace: types.map(types.string),
  })
  .preProcessSnapshot((snap: any) => ({
    ...snap,
    src: snap.src || snap.svgSource,
    colorsReplace: Array.isArray(snap.colorsReplace) ? {} : snap.colorsReplace,
  }))
  .actions((self) => ({
    replaceColor(from: string, to: string) {
      self.colorsReplace.set(from, to);
    },
  }));

export type SVGElementType = Instance<typeof SVGElement>;
