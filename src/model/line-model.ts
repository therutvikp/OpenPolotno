import { types, Instance } from 'mobx-state-tree';
import { Shape } from './shape-model';

export const LineElement = Shape.named('Line').props({
  type: 'line',
  width: types.optional(types.number, 400),
  height: types.optional(types.number, 10),
  color: types.optional(types.string, 'black'),
  dash: types.array(types.number),
  startHead: types.optional(types.string, ''),
  endHead: types.optional(types.string, ''),
});

export type LineElementType = Instance<typeof LineElement>;
