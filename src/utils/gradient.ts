import parse from 'gradient-parser';

export const isGradient = (color: string): boolean =>
  color.indexOf('linear-gradient') >= 0;

const colorStopToString = (stop: any): string => {
  if (stop.type === 'hex') return '#' + stop.value;
  if (stop.type === 'literal') return stop.value;
  return `${stop.type}(${stop.value.join(',')})`;
};

export const parseColor = (
  color: string,
): { rotation: number; stops: Array<{ offset: number; color: string }> } => {
  if (!isGradient(color)) {
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
    stops: gradient.colorStops.map((stop: any, idx: number) => ({
      color: colorStopToString(stop),
      offset: stop.length
        ? parseFloat(stop.length.value) / 100
        : idx / (gradient.colorStops.length - 1),
    })),
  };
};
