'use client';

import { removeTags } from './text';

export function optimizeCss(css: string, html: string): string {
  if (!css.includes('@font-face')) return '';

  const usedWeights = new Set<string>();
  const usedStyles = new Set<string>();

  if (html) {
    (html.match(/font-weight:\s*(\d+|bold|normal)/gi) || []).forEach((match) => {
      const val = match.split(':')[1].trim();
      if (val === 'bold') usedWeights.add('700');
      else if (val === 'normal') usedWeights.add('400');
      else if (/^\d+$/.test(val)) usedWeights.add(val);
    });
    (html.match(/font-style:\s*(italic|normal)/gi) || []).forEach((match) => {
      if (match.split(':')[1].trim().toLowerCase() === 'italic') usedStyles.add('italic');
    });
    if (/<(b|strong)\b/i.test(html)) usedWeights.add('700');
    if (/<(i|em)\b/i.test(html)) usedStyles.add('italic');
  }

  const plainText = removeTags(html);
  if (plainText && plainText.trim()) usedWeights.add('400');
  if (usedWeights.size === 0) usedWeights.add('400');

  const hasItalic = usedStyles.has('italic');
  const usedCodePoints = Array.from(new Set(plainText))
    .map((ch) => ch.codePointAt(0))
    .filter((cp): cp is number => cp !== undefined);

  const filtered = css
    .split(/}\s*/)
    .map((block) => (block ? block + '}' : ''))
    .filter((block) => {
      if (!/@font-face/.test(block)) return false;
      const weightMatch = block.match(/font-weight:\s*(\d+)/);
      if (weightMatch && !usedWeights.has(weightMatch[1])) return false;
      if (/font-style:\s*italic/.test(block) && !hasItalic) return false;
      const unicodeRangeMatch = block.match(/unicode-range:\s*([^;]+);/);
      if (!unicodeRangeMatch) return true;
      const ranges = unicodeRangeMatch[1].split(',').map((r) => {
        const [start, end = start] = r.replace('U+', '').split('-').map((h) => parseInt(h, 16));
        return [start, end] as [number, number];
      });
      return usedCodePoints.some((cp) => ranges.some(([s, e]) => cp >= s && cp <= e));
    })
    .join('\n');

  return filtered ? `<style>${filtered}</style>` : '';
}
