'use client';

import Konva from 'konva';
import React from 'react';
import { parseColor, isGradient } from './gradient';
import mensch from 'mensch';

function isInDefs(el: Element): boolean {
  let node: Element | null = el;
  while (node?.parentNode) {
    if ((node as Element).nodeName === 'defs') return true;
    node = node.parentNode as Element;
  }
  return false;
}

function parseStylesheet(doc: Document): Record<string, Record<string, string>> {
  const styles: Record<string, Record<string, string>> = {};
  doc.querySelectorAll('style').forEach((styleEl) => {
    const rules = mensch.parse(styleEl.textContent || '').stylesheet.rules;
    for (const rule of rules) {
      if (rule.selectors) {
        rule.selectors.forEach((selector: string) => {
          const existing = styles[selector] || {};
          rule.declarations.forEach((decl: { name: string; value: string }) => {
            existing[decl.name] = decl.value;
          });
          styles[selector] = existing;
        });
      }
    }
  });
  return styles;
}

function getElementColors(
  el: Element,
  styles: Record<string, Record<string, string>>,
): { fill: string; stroke: string } {
  const result = { fill: '', stroke: '' };
  const classes = (el.getAttribute('class')?.split(' ')) || [];
  const id = el.getAttribute('id');
  let computed: Record<string, string> = {};

  if (id && styles[`#${id}`]) {
    computed = styles[`#${id}`];
  } else {
    classes.forEach((cls) => {
      if (styles[`.${cls}`]) {
        computed = { ...computed, ...styles[`.${cls}`] };
      }
    });
  }
  if (styles[el.nodeName]) {
    computed = { ...computed, ...styles[el.nodeName] };
  }

  const fillAttr = el.getAttribute('fill');
  const strokeAttr = el.getAttribute('stroke');
  const styleEl = el as HTMLElement;

  if (fillAttr && fillAttr !== 'none') {
    result.fill = fillAttr;
  } else if (computed.fill && computed.fill !== 'none') {
    result.fill = computed.fill;
  }

  if (strokeAttr && strokeAttr !== 'none') {
    result.stroke = strokeAttr;
  } else if (computed.stroke && computed.stroke !== 'none') {
    result.stroke = computed.stroke;
  }

  if (!result.fill && styleEl.style?.fill && styleEl.style.fill !== 'none') {
    result.fill = styleEl.style.fill;
  }
  if (!result.stroke && styleEl.style?.stroke && styleEl.style.stroke !== 'none') {
    result.stroke = styleEl.style.stroke;
  }

  if (!result.stroke && !result.fill) {
    const svgEl = (el as SVGElement).ownerSVGElement;
    const parent = svgEl && svgEl !== el ? getElementColors(svgEl, styles) : null;
    if (parent?.fill !== 'currentColor' && parent?.stroke !== 'currentColor') {
      result.fill = 'black';
    }
  }

  return result;
}

const SHAPE_TAGS = ['path', 'rect', 'circle', 'line', 'polygon', 'polyline', 'ellipse', 'text'];

function getColorElements(doc: Document): Element[] {
  const elements: Element[] = [];
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (isInDefs(el)) continue;
    if (el.getAttribute('fill') !== null) elements.push(el);
    if (
      el.getAttribute('stroke') !== null ||
      ((el as HTMLElement).style && (el as HTMLElement).style.fill) ||
      SHAPE_TAGS.indexOf(el.nodeName) >= 0
    ) {
      elements.push(el);
    }
  }
  return elements;
}

export async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  return svgToURL(await res.text());
}

export async function urlToString(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' });
  return res.text();
}

export function getColors(svgString: string): string[] {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const styles = parseStylesheet(doc);
  const elements = getColorElements(doc);
  const colors: string[] = [];

  elements.forEach((el) => {
    const { fill, stroke } = getElementColors(el, styles);
    [fill, stroke].forEach((color) => {
      if (color) {
        let c = color;
        if (c === 'currentColor') c = 'black';
        if ((Konva.Util as any).colorToRGBA(c) && colors.indexOf(c) === -1) {
          colors.push(c);
        }
      }
    });
  });

  return colors;
}

export function svgToURL(svgString: string): string {
  return 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgString)));
}

export async function getSvgSize(url: string): Promise<{ width: number; height: number }> {
  const svgString = await urlToString(url);
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const viewBox = doc.documentElement.getAttribute('viewBox');
  const [, , w, h] = viewBox?.split(' ') || [];
  return { width: parseFloat(w), height: parseFloat(h) };
}

export function fixSize(svgString: string): string {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const viewBox = doc.documentElement.getAttribute('viewBox');
  const [, , vw, vh] = viewBox?.split(' ') || [];
  const widthAttr = doc.documentElement.getAttribute('width');
  const heightAttr = doc.documentElement.getAttribute('height');

  if (!widthAttr) doc.documentElement.setAttribute('width', vw + 'px');
  if ((!heightAttr || heightAttr.indexOf('%') >= 0))
    doc.documentElement.setAttribute('height', vh + 'px');

  if (widthAttr && widthAttr.indexOf('%') >= 0 && heightAttr && heightAttr.indexOf('%') === -1) {
    const ratio = parseFloat(heightAttr) / parseFloat(vh);
    doc.documentElement.setAttribute('width', ratio * parseFloat(vw) + 'px');
  }
  if (heightAttr && heightAttr.indexOf('%') >= 0 && widthAttr && widthAttr.indexOf('%') === -1) {
    const ratio = parseFloat(widthAttr) / parseFloat(vw);
    doc.documentElement.setAttribute('height', ratio * parseFloat(vh) + 'px');
  }
  if (widthAttr === '100%' && heightAttr === '100%') {
    doc.documentElement.setAttribute('width', vw + 'px');
    doc.documentElement.setAttribute('height', vh + 'px');
  }

  return new XMLSerializer().serializeToString(doc);
}

export const sameColors = (a: string, b: string): boolean | undefined => {
  if (!a || !b) return false;
  if (b === 'currentColor' && a === 'black') return true;
  const ca = (Konva.Util as any).colorToRGBA(a);
  const cb = (Konva.Util as any).colorToRGBA(b);
  if (ca && cb) {
    return ca.r === cb.r && ca.g === cb.g && ca.b === cb.b && ca.a === cb.a;
  }
  return undefined;
};

export function replaceColors(svgString: string, replacements: Map<string, string>): string {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const elements = getColorElements(doc);
  const colorKeys = Array.from(replacements.keys());
  const styles = parseStylesheet(doc);

  elements.forEach((el) => {
    const { fill, stroke } = getElementColors(el, styles);
    [
      { prop: 'fill', color: fill },
      { prop: 'stroke', color: stroke },
    ].forEach(({ prop, color }) => {
      const matchKey = colorKeys.find((k) => sameColors(k, color));
      if (matchKey) {
        const replacement = replacements.get(matchKey)!;
        if (isGradient(replacement)) {
          const { rotation, stops } = parseColor(replacement);
          const stopDefs = stops.map((s: any) => ({
            offset: 100 * s.offset + '%',
            'stop-color': s.color,
          }));
          const gradientId = 'color' + Math.round(1e8 * Math.random());
          const svgEl = doc.children[0] as SVGSVGElement;
          const ns = svgEl.namespaceURI;
          const linearGradient = document.createElementNS(ns, 'linearGradient');
          const radians = (Konva.Util as any).degToRad(rotation + 90);
          const x1 = (Math.cos(radians) + 1) / 2;
          const y1 = (Math.sin(radians) + 1) / 2;
          const x2 = (Math.cos(radians + Math.PI) + 1) / 2;
          const y2 = (Math.sin(radians + Math.PI) + 1) / 2;
          linearGradient.setAttribute('x1', 100 * x1 + '%');
          linearGradient.setAttribute('y1', 100 * y1 + '%');
          linearGradient.setAttribute('x2', 100 * x2 + '%');
          linearGradient.setAttribute('y2', 100 * y2 + '%');
          linearGradient.setAttribute('gradientUnits', 'userSpaceOnUse');
          linearGradient.setAttribute('id', gradientId);
          for (const stopDef of stopDefs) {
            const stopEl = document.createElementNS(ns, 'stop');
            for (const attr in stopDef) {
              if (Object.prototype.hasOwnProperty.call(stopDef, attr)) {
                stopEl.setAttribute(attr, (stopDef as any)[attr]);
              }
            }
            linearGradient.appendChild(stopEl);
          }
          const defs =
            svgEl.querySelector('defs') ||
            svgEl.insertBefore(document.createElementNS(ns, 'defs'), svgEl.firstChild);
          defs.appendChild(linearGradient);
          (el as HTMLElement).style[prop as any] = null as any;
          el.setAttribute(prop, `url('#${gradientId}')`);
        } else {
          (el as HTMLElement).style[prop as any] = replacements.get(matchKey)!;
        }
      }
    });
  });

  return svgToURL(new XMLSerializer().serializeToString(doc));
}

export const useSvgColors = (url: string): string[] => {
  const [colors, setColors] = React.useState<string[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setColors([]);
      const svgString = await urlToString(url);
      const result = getColors(svgString);
      if (!cancelled) setColors(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);
  return colors;
};
