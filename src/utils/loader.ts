'use client';

import { isAnimationUsed } from '../canvas/use-fadein';

let activeLoaders = 0;
let pendingCallbacks: Array<() => void> = [];

let assetLoadTimeout = 30000;
export const setAssetLoadTimeout = (ms: number) => { assetLoadTimeout = ms; };
export const getAssetLoadTimeout = () => assetLoadTimeout;

let fontLoadTimeout = 6000;
export const setFontLoadTimeout = (ms: number) => { fontLoadTimeout = ms; };
export const getFontLoadTimeout = () => fontLoadTimeout;

export function incrementLoader(name: string): () => void {
  activeLoaders += 1;
  let finished = false;
  let timedOut = false;

  const timer = setTimeout(() => {
    if (!finished) {
      triggerLoadError(`Timeout loading asset ${name}`);
      console.error('Timeout triggered for loader. Some assets may not have loaded.', name);
      timedOut = true;
      decrementLoader();
    }
  }, assetLoadTimeout);

  return () => {
    if (finished) {
      console.error('Finish called twice! That is not expected. id: ', name);
      return;
    }
    finished = true;
    if (!timedOut) {
      clearTimeout(timer);
      decrementLoader();
    }
  };
}

export function decrementLoader() {
  activeLoaders -= 1;
  if (activeLoaders === 0) {
    pendingCallbacks.forEach((cb) => cb());
    pendingCallbacks = [];
  }
}

export function whenLoaded(): Promise<true> {
  return new Promise((resolve) => {
    const check = () => {
      if (isAnimationUsed()) {
        setTimeout(resolve, 300);
      } else {
        resolve(true);
      }
    };
    if (activeLoaders === 0) {
      check();
    } else {
      pendingCallbacks.push(check);
    }
  });
}

let errorHandlers: Array<(msg: string) => void> = [];

export function onLoadError(handler: (msg: string) => void) {
  errorHandlers.push(handler);
}

export function triggerLoadError(msg: string) {
  errorHandlers.forEach((h) => h(msg));
}
