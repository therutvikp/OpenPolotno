'use client';

import * as mobx from 'mobx';
import { triggerLoadError, getFontLoadTimeout } from './loader';

const TEST_TEXT = 'Some test text;?#D-ПРИВЕТ!1230o9u8i7y6t5r4e3w2q1';

let _googleFonts = mobx.observable(['Roboto', 'Amatic SC', 'Press Start 2P', 'Marck Script', 'Rubik Mono One']);
let _googleFontsChanged = mobx.observable({ value: false });

export function isGoogleFontChanged(): boolean { return _googleFontsChanged.value; }

export function setGoogleFonts(fonts: string[] | 'default') {
  if (fonts === 'default') {
    _googleFontsChanged.value = false;
  } else {
    _googleFontsChanged.value = true;
    _googleFonts.splice(0, _googleFonts.length);
    _googleFonts.push(...fonts);
  }
}

export function getFontsList(): string[] { return _googleFonts; }

export const globalFonts = mobx.observable<any[]>([]);
export function addGlobalFont(font: any) { globalFonts.push(font); }
export function removeGlobalFont(fontFamily: string) {
  const idx = globalFonts.findIndex((f) => f.fontFamily === fontFamily);
  if (idx !== -1) globalFonts.splice(idx, 1);
}
export function replaceGlobalFonts(fonts: any[]) { globalFonts.replace(fonts); }

let _measureCanvas: HTMLCanvasElement | undefined;
function measureText(family: string, fallback = 'sans-serif', style = 'normal', weight = 'normal'): number {
  if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
  const ctx = _measureCanvas.getContext('2d')!;
  ctx.font = `${style} ${weight} 40px '${family}', ${fallback}`;
  return ctx.measureText(TEST_TEXT).width;
}

export function measureFontDom(
  family: string,
  fallback = 'sans-serif',
  style = 'normal',
  weight = 'normal',
): number {
  if (typeof document === 'undefined' || !document.body) return 0;
  const span = document.createElement('span');
  span.textContent = TEST_TEXT;
  span.style.cssText = `
    position:absolute;
    visibility:hidden;
    white-space:nowrap;
    top:-9999px;
    left:-9999px;
    font:${style} ${weight} 90px '${family}', ${fallback};
  `;
  document.body.appendChild(span);
  const width = span.getBoundingClientRect().width;
  span.remove();
  return width;
}

const _loadedFonts: Record<string, boolean> = { Arial: true };

export const isFontLoaded = (family: string): boolean =>
  Object.keys(_loadedFonts).some((k) => k.startsWith(family + '_')) || !!_loadedFonts[family];

function measureSans(style = 'normal', weight = 'normal'): number {
  if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
  const ctx = _measureCanvas.getContext('2d')!;
  ctx.font = `${style} ${weight} 40px sans-serif`;
  return ctx.measureText(TEST_TEXT).width;
}

function measureSerif(style = 'normal', weight = 'normal'): number {
  if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
  const ctx = _measureCanvas.getContext('2d')!;
  ctx.font = `${style} ${weight} 40px serif`;
  return ctx.measureText(TEST_TEXT).width;
}

export async function loadFont(
  family: string,
  style: string,
  weight: string,
  text = '',
): Promise<void> {
  const key = `${family}_${style}_${weight}`;
  if (_loadedFonts[key]) return;

  const hasFontAPI = !!(document.fonts?.load);
  const baselineSans = measureSans(style, weight);

  if (hasFontAPI) {
    try {
      await document.fonts.load(`${style} ${weight} 16px '${family}'`);
      if (baselineSans !== measureText(family, 'sans-serif', style, weight)) {
        _loadedFonts[key] = true;
        return;
      }
    } catch { /* fallback to polling */ }
  }

  const baselineSerif = measureSerif(style, weight);
  const initialWidth = measureText(family, 'sans-serif', style, weight);
  const maxIterations = Math.min(6000, getFontLoadTimeout()) / 60;

  for (let i = 0; i < maxIterations; i++) {
    const sansMeasure = measureText(family, 'sans-serif', style, weight);
    const serifMeasure = measureText(family, 'serif', style, weight);
    if (sansMeasure !== initialWidth || sansMeasure !== baselineSans || serifMeasure !== baselineSerif) {
      await new Promise((r) => setTimeout(r, 100));
      _loadedFonts[key] = true;
      return;
    }
    await new Promise((r) => setTimeout(r, 60));
  }

  console.warn(`Timeout for loading font "${family}". Looks like raeditor can't load it. Is it a correct font family?`);
  triggerLoadError(`Timeout for loading font "${family}"`);
}

const _injectedGoogle: Record<string, boolean> = {};
let _googleFontsVariants = '400,400italic,700,700italic';

export function setGoogleFontsVariants(variants: string) { _googleFontsVariants = variants; }
export function getGoogleFontsVariants(): string { return _googleFontsVariants; }
export function getGoogleFontsUrl(family: string): string {
  return `https://fonts.googleapis.com/css?family=${family.replace(/ /g, '+')}:${_googleFontsVariants}`;
}

export function injectGoogleFont(family: string) {
  if (_injectedGoogle[family]) return;
  const url = getGoogleFontsUrl(family);
  const link = document.createElement('link');
  link.type = 'text/css';
  link.href = url;
  link.rel = 'stylesheet';
  document.getElementsByTagName('head')[0].appendChild(link);
  _injectedGoogle[family] = true;
}

const _injectedCustom: Record<string, boolean> = {};
let _fontStyleEl: HTMLStyleElement | undefined;

export function injectCustomFont(font: {
  fontFamily: string;
  url?: string;
  styles?: Array<{ src: string; fontStyle?: string; fontWeight?: string }>;
}) {
  const { fontFamily } = font;
  if (_injectedCustom[fontFamily]) return;
  if (!font.url && !font.styles) return;

  const styles = font.styles || (font.url ? [{ src: `url("${font.url}")` }] : []);

  if (!_fontStyleEl) {
    _fontStyleEl = document.getElementById('raeditor-font-style') as HTMLStyleElement;
    if (!_fontStyleEl) {
      _fontStyleEl = document.createElement('style');
      _fontStyleEl.id = 'raeditor-font-style';
      document.head.appendChild(_fontStyleEl);
    }
  }

  const sheet = _fontStyleEl.sheet!;
  styles.forEach((style) => {
    sheet.insertRule(
      `
    @font-face{
      font-family:'${fontFamily}';
      src:${style.src};
      font-style:${style.fontStyle || 'normal'};
      font-weight:${style.fontWeight || 'normal'};
      font-display:swap;
    }`,
      sheet.cssRules.length,
    );
  });

  _injectedCustom[fontFamily] = true;
}
