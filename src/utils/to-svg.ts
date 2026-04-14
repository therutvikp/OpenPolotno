'use client';

import { cropImage, getCrop, loadImage } from './image';
import * as svgUtils from './svg';
import { injectGoogleFont, injectCustomFont, loadFont } from './fonts';
import { figureToSvg } from './figure-to-svg';
import { Effects, shapeFilterToCSS } from './filters';
import { removeTags } from './text';
import { getCurvePath } from '../canvas/text-element';

// Virtual SVG DOM
interface VNode {
  type: string;
  props: Record<string, any>;
  children: (VNode | null | string)[];
}

function h(type: string, props: Record<string, any>, ...children: (VNode | null | string)[]): VNode {
  return { type, props, children: children || [] };
}

export function fixRatio(svgString: string): string {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  doc.documentElement.setAttribute('preserveAspectRatio', 'none');
  return new XMLSerializer().serializeToString(doc);
}

// Traverse all children recursively
export const forEveryChild = (node: any, callback: (el: any) => boolean | void) => {
  if (node.children) {
    for (const child of node.children) {
      if (callback(child) === true) break;
      forEveryChild(child, callback);
    }
  }
};

async function urlToDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (typeof Buffer !== 'undefined') {
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      return `data:${res.headers.get('content-type') || 'image/png'};base64,${base64}`;
    } else {
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.error('Error converting URL to data URL:', e);
    return url;
  }
}

const renderImageElement = async ({
  element,
}: {
  element: any;
  page?: any;
  store?: any;
}): Promise<VNode> => {
  let { src } = element;

  if (element.type === 'svg') {
    const svgStr = await svgUtils.urlToString(src);
    src = svgUtils.replaceColors(svgStr, new Map(Object.entries(element.colorsReplace || {})));
  } else {
    src = await urlToDataUrl(src);
  }

  let clipMaskId: string | undefined;
  let clipMaskData: string | undefined;
  let maskId: string | undefined;
  let maskData: string | undefined;

  let flipTransform = '';
  if (element.flipX) flipTransform += 'scaleX(-1)';
  if (element.flipY) flipTransform += 'scaleY(-1)';

  if (element.clipSrc) {
    clipMaskId = `clip-img-mask-${element.id}`;
    clipMaskData = await urlToDataUrl(element.clipSrc);
  }
  if (element.maskSrc) {
    maskId = `mask-img-${element.id}`;
    maskData = await urlToDataUrl(element.maskSrc);
  }

  const img = await loadImage(src);
  const cropW = img.width * element.cropWidth;
  const cropH = img.height * element.cropHeight;
  const aspect = element.width / element.height;
  let iw: number, ih: number;
  const cropAspect = cropW / cropH;
  const isStretch =
    (typeof element.stretchEnabled === 'boolean' && element.stretchEnabled) || element.type === 'svg';

  if (isStretch) {
    iw = cropW;
    ih = cropH;
  } else if (aspect >= cropAspect) {
    iw = cropW;
    ih = cropW / aspect;
  } else {
    iw = cropH * aspect;
    ih = cropH;
  }

  const scaleX = iw / img.width;
  const scaleY = ih / img.height;
  const scale = iw / ih > element.width / element.height ? element.height / ih : element.width / iw;
  const totalW = iw * scale / scaleX;
  const totalH = ih * scale / scaleY;
  const offsetX = element.cropX * img.width * scale;
  const offsetY = element.cropY * img.height * scale;

  const clipId = `clip-${element.id}`;
  const cornerR = element.cornerRadius || 0;
  const safeStr = src.replace(/&/g, '&amp;');

  const imageProps: Record<string, any> = {
    href: src.startsWith('data:') || element.type === 'svg' ? safeStr : src,
    x: -offsetX,
    y: -offsetY,
    width: totalW,
    height: totalH,
    preserveAspectRatio: 'none',
    'clip-path': `url(#${clipId})`,
  };

  const defs: VNode[] = [
    h(
      'clipPath',
      { id: clipId },
      h('rect', {
        x: 0,
        y: 0,
        width: element.width,
        height: element.height,
        rx: cornerR || undefined,
        ry: cornerR || undefined,
      }),
    ),
  ];

  if (clipMaskId && clipMaskData) {
    defs.push(
      h(
        'mask',
        { id: clipMaskId, maskUnits: 'userSpaceOnUse', 'mask-type': 'alpha' },
        h('image', {
          href: clipMaskData.replace(/&/g, '&amp;'),
          x: 0,
          y: 0,
          width: element.width,
          height: element.height,
          preserveAspectRatio: 'none',
        }),
      ),
    );
  }

  if (maskId) {
    defs.push(
      h(
        'mask',
        { id: maskId, maskUnits: 'userSpaceOnUse', 'mask-type': 'alpha' },
        h('image', { href: safeStr, ...imageProps }),
      ),
    );
  }

  let imageSrc = safeStr;
  const imgExtraProps: Record<string, any> = {};
  if (maskId && maskData) {
    imageSrc = maskData.replace(/&/g, '&amp;');
    imgExtraProps.mask = `url(#${maskId})`;
  }

  const groupProps: Record<string, any> = { style: { transform: flipTransform } };
  if (clipMaskId) groupProps.mask = `url(#${clipMaskId})`;

  const borderNode =
    (element.borderSize || 0) > 0
      ? h('rect', {
          x: element.borderSize / 2,
          y: element.borderSize / 2,
          width: Math.max(0, element.width - element.borderSize),
          height: Math.max(0, element.height - element.borderSize),
          fill: 'none',
          stroke: element.borderColor,
          'stroke-width': element.borderSize,
          rx: Math.max(0, cornerR - element.borderSize) || undefined,
          ry: Math.max(0, cornerR - element.borderSize) || undefined,
        })
      : null;

  return h(
    'g',
    groupProps,
    h('defs', {}, ...defs),
    h('image', { href: imageSrc, ...imageProps, ...imgExtraProps }),
    borderNode,
  );
};

function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  fontStyle: string,
  letterSpacing = 0,
): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width + Math.max(0, (text ? text.length : 0) - 1) * letterSpacing * fontSize;
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  fontStyle: string,
  letterSpacing = 0,
): string[] {
  const lines: string[] = [];
  text.split('\n').forEach((paragraph) => {
    const words = paragraph.split(' ');
    let current = '';
    for (let i = 0; i < words.length; i++) {
      const test = current + words[i] + ' ';
      if (measureTextWidth(test, fontSize, fontFamily, fontWeight, fontStyle, letterSpacing) > maxWidth + 0.5 && i > 0) {
        lines.push(current.trim());
        current = words[i] + ' ';
      } else {
        current = test;
      }
    }
    lines.push(current.trim());
  });
  return lines;
}

const renderLineHead = ({ element, type }: { element: any; type: string }): VNode | null => {
  const props = {
    'stroke-width': element.height,
    stroke: element.color,
    'line-cap': 'round',
    'stroke-linejoin': 'round',
    fill: element.color,
  };
  if (type === 'arrow') {
    return h('polyline', { points: `${3 * element.height},${2 * -element.height} 0,0 ${3 * element.height},${2 * element.height}`, ...props });
  }
  if (type === 'triangle') {
    return h('polygon', { points: `${3 * element.height},${2 * -element.height} 0,0 ${3 * element.height},${2 * element.height}`, ...props });
  }
  if (type === 'bar') {
    return h('polyline', { points: `0,${2 * -element.height} 0,${2 * element.height}`, ...props });
  }
  if (type === 'circle') {
    return h('circle', { cx: 2 * element.height, cy: 0, r: 2 * element.height, ...props });
  }
  if (type === 'square') {
    return h('polygon', { points: `0,${2 * -element.height} ${4 * element.height},${2 * -element.height} ${4 * element.height},${2 * element.height} 0,${2 * element.height}`, ...props });
  }
  return null;
};

const elementRenderers: Record<string, (opts: { element: any; page: any; store: any; elementHook?: (opts: { dom: VNode; element: any }) => VNode | null }) => Promise<VNode>> = {
  image: renderImageElement,
  svg: renderImageElement,
  gif: renderImageElement,
  text: async ({ element }) => {
    if (element.curveEnabled) {
      const curvePath = getCurvePath(element.width, element.height, element.curvePower, element.fontSize);
      const curvePathId = `curve-path-${element.id}`;
      const text = removeTags(element.text).replace(/\n/g, ' ');
      const bgPadding = element.backgroundPadding * (element.fontSize * element.lineHeight * 0.5);
      const bgNode = element.backgroundEnabled
        ? h('rect', {
            x: -bgPadding, y: -bgPadding,
            width: element.width + 2 * bgPadding,
            height: element.height + 2 * bgPadding,
            fill: element.backgroundColor,
            opacity: element.backgroundOpacity,
            rx: element.backgroundCornerRadius * (element.fontSize * element.lineHeight * 0.5),
            ry: element.backgroundCornerRadius * (element.fontSize * element.lineHeight * 0.5),
          })
        : null;
      return h(
        'g',
        {},
        bgNode,
        h('defs', {}, h('path', { id: curvePathId, d: curvePath, fill: 'none' })),
        h(
          'text',
          {
            fill: element.fill,
            'font-size': element.fontSize + 'px',
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            'font-family': element.fontFamily,
            'font-style': element.fontStyle,
            'font-weight': element.fontWeight,
            'text-decoration': element.textDecoration || undefined,
            'letter-spacing': element.letterSpacing * element.fontSize + 'px',
            'stroke-width': element.strokeWidth || undefined,
            stroke: element.strokeWidth ? element.stroke : undefined,
            'paint-order': element.strokeWidth ? 'stroke fill' : undefined,
          },
          h('textPath', { href: `#${curvePathId}`, startOffset: '50%', innerHTML: text }),
        ),
      );
    }

    let displayText = removeTags(element.text);
    if (element.textTransform === 'uppercase') displayText = displayText.toUpperCase();

    let fontSize = element.fontSize;
    let lines: string[] = [];
    for (;;) {
      lines = wrapText(displayText, element.width, fontSize, element.fontFamily, element.fontWeight, element.fontStyle, element.letterSpacing);
      const maxLineWidth = Math.max(...lines.map((l) => measureTextWidth(l, fontSize, element.fontFamily, element.fontWeight, element.fontStyle, element.letterSpacing)));
      const totalHeight = lines.length * fontSize * element.lineHeight;
      if (maxLineWidth <= element.width && totalHeight <= element.height) break;
      fontSize -= 1;
      if (fontSize < 4) break;
    }

    const lineHeight = fontSize * element.lineHeight;
    const totalHeight = lines.length * lineHeight;
    let startY = fontSize;
    if (element.verticalAlign === 'middle') startY = (element.height - totalHeight) / 2 + fontSize;
    else if (element.verticalAlign === 'bottom') startY = element.height - totalHeight + fontSize;

    const textAnchor =
      element.align === 'center' ? 'middle' : element.align === 'right' ? 'end' : 'start';
    const tspans = lines.map((line, i) =>
      h('tspan', {
        x: element.align === 'center' ? element.width / 2 : element.align === 'right' ? element.width : 0,
        dy: i === 0 ? 0 : lineHeight,
        innerHTML: line,
      }),
    );

    const bgPadding = element.backgroundPadding * (fontSize * element.lineHeight * 0.5);
    const bgNode = element.backgroundEnabled
      ? h('rect', {
          x: -bgPadding, y: -bgPadding,
          width: element.width + 2 * bgPadding,
          height: element.height + 2 * bgPadding,
          fill: element.backgroundColor,
          opacity: element.backgroundOpacity,
          rx: element.backgroundCornerRadius * (fontSize * element.lineHeight * 0.5),
          ry: element.backgroundCornerRadius * (fontSize * element.lineHeight * 0.5),
        })
      : null;

    return h(
      'g',
      {},
      bgNode,
      h(
        'text',
        {
          fill: element.fill,
          y: startY,
          'font-size': fontSize + 'px',
          'text-anchor': textAnchor,
          'font-family': element.fontFamily,
          'font-style': element.fontStyle,
          'font-weight': element.fontWeight,
          'text-decoration': element.textDecoration,
          'line-height': element.lineHeight,
          'letter-spacing': element.letterSpacing * fontSize + 'px',
          'stroke-width': element.strokeWidth,
          stroke: element.stroke,
        },
        ...tspans,
      ),
    );
  },

  line: async ({ element }) =>
    h(
      'g',
      {},
      h('line', {
        x1: 0,
        y1: element.height / 2,
        x2: element.width,
        y2: element.height / 2,
        stroke: element.color,
        'stroke-width': element.height,
        'stroke-dasharray':
          element.dash?.length
            ? element.dash.map((d: number) => d * element.height).join(' ')
            : undefined,
      }),
      h('g', { transform: `translate(0 ${element.height / 2})` }, renderLineHead({ element, type: element.startHead })),
      h('g', { transform: `translate(${element.width} ${element.height / 2}) rotate(180)` }, renderLineHead({ element, type: element.endHead })),
    ),

  figure: async ({ element, elementHook }) => {
    let svgContent = figureToSvg(element);
    svgContent = svgContent.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
    const node = h('g', { innerHTML: svgContent });
    return (elementHook && elementHook({ dom: node, element })) || node;
  },

  group: async ({ element, page, store, elementHook }) => {
    const children = await Promise.all(
      element.children.map((child: any) =>
        renderElement({ element: child, page, store, elementHook }),
      ),
    );
    const node = h('g', { style: { 'transform-origin': 'top left' } }, ...children);
    return (elementHook && elementHook({ dom: node, element })) || node;
  },
};

async function renderElement({
  element,
  page,
  store,
  elementHook,
}: {
  element: any;
  page: any;
  store: any;
  elementHook?: (opts: { dom: VNode; element: any }) => VNode | null;
}): Promise<VNode | null> {
  let renderer = elementRenderers[element.type];
  if (!renderer) {
    renderer = () => Promise.resolve(h('g', {}));
    console.error(`SVG export does not support ${element.type} type...`);
  }

  const inner = await renderer({ element, page, store, elementHook });
  const filters: string[] = [];
  const filterExtras: string[] = [];

  if (element.blurEnabled) filters.push(`blur(${element.blurRadius / 2}px)`);
  if (element.brightnessEnabled) filters.push(`brightness(${100 * element.brightness + 100}%)`);
  if (element.sepiaEnabled) filters.push('sepia()');
  if (element.grayscaleEnabled) filters.push('grayscale()');
  if (element.shadowEnabled) {
    filters.push(`drop-shadow(${element.shadowOffsetX}px ${element.shadowOffsetY}px ${element.shadowBlur}px ${element.shadowColor})`);
  }

  if (element.filters) {
    for (const [key, val] of Object.entries(element.filters) as [string, any][]) {
      const css = shapeFilterToCSS(Effects[key as keyof typeof Effects], val.intensity);
      if (css) {
        filters.push(css.filter);
        if (css.html) {
          filterExtras.push(css.html.replace(/<svg([^>]*)>/, '<g$1>').replace(/<\/svg>/, '</g>'));
        }
      }
    }
  }

  const wrapper = h(
    'g',
    {
      className: 'element',
      id: element.id,
      transform:
        element.type !== 'group'
          ? `translate(${element.x}, ${element.y}) rotate(${element.rotation})`
          : undefined,
      display: element.visible === false ? 'none' : undefined,
      opacity: element.opacity,
      style: {
        'transform-origin': 'top left',
        filter: filters.join(' '),
      },
    },
    inner,
    ...filterExtras.map((e) => h('g', { innerHTML: e })),
  );

  return (elementHook && elementHook({ dom: wrapper, element })) || wrapper;
}

async function fontToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || 'font/ttf';
    const buffer = await res.arrayBuffer();
    let base64: string;
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(buffer).toString('base64');
    } else {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 32768) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      }
      if (typeof btoa !== 'undefined') base64 = btoa(binary);
      else throw new Error('No base64 encoder available');
    }
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.error('Error embedding font:', e);
    return url;
  }
}

export async function jsonToDOM({
  json,
  elementHook,
  fontEmbedding = 'inline',
}: {
  json: any;
  elementHook?: (opts: { dom: VNode; element: any }) => VNode | null;
  fontEmbedding?: 'inline' | 'link';
}): Promise<VNode> {
  const fontFamilies: string[] = [];
  forEveryChild({ children: json.pages }, (el: any) => {
    if (el.type === 'text' && fontFamilies.indexOf(el.fontFamily) === -1) {
      fontFamilies.push(el.fontFamily);
    }
  });

  const fontStyles: (VNode | null)[] =
    fontEmbedding === 'inline'
      ? await Promise.all(
          fontFamilies.map(async (family) => {
            if (family === 'Arial') return null;
            const fontDef = json.fonts?.find((f: any) => f.fontFamily === family);
            if (fontDef) {
              injectCustomFont(fontDef);
              await loadFont(family, 'normal', 'normal');
              await loadFont(family, 'normal', 'bold');
              await loadFont(family, 'normal', 'italic');
              await loadFont(family, 'normal', 'bold-italic');
              const embeddedUrl = await fontToBase64(fontDef.url);
              return h('style', {}, `@font-face { font-family: ${family}; src: url(${embeddedUrl}); }`);
            }
            injectGoogleFont(family);
            await loadFont(family, 'normal', 'normal');
            const apiUrl = `https://fonts.googleapis.com/css?family=${family}:bi,normal,i,b`;
            try {
              const cssText = await (await fetch(apiUrl)).text();
              const urlMatches = cssText
                .match(/url\((.*?)\)/g)
                ?.map((u: string) => u.replace(/url\((.*?)\)/, '$1'))
                .filter((u: string) => u.startsWith('https'));
              if (!urlMatches?.length) throw new Error('No font URLs found');
              const faceRules = await Promise.all(
                urlMatches.map(async (fontUrl: string) => {
                  const dataUrl = await fontToBase64(fontUrl);
                  const styleMatch = cssText.match(/font-style:\s*(.*?);/);
                  const weightMatch = cssText.match(/font-weight:\s*(.*?);/);
                  const fontStyle = styleMatch ? styleMatch[1] : 'normal';
                  const fontWeight = weightMatch ? weightMatch[1] : 'normal';
                  return `@font-face {
                font-family: ${family};
                font-style: ${fontStyle};
                font-weight: ${fontWeight};
                src: url(${dataUrl});
              }`;
                }),
              );
              return h('style', {}, faceRules.join('\n'));
            } catch (e) {
              console.error('Error embedding Google Font:', e);
              return h('defs', {}, h('style', { type: 'text/css', innerHTML: `@import url('${apiUrl}');`.replace(/&/g, '&amp;') }));
            }
          }),
        )
      : [];

  const pages = await Promise.all(
    json.pages.map(async (page: any) => {
      const children = await Promise.all(
        page.children.map((el: any) => renderElement({ element: el, page, store: json, elementHook })),
      );

      const bg = page.background;
      const isImageBg =
        bg.indexOf('url') >= 0 ||
        bg.indexOf('http') >= 0 ||
        bg.indexOf('.jpg') >= 0 ||
        bg.indexOf('.png') >= 0 ||
        bg.indexOf('.jpeg') >= 0;

      let bgNode: VNode;
      if (isImageBg) {
        const img = await loadImage(bg);
        const dataUrl = await cropImage(
          bg,
          Object.assign(
            { width: json.width, height: json.height, x: 0, y: 0 },
            getCrop({ width: json.width, height: json.height }, { width: img.width, height: img.height }),
          ),
        );
        bgNode = h('image', { 'xlink:href': dataUrl, x: 0, y: 0, width: json.width, height: json.height, preserveAspectRatio: 'none' });
      } else {
        bgNode = h('rect', { x: 0, y: 0, width: json.width, height: json.height, fill: bg });
      }

      return h('g', { className: 'page', style: {} }, bgNode, ...children);
    }),
  );

  return h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      'xmlns:xlink': 'http://www.w3.org/1999/xlink',
      viewBox: `0 0 ${json.width} ${json.height}`,
      width: json.width,
      height: json.height,
    },
    ...fontStyles,
    ...pages,
  );
}

function vnodeToString({ dom, nestLevel = 0 }: { dom: VNode | null | string; nestLevel?: number }): string {
  if (typeof dom === 'string') return dom;
  if (!dom) return '';
  const { innerHTML, ...restProps } = dom.props;
  const attrs = Object.keys(restProps)
    .map((key) => {
      const val = restProps[key];
      if (typeof val === 'object') {
        return `${key}="${Object.keys(val).map((k) => `${k}:${val[k]};`).join(' ')}"`;
      }
      if (val == null || val === '') return '';
      return `${key}="${val}"`;
    })
    .filter((a) => a && a.trim().length > 0)
    .join(' ');
  const indent = ' '.repeat(nestLevel);
  return `${indent}<${dom.type}${attrs ? ' ' + attrs : ''}>${innerHTML || '\n' + dom.children.map((c) => vnodeToString({ dom: c, nestLevel: nestLevel + 1 })).join('')}${indent}</${dom.type}>\n`;
}

export async function jsonToSVG({
  json,
  elementHook,
  fontEmbedding = 'inline',
}: {
  json: any;
  elementHook?: (opts: { dom: VNode; element: any }) => VNode | null;
  fontEmbedding?: 'inline' | 'link';
}): Promise<string> {
  const dom = await jsonToDOM({ json, elementHook, fontEmbedding });
  return vnodeToString({ dom });
}
