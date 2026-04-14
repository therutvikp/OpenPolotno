import { types, Instance } from 'mobx-state-tree';
import { Shape } from './shape-model';

export const TextElement = Shape.named('Text')
  .props({
    type: types.optional(types.string, 'text'),
    text: types.optional(types.string, ''),
    placeholder: types.optional(types.string, ''),
    fontSize: types.optional(types.number, 14),
    fontFamily: types.optional(types.string, 'Roboto'),
    fontStyle: types.optional(types.string, 'normal'),
    fontWeight: types.optional(types.string, 'normal'),
    textDecoration: types.optional(types.string, ''),
    textTransform: types.optional(types.string, 'none'),
    fill: types.optional(types.string, 'black'),
    align: types.optional(types.string, 'center'),
    width: types.optional(types.number, 100),
    height: types.optional(types.number, 0),
    verticalAlign: types.optional(types.string, 'top'),
    strokeWidth: types.optional(types.number, 0),
    stroke: types.optional(types.string, 'black'),
    lineHeight: types.optional(types.union(types.number, types.string), 1.2),
    letterSpacing: types.optional(types.number, 0),
    _editModeEnabled: types.optional(types.boolean, false),
    backgroundEnabled: types.optional(types.boolean, false),
    backgroundColor: types.optional(types.string, '#7ED321'),
    backgroundOpacity: types.optional(types.number, 1),
    backgroundCornerRadius: types.optional(types.number, 0.5),
    backgroundPadding: types.optional(types.number, 0.5),
    curveEnabled: types.optional(types.boolean, false),
    curvePower: types.optional(types.number, 0.5),
  })
  .preProcessSnapshot((snap: any) => ({ ...snap }))
  .actions((self) => ({
    toggleEditMode(value?: boolean) {
      self._editModeEnabled = value != null ? value : !self._editModeEnabled;
      if (self._editModeEnabled) {
        (self as any).store.history.startTransaction();
      } else {
        (self as any).store.history.endTransaction();
      }
    },
  }));

export type TextElementType = Instance<typeof TextElement>;
