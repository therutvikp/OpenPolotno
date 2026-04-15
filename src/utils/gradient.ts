import parse from 'gradient-parser';

export const isGradient = (color: string): boolean =>
  !!color && (color.indexOf('linear-gradient') >= 0 || color.indexOf('radial-gradient') >= 0);

export const isLinearGradient = (color: string): boolean =>
  !!color && color.indexOf('linear-gradient') >= 0;

export const isRadialGradient = (color: string): boolean =>
  !!color && color.indexOf('radial-gradient') >= 0;

const colorStopToString = (stop: any): string => {
  if (stop.type === 'hex') return '#' + stop.value;
  if (stop.type === 'literal') return stop.value;
  return `${stop.type}(${stop.value.join(',')})`;
};

const parseStops = (gradient: any): Array<{ offset: number; color: string }> =>
  gradient.colorStops.map((stop: any, idx: number) => ({
    color: colorStopToString(stop),
    offset: stop.length
      ? parseFloat(stop.length.value) / 100
      : idx / (gradient.colorStops.length - 1),
  }));

export const parseColor = (
  color: string,
): { rotation: number; stops: Array<{ offset: number; color: string }> } => {
  if (!isLinearGradient(color)) {
    if (isRadialGradient(color)) {
      const gradient = (parse as any).parse(color)[0];
      return { rotation: 0, stops: parseStops(gradient) };
    }
    return {
      rotation: 0,
      stops: [
        { offset: 0, color },
        { offset: 1, color },
      ],
    };
  }
  const gradient = (parse as any).parse(color)[0];
  return {
    rotation: parseFloat(gradient.orientation.value),
    stops: parseStops(gradient),
  };
};

export const parseRadialColor = (
  color: string,
): { stops: Array<{ offset: number; color: string }> } => {
  if (!isRadialGradient(color)) {
    return { stops: [{ offset: 0, color }, { offset: 1, color }] };
  }
  const gradient = (parse as any).parse(color)[0];
  return { stops: parseStops(gradient) };
};
