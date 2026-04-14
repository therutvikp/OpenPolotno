'use client';

import * as rasterizehtml from 'rasterizehtml';
import { getGoogleFontsVariants } from './fonts';
import { trySetCanvasSize } from './canvas';
import { optimizeCss } from './css-optimizer';
import { resetStyleContent, resetStyle } from './reset-style';

let _hiddenContainer: HTMLDivElement | null = null;

function getHiddenContainer(): HTMLDivElement {
  if (!_hiddenContainer) {
    _hiddenContainer = document.createElement('div');
    _hiddenContainer.id = 'raeditor-hidden-do-not-touch';
    _hiddenContainer.style.overflow = 'hidden';
    _hiddenContainer.style.position = 'relative';
    document.body.appendChild(_hiddenContainer);
    _hiddenContainer.innerHTML = `<style>#raeditor-hidden-do-not-touch {${resetStyleContent}}</style>`;
  }
  return _hiddenContainer;
}

const prerenderCache = new Map<string, Promise<void>>();
const isFirefox = navigator.userAgent.includes('Firefox');

export const prerenderFont = async (fontFamily: string): Promise<void> => {
  if (prerenderCache.has(fontFamily)) return prerenderCache.get(fontFamily);
  const promise = (async () => {
    const html = `<div style="font-family: ${fontFamily}; font-size: 100px;">${fontFamily}<strong>${fontFamily}</strong></div>`;
    const el = document.createElement('div');
    el.innerHTML = html;
    el.style.visibility = 'hidden';
    el.style.position = 'absolute';
    const container = getHiddenContainer();
    container.appendChild(el);
    const delay = isFirefox ? 180 : 50;
    await new Promise((resolve) => setTimeout(resolve, delay));
    container.removeChild(el);
  })();
  prerenderCache.set(fontFamily, promise);
  return promise;
};

export function isContentWrapping({ html }: { html: string }): boolean {
  const el = document.createElement('div');
  el.innerHTML = html;
  el.style.display = 'inline-block';
  el.style.position = 'fixed';
  el.style.top = '0px';
  el.style.left = '0px';
  el.style.zIndex = '1000';
  el.style.whiteSpace = 'nowrap';
  el.style.visibility = 'hidden';
  const container = getHiddenContainer();
  container.appendChild(el);

  const text = el.innerText;
  const child = el.childNodes[0] as HTMLElement;
  if (child) child.style.whiteSpace = 'nowrap';

  const words = text?.split(/\s+/) || [];
  let wrapping = false;
  for (let i = 0; i < words.length; i++) {
    if (child) {
      child.textContent = words[i];
      wrapping = child.scrollWidth > el.clientWidth;
      if (wrapping) break;
    }
  }

  container.removeChild(el);
  return wrapping;
}

export function detectSize(html: string): { width: number; height: number } {
  const el = document.createElement('div');
  el.innerHTML = html;
  el.style.display = 'inline-block';
  el.style.position = 'fixed';
  el.style.top = '0px';
  el.style.left = '0px';
  el.style.zIndex = '1000';
  const container = getHiddenContainer();
  container.appendChild(el);
  const rect = el.getBoundingClientRect();
  container.removeChild(el);
  return { width: rect.width, height: rect.height };
}

const googleFontCache = new Map<string, string>();
const fontStyleCache: Record<string, any> = {};

async function getGoogleFontCss(fontFamily: string, variants: string): Promise<string> {
  const key = `${fontFamily}|${variants}`;
  if (googleFontCache.has(key)) return googleFontCache.get(key)!;
  const url = `https://fonts.googleapis.com/css?family=${fontFamily}:${variants}&display=swap`;
  const css = await (await fetch(url)).text();
  googleFontCache.set(key, css);
  return css;
}

function getLocalFontStyles(fontFamily: string): Array<{ src: string; fontStyle: string; fontWeight: string }> {
  if (fontStyleCache[fontFamily]) return fontStyleCache[fontFamily];
  const rules: CSSFontFaceRule[] = [];
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      const cssRules = sheet.cssRules;
      if (cssRules) {
        for (let j = 0; j < cssRules.length; j++) {
          const rule = cssRules[j];
          if (
            rule instanceof CSSFontFaceRule &&
            rule.style.fontFamily.replace(/['"]/g, '') === fontFamily
          ) {
            rules.push(rule);
          }
        }
      }
    } catch (_) {
      console.warn(`Could not access stylesheet: ${sheet.href}`);
    }
  }
  const styles = rules
    .filter((r) => r.style.fontFamily.replace(/['"]/g, '') === fontFamily)
    .map((r) => ({
      src: r.style.getPropertyValue('src'),
      fontStyle: r.style.getPropertyValue('font-style') || 'normal',
      fontWeight: r.style.getPropertyValue('font-weight') || 'normal',
    }));
  fontStyleCache[fontFamily] = styles;
  return styles;
}

export async function htmlToCanvas({
  html,
  width,
  height,
  fontFamily,
  padding,
  font,
  pixelRatio,
}: {
  html: string;
  width: number;
  height: number;
  fontFamily: string;
  padding: number;
  font?: any;
  pixelRatio: number;
}): Promise<HTMLCanvasElement> {
  let fontCss = '';

  if (fontFamily !== 'Arial' && !font) {
    const variants = getGoogleFontsVariants();
    fontCss = await getGoogleFontCss(fontFamily, variants);
  }

  if (font) {
    const styles: Array<{ src: string; fontStyle?: string; fontWeight?: string }> =
      font.styles ||
      (font.url ? [{ src: `url("${font.url}")` }] : getLocalFontStyles(fontFamily));
    fontCss = '';
    styles.forEach((s) => {
      fontCss += `
      @font-face {
        font-family: '${fontFamily}';
        src: ${s.src};
        font-style: ${s.fontStyle || 'normal'};
        font-weight: ${s.fontWeight || 'normal'};
      }
    `;
    });
  }

  let optimizedCss = '';
  if (fontCss) optimizedCss = optimizeCss(fontCss, html);
  html += optimizedCss + resetStyle;

  const totalWidth = width + 2 * padding;
  const totalHeight = height + 2 * padding;
  const canvas = document.createElement('canvas');
  const cacheBucket: Record<string, any> = {};

  const result = await (rasterizehtml as any).drawHTML(
    `<div style="padding: ${padding}px;" dir="auto">${html}</div>`,
    canvas,
    { width: totalWidth, height: totalHeight, cacheBucket },
  );

  trySetCanvasSize(canvas, totalWidth * pixelRatio, totalHeight * pixelRatio);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(result.image, 0, 0, totalWidth, totalHeight, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}
