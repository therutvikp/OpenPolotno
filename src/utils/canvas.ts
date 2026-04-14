'use client';

export const trySetCanvasSize = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): void => {
  let w = width;
  let h = height;
  let ratio = 1;

  while (w > 0 && h > 0) {
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, 1, 1);
    if (ctx.getImageData(0, 0, 1, 1).data[3] !== 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ratio *= 0.9;
    w = Math.max(1, Math.floor(width * ratio));
    h = Math.max(1, Math.floor(height * ratio));
    if (w <= 1 && h <= 1) {
      canvas.width = 1;
      canvas.height = 1;
      return;
    }
  }
};
