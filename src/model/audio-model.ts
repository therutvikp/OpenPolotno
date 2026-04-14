import { types, getSnapshot, Instance } from 'mobx-state-tree';

export const Audio = types
  .model('Audio', {
    id: types.identifier,
    src: types.optional(types.string, ''),
    duration: types.optional(types.number, 0),
    startTime: types.optional(types.number, 0),
    endTime: types.optional(types.number, 1),
    volume: types.optional(types.number, 1),
    delay: types.optional(types.number, 0),
    custom: types.frozen<any>(),
  })
  .actions((self) => ({
    toJSON() {
      return Object.assign({}, getSnapshot(self));
    },
  }))
  .actions((self) => ({
    set(attrs: Partial<typeof self>) {
      Object.assign(self, attrs);
    },
  }));

export type AudioType = Instance<typeof Audio>;
