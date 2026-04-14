'use client';

import { getSvgSize } from './svg';

export function getImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = async () => {
      if (img.width === 0 || img.height === 0) {
        resolve(await getSvgSize(src));
      } else {
        resolve({ width: img.width, height: img.height });
      }
    };
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

export async function cropImage(
  src: string,
  opts: {
    type?: string;
    width: number;
    height: number;
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
  },
): Promise<string> {
  const img = await loadImage(src);
  const hiDpi = document.createElement('canvas');
  hiDpi.width = 2 * img.width;
  hiDpi.height = 2 * img.height;
  hiDpi.getContext('2d')!.drawImage(img, 0, 0, hiDpi.width, hiDpi.height);

  const out = document.createElement('canvas');
  out.width = opts.width;
  out.height = opts.height;
  const ctx = out.getContext('2d')!;

  const cropW = hiDpi.width * opts.cropWidth;
  const cropH = hiDpi.height * opts.cropHeight;
  const aspect = opts.width / opts.height;
  const cropAspect = cropW / cropH;

  let srcW: number, srcH: number;
  if (opts.type === 'svg') {
    srcW = cropW;
    srcH = cropH;
  } else if (aspect >= cropAspect) {
    srcW = cropW;
    srcH = cropW / aspect;
  } else {
    srcW = cropH * aspect;
    srcH = cropH;
  }

  ctx.drawImage(
    hiDpi,
    opts.cropX * hiDpi.width,
    opts.cropY * hiDpi.height,
    srcW,
    srcH,
    0, 0,
    out.width,
    out.height,
  );
  return out.toDataURL('image/png');
}

export function getCrop(
  imageSize: { width: number; height: number },
  canvasSize: { width: number; height: number },
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number } {
  const { width: iw, height: ih } = imageSize;
  const aspect = iw / ih;
  let cropW: number, cropH: number;

  if (aspect >= canvasSize.width / canvasSize.height) {
    cropW = canvasSize.width;
    cropH = canvasSize.width / aspect;
  } else {
    cropW = canvasSize.height * aspect;
    cropH = canvasSize.height;
  }

  const offsetX = (canvasSize.width - cropW) / 2;
  const offsetY = (canvasSize.height - cropH) / 2;

  return {
    cropX: offsetX / canvasSize.width,
    cropY: offsetY / canvasSize.height,
    cropWidth: cropW / canvasSize.width,
    cropHeight: cropH / canvasSize.height,
  };
}
