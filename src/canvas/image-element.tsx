'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { autorun } from 'mobx';
import { Image, Group, Rect, Transformer, Arc, Text } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { Portal } from 'react-konva-utils';
import { TransformerConfig } from 'konva/lib/shapes/Transformer';
import { incrementLoader, triggerLoadError } from '../utils/loader';
import * as svgUtils from '../utils/svg';
import { flags } from '../utils/flags';
import { trySetCanvasSize } from '../utils/canvas';
import { applyFilter } from './apply-filters';
import { useFadeIn } from './use-fadein';
import { isTouchDevice } from '../utils/screen';
import { useDelayer } from './use-delayer';
import { StoreType } from '../model/store';
import { ImageElementType } from '../model/image-model';

function createCanvas(): HTMLCanvasElement {
  return document.createElement('canvas');
}

function isSvgSrc(src: string): boolean {
  return src.indexOf('data:image/svg+xml') >= 0 || src.indexOf('.svg') >= 0;
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export const useSizeFixer = (src: string): string => {
  const [fixed, setFixed] = React.useState(src);
  React.useEffect(() => {
    (async () => {
      if (!isSvgSrc(src)) { setFixed(src); return; }
      const str = await svgUtils.urlToString(src);
      const sized = svgUtils.fixSize(str);
      const url = svgUtils.svgToURL(sized);
      if (url !== fixed) setFixed(url);
    })();
  }, [src]);
  return fixed;
};

// Inner crop transformer style (visible resize handles on the inner image)
const innerCropTransformerStyle: TransformerConfig = {
  boundBoxFunc: (old: any, nw: any) => (nw.width < 5 || nw.height < 5 ? old : nw),
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  keepRatio: false,
  rotateEnabled: false,
  anchorFill: 'rgb(240, 240, 240)',
  anchorStrokeWidth: 2,
  borderStrokeWidth: 2,
};

export const setInnerImageCropTransformerStyle = (style: TransformerConfig) => {
  Object.assign(innerCropTransformerStyle, style);
};

// Outer crop transformer style (resize handles on the crop rect)
const outerCropTransformerStyle: TransformerConfig = {
  boundBoxFunc: (old: any, nw: any) => (nw.width < 5 || nw.height < 5 ? old : nw),
  anchorSize: 20,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  rotateEnabled: false,
  borderEnabled: false,
  anchorCornerRadius: 10,
  anchorStrokeWidth: 2,
  borderStrokeWidth: 2,
};

export const setOuterImageCropTransformerStyle = (style: TransformerConfig) => {
  Object.assign(outerCropTransformerStyle, style);
};

function downscaleImageData(
  imageData: ImageData,
  targetW: number,
  targetH: number,
  srcX: number, srcY: number,
  srcW: number, srcH: number,
): ImageData {
  const dst = new ImageData(targetW, targetH);
  const srcArr = new Int32Array(imageData.data.buffer);
  const dstArr = new Int32Array(dst.data.buffer);
  const srcWidth = imageData.width;
  const scaleX = targetW / srcW;
  const scaleY = targetH / srcH;
  const blockW = Math.round(1 / scaleX);
  const blockH = Math.round(1 / scaleY);
  const blockSize = blockW * blockH;
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const ox = srcX + Math.round(x / scaleX);
      const oy = srcY + Math.round(y / scaleY);
      let r = 0, g = 0, b = 0, a = 0;
      for (let by = 0; by < blockH; by++) {
        for (let bx = 0; bx < blockW; bx++) {
          const px = srcArr[ox + bx + (oy + by) * srcWidth];
          r += (px << 24) >>> 24;
          g += (px << 16) >>> 24;
          b += (px << 8) >>> 24;
          a += px >>> 24;
        }
      }
      r = Math.round(r / blockSize);
      g = Math.round(g / blockSize);
      b = Math.round(b / blockSize);
      a = Math.round(a / blockSize);
      dstArr[x + y * targetW] = (a << 24) | (b << 16) | (g << 8) | r;
    }
  }
  return dst;
}

export const useCornerRadiusAndCrop = (
  element: ImageElementType,
  image: HTMLImageElement | HTMLCanvasElement | undefined,
  crop: { x: number; y: number; width: number; height: number },
  pixelRatio: number,
  cornerRadius = 0,
  skipDownscale = false,
  isVector = true,
): HTMLCanvasElement | HTMLImageElement | undefined => {
  const w = Math.floor(clamp((element as any).a.width * pixelRatio, 1, 10000));
  const h = Math.floor(clamp((element as any).a.height * pixelRatio, 1, 10000));
  const r = Math.min(cornerRadius * pixelRatio, w / 2, h / 2);
  const scale = Math.max((element as any).a.width / crop.width, (element as any).a.height / crop.height) * pixelRatio;
  const shouldDownscale =
    (element as any).page._exportingOrRendering &&
    flags.imageDownScalingEnabled &&
    scale < 1 &&
    !skipDownscale;
  const isNoCrop =
    crop.x === 0 && crop.y === 0 &&
    crop.width === (image as any)?.width &&
    crop.height === (image as any)?.height;

  const offscreen = React.useMemo(() => {
    if (image && (image as any).width && (image as any).height) {
      return (isNoCrop && r === 0 && !shouldDownscale) ? undefined : createCanvas();
    }
    return undefined;
  }, [image, r, shouldDownscale, isNoCrop]);

  React.useLayoutEffect(() => {
    if (!offscreen || !image) return;
    trySetCanvasSize(offscreen, w, h);
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    if (r) {
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.arc(w - r, r, r, (3 * Math.PI) / 2, 0, false);
      ctx.lineTo(w, h - r);
      ctx.arc(w - r, h - r, r, 0, Math.PI / 2, false);
      ctx.lineTo(r, h);
      ctx.arc(r, h - r, r, Math.PI / 2, Math.PI, false);
      ctx.lineTo(0, r);
      ctx.arc(r, r, r, Math.PI, (3 * Math.PI) / 2, false);
      ctx.clip();
    }
    let src: HTMLImageElement | HTMLCanvasElement = image as any;
    let srcCrop = crop;
    if (shouldDownscale) {
      const tmp = createCanvas();
      const tw = Math.max(1, Math.floor((image as any).width * scale));
      const th = Math.max(1, Math.floor((image as any).height * scale));
      tmp.width = (image as any).width;
      tmp.height = (image as any).height;
      tmp.getContext('2d')?.drawImage(image as any, 0, 0);
      const id = tmp.getContext('2d')!.getImageData(0, 0, tmp.width, tmp.height);
      const downscaled = downscaleImageData(id, tw, th, 0, 0, tmp.width, tmp.height);
      tmp.width = tw;
      tmp.height = th;
      tmp.getContext('2d')?.putImageData(downscaled, 0, 0);
      src = tmp;
      srcCrop = {
        x: Math.floor(crop.x * scale),
        y: Math.floor(crop.y * scale),
        width: Math.floor(crop.width * scale),
        height: Math.floor(crop.height * scale),
      };
    }
    ctx.drawImage(src as any, srcCrop.x, srcCrop.y, srcCrop.width, srcCrop.height, 0, 0, w, h);
  }, [offscreen, (element as any).a.width, (element as any).a.height, crop.x, crop.y, crop.width, crop.height, cornerRadius, pixelRatio, skipDownscale, (element as any).page._exportingOrRendering, shouldDownscale]);

  React.useEffect(() => () => {
    if (offscreen && offscreen.nodeName === 'CANVAS') {
      Konva.Util.releaseCanvas(offscreen as any);
    }
  }, [offscreen]);

  return offscreen || image;
};

// Loading spinner
const ImageLoadingSpinner = observer(({ element }: { element: any }) => {
  const r = Math.min(30, element.a.width / 4, element.a.height / 4);
  const arcRef = React.useRef<any>(null);
  React.useEffect(() => {
    const arc = arcRef.current;
    if (!arc) return;
    const anim = new Konva.Animation((frame) => {
      arc.rotate(((frame?.timeDiff) || 0) / 2);
    }, arc.getLayer());
    anim.start();
    return () => { anim.stop(); };
  });
  return React.createElement(
    Group,
    { x: element.x, y: element.y, rotation: element.rotation, listening: false, opacity: element.a.opacity, hideInExport: !element.showInExport },
    React.createElement(Rect, { width: element.a.width, height: element.a.height, fill: 'rgba(124, 173, 212, 0.8)' }),
    React.createElement(Arc, {
      ref: arcRef,
      x: element.a.width / 2,
      y: element.a.height / 2,
      fill: 'white',
      outerRadius: Math.abs(r),
      innerRadius: Math.max(1, r - 5),
      angle: 270,
    }),
  );
});

// Error state
const ImageError = observer(({ element }: { element: any }) => {
  const fontSize = Math.max(10, Math.min(30, element.a.width / 25));
  return React.createElement(
    Group,
    { x: element.x, y: element.y, rotation: element.rotation, listening: false, opacity: element.a.opacity, hideInExport: !element.showInExport },
    React.createElement(Rect, { width: element.a.width, height: element.a.height, fill: 'rgba(223, 102, 102, 0.8)' }),
    React.createElement(Text, {
      text: 'Can not load the image...',
      fontSize,
      width: element.a.width,
      height: element.a.height,
      align: 'center',
      fill: 'white',
      verticalAlign: 'middle',
      padding: 5,
    }),
  );
});

// Default image loader — replaceable via setImageLoaderHook
let useImageLoaderHook: (src: string, crossOrigin: string) => [HTMLImageElement | undefined, string] = useImage as any;

export const setImageLoaderHook = (customImageLoaderHook: any) => {
  useImageLoaderHook = customImageLoaderHook;
};

export const useImageLoader = (status: string, src = '', id = ''): void => {
  const releaseRef = React.useRef<(() => void) | undefined>();
  const release = () => { releaseRef.current?.(); releaseRef.current = undefined; };
  React.useEffect(() => release, []);
  React.useLayoutEffect(() => {
    const shortSrc = src.slice(0, 200);
    const label = `image with id ${id} url: ${shortSrc}`;
    if (status === 'loading' && !releaseRef.current) { releaseRef.current = incrementLoader(label); }
    if (status !== 'loading') release();
    if (status === 'failed') triggerLoadError(label);
  }, [status]);
};

// Hook to handle SVG src transformation (color replacement, fix size)
function useSvgSrc(element: any): [string, string] {
  const isSvg = React.useMemo(() => isSvgSrc(element.src) || element.type === 'svg', [element.src, element.type]);
  const [svgSrc, setSvgSrc] = React.useState(element.src);
  const [svgStatus, setSvgStatus] = React.useState<string>('loading');
  React.useEffect(() => {
    if (!isSvg || !element.src) return;
    let cancelled = false;
    (async () => {
      setSvgStatus('loading');
      const str = await svgUtils.urlToString(element.src);
      const sized = svgUtils.fixSize(str);
      let url: string;
      if (element.colorsReplace) {
        url = svgUtils.replaceColors(sized, element.colorsReplace || new Map());
      } else {
        url = svgUtils.svgToURL(sized);
      }
      if (!cancelled) {
        setSvgSrc(url);
        setSvgStatus('loaded');
      }
    })();
    return () => { cancelled = true; };
  }, [element.src, JSON.stringify(element.colorsReplace)]);

  return isSvg ? [svgSrc, svgStatus] : [element.src, 'loaded'];
}

// Apply flip/SVG scale transform to image
function useFlippedImage(element: any, image: HTMLImageElement | HTMLCanvasElement | undefined, pixelRatio: number) {
  const result = React.useMemo(() => {
    const { flipX, flipY } = element;
    const isSvg = element.type === 'svg' || isSvgSrc(element.src || '');
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    const isSafariOrFirefoxSvg = (/^((?!chrome|android).)*safari/i.test(navigator.userAgent) || isFirefox) && isSvg;
    const needsMask = element.maskSrc;
    if (!flipX && !flipY && !isSafariOrFirefoxSvg && !needsMask) return image;
    if (!image || !(image as any).width || !(image as any).height) return null;
    const canvas = createCanvas();
    let scale = 1;
    if (element.type === 'svg') {
      scale = Math.max(element.a.width / (image as any).width * pixelRatio, element.a.height / (image as any).height * pixelRatio);
    }
    trySetCanvasSize(canvas, Math.max((image as any).width * scale, 1), Math.max((image as any).height * scale, 1));
    const ctx = canvas.getContext('2d')!;
    const dx = flipX ? -canvas.width : 0;
    const dy = flipY ? -canvas.height : 0;
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(image as any, dx, dy, canvas.width, canvas.height);
    return canvas;
  }, [element.maskSrc, element.flipX, element.flipY, image, element.a.width, element.a.height, pixelRatio]);

  React.useEffect(() => () => {
    if (result && (result as HTMLCanvasElement).nodeName === 'CANVAS') {
      Konva.Util.releaseCanvas(result as any);
    }
  }, [result]);

  return result;
}

// Apply mask image (source-in composite)
function useMaskedImage(element: any, image: HTMLImageElement | HTMLCanvasElement | null | undefined) {
  const maskSrc = useSizeFixer(element.maskSrc || '');
  const [maskImg] = useImageLoaderHook(maskSrc, 'anonymous');
  useImageLoader(element.maskSrc ? (maskImg ? 'loaded' : 'loading') : 'loaded', element.maskSrc || '', element.id);

  return React.useMemo(() => {
    if (!maskImg) return image;
    if (!image || !(image as any).width || !(image as any).height) return image;
    const canvas = createCanvas();
    canvas.width = Math.max((image as any).width, 1);
    canvas.height = Math.max((image as any).height, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) return image;
    ctx.drawImage(image as any, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    // scale mask to fit image bounds
    const ratio = maskImg.width / maskImg.height;
    let mx: number, my: number, mw: number, mh: number;
    if (ratio >= (image as any).width / (image as any).height) {
      mw = (image as any).width; mh = (image as any).width / ratio;
    } else {
      mw = (image as any).height * ratio; mh = (image as any).height;
    }
    mx = ((image as any).width - mw) / 2;
    my = ((image as any).height - mh) / 2;
    ctx.drawImage(maskImg as any, mx, my, mw, mh, 0, 0, (image as any).width, (image as any).height);
    return canvas;
  }, [image, maskImg, element.a.width, element.a.height]);
}

// Apply clip mask (clipSrc)
function useClipMaskedImage(element: any, image: HTMLImageElement | HTMLCanvasElement | undefined, pixelRatio: number, deps: any[]) {
  const clipSrc = useSizeFixer(element.clipSrc || '');
  const [clipImg] = useImageLoaderHook(clipSrc, 'anonymous');
  const clipStatus = element.clipSrc ? (clipImg ? 'loaded' : 'loading') : 'loaded';
  useImageLoader(clipStatus, element.clipSrc || '', element.id);

  const canvas = React.useMemo(() => {
    if (image && clipImg) return createCanvas();
    return undefined;
  }, [image, clipImg]);

  React.useLayoutEffect(() => {
    if (!clipImg || !image || !(image as any).width || !(image as any).height) return;
    if (!clipImg.width || !clipImg.height) return;
    if (!canvas) return;
    const ratio = Math.max(element.a.width / clipImg.width * pixelRatio, element.a.height / clipImg.height * pixelRatio);
    const tmp = createCanvas();
    tmp.width = Math.max(clipImg.width * ratio, 1);
    tmp.height = Math.max(clipImg.height * ratio, 1);
    tmp.getContext('2d')?.drawImage(clipImg as any, 0, 0, tmp.width, tmp.height);
    canvas.width = Math.max((image as any).width, 1);
    canvas.height = Math.max((image as any).height, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.drawImage(tmp, 0, 0, (image as any).width, (image as any).height);
    Konva.Util.releaseCanvas(tmp as any);
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(image as any, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, [canvas, image, clipImg, element.a.width, element.a.height, pixelRatio, ...deps]);

  return element.clipSrc && clipImg ? canvas : image;
}

// Placeholder for when no image is loaded
const placeholderCanvas = createCanvas();

type ImageProps = {
  store: StoreType;
  element: ImageElementType;
};

export const ImageElement = observer(({ element, store }: ImageProps) => {
  const [isTransforming, setIsTransforming] = React.useState(false);
  const imageRef = React.useRef<any>(null);
  const cropImageRef = React.useRef<any>(null);
  const isSelected = (store as any).selectedShapes.indexOf(element) >= 0 && (element as any).selectable;

  // SVG src resolution
  const [resolvedSrc, svgStatus] = useSvgSrc(element as any);

  // Load image
  const [rawImage, imageStatus] = useImageLoaderHook(resolvedSrc, 'anonymous');

  // For SVG, use svgStatus as the true status
  const effectiveStatus = (element as any).type !== 'svg' || svgStatus === 'loaded' ? imageStatus : 'loading';
  useImageLoader(effectiveStatus, (element as any).src, (element as any).id);

  // Scale for crop+pixel ratio
  const exportScale = (element as any).page._exportingOrRendering ? 1 : Math.max(1, (store as any).scale);
  const pixelRatioFull = (store as any)._elementsPixelRatio * exportScale;

  // Keep last valid image (avoid flicker on reload)
  const lastGoodImage = React.useRef<HTMLImageElement | HTMLCanvasElement | undefined>();
  React.useEffect(() => { if (rawImage) lastGoodImage.current = rawImage; }, [rawImage]);
  const stableImage = (imageStatus !== 'failed' || (element as any).type === 'svg') ? (rawImage || lastGoodImage.current) : undefined;

  // Apply flip/SVG scale
  const flippedImage = useFlippedImage(element as any, stableImage, pixelRatioFull);

  // Apply mask
  const maskedImage = useMaskedImage(element as any, flippedImage) || placeholderCanvas;

  // Compute crop geometry
  let { cropX, cropY, cropWidth, cropHeight } = element as any;
  if (effectiveStatus !== 'loaded') { cropX = cropY = 0; cropWidth = cropHeight = 1; }

  const nativeW = (maskedImage as any).width || 1;
  const nativeH = (maskedImage as any).height || 1;
  const aspectEl = (element as any).a.width / (element as any).a.height;
  const cropW = nativeW * cropWidth;
  const cropH = nativeH * cropHeight;
  const cropAspect = cropW / cropH;
  const stretchEnabled = (element as any).stretchEnabled;
  let drawW: number, drawH: number;
  if (stretchEnabled) {
    drawW = cropW; drawH = cropH;
  } else if (aspectEl >= cropAspect) {
    drawW = cropW; drawH = cropW / aspectEl;
  } else {
    drawW = cropH * aspectEl; drawH = cropH;
  }

  const cropRect = { x: nativeW * cropX, y: nativeH * cropY, width: drawW, height: drawH };
  const cornerRadius: number = (element as any).cornerRadius ?? 0;

  // Pixel ratio for crop rendering
  const cropPixelRatio = (element as any).page._exportingOrRendering ? 1 : Math.min(2, (store as any).scale);
  const effectivePixelRatio = (store as any)._elementsPixelRatio * cropPixelRatio;

  // Corner radius + crop canvas
  const croppedImage = useCornerRadiusAndCrop(
    element,
    maskedImage as any,
    cropRect,
    effectivePixelRatio,
    cornerRadius,
    isTransforming || (element as any)._cropModeEnabled || (element as any).type === 'svg',
    true,
  );

  // Clip src mask
  const finalImage = useClipMaskedImage(element as any, croppedImage as any, effectivePixelRatio, [cropRect, cornerRadius, effectivePixelRatio]);

  const scaleForCrop = Math.max((element as any).a.width / drawW, (element as any).a.height / drawH);

  // Crop mode click-outside handler
  React.useEffect(() => {
    if (!(element as any)._cropModeEnabled) return;
    const stage = imageRef.current?.getStage();
    function onStageClick(e: any) {
      if ((element as any)._cropModeEnabled && e.target !== cropImageRef.current) {
        (element as any).toggleCropMode(false);
      }
    }
    function onBodyClick(e: any) {
      if ((element as any)._cropModeEnabled && e.target.parentNode !== stage?.content) {
        (element as any).toggleCropMode(false);
      }
    }
    document.body.addEventListener('click', onBodyClick);
    stage?.on('click', onStageClick);
    stage?.on('tap', onStageClick);
    return () => {
      document.body.removeEventListener('click', onBodyClick);
      document.body.removeEventListener('touchstart', onBodyClick);
      stage?.off('click', onStageClick);
      stage?.off('click', onStageClick);
    };
  }, [(element as any)._cropModeEnabled]);

  // Apply filters
  React.useLayoutEffect(() => {
    if (!isTransforming && !(element as any)._cropModeEnabled) {
      applyFilter(imageRef.current, element as any);
      return autorun(() => { applyFilter(imageRef.current, element as any); }, { delay: 100 });
    }
  }, [finalImage, (element as any).page._exportingOrRendering, isTransforming, cropWidth, cropHeight, (element as any)._cropModeEnabled]);

  React.useLayoutEffect(() => {
    if (isTransforming || (element as any)._cropModeEnabled) {
      imageRef.current?.clearCache();
    } else {
      applyFilter(imageRef.current, element as any);
    }
  }, [isTransforming, (element as any).a.width, (element as any).a.height, (element as any)._cropModeEnabled]);

  React.useEffect(() => {
    applyFilter(imageRef.current, element as any);
  }, [(element as any).shadowEnabled, (element as any).shadowBlur, (element as any).cornerRadius,
    (element as any).shadowColor, (element as any).shadowOffsetX, (element as any).shadowOffsetY, (element as any).shadowOpacity]);

  // Crop transformer refs
  const cropRectRef = React.useRef<any>(null);
  const innerTransformerRef = React.useRef<any>(null);
  const outerTransformerRef = React.useRef<any>(null);

  React.useLayoutEffect(() => {
    if ((element as any)._cropModeEnabled) {
      innerTransformerRef.current?.nodes([cropRectRef.current]);
      outerTransformerRef.current?.nodes([cropImageRef.current]);
    }
  }, [(element as any)._cropModeEnabled]);

  // Pinch-zoom state for touch crop
  const pinchMidRef = React.useRef<{ x: number; y: number } | null>(null);
  const pinchDistRef = React.useRef<number>(0);
  const isDraggingRef = React.useRef(false);

  const handleCropDragMove = (e: any) => {
    e.evt?.touches?.length > 2 && e.target.stopDrag();
    if (Math.round(e.target.x()) > 0) { e.target.x(0); e.target.scaleX(1); }
    if (Math.round(e.target.y()) > 0) { e.target.y(0); e.target.scaleY(1); }
    const tw = e.target.width() * e.target.scaleX();
    const th = e.target.height() * e.target.scaleY();
    const maxCropX = 1 - drawW / nativeW;
    const maxCropY = 1 - drawH / nativeH;
    const newCropX = Math.min(maxCropX, Math.max(0, Math.round(-e.target.x()) / tw));
    const newCropY = Math.min(maxCropY, Math.max(0, Math.round(-e.target.y()) / th));
    const newCropW = Math.min(1, drawW / tw);
    const newCropH = Math.min(1, drawH / th);
    e.target.setAttrs({
      x: -newCropX * nativeW,
      y: -newCropY * nativeH,
      scaleX: 1, scaleY: 1,
    });
    (element as any).set({ cropX: newCropX, cropY: newCropY, cropWidth: newCropW, cropHeight: newCropH });
  };

  const handleTouchMove = (e: any) => {
    e.evt.preventDefault();
    const pointers = e.target.getStage().getPointersPositions();
    const p0 = pointers[0];
    const p1 = pointers[1];
    const target = e.target;
    if (p0 && !p1 && !target.isDragging() && isDraggingRef.current) {
      target.startDrag();
      isDraggingRef.current = false;
    }
    if (p0 && p1) {
      Konva.hitOnDragEnabled = true;
      if (target.isDragging()) { isDraggingRef.current = true; target.stopDrag(); }
      const inv = target.getAbsoluteTransform().copy();
      inv.invert();
      const mid = midpoint(p0, p1);
      const dist = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));
      if (!pinchMidRef.current) { pinchMidRef.current = mid; return; }
      const prevMid = pinchMidRef.current;
      pinchDistRef.current = pinchDistRef.current || dist;
      const pos = target.position();
      const dx = mid.x - pos.x;
      const dy = mid.y - pos.y;
      const scale = dist / pinchDistRef.current;
      target.scaleX(scale);
      target.scaleY(scale);
      const tf = inv.point(mid);
      const ptf = inv.point(prevMid);
      target.position({
        x: Math.min(0, mid.x - dx * scale + (tf.x - ptf.x)),
        y: Math.min(0, mid.y - dy * scale + (tf.y - ptf.y)),
      });
      pinchDistRef.current = dist;
      pinchMidRef.current = mid;
      handleCropDragMove(e);
    }
  };

  const handleTouchEnd = () => {
    pinchDistRef.current = 0;
    pinchMidRef.current = null;
    Konva.hitOnDragEnabled = false;
  };

  const onDblClick = () => {
    if ((element as any).type !== 'svg' && (element as any).contentEditable) {
      if (stretchEnabled) return;
      setTimeout(() => { (element as any).toggleCropMode(true); });
    }
  };

  const isSvgWithFallback = (element as any).type === 'svg' && lastGoodImage.current;
  const [isLoading] = useDelayer(effectiveStatus === 'loading' && !isSvgWithFallback, 100, false, false);
  const isFailed = effectiveStatus === 'failed';
  const isReady = !isLoading && !isFailed;

  const prevCropRef = React.useRef({ cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 });
  const opacity = isReady ? (element as any).a.opacity : 0;
  useFadeIn(imageRef, opacity);

  const isListening = (element as any).selectable || (store as any).role === 'admin';
  const isTouch = isTouchDevice();

  return React.createElement(
    React.Fragment,
    null,
    isLoading && React.createElement(ImageLoadingSpinner, { element }),
    isFailed && React.createElement(ImageError, { element }),
    React.createElement(Image as any, {
      ref: imageRef,
      name: 'element',
      id: (element as any).id,
      image: finalImage,
      x: (element as any).a.x,
      y: (element as any).a.y,
      width: (element as any).a.width || 1,
      height: (element as any).a.height || 1,
      rotation: (element as any).a.rotation,
      opacity,
      shadowEnabled: (element as any).shadowEnabled,
      shadowBlur: (element as any).shadowBlur,
      shadowOffsetX: (element as any).shadowOffsetX,
      shadowOffsetY: (element as any).shadowOffsetY,
      shadowColor: (element as any).shadowColor,
      shadowOpacity: (element as any).shadowOpacity,
      customCrop: cropRect,
      listening: isListening,
      draggable: isTouch ? (element as any).draggable && isSelected : (element as any).draggable,
      preventDefault: !isTouch || isSelected,
      hideInExport: !(element as any).showInExport,
      onDragMove: (e: any) => { (element as any).set({ x: e.target.x(), y: e.target.y() }); },
      onDragEnd: (e: any) => { (element as any).set({ x: e.target.x(), y: e.target.y() }); },
      onDblClick,
      onDblTap: onDblClick,
      onTransformStart: () => {
        setIsTransforming(true);
        prevCropRef.current = {
          cropX: (element as any).cropX, cropY: (element as any).cropY,
          cropWidth: (element as any).cropWidth, cropHeight: (element as any).cropHeight,
        };
      },
      onTransform: (e: any) => {
        const node = e.currentTarget;
        const scaleX = Math.abs(node.scaleX() - 1) < 1e-7 ? 1 : node.scaleX();
        const scaleY = Math.abs(node.scaleY() - 1) < 1e-7 ? 1 : node.scaleY();
        node.scaleX(1); node.scaleY(1);
        const transformer = e.target.getStage()?.findOne('Transformer');
        const maxCropX = 1 - drawW / nativeW;
        const newCropX = Math.min(maxCropX, Math.max(0, (element as any).cropX));
        const maxCropY = 1 - drawH / nativeH;
        const newCropY = Math.min(maxCropY, Math.max(0, (element as any).cropY));
        const anchor = transformer?.getActiveAnchor() || '';
        const isCorner = !(anchor.includes('middle') || anchor.includes('center'));
        const shrinkingH = !isCorner && scaleX < 1 && prevCropRef.current.cropHeight > drawH / nativeH;
        let newCropW = isCorner ? (element as any).cropWidth : (element as any).cropWidth * scaleX;
        if (shrinkingH) newCropW = (element as any).cropWidth;
        const shrinkingW = !isCorner && scaleY < 1 && prevCropRef.current.cropWidth > drawW / nativeW;
        let newCropH = isCorner ? (element as any).cropHeight : (element as any).cropHeight * scaleY;
        if (shrinkingW) newCropH = (element as any).cropHeight;
        if (stretchEnabled) { newCropW = (element as any).cropWidth; newCropH = (element as any).cropHeight; }
        (element as any).set({
          cropX: newCropX, cropY: newCropY,
          x: node.x(), y: node.y(),
          width: node.width() * scaleX, height: node.height() * scaleY,
          rotation: e.target.rotation(),
          cropWidth: Math.min(newCropW, 1 - newCropX),
          cropHeight: Math.min(newCropH, 1 - newCropY),
        });
      },
      onTransformEnd: (e: any) => {
        const node = e.currentTarget;
        (element as any).set({
          width: node.width(), height: node.height(),
          x: node.x(), y: node.y(),
          rotation: e.target.rotation(),
          cropWidth: drawW / nativeW, cropHeight: drawH / nativeH,
        });
        setIsTransforming(false);
      },
    }),
    React.createElement(Rect, {
      x: (element as any).x,
      y: (element as any).y,
      width: Math.max((element as any).a.width - (element as any).borderSize, 0),
      height: Math.max((element as any).a.height - (element as any).borderSize, 0),
      opacity,
      offsetX: -(element as any).borderSize / 2,
      offsetY: -(element as any).borderSize / 2,
      stroke: (element as any).borderColor,
      strokeWidth: (element as any).borderSize,
      listening: false,
      visible: !!(element as any).borderSize,
      rotation: (element as any).rotation,
      cornerRadius: Math.max(0, cornerRadius - (element as any).borderSize),
      hideInExport: !(element as any).showInExport,
    }),
    (element as any)._cropModeEnabled && React.createElement(
      Portal,
      { selector: '.page-abs-container', enabled: true },
      React.createElement(Rect, {
        x: -window.innerWidth / (store as any).scale,
        y: -window.innerWidth / (store as any).scale,
        width: window.innerWidth / (store as any).scale * 3,
        height: window.innerWidth / (store as any).scale * 3,
        fill: 'rgba(0,0,0,0.3)',
      }),
      React.createElement(Image as any, {
        listening: false, image: finalImage,
        x: (element as any).x, y: (element as any).y,
        width: (element as any).a.width, height: (element as any).a.height,
        rotation: (element as any).rotation,
        shadowEnabled: (element as any).shadowEnabled,
        shadowBlur: (element as any).shadowBlur,
      }),
      React.createElement(
        Group,
        {
          x: (element as any).x, y: (element as any).y,
          rotation: (element as any).rotation,
          scaleX: scaleForCrop, scaleY: scaleForCrop,
        },
        React.createElement(Image as any, {
          image: maskedImage,
          ref: cropImageRef,
          opacity: 0.4,
          draggable: true,
          x: -(element as any).cropX * nativeW,
          y: -(element as any).cropY * nativeH,
          onDragMove: handleCropDragMove,
          onTransform: handleCropDragMove,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
        }),
        React.createElement(Transformer, { ref: outerTransformerRef, ...outerCropTransformerStyle }),
        React.createElement(Rect, {
          width: drawW, height: drawH,
          ref: cropRectRef, listening: false,
          onTransform: (e: any) => {
            if ((element as any).cropX < Math.abs(e.target.x() / nativeW) && e.target.x() < 0 && (element as any).cropX > 0) {
              const maxW = ((element as any).cropWidth + (element as any).cropX) * nativeW;
              e.target.scaleX(1); e.target.width(maxW);
            }
            if ((element as any).cropY < Math.abs(e.target.y() / nativeH) && e.target.y() < 0 && (element as any).cropY > 0) {
              const maxH = ((element as any).cropHeight + (element as any).cropY) * nativeH;
              e.target.scaleY(1); e.target.height(maxH);
            }
            if (e.target.x() < -(element as any).cropX * nativeW - 1e-9) { e.target.x(-(element as any).cropX * nativeW); e.target.scaleX(1); }
            if (e.target.y() < -(element as any).cropY * nativeH - 1e-9) { e.target.y(-(element as any).cropY * nativeH); e.target.scaleY(1); }
            const rw = e.target.width() * e.target.scaleX();
            const rh = e.target.height() * e.target.scaleY();
            const newCropX = Math.min(1, Math.max(0, (element as any).cropX + e.target.x() / nativeW));
            const newCropY = Math.min(1, Math.max(0, e.target.y() / nativeH + (element as any).cropY));
            const newCropW = Math.min(1 - newCropX, rw / nativeW);
            const newCropH = Math.min(1 - newCropY, rh / nativeH);
            const absPos = e.target.getAbsolutePosition(e.target.getParent().getParent());
            e.target.scale({ x: 1, y: 1 });
            e.target.position({ x: 0, y: 0 });
            (element as any).set({
              x: absPos.x, y: absPos.y,
              cropX: newCropX, cropY: newCropY,
              cropWidth: newCropW, cropHeight: newCropH,
              width: Math.min(rw * scaleForCrop, nativeW * (1 - newCropX) * scaleForCrop),
              height: Math.min(rh * scaleForCrop, nativeH * (1 - newCropY) * scaleForCrop),
            });
          },
        }),
        React.createElement(Transformer, { ref: innerTransformerRef, ...innerCropTransformerStyle, visible: (element as any).resizable }),
      ),
    ),
  );
}) as ((props: ImageProps) => React.JSX.Element) & { displayName: string };

ImageElement.displayName = 'ImageElement';
