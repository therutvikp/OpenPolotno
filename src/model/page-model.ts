import { detach, getParentOfType, getSnapshot, types, Instance } from 'mobx-state-tree';
import { nanoid } from 'nanoid';
import { ElementTypes, forEveryChild, TYPES_MAP } from './group-model';
import { getTotalClientRect } from '../utils/math';

export const Page = types
  .model('Page', {
    id: types.identifier,
    children: types.array(types.late(() => ElementTypes)),
    width: types.optional(types.union(types.number, types.literal('auto')), 'auto'),
    height: types.optional(types.union(types.number, types.literal('auto')), 'auto'),
    background: types.optional(types.string, 'white'),
    bleed: types.optional(types.number, 0),
    custom: types.frozen<any>(),
    duration: types.optional(types.number, 5000),
    _exporting: types.optional(types.boolean, false),
    _rendering: types.optional(types.boolean, false),
    _forceMount: types.optional(types.boolean, false),
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
    get store(): any {
      const { Store } = require('./store');
      return getParentOfType(self, Store);
    },
  }))
  .views((self) => ({
    get startTime(): number {
      let time = 0;
      for (const page of self.store.pages) {
        if (page.id === self.id) return time;
        time += page.duration;
      }
      return time;
    },
    get _exportingOrRendering(): boolean {
      return self._exporting || self._rendering;
    },
  }))
  .views((self) => ({
    get computedWidth(): number {
      return self.width === 'auto' ? self.store.width : (self.width as number);
    },
    get computedHeight(): number {
      return self.height === 'auto' ? self.store.height : (self.height as number);
    },
  }))
  .actions((self) => ({
    toJSON() {
      return JSON.parse(JSON.stringify(getSnapshot(self)));
    },

    _forEachElementUp(ids: string[], callback: (index: number) => void) {
      const indexed = ids.map((id) => ({
        id,
        index: self.children.findIndex((c: any) => c.id === id),
      }));
      indexed.sort((a, b) => b.index - a.index);
      for (const { index } of indexed) {
        if (index === -1) continue;
        const nextChild = index < self.children.length - 1 && self.children[index + 1];
        const nextAlreadySelected = ids.indexOf((nextChild as any)?.id) >= 0;
        if (index !== self.children.length - 1 && !nextAlreadySelected) {
          callback(index);
        }
      }
    },

    _forEachElementDown(ids: string[], callback: (index: number) => void): false {
      const indexed = ids.map((id) => ({
        id,
        index: self.children.findIndex((c: any) => c.id === id),
      }));
      indexed.sort((a, b) => a.index - b.index);
      for (const { index } of indexed) {
        if (index === -1) continue;
        const prevChild = index > 0 && self.children[index - 1];
        const prevAlreadySelected = ids.indexOf((prevChild as any)?.id) >= 0;
        if (index !== 0 && !prevAlreadySelected) {
          callback(index);
        }
      }
      return false;
    },
  }))
  .actions((self) => ({
    clone(attrs: Record<string, any> = {}): any {
      const snap = (self as any).toJSON();
      snap.children.forEach((child: any) => {
        child.id = nanoid(10);
        forEveryChild(child, (c: any) => {
          c.id = nanoid(10);
        });
      });
      const newSnap = { ...snap, id: nanoid(10), ...attrs };
      const page = self.store.addPage(newSnap);
      const currentIndex = self.store.pages.indexOf(self);
      page.setZIndex(currentIndex + 1);
      page.select();
      return page;
    },

    setZIndex(zIndex: number) {
      self.store.setPageZIndex(self.id, zIndex);
    },

    set(attrs: Record<string, any>) {
      Object.assign(self, attrs);
    },

    select() {
      self.store.selectPage(self.id);
    },

    addElement(attrs: Record<string, any>, { skipSelect = false } = {}): any {
      const model = TYPES_MAP[attrs.type];
      if (!model) {
        console.error('Can not find model with type ' + attrs.type);
        return;
      }
      if ('children' in attrs && Array.isArray(attrs.children)) {
        forEveryChild(attrs, (child: any) => {
          child.id = child.id || nanoid(10);
        });
      }

      // Auto-generate name with incrementing counter
      const maxIdx = self.children.reduce((max: number, child: any) => {
        if (child.type === 'group') {
          const groupMax = child.children?.reduce((gMax: number, gc: any) => {
            const match = gc.name?.match(new RegExp(`${attrs.type}-(\\d+)`));
            if (match) return Math.max(gMax, parseInt(match[1], 10) || 0);
            return gMax;
          }, 0);
          return Math.max(max, groupMax || 0);
        }
        const match = child.name?.match(new RegExp(`${attrs.type}-(\\d+)`));
        if (match) return Math.max(max, parseInt(match[1], 10) || 0);
        return max;
      }, 0);

      const element = model.create({
        id: nanoid(10),
        name: `${attrs.type}-${maxIdx + 1}`,
        ...attrs,
      });
      self.children.push(element);
      if ((element as any).selectable && !skipSelect) {
        self.store.selectElements([(element as any).id]);
      }
      return element;
    },

    canMoveElementsUp(ids: string[]): boolean {
      let can = false;
      (self as any)._forEachElementUp(ids, () => { can = true; });
      return can;
    },

    moveElementsUp(ids: string[]) {
      (self as any)._forEachElementUp(ids, (index: number) => {
        const el = self.children[index];
        detach(el);
        self.children.splice(index + 1, 0, el);
      });
    },

    canMoveElementsTop(ids: string[]): boolean {
      return (self as any).canMoveElementsUp(ids);
    },

    moveElementsTop(ids: string[]) {
      const selected: any[] = [];
      const rest: any[] = [];
      self.children.forEach((child: any) => {
        if (ids.includes(child.id)) selected.push(child);
        else rest.push(child);
      });
      self.children.replace(rest.concat(selected));
    },

    canMoveElementsDown(ids: string[]): boolean {
      let can = false;
      (self as any)._forEachElementDown(ids, () => { can = true; });
      return can;
    },

    moveElementsDown(ids: string[]) {
      (self as any)._forEachElementDown(ids, (index: number) => {
        const el = self.children[index];
        detach(el);
        self.children.splice(index - 1, 0, el);
      });
    },

    canMoveElementsBottom(ids: string[]): boolean {
      return (self as any).canMoveElementsDown(ids);
    },

    moveElementsBottom(ids: string[]) {
      const selected: any[] = [];
      const rest: any[] = [];
      self.children.forEach((child: any) => {
        if (ids.includes(child.id)) selected.push(child);
        else rest.push(child);
      });
      self.children.replace(selected.concat(rest));
    },

    setElementZIndex(id: string, zIndex: number) {
      const element = self.children.find((c: any) => c.id === id);
      if (element) {
        detach(element);
        self.children.remove(element);
        self.children.splice(zIndex, 0, element);
      }
    },

    setSize({
      width,
      height,
      useMagic,
      softChange,
    }: {
      width: number;
      height: number;
      useMagic?: boolean;
      softChange?: boolean;
    }) {
      if (useMagic) {
        // Collect non-background elements
        const nonBg: any[] = [];
        const isBackground = (el: any) =>
          el.type === 'image' &&
          el.x < 1 &&
          el.y < 1 &&
          el.width >= self.computedWidth - 2 &&
          el.height >= self.computedHeight - 2;

        forEveryChild(self, (el: any) => {
          if (el.type !== 'group') {
            if (!isBackground(el)) nonBg.push(el);
          }
        });

        const contentRect = nonBg.length
          ? getTotalClientRect(nonBg)
          : { x: 0, y: 0, width: self.computedWidth, height: self.computedHeight };

        const marginFraction = 1 / 4;
        const marginX = Math.max(0, Math.min(contentRect.x, self.computedWidth - contentRect.x - contentRect.width));
        const targetMarginX = self.computedWidth * marginFraction;
        const effectiveMarginX = Math.max(0, marginX - targetMarginX);

        const marginY = Math.max(0, Math.min(contentRect.y, self.computedHeight - contentRect.y - contentRect.height));
        const targetMarginY = self.computedHeight * marginFraction;
        const effectiveMarginY = Math.max(0, marginY - targetMarginY);

        const contentW = self.computedWidth - 2 * effectiveMarginX;
        const contentH = self.computedHeight - 2 * effectiveMarginY;

        const scaleX = width / contentW;
        const scaleY = height / contentH;
        const scale = Math.min(scaleX, scaleY);

        const offsetX = (width - contentW * scale) / 2 - effectiveMarginX * scale;
        const offsetY = (height - contentH * scale) / 2 - effectiveMarginY * scale;

        forEveryChild(self, (el: any) => {
          if (el.type === 'group') return;
          if (isBackground(el)) {
            el.set({
              x: el.x * scale,
              y: el.y * scale,
              width: el.width * scaleX,
              height: el.height * scaleY,
              cropX: 0,
              cropY: 0,
              cropWidth: 1,
              cropHeight: 1,
            });
          } else {
            el.set({
              x: offsetX + el.x * scale,
              y: offsetY + el.y * scale,
              width: el.width * scale,
              height: el.height * scale,
            });
            if (el.type === 'text') el.set({ fontSize: el.fontSize * scale });
            if (el.type === 'figure') el.set({ strokeWidth: el.strokeWidth * scale });
          }
        });
      }

      if (!softChange) {
        (self as any).width = width;
        (self as any).height = height;
      }
    },
  }))
  // Deprecated single-element methods for backwards compat
  .actions((self) => ({
    moveElementUp(id: string) {
      console.warn('page.moveElementUp(id) is deprecated. Please use page.moveElementsUp([id1, id2]) instead.');
      (self as any).moveElementsUp([id]);
    },
    moveElementDown(id: string) {
      console.warn('page.moveElementDown(id) is deprecated. Please use page.moveElementsDown([id1, id2]) instead.');
      (self as any).moveElementsDown([id]);
    },
    moveElementTop(id: string) {
      console.warn('page.moveElementTop(id) is deprecated. Please use page.moveElementsTop([id1, id2]) instead.');
      (self as any).moveElementsTop([id]);
    },
    moveElementBottom(id: string) {
      console.warn('page.moveElementBottom(id) is deprecated. Please use page.moveElementsBottom([id1, id2]) instead.');
      (self as any).moveElementsBottom([id]);
    },
    play() {
      (self as any).store.play({ startTime: self.startTime, endTime: self.startTime + self.duration });
    },
  }));

export type PageType = Instance<typeof Page>;
