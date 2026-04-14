'use client';

import React from 'react';
import { isGradient, parseColor } from '../utils/gradient';
import Konva from 'konva';
import { ShapeType } from '../model/shape-model';

export const useColor = (
  element: ShapeType,
  value: any = (element as any).fill,
  propName = 'fill',
) =>
  React.useMemo(() => {
    if (!isGradient(value)) {
      return { [propName]: value };
    }

    const { stops, rotation } = parseColor(value);
    const cx = element.a.width / 2;
    const cy = element.a.height / 2;

    const normalizedAngle = ((rotation % 180) + 180) % 180;
    const size = normalizedAngle > 45 && normalizedAngle < 135 ? element.a.width : element.a.height;

    const radians = (Konva.Util as any).degToRad(rotation) - Math.PI / 2;
    const colorStops: any[] = [];
    stops.forEach(({ offset, color }: any) => {
      colorStops.push(offset, color);
    });

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
  }, [value, (element as any).width, (element as any).height]);
