'use client';

import { useCallback } from 'react';

export const useRemoveElement = ({ store }: { store: any }) => {
  const removable = store.selectedElements.filter((e: any) => e.removable);
  return {
    disabled: !removable.length,
    remove: useCallback(() => {
      store.deleteElements(removable.map((e: any) => e.id));
    }, [store, removable]),
  };
};
