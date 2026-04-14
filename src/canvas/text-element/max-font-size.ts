'use client';

import { TextElementType } from '../../model/text-model';

export function getLimitedFontSize({
  oldText,
  newText,
  element,
}: {
  oldText: string;
  newText: string;
  element: TextElementType;
}): number {
  // Only limit if new text is dramatically longer than old
  if (newText.length / Math.max(20, oldText.length) < 4) {
    return (element as any).fontSize;
  }

  const area = (element as any).width * (element as any).page.computedHeight / newText.length;
  const suggested = 1.5 * Math.sqrt(area);
  return Math.min((element as any).fontSize, Math.max(5, Math.round(suggested)));
}
