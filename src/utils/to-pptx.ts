'use client';

import { loadImage, cropImage } from './image';
import * as svgUtils from './svg';
import { figureToSvg } from './figure-to-svg';
import { removeTags } from './text';
import { pxToUnit } from './unit';
import Konva from 'konva';

// Convert px to PPTX inches (100 DPI)
const pxToIn = (px: number) => pxToUnit({ px, unit: 'in', dpi: 100 });

// Convert opacity (0–1) to PPTX transparency (0–100, inverted)
const opacityToTransparency = (opacity: number) => Math.round(100 * (1 - opacity));

// Convert hex/named color to 6-char hex string
function colorToHex(color: string): string {
  if (!color) return '000000';
  if (/^[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();
  let rgba = (Konva.Util as any).colorToRGBA(color);
  if (!rgba && /^[0-9a-fA-F]{3,6}$/.test(color)) {
    rgba = (Konva.Util as any).colorToRGBA('#' + color);
  }
  if (rgba) {
    return (Konva.Util as any)._rgbToHex(rgba.r, rgba.g, rgba.b).replace('#', '').toLowerCase();
  }
  return color.replace('#', '').toLowerCase() || '000000';
}

// Get PPTX position with rotation correction
function getPptxPos(element: any): { x: number; y: number } {
  const { dx, dy } = (() => {
    const angle = element.rotation;
    const degrees = ((angle % 360) + 360) % 360;
    if (degrees === 0) return { dx: 0, dy: 0 };
    const radians = (degrees * Math.PI) / 180;
    const hw = element.width / 2;
    const hh = element.height / 2;
    return {
      dx: hw * Math.cos(radians) - hh * Math.sin(radians) - hw,
      dy: hw * Math.sin(radians) + hh * Math.cos(radians) - hh,
    };
  })();
  return { x: pxToIn(element.x + dx), y: pxToIn(element.y + dy) };
}

let _pptxPromise: Promise<any> | null = null;

export function getPptxGen(): Promise<any> {
  if ((window as any).PptxGenJS) return Promise.resolve((window as any).PptxGenJS);
  if (_pptxPromise) return _pptxPromise;
  _pptxPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.onload = () => resolve((window as any).PptxGenJS);
    script.src = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js';
    document.head.appendChild(script);
  });
  return _pptxPromise;
}

async function renderImageToPptx({ element, slide }: { element: any; slide: any }): Promise<void> {
  let { src } = element;

  if (element.type === 'svg' && Object.keys(element.colorsReplace || {}).length) {
    const svgStr = await svgUtils.urlToString(src);
    src = svgUtils.replaceColors(svgStr, new Map(Object.entries(element.colorsReplace)));
  }

  const img = await loadImage(src);
  const cropW = img.width * element.cropWidth;
  const cropH = img.height * element.cropHeight;
  const aspect = element.width / element.height;
  let iw: number, ih: number;
  const cropAspect = cropW / cropH;

  if (element.type === 'svg') {
    iw = cropW;
    ih = cropH;
  } else if (aspect >= cropAspect) {
    iw = cropW;
    ih = cropW / aspect;
  } else {
    iw = cropH * aspect;
    ih = cropH;
  }

  let croppedSrc = await cropImage(
    src,
    Object.assign({}, element, {
      cropWidth: iw / img.width,
      cropHeight: ih / img.height,
    }),
  );

  // Apply corner radius / border via canvas
  if (element.cornerRadius || element.borderSize) {
    croppedSrc = await (async (
      base64: string,
      opts: { width: number; height: number; cornerRadius: number; borderSize: number; borderColor: string },
    ) => {
      if (!opts.cornerRadius && !opts.borderSize) return base64;
      const baseImg = await loadImage(base64);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(opts.width));
      canvas.height = Math.max(1, Math.round(opts.height));
      const ctx = canvas.getContext('2d')!;
      const r = Math.max(0, opts.cornerRadius);
      const w = canvas.width;
      const h = canvas.height;

      const drawRoundedRect = (stroke = false) => {
        const radius = Math.min(r, Math.min(w, h) / 2);
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(w - radius, 0);
        ctx.quadraticCurveTo(w, 0, w, radius);
        ctx.lineTo(w, h - radius);
        ctx.quadraticCurveTo(w, h, w - radius, h);
        ctx.lineTo(radius, h);
        ctx.quadraticCurveTo(0, h, 0, h - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        if (stroke && opts.borderSize > 0) {
          ctx.lineWidth = opts.borderSize;
          ctx.strokeStyle = '#' + colorToHex(opts.borderColor);
          ctx.stroke();
        }
      };

      drawRoundedRect(false);
      ctx.save();
      ctx.clip();
      ctx.drawImage(baseImg, 0, 0, w, h);
      ctx.restore();
      if (opts.borderSize > 0) drawRoundedRect(true);
      return canvas.toDataURL('image/png');
    })(croppedSrc, {
      width: element.width,
      height: element.height,
      cornerRadius: element.cornerRadius || 0,
      borderSize: element.borderSize || 0,
      borderColor: element.borderColor || '#000000',
    });
  }

  const pos = getPptxPos(element);
  const imgOpts: Record<string, any> = {
    ...pos,
    w: pxToIn(element.width),
    h: pxToIn(element.height),
    rotate: element.rotation,
    flipH: element.flipX,
    flipV: element.flipY,
    transparency: opacityToTransparency(element.opacity),
  };

  if (element.shadowEnabled) {
    const dist = Math.hypot(element.shadowOffsetX, element.shadowOffsetY) / 2;
    const angle = (180 * Math.atan2(element.shadowOffsetY, element.shadowOffsetX)) / Math.PI;
    imgOpts.shadow = {
      type: 'outer',
      blur: element.shadowBlur / 2,
      offset: dist,
      angle,
      color: colorToHex(element.shadowColor),
      opacity: element.shadowOpacity,
    };
  }

  await slide.addImage({ path: croppedSrc, ...imgOpts });
}

function headTypeToArrowType(type: string): string {
  if (type === 'arrow') return 'arrow';
  if (type === 'triangle') return 'triangle';
  if (type === 'circle') return 'oval';
  if (type === 'square') return 'diamond';
  return 'none';
}

function dashToPptx(dash?: number[]): string | undefined {
  if (!dash || !dash.length) return undefined;
  return dash.length <= 2 ? 'dash' : 'dashDot';
}

const elementHandlers: Record<string, (opts: { element: any; slide: any }) => Promise<void>> = {
  image: renderImageToPptx,
  svg: renderImageToPptx,
  gif: renderImageToPptx,
  text: async ({ element, slide }) => {
    let text = removeTags(element.text || '');
    if (element.textTransform === 'uppercase') text = text.toUpperCase();

    const pos = getPptxPos(element);
    const textOpts: Record<string, any> = {
      ...pos,
      w: pxToIn(element.width),
      h: pxToIn(element.height),
      fontSize: Math.round(0.75 * element.fontSize),
      fontFace: element.fontFamily,
      color: colorToHex(element.fill),
      align: element.align,
      bold: element.fontWeight === 'bold',
      italic: element.fontStyle === 'italic',
      ...(element.textDecoration === 'underline'
        ? { underline: { style: 'sng', color: colorToHex(element.fill) } }
        : {}),
      lineSpacingMultiple: element.lineHeight,
      rotate: element.rotation,
      fit: 'shrink',
      transparency: opacityToTransparency(element.opacity),
      margin: 0,
    };

    if (element.verticalAlign === 'middle') textOpts.valign = 'middle';
    else if (element.verticalAlign === 'bottom') textOpts.valign = 'bottom';
    else textOpts.valign = 'top';

    if (element.letterSpacing) textOpts.charSpacing = element.letterSpacing * textOpts.fontSize;
    if (element.strokeWidth > 0) {
      textOpts.outline = { size: 0.75 * element.strokeWidth, color: colorToHex(element.stroke) };
    }

    if (element.shadowEnabled) {
      const dist = (0.75 * Math.hypot(element.shadowOffsetX, element.shadowOffsetY)) / 2;
      const angle = (180 * Math.atan2(element.shadowOffsetY, element.shadowOffsetX)) / Math.PI;
      textOpts.shadow = {
        type: 'outer',
        blur: 0.75 * element.shadowBlur,
        offset: dist,
        angle,
        color: colorToHex(element.shadowColor),
        opacity: element.shadowOpacity,
      };
    }

    if (element.backgroundEnabled) {
      textOpts.fill = { color: colorToHex(element.backgroundColor) };
      const bgRadius = element.backgroundCornerRadius * (element.fontSize * element.lineHeight * 0.5);
      textOpts.rectRadius = pxToIn(bgRadius);
      const bgPadding = element.backgroundPadding * (element.fontSize * element.lineHeight);
      textOpts.margin = Math.max(0, Math.round(0.75 * bgPadding));
    }

    await slide.addText(text, textOpts);
  },

  line: async ({ element, slide }) => {
    const pos = getPptxPos(element);
    await slide.addShape('line', {
      ...pos,
      w: pxToIn(element.width),
      h: pxToIn(element.height),
      line: {
        color: colorToHex(element.color),
        width: element.height,
        beginArrowType: headTypeToArrowType(element.startHead),
        endArrowType: headTypeToArrowType(element.endHead),
        dashType: dashToPptx(element.dash),
        transparency: opacityToTransparency(element.opacity),
      },
      rotate: element.rotation,
      transparency: opacityToTransparency(element.opacity),
    });
  },

  figure: async ({ element, slide }) => {
    const svgStr = figureToSvg(element);
    const dataUrl = 'data:image/svg+xml;base64,' + btoa(svgStr);
    const img = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(element.width));
    canvas.height = Math.max(1, Math.round(element.height));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pngData = canvas.toDataURL('image/png');
    const pos = getPptxPos(element);
    await slide.addImage({
      path: pngData,
      ...pos,
      w: pxToIn(element.width),
      h: pxToIn(element.height),
      rotate: element.rotation,
      transparency: opacityToTransparency(element.opacity),
    });
  },

  group: async ({ element, slide }) => {
    for (const child of element.children || []) {
      await renderElementToPptx({ element: child, slide });
    }
  },

  video: async ({ element, slide }) => {
    const pos = getPptxPos(element);
    await slide.addMedia({
      type: 'video',
      path: element.src,
      ...pos,
      w: pxToIn(element.width),
      h: pxToIn(element.height),
      rotate: element.rotation,
    });
  },
};

async function renderElementToPptx({ element, slide }: { element: any; slide: any }): Promise<void> {
  if (!element.visible || !element.showInExport) return;
  const handler = elementHandlers[element.type];
  if (handler) {
    await handler({ element, slide });
  } else {
    console.warn(`PPTX export doesn't support ${element.type} type`);
  }
}

export async function jsonToPPTX({ json }: { json: any }): Promise<any> {
  const PptxGenJS = await getPptxGen();
  const pptx = new PptxGenJS();

  pptx.defineLayout({
    name: 'CUSTOM',
    width: pxToIn(json.width),
    height: pxToIn(json.height),
  });
  pptx.layout = 'CUSTOM';

  for (const page of json.pages) {
    const slide = pptx.addSlide();

    // Page background
    if (
      /\.(jpg|jpeg|png|gif)$/i.test(page.background) ||
      page.background.startsWith('data:image') ||
      page.background.startsWith('http')
    ) {
      await slide.addImage({
        path: page.background,
        x: 0,
        y: 0,
        w: pptx.width,
        h: pptx.height,
        sizing: { type: 'contain' },
      });
    } else {
      const bgRgba = (Konva.Util as any).colorToRGBA(page.background);
      const bgHex = (Konva.Util as any)._rgbToHex(bgRgba.r, bgRgba.g, bgRgba.b).replace('#', '');
      slide.background = { color: bgHex };
    }

    for (const element of page.children) {
      await renderElementToPptx({ element, slide });
    }
  }

  pptx.writeFile('test.pptx');
  return pptx;
}
