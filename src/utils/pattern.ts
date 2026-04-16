'use client';

export interface PatternConfig {
  type: string;
  fg: string;
  bg: string;
  scale: number;
}

export const PATTERNS: Array<{ id: string; label: string }> = [
  { id: 'dots',         label: 'Dots' },
  { id: 'dots-lg',      label: 'Dots LG' },
  { id: 'stripes-h',    label: 'H-Stripes' },
  { id: 'stripes-v',    label: 'V-Stripes' },
  { id: 'stripes-d',    label: 'Diagonal' },
  { id: 'grid',         label: 'Grid' },
  { id: 'crosshatch',   label: 'Crosshatch' },
  { id: 'checkerboard', label: 'Checker' },
  { id: 'bricks',       label: 'Bricks' },
  { id: 'waves',        label: 'Waves' },
  { id: 'zigzag',       label: 'Zigzag' },
  { id: 'triangles',    label: 'Triangles' },
];

export const isPattern = (value: string): boolean =>
  !!value && value.startsWith('pattern(') && value.endsWith(')');

export const parsePattern = (value: string): PatternConfig => {
  const inner = value.slice(8, -1); // strip 'pattern(' and ')'
  const parts = inner.split('|');
  return {
    type: parts[0] || 'dots',
    fg:   parts[1] || '#000000',
    bg:   parts[2] || 'transparent',
    scale: parseFloat(parts[3] || '1') || 1,
  };
};

export const buildPatternValue = (config: Partial<PatternConfig> & { type: string }): string => {
  const { type, fg = '#000000', bg = 'transparent', scale = 1 } = config;
  return `pattern(${type}|${fg}|${bg}|${scale})`;
};

// ---------- canvas tile drawing ----------

const TILE = 20;

const fillBg = (ctx: CanvasRenderingContext2D, w: number, h: number, bg: string) => {
  ctx.clearRect(0, 0, w, h);
  if (bg && bg !== 'transparent' && bg !== 'rgba(0,0,0,0)') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
};

const drawTile = (
  ctx: CanvasRenderingContext2D,
  type: string,
  w: number,
  h: number,
  fg: string,
) => {
  ctx.fillStyle = fg;
  ctx.strokeStyle = fg;

  switch (type) {
    case 'dots':
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'dots-lg':
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.38, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'stripes-h':
      ctx.fillRect(0, 0, w, h / 2);
      break;

    case 'stripes-v':
      ctx.fillRect(0, 0, w / 2, h);
      break;

    case 'stripes-d':
      ctx.lineWidth = 3;
      ctx.beginPath();
      // two parallel diagonal lines to make the pattern tile seamlessly
      for (let i = -1; i <= 2; i++) {
        ctx.moveTo(i * w - h, 0);
        ctx.lineTo(i * w, h);
      }
      ctx.stroke();
      break;

    case 'grid':
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(w, 0);
      ctx.moveTo(0, 0); ctx.lineTo(0, h);
      ctx.stroke();
      break;

    case 'crosshatch':
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = -1; i <= 2; i++) {
        ctx.moveTo(i * w - h, 0); ctx.lineTo(i * w, h);       // \
        ctx.moveTo(i * w,     0); ctx.lineTo(i * w - h, h);   // /
      }
      ctx.stroke();
      break;

    case 'checkerboard': {
      const half = w / 2;
      ctx.fillRect(0, 0, half, half);
      ctx.fillRect(half, half, half, half);
      break;
    }

    case 'bricks':
      ctx.lineWidth = 1.5;
      // top row full brick
      ctx.strokeRect(0.75, 0.75, w - 1.5, h / 2 - 1.5);
      // bottom row two half-bricks
      ctx.strokeRect(-w / 2 + 0.75, h / 2 + 0.75, w - 1.5, h / 2 - 1.5);
      ctx.strokeRect(0.75,          h / 2 + 0.75, w - 1.5, h / 2 - 1.5);
      break;

    case 'waves': {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let x = 0; x <= w; x++) {
        ctx.lineTo(x, h / 2 + Math.sin((x / w) * Math.PI * 2) * (h * 0.3));
      }
      ctx.stroke();
      break;
    }

    case 'zigzag':
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(w, h);
      ctx.stroke();
      break;

    case 'triangles':
      ctx.beginPath();
      ctx.moveTo(w / 2, 1);
      ctx.lineTo(w - 1, h - 1);
      ctx.lineTo(1, h - 1);
      ctx.closePath();
      ctx.fill();
      break;
  }
};

const tileSize = (type: string): { w: number; h: number } => {
  if (type === 'bricks') return { w: TILE * 2, h: TILE };
  return { w: TILE, h: TILE };
};

// Cache by "type|fg|bg" so we don't recreate canvases on every render.
const cache = new Map<string, HTMLCanvasElement>();

export const createPatternCanvas = (config: PatternConfig): HTMLCanvasElement => {
  const key = `${config.type}|${config.fg}|${config.bg}`;
  if (cache.has(key)) return cache.get(key)!;

  const { w, h } = tileSize(config.type);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  fillBg(ctx, w, h, config.bg);
  drawTile(ctx, config.type, w, h, config.fg);
  cache.set(key, canvas);
  return canvas;
};

/** Invalidate the cache entry for a config so the canvas is redrawn next time. */
export const invalidatePatternCache = (config: Pick<PatternConfig, 'type' | 'fg' | 'bg'>) => {
  cache.delete(`${config.type}|${config.fg}|${config.bg}`);
};
