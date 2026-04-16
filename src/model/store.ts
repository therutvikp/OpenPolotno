import {
  applySnapshot,
  cast,
  destroy,
  detach,
  getSnapshot,
  onSnapshot,
  setLivelinessChecking,
  types,
  Instance,
} from 'mobx-state-tree';
import { UndoManager } from './history';
import { nanoid } from 'nanoid';
import Konva from 'konva';
import { computed } from 'mobx';
import { downloadFile } from '../utils/download';
import { getJsPDF } from '../utils/pdf';
import { createGIF } from '../utils/gif-lib';
import { validateKey } from '../utils/validate-key';
import * as fonts from '../utils/fonts';
import { flags } from '../utils/flags';
import { whenLoaded } from '../utils/loader';
import { pxToUnit } from '../utils/unit';
import { deepEqual } from '../utils/deep-equal';
import { waitTillAvailable } from '../utils/wait';
import { jsonToHTML } from '../utils/to-html';
import { jsonToSVG } from '../utils/to-svg';
import { Page } from './page-model';
import { forEveryChild } from './group-model';
import { Audio } from './audio-model';

setLivelinessChecking('ignore');

export const Font = types
  .model('Font', {
    fontFamily: types.string,
    url: types.optional(types.string, ''),
    styles: types.frozen<any>(),
  })
  .preProcessSnapshot((snap: any) => ({
    ...snap,
    fontFamily: snap.fontFamily || snap.name,
  }));

export const Store = types
  .model('Store', {
    role: types.optional(types.string, ''),
    pages: types.array(Page),
    fonts: types.array(Font),
    audios: types.array(Audio),
    width: types.optional(types.number, 1080),
    height: types.optional(types.number, 1080),
    currentTime: types.optional(types.number, 0),
    isPlaying: types.optional(types.boolean, false),
    scale: types.optional(types.number, 1),
    scaleToFit: types.optional(types.number, 1),
    unit: types.optional(types.string, 'px'),
    dpi: types.optional(types.number, 72),
    schemaVersion: types.optional(types.number, 2),
    bleedVisible: types.optional(types.boolean, false),
    rulesVisible: types.optional(types.boolean, false),
    guides: types.optional(
      types.array(types.frozen<{ id: string; position: number; orientation: 'H' | 'V' }>()),
      [],
    ),
    openedSidePanel: types.optional(types.string, ''),
    previousOpenedSidePanel: types.optional(types.string, ''),
    custom: types.frozen<any>(),
    editorMode: types.optional(types.string, 'select'),
    selectedElementsIds: types.array(types.string),
    animatedElementsIds: types.array(types.string),
    history: types.optional(UndoManager, { targetPath: '../pages' }),
    _elementsPixelRatio: types.optional(
      types.number,
      Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1),
    ),
    _activePageId: types.optional(types.string, ''),
    _selectedPagesIds: types.array(types.string),
    _forceShowCredit: types.optional(types.boolean, false),
    _key: types.optional(types.string, ''),
    _validated: types.optional(types.boolean, false),
  })
  .views((self) => {
    const idsMapComputed = computed(
      () => {
        const map: Record<string, any> = {};
        forEveryChild({ children: self.pages }, (el: any) => {
          map[el.id] = el;
          return false;
        });
        return map;
      },
      { keepAlive: true },
    );
    return {
      get _idsMap() {
        return idsMapComputed.get();
      },
    };
  })
  .views((self) => ({
    get _bleedVisible(): boolean {
      console.warn('store._bleedVisible is deprecated. Please use store.bleedVisible instead.');
      return self.bleedVisible;
    },

    get selectedElements(): any[] {
      return self.selectedElementsIds
        .map((id) => {
          for (const page of self.pages) {
            for (const child of page.children) {
              if ((child as any).id === id) return child;
            }
          }
          return undefined;
        })
        .filter(Boolean);
    },

    get children() {
      return self.pages;
    },

    get selectedShapes(): any[] {
      const shapes: any[] = [];
      forEveryChild({ children: (self as any).selectedElements }, (el: any) => {
        if (el.type !== 'group') shapes.push(el);
      });
      return shapes;
    },

    get activePage(): any {
      return (
        self.pages.slice().find((p) => p.id === self._activePageId) ||
        (self.pages.length ? self.pages[0] : null)
      );
    },

    get selectedPages(): any[] {
      return self._selectedPagesIds.map((id) => self.pages.find((p) => p.id === id));
    },

    get duration(): number {
      let total = 0;
      self.pages.forEach((p) => { total += p.duration; });
      return total;
    },

    get _hasCroppedImages(): any {
      return (self as any).find((el: any) => el.type === 'image' && el._cropModeEnabled);
    },

    find(predicate: (el: any) => boolean): any {
      let found: any;
      forEveryChild({ children: self.pages }, (el: any) => {
        if (!found && predicate(el)) {
          found = el;
          return true;
        }
      });
      return found;
    },

    getElementById(id: string): any {
      return (self as any)._idsMap[id];
    },
  }))
  .actions((self) => {
    let lastTime = 0;
    let playEndTime: number | null = null;
    let shouldRepeat = false;

    return {
      afterCreate() {
        // Trigger canUndo to initialize history tracking
        void self.history.canUndo;
      },

      setCurrentTime(time: number) {
        self.currentTime = time;
      },

      _togglePlaying(value = !self.isPlaying) {
        self.isPlaying = value;
      },

      play({
        animatedElementsIds = [] as string[],
        startTime = 0,
        currentTime = 0,
        endTime = (self as any).duration,
        repeat = false,
      } = {}) {
        if (currentTime) {
          console.warn('currentTime property of store.play() is deprecated. Please use startTime instead.');
          startTime = currentTime;
        }
        self.animatedElementsIds = cast(animatedElementsIds);
        self.currentTime = startTime;
        self.isPlaying = true;
        lastTime = Date.now();
        playEndTime = endTime;
        shouldRepeat = repeat;
        requestAnimationFrame((self as any).seek);
      },

      checkActivePage() {
        for (const page of self.pages) {
          if (self.currentTime >= page.startTime && self.currentTime < page.startTime + page.duration) {
            (self as any).selectPage(page.id);
            break;
          }
        }
      },

      seek() {
        if (!self.isPlaying) return;
        const now = Date.now();
        const delta = now - lastTime;
        lastTime = now;
        self.currentTime += delta;
        (self as any).checkActivePage();
        const end = playEndTime || (self as any).duration;
        if (self.isPlaying && self.currentTime < end) {
          requestAnimationFrame((self as any).seek);
        } else if (self.isPlaying && shouldRepeat) {
          self.currentTime = 0;
          requestAnimationFrame((self as any).seek);
        } else {
          (self as any).stop();
        }
      },

      stop() {
        self.isPlaying = false;
        self.currentTime = 0;
        self.animatedElementsIds = cast([]);
        (self as any).checkActivePage();
      },
    };
  })
  .actions((self) => ({
    __() {
      if (!self._validated) {
        validateKey(self._key, self._forceShowCredit);
        self._validated = true;
      }
    },

    set(attrs: Record<string, any>) {
      Object.assign(self, attrs);
    },

    setEditorMode(mode: string) {
      self.editorMode = mode;
    },

    setUnit({ unit, dpi }: { unit?: string; dpi?: number }) {
      if (unit) self.unit = unit;
      if (dpi) self.dpi = dpi;
    },

    setRole(role: string) {
      self.role = role;
    },

    addPage(attrs: Record<string, any> = {}): any {
      const page = Page.create({ id: nanoid(10), ...attrs });
      self.pages.push(page);
      self._activePageId = page.id;
      return page;
    },

    selectPage(id: string) {
      self._activePageId = id;
      if (self._selectedPagesIds.length === 1) {
        self._selectedPagesIds = cast([id]);
      }
    },

    selectPages(ids: string[]) {
      self._selectedPagesIds = cast(ids);
      if (ids.length === 1) self._activePageId = ids[0];
    },

    selectElements(ids: string[]) {
      const sorted = ids
        .map((id) => (self as any).getElementById(id))
        .sort((a: any, b: any) => a.page.children.indexOf(a) - a.page.children.indexOf(b))
        .filter(Boolean)
        .map((el: any) => el.id);
      self.selectedElementsIds = cast(sorted);
    },

    toggleBleed(value?: boolean) {
      self.bleedVisible = value != null ? value : !self.bleedVisible;
    },

    toggleRulers(value?: boolean) {
      self.rulesVisible = value != null ? value : !self.rulesVisible;
    },

    addGuide(position: number, orientation: 'H' | 'V') {
      (self as any).guides.push({ id: nanoid(10), position, orientation });
    },

    removeGuide(id: string) {
      const idx = (self as any).guides.findIndex((g: any) => g.id === id);
      if (idx !== -1) (self as any).guides.splice(idx, 1);
    },

    updateGuidePosition(id: string, position: number) {
      const idx = (self as any).guides.findIndex((g: any) => g.id === id);
      if (idx !== -1) {
        (self as any).guides[idx] = { ...(self as any).guides[idx], position };
      }
    },

    clearGuides() {
      (self as any).guides.clear();
    },

    openSidePanel(name: string) {
      if (self.openedSidePanel !== name) {
        self.previousOpenedSidePanel = self.openedSidePanel;
        self.openedSidePanel = name;
      }
    },

    setScale(scale: number) {
      self.scale = scale;
    },

    _setScaleToFit(scale: number) {
      self.scaleToFit = scale;
    },

    setElementsPixelRatio(ratio: number) {
      self._elementsPixelRatio = ratio;
    },

    setSize(width: number, height: number, useMagic?: boolean) {
      self.pages.forEach((page) => {
        page.setSize({ width, height, useMagic, softChange: true });
      });
      self.width = width;
      self.height = height;
    },

    setPageZIndex(id: string, zIndex: number) {
      const page = self.pages.find((p) => p.id === id);
      if (page) {
        detach(page);
        self.pages.remove(page);
        self.pages.splice(zIndex, 0, page);
      }
    },

    deletePages(ids: string[]) {
      const currentIndex = self.pages.indexOf((self as any).activePage);
      ids.forEach((id) => {
        const page = self.pages.find((p) => p.id === id);
        if (page) destroy(page);
      });
      const newIndex = Math.min(self.pages.length - 1, currentIndex);
      const nextPage = self.pages[newIndex];
      if (nextPage) self._activePageId = nextPage.id;
      self.selectedElementsIds = cast(
        self.selectedElementsIds.filter((id) => (self as any).getElementById(id)),
      );
    },

    groupElements(ids: string[], attrs: Record<string, any> = {}): any {
      const elements = ids.map((id) => (self as any).getElementById(id));
      const page = elements[0].page;
      elements.forEach((el: any) => el && detach(el));
      if (!elements.length) return;

      const maxGroupIdx = page.children.reduce((max: number, child: any) => {
        if (child.type === 'group') {
          const match = child.name?.match(/group-(\d+)/);
          if (match) return Math.max(max, parseInt(match[1], 10));
        }
        return max;
      }, 0);

      const group = {
        id: nanoid(10),
        name: `group-${maxGroupIdx + 1}`,
        children: elements,
        type: 'group',
        ...attrs,
      };
      page.children.push(group);
      self.selectedElementsIds = cast([group.id]);
      return page.children.find((c: any) => c.id === group.id);
    },

    ungroupElements(ids: string[]) {
      const elements = ids.map((id) => (self as any).getElementById(id));
      const ungroupedIds: string[] = [];
      elements.forEach((group: any) => {
        if (group && group.type === 'group') {
          const page = group.page;
          const groupIndex = page.children.indexOf(group);
          group.children.forEach((child: any) => {
            ungroupedIds.push(child.id);
          });
          group.children.forEach((child: any) => {
            detach(child);
            page.children.push(child);
          });
          page.children.splice(groupIndex, 1);
        }
      });
      self.selectedElementsIds = cast(ungroupedIds);
    },

    deleteElements(ids: string[]) {
      const toDelete: any[] = [];
      (self as any).find((el: any) => {
        if (ids.includes(el.id)) toDelete.push(el);
        return false;
      });
      toDelete.forEach((el) => destroy(el));
      self.selectedElementsIds = cast(
        self.selectedElementsIds.filter((id) => (self as any).getElementById(id)),
      );
    },

    on(event: string, handler: (data: any) => void): (() => void) | undefined {
      if (event === 'change') {
        let last = (self as any).toJSON();
        return onSnapshot(self, () => {
          const current = (self as any).toJSON();
          if (!deepEqual(last, current)) {
            last = current;
            handler(current);
          }
        });
      }
    },

    async _toCanvas({
      pixelRatio,
      ignoreBackground,
      pageId,
      mimeType,
      includeBleed,
      _skipTimeout,
      quickMode = false,
    }: {
      pixelRatio?: number;
      ignoreBackground?: boolean;
      pageId?: string;
      mimeType?: string;
      includeBleed?: boolean;
      _skipTimeout?: boolean;
      quickMode?: boolean;
    } = {}): Promise<HTMLCanvasElement> {
      const ratio = pixelRatio || 1;
      pageId = pageId || self.pages[0]?.id;
      const page = self.pages.find((p) => p.id === pageId);
      if (!page) throw new Error(`No page for export with id ${pageId}`);

      const prevRatio = self._elementsPixelRatio;
      if (ratio > self._elementsPixelRatio) (self as any).setElementsPixelRatio(ratio);

      if (quickMode) {
        page.set({ _forceMount: true });
      } else {
        page.set({ _exporting: true });
      }

      const stages = await waitTillAvailable(() => {
        const found = Konva.stages.filter((s: any) => s.getAttr('pageId') === pageId);
        return found.length === 0 ? null : found;
      });

      if (!stages) {
        page.set({ _forceMount: false, _exporting: false });
        (self as any).setElementsPixelRatio(prevRatio);
        throw new Error(
          `Export is failed. Can not find stage for page ${pageId}. Looks like <Workspace /> component is not mounted, but it is required in order to process the export.`,
        );
      }

      if (stages.length > 1) {
        console.error(
          `Raeditor error: Detected several canvas elements for page "${pageId}" in the document. This is not supported and will lead to incorrect export.`,
        );
      }

      const stage = stages[0];
      await (self as any).waitLoading({ _skipTimeout });

      const pageContainer = stage.findOne('.page-container');
      if (!pageContainer) {
        (self as any).setElementsPixelRatio(prevRatio);
        page.set({ _forceMount: false, _exporting: false });
        throw new Error('Export is failed. Canvas was unmounted.');
      }

      const stagePos = stage.position();
      stage.position({ x: 0, y: 0 });
      stage.find('Transformer').forEach((t: any) => {
        t.setAttr('oldVisible', t.visible());
        t.visible(false);
      });
      pageContainer.find('.page-background').forEach((n: any) => n.shadowEnabled(false));
      pageContainer.find('.page-background').forEach((n: any) => n.strokeEnabled(false));
      pageContainer.find('.highlighter').forEach((n: any) => n.visible(false));

      const bgGroup = pageContainer.findOne('.page-background-group');
      const bgClip = bgGroup.clip();
      bgGroup.clip({ x: null, y: null, width: null, height: null });

      const elemContainer = pageContainer.findOne('.elements-container');
      const elemClip = elemContainer.clip();
      elemContainer.clip({ x: null, y: null, width: null, height: null });

      const hiddenEditable = pageContainer.find(
        (n: any) => !n.visible() && n.getAttr('editModeEnabled') && !n.getAttr('hideInExport'),
      );
      hiddenEditable.forEach((n: any) => {
        n.setAttr('oldVisible', n.visible());
        n.show();
      });

      const hideInExport = pageContainer.find((n: any) => n.getAttr('hideInExport'));
      hideInExport.forEach((n: any) => {
        n.setAttr('oldVisible', n.visible());
        n.hide();
      });

      if (ignoreBackground) {
        pageContainer.find('.page-background').forEach((n: any) => n.hide());
      }

      const bleedSize = includeBleed ? page.bleed : 0;
      let bleedOffset = bleedSize;
      if (!self.bleedVisible && includeBleed) bleedOffset = bleedSize;
      else if (self.bleedVisible && includeBleed) bleedOffset = 0;
      else if (self.bleedVisible && !includeBleed) bleedOffset = -page.bleed;
      else bleedOffset = 0;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round((page.computedWidth + 2 * bleedSize) * ratio);
      canvas.height = Math.round((page.computedHeight + 2 * bleedSize) * ratio);

      const ctx = canvas.getContext('2d')!;
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const containerScale = pageContainer.scale();
      pageContainer.scale({ x: 1, y: 1 });

      const exportCanvas = pageContainer.toCanvas({
        x: pageContainer.x() - bleedOffset,
        y: pageContainer.y() - bleedOffset,
        width: page.computedWidth + 2 * bleedSize,
        height: page.computedHeight + 2 * bleedSize,
        pixelRatio: ratio,
      });

      pageContainer.scale(containerScale);
      ctx.drawImage(exportCanvas, 0, 0, canvas.width, canvas.height);
      Konva.Util.releaseCanvas(exportCanvas);

      // Restore state
      if (ignoreBackground) {
        pageContainer.find('.page-background').forEach((n: any) => n.show());
      }
      hideInExport.forEach((n: any) => n.visible(n.getAttr('oldVisible')));
      hiddenEditable.forEach((n: any) => n.visible(n.getAttr('oldVisible')));
      pageContainer.find('.page-background').forEach((n: any) => n.shadowEnabled(true));
      pageContainer.find('.page-background').forEach((n: any) => n.strokeEnabled(true));
      stage.find('Transformer').forEach((t: any) => t.visible(t.getAttr('oldVisible')));
      pageContainer.find('.highlighter').forEach((n: any) => n.visible(true));
      bgGroup.clip(bgClip);
      elemContainer.clip(elemClip);
      stage.position(stagePos);

      page.set({ _exporting: false, _forceMount: false });
      await new Promise((resolve) => setTimeout(resolve));
      (self as any).setElementsPixelRatio(prevRatio);

      return canvas;
    },

    async toDataURL({
      mimeType,
      quality,
      ...rest
    }: {
      mimeType?: string;
      quality?: number;
      [key: string]: any;
    } = {}): Promise<string> {
      const canvas = await (self as any)._toCanvas({ mimeType, ...rest });
      const url = canvas.toDataURL(mimeType, quality);
      Konva.Util.releaseCanvas(canvas);
      return url;
    },

    async toBlob({
      mimeType,
      quality,
      ...rest
    }: {
      mimeType?: string;
      quality?: number;
      [key: string]: any;
    } = {}): Promise<Blob> {
      const canvas = await (self as any)._toCanvas({ mimeType, ...rest });
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(resolve as BlobCallback, mimeType, quality);
      });
      Konva.Util.releaseCanvas(canvas);
      return blob;
    },

    async saveAsImage({ fileName, ...rest }: { fileName?: string; [key: string]: any } = {}) {
      const mimeType = rest.mimeType || 'image/png';
      const ext = mimeType.split('/')[1];
      const url = await (self as any).toDataURL(rest);
      downloadFile(url, fileName || 'raeditor.' + ext, mimeType);
    },

    async _toPDF(options: {
      dpi?: number;
      parallel?: number;
      unit?: string;
      pixelRatio?: number;
      pageIds?: string[];
      includeBleed?: boolean;
      cropMarkSize?: number;
      onProgress?: (progress: number) => void;
      mimeType?: string;
    }) {
      const dpi = options.dpi || self.dpi;
      const parallel = options.parallel || 1;
      const unit = options.unit || (self.unit === 'px' ? 'mm' : self.unit);
      const pixelRatio = options.pixelRatio || 1;
      const pageIds = options.pageIds || self.pages.map((p) => p.id);
      const pages = self.pages.filter((p) => pageIds.includes(p.id));
      const JsPDF = await getJsPDF();
      const toUnit = (px: number) => pxToUnit({ px, unit, dpi });
      const cropMarkSize = options.cropMarkSize || 0;
      const cropMarkUnit = toUnit(cropMarkSize);
      const firstPage = pages[0] || ({} as any);
      const bleed = options.includeBleed ? firstPage.bleed : 0;
      const docWidth = toUnit(firstPage.computedWidth + 2 * bleed + 2 * cropMarkUnit);
      const docHeight = toUnit(firstPage.computedHeight + 2 * bleed + 2 * cropMarkUnit);

      const doc = new JsPDF({
        unit,
        orientation: docWidth > docHeight ? 'landscape' : 'portrait',
        format: [docWidth, docHeight],
        compress: true,
        putOnlyUsedFonts: true,
      });
      doc.deletePage(1);

      const chunks: typeof pages[] = [];
      for (let i = 0; i < pages.length; i += parallel) {
        chunks.push(pages.slice(i, i + parallel));
      }

      let processed = 0;
      for (const chunk of chunks) {
        const results = await Promise.all(
          chunk.map(async (page) => {
            const bleedPx = options.includeBleed ? page.bleed : 0;
            const w = page.computedWidth + 2 * bleedPx + 2 * cropMarkSize;
            const h = page.computedHeight + 2 * bleedPx + 2 * cropMarkSize;
            const wUnit = toUnit(w);
            const hUnit = toUnit(h);

            let attempts = 0;
            let ratio = pixelRatio;
            while (attempts < 10) {
              attempts++;
              if (attempts === 2) {
                console.error('Raeditor can not export PDF with current settings. Quality is automatically reduced.');
              }
              const url = await (self as any).toDataURL({ ...options, pageId: page.id, pixelRatio: ratio });
              if (url.length > 20) {
                options.onProgress && options.onProgress((++processed / pageIds.length) * 0.9);
                return { url, width: wUnit, height: hUnit, widthPx: w, heightPx: h };
              }
              ratio *= 0.8;
            }
          }),
        );

        results.forEach((result: any) => {
          const { url, width, height, widthPx, heightPx } = result;
          doc.addPage([width, height], width > height ? 'landscape' : 'portrait');
          const pageInfo = doc.getCurrentPageInfo();

          // Unit conversion factor for PDF coordinates
          const unitFactor: Record<string, number> = {
            pt: 1, mm: 72 / 25.4, cm: 72 / 2.54, in: 72,
            px: 0.75, pc: 12, em: 12, ex: 6,
          };
          const factor = unitFactor[unit];
          if (factor == null) throw new Error('Invalid unit: ' + unit);

          const bleedPx = options.includeBleed ? firstPage.bleed : 0;
          pageInfo.pageContext.cropBox = {
            bottomLeftX: 0, bottomLeftY: 0,
            topRightX: width * factor, topRightY: height * factor,
          };
          pageInfo.pageContext.artBox = {
            bottomLeftX: toUnit(cropMarkSize + bleedPx) * factor,
            bottomLeftY: toUnit(cropMarkSize + bleedPx) * factor,
            topRightX: toUnit(widthPx - cropMarkSize - bleedPx) * factor,
            topRightY: toUnit(heightPx - cropMarkSize - bleedPx) * factor,
          };
          pageInfo.pageContext.bleedBox = pageInfo.pageContext.artBox;

          if (cropMarkUnit) {
            doc.setLineWidth(toUnit(1));
            const markOffset = cropMarkUnit + toUnit(bleedPx);
            doc.line(markOffset, 0, markOffset, cropMarkUnit);
            doc.line(0, markOffset, cropMarkUnit, markOffset);
            doc.line(width - markOffset, 0, width - markOffset, cropMarkUnit);
            doc.line(width, markOffset, width - cropMarkUnit, markOffset);
            doc.line(0, height - markOffset, cropMarkUnit, height - markOffset);
            doc.line(markOffset, height, markOffset, height - cropMarkUnit);
            doc.line(width, height - markOffset, width - cropMarkUnit, height - markOffset);
            doc.line(width - markOffset, height, width - markOffset, height - cropMarkUnit);
          }

          doc.addImage(url, cropMarkUnit, cropMarkUnit, width - 2 * cropMarkUnit, height - 2 * cropMarkUnit, undefined, 'FAST');
        });
      }

      return doc;
    },

    async toPDFDataURL(options: Record<string, any> = {}): Promise<string> {
      return (await (self as any)._toPDF({ mimeType: 'image/jpeg', ...options })).output('datauristring');
    },

    async toGIFDataURL({ pixelRatio = 1, fps = 60 } = {}): Promise<string> {
      const gif = await createGIF({ width: self.width * pixelRatio, height: self.height * pixelRatio });
      const frameDelay = 1000 / fps;
      const frameCount = Math.ceil((self as any).duration / frameDelay);

      for (let i = 0; i < frameCount; i++) {
        const time = i * frameDelay;
        (self as any).setCurrentTime(time);

        // Wait two animation frames: first for React/MobX to re-render observer
        // components with the new currentTime, second for Konva to flush its draw
        // calls and paint the updated state onto the canvas layers.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );

        let elapsed = 0;
        let activePageId = '';
        for (const page of self.pages) {
          elapsed += page.duration;
          page.set({ _rendering: elapsed > time });
          if (elapsed > time) {
            activePageId = page.id;
            break;
          }
        }
        const canvas = await (self as any)._toCanvas({ pixelRatio, pageId: activePageId, _skipTimeout: true });
        gif.addFrame(canvas.getContext('2d'), { delay: frameDelay, copy: true });
      }

      for (const page of self.pages) {
        page.set({ _rendering: false });
      }
      (self as any).stop();
      gif.render();

      return new Promise((resolve) => {
        gif.on('finished', (blob: Blob) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target!.result as string);
          reader.readAsDataURL(blob);
        });
      });
    },

    async saveAsGIF({ fileName, ...rest }: { fileName?: string; [key: string]: any } = {}) {
      const url = await (self as any).toGIFDataURL(rest);
      downloadFile(url, fileName || 'raeditor.gif');
    },

    async toHTML({ elementHook }: { elementHook?: Function } = {}): Promise<string> {
      return jsonToHTML({ json: (self as any).toJSON(), elementHook });
    },

    async saveAsHTML({ fileName, elementHook }: { fileName?: string; elementHook?: Function } = {}) {
      const html = await (self as any).toHTML({ elementHook });
      const url = 'data:text/html;base64,' + window.btoa(unescape(encodeURIComponent(html)));
      downloadFile(url, fileName || 'raeditor.html');
    },

    async toSVG({
      elementHook,
      pageId,
      fontEmbedding = 'inline',
    }: {
      elementHook?: Function;
      pageId?: string;
      fontEmbedding?: string;
    } = {}): Promise<string> {
      const json = (self as any).toJSON();
      pageId = pageId || json.pages[0]?.id;
      const page = json.pages.find((p: any) => p.id === pageId);
      return jsonToSVG({
        json: { ...json, pages: page ? [page] : [] },
        elementHook,
        fontEmbedding,
      });
    },

    async saveAsSVG({
      fileName,
      elementHook,
      pageId,
      fontEmbedding = 'inline',
    }: {
      fileName?: string;
      elementHook?: Function;
      pageId?: string;
      fontEmbedding?: string;
    } = {}) {
      const svg = await (self as any).toSVG({ elementHook, pageId, fontEmbedding });
      const url = 'data:text/svg;base64,' + window.btoa(unescape(encodeURIComponent(svg)));
      downloadFile(url, fileName || 'raeditor.svg');
    },

    async saveAsPDF({ fileName, ...rest }: { fileName?: string; [key: string]: any } = {}) {
      const doc = await (self as any)._toPDF({ mimeType: 'image/jpeg', ...rest });
      doc.save(fileName || 'raeditor.pdf');
    },

    async waitLoading({ _skipTimeout = false } = {}) {
      if (!_skipTimeout) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      await whenLoaded();
    },

    toJSON() {
      return {
        width: self.width,
        height: self.height,
        fonts: getSnapshot(self.fonts),
        pages: getSnapshot(self.pages),
        audios: getSnapshot(self.audios),
        unit: self.unit,
        dpi: self.dpi,
        custom: self.custom,
        schemaVersion: self.schemaVersion,
      };
    },

    loadJSON(json: Record<string, any>, keepHistory = false) {
      const data = JSON.parse(JSON.stringify(json));
      const schemaVersion = data.schemaVersion || 0;

      // Schema migration v0 → v1: normalize letter spacing for HTML text
      if (schemaVersion < 1 && flags.htmlRenderEnabled) {
        forEveryChild({ children: data.pages }, (el: any) => {
          if (el.type === 'text') {
            const baseFontSize = 16;
            el.letterSpacing = (el.letterSpacing * baseFontSize) / el.fontSize;
          }
        });
      }

      // Schema migration v1 → v2: normalize filter intensities (0-1 scale)
      if (schemaVersion < 2) {
        forEveryChild({ children: data.pages }, (el: any) => {
          if (el.filters) {
            Object.keys(el.filters).forEach((key) => {
              if (['warm', 'cold', 'natural'].includes(key)) return;
              const filter = el.filters[key];
              if (filter && typeof filter.intensity === 'number') {
                filter.intensity = filter.intensity / 100;
              }
            });
          }
        });
      }

      delete data.schemaVersion;

      const currentIndex = self.pages.indexOf((self as any).activePage);
      const targetPage = data.pages[currentIndex] || data.pages[0];
      data._activePageId = targetPage?.id;

      const currentSnap = Object.assign({}, getSnapshot(self));
      Object.assign(currentSnap, data);
      currentSnap.history = keepHistory
        ? getSnapshot(self.history)
        : { history: [], undoIdx: -1 };

      applySnapshot(self, currentSnap);
    },

    clear({ keepHistory = false } = {}) {
      const ids = self.pages.map((p) => p.id);
      (self as any).deletePages(ids);
      self.custom = null as any;
      if (!keepHistory) self.history.clear();
    },

    addFont(font: { fontFamily: string; url?: string; styles?: any }) {
      (self as any).removeFont(font.fontFamily);
      self.fonts.push(font as any);
      (self as any).loadFont(font.fontFamily);
    },

    removeFont(fontFamily: string) {
      self.fonts
        .filter((f) => f.fontFamily === fontFamily)
        .forEach((f) => destroy(f));
    },

    addAudio(attrs: Record<string, any>) {
      const audio = Audio.create({ id: nanoid(10), ...attrs });
      self.audios.push(audio);
    },

    removeAudio(id: string) {
      const audio = self.audios.find((a) => a.id === id);
      if (audio) self.audios.remove(audio);
    },

    async loadFont(fontFamily: string, text = '') {
      const customFont = self.fonts.find((f) => f.fontFamily === fontFamily);
      const globalFont = fonts.globalFonts.find((f: any) => f.fontFamily === fontFamily);
      const font = customFont || globalFont;

      let styles = [
        { fontStyle: 'normal', fontWeight: 'normal' },
        { fontStyle: 'normal', fontWeight: 'bold' },
      ];

      if (font) {
        if ((font as any).styles) {
          styles = (font as any).styles.map((s: any) => ({
            fontStyle: s.fontStyle || 'normal',
            fontWeight: s.fontWeight || 'normal',
          }));
        }
        if (customFont) {
          fonts.injectCustomFont(customFont as any);
        } else {
          fonts.injectGoogleFont(fontFamily);
        }
      } else {
        fonts.injectGoogleFont(fontFamily);
      }

      return Promise.all(
        styles.map((style) => fonts.loadFont(fontFamily, style.fontStyle, style.fontWeight, text)),
      );
    },

    validate(data: any) {
      return Store.validate(data, [{ path: '', type: Store }]).map((err: any) => ({
        path: 'store' + err.context.map((c: any) => c.path).join('.'),
        message: err.message,
      }));
    },
  }));

export type StoreType = Instance<typeof Store>;

export function createStore({ key = '', showCredit = false } = {}): StoreType {
  return Store.create({ _forceShowCredit: showCredit, _key: key });
}

export default createStore;
