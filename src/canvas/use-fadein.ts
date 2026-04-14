'use client';

import React from 'react';
import Konva from 'konva';

let fadeInEnabled = false;

export const toggleFadeInAnimation = (value = !fadeInEnabled) => {
  fadeInEnabled = value;
};

export const isAnimationUsed = () => fadeInEnabled;

export function useFadeIn(ref: React.RefObject<any>, opacity?: number): void {
  const tweenRef = React.useRef<any>();

  React.useLayoutEffect(() => {
    tweenRef.current?.destroy();
  }, [opacity]);

  React.useLayoutEffect(() => {
    if (!fadeInEnabled) return;
    const node = ref.current;
    if (!node) return;
    const currentOpacity = node.opacity();
    if (!currentOpacity) return;

    node.opacity(0);
    tweenRef.current = new Konva.Tween({
      node,
      opacity: currentOpacity,
      onFinish: () => {
        tweenRef.current?.destroy();
      },
    });
    tweenRef.current.play();

    return () => {
      tweenRef.current?.destroy();
    };
  }, []);
}
