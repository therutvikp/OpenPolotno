import * as mobx from 'mobx';

const _defaults = {
  imageDownScalingEnabled: true,
  removeBackgroundEnabled: true,
  htmlRenderEnabled: false,
  forceTextFitEnabled: false,
  textVerticalResizeEnabled: false,
  textOverflow: 'resize' as string,
  textSplitAllowed: false,
  animationsEnabled: false,
};

type FlagsType = typeof _defaults;

declare global {
  interface Window { __raeditorFlags?: FlagsType; }
}

/**
 * Singleton via window so every bundled copy of this module shares the same
 * MobX observable — avoids stale state when tsup inlines flags.ts into each
 * entry bundle (splitting: false).
 */
function _getFlags(): FlagsType {
  if (typeof window === 'undefined') return mobx.observable({ ..._defaults });
  if (!window.__raeditorFlags) {
    window.__raeditorFlags = mobx.observable({ ..._defaults });
  }
  return window.__raeditorFlags;
}

export const flags = _getFlags();

export const setTextVerticalResizeEnabled = mobx.action((value: boolean) => {
  flags.textVerticalResizeEnabled = value;
});

export const useRemoveBackground = mobx.action((value: boolean) => {
  flags.removeBackgroundEnabled = value;
});

export const useHtmlTextRender = mobx.action((value: boolean) => {
  flags.htmlRenderEnabled = value;
});

export const setDownScalingEnabled = mobx.action((value: boolean) => {
  flags.imageDownScalingEnabled = value;
});

/** @deprecated Use setDownScalingEnabled instead */
export const useDownScaling = mobx.action((value: boolean) => {
  console.warn('useDownScaling is deprecated. Use setDownScalingEnabled instead.');
  setDownScalingEnabled(value);
});

/** @deprecated Use setTextOverflow instead */
export const setForceTextFit = mobx.action((_value: boolean) => {
  console.warn('setForceTextFit is deprecated. Use setTextOverflow instead.');
  flags.textOverflow = 'change-font-size';
});

export const setTextOverflow = mobx.action((value: string) => {
  flags.textOverflow = value;
});

export const setTextSplitAllowed = mobx.action((value: boolean) => {
  flags.textSplitAllowed = value;
});

export const setAnimationsEnabled = mobx.action((value: boolean) => {
  flags.animationsEnabled = value;
});
