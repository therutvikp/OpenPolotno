import { observable, action, toJS } from 'mobx';

const translations = observable({
  toolbar: {
    duration: 'Duration', opacity: 'Opacity', effects: 'Effects', blur: 'Blur',
    curvedText: 'Curved text', curvePower: 'Power', temperature: 'Temperature',
    saturation: 'Saturation', contrast: 'Contrast', shadows: 'Shadows', white: 'White',
    black: 'Black', vibrance: 'Vibrance', textBackground: 'Background',
    backgroundCornerRadius: 'Corner radius', backgroundOpacity: 'Opacity',
    backgroundPadding: 'Padding', brightness: 'Brightness', filters: 'Filters',
    sepia: 'Sepia', grayscale: 'Grayscale', textStroke: 'Text Stroke', shadow: 'Shadow',
    border: 'Border', cornerRadius: 'Corner Radius', copyStyle: 'Copy style',
    uppercase: 'Uppercase', position: 'Position', layering: 'Layering',
    toForward: 'To Front', up: 'Forward', down: 'Backward', toBottom: 'To back',
    alignLeft: 'Align left', alignCenter: 'Align center', alignRight: 'Align right',
    alignTop: 'Align top', alignMiddle: 'Align middle', alignBottom: 'Align bottom',
    flip: 'Flip', flipHorizontally: 'Flip horizontally', flipVertically: 'Flip vertically',
    fitToBackground: 'Fit to page', removeBackground: 'Remove background',
    removeBackgroundTitle: 'Remove background from image', cancelRemoveBackground: 'Cancel',
    confirmRemoveBackground: 'Confirm', crop: 'Crop', cropDone: 'Done', cropCancel: 'Cancel',
    clip: 'Apply mask', removeClip: 'Remove mask', removeMask: 'Remove mask',
    transparency: 'Transparency',
    lockedDescription: 'Object is locked. Unlock it to allow changes from canvas.',
    unlockedDescription: 'Object is unlocked. Lock it to prevent changes from canvas.',
    removeElements: 'Remove elements', duplicateElements: 'Duplicate elements',
    download: 'Download', saveAsImage: 'Save as image', saveAsPDF: 'Save as PDF',
    lineHeight: 'Line height', letterSpacing: 'Letter spacing', offsetX: 'Offset X',
    offsetY: 'Offset Y', color: 'Color', selectable: 'Selectable', draggable: 'Draggable',
    removable: 'Removable', resizable: 'Resizable', contentEditable: 'Can change content',
    styleEditable: 'Can change style', alwaysOnTop: 'Always on top',
    showInExport: 'Show in export', ungroupElements: 'Ungroup', groupElements: 'Group',
    lineSize: 'Line size', fade: 'Fade', move: 'Move', zoom: 'Zoom', animate: 'Animate',
    rotate: 'Rotate', none: 'None', bounce: 'Bounce', blink: 'Blink', strength: 'Strength',
    spaceEvenly: 'Space evenly', horizontalDistribution: 'Horizontally',
    verticalDistribution: 'Vertically', strokeWidth: 'Stroke Width',
    colorPicker: { solid: 'Solid', linear: 'Linear', angle: 'Angle' },
    aiText: {
      aiWrite: 'AI write', rewrite: 'Rewrite', shorten: 'Shorten',
      continue: 'Continue writing', proofread: 'Proofread', tones: 'Tones',
      friendly: 'Friendly', professional: 'Professional', humorous: 'Humorous',
      formal: 'Formal', customPrompt: 'Custom prompt', generatedResult: 'Generated result',
      cancel: 'Cancel', generate: 'Generate', back: 'Back', tryAgain: 'Try Again',
      insert: 'Insert', promptPlaceholder: 'Describe what you want to generate',
    },
  },
  workspace: {
    noPages: 'There are no pages yet...', addPage: 'Add page', removePage: 'Remove page',
    duplicatePage: 'Duplicate page', moveUp: 'Move up', moveDown: 'Move down',
  },
  scale: { reset: 'Reset' },
  error: { removeBackground: 'Ops! Something went wrong. Background can not be removed.' },
  sidePanel: {
    templates: 'Templates', searchTemplatesWithSameSize: 'Show templates with the same size',
    searchPlaceholder: 'Search...', otherFormats: 'Other formats', noResults: 'No results',
    error: 'Loading is failed...', text: 'Text', uploadFont: 'Upload font', myFonts: 'My fonts',
    photos: 'Photos', videos: 'Videos', animations: 'Animations', effects: 'Effects',
    elements: 'Elements', shapes: 'Shapes', lines: 'Lines', upload: 'Upload',
    uploadImage: 'Add file', uploadTip: 'Upload your assets', background: 'Background',
    resize: 'Resize', layers: 'Layers', animate: 'Animate',
    layerTypes: { image: 'Image', text: 'Text', svg: 'SVG', line: 'Line', figure: 'Figure', group: 'Group' },
    layersTip: 'Elements on your active page:', noLayers: 'No elements on the page...',
    namePlaceholder: 'Type element name...', useMagicResize: 'Use magic resize',
    clipImage: 'Mask image', width: 'Width', height: 'Height',
    magicResizeDescription: 'Magic resize will automatically resize and move all elements on the canvas',
    headerText: 'Header', createHeader: 'Create header', subHeaderText: 'Sub Header',
    createSubHeader: 'Create sub header', bodyText: 'Body text', createBody: 'Create body text',
  },
  pagesTimeline: {
    pages: 'Pages', removePage: 'Remove page', addPage: 'Add page',
    duplicatePage: 'Duplicate page', removeAudio: 'Remove audio',
  },
  contextMenu: {
    duplicate: 'Duplicate', remove: 'Remove', lock: 'Lock', unlock: 'Unlock',
    copy: 'Copy', paste: 'Paste', copyStyle: 'Copy style', moveUp: 'Move up',
    moveDown: 'Move down', moveBack: 'Move back', moveForward: 'Move forward',
  },
} as any);

function isObject(val: any): boolean {
  return val != null && typeof val === 'object';
}

function mergeDeep(target: any, source: any) {
  Object.keys(source).forEach((key) => {
    const src = source[key];
    const tgt = target[key];
    if (isObject(src) && isObject(tgt)) {
      mergeDeep(tgt, src);
    } else {
      target[key] = src;
    }
  });
}

function validateKeys(target: any, source: any, path = '') {
  Object.keys(source).forEach((key) => {
    const src = source[key];
    const fullPath = path ? `${path}.${key}` : key;
    if (isObject(src)) {
      if (isObject(target[key])) {
        validateKeys(target[key], src, fullPath);
      } else {
        console.warn(`Missing nested translation object at '${fullPath}'`);
      }
    } else if (target[key] === undefined) {
      console.warn(`Missing translation '${fullPath}'`);
    }
  });
}

export const setTranslations = action(
  (updates: Record<string, any>, { validate = false } = {}) => {
    if (validate) validateKeys(translations, updates);
    mergeDeep(translations, updates);
  },
);

export const getTranslations = () => toJS(translations);

function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

const _missingLogged: Record<string, boolean> = {};

/** Translate a dot-separated key path */
export const t = (key: string): string => {
  const value = getNestedValue(translations, key);
  if (value !== undefined) return value;
  if (!_missingLogged[key]) {
    _missingLogged[key] = true;
    console.warn(`Missing translation '${key}'`);
  }
  const parts = key.split('.');
  const last = parts[parts.length - 1] || ' ';
  return last.charAt(0).toUpperCase() + last.slice(1);
};
