'use client';

const CDN_GIF_JS = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
const CDN_GIF_WORKER_JS = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js';

export function getGIF(): Promise<any> {
  const win = window as any;
  if (win.GIF) return Promise.resolve(win.GIF);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.onload = () => resolve(win.GIF);
    script.src = CDN_GIF_JS;
    document.head.appendChild(script);
  });
}

let _workerBlobUrl: string | null = null;

async function getWorkerBlobUrl(): Promise<string> {
  if (_workerBlobUrl) return _workerBlobUrl;
  const resp = await fetch(CDN_GIF_WORKER_JS);
  const text = await resp.text();
  const blob = new Blob([text], { type: 'application/javascript' });
  _workerBlobUrl = URL.createObjectURL(blob);
  return _workerBlobUrl;
}

export async function createGIF({ width, height }: { width: number; height: number }): Promise<any> {
  const [GIF, workerScript] = await Promise.all([getGIF(), getWorkerBlobUrl()]);
  return new GIF({
    workers: 4,
    width,
    height,
    workerScript,
  });
}
