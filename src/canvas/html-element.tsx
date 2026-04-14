'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Image, Group, Rect, Path } from 'react-konva';
import Quill from 'quill';
import Konva from 'konva';
import * as mobx from 'mobx';
import { reaction, autorun } from 'mobx';
import { flags } from '../utils/flags';
import { applyFilter } from './apply-filters';
import { getDir, getLineHeight, useFontLoader, usePrevious } from './text-element';
import { useColor } from './use-color';
import { detectSize, htmlToCanvas, isContentWrapping } from '../utils/html2canvas';
import { resetStyleContent } from '../utils/reset-style';
import { useFadeIn } from './use-fadein';
import { Html } from 'react-konva-utils';
import styled from '../utils/styled';
import { incrementLoader, triggerLoadError } from '../utils/loader';
import { removeTags, sanitizeHtml } from '../utils/text';
import * as fonts from '../utils/fonts';
import { isTouchDevice } from '../utils/screen';
import { getLimitedFontSize } from './text-element/max-font-size';
import { getCurvePath } from './text-element';
import { useDelayer } from './use-delayer';
import { getOptimalCaretColor } from './text-element/caret-color';
import { StoreType } from '../model/store';
import { TextElementType } from '../model/text-model';

function withAlpha(color: string, opacity: number): string {
  if (opacity === 1) return color;
  const rgba = Konva.Util.colorToRGBA(color);
  return rgba ? `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a * opacity})` : color;
}

function collapseEmptyParagraph(html: string): string {
  const trimmed = (html || '').trim();
  if (trimmed === '<p><br></p>' || trimmed === '<p></p>') return '';
  if (trimmed.startsWith('<p>') && trimmed.endsWith('</p>')) {
    const inner = trimmed.slice(3, -4);
    if (!/<\/?(p|div|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|blockquote)\b/i.test(inner)) {
      return inner;
    }
  }
  return html;
}

// MobX-observable Quill state (shared across editor instances)
export const quillRef = mobx.observable({
  enabled: false,
  currentFormat: {} as Record<string, any>,
  editor: mobx.observable.object({ instance: null as any }, {}, { deep: false }),
});

// Styled div wrapping Quill editor
const QuillContainer = styled('div', React.forwardRef)`
  .ql-editor {
    outline: none;
  }
  .ql-clipboard {
    pointer-events: none;
  }
  ${resetStyleContent}
  strong {
    font-weight: 700;
  }
  .ql-direction-rtl {
    direction: rtl;
  }
`;

// Default Quill formats
let quillFormats = ['bold', 'color', 'font', 'italic', 'size', 'strike', 'underline', 'indent', 'list', 'direction'];

export const setQuillFormats = (formats: string[]) => { quillFormats = formats; };

export const createQuill = (node: any) =>
  new Quill(node, {
    modules: { toolbar: false, keyboard: false, clipboard: { matchVisual: false } },
    formats: quillFormats,
    theme: undefined as any,
  });

export const setQuillContent = (quill: any, html: string) => {
  const delta = quill.clipboard.convert(
    `<div class='ql-editor' style='outline: none;'>${html}<p><br></p></div>`,
  );
  quill.setContents(delta);
  quill.history.clear();
};

export function setCursorFromCoords(quill: any, coords: { x: number; y: number } | null): void {
  if (!quill || !coords) return;
  const { x, y } = coords;
  try {
    let range: Range | null = null;
    if ((document as any).caretRangeFromPoint) {
      range = (document as any).caretRangeFromPoint(x, y);
    } else if ((document as any).caretPositionFromPoint) {
      const pos = (document as any).caretPositionFromPoint(x, y);
      if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); }
    }
    if (range) {
      const blot = Quill.find(range.startContainer, true);
      if (blot) {
        const idx = (blot as any).offset(quill.scroll) + range.startOffset;
        quill.setSelection(idx, 0, 'api');
        return;
      }
    }
  } catch (_) {}
  quill.setSelection(0, 0, 'api');
}

// Quill inline editor component
const QuillEditor = ({
  html,
  onBlur,
  onChange,
  element,
  clickCoords,
}: {
  html: string;
  onBlur: () => void;
  onChange: (html: string) => void;
  element: any;
  clickCoords: { x: number; y: number } | null;
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const quill = new Quill(containerRef.current, {
      modules: { toolbar: false, keyboard: false, clipboard: { matchVisual: false } },
      formats: quillFormats,
      theme: undefined as any,
    });

    mobx.runInAction(() => { quillRef.editor.instance = quill; });
    (window as any).__raeditorQuill = quill;

    quill.on('text-change', () => {
      if (quill.getSelection()) {
        mobx.runInAction(() => { quillRef.currentFormat = quill.getFormat(quill.getSelection()!); });
      }
      setTimeout(() => {
        const editorEl = containerRef.current?.childNodes[0] as HTMLElement;
        if (!editorEl) return;
        onChange(collapseEmptyParagraph(editorEl.innerHTML));
      }, 10);
    });

    setQuillContent(quill, html);
    if (clickCoords) {
      setCursorFromCoords(quill, clickCoords);
    } else {
      quill.setSelection(0, 0, 'api');
    }

    quill.on('selection-change', (range: any) => {
      if (range) {
        mobx.runInAction(() => { quillRef.currentFormat = quill.getFormat(quill.getSelection()!); });
      }
    });

    (containerRef.current.childNodes[0] as HTMLElement).addEventListener('blur', (e: any) => {
      if (e.relatedTarget?.classList.contains('ql-clipboard')) return;
      const isColorPicker = !!(e.relatedTarget && (e.relatedTarget as HTMLElement).closest?.('.sketch-picker'));
      if (!isColorPicker) onBlur();
    });

    return () => {
      mobx.runInAction(() => { quillRef.editor.instance = null; quillRef.currentFormat = {}; });
      delete (window as any).__raeditorQuill;
    };
  }, []);

  // Sync text changes from store
  React.useEffect(() => {
    return reaction(
      () => element.text,
      () => {
        const quill = quillRef.editor.instance;
        if (!quill) return;
        const sel = quill.getSelection();
        const editorEl = containerRef.current?.childNodes[0] as HTMLElement;
        if (collapseEmptyParagraph(editorEl?.innerHTML) === element.text) return;
        setQuillContent(quill, html);
        if (sel) {
          quill.setSelection(sel.index, sel.length);
          mobx.runInAction(() => { quillRef.currentFormat = quill.getFormat(quill.getSelection()!); });
        }
      },
      { fireImmediately: true },
    );
  }, []);

  // Blur on window blur / outside tap
  React.useEffect(() => {
    const onWindowBlur = () => onBlur();
    const onTouchStart = (e: TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onBlur();
    };
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('touchstart', onTouchStart);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('touchstart', onTouchStart);
    };
  }, []);

  const fillStyle: React.CSSProperties = { color: element.fill };
  if (element.fill.indexOf('gradient') >= 0) {
    Object.assign(fillStyle, {
      backgroundColor: element.fill,
      backgroundImage: element.fill,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'repeat',
      WebkitBackgroundClip: 'text',
      MozBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      MozTextFillColor: 'transparent',
    });
  }
  const caretColor = getOptimalCaretColor(element);

  return React.createElement(QuillContainer, {
    ref: containerRef,
    style: {
      ...fillStyle,
      fontSize: element.fontSize,
      fontWeight: element.fontWeight,
      textTransform: element.textTransform,
      width: element.a.width,
      fontFamily: `"${element.fontFamily}"`,
      lineHeight: element.lineHeight,
      letterSpacing: `${element.letterSpacing * element.fontSize}px`,
      textAlign: element.align,
      opacity: Math.max(element.a.opacity, 0.2),
      textShadow: element.shadowEnabled
        ? `${element.shadowOffsetX}px ${element.shadowOffsetY}px ${element.shadowBlur}px ${withAlpha(element.shadowColor, element.shadowOpacity ?? 1)}`
        : undefined,
      caretColor,
    },
    dir: getDir(removeTags(element.text)),
  });
};

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 0) return false;
  }
  return true;
}

function buildHtmlContent(element: any, { fontFamily = '', color = 'black' } = {}): string {
  let colorStyle = `color: ${color || element.fill}`;
  if (element.fill.indexOf('gradient') >= 0) {
    colorStyle = `
      background-color: ${color};
      background-image: ${element.fill};
      background-size: 100% 100%;
      background-repeat: repeat;
      -webkit-background-clip: text;
      -moz-background-clip: text;
      -webkit-text-fill-color: transparent;
      -moz-text-fill-color: transparent;
    `;
  }
  const rules = [
    'white-space: pre-wrap',
    'word-break: break-word',
    `width: ${Math.round(element.width || 100)}px`,
    colorStyle,
    `font-size: ${element.fontSize}px`,
    `font-family: '${fontFamily}'`,
    `text-align: ${element.align}`,
    `text-transform: ${element.textTransform}`,
    element.textDecoration
      ? `text-decoration: ${element.textDecoration}; text-decoration-color: ${color || element.fill}; text-decoration-layer: over`
      : '',
    element.lineHeight ? `line-height: ${element.lineHeight}` : '',
    element.letterSpacing ? `letter-spacing: ${element.letterSpacing * element.fontSize}px` : '',
    element.fontStyle ? `font-style: ${element.fontStyle}` : '',
    element.fontWeight ? `font-weight: ${element.fontWeight}` : '',
    element.strokeWidth ? `-webkit-text-stroke: ${element.strokeWidth}px ${element.stroke}` : '',
    element.strokeWidth ? 'paint-order: stroke fill' : '',
  ].filter(Boolean).join('; ');

  if (element.curveEnabled) {
    // Compute SVG text on path for curve mode
    const tmpPath = new Konva.TextPath({
      data: getCurvePath(element.a ? element.a.width : element.width, element.a ? element.a.height : element.height, element.curvePower, element.fontSize),
      align: 'center',
      textBaseline: 'middle',
      text: removeTags(element.text),
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      letterSpacing: element.letterSpacing * (element.a ? element.a.fontSize : element.fontSize),
      fill: element.fill,
    });
    const svgH = tmpPath.getSelfRect().height;
    tmpPath.destroy();
    const svgW = Math.round(element.width || 100);
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
        <defs><path id="curve" d="${getCurvePath(svgW, svgH, element.curvePower, element.fontSize)}" fill="none" /></defs>
        <text
          font-family="'${fontFamily}'"
          font-size="${element.fontSize}"
          font-weight="${element.fontWeight}"
          font-style="${element.fontStyle}"
          fill="${color}"
          text-anchor="middle"
          dominant-baseline="central"
          letter-spacing="${element.letterSpacing * element.fontSize}px"${element.textDecoration ? ` text-decoration="${element.textDecoration}"` : ''}${element.strokeWidth ? ` stroke="${element.stroke}" stroke-width="${element.strokeWidth}" paint-order="stroke fill"` : ''}>
          <textPath href="#curve" startOffset="50%">
            ${removeTags(element.text).replace(/\n/g, ' ')}
          </textPath>
        </text>
      </svg>`;
  }

  return `<div style="${rules}" contentEditable dir="${getDir(removeTags(element.text))}">${sanitizeHtml(element.text).replace(/\n/g, '</br>')}</div>`;
}

// Safari needs extra render attempts
const isSafari = /^((?!chrome|android).)*safari/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : '',
);

type ShapeProps = {
  store: StoreType;
  element: TextElementType;
  onClick?: Function;
};

export const HTMLElement = observer(({ element, store }: ShapeProps) => {
  const imageRef = React.useRef<any>(null);
  const [canvasImage, setCanvasImage] = React.useState<HTMLCanvasElement | undefined>(undefined);
  const [isTransforming, setIsTransforming] = React.useState(false);
  const [isRerendering, setIsRerendering] = React.useState(false);
  const prevHeightRef = React.useRef((element as any).height);
  const isSelected = (store as any).selectedShapes.indexOf(element) >= 0 && (element as any).selectable;
  const padding = (element as any).fontSize / 3;
  const { textVerticalResizeEnabled } = flags;
  const prevFontFamily = usePrevious((element as any).fontFamily);
  const [fontLoaded] = useFontLoader(store as any, (element as any).fontFamily);
  const isEditMode = (element as any)._editModeEnabled;
  useFadeIn(imageRef);

  // Use fallback font during loading
  const fontFamily = fontLoaded
    ? (element as any).fontFamily
    : prevFontFamily !== (element as any).fontFamily
    ? prevFontFamily
    : 'Arial';

  const fillColor = useColor(element as any).fill;
  const htmlContent = buildHtmlContent(element as any, { fontFamily: fontFamily || '', color: fillColor });

  // Compute intrinsic size from HTML
  let { width: measuredW, height: measuredH } = React.useMemo(
    () => detectSize(htmlContent),
    [htmlContent, (element as any).width, fontLoaded],
  );

  // Auto-resize height
  React.useEffect(() => {
    if (!fontLoaded) return;
    if (!(element as any).height) {
      (store as any).history.ignore(() => { (element as any).set({ height: measuredH }); });
      return;
    }
    const { textOverflow } = flags;
    if (textOverflow === 'change-font-size' && !isTransforming) {
      // Find font size that fits
      let fs = (element as any).fontSize;
      for (let i = 1; i < 50; i++) {
        const testHtml = buildHtmlContent({ ...(element as any).toJSON(), fontSize: fs }, { fontFamily: (element as any).fontFamily });
        const { height: testH } = detectSize(testHtml);
        if (
          (!((element as any).height && testH > (element as any).height)) &&
          !(flags.textSplitAllowed === false && !(element as any).curveEnabled && isContentWrapping({ html: testHtml }))
        ) break;
        fs -= 0.5;
      }
      if (fs !== (element as any).fontSize) {
        (store as any).history.ignore(() => { (element as any).set({ fontSize: fs }); });
      } else if ((element as any).height !== measuredH) {
        if (textVerticalResizeEnabled && (element as any).height < measuredH) {
          (store as any).history.ignore(() => { (element as any).set({ height: measuredH }); });
        } else if (!textVerticalResizeEnabled) {
          (store as any).history.ignore(() => { (element as any).set({ height: measuredH }); });
        }
      }
    } else if (textOverflow === 'resize') {
      if (textVerticalResizeEnabled && (element as any).height < measuredH && !isTransforming) {
        (store as any).history.ignore(() => { (element as any).set({ height: measuredH }); });
      } else if (!textVerticalResizeEnabled && (element as any).height !== measuredH) {
        (store as any).history.ignore(() => { (element as any).set({ height: measuredH }); });
      }
    }
  });

  // Memoized canvas renderer with arg dedup
  const memoRenderer = React.useMemo(() => {
    const cache: { lastArgs: any; lastResult: any } = { lastArgs: null, lastResult: null };
    return async (args: any) => {
      if (cache.lastArgs && cache.lastResult && JSON.stringify(cache.lastArgs) === JSON.stringify(args)) {
        return cache.lastResult;
      }
      cache.lastResult = await htmlToCanvas(args);
      cache.lastArgs = { ...args };
      return cache.lastResult;
    };
  }, []);

  const renderCountRef = React.useRef(0);
  const finishLoaderRef = React.useRef<(() => void) | null>(null);

  // Render HTML to canvas when content changes
  React.useEffect(() => {
    if (isTransforming || isEditMode) return;
    (async () => {
      renderCountRef.current++;
      const token = renderCountRef.current;
      let finish = incrementLoader(`text ${(element as any).id} ${token}`);
      finishLoaderRef.current?.();
      finishLoaderRef.current = finish;
      setIsRerendering(true);

      let canvas: HTMLCanvasElement | null = null;
      const attempts = isSafari ? 5 : 1;
      for (let attempt = 0; attempt < attempts; attempt++) {
        const renderer = attempt > 0 ? memoRenderer : htmlToCanvas;
        try {
          canvas = await renderer({
            skipCache: attempt > 0,
            html: htmlContent,
            width: (element as any).width || 1,
            height: (element as any).height || measuredH || 1,
            fontFamily,
            padding,
            pixelRatio: (store as any)._elementsPixelRatio,
            font:
              (store as any).fonts.find((f: any) => f.fontFamily === fontFamily) ||
              fonts.globalFonts.find((f: any) => f.fontFamily === fontFamily),
          });
          if (token !== renderCountRef.current) return;
          if (isSafari && canvas && isCanvasBlank(canvas)) {
            await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
            continue;
          }
          break;
        } catch (e) {
          console.error(e);
          triggerLoadError(`Error rendering rich text with id ${(element as any).id}`);
          break;
        }
      }

      if (canvas) {
        setCanvasImage(canvas);
      } else if (finish) {
        finish();
        finish = null;
      } else {
        console.error('Finish function is called twice!');
      }
      setIsRerendering(false);
    })();
  }, [htmlContent, isTransforming, measuredH, isEditMode, fontFamily, (element as any).height, (store as any)._elementsPixelRatio, fontLoaded]);

  const [isRerenderingDelayed] = useDelayer(isRerendering, 300);
  const [isTransformingDelayed] = useDelayer(isTransforming, 300, true);
  const isLoadingState = isTransformingDelayed || isRerenderingDelayed;

  // Apply filters
  React.useEffect(() => {
    if (!isLoadingState) {
      return autorun(() => { applyFilter(imageRef.current, element as any); });
    }
    imageRef.current?.clearCache();
  }, [canvasImage, isLoadingState, (element as any).shadowColor, (element as any).shadowOffsetX,
    (element as any).shadowOffsetY, (element as any).shadowOpacity]);

  // Release loader when canvas ready
  React.useEffect(() => {
    if (canvasImage && !isRerendering && finishLoaderRef.current) {
      finishLoaderRef.current();
      finishLoaderRef.current = null;
    }
  }, [canvasImage, isRerendering]);

  // Cleanup loader on unmount
  React.useEffect(() => () => { finishLoaderRef.current?.(); }, []);

  // Curve width auto-adjust
  React.useLayoutEffect(() => {
    if (!fontLoaded || !(element as any).curveEnabled) return;
    const textPathNode = new Konva.TextPath({
      data: getCurvePath((element as any).a.width, (element as any).a.height, (element as any).curvePower, (element as any).a.fontSize),
      text: removeTags((element as any).text),
      letterSpacing: (element as any).letterSpacing * (element as any).a.fontSize,
      fontSize: (element as any).a.fontSize,
      fontFamily: (element as any).fontFamily,
      fontWeight: (element as any).fontWeight,
      fontStyle: (element as any).fontStyle,
      align: 'center',
      textBaseline: 'middle',
      fill: (element as any).fill,
    });
    const newWidth = textPathNode.getSelfRect().width;
    textPathNode.destroy();
    if (newWidth) {
      const diff = newWidth - (element as any).a.width;
      const angle = (element as any).a.rotation * Math.PI / 180;
      (element as any).set({
        width: newWidth,
        x: (element as any).a.x - (diff / 2) * Math.cos(angle),
        y: (element as any).a.y - (diff / 2) * Math.sin(angle),
      });
    }
  }, [fontLoaded, (element as any).curveEnabled, (element as any).curvePower, (element as any).text,
    (element as any).fontSize, (element as any).fontFamily, (element as any).fontWeight, (element as any).fontStyle, (element as any).letterSpacing]);

  // Auto-delete empty, non-placeholder elements when deselected
  React.useEffect(() => {
    if (!isSelected && removeTags((element as any).text) === '' && (element as any).removable && !(element as any).placeholder) {
      (store as any).deleteElements([(element as any).id]);
    }
  }, [isSelected]);

  // Vertical alignment offset
  let verticalOffset = 0;
  if ((element as any).verticalAlign === 'middle') verticalOffset = ((element as any).height - measuredH) / 2;
  if ((element as any).verticalAlign === 'bottom') verticalOffset = (element as any).height - measuredH;

  const lineH = getLineHeight({ fontLoaded, fontFamily: (element as any).fontFamily, fontSize: (element as any).fontSize, lineHeight: (element as any).lineHeight });
  const isTouch = isTouchDevice();
  const curvePath = getCurvePath((element as any).a.width, measuredH, (element as any).curvePower, (element as any).fontSize);
  const prevTransformPos = React.useRef<{ x: number; y: number } | null>(null);
  const clickCoordsRef = React.useRef<{ x: number; y: number } | null>(null);
  const hasStrokeInEditMode = isEditMode && (element as any).strokeWidth > 0 && !(element as any).curveEnabled;

  return React.createElement(
    React.Fragment,
    null,
    // Background rect
    React.createElement(Rect, {
      x: (element as any).a.x,
      y: (element as any).a.y,
      offsetX: (element as any).backgroundPadding * ((element as any).fontSize * lineH * 0.5),
      offsetY: (element as any).backgroundPadding * ((element as any).fontSize * lineH * 0.5),
      rotation: (element as any).a.rotation,
      hideInExport: !(element as any).showInExport,
      listening: false,
      visible: (element as any).backgroundEnabled,
      opacity: (element as any).backgroundOpacity * (element as any).a.opacity,
      fill: (element as any).backgroundColor,
      width: (element as any).a.width + (element as any).backgroundPadding * ((element as any).fontSize * lineH),
      height: (element as any).a.height + (element as any).backgroundPadding * ((element as any).fontSize * lineH),
      cornerRadius: (element as any).backgroundCornerRadius * ((element as any).fontSize * lineH * 0.5),
    }),
    // Invisible curve path (debug)
    React.createElement(Path, {
      x: (element as any).a.x,
      y: (element as any).a.y,
      rotation: (element as any).a.rotation,
      data: curvePath,
      stroke: 'red',
      strokeWidth: 1,
      visible: false,
    }),
    // Hit/drag rect
    React.createElement(Rect, {
      ref: imageRef,
      name: 'element',
      x: (element as any).a.x,
      y: (element as any).a.y,
      listening: (element as any).selectable,
      rotation: (element as any).a.rotation,
      width: (element as any).a.width,
      height: (element as any).a.height,
      visible: !isLoadingState,
      draggable: isTouch ? (element as any).draggable && isSelected : (element as any).draggable,
      preventDefault: !isTouch || isSelected,
      opacity: isEditMode ? 0 : (element as any).a.opacity,
      hideInExport: !(element as any).showInExport,
      onDragMove: (e: any) => { (element as any).set({ x: e.target.x(), y: e.target.y() }); },
      onDragEnd: (e: any) => { (element as any).set({ x: e.target.x(), y: e.target.y() }); },
      id: (element as any).id,
      onDblClick: (e: any) => {
        if ((element as any).contentEditable) {
          clickCoordsRef.current = { x: e.evt.clientX, y: e.evt.clientY };
          (element as any).toggleEditMode(true);
        }
      },
      onDblTap: (e: any) => {
        if ((element as any).contentEditable) {
          const touch = e.evt.changedTouches?.[0];
          clickCoordsRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
          (element as any).toggleEditMode(true);
        }
      },
      onTransformStart: (e: any) => {
        setIsTransforming(true);
        prevHeightRef.current = (element as any).height;
      },
      onTransform: (e: any) => {
        const node = e.target;
        const stage = node.getStage();
        const transformer = stage?.findOne('Transformer');
        const anchor = transformer?.getActiveAnchor() || '';
        const isHorizontal = anchor === 'middle-left' || anchor === 'middle-right';
        const isVertical = anchor === 'top-center' || anchor === 'bottom-center';
        const scaleX = node.scaleX();

        if (isHorizontal) {
          const newW = node.width() * scaleX;
          const minW = (element as any).fontSize;
          let finalW = newW;
          if (newW < minW) {
            finalW = minW;
            if (prevTransformPos.current) node.position(prevTransformPos.current);
          }
          node.width(finalW);
          node.scaleX(1);
          if (textVerticalResizeEnabled) {
            const targetH = Math.max(measuredH, prevHeightRef.current);
            (element as any).set({ height: targetH });
          }
          (element as any).set({ width: node.width(), x: node.x(), y: node.y() });
        } else if (isVertical) {
          const minH = flags.textOverflow === 'resize' ? measuredH : (element as any).lineHeight * (element as any).fontSize;
          const newH = Math.max(minH, e.target.height() * e.target.scaleY());
          node.scaleY(1);
          (element as any).set({ x: node.x(), y: node.y(), height: newH, rotation: node.rotation() });
        } else {
          node.scaleX(1);
          node.scaleY(1);
          (element as any).set({
            fontSize: (element as any).fontSize * scaleX,
            letterSpacing: (element as any).letterSpacing,
            width: node.width() * scaleX,
            x: node.x(), y: node.y(),
            rotation: node.rotation(),
            height: node.height() * scaleX,
          });
        }
        prevTransformPos.current = e.target.position();
      },
      onTransformEnd: (e: any) => {
        setIsTransforming(false);
        setIsRerendering(true);
        const node = e.target;
        const scaleX = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        (element as any).set({
          fontSize: (element as any).fontSize * scaleX,
          width: node.width() * scaleX,
          x: node.x(), y: node.y(),
          rotation: node.rotation(),
          shadowBlur: (element as any).shadowBlur * scaleX,
          shadowOffsetX: (element as any).shadowOffsetX * scaleX,
          shadowOffsetY: (element as any).shadowOffsetY * scaleX,
          strokeWidth: (element as any).strokeWidth * scaleX,
        });
      },
    }),
    // Rendered canvas image
    React.createElement(Image as any, {
      ref: imageRef,
      image: canvasImage,
      x: (element as any).a.x,
      y: (element as any).a.y,
      offsetX: padding,
      offsetY: padding - verticalOffset,
      listening: false,
      rotation: (element as any).a.rotation,
      width: (element as any).a.width + 2 * padding,
      height: ((element as any).a.width + 2 * padding) * ((canvasImage?.height || 0) / (canvasImage?.width || 1)),
      visible: !isLoadingState && !isEditMode,
      opacity: (element as any).a.opacity,
      shadowEnabled: (element as any).shadowEnabled,
      shadowBlur: (element as any).shadowBlur,
      shadowOffsetX: (element as any).shadowOffsetX,
      shadowOffsetY: (element as any).shadowOffsetY,
      shadowColor: (element as any).shadowColor,
      shadowOpacity: (element as any).shadowOpacity,
      hideInExport: !(element as any).showInExport,
      editModeEnabled: (element as any)._editModeEnabled || isTransforming || isLoadingState,
    }),
    // Loading/stroke preview overlay
    (isLoadingState || hasStrokeInEditMode) && React.createElement(
      Group,
      { x: (element as any).a.x, y: (element as any).a.y, rotation: (element as any).a.rotation, offsetY: -verticalOffset },
      React.createElement(Html, { divProps: { style: { pointerEvents: 'none' } } },
        React.createElement(QuillContainer, {
          dangerouslySetInnerHTML: { __html: htmlContent },
          style: {
            pointerEvents: 'none',
            opacity: (element as any).a.opacity,
            textShadow: (element as any).shadowEnabled
              ? `${(element as any).shadowOffsetX}px ${(element as any).shadowOffsetY}px ${(element as any).shadowBlur}px ${withAlpha((element as any).shadowColor, (element as any).shadowOpacity ?? 1)}`
              : undefined,
          },
        }),
      ),
    ),
    // Edit mode Quill overlay
    isEditMode && React.createElement(
      Group,
      { x: (element as any).a.x, y: (element as any).a.y, rotation: (element as any).a.rotation, offsetY: -verticalOffset },
      React.createElement(Html, null,
        React.createElement(QuillEditor, {
          html: htmlContent,
          element,
          onChange: (text: string) => {
            const newFontSize = getLimitedFontSize({
              oldText: removeTags((element as any).text),
              newText: removeTags(text),
              element: element as any,
            });
            (element as any).set({ text, fontSize: newFontSize });
          },
          onBlur: () => {
            (element as any).toggleEditMode(false);
            setIsRerendering(true);
          },
          clickCoords: clickCoordsRef.current,
        }),
      ),
    ),
  );
}) as ((props: ShapeProps) => React.JSX.Element) & { displayName: string };

HTMLElement.displayName = 'HTMLElement';
