export const pxToUnit = ({
  px,
  unit = 'px',
  dpi,
}: {
  px: number;
  unit?: string;
  dpi?: number;
}): number => {
  switch (unit) {
    case 'mm':
      return px / ((dpi ?? 72) / 25.4);
    case 'cm':
      return px / ((dpi ?? 72) / 2.54);
    case 'in':
      return px / (dpi ?? 72);
    case 'pt':
    default:
      return px;
  }
};

export const pxToUnitRounded = ({
  px,
  precious = 2,
  dpi = 72,
  unit = 'px',
}: {
  px: number;
  precious?: number;
  dpi?: number;
  unit?: string;
}): number => parseFloat(pxToUnit({ px, dpi, unit }).toFixed(precious));

export const unitToPx = ({
  unitVal,
  dpi,
  unit,
}: {
  unitVal: number;
  dpi: number;
  unit: string;
}): number => unitVal / pxToUnit({ px: 1, unit, dpi });

export const pxToUnitString = (opts: { px: number; unit?: string; dpi?: number }): string => {
  const val = parseFloat(pxToUnit(opts).toFixed(1));
  switch (opts.unit) {
    case 'pt': return `${Math.round(val)}pt`;
    case 'mm': return `${val}mm`;
    case 'cm': return `${val}cm`;
    case 'in': return `${val}in`;
    default:   return `${Math.round(val)}px`;
  }
};
