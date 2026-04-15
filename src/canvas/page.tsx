'use client';

import React from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { action, runInAction } from 'mobx';
import { Group, Image, Label, Layer, Line, Rect, Stage, Tag, Text, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { TransformerConfig } from 'konva/lib/shapes/Transformer';
import { Html } from 'react-konva-utils';
import Element from './element';
import { ensureDragOrder, useSnap } from './use-transformer-snap';
import { useImageLoader } from './image-element';
import { getCrop } from '../utils/crop';
import { ___, isCreditVisible } from '../utils/validate-key';
import { getClientRect, getTotalClientRect } from '../utils/math';
import { pxToUnitRounded, pxToUnitString } from '../utils/unit';
import { flags } from '../utils/flags';
import { isTouchDevice } from '../utils/screen';
import { useColor } from './use-color';
import { isGradient } from '../utils/gradient';
import { StoreType } from '../model/store';
import { PageType } from '../model/page-model';
import { NodeType } from '../model/node-model';
import { forEveryChild } from '../model/group-model';
import { Vector2d } from 'konva/lib/types';

// Patch Konva DD drag to run in MobX action
const originalDrag = (Konva as any).DD._drag;
window.removeEventListener('mousemove', originalDrag);
(Konva as any).DD._drag = function (e: MouseEvent) {
  runInAction(() => { originalDrag.call(this, e); });
};
window.addEventListener('mousemove', (Konva as any).DD._drag);

// Rotate cursor icon
const ICON_SIZE = 20;
const iconGroup = new Konva.Group();
iconGroup.add(new Konva.Rect({ width: ICON_SIZE, height: ICON_SIZE, fill: 'white' }));
iconGroup.add(new Konva.Path({
  scaleX: ICON_SIZE / 24,
  scaleY: ICON_SIZE / 24,
  data: 'M4.98313549,11.0001422 C5.49589839,10.9914935 5.92501998,11.3703506 5.99116425,11.8666444 L5.99985778,11.9831355 L6.00348884,12.2068855 C6.11245031,15.4321748 8.76323537,17.9999971 11.9999971,17.9999971 C12.1869612,17.9999971 12.3726725,17.9914753 12.5567465,17.9745765 L12.2928932,17.7071068 C11.9023689,17.3165825 11.9023689,16.6834175 12.2928932,16.2928932 C12.6834175,15.9023689 13.3165825,15.9023689 13.7071068,16.2928932 L15.7071068,18.2928932 C16.0976311,18.6834175 16.0976311,19.3165825 15.7071068,19.7071068 L13.7071068,21.7071068 C13.3165825,22.0976311 12.6834175,22.0976311 12.2928932,21.7071068 C11.9023689,21.3165825 11.9023689,20.6834175 12.2928932,20.2928932 L12.6111505,19.9769552 C12.4086045,19.9922816 12.2047796,19.9999971 11.9999971,19.9999971 C7.7687005,19.9999971 4.28886152,16.7094374 4.01666425,12.5105203 L4.00420123,12.2575143 L4.00014222,12.0168645 C3.9908282,11.4646583 4.43092928,11.0094562 4.98313549,11.0001422 Z M11.7071068,2.29289322 C12.0675907,2.65337718 12.0953203,3.22060824 11.7902954,3.61289944 L11.7071068,3.70710678 L11.3891629,4.0230186 C11.5916051,4.00770767 11.7953244,4 12,4 C16.418278,4 20,7.581722 20,12 C20,12.5522847 19.5522847,13 19,13 C18.4477153,13 18,12.5522847 18,12 C18,8.6862915 15.3137085,6 12,6 C11.8129339,6 11.6271216,6.00853145 11.4429483,6.02544919 L11.7071068,6.29289322 C12.0976311,6.68341751 12.0976311,7.31658249 11.7071068,7.70710678 C11.3466228,8.06759074 10.7793918,8.09532028 10.3871006,7.79029539 L10.2928932,7.70710678 L8.29289322,5.70710678 C7.93240926,5.34662282 7.90467972,4.77939176 8.20970461,4.38710056 L8.29289322,4.29289322 L10.2928932,2.29289322 C10.6834175,1.90236893 11.3165825,1.90236893 11.7071068,2.29289322 Z',
  fill: 'black',
}));
const rotateCursorIcon = iconGroup.toCanvas({ pixelRatio: 2, width: ICON_SIZE, height: ICON_SIZE });

// Default transformer style
const defaultTransformerStyle: TransformerConfig = {
  enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-left', 'bottom-left', 'bottom-right', 'bottom-center', 'middle-right'],
  borderEnabled: true,
  rotateEnabled: true,
  resizeEnabled: true,
  rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
  ignoreStroke: true,
  flipEnabled: false,
  anchorStrokeWidth: 2,
  borderStrokeWidth: 2,
  rotateAnchorOffset: 30,
  anchorStyleFunc: (anchor: any) => {
    if (anchor.hasName('rotater')) {
      const s = 20;
      anchor.setAttrs({
        width: s, height: s,
        cornerRadius: s / 2,
        offsetX: s / 2, offsetY: s / 2,
        fillPatternImage: rotateCursorIcon,
        fillPatternScaleX: s / ICON_SIZE / 2,
        fillPatternScaleY: s / ICON_SIZE / 2,
        fillPriority: 'pattern',
        fillPatternRepeat: 'no-repeat',
      });
    }
  },
};

export const setTransformerStyle = (style: TransformerConfig) => {
  Object.assign(defaultTransformerStyle, style);
};

// Per-type transformer anchor overrides
const typeTransformerAttrs: Record<string, Partial<TransformerConfig>> = {
  text: { enabledAnchors: ['top-left', 'top-right', 'middle-left', 'bottom-left', 'bottom-right', 'middle-right'] },
  svg: { enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] },
  gif: { enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] },
  line: { enabledAnchors: [], borderEnabled: false, rotateEnabled: false },
  image: { enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] },
  many: { enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] },
  group: { enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] },
};

export function registerTransformerAttrs(type: string, attrs: any): void {
  typeTransformerAttrs[type] = typeTransformerAttrs[type] || attrs;
  Object.assign(typeTransformerAttrs[type], attrs);
}

// Transparent hit rect for stage clicks
const StageHitRect = (props: any) =>
  React.createElement(Rect, { ...props, preventDefault: false });

// Background image component
const BackgroundImage = ({ url, ...props }: { url: string; [key: string]: any }) => {
  const [image, status] = useImage(url, 'anonymous');
  const crop = image ? getCrop(image, { width: props.width, height: props.height }, 'center-middle') : {};
  useImageLoader(status, url, 'page background');
  return React.createElement(Image as any, { image, ...props, ...crop });
};

// Gradient-aware background fill
const BackgroundFill = (props: any) => {
  const color = useColor({ fill: props.fill, a: { width: props.width, height: props.height } });
  return React.createElement(Rect, { ...props, ...color });
};

// Checkerboard + background renderer
const PageBackground = ({ background, scale, borderColor, ...rest }: any) => {
  const isColor = React.useMemo(() => !!Konva.Util.colorToRGBA(background) || isGradient(background), [background]);
  const checkerCanvas = React.useMemo(() => {
    const canvas = document.createElement('canvas');
    const s = 30;
    canvas.width = 60;
    canvas.height = 60;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'black';
    ctx.fillRect(s, 0, s, s);
    ctx.fillRect(0, s, s, s);
    return canvas;
  }, []);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Rect, { ...rest, fillPatternImage: checkerCanvas, opacity: 0.1, hideInExport: true }),
    isColor
      ? React.createElement(BackgroundFill, { fill: background, ...rest })
      : React.createElement(BackgroundImage, { url: background, ...rest }),
  );
};

// Selection rectangle
const SelectionRect = observer(({
  selection,
  fill = 'rgba(0, 161, 255, 0.3)',
  stroke = 'rgb(0, 161, 255)',
  strokeWidth = 1,
}: {
  selection: { visible: boolean; x1: number; y1: number; x2: number; y2: number };
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) =>
  selection.visible
    ? React.createElement(Rect, {
        name: 'selection',
        x: Math.min(selection.x1, selection.x2),
        y: Math.min(selection.y1, selection.y2),
        width: Math.abs(selection.x1 - selection.x2),
        height: Math.abs(selection.y1 - selection.y2),
        fill,
        stroke,
        strokeWidth,
      })
    : null,
);

// Transform size/rotation label
const TransformLabel = observer(({
  x, y, width, height, rotation, anchor, store, tagFill, textFill,
}: {
  x: number; y: number; width: number; height: number; rotation: number;
  anchor?: string; store: any; tagFill?: string; textFill?: string;
}) => {
  if (anchor === undefined) return null;
  const rect = getClientRect({ x, y, width, height, rotation: Konva.Util.radToDeg(rotation) });
  const cx = (rect.minX + rect.maxX) / 2;
  const cy = (rect.minY + rect.maxY) / 2;
  const rotOffX = (height / 2 + 70) * Math.cos(rotation - Math.PI / 2);
  const rotOffY = (height / 2 + 70) * Math.sin(rotation - Math.PI / 2);
  const sizeText =
    pxToUnitRounded({ unit: store.unit, dpi: store.dpi, px: width / store.scale, precious: store.unit === 'px' ? 0 : 1 }) +
    ' x ' +
    pxToUnitRounded({ unit: store.unit, dpi: store.dpi, px: height / store.scale, precious: store.unit === 'px' ? 0 : 1 }) +
    (store.unit === 'px' ? '' : ' ' + store.unit);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Label,
      { x: cx + rotOffX, y: cy + rotOffY, offsetX: 14, offsetY: 14, visible: anchor === 'rotater' },
      React.createElement(Tag, { cornerRadius: 5, fill: tagFill || 'rgb(0, 161, 255)' }),
      React.createElement(Text, { align: 'center', verticalAlign: 'middle', fill: textFill || 'white', padding: 8, text: `${Math.round(Konva.Util.radToDeg(rotation))}°` }),
    ),
    React.createElement(
      Label,
      { x: cx, y: rect.maxY + 20, visible: anchor !== 'rotater' },
      React.createElement(Tag, { cornerRadius: 5, fill: tagFill || 'rgb(0, 161, 255)', pointerDirection: 'up', pointerHeight: 0, pointerWidth: 0 }),
      React.createElement(Text, { align: 'center', verticalAlign: 'middle', fill: textFill || 'white', padding: 8, text: sizeText }),
    ),
  );
});

// Elements renderer with alwaysOnTop ordering
const ElementsLayer = observer(({ elements, store }: { elements: any[]; store: any }) => {
  const normal = elements.filter((e: any) => !e.alwaysOnTop);
  const top = elements.filter((e: any) => e.alwaysOnTop);
  return React.createElement(
    React.Fragment,
    null,
    [...normal, ...top].map((el: any) =>
      React.createElement(Element, {
        key: el.id,
        store,
        element: el,
        onClick: () => console.warn('Raeditor warning: onClick callback is deprecated.'),
      }),
    ),
  );
});

export const useContextMenu = ({ store }: { store: StoreType }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const open = React.useCallback((pos: { x: number; y: number }) => {
    setIsOpen(true);
    setOffset(pos);
  }, []);
  const close = React.useCallback(() => setIsOpen(false), []);
  return { open, close, props: { isOpen, offset, setIsOpen } };
};

// DOM drop callback storage
let domDropCallback: ((pos: Vector2d, element?: NodeType, event?: { elements: NodeType[]; page: PageType }) => void) | null = null;

export const registerNextDomDrop = (callback: typeof domDropCallback) => {
  domDropCallback = callback;
};

// License watermark (obfuscated string)
const LICENSE_MSG = atob('UG9sb3RubyBmcmVlIGxpY2Vuc2UgbGltaXRhdGlvbiBleGNlZWRlZCAtIFBsZWFzZSB1cGdyYWRlIHlvdXIgYWNjb3VudC4=');
const LICENSE_COLOR = atob('cmVk');
const LICENSE_VERSION = atob('djAuOS4y');

const LicenseBanner = (props: any) =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Label,
      { fill: LICENSE_COLOR, height: 200 },
      React.createElement(Tag, { fill: LICENSE_COLOR }),
      React.createElement(Text, { ...props, fill: 'white', text: LICENSE_MSG, height: undefined, padding: 10, fontSize: 20 }),
    ),
  );

type PageProps = {
  store: StoreType;
  page: PageType;
  xPadding: number;
  yPadding: number;
  width: number;
  height: number;
  pageControlsEnabled?: boolean;
  backColor: string;
  pageBorderColor: string;
  activePageBorderColor: string;
  bleedColor: string;
  components: any;
  altCloneEnabled?: boolean;
  viewportSize: { width: number; height: number };
  selectionRectFill?: string;
  selectionRectStroke?: string;
  selectionRectStrokeWidth?: number;
  snapGuideStroke?: string;
  snapGuideStrokeWidth?: number;
  snapGuideDash?: number[];
  transformLabelFill?: string;
  transformLabelTextFill?: string;
  distanceGuideStroke?: string;
  distanceLabelFill?: string;
  distanceLabelTextFill?: string;
};

const Page = observer(({
  store, page, width, height,
  pageControlsEnabled, backColor, pageBorderColor, activePageBorderColor,
  components, bleedColor, altCloneEnabled, viewportSize,
  selectionRectFill, selectionRectStroke, selectionRectStrokeWidth,
  snapGuideStroke, snapGuideStrokeWidth, snapGuideDash,
  transformLabelFill, transformLabelTextFill,
  distanceGuideStroke, distanceLabelFill, distanceLabelTextFill,
}: PageProps) => {
  const bleed = (store as any).bleedVisible ? (page as any).bleed : 0;
  const pageW = (page as any).computedWidth + 2 * bleed;
  const pageH = (page as any).computedHeight + 2 * bleed;
  const xOff = (width - pageW * (store as any).scale) / 2;
  const yOff = (height - pageH * (store as any).scale) / 2;

  const transformerRef = React.useRef<any>(null);
  const stageRef = React.useRef<any>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const showPageControls = pageControlsEnabled ?? true;

  const [distanceLines, setDistanceLines] = React.useState<any[] | null>(null);
  const [transformLabel, setTransformLabel] = React.useState<any>({});
  const contextMenu = useContextMenu({ store });

  const hasCropMode = (store as any).selectedElements.find((e: any) => e._cropModeEnabled);
  const hasCurve = (store as any).selectedElements.find((e: any) => e.curveEnabled);
  const hasNonResizable = (store as any).selectedShapes.filter((e: any) => e.resizable === false).length > 0;
  const hasNonDraggable = (store as any).selectedShapes.filter((e: any) => e.draggable === false).length > 0;
  const hasInvisible = (store as any).selectedElements.filter((e: any) => !e.visible).length > 0;

  // Update transformer nodes and style when selection changes
  React.useLayoutEffect(() => {
    if (!transformerRef.current) return;
    const stage = transformerRef.current.getStage();
    const nodes = (store as any).selectedShapes
      .map((el: any) => el._cropModeEnabled ? null : stage?.findOne('#' + el.id))
      .filter(Boolean);

    const isSingle = (store as any).selectedElements.length === 1;
    const type = (isSingle && (store as any).selectedElements[0]?.type) || 'many';
    const typeAttrs = typeTransformerAttrs[type];

    transformerRef.current.setAttrs({ ...defaultTransformerStyle, ...(typeAttrs || {}) });

    // SVG/image/gif with keepRatio=false get all anchors
    if (['svg', 'image', 'gif'].includes(type) && !(store as any).selectedElements[0]?.keepRatio) {
      transformerRef.current.setAttrs({ enabledAnchors: defaultTransformerStyle.enabledAnchors });
    }
    // Text with vertical resize enabled gets bottom-center anchor
    if (type === 'text' && flags.textVerticalResizeEnabled) {
      const textAnchors = typeTransformerAttrs.text?.enabledAnchors || [];
      transformerRef.current.setAttrs({ enabledAnchors: [...textAnchors, 'bottom-center'] });
    }
    // Text with curve enabled gets 4-corner anchors
    if (type === 'text' && isSingle && (store as any).selectedElements[0]?.curveEnabled) {
      transformerRef.current.setAttrs({ enabledAnchors: typeTransformerAttrs.many?.enabledAnchors });
    }

    if (hasNonResizable) {
      transformerRef.current.enabledAnchors([]);
      transformerRef.current.resizeEnabled(false);
    } else {
      transformerRef.current.resizeEnabled(true);
    }
    if (hasNonDraggable) transformerRef.current.rotateEnabled(false);

    transformerRef.current.nodes(nodes);
    ensureDragOrder(transformerRef.current, store as any, {});
    transformerRef.current.getLayer()?.batchDraw();
  }, [(store as any).selectedShapes, hasCropMode, hasNonResizable, hasInvisible, hasNonDraggable, hasCurve]);

  // Selection rect (marquee)
  const selection = useLocalObservable(() => ({ visible: false, x1: 0, y1: 0, x2: 0, y2: 0 }));
  const selectionDidOccur = React.useRef(false);
  const isTouch = isTouchDevice();

  const onMouseDown = action((e: any) => {
    if (isTouch) return;
    selectionDidOccur.current = false;
    const inElements = e.target.findAncestor('.elements-container');
    const inTransformer = e.target.findAncestor('Transformer');
    const inAbsContainer = e.target.findAncestor('.page-abs-container');
    if (inElements || inTransformer || inAbsContainer) return;
    const stagePos = e.target.getStage()?.getPointerPosition();
    if (!stagePos) return;
    stagePos.x -= stageRef.current?.x() || 0;
    stagePos.y -= stageRef.current?.y() || 0;
    if (stagePos && e.target.getStage()?.getPointersPositions().length < 2) {
      selection.visible = true;
      selection.x1 = stagePos.x;
      selection.y1 = stagePos.y;
      selection.x2 = stagePos.x;
      selection.y2 = stagePos.y;
    }
  });

  // Stage viewport sync on scroll
  React.useEffect(() => {
    const inner = containerRef.current?.closest('.raeditor-workspace-inner') as HTMLElement | null;
    if (!inner) return;
    function syncViewport() {
      if (!stageRef.current) return;
      const containerRect = containerRef.current?.getBoundingClientRect();
      const innerRect = inner!.getBoundingClientRect();
      const ox = Math.max(0, innerRect.left - (containerRect?.left || 0) - 100);
      const oy = Math.max(0, innerRect.top - (containerRect?.top || 0) - 100);
      stageRef.current.position({ x: -ox, y: -oy });
      stageRef.current.container().style.transform = `translate(${ox}px, ${oy}px)`;
    }
    syncViewport();
    inner.addEventListener('scroll', syncViewport);
    return () => inner.removeEventListener('scroll', syncViewport);
  }, [viewportSize.width, viewportSize.height]);

  // Marquee selection mouse move/up
  React.useEffect(() => {
    const onMove = action((e: MouseEvent | TouchEvent) => {
      if (!selection.visible) return;
      stageRef.current?.setPointersPositions(e);
      let pos = stageRef.current?.getPointerPosition();
      if (pos) {
        pos.x -= stageRef.current?.x() || 0;
        pos.y -= stageRef.current?.y() || 0;
      } else {
        pos = { x: selection.x2, y: selection.y2 };
      }
      selection.x2 = pos.x;
      selection.y2 = pos.y;
    });

    const onUp = action(() => {
      if (!selection.visible) return;
      if (!stageRef.current) return;
      const selRect = stageRef.current.findOne('.selection')?.getClientRect() || { width: 0, height: 0, x: 0, y: 0 };
      if (selRect.width && selRect.height) {
        const ids: string[] = [];
        stageRef.current.find('.element').forEach((node: any) => {
          const nodeRect = node.getClientRect();
          const el = (store as any).getElementById(node.id());
          if (
            el?.draggable &&
            el?.selectable &&
            Konva.Util.haveIntersection(selRect, nodeRect)
          ) {
            ids.push(el.top.id);
          }
        });
        (store as any).selectElements([...new Set(ids)]);
      }
      selection.visible = false;
      if (selRect.width && selRect.height) {
        selectionDidOccur.current = true;
      }
    });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  // Scroll de-bounce (ignore click immediately after scroll)
  const scrolledRef = React.useRef(false);
  React.useEffect(() => {
    const inner = containerRef.current?.closest('.raeditor-workspace-inner') as HTMLElement | null;
    if (!inner) return;
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      scrolledRef.current = true;
      clearTimeout(timer);
      timer = setTimeout(() => { scrolledRef.current = false; }, 300);
    };
    inner.addEventListener('scroll', onScroll);
    return () => { clearTimeout(timer); inner.removeEventListener('scroll', onScroll); };
  }, []);

  const onStageClick = (e: any) => {
    if ((store as any).activePage !== page) (page as any).select();
    if (scrolledRef.current) return;
    if (selectionDidOccur.current) return;
    const isMulti = e.evt.ctrlKey || e.evt.metaKey || e.evt.shiftKey;
    const inElements = e.target.findAncestor('.elements-container');
    const inAbsContainer = e.target.findAncestor('.page-abs-container');
    const inTransformer = e.target.findAncestor('Transformer');

    if (!isMulti && !inElements && !inTransformer && !inAbsContainer && !selection.visible) {
      (store as any).selectElements([]);
      return;
    }

    const elNode = e.target.findAncestor('.element', true);
    const el = (store as any).getElementById(elNode?.id());
    const topId = el?.top?.id;
    const alreadySelected = (store as any).selectedElementsIds.indexOf(topId) >= 0;
    const inPage = e.target.findAncestor('.page-container', true);

    if (topId && isMulti && !alreadySelected) {
      (store as any).selectElements([...(store as any).selectedElementsIds, topId]);
    } else if (topId && isMulti && alreadySelected) {
      (store as any).selectElements((store as any).selectedElementsIds.filter((id: string) => id !== topId));
    } else if (!topId || isMulti || alreadySelected) {
      if (inPage) (store as any).selectPages([(page as any).id]);
      else (store as any).selectPages([]);
    } else {
      (store as any).selectElements([topId]);
    }
  };

  // Snap guides
  useSnap(transformerRef, store as any, {
    stroke: snapGuideStroke,
    strokeWidth: snapGuideStrokeWidth,
    dash: snapGuideDash,
  });

  const isActivePage = (store as any).activePage === page;
  const isPageSelected = (store as any)._selectedPagesIds.includes((page as any).id);
  const PageControls = components?.PageControls;
  const TooltipComp = components?.Tooltip;
  const ContextMenuComp = components?.ContextMenu;

  const strokeScaleInv = 1 / (store as any).scale;

  return React.createElement(
    'div',
    {
      ref: containerRef,
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (!stageRef.current) return;
        stageRef.current.setPointersPositions(e);
        const pos = stageRef.current.findOne('.elements-container')?.getRelativePointerPosition();
        const stagePos = stageRef.current.getPointerPosition();
        const intersected = stageRef.current.getAllIntersections(stagePos)
          .map((n: any) => n.findAncestor('.element', true))
          .filter(Boolean);
        const unique = [...new Set(intersected.reverse())].map((n: any) => (store as any).getElementById((n as any).id()));
        const topEl = unique[0];
        if (domDropCallback) {
          domDropCallback(pos, topEl, { elements: unique as any[], page });
          domDropCallback = null;
        }
      },
      style: { position: 'relative', width: width + 'px', height: height + 'px', overflow: 'hidden' },
      className: 'raeditor-page-container' + (isActivePage ? ' active-page' : ''),
    },
    React.createElement(
      Stage,
      {
        ref: stageRef,
        width: Math.min(width, viewportSize.width + 200),
        height: Math.min(viewportSize.height + 200, height),
        onClick: onStageClick,
        onTap: onStageClick,
        onContextMenu: (e: any) => {
          e.evt.preventDefault();
          const elNode = e.target.findAncestor('.element', true);
          const el = (store as any).getElementById(elNode?.id());
          const topId = el?.top?.id;
          if (topId && (store as any).selectedElementsIds.indexOf(topId) < 0) {
            (store as any).selectElements([topId]);
          } else if (!topId) {
            (store as any).selectElements([]);
          }
          contextMenu.open({ x: e.evt.clientX, y: e.evt.clientY });
        },
        onMouseDown: onMouseDown,
        onMouseMove: (e: any) => {
          if (!e.evt.altKey && distanceLines) { setDistanceLines(null); return; }
          if (!e.evt.altKey) return;
          const elNode = e.target.findAncestor('.element', true);
          const targetId = elNode?.id();
          if (!(store as any).selectedElements[0]) return;
          if ((store as any).selectedElementsIds.includes(targetId)) return;

          const selRect = getTotalClientRect((store as any).selectedShapes as any[]);
          const targetEl = targetId ? (store as any).getElementById(targetId) : { x: 0, y: 0, width: (page as any).computedWidth, height: (page as any).computedHeight, rotation: 0 };
          const targetRect = getClientRect(targetEl);

          const lines: any[] = [];
          if (selRect.minX > targetRect.maxX) lines.push({ distance: selRect.minX - targetRect.maxX, box1: selRect, box2: targetRect, points: [{ x: selRect.minX, y: selRect.minY + selRect.height / 2 }, { x: targetRect.maxX, y: selRect.minY + selRect.height / 2 }, { x: targetRect.maxX, y: targetRect.minY + targetRect.height / 2 }] });
          if (selRect.maxX < targetRect.minX) lines.push({ distance: targetRect.minX - selRect.maxX, box1: selRect, box2: targetRect, points: [{ x: selRect.maxX, y: selRect.minY + selRect.height / 2 }, { x: targetRect.minX, y: selRect.minY + selRect.height / 2 }, { x: targetRect.minX, y: targetRect.minY + targetRect.height / 2 }] });
          if (selRect.minY > targetRect.maxY) lines.push({ box1: selRect, box2: targetRect, distance: selRect.minY - targetRect.maxY, points: [{ x: selRect.minX + selRect.width / 2, y: selRect.minY }, { x: selRect.minX + selRect.width / 2, y: targetRect.maxY }, { x: targetRect.minX + targetRect.width / 2, y: targetRect.maxY }] });
          if (selRect.maxY < targetRect.minY) lines.push({ box1: selRect, box2: targetRect, distance: targetRect.minY - selRect.maxY, points: [{ x: selRect.minX + selRect.width / 2, y: selRect.maxY }, { x: selRect.minX + selRect.width / 2, y: targetRect.minY }, { x: targetRect.minX + targetRect.width / 2, y: targetRect.minY }] });

          // inside container lines
          if (selRect.minX >= targetRect.minX && selRect.maxX <= targetRect.maxX && selRect.minY >= targetRect.minY && selRect.maxY <= targetRect.maxY) {
            lines.push({ distance: selRect.minX - targetRect.minX, box1: selRect, box2: targetRect, points: [{ x: selRect.minX, y: selRect.minY + selRect.height / 2 }, { x: targetRect.minX, y: selRect.minY + selRect.height / 2 }, { x: targetRect.minX, y: targetRect.minY + targetRect.height / 2 }] });
            lines.push({ distance: targetRect.maxX - selRect.maxX, box1: selRect, box2: targetRect, points: [{ x: selRect.maxX, y: selRect.minY + selRect.height / 2 }, { x: targetRect.maxX, y: selRect.minY + selRect.height / 2 }, { x: targetRect.maxX, y: targetRect.minY + targetRect.height / 2 }] });
            lines.push({ box1: selRect, box2: targetRect, distance: selRect.minY - targetRect.minY, points: [{ x: selRect.minX + selRect.width / 2, y: selRect.minY }, { x: selRect.minX + selRect.width / 2, y: targetRect.minY }, { x: targetRect.minX + targetRect.width / 2, y: targetRect.minY }] });
            lines.push({ box1: selRect, box2: targetRect, distance: targetRect.maxY - selRect.maxY, points: [{ x: selRect.minX + selRect.width / 2, y: selRect.maxY }, { x: selRect.minX + selRect.width / 2, y: targetRect.maxY }, { x: targetRect.minX + targetRect.width / 2, y: targetRect.maxY }] });
          }

          if (JSON.stringify(distanceLines) !== JSON.stringify(lines)) setDistanceLines(lines);
        },
        onDragStart: (e: any) => {
          const elNode = e.target.findAncestor('.element', true);
          if (elNode) {
            const el = (store as any).getElementById(elNode.id());
            const topId = el?.top?.id;
            if (topId && !(store as any).selectedElementsIds.includes(topId)) {
              (store as any).selectElements([topId]);
              e.target.stopDrag();
              e.target.startDrag(e);
              transformerRef.current?.startDrag(e);
            }
          }
          if (distanceLines) setDistanceLines(null);
        },
        pageId: (page as any).id,
        style: { position: 'absolute', overflow: 'hidden', top: 0, left: 0 },
      },
      React.createElement(
        Layer,
        null,
        // Stage background fill
        React.createElement(StageHitRect, { width, height, fill: backColor }),
        // Main page group (scaled + offset)
        React.createElement(
          Group,
          { x: xOff, y: yOff, scaleX: (store as any).scale, scaleY: (store as any).scale, name: 'page-container' },
          React.createElement(
            Group,
            { name: 'page-container-2' },
            // Page background
            React.createElement(
              Group,
              { name: 'page-background-group', x: bleed, y: bleed },
              React.createElement(PageBackground, {
                x: -(page as any).bleed,
                y: -(page as any).bleed,
                width: (page as any).computedWidth + 2 * (page as any).bleed,
                height: (page as any).computedHeight + 2 * (page as any).bleed,
                background: (page as any).background,
                name: 'page-background',
                preventDefault: false,
                scale: (store as any).scale,
              }),
            ),
            // Elements
            React.createElement(
              Group,
              { x: bleed, y: bleed, name: 'elements-container', listening: !(store as any).isPlaying },
              React.createElement(Rect, { name: 'elements-area', width: (page as any).computedWidth, height: (page as any).computedHeight, listening: false }),
              React.createElement(ElementsLayer, { elements: (page as any).children, store }),
            ),
            // Bleed border
            React.createElement(Rect, {
              stroke: bleedColor,
              name: 'bleed',
              strokeWidth: (page as any).bleed,
              x: (page as any).bleed / 2,
              y: (page as any).bleed / 2,
              width: (page as any).computedWidth + (page as any).bleed,
              height: (page as any).computedHeight + (page as any).bleed,
              listening: false,
              visible: (page as any).bleed > 0 && (store as any).bleedVisible,
              hideInExport: true,
            }),
            // License limit banner
            ___() === LICENSE_VERSION && React.createElement(LicenseBanner, {
              name: 'hit-detection',
              x: -strokeScaleInv / 2,
              y: -strokeScaleInv / 2,
              width: pageW + strokeScaleInv,
              height: pageH + strokeScaleInv,
            }),
          ),
          // Page border highlight — coords are page-local (page-container already applies xOff/scale)
          React.createElement(
            Group,
            null,
            React.createElement(Rect, {
              name: 'page-highlight',
              hideInExport: true,
              x: -strokeScaleInv / 2,
              y: -strokeScaleInv / 2,
              width: pageW + strokeScaleInv,
              height: pageH + strokeScaleInv,
              stroke: isPageSelected ? activePageBorderColor : pageBorderColor,
              strokeWidth: 2,
              listening: false,
              strokeScaleEnabled: false,
            }),
          ),
          // Absolute positioned container (transformer, guides, etc.) — bleed offset matches elements-container
          React.createElement(
            Group,
            { x: bleed, y: bleed, name: 'page-abs-container' },
            // Transformer
            React.createElement(Transformer, {
              ref: transformerRef,
              onDragStart: (e: any) => {
                if (e.evt?.altKey && altCloneEnabled) {
                  (store as any).selectedElements.forEach((el: any) => {
                    const clone = el.clone({}, { skipSelect: true });
                    const idx = (page as any).children.indexOf(el);
                    (page as any).setElementZIndex(clone.id, idx);
                  });
                }
                (store as any).history.startTransaction();
              },
              onDragEnd: () => { (store as any).history.endTransaction(); },
              onTransformStart: () => {
                (store as any).history.startTransaction();
                setDistanceLines(null);
              },
              boundBoxFunc: (oldBox: any, newBox: any) => {
                const tooSmallNew = Math.abs(newBox.width) < 1 || Math.abs(newBox.height) < 1;
                const tooSmallOld = Math.abs(oldBox.width) < 1 || Math.abs(oldBox.height) < 1;
                return tooSmallNew && !tooSmallOld ? oldBox : newBox;
              },
              onTransform: (e: any) => {
                const nodes = transformerRef.current?.nodes() || [];
                const lastNode = nodes[nodes.length - 1];
                if (e.target !== lastNode) return;
                const rect = transformerRef.current?.__getNodeRect?.();
                const anchor = transformerRef.current?.getActiveAnchor?.();
                if (rect) setTransformLabel({ anchor, ...rect });
              },
              onTransformEnd: () => {
                setTransformLabel({});
                (store as any).history.endTransaction();
              },
              visible: !(store as any).isPlaying,
            }),
            // Distance measurement lines (Alt key)
            distanceLines && distanceLines.map(({ points, distance, box1, box2 }: any, i: number) =>
              React.createElement(
                Group,
                { name: 'distances-container', hideInExport: true, key: i, listening: false },
                React.createElement(Rect, { ...box1, stroke: distanceGuideStroke || 'rgb(0, 161, 255)', strokeWidth: 1, strokeScaleEnabled: false }),
                React.createElement(Rect, { ...box2, stroke: distanceGuideStroke || 'rgb(0, 161, 255)', strokeWidth: 1, strokeScaleEnabled: false }),
                React.createElement(Line, { points: [points[0].x, points[0].y, points[1].x, points[1].y], stroke: distanceGuideStroke || 'rgb(0, 161, 255)', strokeWidth: 1, strokeScaleEnabled: false }),
                React.createElement(Line, { points: [points[1].x, points[1].y, points[2].x, points[2].y], stroke: distanceGuideStroke || 'rgb(0, 161, 255)', strokeWidth: 1, strokeScaleEnabled: false }),
                React.createElement(
                  Label,
                  {
                    x: (points[0].x + points[1].x) / 2,
                    y: (points[0].y + points[1].y) / 2,
                    offsetY: -10,
                    scaleX: 1 / (store as any).scale,
                    scaleY: 1 / (store as any).scale,
                  },
                  React.createElement(Tag, { cornerRadius: 5, fill: distanceLabelFill || 'rgb(0, 161, 255)', pointerDirection: 'down' }),
                  React.createElement(Text, { align: 'center', verticalAlign: 'middle', fill: distanceLabelTextFill || 'white', padding: 5, text: pxToUnitString({ unit: (store as any).unit, dpi: (store as any).dpi, px: distance }) }),
                ),
              ),
            ),
            // Rendering overlay
            (page as any)._rendering && React.createElement(
              Group,
              null,
              React.createElement(Rect, { width: pageW, height: pageH, fill: 'rgba(255,255,255,0.9)' }),
              React.createElement(Text, { text: 'Rendering...', fontSize: 60, width: pageW, height: pageH, align: 'center', verticalAlign: 'middle' }),
            ),
            // Tooltip
            TooltipComp && React.createElement(TooltipComp, { components, store, page, stageRef }),
            // Context menu
            ContextMenuComp && React.createElement(Html, null, React.createElement(ContextMenuComp, { components, store, ...contextMenu.props })),
          ),
          // Transform size/rotation label
          React.createElement(TransformLabel, {
            ...transformLabel,
            store,
            tagFill: transformLabelFill,
            textFill: transformLabelTextFill,
          }),
          // Credit
          isCreditVisible() && React.createElement(Text, {
            text: 'Powered by raeditor.com',
            fontSize: 14,
            fill: 'rgba(0,0,0,0.6)',
            x: width - 170,
            y: height - 18,
            onMouseEnter: (e: any) => { e.target.getStage().container().style.cursor = 'pointer'; },
            onMouseLeave: (e: any) => { e.target.getStage().container().style.cursor = ''; },
            onTouchStart: (e: any) => { e.cancelBubble = true; },
            onMouseDown: (e: any) => { e.cancelBubble = true; },
            onClick: () => window.open('https://raeditor.com'),
            onTap: () => window.open('https://raeditor.com'),
          }),
        ),
        // Workspace (out-of-page) background overlay — stage coords, drawn above page content
        React.createElement(Line, {
          name: 'workspace-background',
          points: [0, 0, width, 0, width, height, 0, height, 0, 0, xOff, yOff, xOff, height - yOff, width - xOff, height - yOff, width - xOff, yOff, xOff, yOff],
          listening: false,
          closed: true,
          fill: backColor,
        }),
        // Snap guide lines container — at Layer level so coordinates are in stage/screen space
        React.createElement(Group, { name: 'line-guides' }),
        // Marquee selection rect — stage coords, must be at Layer level (outside scaled page-container)
        React.createElement(SelectionRect, {
          selection,
          fill: selectionRectFill,
          stroke: selectionRectStroke,
          strokeWidth: selectionRectStrokeWidth,
        }),
      ),
    ),
    // Page controls (outside Konva)
    showPageControls && PageControls && React.createElement(PageControls, { store, page, xPadding: xOff, yPadding: yOff }),
  );
});

(Page as any).displayName = 'Page';

export default Page;
