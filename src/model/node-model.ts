import { types, getParentOfType, getSnapshot, hasParentOfType, Instance } from 'mobx-state-tree';
import { nanoid } from 'nanoid';
// Forward references resolved at runtime to avoid circular dependency issues
// Store and Page are resolved lazily via getParentOfType

export const Node = types
  .model('Node', {
    id: types.identifier,
    type: types.optional(types.string, 'none'),
    name: types.optional(types.string, ''),
    opacity: types.optional(types.number, 1),
    custom: types.frozen<any>(),
    visible: types.optional(types.boolean, true),
    selectable: types.optional(types.boolean, true),
    removable: types.optional(types.boolean, true),
    alwaysOnTop: types.optional(types.boolean, false),
    showInExport: types.optional(types.boolean, true),
  })
  .preProcessSnapshot((snap: any) => {
    const processed = { ...snap };
    for (const key in processed) {
      if (processed[key] === null) {
        processed[key] = undefined;
      }
    }
    return processed;
  })
  .postProcessSnapshot((snap: any) => {
    const result: Record<string, any> = {};
    for (const key in snap) {
      if (key[0] !== '_') {
        result[key] = snap[key];
      }
    }
    return result;
  })
  .views((self) => ({
    get locked(): boolean {
      const s = self as any;
      return !(s.draggable || s.contentEditable || s.styleEditable || s.resizable);
    },
    get page(): any {
      // Resolved lazily to avoid circular imports
      const { Page } = require('./page-model');
      return getParentOfType(self, Page);
    },
    get store(): any {
      const { Store } = require('./store');
      return getParentOfType(self, Store);
    },
    get top(): any {
      const { GroupElement } = require('./group-model');
      let current: any = self;
      for (;;) {
        if (!hasParentOfType(current, GroupElement)) {
          return current;
        }
        current = getParentOfType(current, GroupElement);
      }
    },
    get parent(): any {
      const { GroupElement } = require('./group-model');
      const { Page } = require('./page-model');
      const { Store } = require('./store');
      if (hasParentOfType(self, GroupElement)) {
        const group = getParentOfType(self, GroupElement);
        // Access children to trigger MobX tracking
        group && group.children && group.children.length;
        return group;
      }
      if (hasParentOfType(self, Page)) {
        const page = getParentOfType(self, Page);
        page && page.children && page.children.length;
        return page;
      }
      if (hasParentOfType(self, Store)) {
        const store = getParentOfType(self, Store);
        store && store.pages && store.pages.length;
        return store;
      }
      return null;
    },
    get zIndex(): number {
      return (self as any).parent.children.indexOf(self);
    },
  }))
  .actions((self) => ({
    toJSON() {
      return Object.assign({}, getSnapshot(self));
    },
  }))
  .actions((self) => ({
    clone(attrs: Record<string, any> = {}, { skipSelect = false } = {}): any {
      const snap = JSON.parse(JSON.stringify((self as any).toJSON()));
      attrs.id = attrs.id || nanoid(10);
      // Assign new ids to nested children
      const { forEveryChild } = require('./group-model');
      forEveryChild(snap, (child: any) => {
        child.id = nanoid(10);
      });
      Object.assign(snap, attrs);
      return (self as any).page.addElement(snap, { skipSelect });
    },
    set(attrs: Record<string, any>) {
      Object.assign(self, attrs);
    },
    moveUp() {
      (self as any).page.moveElementsUp([self.id]);
    },
    moveTop() {
      (self as any).page.moveElementsTop([self.id]);
    },
    moveDown() {
      (self as any).page.moveElementsDown([self.id]);
    },
    moveBottom() {
      (self as any).page.moveElementsBottom([self.id]);
    },
    setZIndex(zIndex: number) {
      (self as any).parent.setElementZIndex(self.id, zIndex);
    },
    beforeDestroy() {},
  }));

export type NodeType = Instance<typeof Node>;
