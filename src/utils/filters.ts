export enum Effects {
  sepia = 'sepia',
  grayscale = 'grayscale',
  natural = 'natural',
  warm = 'warm',
  cold = 'cold',
  temperature = 'temperature',
  contrast = 'contrast',
  shadows = 'shadows',
  white = 'white',
  black = 'black',
  vibrance = 'vibrance',
  saturation = 'saturation',
}

export function shapeFilterToCSS(
  effect: string,
  intensity?: number,
): { filter: string; html?: string } | null {
  switch (effect) {
    case Effects.warm: {
      const v = Math.max(0, Math.min(1, intensity ?? 0.5));
      const r = 1 + 0.3 * v, g = 1 + 0.15 * v, b = 1;
      return {
        filter: 'url(#warm-filter)',
        html: `
        <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
          <filter id="warm-filter" color-interpolation-filters="sRGB">
            <feColorMatrix type="matrix" values="
              ${r} 0   0   0   0
              0   ${g} 0   0   0
              0   0   ${b} 0   0
              0   0   0   1   0" />
          </filter>
        </svg>`,
      };
    }
    case Effects.cold: {
      const v = Math.max(0, Math.min(1, intensity ?? 0.5));
      const r = 1 - 0.15 * v, g = 1 - 0.1 * v, b = 1 + 0.15 * v;
      return {
        filter: 'url(#cold-filter)',
        html: `
        <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
          <filter id="cold-filter" color-interpolation-filters="sRGB">
            <feColorMatrix type="matrix" values="
              ${r} 0   0   0   0
              0   ${g} 0   0   0
              0   0   ${b} 0   0
              0   0   0   1   0" />
          </filter>
        </svg>`,
      };
    }
    case 'natural': {
      const v = Math.max(0, Math.min(1, intensity ?? 0.5));
      const r = 1 + 0.1 * v, g = 1 + 0.3 * v, b = 1 + 0.2 * v;
      return { filter: `saturate(${g}) brightness(${r}) contrast(${b})` };
    }
    case Effects.temperature: {
      const v = Math.max(-1, Math.min(1, intensity ?? 0));
      const r = 1 + 0.15 * v, g = 1, b = 1 - 0.15 * v;
      return {
        filter: 'url(#temperature-filter)',
        html: `
                  <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
                    <filter id="temperature-filter" color-interpolation-filters="sRGB">
                      <feColorMatrix type="matrix" values="
                        ${r} 0   0   0   0
                        0   ${g} 0   0   0
                        0   0   ${b} 0   0
                        0   0   0   1   0" />
                    </filter>
                  </svg>
                  `,
      };
    }
    case Effects.contrast: {
      const v = 100 * Math.max(-1, Math.min(1, intensity ?? 0));
      const slope = (259 * (v + 255)) / (255 * (259 - v));
      const intercept = 0.5 * (1 - slope);
      return {
        filter: 'url(#contrast-filter)',
        html: `
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <filter id="contrast-filter" color-interpolation-filters="sRGB">
        <feComponentTransfer>
          <feFuncR type="linear" slope="${slope}" intercept="${intercept}" />
          <feFuncG type="linear" slope="${slope}" intercept="${intercept}" />
          <feFuncB type="linear" slope="${slope}" intercept="${intercept}" />
        </feComponentTransfer>
      </filter>
    </svg>
  `,
      };
    }
    case Effects.shadows: {
      const v = Math.max(-1, Math.min(1, intensity ?? 0));
      const exp = Math.min(Math.max(1 - 0.6 * v, 0.4), 2.5);
      return {
        filter: 'url(#shadows-filter)',
        html: `
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <filter id="shadows-filter" color-interpolation-filters="sRGB">
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude="1" exponent="${exp}" offset="0" />
          <feFuncG type="gamma" amplitude="1" exponent="${exp}" offset="0" />
          <feFuncB type="gamma" amplitude="1" exponent="${exp}" offset="0" />
        </feComponentTransfer>
      </filter>
    </svg>
  `,
      };
    }
    case Effects.white:
    case Effects.black:
      return null;
    case Effects.vibrance: {
      const v = Math.max(-1, Math.min(1, intensity ?? 0));
      const lr = 0.299, lg = 0.587, lb = 0.114;
      const s = v >= 0 ? 1 + 1.5 * v : 1 + v;
      const i1 = 1 - s;
      const rr = i1 * lr + s, rg = i1 * lg, rb = i1 * lb;
      const gr = i1 * lr, gg = i1 * lg + s, gb = i1 * lb;
      const br = i1 * lr, bg = i1 * lg, bb = i1 * lb + s;
      return {
        filter: 'url(#vibrance-filter)',
        html: `
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <filter id="vibrance-filter" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="
          ${rr} ${rg} ${rb} 0 0
          ${gr} ${gg} ${gb} 0 0
          ${br} ${bg} ${bb} 0 0
          0     0     0     1 0" />
      </filter>
    </svg>
  `,
      };
    }
    case Effects.saturation: {
      const lr = 0.2126, lg = 0.7152, lb = 0.0722;
      const s = 1 + Math.max(-1, Math.min(1, intensity ?? 0));
      const i1 = 1 - s;
      const rr = i1 * lr + s, rg = i1 * lg, rb = i1 * lb;
      const gr = i1 * lr, gg = i1 * lg + s, gb = i1 * lb;
      const br = i1 * lr, bg = i1 * lg, bb = i1 * lb + s;
      return {
        filter: 'url(#saturation-filter)',
        html: `
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <filter id="saturation-filter" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="
          ${rr} ${rg} ${rb} 0 0
          ${gr} ${gg} ${gb} 0 0
          ${br} ${bg} ${bb} 0 0
          0     0     0     1 0" />
      </filter>
    </svg>
  `,
      };
    }
    default:
      return null;
  }
}
