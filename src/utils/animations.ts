import { rotateAroundCenter } from './math';

type AnimationFn = (args: { element: any; dTime: number; animation: any }) => Record<string, number>;

const SLIDE_DIRECTIONS: Record<string, { from: Record<string, number>; to: Record<string, number> }> = {
  right:        { from: { x: -200 }, to: { x: 0 } },
  left:         { from: { x: 200  }, to: { x: 0 } },
  up:           { from: { y: 200  }, to: { y: 0 } },
  down:         { from: { y: -200 }, to: { y: 0 } },
  'bottom-right': { from: { x: -200, y: -200 }, to: { x: 0, y: 0 } },
  'bottom-left':  { from: { x: 200,  y: -200 }, to: { x: 0, y: 0 } },
  'top-right':    { from: { x: -200, y: 200  }, to: { x: 0, y: 0 } },
  'top-left':     { from: { x: 200,  y: 200  }, to: { x: 0, y: 0 } },
};

const CAMERA_DIRECTIONS: Record<string, { cropX?: number; cropY?: number }> = {
  right: { cropX: -1 },
  left:  { cropX: 1  },
  up:    { cropY: 1  },
  down:  { cropY: -1 },
};

export const animations: Record<string, AnimationFn> = {
  fade: ({ dTime, element, animation }) => {
    const progress = dTime / animation.duration;
    return animation.type === 'enter'
      ? { opacity: progress * element.opacity }
      : { opacity: (1 - progress) * element.opacity };
  },

  rotate: ({ dTime, element, animation }) => {
    const deg = (dTime / animation.duration) * 360;
    return rotateAroundCenter(
      { x: element.x, y: element.y, width: element.width, height: element.height, rotation: element.rotation },
      deg,
    ) as Record<string, number>;
  },

  blink: ({ dTime, element, animation }) => {
    const halfPeriod = animation.duration / 2;
    const phase = (dTime % animation.duration) / halfPeriod;
    const alpha = phase <= 1 ? phase : 2 - phase;
    return { opacity: element.opacity * alpha };
  },

  bounce: ({ dTime, element, animation }) => {
    const strength = animation.data?.strength ?? 1;
    const halfDuration = animation.duration / 2;
    const delta = {
      x: (element.width / 3) * strength,
      y: (element.height / 3) * strength,
      width: (element.width / 3) * strength,
      height: (element.height / 3) * strength,
      fontSize: (element.fontSize / 3) * strength,
    };
    const base = {
      x: element.x, y: element.y,
      width: element.width, height: element.height,
      fontSize: element.fontSize,
    };
    const phase = (dTime % animation.duration) / halfDuration;
    const t = phase <= 1 ? phase : 2 - phase;
    const result: Record<string, number> = {};
    for (const key in delta) {
      const from = (delta as any)[key];
      const to = (base as any)[key] - from;
      result[key] = from + t * to;
    }
    return result;
  },

  move: ({ dTime, element, animation }) => {
    const dir = SLIDE_DIRECTIONS[animation.data?.direction] ?? SLIDE_DIRECTIONS.right;
    const strength = animation.data?.strength ?? 1;
    const result: Record<string, number> = {};
    for (const key in dir.from) {
      let from = dir.from[key];
      let to = dir.to[key];
      if (animation.type === 'exit') {
        from = dir.to[key];
        to = -dir.from[key];
      }
      from *= strength;
      to *= strength;
      const start = element[key] + from;
      const delta = element[key] + to - start;
      result[key] = start + (dTime / animation.duration) * delta;
    }
    return result;
  },

  zoom: ({ dTime, element, animation }) => {
    const direction = animation.data?.direction ?? 'in';
    const strength = animation.data?.strength ?? 1;
    const baseScale = 1 + ((direction === 'in' ? 3 / 4 : 5 / 4) - 1) * strength;
    const angle = (element.rotation * Math.PI) / 180;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dW = element.width * (1 - baseScale);
    const dH = element.height * (1 - baseScale);
    const offsetX = (dW * cosA - dH * sinA) / 2;
    const offsetY = (dW * sinA + dH * cosA) / 2;
    const scaled = {
      x: element.x + offsetX,
      y: element.y + offsetY,
      width: element.width * baseScale,
      height: element.height * baseScale,
      fontSize: element.fontSize * baseScale,
    };
    const base = {
      x: element.x, y: element.y,
      width: element.width, height: element.height,
      fontSize: element.fontSize,
    };
    const result: Record<string, number> = {};
    for (const key in scaled) {
      let from = (scaled as any)[key];
      let to = (base as any)[key];
      if (animation.type === 'exit') { const tmp = from; from = to; to = tmp; }
      result[key] = from + (dTime / animation.duration) * (to - from);
    }
    return result;
  },

  cameraZoom: ({ dTime, element, animation }) => {
    const direction = animation.data?.direction ?? 'right';
    const camDir = CAMERA_DIRECTIONS[direction] ?? CAMERA_DIRECTIONS.right;
    const movementStrength = animation.data?.movementStrength ?? 0.1;
    const shakeStrength = animation.data?.shakeStrength ?? 0.015;
    let zoomStrength = animation.data?.zoomStrength ?? 0.6;

    const progress = dTime / animation.duration;
    const shakeDecay = shakeStrength * (1 - progress);
    const shake = Math.sin(12 * progress) * shakeDecay * 0.7 + Math.sin(8 * progress) * shakeDecay * 0.3;

    if (animation.type === 'exit') {
      const maxCrop = Math.max(element.cropWidth ?? 1, element.cropHeight ?? 1);
      zoomStrength = Math.min(zoomStrength, 1 - maxCrop);
    }

    const easeProgress = 1 - Math.pow(1 - progress, 2);
    const cropX = element.cropX ?? 0;
    const cropY = element.cropY ?? 0;
    const cropW = element.cropWidth ?? 1;
    const cropH = element.cropHeight ?? 1;

    let moveX = 0;
    let moveY = 0;
    if (camDir.cropX) {
      const available = camDir.cropX > 0 ? 1 - (cropX + cropW) : cropX;
      moveX = Math.min(available, Math.abs(movementStrength)) * camDir.cropX;
    }
    if (camDir.cropY) {
      const available = camDir.cropY > 0 ? 1 - (cropY + cropH) : cropY;
      moveY = Math.min(available, Math.abs(movementStrength)) * camDir.cropY;
    }

    let newCropX: number;
    let newCropY: number;
    if (animation.type === 'enter') {
      newCropX = camDir.cropX ? cropX + moveX * (1 - easeProgress) : cropX;
      newCropY = camDir.cropY ? cropY + moveY * (1 - easeProgress) : cropY;
    } else {
      newCropX = camDir.cropX ? cropX + moveX * easeProgress : cropX;
      newCropY = camDir.cropY ? cropY + moveY * easeProgress : cropY;
    }

    return {
      cropX: Math.max(0, Math.min(1 - cropW, newCropX + shake * cropW)),
      cropY: Math.max(0, Math.min(1 - cropH, newCropY + shake * cropH)),
      cropWidth: cropW,
      cropHeight: cropH,
    };
  },
};

export const animate = ({
  element,
  dTime,
  animation,
}: {
  element: any;
  dTime: number;
  animation: any;
}): Record<string, number> => {
  const fn = animations[animation.name];
  if (!fn) {
    console.error('Can not find animation type: ' + animation.name);
    return {};
  }
  return fn({ element, dTime, animation });
};

export const registerAnimation = (name: string, fn: AnimationFn) => {
  if (animations[name]) {
    console.warn(`Animation "${name}" already exists and will be overridden`);
  }
  animations[name] = fn;
};
