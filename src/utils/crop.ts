type CropPosition =
  | 'left-top' | 'left-middle' | 'left-bottom'
  | 'center-top' | 'center-middle' | 'center-bottom'
  | 'right-top' | 'right-middle' | 'right-bottom'
  | 'scale';

export function getCrop(
  canvas: { width: number; height: number },
  image: { width: number; height: number },
  position: CropPosition = 'scale',
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number } {
  const imageAspect = image.width / image.height;
  let cropW: number, cropH: number;

  if (imageAspect >= canvas.width / canvas.height) {
    cropW = canvas.width;
    cropH = canvas.width / imageAspect;
  } else {
    cropW = canvas.height * imageAspect;
    cropH = canvas.height;
  }

  let cropX = 0, cropY = 0;

  switch (position) {
    case 'left-top':      cropX = 0;                        cropY = 0;                          break;
    case 'left-middle':   cropX = 0;                        cropY = (canvas.height - cropH) / 2; break;
    case 'left-bottom':   cropX = 0;                        cropY = canvas.height - cropH;       break;
    case 'center-top':    cropX = (canvas.width - cropW) / 2; cropY = 0;                       break;
    case 'center-middle': cropX = (canvas.width - cropW) / 2; cropY = (canvas.height - cropH) / 2; break;
    case 'center-bottom': cropX = (canvas.width - cropW) / 2; cropY = canvas.height - cropH;   break;
    case 'right-top':     cropX = canvas.width - cropW;    cropY = 0;                           break;
    case 'right-middle':  cropX = canvas.width - cropW;    cropY = (canvas.height - cropH) / 2; break;
    case 'right-bottom':  cropX = canvas.width - cropW;    cropY = canvas.height - cropH;       break;
    case 'scale':         cropX = 0; cropY = 0; cropW = canvas.width; cropH = canvas.height;   break;
    default:              console.error(new Error('Unknown clip position property - ' + position));
  }

  return { cropX, cropY, cropWidth: cropW, cropHeight: cropH };
}
