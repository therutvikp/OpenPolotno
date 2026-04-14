'use client';

import { useCallback } from 'react';
import { duplicateElements } from '../utils/duplicate';

export const useDuplicateElement = ({ store }: { store: any }) => {
  const hasElements = store.selectedElements.length > 0;
  const allNonRemovable = store.selectedElements.every((e: any) => e.removable === false);
  const disabled = !hasElements || allNonRemovable;

  return {
    duplicate: useCallback(() => {
      duplicateElements(store.selectedElements, store);
    }, [store]),
    disabled,
  };
};
