import { types, Instance } from 'mobx-state-tree';
import { Shape } from './shape-model';

export const FigureElement = Shape.named('Figure').props({
  type: 'figure',
  subType: types.optional(types.string, 'rect'),
  fill: types.optional(types.string, 'rgb(0, 161, 255)'),
  dash: types.array(types.number),
  strokeWidth: types.optional(types.number, 0),
  stroke: types.optional(types.string, 'rgba(98, 197, 255, 1)'),
  cornerRadius: types.optional(types.number, 0),
});

export type FigureElementType = Instance<typeof FigureElement>;
