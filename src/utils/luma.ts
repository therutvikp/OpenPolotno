import Konva from 'konva';

export function getBrightness(color: string): number {
  const { r, g, b } = (Konva.Util as any).colorToRGBA(color);
  return (r * 299 + g * 587 + b * 114) / 1000;
}
