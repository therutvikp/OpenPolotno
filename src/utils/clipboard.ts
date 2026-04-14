'use client';

import { forEveryChild } from '../model/group-model';
import { getTotalClientRect } from './math';

const STORAGE_KEY = 'raeditor_clipboard';

let memoryClipboard: { data: any[]; pageId: string } = { data: [], pageId: '' };

const setClipboard = (data: any[], pageId: string) => {
  memoryClipboard = { data: JSON.parse(JSON.stringify(data)), pageId };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY + '_page', pageId);
  } catch (_) {}
};

const getClipboard = (): { data: any[]; pageId: string | null } => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const pageId = localStorage.getItem(STORAGE_KEY + '_page');
    if (data) return { data: JSON.parse(data), pageId };
  } catch (_) {}
  return memoryClipboard;
};

export const copy = (store: any) => {
  if (store.selectedElements.length === 0) return;
  setClipboard(
    store.selectedElements.map((el: any) => el.toJSON()),
    store.activePage?.id,
  );
};

export const cut = (store: any) => {
  setClipboard(
    store.selectedElements.map((el: any) => el.toJSON()),
    store.activePage?.id,
  );
  const ids = store.selectedElements.filter((el: any) => el.removable).map((el: any) => el.id);
  store.deleteElements(ids);
};

export const paste = (store: any) => {
  store.history.transaction(() => {
    let offsetX = 0;
    let offsetY = 0;
    const { data, pageId } = getClipboard();

    if (pageId === store.activePage?.id) {
      offsetX = store.width / 20;
      offsetY = store.height / 20;
    } else {
      const flatElements: any[] = [];
      forEveryChild({ children: data }, (el: any) => {
        if (el.type !== 'group') flatElements.push(el);
      });
      const rect = getTotalClientRect(flatElements);
      if (rect.maxX > store.width) offsetX = -rect.minX;
      if (rect.maxY > store.height) offsetY = -rect.minY;
    }

    const addedIds: string[] = [];
    forEveryChild({ children: data }, (el: any) => {
      delete el.id;
      if (el.type !== 'group') {
        el.x += offsetX;
        el.y += offsetY;
      }
    });

    data.forEach((el: any) => {
      const added = store.activePage?.addElement(el);
      if (added) addedIds.push(added.id);
    });

    setClipboard(data, store.activePage?.id);
    store.selectElements(addedIds);
  });
};

export const isClipboardEmpty = () => getClipboard().data.length === 0;
