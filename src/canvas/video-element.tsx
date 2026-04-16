'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { autorun } from 'mobx';
import { Arc, Group, Image, Rect, Text, Transformer } from 'react-konva';
import Konva from 'konva';
import { Portal } from 'react-konva-utils';
import { incrementLoader, triggerLoadError } from '../utils/loader';
import * as svgUtils from '../utils/svg';
import { flags } from '../utils/flags';
import { applyFilter } from './apply-filters';
import { useFadeIn } from './use-fadein';
import { isTouchDevice } from '../utils/screen';
import { StoreType } from '../model/store';
import { VideoElementType } from '../model/video-model';

function createCanvas(): HTMLCanvasElement {
  return document.createElement('canvas');
}

// SVG play icon
const playIcon = new window.Image();
playIcon.src = svgUtils.svgToURL(`
  <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path opacity="0.6" d="M4 5.49683V18.5032C4 20.05 5.68077 21.0113 7.01404 20.227L18.0694 13.7239C19.384 12.9506 19.384 11.0494 18.0694 10.2761L7.01404 3.77296C5.68077 2.98869 4 3.95 4 5.49683Z" fill="white"/>
  <path d="M4 5.49683V18.5032C4 20.05 5.68077 21.0113 7.01404 20.227L18.0694 13.7239C19.384 12.9506 19.384 11.0494 18.0694 10.2761L7.01404 3.77296C5.68077 2.98869 4 3.95 4 5.49683Z" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`);

// SVG pause icon
const pauseIcon = new window.Image();
pauseIcon.src = svgUtils.svgToURL(`
  <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path opacity="0.6" d="M14 19L14 5C14 3.89543 14.8954 3 16 3L17 3C18.1046 3 19 3.89543 19 5L19 19C19 20.1046 18.1046 21 17 21L16 21C14.8954 21 14 20.1046 14 19Z" fill="white"/>
  <path opacity="0.6" d="M10 19L10 5C10 3.89543 9.10457 3 8 3L7 3C5.89543 3 5 3.89543 5 5L5 19C5 20.1046 5.89543 21 7 21L8 21C9.10457 21 10 20.1046 10 19Z" fill="white"/>
  <path d="M14 19L14 5C14 3.89543 14.8954 3 16 3L17 3C18.1046 3 19 3.89543 19 5L19 19C19 20.1046 18.1046 21 17 21L16 21C14.8954 21 14 20.1046 14 19Z" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10 19L10 5C10 3.89543 9.10457 3 8 3L7 3C5.89543 3 5 3.89543 5 5L5 19C5 20.1046 5.89543 21 7 21L8 21C9.10457 21 10 20.1046 10 19Z" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`);

function downscaleCanvas(
  canvas: HTMLCanvasElement,
  scale: number,
): HTMLCanvasElement {
  const offscreen = createCanvas();
  offscreen.width = canvas.width;
  offscreen.height = canvas.height;
  const targetW = Math.max(1, Math.floor(offscreen.width * scale));
  const targetH = Math.max(1, Math.floor(offscreen.height * scale));
  offscreen.getContext('2d')?.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);

  const imageData = offscreen.getContext('2d')!.getImageData(0, 0, offscreen.width, offscreen.height);
  const srcData = new Int32Array(imageData.data.buffer);
  const dst = new ImageData(targetW, targetH);
  const dstData = new Int32Array(dst.data.buffer);
  const srcW = offscreen.width;
  const dstW = targetW;
  const scaleX = targetW / offscreen.width;
  const scaleY = targetH / offscreen.height;
  const blockW = Math.round(1 / scaleX);
  const blockH = Math.round(1 / scaleY);
  const blockSize = blockW * blockH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.round(x / scaleX);
      const srcY = Math.round(y / scaleY);
      let r = 0, g = 0, b = 0, a = 0;
      for (let by = 0; by < blockH; by++) {
        for (let bx = 0; bx < blockW; bx++) {
          const px = srcData[srcX + bx + (srcY + by) * srcW];
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
      dstData[x + y * dstW] = (a << 24) | (b << 16) | (g << 8) | r;
    }
  }
  offscreen.width = targetW;
  offscreen.height = targetH;
  offscreen.getContext('2d')?.putImageData(dst, 0, 0);
  return offscreen;
}

export const useCornerRadiusAndCrop = (
  element: VideoElementType,
  image: HTMLVideoElement | HTMLCanvasElement | undefined,
  crop: { x: number; y: number; width: number; height: number },
  pixelRatio: number,
  cornerRadius = 0,
  skipDownscale = false,
): readonly [HTMLCanvasElement | HTMLVideoElement | undefined, () => void] => {
  const w = Math.floor(Math.max((element as any).width * pixelRatio, 1));
  const h = Math.floor(Math.max((element as any).height * pixelRatio, 1));
  const r = Math.min(cornerRadius * pixelRatio, w / 2, h / 2);
  const scale = Math.max((element as any).width / crop.width, (element as any).height / crop.height) * pixelRatio;
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

  const draw = () => {
    if (!offscreen || !image) return;
    offscreen.width = w;
    offscreen.height = h;
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
    const src = shouldDownscale ? downscaleCanvas(image as any, scale) : image;
    const srcCrop = shouldDownscale
      ? { x: Math.floor(crop.x * scale), y: Math.floor(crop.y * scale), width: Math.floor(crop.width * scale), height: Math.floor(crop.height * scale) }
      : crop;
    ctx.drawImage(src as any, srcCrop.x, srcCrop.y, srcCrop.width, srcCrop.height, 0, 0, w, h);
  };

  React.useLayoutEffect(() => {
    draw();
  }, [offscreen, (element as any).width, (element as any).height, crop.x, crop.y, crop.width, crop.height, cornerRadius, pixelRatio, skipDownscale, (element as any).page._exportingOrRendering, shouldDownscale]);

  React.useEffect(() => () => {
    if (offscreen && offscreen.nodeName === 'CANVAS') {
      Konva.Util.releaseCanvas(offscreen as any);
    }
  }, [offscreen]);

  return [offscreen || image, draw] as const;
};

// Loading spinner component
const VideoLoadingSpinner = observer(({ element }: { element: any }) => {
  const r = Math.min(30, element.width / 4, element.height / 4);
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
    { x: element.a.x, y: element.a.y, rotation: element.a.rotation, listening: false, opacity: element.a.opacity, hideInExport: !element.showInExport },
    React.createElement(Rect, { width: element.width, height: element.height, fill: 'rgba(124, 173, 212, 0.8)' }),
    React.createElement(Arc, {
      ref: arcRef,
      x: element.width / 2,
      y: element.height / 2,
      fill: 'white',
      outerRadius: Math.abs(r),
      innerRadius: Math.max(1, r - 5),
      angle: 270,
    }),
  );
});

// Error state component
const VideoError = observer(({ element }: { element: any }) => {
  const fontSize = Math.max(10, Math.min(30, element.width / 25));
  return React.createElement(
    Group,
    { x: element.a.x, y: element.a.y, rotation: element.a.rotation, listening: false, opacity: element.a.opacity, hideInExport: !element.showInExport },
    React.createElement(Rect, { width: element.width, height: element.height, fill: 'rgba(223, 102, 102, 0.8)' }),
    React.createElement(Text, {
      text: 'Can not load the video...',
      fontSize,
      width: element.width,
      height: element.height,
      align: 'center',
      fill: 'white',
      verticalAlign: 'middle',
      padding: 5,
    }),
  );
});

// Default video loader hook - can be replaced via setVideoLoaderHook
let useVideoLoaderHook = function (src: string, crossOrigin: string): [HTMLVideoElement | undefined, string] {
  const statusRef = React.useRef<string>('loading');
  const videoRef = React.useRef<HTMLVideoElement | undefined>(undefined);
  const [, forceUpdate] = React.useState(0);
  const srcRef = React.useRef(src);
  const crossOriginRef = React.useRef(crossOrigin);

  if (srcRef.current !== src || crossOriginRef.current !== crossOrigin) {
    statusRef.current = 'loading';
    videoRef.current = undefined;
    srcRef.current = src;
    crossOriginRef.current = crossOrigin;
  }

  React.useLayoutEffect(() => {
    if (!src) return;
    const video = document.createElement('video');

    function onCanPlay() {
      statusRef.current = 'loaded';
      videoRef.current = video;
      videoRef.current.currentTime = 0;
      forceUpdate(Math.random());
      video.removeEventListener('canplay', onCanPlay);
    }

    function onError(evt: any) {
      const readyState = video.readyState === 4;
      const buffered = video.buffered && video.buffered.length > 0 &&
        (video.buffered.end(video.buffered.length - 1) / video.duration * 100) >= 100;
      if (readyState && buffered) return;
      const msg = evt.message || video.error?.message || 'Unknown error';
      console.error(new Error('Video failed to load: ' + msg));
      statusRef.current = 'failed';
      videoRef.current = undefined;
      forceUpdate(Math.random());
    }

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);
    if (crossOrigin) video.crossOrigin = crossOrigin;
    video.src = src;
    video.load();
    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
    };
  }, [src, crossOrigin]);

  return [videoRef.current, statusRef.current];
};

export const setVideoLoaderHook = (customVideoLoaderHook: any) => {
  useVideoLoaderHook = customVideoLoaderHook;
};

function isVideoReady(video: HTMLVideoElement): boolean {
  return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
}

export const useLoader = (status: string, src: string, id: string): void => {
  const releaseRef = React.useRef<(() => void) | undefined>();
  const release = () => {
    releaseRef.current?.();
    releaseRef.current = undefined;
  };
  React.useEffect(() => release, []);
  React.useLayoutEffect(() => {
    const shortSrc = src.slice(0, 200);
    const label = `video with id ${id} url: ${shortSrc}`;
    if (status === 'loading' && !releaseRef.current) {
      releaseRef.current = incrementLoader(label);
    }
    if (status !== 'loading') release();
    if (status === 'failed') triggerLoadError(label);
  }, [status]);
};

type Props = {
  store: StoreType;
  element: VideoElementType;
};

// Placeholder canvas for when video isn't loaded
const placeholderCanvas = createCanvas();

export const VideoElement = observer(({ element, store }: Props) => {
  const [isTransforming, setIsTransforming] = React.useState(false);
  const imageRef = React.useRef<any>(null);
  const cropImageRef = React.useRef<any>(null);
  const isSelected = (store as any).selectedShapes.indexOf(element) >= 0 && (element as any).selectable;
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [videoEl, videoStatus] = useVideoLoaderHook((element as any).src, 'anonymous');
  const [isHovering, setIsHovering] = React.useState(false);
  const isActivePage = (store as any).activePage === (element as any).page;

  useLoader(videoStatus, (element as any).src, (element as any).id);

  if (videoEl) {
    (videoEl as any).playsInline = true;
  }

  const mediaEl = videoEl || placeholderCanvas;
  // Native video dimensions — read from videoWidth/videoHeight to avoid
  // mutating the element during the render phase (causes React 18 concurrent
  // mode warning when multiple VideoElements render in parallel).
  const nativeVideoW = videoEl ? (videoEl.videoWidth || 0) : 0;
  const nativeVideoH = videoEl ? (videoEl.videoHeight || 0) : 0;

  // Set duration from video metadata
  React.useEffect(() => {
    if (!videoEl) return;
    (store as any).history.ignore(() => {
      (element as any).set({ duration: 1000 * videoEl.duration });
    });
  }, [videoEl]);

  // Play/pause sync with store
  React.useEffect(() => {
    if (!videoEl) return;
    const animatedIds = (store as any).animatedElementsIds;
    const shouldAnimate = (!animatedIds.length || animatedIds.includes((element as any).id)) && (store as any).isPlaying;
    const active = isActivePage && (shouldAnimate || isPlaying);
    if (!active) {
      videoEl.pause();
      return;
    }
    videoEl.currentTime = (element as any).startTime * videoEl.duration;
    videoEl.play();

    const anim = new Konva.Animation(() => {
      imageRef.current?.getLayer()?.batchDraw();
    }, imageRef.current?.getLayer());
    anim.start();

    const onEnded = () => {
      setIsPlaying(false);
      videoEl.currentTime = (element as any).startTime * videoEl.duration;
    };
    const onTimeUpdate = () => {
      if (videoEl.currentTime >= (element as any).endTime * videoEl.duration) {
        videoEl.pause();
        videoEl.currentTime = (element as any).startTime * videoEl.duration;
        setIsPlaying(false);
      }
    };

    videoEl.addEventListener('ended', onEnded);
    videoEl.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      videoEl.pause();
      anim.stop();
      videoEl.removeEventListener('ended', onEnded);
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [videoEl, isPlaying, (store as any).isPlaying, isActivePage]);

  // Volume sync
  React.useEffect(() => {
    if (!videoEl) return;
    videoEl.volume = (element as any).volume;
  }, [videoEl, (element as any).volume]);

  // Timeline sync via autorun
  const loaderRelease = React.useRef<(() => void) | undefined>();
  React.useEffect(() => {
    const dispose = autorun(() => {
      if (!videoEl) return;
      const animIds = (store as any).animatedElementsIds;
      if (animIds.length && !animIds.includes((element as any).id)) return;
      const startMs = (element as any).startTime * videoEl.duration * 1000;
      const durationMs = videoEl.duration * ((element as any).endTime - (element as any).startTime) * 1000;
      const currentMs = ((store as any).currentTime || (element as any).page.startTime) - (element as any).page.startTime;
      const loopedMs = currentMs % durationMs + startMs;
      if (Math.abs(1000 * videoEl.currentTime - loopedMs) > 500 || !(store as any).isPlaying) {
        const targetTime = loopedMs / 1000;
        if (targetTime !== videoEl.currentTime) videoEl.currentTime = targetTime;
        if (!isVideoReady(videoEl) && !(store as any).isPlaying && !loaderRelease.current) {
          loaderRelease.current = incrementLoader(`video ${(element as any).id}`);
        }
      }
      imageRef.current?.getLayer()?.batchDraw();
    });
    return () => {
      dispose();
      loaderRelease.current?.();
      loaderRelease.current = undefined;
    };
  }, [store, videoEl]);

  // Seeking readiness
  React.useEffect(() => {
    if (!videoEl) return;
    const check = () => {
      if (!isVideoReady(videoEl) && !(element as any).page._exportingOrRendering) return;
      if (!loaderRelease.current) return;
      imageRef.current?.getLayer()?.batchDraw();
      loaderRelease.current?.();
      loaderRelease.current = undefined;
    };
    let interval: ReturnType<typeof setInterval> | undefined;
    if ((element as any).page._exportingOrRendering) {
      interval = setInterval(check, 20);
    }
    videoEl.addEventListener('timeupdate', check);
    videoEl.addEventListener('canplay', check);
    return () => {
      clearInterval(interval);
      videoEl.removeEventListener('timeupdate', check);
      videoEl.removeEventListener('canplay', check);
    };
  }, [(element as any).page._exportingOrRendering, videoEl, (element as any).id]);

  let { cropX, cropY, cropWidth, cropHeight } = element as any;
  if (videoStatus !== 'loaded') { cropX = cropY = 0; cropWidth = cropHeight = 1; }

  const nativeW = nativeVideoW || (mediaEl as any).width || 1;
  const nativeH = nativeVideoH || (mediaEl as any).height || 1;
  const cropW = nativeW * cropWidth;
  const cropH = nativeH * cropHeight;
  const aspect = (element as any).width / (element as any).height;
  const isSvg = (element as any).type === 'svg';
  let drawW: number, drawH: number;
  if (isSvg) {
    drawW = cropW; drawH = cropH;
  } else if (aspect >= cropW / cropH) {
    drawW = cropW; drawH = cropW / aspect;
  } else {
    drawW = cropH * aspect; drawH = cropH;
  }

  const cropRect = { x: nativeW * cropX, y: nativeH * cropY, width: drawW, height: drawH };
  const cornerRadius: number = (element as any).cornerRadius ?? 0;

  const [croppedImage, redrawCrop] = useCornerRadiusAndCrop(
    element,
    mediaEl as any,
    cropRect,
    (store as any)._elementsPixelRatio,
    cornerRadius,
    true,
  );

  // Clip mask via clipSrc
  const [finalImage, redrawClip] = (() => {
    const clipSrc = (element as any).clipSrc || '';
    const [clipSrcFixed, setClipSrcFixed] = React.useState(clipSrc);
    React.useEffect(() => {
      (async () => {
        if (!clipSrc) { setClipSrcFixed(''); return; }
        const str = await svgUtils.urlToString(clipSrc);
        const fixed = svgUtils.fixSize(str);
        const url = svgUtils.svgToURL(fixed);
        setClipSrcFixed(url);
      })();
    }, [clipSrc]);

    const [clipImg] = React.useState<HTMLImageElement | undefined>(undefined);
    const clipCanvas = React.useMemo(() => {
      if (croppedImage && clipImg) return createCanvas();
      return undefined;
    }, [croppedImage, clipImg]);

    const doClipDraw = () => {
      if (!clipImg || !croppedImage || !(croppedImage as any).width || !(croppedImage as any).height) return;
      if (!clipImg.width || !clipImg.height) return;
      if (!clipCanvas) return;
      const ratio = Math.max((element as any).width / clipImg.width * (store as any)._elementsPixelRatio,
        (element as any).height / clipImg.height * (store as any)._elementsPixelRatio);
      const tmp = createCanvas();
      tmp.width = Math.max(clipImg.width * ratio, 1);
      tmp.height = Math.max(clipImg.height * ratio, 1);
      tmp.getContext('2d')?.drawImage(clipImg, 0, 0, tmp.width, tmp.height);
      clipCanvas.width = Math.max((croppedImage as any).width, 1);
      clipCanvas.height = Math.max((croppedImage as any).height, 1);
      const ctx = clipCanvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.drawImage(tmp, 0, 0, (croppedImage as any).width, (croppedImage as any).height);
      Konva.Util.releaseCanvas(tmp as any);
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(croppedImage as any, 0, 0, clipCanvas.width, clipCanvas.height);
      ctx.restore();
    };

    React.useLayoutEffect(() => { doClipDraw(); }, [clipCanvas, croppedImage, clipImg, (element as any).width, (element as any).height, (store as any)._elementsPixelRatio, cropRect, cornerRadius]);

    const result = (element as any).clipSrc && clipImg ? clipCanvas : croppedImage;
    return [result, doClipDraw];
  })();

  function redrawAll() { redrawCrop(); redrawClip(); }

  const scaleForCrop = Math.max((element as any).width / drawW, (element as any).height / drawH);

  // Crop mode click outside handler
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
  }, [mediaEl, isTransforming, cropWidth, cropHeight, (element as any)._cropModeEnabled]);

  React.useLayoutEffect(() => {
    if (isTransforming || (element as any)._cropModeEnabled) {
      imageRef.current?.clearCache();
    } else {
      applyFilter(imageRef.current, element as any);
    }
  }, [isTransforming, (element as any).width, (element as any).height, (element as any)._cropModeEnabled]);

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

  const onDblClick = () => {
    if ((element as any).type !== 'svg' && (element as any).contentEditable) {
      setTimeout(() => { (element as any).toggleCropMode(true); });
    }
  };

  const isLoading = videoStatus === 'loading';
  const isFailed = videoStatus === 'failed';
  const isReady = !isLoading && !isFailed;
  const prevOpacityRef = React.useRef({ cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 });
  const opacity = isReady ? (element as any).a.opacity : 0;
  useFadeIn(imageRef, opacity);

  const isListening = (element as any).selectable || (store as any).role === 'admin';
  const isTouch = isTouchDevice();

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Group,
      { onMouseEnter: () => setIsHovering(true), onMouseLeave: () => setIsHovering(false) },
      isLoading && React.createElement(VideoLoadingSpinner, { element }),
      isFailed && React.createElement(VideoError, { element }),
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
          prevOpacityRef.current = {
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
          const shrinkingH = !isCorner && scaleX < 1 && prevOpacityRef.current.cropHeight > drawH / nativeH;
          let newCropW = isCorner ? (element as any).cropWidth : (element as any).cropWidth * scaleX;
          if (shrinkingH) newCropW = (element as any).cropWidth;
          const shrinkingW = !isCorner && scaleY < 1 && prevOpacityRef.current.cropWidth > drawW / nativeW;
          let newCropH = isCorner ? (element as any).cropHeight : (element as any).cropHeight * scaleY;
          if (shrinkingW) newCropH = (element as any).cropHeight;
          if (isSvg) { newCropW = (element as any).cropWidth; newCropH = (element as any).cropHeight; }
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
        x: (element as any).a.x, y: (element as any).a.y,
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
      !(store as any).isPlaying && React.createElement(Image as any, {
        image: isPlaying ? (isHovering || isTouch ? pauseIcon : undefined) : playIcon,
        x: (element as any).a.x,
        y: (element as any).a.y,
        offsetX: -(element as any).a.width / 2 + 15 / (store as any).scale,
        offsetY: -(element as any).a.height / 2 + 15 / (store as any).scale,
        rotation: (element as any).a.rotation,
        width: 30 / (store as any).scale,
        height: 30 / (store as any).scale,
        hideInExport: true,
        onClick: () => setIsPlaying(!isPlaying),
        onTap: () => setIsPlaying(!isPlaying),
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
          x: (element as any).a.x, y: (element as any).a.y,
          width: (element as any).a.width, height: (element as any).a.height,
          rotation: (element as any).a.rotation,
          shadowEnabled: (element as any).shadowEnabled,
          shadowBlur: (element as any).shadowBlur,
        }),
        React.createElement(
          Group,
          {
            x: (element as any).a.x, y: (element as any).a.y,
            rotation: (element as any).a.rotation,
            scaleX: scaleForCrop, scaleY: scaleForCrop,
          },
          React.createElement(Image as any, {
            image: mediaEl,
            ref: cropImageRef,
            opacity: 0.4,
            draggable: true,
            x: -(element as any).cropX * nativeW,
            y: -(element as any).cropY * nativeH,
            onDragMove: handleCropDragMove,
            onTransform: handleCropDragMove,
          }),
          React.createElement(Transformer, {
            ref: outerTransformerRef,
            anchorSize: 20,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
            boundBoxFunc: (old: any, nw: any) => (nw.width < 5 || nw.height < 5 ? old : nw),
            rotateEnabled: false,
            borderEnabled: false,
            anchorCornerRadius: 10,
            anchorStrokeWidth: 2,
            borderStrokeWidth: 2,
          }),
          React.createElement(Rect, {
            width: drawW, height: drawH,
            ref: cropRectRef, listening: false,
            onTransform: (e: any) => {
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
          React.createElement(Transformer, {
            ref: innerTransformerRef,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
            boundBoxFunc: (old: any, nw: any) => (nw.width < 5 || nw.height < 5 ? old : nw),
            keepRatio: false,
            rotateEnabled: false,
            anchorFill: 'rgb(240, 240, 240)',
            anchorStrokeWidth: 2,
            borderStrokeWidth: 2,
            visible: (element as any).resizable,
          }),
        ),
      ),
    ),
  );
}) as ((props: Props) => React.JSX.Element) & { displayName: string };

VideoElement.displayName = 'VideoElement';
