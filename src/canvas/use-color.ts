'use client';

import React from 'react';
import { isLinearGradient, isRadialGradient, parseColor, parseRadialColor } from '../utils/gradient';
import { isPattern, parsePattern, createPatternCanvas } from '../utils/pattern';
import Konva from 'konva';
import { ShapeType } from '../model/shape-model';

// Module-level cache for uploaded pattern images (persists across re-renders)
const uploadedImageCache = new Map<string, HTMLImageElement>();

export const useColor = (
  element: ShapeType,
  value: any = (element as any).fill,
  propName = 'fill',
) => {
  // Async state for uploaded pattern images
  const [loadedImage, setLoadedImage] = React.useState<HTMLImageElement | null>(() => {
    if (isPattern(value) && propName === 'fill') {
      const cfg = parsePattern(value);
      if (cfg.type === 'uploaded') return uploadedImageCache.get(cfg.fg) ?? null;
    }
    return null;
  });

  React.useEffect(() => {
    if (!isPattern(value) || propName !== 'fill') { setLoadedImage(null); return; }
    const cfg = parsePattern(value);
    if (cfg.type !== 'uploaded') { setLoadedImage(null); return; }
    const url = cfg.fg;
    const cached = uploadedImageCache.get(url);
    if (cached) { setLoadedImage(cached); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      uploadedImageCache.set(url, img);
      setLoadedImage(img);
    };
    img.src = url;
    return () => { cancelled = true; };
  }, [value, propName]);

  return React.useMemo(() => {
    if (isLinearGradient(value)) {
      const { stops, rotation } = parseColor(value);
      const cx = element.a.width / 2;
      const cy = element.a.height / 2;

      const normalizedAngle = ((rotation % 180) + 180) % 180;
      const size = normalizedAngle > 45 && normalizedAngle < 135 ? element.a.width : element.a.height;

      const radians = (Konva.Util as any).degToRad(rotation) - Math.PI / 2;
      const colorStops: any[] = [];
      stops.forEach(({ offset, color }: any) => { colorStops.push(offset, color); });

      if (propName === 'fill') {
        return {
          fillLinearGradientStartPointX: cx - (size / 2) * Math.cos(radians),
          fillLinearGradientStartPointY: cy - (size / 2) * Math.sin(radians),
          fillLinearGradientColorStops: colorStops,
          fillLinearGradientEndPointX: cx + (size / 2) * Math.cos(radians),
          fillLinearGradientEndPointY: cy + (size / 2) * Math.sin(radians),
          fill: stops[1]?.color,
          fillPriority: 'linear-gradient',
        };
      }

      return {
        strokeLinearGradientStartPointX: cx - (size / 2) * Math.cos(radians),
        strokeLinearGradientStartPointY: cy - (size / 2) * Math.sin(radians),
        strokeLinearGradientColorStops: colorStops,
        strokeLinearGradientEndPointX: cx + (size / 2) * Math.cos(radians),
        strokeLinearGradientEndPointY: cy + (size / 2) * Math.sin(radians),
      };
    }

    if (isRadialGradient(value)) {
      const { stops } = parseRadialColor(value);
      const cx = element.a.width / 2;
      const cy = element.a.height / 2;
      // Extend to corners so the gradient covers the full element
      const radius = Math.sqrt(cx * cx + cy * cy);
      const colorStops: any[] = [];
      stops.forEach(({ offset, color }: any) => { colorStops.push(offset, color); });

      if (propName === 'fill') {
        return {
          fillRadialGradientStartPointX: cx,
          fillRadialGradientStartPointY: cy,
          fillRadialGradientStartRadius: 0,
          fillRadialGradientEndPointX: cx,
          fillRadialGradientEndPointY: cy,
          fillRadialGradientEndRadius: radius,
          fillRadialGradientColorStops: colorStops,
          fill: stops[stops.length - 1]?.color,
          fillPriority: 'radial-gradient',
        };
      }

      // Konva doesn't support radial stroke gradients — use last stop color
      return { stroke: stops[stops.length - 1]?.color };
    }

    if (isPattern(value) && propName === 'fill') {
      const config = parsePattern(value);
      if (config.type === 'uploaded') {
        if (!loadedImage) return { fill: 'transparent' };
        return {
          fillPatternImage: loadedImage,
          fillPatternRepeat: 'repeat',
          fillPatternScaleX: config.scale,
          fillPatternScaleY: config.scale,
          fillPriority: 'pattern',
          fill: 'transparent',
        };
      }
      const image = createPatternCanvas(config);
      return {
        fillPatternImage: image as unknown as HTMLImageElement,
        fillPatternRepeat: 'repeat',
        fillPatternScaleX: config.scale,
        fillPatternScaleY: config.scale,
        fillPriority: 'pattern',
        fill: config.fg,
      };
    }

    return { [propName]: value };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, loadedImage, (element as any).width, (element as any).height]);
};
