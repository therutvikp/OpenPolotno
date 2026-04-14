'use client';

import Konva from 'konva';
import { getImageSize, getCrop } from './image';

let _idCounter = 0;
const newId = () => {
  _idCounter += 1;
  return _idCounter.toString();
};

function parseSvgSize(svgEl: SVGSVGElement): { width: number; height: number } {
  const viewBox = svgEl.getAttribute('viewBox');
  const [, , vw, vh] = viewBox?.split(' ') || [];
  const widthAttr = svgEl.getAttribute('width');
  const heightAttr = svgEl.getAttribute('height');

  if (!widthAttr || widthAttr.indexOf('%') >= 0) svgEl.setAttribute('width', vw + 'px');
  if (!heightAttr || heightAttr.indexOf('%') >= 0) svgEl.setAttribute('height', vh + 'px');

  return {
    width: parseFloat(svgEl.getAttribute('width') || vw),
    height: parseFloat(svgEl.getAttribute('height') || vh),
  };
}

function getAccumulatedTransform(el: SVGGraphicsElement): Konva.Transform {
  const matrix = (el.transform?.baseVal?.consolidate()?.matrix) || new DOMMatrix();
  const t = new (Konva as any).Transform([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]);
  if (el.parentNode && (el.parentNode as Element).nodeName !== 'svg') {
    return getAccumulatedTransform(el.parentNode as SVGGraphicsElement).multiply(t);
  }
  return t;
}

function decomposeTransform(el: SVGGraphicsElement) {
  return getAccumulatedTransform(el).decompose();
}

function getAbsoluteOffset(el: Element): { x: number; y: number } {
  const { x, y } = el.getBoundingClientRect();
  if (el.nodeName === 'svg') return { x, y };
  const parent = getAbsoluteOffset(el.parentNode as Element);
  return { x: x + parent.x, y: y + parent.y };
}

function hasText(el: Element): boolean {
  return el.getElementsByTagName('text').length > 0;
}

function hasComplexFill(el: Element): boolean {
  const rectWithUrlFill = [...el.getElementsByTagName('rect')].find((r) => {
    const fill = r.getAttribute('fill');
    return fill && fill.indexOf('url') >= 0;
  });
  return el.getElementsByTagName('image').length > 0 || !!rectWithUrlFill;
}

export function svgToURL(svgString: string): string {
  return 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgString)));
}

function extractFillId(fillAttr: string): string {
  return fillAttr.replace(/url\(([^)]+)\)/, '$1').replace(/'/g, '');
}

function normalizeFontFamily(fontFamily: string): string {
  if (!fontFamily) return 'Roboto';
  if (fontFamily.includes('OpenSans')) return 'Open Sans';
  if (fontFamily.includes('Montserrat')) return 'Montserrat';
  const parts = fontFamily.split(',').map((p) => p.trim());
  return parts[1] || parts[0];
}

function getRootSvg(el: Element): SVGSVGElement {
  if (el.parentNode && el.nodeName !== 'svg') {
    return getRootSvg(el.parentElement!);
  }
  return el as SVGSVGElement;
}

async function processElement(el: Element): Promise<any[]> {
  if (el.nodeName === 'defs') return [];

  const id = el.getAttribute('id') || newId();

  if (el.nodeName === 'text') {
    const lines = Array.from(el.children).map((child) => child.textContent || '');
    if (lines.length === 0) lines.push(el.textContent || '');
    const text = lines.join('\n');
    const fontSize = parseFloat(
      el.getAttribute('font-size') || (el as HTMLElement).style?.fontSize || '20',
    );
    const { x, y, rotation } = decomposeTransform(el as SVGGraphicsElement);
    const bbox = (el as SVGGraphicsElement).getBBox();
    const textAnchor = el.getAttribute('text-anchor') || 'start';
    let align = 'left';
    if (textAnchor === 'middle') align = 'center';
    else if (textAnchor === 'end') align = 'right';

    return [
      {
        type: 'text',
        text,
        id,
        x: x + bbox.x,
        y: y + bbox.y,
        fontSize,
        rotation,
        lineHeight: bbox.height / lines.length / fontSize,
        width: bbox.width,
        height: bbox.height,
        fontFamily: normalizeFontFamily(el.getAttribute('font-family') || ''),
        fontWeight: el.getAttribute('font-weight') || 'normal',
        fontStyle: el.getAttribute('font-style') || 'normal',
        align,
        fill: el.getAttribute('fill') || (el as HTMLElement).style?.fill || 'black',
      },
    ];
  }

  if (el.nodeName === 'image') {
    const { x, y, rotation, scaleX, scaleY } = decomposeTransform(el as SVGGraphicsElement);
    const bbox = (el as SVGGraphicsElement).getBBox();
    const w = bbox.width * scaleX;
    const h = bbox.height * scaleY;
    const src = el.getAttribute('xlink:href') || '';
    const imageSize = await getImageSize(src);
    const crop = getCrop({ width: w, height: h }, imageSize);
    return [{ type: 'image', id, x: x + bbox.x, y: y + bbox.y, width: w, height: h, src, rotation, ...crop }];
  }

  if (el.nodeName === 'rect') {
    const { x, y, rotation } = decomposeTransform(el as SVGGraphicsElement);
    const w = parseFloat(el.getAttribute('width') || '0');
    const h = parseFloat(el.getAttribute('height') || '0');
    const fill = el.getAttribute('fill') || '';
    const hasUrlFill = fill.indexOf('url') >= 0;
    const fillId = hasUrlFill ? extractFillId(fill) : null;
    const fillDef = fillId ? document.querySelector(fillId) : null;

    if (hasUrlFill && fillDef) {
      const useEl = fillDef.querySelector('use');
      const hrefAttr = useEl?.getAttribute('xlink:href');
      const imageEl = hrefAttr ? document.querySelector(hrefAttr) : null;
      if (imageEl) {
        const src = imageEl.getAttribute('xlink:href') || '';
        const imageSize = await getImageSize(src);
        const crop = getCrop({ width: w, height: h }, imageSize);
        const bbox = (el as SVGGraphicsElement).getBBox();
        return [{ type: 'image', id, x: x + bbox.x, y: y + bbox.y, width: w, height: h, src, rotation, ...crop }];
      }
    }

    el.setAttribute('transform', '');
    const bbox = (el as SVGGraphicsElement).getBBox();
    el.setAttribute('x', '0');
    el.setAttribute('y', '0');
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${fillDef?.outerHTML || ''}${el.outerHTML}</svg>`;
    return [{ type: 'svg', id, x: x + bbox.x, y: y + bbox.y, width: w, height: h, src: svgToURL(svgStr) }];
  }

  if (el.nodeName === 'path' || el.nodeName === 'polygon' || el.nodeName === 'circle') {
    const { x, y, rotation, scaleX, scaleY } = decomposeTransform(el as SVGGraphicsElement);
    const bbox = (el as SVGGraphicsElement).getBBox();
    const { width: bw, height: bh } = bbox;
    el.setAttribute('transform', '');
    const fill = el.getAttribute('fill') || '';
    const hasUrlFill = fill.indexOf('url') >= 0;
    const fillId = hasUrlFill ? extractFillId(fill) : null;
    const fillDef = fillId ? document.querySelector(fillId) : null;
    let defs: Element[] = fillDef ? [fillDef] : [];
    if (fillDef?.getAttribute('xlink:href')) {
      const ref = document.querySelector(fillDef.getAttribute('xlink:href')!);
      if (ref) defs.push(ref);
    }
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${bw}" height="${bh}" viewBox="0 0 ${bw} ${bh}"><defs>${defs.map((d) => d.outerHTML).join('')}</defs><g transform="translate(${-bbox.x} ${-bbox.y})">${el.outerHTML}</g></svg>`;
    return [{ type: 'svg', id, x: x + bbox.x * scaleX, y: y + bbox.y * scaleY, width: bw * scaleX, height: bh * scaleY, rotation, src: svgToURL(svgStr) }];
  }

  // Small group — treat as SVG
  if (
    el.nodeName === 'g' &&
    (el as SVGGraphicsElement).getBBox().width < 450 &&
    (el as SVGGraphicsElement).getBBox().height < 450 &&
    !hasText(el) &&
    !hasComplexFill(el)
  ) {
    const bbox = (el as SVGGraphicsElement).getBBox();
    const { width: bw, height: bh } = bbox;
    const bRect = el.getBoundingClientRect();
    const rootSvg = getRootSvg(el);
    const rootRect = rootSvg.getBoundingClientRect();
    const svgSize = parseSvgSize(rootSvg);
    const savedTransform = el.getAttribute('transform');
    el.setAttribute('transform', '');
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}" viewBox="0 0 ${bw} ${bh}"><g transform="translate(${-bbox.x} ${-bbox.y})">${el.outerHTML}</g></svg>`;
    el.setAttribute('transform', savedTransform || '');
    return [
      {
        type: 'svg',
        id,
        x: ((bRect.x - rootRect.x) / rootRect.width) * svgSize.width,
        y: ((bRect.y - rootRect.y) / rootRect.height) * svgSize.height,
        width: bw,
        height: bh,
        name: el.getAttribute('id') || '',
        src: svgToURL(svgStr),
      },
    ];
  }

  // Recurse into children
  const results: any[] = [];
  for (const child of Array.from(el.children)) {
    results.push(...(await processElement(child)));
  }
  return results;
}

export async function svgToJson(svgString: string): Promise<{
  width: number;
  height: number;
  pages: Array<{ id: string; children: any[] }>;
}> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  container.innerHTML = svgString;

  const svgEl = container.querySelector('svg') as SVGSVGElement;
  const { width, height } = parseSvgSize(svgEl);
  const elements: any[] = [];

  for (const child of Array.from(svgEl.children)) {
    elements.push(...(await processElement(child)));
  }

  container.parentElement?.removeChild(container);
  return { width, height, pages: [{ id: newId(), children: elements }] };
}
