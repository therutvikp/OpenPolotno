'use client';

import React from 'react';

export const useDelayer = (
  value: boolean,
  delay = 100,
  immediate = false,
  defaultValue?: boolean,
): readonly [boolean, (v: boolean) => void] => {
  const ref = React.useRef(defaultValue !== undefined ? defaultValue : value);
  const [, forceUpdate] = React.useReducer((n: number) => n + 1, 0);

  const set = React.useCallback(
    (v: boolean) => {
      if (ref.current !== v) {
        ref.current = v;
        forceUpdate();
      }
    },
    [ref],
  );

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Immediately revert to `immediate` value when value === immediate
  if (value === immediate) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    ref.current = immediate;
  }

  React.useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      set(value);
      timerRef.current = null;
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay, immediate]);

  return [ref.current, set] as const;
};
