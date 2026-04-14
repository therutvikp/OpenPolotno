import { getClientRect } from './math';

function getElementRect(el: any): { x: number; y: number; width: number; height: number } {
  if (el.type !== 'group') return getClientRect(el);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  el.children.forEach((child: any) => {
    const r = getElementRect(child);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function moveElement(el: any, targetX: number, targetY: number) {
  if (el.type !== 'group') {
    const rect = getClientRect(el);
    const dx = targetX - rect.x;
    const dy = targetY - rect.y;
    el.set({ x: el.x + dx, y: el.y + dy });
  } else {
    const dx = targetX - getElementRect(el).x;
    const dy = targetY - getElementRect(el).y;
    el.children.forEach((child: any) => {
      const r = getElementRect(child);
      moveElement(child, r.x + dx, r.y + dy);
    });
  }
}

export function alignLeft(store: any) {
  let minX = store.activePage?.computedWidth;
  store.selectedElements.forEach((el: any) => {
    minX = Math.min(minX, getElementRect(el).x);
  });
  if (store.selectedElements.length === 1) minX = 0;
  store.selectedElements.forEach((el: any) => {
    const r = getElementRect(el);
    moveElement(el, r.x - r.x + minX, r.y);
  });
}

export function alignRight(store: any) {
  let maxX = 0;
  store.selectedElements.forEach((el: any) => {
    const r = getElementRect(el);
    maxX = Math.max(maxX, r.x + r.width);
  });
  if (store.selectedElements.length === 1) maxX = store.activePage?.computedWidth;
  store.selectedElements.forEach((el: any) => {
    const r = getElementRect(el);
    moveElement(el, maxX - r.width, r.y);
  });
}

export function alignTop(store: any) {
  let minY = store.activePage?.computedHeight;
  store.selectedElements.forEach((el: any) => {
    minY = Math.min(minY, getElementRect(el).y);
  });
  if (store.selectedElements.length === 1) minY = 0;
  store.selectedElements.forEach((el: any) => {
    const r = getElementRect(el);
    moveElement(el, r.x, r.y - r.y + minY);
  });
}

export function alignMiddle(store: any) {
  let minY = store.activePage?.computedHeight;
  let maxY = 0;
  store.selectedElements.forEach((el: any) => {
    const r = getElementRect(el);
    minY = Math.min(minY, r.y);
    maxY = Math.max(maxY, r.y + r.height);
  });
  let centerY = (maxY + minY) / 2;
  if (store.selectedElements.length === 1) centerY = store.activePage?.computedHeight / 2;
  store.selectedElements.forEach((el: any) => {
    const r = getElementRect(el);
    moveElement(el, r.x, centerY - r.height / 2);
  });
}

export function alignBottom(store: any) {
  let maxY = 0;
  store.selectedElements.forEach((el: any) => {
    const r = getElementRect(el);
    maxY = Math.max(maxY, r.y + r.height);
  });
  if (store.selectedElements.length === 1) maxY = store.activePage?.computedHeight;
  store.selectedElements.forEach((el: any) => {
    const r = getElementRect(el);
    moveElement(el, r.x, maxY - r.height);
  });
}

export function alignCenter(store: any) {
  let minX = store.activePage?.computedWidth;
  let maxX = 0;
  store.selectedElements.forEach((el: any) => {
    const r = getElementRect(el);
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x + r.width);
  });
  let centerX = (maxX + minX) / 2;
  if (store.selectedElements.length === 1) centerX = store.activePage?.computedWidth / 2;
  store.selectedElements.forEach((el: any) => {
    const r = getElementRect(el);
    moveElement(el, centerX - r.width / 2, r.y);
  });
}
