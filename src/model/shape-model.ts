import { types, Instance } from 'mobx-state-tree';
import { observable, action } from 'mobx';
import { animate } from '../utils/animations';
import { Node } from './node-model';

export const Animation = types.model('Animation', {
  delay: types.optional(types.number, 0),
  duration: types.optional(types.number, 500),
  enabled: types.optional(types.boolean, true),
  type: types.enumeration<'enter' | 'exit' | 'loop'>('Type', ['enter', 'exit', 'loop']),
  name: types.optional(types.string, 'none'),
  data: types.frozen<Record<string, any>>({}),
});

export const getDiff = (
  current: Record<string, number>,
  next: Record<string, number>,
): Record<string, number> => {
  const diff: Record<string, number> = {};
  for (const key in next) {
    if (typeof current[key] === 'number' && typeof next[key] === 'number') {
      const delta = next[key] - current[key];
      if (delta !== 0) {
        diff[key] = delta;
      }
    }
  }
  return diff;
};

export const ShapeFilter = types.model('ShapeFilter', {
  intensity: types.optional(types.number, 1),
});

export const INDEPENDENT_FILTERS = [
  'temperature',
  'contrast',
  'highlights',
  'shadows',
  'white',
  'black',
  'saturation',
  'vibrance',
];

export const Shape = Node.named('Shape')
  .props({
    x: types.optional(types.number, 0),
    y: types.optional(types.number, 0),
    width: types.optional(types.number, 100),
    height: types.optional(types.number, 100),
    rotation: types.optional(types.number, 0),
    opacity: types.optional(types.number, 1),
    animations: types.array(Animation),
    startOffset: types.optional(types.number, 0),
    endOffset: types.optional(types.number, -1),
    blurEnabled: types.optional(types.boolean, false),
    blurRadius: types.optional(types.number, 10),
    brightnessEnabled: types.optional(types.boolean, false),
    brightness: types.optional(types.number, 0),
    sepiaEnabled: types.optional(types.boolean, false),
    grayscaleEnabled: types.optional(types.boolean, false),
    filters: types.map(ShapeFilter),
    blendMode: types.optional(types.string, 'normal'),
    duotoneEnabled: types.optional(types.boolean, false),
    duotoneShadowColor: types.optional(types.string, '#1a0533'),
    duotoneHighlightColor: types.optional(types.string, '#e8b86d'),
    duotoneOpacity: types.optional(types.number, 1),
    shadowEnabled: types.optional(types.boolean, false),
    shadowBlur: types.optional(types.number, 5),
    shadowOffsetX: types.optional(types.number, 0),
    shadowOffsetY: types.optional(types.number, 0),
    shadowColor: types.optional(types.string, 'black'),
    shadowOpacity: types.optional(types.number, 1),
    visible: types.optional(types.boolean, true),
    draggable: types.optional(types.boolean, true),
    resizable: types.optional(types.boolean, true),
    selectable: types.optional(types.boolean, true),
    contentEditable: types.optional(types.boolean, true),
    styleEditable: types.optional(types.boolean, true),
    alwaysOnTop: types.optional(types.boolean, false),
    showInExport: types.optional(types.boolean, true),
  })
  .preProcessSnapshot((snap: any) => {
    const processed: any = {
      ...snap,
      x: snap.x || 0,
      y: snap.y || 0,
      filters: Array.isArray(snap.filters) ? {} : snap.filters,
    };
    if ('width' in snap) processed.width = processed.width || 1;
    if ('height' in snap) processed.height = processed.height || 1;
    // Legacy: convert "locked" shorthand to individual flags.
    // Only restrict movement/styling — users must still be able to resize and edit text content.
    if (snap.locked) {
      processed.draggable = false;
      processed.styleEditable = false;
      processed.removable = false;
    }
    return processed;
  })
  .views((self) => {
    // Observable proxy object for animated values — avoids recreating on each access
    const animatedValues = observable({
      x: self.x,
      y: self.y,
      width: self.width,
      height: self.height,
      rotation: self.rotation,
      opacity: self.opacity,
      color: (self as any).color,
      fontSize: (self as any).fontSize,
    });

    const setValues = action((vals: Record<string, any>) => {
      Object.assign(animatedValues, vals);
    });

    const applyDelta = action((delta: Record<string, number>) => {
      for (const key in delta) {
        if (typeof (animatedValues as any)[key] === 'number') {
          (animatedValues as any)[key] = (animatedValues as any)[key] + delta[key];
        }
      }
    });

    return {
      /** Returns animated property values at current store time */
      get a(): typeof animatedValues {
        const currentTime = (self as any).store.currentTime;

        setValues({
          x: self.x,
          y: self.y,
          width: self.width,
          height: self.height,
          rotation: self.rotation,
          opacity: self.opacity,
          color: (self as any).color,
          fontSize: (self as any).fontSize,
          cropX: (self as any).cropX,
          cropY: (self as any).cropY,
          cropWidth: (self as any).cropWidth,
          cropHeight: (self as any).cropHeight,
        });

        if (currentTime === 0) return animatedValues;

        const elapsed = currentTime - (self as any).page.startTime;
        const pageDuration = (self as any).page.duration;

        if (elapsed > pageDuration || elapsed < 0) return animatedValues;

        const animatedIds = (self as any).store.animatedElementsIds;
        if (animatedIds.length && !animatedIds.includes(self.id)) return animatedValues;

        // startOffset / endOffset visibility clamp
        const effectiveStart = (self as any).startOffset || 0;
        const rawEnd = (self as any).endOffset;
        const effectiveEnd = rawEnd == null || rawEnd < 0 ? pageDuration : rawEnd;
        if (elapsed < effectiveStart || elapsed > effectiveEnd) {
          setValues({ opacity: 0 });
          return animatedValues;
        }

        // Multiple enter animations — all enabled enter anims play simultaneously
        const enterAnims = self.animations.filter((a) => a.type === 'enter' && a.enabled);
        let inEnterPhase = false;
        let hiddenByEnter = false;

        if (enterAnims.length > 0) {
          // Hide until ALL enter delays have passed (i.e., at least one has started)
          const allBefore = enterAnims.every((a) => elapsed < a.delay);
          if (allBefore) {
            setValues({ opacity: 0 });
            hiddenByEnter = true;
          } else {
            for (const enterAnim of enterAnims) {
              if (elapsed >= enterAnim.delay && elapsed <= enterAnim.delay + enterAnim.duration) {
                inEnterPhase = true;
                const dTime = elapsed - enterAnim.delay;
                const result = animate({ element: self as any, animation: enterAnim, dTime });
                applyDelta(getDiff(self as any, result));
              }
            }
          }
        }

        // Multiple exit animations
        if (!hiddenByEnter) {
          const exitAnims = self.animations.filter((a) => a.type === 'exit' && a.enabled);
          if (exitAnims.length > 0) {
            // Hide once ALL exit delays have passed
            const allAfter = exitAnims.every((a) => elapsed >= pageDuration - a.delay);
            if (allAfter) {
              setValues({ opacity: 0 });
            } else {
              for (const exitAnim of exitAnims) {
                if (
                  !inEnterPhase &&
                  elapsed >= pageDuration - exitAnim.duration - exitAnim.delay &&
                  elapsed <= pageDuration - exitAnim.delay
                ) {
                  const dTime = elapsed - (pageDuration - exitAnim.duration - exitAnim.delay);
                  const result = animate({ element: self as any, animation: exitAnim, dTime });
                  applyDelta(getDiff(self as any, result));
                }
              }
            }
          }
        }

        // Multiple loop animations — all run concurrently
        const loopAnims = self.animations.filter((a) => a.type === 'loop' && a.enabled);
        for (const loopAnim of loopAnims) {
          const result = animate({ element: self as any, animation: loopAnim, dTime: elapsed });
          applyDelta(getDiff(self as any, result));
        }

        return animatedValues;
      },

      animated(prop: string): any {
        return (self as any).a[prop];
      },
    };
  })
  .actions((self) => ({
    setAnimation(type: 'enter' | 'exit' | 'loop', data: Partial<Instance<typeof Animation>>) {
      // Key by (type, name) so multiple named animations can coexist per type.
      // Falls back to type-only lookup when no name is given.
      const name = (data as any).name;
      const existing = name
        ? self.animations.find((a) => a.type === type && a.name === name)
        : self.animations.find((a) => a.type === type);
      if (existing) {
        Object.assign(existing, data);
      } else {
        self.animations.push({ type, ...data } as any);
      }
    },

    setFilter(name: string, intensity: number | null) {
      if (!INDEPENDENT_FILTERS.includes(name)) {
        self.filters.forEach((_val: any, key: string) => {
          if (!INDEPENDENT_FILTERS.includes(key)) {
            self.filters.delete(key);
          }
        });
      }
      if (intensity == null) {
        self.filters.delete(name);
      } else {
        self.filters.set(name, { intensity });
      }
    },
  }));

export type ShapeType = Instance<typeof Shape>;
