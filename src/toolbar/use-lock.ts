'use client';

import { useCallback } from 'react';

export const useLock = ({ store }: { store: any }) => {
  const hasShapes = store.selectedShapes.length > 0;
  const first = store.selectedShapes[0];
  const locked = first?.locked;

  return {
    disabled: !hasShapes,
    locked,
    lock: useCallback(() => {
      store.selectedShapes.forEach((el: any) => {
        el.set({
          draggable: locked,
          contentEditable: locked,
          styleEditable: locked,
          resizable: locked,
          removable: locked,
        });
      });
    }, [locked, store]),
  };
};
