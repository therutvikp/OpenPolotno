'use client';

import { copy, cut } from '../utils/clipboard';
import { duplicateElements } from '../utils/duplicate';
import {
  alignBottom,
  alignCenter,
  alignLeft,
  alignMiddle,
  alignRight,
  alignTop,
} from '../utils/alignment';
import { StoreType } from '../model/store';

const DEFAULT_SHAPE_COLOR = 'rgba(191, 191, 191, 100)';

export function handleHotkey(e: KeyboardEvent, store: StoreType): void {
  // Ignore hotkeys when typing in inputs
  const activeEl = document.activeElement as HTMLElement;
  if (
    activeEl?.tagName === 'INPUT' ||
    activeEl?.tagName === 'TEXTAREA' ||
    activeEl?.contentEditable === 'true'
  ) {
    return;
  }

  // Allow text selection shortcuts
  const container = document.querySelector('.raeditor-workspace-container');
  if (container !== document.activeElement && !container?.contains(document.activeElement)) {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
  }

  const removableIds = store.selectedElements
    .filter((el: any) => el.removable)
    .map((el: any) => el.id);

  // Delete / Backspace
  if (e.keyCode === 46 || e.keyCode === 8) {
    store.deleteElements(removableIds);
  }

  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;

  // Undo
  if (ctrl && !shift && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
    e.preventDefault();
    store.history.undo();
  }

  // Redo
  if (ctrl && shift && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
    e.preventDefault();
    store.history.redo();
  }

  // Select all
  if (ctrl && e.code === 'KeyA') {
    e.preventDefault();
    const selectable = store.activePage?.children.filter((el: any) => el.selectable);
    store.selectElements(selectable?.map((el: any) => el.id) || []);
  }

  if (ctrl && e.code === 'KeyC') { e.preventDefault(); copy(store); }
  if (ctrl && e.code === 'KeyX') { e.preventDefault(); cut(store); }
  // Ctrl+V is handled via the 'paste' DOM event in workspace-canvas (supports both
  // system-clipboard images and editor-element paste).

  // Arrow nudge
  if (e.code === 'ArrowDown') { e.preventDefault(); store.selectedShapes.forEach((el: any) => { if (el.draggable) el.set({ y: el.y + 1 }); }); }
  if (e.code === 'ArrowUp') { e.preventDefault(); store.selectedShapes.forEach((el: any) => { if (el.draggable) el.set({ y: el.y - 1 }); }); }
  if (e.code === 'ArrowLeft') { e.preventDefault(); store.selectedShapes.forEach((el: any) => { if (el.draggable) el.set({ x: el.x - 1 }); }); }
  if (e.code === 'ArrowRight') { e.preventDefault(); store.selectedShapes.forEach((el: any) => { if (el.draggable) el.set({ x: el.x + 1 }); }); }

  // Group / ungroup
  if (ctrl && e.code === 'KeyG') {
    e.preventDefault();
    const first = store.selectedElements[0];
    if (first && first.type === 'group') {
      store.ungroupElements([first.id]);
    } else {
      store.groupElements(store.selectedElements.map((el: any) => el.id));
    }
  }

  // Duplicate
  if (ctrl && e.code === 'KeyD') {
    e.preventDefault();
    duplicateElements(store.selectedElements, store);
  }

  // Quick-add text
  if (e.code === 'KeyT' && !ctrl) {
    e.preventDefault();
    const textWidth = store.width / 2;
    const baseFontSize = 30;
    const scaleFactor = (store.width + store.height) / 2160;
    store.activePage.addElement({
      type: 'text',
      x: store.width / 2 - textWidth / 2,
      y: store.height / 2 - baseFontSize / 2,
      width: textWidth,
      fontSize: baseFontSize * scaleFactor,
      text: 'Sample Text',
      fontFamily: 'Roboto',
    });
  }

  // Quick-add rectangle
  if (e.code === 'KeyR' && !ctrl) {
    e.preventDefault();
    store.activePage.addElement({
      type: 'figure',
      x: store.width / 4,
      y: store.height / 4,
      width: 300,
      height: 300,
      fill: DEFAULT_SHAPE_COLOR,
      stroke: '#0c0c0c',
      strokeWidth: 0,
      subType: 'rect',
    });
  }

  // Quick-add line
  if (e.code === 'KeyL' && !ctrl) {
    e.preventDefault();
    const lineWidth = store.activePage.computedWidth / 3;
    store.activePage.addElement({
      type: 'line',
      x: store.activePage.computedWidth / 2 - lineWidth / 2,
      y: store.activePage.computedHeight / 2,
      width: lineWidth,
      color: DEFAULT_SHAPE_COLOR,
    });
  }

  // Quick-add circle
  if (e.code === 'KeyO' && !ctrl) {
    e.preventDefault();
    store.activePage.addElement({
      type: 'figure',
      x: store.width / 4,
      y: store.height / 4,
      width: 300,
      height: 300,
      fill: DEFAULT_SHAPE_COLOR,
      stroke: '#0c0c0c',
      strokeWidth: 0,
      subType: 'circle',
    });
  }

  // Zoom
  if (ctrl && e.code === 'Equal') { e.preventDefault(); store.setScale(store.scale + 0.1); }
  if (ctrl && e.code === 'Minus') { e.preventDefault(); store.setScale(store.scale - 0.1); }

  // Alignment (Alt+key)
  if (e.altKey) {
    if (e.code === 'KeyA') { e.preventDefault(); alignLeft(store); }
    if (e.code === 'KeyD') { e.preventDefault(); alignRight(store); }
    if (e.code === 'KeyS') { e.preventDefault(); alignBottom(store); }
    if (e.code === 'KeyW') { e.preventDefault(); alignTop(store); }
    if (e.code === 'KeyV') { e.preventDefault(); alignMiddle(store); }
    if (e.code === 'KeyH') { e.preventDefault(); alignCenter(store); }
  }

  // Layering
  if (e.code === 'BracketRight') {
    e.preventDefault();
    ctrl
      ? store.activePage.moveElementsTop(store.selectedElementsIds)
      : store.activePage.moveElementsUp(store.selectedElementsIds);
  }
  if (e.code === 'BracketLeft') {
    e.preventDefault();
    ctrl
      ? store.activePage.moveElementsBottom(store.selectedElementsIds)
      : store.activePage.moveElementsDown(store.selectedElementsIds);
  }
}
