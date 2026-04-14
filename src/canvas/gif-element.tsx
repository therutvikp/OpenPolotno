'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { autorun } from 'mobx';
import { Image, Group, Rect, Arc, Text } from 'react-konva';
import Konva from 'konva';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { useCornerRadiusAndCrop } from './video-element';
import { useImageLoader } from './image-element';
import { applyFilter } from './apply-filters';
import { useFadeIn } from './use-fadein';
import { isTouchDevice } from '../utils/screen';
import { StoreType } from '../model/store';
import { VideoElementType } from '../model/video-model';

interface GifFrame {
  patch: Uint8ClampedArray;
  delay: number;
  width: number;
  height: number;
  left: number;
  top: number;
  disposalType: number;
}

function drawGifFrame(
  frame: GifFrame,
  mainCanvas: HTMLCanvasElement,
  frameCanvas: HTMLCanvasElement,
): void {
  const mainCtx = mainCanvas.getContext('2d');
  const frameCtx = frameCanvas.getContext('2d');
  if (!mainCtx || !frameCtx) return;

  if (frame.disposalType === 2) {
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  }

  frameCanvas.width = frame.width;
  frameCanvas.height = frame.height;

  const imageData = frameCtx.createImageData(frame.width, frame.height);
  imageData.data.set(frame.patch);
  frameCtx.putImageData(imageData, 0, 0);
  mainCtx.drawImage(frameCanvas, frame.left, frame.top);
}

// Loading spinner
const GifLoadingSpinner = observer(({ element }: { element: any }) => {
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
  }, []);
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

// Error state
const GifError = observer(({ element }: { element: any }) => {
  const fontSize = Math.max(10, Math.min(30, element.width / 22));
  return React.createElement(
    Group,
    { x: element.a.x, y: element.a.y, rotation: element.a.rotation, listening: false, opacity: element.a.opacity, hideInExport: !element.showInExport },
    React.createElement(Rect, { width: element.width, height: element.height, fill: 'rgba(223, 102, 102, 0.8)' }),
    React.createElement(Text, {
      text: 'Cannot load the GIF...',
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

function useGifFrames(src: string): [GifFrame[], number, { width: number; height: number }, string] {
  const [frames, setFrames] = React.useState<GifFrame[]>([]);
  const [totalDuration, setTotalDuration] = React.useState(0);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [status, setStatus] = React.useState<string>('loading');

  React.useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(src);
        const buffer = await resp.arrayBuffer();
        const parsed = parseGIF(buffer);
        const rawFrames = decompressFrames(parsed, true);
        const w = parsed.lsd.width;
        const h = parsed.lsd.height;
        setSize({ width: w, height: h });
        const processed: GifFrame[] = rawFrames.map((f: any) => ({
          patch: new Uint8ClampedArray(f.patch),
          delay: f.delay,
          width: f.dims.width,
          height: f.dims.height,
          left: f.dims.left,
          top: f.dims.top,
          disposalType: f.disposalType,
        }));
        const total = processed.reduce((acc, f) => acc + f.delay, 0);
        setFrames(processed);
        setTotalDuration(total);
        setStatus('loaded');
      } catch (e) {
        console.error('Failed to load GIF:', e);
        setStatus('failed');
      }
    })();
  }, [src]);

  return [frames, totalDuration, size, status];
}

function getFrameIndexAtTime(time: number, frames: GifFrame[], totalDuration: number): number {
  const t = time % totalDuration;
  let elapsed = 0;
  for (let i = 0; i < frames.length; i++) {
    elapsed += frames[i].delay;
    if (elapsed > t) return i;
  }
  return 0;
}

type Props = {
  store: StoreType;
  element: VideoElementType;
};

export const GifElement = observer(({ element, store }: Props) => {
  const [isTransforming, setIsTransforming] = React.useState(false);
  const isSelected = (store as any).selectedShapes.indexOf(element) >= 0 && (element as any).selectable;
  const imageRef = React.useRef<any>(null);
  const frameCanvasRef = React.useRef<HTMLCanvasElement | undefined>(undefined);

  const [frames, totalDuration, gifSize, gifStatus] = useGifFrames((element as any).src);
  useImageLoader(gifStatus, (element as any).src, (element as any).id);

  // Create a persistent off-screen canvas for accumulating frames
  React.useEffect(() => {
    frameCanvasRef.current = document.createElement('canvas');
    return () => {
      if (frameCanvasRef.current) {
        Konva.Util.releaseCanvas(frameCanvasRef.current as any);
      }
    };
  }, []);

  // Initialize canvas size and draw first frame when loaded
  React.useEffect(() => {
    if (gifStatus === 'loaded' && frameCanvasRef.current && frames.length > 0) {
      frameCanvasRef.current.width = gifSize.width;
      frameCanvasRef.current.height = gifSize.height;
      const ctx = frameCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, gifSize.width, gifSize.height);
        const tmpCanvas = document.createElement('canvas');
        drawGifFrame(frames[0], frameCanvasRef.current, tmpCanvas);
      }
    }
  }, [gifSize, gifStatus, frames]);

  // Animation loop
  React.useEffect(() => {
    if (!frames.length || !frameCanvasRef.current) return;

    const canvas = frameCanvasRef.current;
    canvas.width = gifSize.width;
    canvas.height = gifSize.height;

    const tmpCanvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    let lastFrameIdx = -1;
    drawGifFrame(frames[0], canvas, tmpCanvas);
    redraw();
    lastFrameIdx = 0;

    const getFrameAt = (time: number) => getFrameIndexAtTime(time, frames, totalDuration);

    const onTick = (time: number) => {
      const idx = getFrameAt(time);
      if (idx !== lastFrameIdx) {
        drawGifFrame(frames[idx], canvas, tmpCanvas);
        redraw();
        imageRef.current?.getLayer()?.draw();
        lastFrameIdx = idx;
      }
    };

    let cleanup: (() => void);
    if ((store as any).isPlaying || (element as any).page._exportingOrRendering) {
      cleanup = autorun(() => {
        onTick((store as any).currentTime - (element as any).page.startTime);
      });
    } else {
      const intervalId = window.setInterval(() => {
        onTick((store as any).currentTime || performance.now());
      }, 16);
      cleanup = () => clearInterval(intervalId);
    }

    return cleanup;
  }, [(store as any).isPlaying, frames, totalDuration, (element as any).page._exportingOrRendering]);

  // Sync duration to store
  React.useEffect(() => {
    if (totalDuration) {
      (store as any).history.ignore(() => {
        (element as any).set({ duration: totalDuration });
      });
    }
  }, [totalDuration]);

  function redraw() {
    // trigger re-render via useCornerRadiusAndCrop
  }

  let { cropX, cropY, cropWidth, cropHeight } = element as any;
  if (gifStatus !== 'loaded') { cropX = cropY = 0; cropWidth = cropHeight = 1; }

  const cropRect = {
    x: gifSize.width * cropX,
    y: gifSize.height * cropY,
    width: gifSize.width * cropWidth,
    height: gifSize.height * cropHeight,
  };

  const cornerRadius: number = (element as any).cornerRadius ?? 0;

  const [croppedImage, doRedraw] = useCornerRadiusAndCrop(
    element,
    frameCanvasRef.current,
    cropRect,
    (store as any)._elementsPixelRatio,
    cornerRadius,
    isTransforming || (element as any)._cropModeEnabled,
  );

  // Apply filters (autorun-based)
  React.useLayoutEffect(() => {
    if (!isTransforming && !(element as any)._cropModeEnabled && imageRef.current) {
      applyFilter(imageRef.current, element as any);
      return autorun(() => { applyFilter(imageRef.current, element as any); }, { delay: 100 });
    }
  }, [frameCanvasRef.current, isTransforming, cropWidth, cropHeight, (element as any)._cropModeEnabled]);

  const isLoading = gifStatus === 'loading';
  const isFailed = gifStatus === 'failed';
  const isReady = !isLoading && !isFailed;
  const opacity = isReady ? (element as any).a.opacity : 0;
  useFadeIn(imageRef, opacity);

  const isListening = (element as any).selectable || (store as any).role === 'admin';
  const isTouch = isTouchDevice();

  return React.createElement(
    React.Fragment,
    null,
    isLoading && React.createElement(GifLoadingSpinner, { element }),
    isFailed && React.createElement(GifError, { element }),
    React.createElement(Image as any, {
      ref: imageRef,
      name: 'element',
      id: (element as any).id,
      image: croppedImage,
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
      onTransformStart: () => setIsTransforming(true),
      onTransform: (e: any) => {
        const node = e.currentTarget;
        const scaleX = Math.abs(node.scaleX() - 1) < 1e-7 ? 1 : node.scaleX();
        const scaleY = Math.abs(node.scaleY() - 1) < 1e-7 ? 1 : node.scaleY();
        node.scaleX(1); node.scaleY(1);
        (element as any).set({
          x: node.x(), y: node.y(),
          width: node.width() * scaleX, height: node.height() * scaleY,
          rotation: e.target.rotation(),
        });
      },
      onTransformEnd: () => setIsTransforming(false),
    }),
    React.createElement(Rect, {
      x: (element as any).a.x,
      y: (element as any).a.y,
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
  );
}) as ((props: Props) => React.JSX.Element) & { displayName: string };

GifElement.displayName = 'GifElement';
