'use client';

import Konva from 'konva';
import { ShapeType } from '../model/shape-model';

// Custom pixel-manipulation filters
const customFilters: Record<string, (intensity: number) => (imageData: ImageData) => ImageData> = {
  warm: (intensity) => (imageData) => {
    const data = imageData.data;
    const t = Math.max(0, Math.min(1, intensity));
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(data[i] + 30 * t, 255);
      data[i + 1] = Math.min(data[i + 1] + 15 * t, 255);
    }
    return imageData;
  },
  cold: (intensity) => (imageData) => {
    const data = imageData.data;
    const t = Math.max(0, Math.min(1, intensity));
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(data[i] - 15 * t, 255);
      data[i + 1] = Math.min(data[i + 1] - 10 * t, 255);
      data[i + 2] = Math.min(data[i + 2] + 15 * t, 255);
    }
    return imageData;
  },
  natural: (intensity) => (imageData) => {
    const data = imageData.data;
    const t = Math.max(0, Math.min(1, intensity));
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(data[i] * (1 + 0.1 * t), 255);
      data[i + 1] = Math.min(data[i + 1] * (1 + 0.1 * t), 255);
      data[i + 2] = Math.min(data[i + 2] * (1 + 0.1 * t), 255);
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = Math.min((data[i] - avg) * (1 + 0.2 * t) + avg, 255);
      data[i + 1] = Math.min((data[i + 1] - avg) * (1 + 0.2 * t) + avg, 255);
      data[i + 2] = Math.min((data[i + 2] - avg) * (1 + 0.2 * t) + avg, 255);
    }
    return imageData;
  },
  temperature: (intensity) => (imageData) => {
    const data = imageData.data;
    const t = Math.max(-1, Math.min(1, intensity));
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const b = data[i + 2];
      data[i] = Math.min(Math.max(r + 15 * t, 0), 255);
      data[i + 2] = Math.min(Math.max(b - 15 * t, 0), 255);
    }
    return imageData;
  },
  contrast: (intensity) => (imageData) => {
    const data = imageData.data;
    const t = Math.max(-1, Math.min(1, intensity));
    const factor = (259 * (100 * t + 255)) / (255 * (259 - 100 * t));
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(Math.max(factor * (data[i] - 128) + 128, 0), 255);
      data[i + 1] = Math.min(Math.max(factor * (data[i + 1] - 128) + 128, 0), 255);
      data[i + 2] = Math.min(Math.max(factor * (data[i + 2] - 128) + 128, 0), 255);
    }
    return imageData;
  },
  shadows: (intensity) => (imageData) => {
    const data = imageData.data;
    const t = Math.max(-1, Math.min(1, intensity));
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (avg < 128) {
        const m = 1 + t * (1 - avg / 128) * 2;
        data[i] = Math.min(Math.max(data[i] * m, 0), 255);
        data[i + 1] = Math.min(Math.max(data[i + 1] * m, 0), 255);
        data[i + 2] = Math.min(Math.max(data[i + 2] * m, 0), 255);
      }
    }
    return imageData;
  },
  white: (intensity) => (imageData) => {
    const data = imageData.data;
    const t = Math.max(-1, Math.min(1, intensity));
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const avg = (r + g + b) / 3;
      if (avg > 128) {
        const m = 1 + t * ((avg - 128) / 127);
        data[i] = Math.min(Math.max(r * m, 0), 255);
        data[i + 1] = Math.min(Math.max(g * m, 0), 255);
        data[i + 2] = Math.min(Math.max(b * m, 0), 255);
      }
    }
    return imageData;
  },
  black: (intensity) => (imageData) => {
    const data = imageData.data;
    const t = Math.max(-1, Math.min(1, intensity));
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const avg = (r + g + b) / 3;
      if (avg < 128) {
        const m = 1 + t * ((128 - avg) / 128);
        data[i] = Math.min(Math.max(r * m, 0), 255);
        data[i + 1] = Math.min(Math.max(g * m, 0), 255);
        data[i + 2] = Math.min(Math.max(b * m, 0), 255);
      }
    }
    return imageData;
  },
  vibrance: (intensity) => (imageData) => {
    const data = imageData.data;
    const t = Math.max(-1, Math.min(1, intensity));
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b);
      const satFactor =
        t < 0
          ? (1 - (max === 0 ? 0 : (max - (r + g + b) / 3) / max)) * t * 1.5
          : 0.5 * t;
      data[i] = Math.min(Math.max(r - (max - r) * satFactor, 0), 255);
      data[i + 1] = Math.min(Math.max(g - (max - g) * satFactor, 0), 255);
      data[i + 2] = Math.min(Math.max(b - (max - b) * satFactor, 0), 255);
    }
    return imageData;
  },
  saturation: (intensity) => (imageData) => {
    const data = imageData.data;
    const t = Math.max(-1, Math.min(1, intensity));
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      data[i] = Math.min(Math.max(lum + (r - lum) * (1 + t), 0), 255);
      data[i + 1] = Math.min(Math.max(lum + (g - lum) * (1 + t), 0), 255);
      data[i + 2] = Math.min(Math.max(lum + (b - lum) * (1 + t), 0), 255);
    }
    return imageData;
  },
};

export function applyFilter(node: Konva.Node, element: ShapeType): void {
  const filters: any[] = [];
  const attrs: Record<string, any> = { filters };
  const cacheOpts: Record<string, any> = {};

  if ((element as any).brightnessEnabled) {
    filters.push(Konva.Filters.Brighten);
    attrs.brightness = (element as any).brightness;
  }
  if ((element as any).blurEnabled) {
    filters.push(Konva.Filters.Blur);
    attrs.blurRadius = (element as any).blurRadius;
    if ((element as any).type === 'text' && (element as any).lineHeight < 1) {
      cacheOpts.offset = (element as any).fontSize;
    }
  }
  if ((element as any).sepiaEnabled) filters.push(Konva.Filters.Sepia);
  if ((element as any).grayscaleEnabled) filters.push(Konva.Filters.Grayscale);

  (element as any).filters.forEach((filterVal: any, key: string) => {
    const filterFn = customFilters[key];
    if (filterFn) filters.push(filterFn(filterVal.intensity));
  });

  node.setAttrs(attrs);

  if (filters.length) {
    if (node.width() > 0 && node.height() > 0) {
      node.cache({ ...cacheOpts, pixelRatio: (element as any).store._elementsPixelRatio });
    }
  } else {
    node.clearCache();
  }

  node.getLayer()?.batchDraw();
}
