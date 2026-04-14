'use client';

export async function getVideoSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = src;
    video.addEventListener('loadedmetadata', () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
    });
    video.addEventListener('error', () => {
      reject(new Error(`Failed to load video: ${src.slice(0, 100)}`));
    });
  });
}

export async function getVideoDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = src;
    video.addEventListener('loadedmetadata', () => {
      resolve(video.duration);
    });
  });
}

export async function getVideoPreview(src: string, seekTime = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    video.crossOrigin = 'anonymous';
    video.src = src;
    video.addEventListener('error', (e) => reject(e));
    video.addEventListener('loadeddata', () => {
      const aspect = video.videoWidth / video.videoHeight;
      canvas.width = 480;
      canvas.height = 480 / aspect;
      video.currentTime = seekTime;
    });
    video.addEventListener('seeked', () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL());
      } catch (e) {
        reject(e);
      }
    });
  });
}

export async function getVideoObjectPreview(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  seekTime: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d')!;
    const onSeeked = () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL());
        video.removeEventListener('seeked', onSeeked);
      } catch (e) {
        reject(e);
        video.removeEventListener('seeked', onSeeked);
      }
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = seekTime;
  });
}
