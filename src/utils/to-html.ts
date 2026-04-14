'use client';

import { getCrop, loadImage } from './image';
import * as svgUtils from './svg';
import { figureToSvg } from './figure-to-svg';
import { resetStyleContent } from './reset-style';
import { Effects, shapeFilterToCSS } from './filters';
import { getVideoSize } from './video';
import { getGoogleFontsUrl } from './fonts';
import { forEveryChild } from '../model/group-model';
import { getCurvePath } from '../canvas/text-element';
import { removeTags } from './text';
import Konva from 'konva';

// Virtual DOM node
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

function withOpacity(color: string, opacity: number): string {
  if (opacity === 1) return color;
  const rgba = (Konva.Util as any).colorToRGBA(color);
  if (rgba) return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a * opacity})`;
  return color;
}

const renderImageElement = async ({
  element,
}: {
  element: any;
  page: any;
  store: any;
}): Promise<VNode> => {
  let { src } = element;

  if (element.type === 'svg' && Object.keys(element.colorsReplace || {}).length) {
    const svgStr = await svgUtils.urlToString(src);
    src = svgUtils.replaceColors(svgStr, new Map(Object.entries(element.colorsReplace)));
  }

  let flipTransform = '';
  if (element.flipX) flipTransform += 'scaleX(-1)';
  if (element.flipY) flipTransform += 'scaleY(-1)';
  if (!flipTransform) flipTransform = 'none';

  const maskStyles: Record<string, string> = {};

  if (element.type === 'svg' && element.maskSrc) {
    const base64 = await svgUtils.urlToBase64(src);
    Object.assign(maskStyles, {
      'mask-image': `url(${base64})`,
      'mask-size': '100% 100%',
      'mask-position': '0 0',
      'mask-repeat': 'no-repeat',
      '-webkit-mask-image': `url(${base64})`,
      '-webkit-mask-size': '100% 100%',
      '-webkit-mask-position': '0 0',
      '-webkit-mask-repeat': 'no-repeat',
    });
    src = element.maskSrc;
  } else if (element.clipSrc) {
    const base64 = await svgUtils.urlToBase64(element.clipSrc);
    Object.assign(maskStyles, {
      'mask-image': `url(${base64})`,
      'mask-size': '100% 100%',
      'mask-position': '0 0',
      'mask-repeat': 'no-repeat',
      '-webkit-mask-image': `url(${base64})`,
      '-webkit-mask-size': '100% 100%',
      '-webkit-mask-position': '0 0',
      '-webkit-mask-repeat': 'no-repeat',
    });
  }

  const img = await loadImage(src);
  const cropW = img.width * element.cropWidth;
  const cropH = img.height * element.cropHeight;
  const aspect = element.width / element.height;
  const cropAspect = cropW / cropH;

  let srcW: number, srcH: number;
  if (element.type === 'svg' || element.stretchEnabled) {
    srcW = cropW;
    srcH = cropH;
  } else if (aspect >= cropAspect) {
    srcW = cropW;
    srcH = cropW / aspect;
  } else {
    srcW = cropH * aspect;
    srcH = cropH;
  }

  const scaleX = srcW / img.width;
  const scaleY = srcH / img.height;
  const scale = srcW / srcH > element.width / element.height ? element.height / srcH : element.width / srcW;
  const bgW = srcW * scale / scaleX;
  const bgH = srcH * scale / scaleY;
  const bgX = element.cropX * scale * img.width;
  const bgY = element.cropY * scale * img.height;

  return h('div', {
    style: {
      ...maskStyles,
      width: '100%',
      height: '100%',
      borderRadius: element.cornerRadius + 'px',
      border: element.borderSize ? `${element.borderSize}px solid ${element.borderColor}` : 'none',
      backgroundRepeat: 'no-repeat',
      backgroundImage: `url(${src})`,
      transform: flipTransform,
      backgroundSize: `${Math.round(bgW)}px ${Math.round(bgH)}px`,
      backgroundPositionX: -Math.round(bgX) + 'px',
      backgroundPositionY: -Math.round(bgY) + 'px',
    },
  });
};

const renderLineHead = ({ element, type }: { element: any; type: string }): VNode | null => {
  const props = {
    'stroke-width': element.height,
    stroke: element.color,
    'line-cap': 'round',
    'stroke-linejoin': 'round',
    opacity: element.opacity,
  };
  if (type === 'arrow' || type === 'triangle') {
    return h('polyline', {
      points: `${3 * element.height},${2 * -element.height} 0,0 ${3 * element.height},${2 * element.height}`,
      ...props,
    });
  }
  if (type === 'bar') {
    return h('polyline', { points: `0,${2 * -element.height} 0,${2 * element.height}`, ...props });
  }
  if (type === 'circle') return h('circle', { r: element.height, ...props });
  if (type === 'square') {
    return h('polyline', {
      points: `${-element.height},${-element.height} ${-element.height},${element.height} ${element.height},${element.height} ${element.height},${-element.height}`,
      ...props,
    });
  }
  return null;
};

const elementRenderers: Record<string, (opts: { element: any; page: any; store: any; elementHook?: (opts: { dom: VNode; element: any }) => VNode | null }) => Promise<VNode>> = {
  image: renderImageElement,
  svg: renderImageElement,
  text: async ({ element }) => {
    if (element.curveEnabled) {
      const curvePath = getCurvePath(element.width, element.height, element.curvePower, element.fontSize);
      const text = removeTags(element.text).replace(/\n/g, ' ');
      const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${element.width}" height="${element.height}" style="display: block;">
        <defs><path id="curve-${element.id}" d="${curvePath}" fill="none" /></defs>
        <text
          font-family="'${element.fontFamily}'"
          font-size="${element.fontSize}"
          font-weight="${element.fontWeight}"
          font-style="${element.fontStyle}"
          fill="${element.fill}"
          text-anchor="middle"
          dominant-baseline="central"
          letter-spacing="${element.letterSpacing * element.fontSize}px"${element.textDecoration ? ` text-decoration="${element.textDecoration}"` : ''}${element.strokeWidth ? ` stroke="${element.stroke}" stroke-width="${element.strokeWidth}" paint-order="stroke fill"` : ''}>
          <textPath href="#curve-${element.id}" startOffset="50%">
            ${text}
          </textPath>
        </text>
      </svg>`;
      const bgPadding = element.backgroundPadding * (element.fontSize * element.lineHeight);
      const bgNode = element.backgroundEnabled
        ? h('div', {
            style: {
              position: 'absolute',
              top: -bgPadding / 2 + 'px',
              left: -bgPadding / 2 + 'px',
              width: element.width + bgPadding + 'px',
              height: element.height + bgPadding + 'px',
              backgroundColor: element.backgroundColor,
              opacity: element.backgroundOpacity,
              borderRadius: element.backgroundCornerRadius * (element.fontSize * element.lineHeight * 0.5) + 'px',
            },
          })
        : null;
      const svgNode = h('div', {
        style: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
        innerHTML: svgContent,
      });
      return h('div', { style: { position: 'relative', width: '100%', height: '100%' } }, bgNode, svgNode);
    }

    let gradientStyle: Record<string, string> = { top: '0', left: '0' };
    if (element.fill.indexOf('gradient') >= 0) {
      gradientStyle = {
        ...gradientStyle,
        backgroundColor: element.fill,
        backgroundImage: element.fill,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'repeat',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        MozBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        MozTextFillColor: 'transparent',
      };
    }

    const bgPadding = element.backgroundPadding * (element.fontSize * element.lineHeight);
    const bgNode = h('div', {
      style: {
        position: 'absolute',
        top: -bgPadding / 2 + 'px',
        left: -bgPadding / 2 + 'px',
        display: element.backgroundEnabled ? 'block' : 'none',
        width: element.width + bgPadding + 'px',
        height: element.height + bgPadding + 'px',
        backgroundColor: element.backgroundColor,
        opacity: element.backgroundOpacity,
        borderRadius: element.backgroundCornerRadius * (element.fontSize * element.lineHeight * 0.5) + 'px',
      },
    });

    if (element.verticalAlign === 'middle') {
      gradientStyle.top = '50%';
      gradientStyle.transform = 'translateY(-50%)';
    } else if (element.verticalAlign === 'bottom') {
      gradientStyle.bottom = '0';
    }

    const isHtml = /<[a-z][\s\S]*>/i.test(element.text);
    const textStyle: Record<string, any> = {
      ...gradientStyle,
      position: 'absolute',
      width: element.width + 'px',
      color: element.fill,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      fontSize: element.fontSize + 'px',
      textAlign: element.align,
      fontFamily: `'${element.fontFamily}'`,
      textDecoration: element.textDecoration || 'none',
      textDecorationColor: element.textDecoration ? element.fill : undefined,
      textTransform: element.textTransform || 'none',
      lineHeight: element.lineHeight,
      letterSpacing: element.letterSpacing * element.fontSize + 'px',
      fontStyle: element.fontStyle,
      fontWeight: element.fontWeight,
      WebkitTextStroke: `${element.strokeWidth}px ${element.stroke}`,
      textStroke: `${element.strokeWidth}px ${element.stroke}`,
      paintOrder: element.strokeWidth ? 'stroke fill' : undefined,
    };

    const elId = 'el-' + element.id;
    const extraProps = isHtml ? { id: elId } : {};
    const resetStyles = `<style>#${elId} {${resetStyleContent}}</style>`;
    const textNode = h('div', {
      style: textStyle,
      ...extraProps,
      innerHTML: isHtml
        ? `${resetStyles}${element.text}`
        : element.text.split('\n').join('<br />'),
    });

    return h('div', { style: { position: 'relative', width: '100%', height: '100%' } }, bgNode, textNode);
  },

  line: async ({ element }) =>
    h(
      'svg',
      { style: { width: '100%', height: '100%', contain: 'layout style size', overflow: 'visible' } },
      h('rect', { x: 0, y: 0, width: element.width, height: element.height, fill: element.color }),
      h('g', { transform: `translate(0 ${element.height / 2})` }, renderLineHead({ element, type: element.startHead })),
      h('g', { transform: `translate(${element.width} ${element.height / 2}) rotate(180)` }, renderLineHead({ element, type: element.endHead })),
    ),

  figure: async ({ element, elementHook }) => {
    const svgStr = figureToSvg(element);
    const node = h('div', { innerHTML: svgStr });
    return (elementHook && elementHook({ dom: node, element })) || node;
  },

  group: async ({ element, page, store, elementHook }) => {
    const children = await Promise.all(
      element.children.map((child: any) => renderElement({ element: child, page, store, elementHook })),
    );
    const node = h('div', { style: { transformOrigin: 'top left', opacity: element.opacity } }, ...children);
    return (elementHook && elementHook({ dom: node, element })) || node;
  },

  video: async ({ element, elementHook }) => {
    const { cropX, cropY, cropWidth, cropHeight } = element;
    const videoSize = await getVideoSize(element.src);
    const cropW = videoSize.width * cropWidth;
    const cropH = videoSize.height * cropHeight;
    const aspect = element.width / element.height;
    let vw: number, vh: number;
    if (aspect >= cropW / cropH) {
      vw = cropW;
      vh = cropW / aspect;
    } else {
      vw = cropH * aspect;
      vh = cropH;
    }
    const scale = vw / cropWidth;
    const uh = vh / cropHeight;
    const scaleW = Math.max(element.width / videoSize.width, element.height / videoSize.height);
    const videoStyle = {
      position: 'absolute',
      width: `${Math.round((vw / cropWidth) * scaleW)}px`,
      height: `${Math.round((vh / cropHeight) * scaleW)}px`,
      left: -Math.round(cropX * videoSize.width * scaleW) + 'px',
      top: -Math.round(cropY * videoSize.height * scaleW) + 'px',
      objectFit: 'fill',
    };
    const videoId = `video-${element.id}`;
    const node = h(
      'div',
      {
        style: {
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: element.cornerRadius + 'px',
          border: element.borderSize ? `${element.borderSize}px solid ${element.borderColor}` : 'none',
        },
      },
      h('video', {
        id: videoId,
        src: element.src,
        style: videoStyle,
        controls: true,
        playsInline: true,
        muted: true,
        volume: element.volume,
      }),
    );
    return (elementHook && elementHook({ dom: node, element })) || node;
  },

  gif: renderImageElement,
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
    renderer = () => Promise.resolve(h('div', {}));
    console.error(`HTML export does not support ${element.type} type...`);
  }

  if (!element.visible) return null;

  const inner = await renderer({ element, page, store, elementHook });
  const filters: string[] = [];
  const extras: string[] = [];

  if (element.blurEnabled) filters.push(`blur(${element.blurRadius / 2}px)`);
  if (element.brightnessEnabled) filters.push(`brightness(${100 * element.brightness + 100}%)`);
  if (element.sepiaEnabled) filters.push('sepia()');
  if (element.grayscaleEnabled) filters.push('grayscale()');

  if (element.filters) {
    for (const [key, val] of Object.entries(element.filters) as [string, any][]) {
      const css = shapeFilterToCSS(Effects[key as keyof typeof Effects], val.intensity);
      if (css) {
        filters.push(css.filter);
        if (css.html) extras.push(css.html);
      }
    }
  }

  if (element.shadowEnabled) {
    const shadowColor = withOpacity(element.shadowColor, element.shadowOpacity ?? 1);
    filters.push(`drop-shadow(${element.shadowOffsetX}px ${element.shadowOffsetY}px ${element.shadowBlur / 2}px ${shadowColor})`);
  }

  const wrapper = h(
    'div',
    {
      id: element.id,
      style: {
        position: 'absolute',
        left: element.x + 'px',
        top: element.y + 'px',
        width: element.width + 'px',
        height: element.height + 'px',
        transform: `rotate(${element.rotation}deg)`,
        transformOrigin: 'top left',
        opacity: element.opacity,
        display: element.visible && element.showInExport ? 'block' : 'none',
        filter: filters.join(' ') || 'none',
      },
    },
    inner,
    ...extras.map((e) => h('div', { innerHTML: e })),
  );

  return (elementHook && elementHook({ dom: wrapper, element })) || wrapper;
}

async function renderPage({
  page,
  store,
  elementHook,
}: {
  page: any;
  store: any;
  elementHook?: (opts: { dom: VNode; element: any }) => VNode | null;
}): Promise<VNode> {
  const children = await Promise.all(
    page.children.map((el: any) => renderElement({ element: el, page, store, elementHook })),
  );

  const pageWidth = page.width === 'auto' ? store.width : page.width;
  const pageHeight = page.height === 'auto' ? store.height : page.height;
  let bgStyle: Record<string, string> = {};

  const bg = page.background;
  const isImageBg =
    bg.indexOf('url') >= 0 ||
    bg.indexOf('http') >= 0 ||
    bg.indexOf('.jpg') >= 0 ||
    bg.indexOf('.png') >= 0 ||
    bg.indexOf('.jpeg') >= 0;

  if (isImageBg) {
    const imgSize = await loadImage(bg).then((i) => ({ width: i.width, height: i.height }));
    const bgEl = await renderImageElement({
      element: {
        x: 0, y: 0, width: pageWidth, height: pageHeight, src: bg, cornerRadius: 0,
        ...getCrop({ width: pageWidth, height: pageHeight }, imgSize),
        type: 'image',
      },
      page,
      store,
    });
    children.unshift(bgEl);
  } else {
    bgStyle = { backgroundColor: bg };
  }

  return h(
    'div',
    {
      className: 'page',
      id: page.id,
      style: {
        ...bgStyle,
        width: pageWidth + 'px',
        height: pageHeight + 'px',
        overflow: 'hidden',
        position: 'relative',
      },
    },
    ...children,
  );
}

export async function jsonToDOM({
  json,
  elementHook,
}: {
  json: any;
  elementHook?: (opts: { dom: VNode; element: any }) => VNode | null;
}): Promise<VNode> {
  const pages = await Promise.all(
    json.pages.map((page: any) => renderPage({ page, store: json, elementHook })),
  );

  const fontFamilies: string[] = [];
  forEveryChild({ children: json.pages }, (el: any) => {
    if (el.type === 'text' && fontFamilies.indexOf(el.fontFamily) === -1) {
      fontFamilies.push(el.fontFamily);
    }
  });

  const fontNodes = fontFamilies.map((family) => {
    const fontDef = json.fonts?.find((f: any) => f.fontFamily === family);
    if (fontDef) {
      const styles = (
        fontDef.styles ||
        (fontDef.url ? [{ src: `url("${fontDef.url}")` }] : [])
      )
        .map(
          (s: any) => `
    @font-face {
      font-family: '${fontDef.fontFamily}';
      src: ${s.src};
      font-style: ${s.fontStyle || 'normal'};
      font-weight: ${s.fontWeight || 'normal'};
      font-display: swap;
    }`,
        )
        .join('\n');
      return h('style', {}, styles);
    }
    return h('link', { href: getGoogleFontsUrl(family), rel: 'stylesheet' });
  });

  return h('div', { className: 'design' }, ...fontNodes, ...pages);
}

function vnodeToString({ dom }: { dom: VNode | null | string }): string {
  if (typeof dom === 'string') return dom;
  if (!dom) return '';
  const { innerHTML, ...restProps } = dom.props;
  const attrs = Object.keys(restProps)
    .map((key) => {
      const val = restProps[key];
      if (key === 'style' && typeof val === 'object') {
        const styleStr = Object.keys(val)
          .map((k) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${val[k]}`)
          .join('; ');
        return `style="${styleStr}"`;
      }
      if (typeof val === 'object') {
        return `${key}="${Object.keys(val).map((k) => `${k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}:${val[k]};`).join(' ')}"`;
      }
      return `${key}="${val}"`;
    })
    .join(' ');
  return `<${dom.type} ${attrs}>${innerHTML || dom.children.map((c) => vnodeToString({ dom: c })).join('')}</${dom.type}>`;
}

export async function jsonToHTML({
  json,
  elementHook,
}: {
  json: any;
  elementHook?: (opts: { dom: VNode; element: any }) => VNode | null;
}): Promise<string> {
  const dom = await jsonToDOM({ json, elementHook });
  return vnodeToString({ dom });
}
