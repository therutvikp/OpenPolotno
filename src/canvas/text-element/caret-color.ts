'use client';

import { getBrightness } from '../../utils/luma';
import { TextElementType } from '../../model/text-model';

function getOutlineStyle(element: TextElementType): { outlineSize: number; outlineColor: string } {
  const strokeWidth = (element as any).strokeWidth || 0;
  if (strokeWidth > 0) {
    return { outlineSize: strokeWidth, outlineColor: (element as any).stroke };
  }
  const shadowSize =
    (element as any).shadowEnabled && (element as any).shadowBlur > 0 && (element as any).shadowOpacity > 0.1
      ? (element as any).shadowBlur * (element as any).shadowOpacity
      : 0;
  return { outlineSize: shadowSize, outlineColor: (element as any).shadowColor };
}

export function getOptimalCaretColor(element: TextElementType): string {
  const { outlineSize, outlineColor } = getOutlineStyle(element);
  if (outlineSize < 0.001) return (element as any).fill;

  const fillBrightness = getBrightness((element as any).fill);
  const outlineBrightness = getBrightness(outlineColor);

  return Math.abs(fillBrightness - outlineBrightness) >= 50 ? outlineColor : (element as any).fill;
}
