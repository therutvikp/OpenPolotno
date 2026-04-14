'use client';
import React from 'react';
import { isAlive } from 'mobx-state-tree';
import { InputGroup } from '@blueprintjs/core';
import { Search } from '@blueprintjs/icons';
import { ImagesGrid } from './images-grid';
import { svgToURL } from '../utils/svg';
import { figureToSvg, TYPES } from '../utils/figure-to-svg';
import styled from '../utils/styled';
import { t as s } from '../utils/l10n';
import { useInfiniteAPI } from '../utils/use-api';
import { URLS } from '../utils/api';
import { StoreType } from '../model/store';

const downloadNounproject = async (id: string) => {
  const res = await fetch(URLS.nounProjectDownload(id));
  const text = await res.text();
  return await svgToURL(text);
};

const DarkInvertContainer = styled('div')`
  height: 100%;
  overflow: hidden;

  .bp5-dark & img {
    filter: invert(1);
  }
`;

export const NounprojectPanel = ({ store, query }: { store: StoreType; query: string }) => {
  const { data, isLoading, loadMore, setQuery, hasMore } = useInfiniteAPI({
    defaultQuery: query,
    getAPI: ({ page, query: q }: any) => URLS.nounProjectList({ query: q, page, limit: 50 }),
    getSize: (d: any) => d.pagesNumber,
  });

  React.useEffect(() => { setQuery(query); }, [query]);

  return React.createElement(
    DarkInvertContainer,
    null,
    React.createElement(ImagesGrid, {
      shadowEnabled: false,
      images: data?.map((d: any) => d.icons).flat(),
      getPreview: (item: any) => item.preview_url_84,
      isLoading,
      onSelect: async (item: any, pos: any, el: any) => {
        if (el && el.type === 'image' && (el as any).contentEditable) {
          const src = await downloadNounproject(item.id);
          el.set({ clipSrc: src });
          return;
        }
        if (el && el.type === 'video' && (el as any).contentEditable) {
          const src = await downloadNounproject(item.id);
          el.set({ clipSrc: src });
          return;
        }
        store.history.transaction(async () => {
          const x = ((pos?.x) || store.width / 2) - 100;
          const y = ((pos?.y) || store.height / 2) - 100;
          const node = store.activePage?.addElement({ type: 'svg', width: 200, height: 200, x, y });
          const src = await downloadNounproject(item.id);
          if (isAlive(node)) await node.set({ src });
        });
      },
      rowsNumber: 4,
      loadMore: hasMore && loadMore,
    })
  );
};

const lineStyles = [
  { preview: svgToURL(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><path stroke="#C0BFBF" strokeWidth="4" d="M 1 8 L 30 8"></path></svg>`), data: {} },
  { preview: svgToURL(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><path stroke="#C0BFBF" strokeWidth="4" stroke-dasharray="4 2" d="M 1 8 L 30 8"></path></svg>`), data: { dash: [4, 2] } },
  { preview: svgToURL(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><path stroke="#C0BFBF" strokeWidth="4" stroke-dasharray="1 1" d="M 1 8 L 30 8"></path></svg>`), data: { dash: [1, 1] } },
  { preview: svgToURL(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><path stroke="#C0BFBF" strokeWidth="2" d="M 25 6 L 29 8 L 25 10" fill="none" strokeLinejoin="round" strokeLinecap="round"></path><path stroke="#C0BFBF" strokeWidth="4" d="M 1 8 L 29 8" strokeLinejoin="round" strokeLinecap="round"></path></svg>`), data: { endHead: 'arrow' } },
  { preview: svgToURL(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><path stroke="#C0BFBF" strokeWidth="2" d="M 25 6 L 29 8 L 25 10 Z" fill="#C0BFBF" strokeLinejoin="round" strokeLinecap="round"></path><path stroke="#C0BFBF" strokeWidth="4" d="M 1 8 L 29 8" strokeLinejoin="round" strokeLinecap="round"></path><circle cx="3" cy="8" r="2" fill="#C0BFBF"></circle></svg>`), data: { startHead: 'circle', endHead: 'triangle' } },
  { preview: svgToURL(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><path stroke="#C0BFBF" strokeWidth="2" d="M 1 6 L 5 6 L 5 10 L 1 10 Z" fill="#C0BFBF" strokeLinejoin="round" strokeLinecap="round"></path><path stroke="#C0BFBF" strokeWidth="4" d="M 1 8 L 29 8" strokeLinejoin="round" strokeLinecap="round" stroke-dasharray="2 1"></path><path stroke="#C0BFBF" strokeWidth="4" d="M 29 6 L 29 10" strokeLinejoin="round" strokeLinecap="round"></path></svg>`), data: { startHead: 'square', endHead: 'bar', dash: [2, 1] } },
];

let defaultShapeColor = 'rgba(191, 191, 191, 100)';
export const setDefaultColor = (color: string) => { defaultShapeColor = color; };

const LinesGrid = ({ store }: { store: StoreType }) =>
  React.createElement(ImagesGrid, {
    shadowEnabled: false,
    rowsNumber: 3,
    images: lineStyles,
    getPreview: (item: any) => item.preview,
    itemHeight: 50,
    isLoading: false,
    onSelect: async (item: any, pos: any) => {
      const w = store.activePage.computedWidth / 3;
      store.activePage.addElement(Object.assign({
        type: 'line',
        x: pos ? pos.x : store.activePage.computedWidth / 2 - w / 2,
        y: pos ? pos.y : store.activePage.computedHeight / 2,
        color: defaultShapeColor,
        width: w,
      }, item.data));
    },
  });

const shapeTypes = Object.keys(TYPES);
const baseShapes = [{ width: 300, height: 300, fill: 'rgba(191, 191, 191, 100)', stroke: '#0c0c0c', strokeWidth: 0, url: '' }];
const shapes: any[] = [];
shapeTypes.forEach((subType) => {
  baseShapes.forEach((base) => { shapes.push(Object.assign({ subType }, base)); });
});
shapes.forEach((shape) => { shape.url = svgToURL(figureToSvg(shape)); });

const ShapesGridContainer = styled('div')`
  height: 220px;
`;

const ShapesGrid = ({ store }: { store: StoreType }) => {
  const rows = Math.ceil(shapes.length / 4) || 1;
  return React.createElement(
    ShapesGridContainer,
    { style: { height: 110 * rows + 'px' } },
    React.createElement(ImagesGrid, {
      shadowEnabled: false,
      rowsNumber: 4,
      images: shapes,
      getPreview: (item: any) => item.url,
      isLoading: false,
      itemHeight: 100,
      onSelect: async (item: any, pos: any, el: any) => {
        if (el && el.type === 'image' && (el as any).contentEditable) { el.set({ clipSrc: item.url }); return; }
        if (el && el.type === 'video' && (el as any).contentEditable) { el.set({ clipSrc: item.url }); return; }
        const ratio = (store.activePage.computedWidth + store.activePage.computedHeight) / 2160;
        const w = item.width * ratio;
        const h = item.height * ratio;
        const x = ((pos?.x) || store.activePage.computedWidth / 2) - w / 2;
        const y = ((pos?.y) || store.activePage.computedHeight / 2) - h / 2;
        store.activePage?.addElement(Object.assign(Object.assign({ type: 'figure' }, item), { x, y, width: w, height: h, fill: defaultShapeColor }));
      },
    })
  );
};

const LinesContainer = styled('div')`
  height: 220px;
`;

export const Shapes = ({ store }: { store: StoreType }) =>
  React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' } },
    React.createElement('p', null, s('sidePanel.lines')),
    React.createElement(LinesContainer, null, React.createElement(LinesGrid, { store })),
    React.createElement('p', null, s('sidePanel.shapes')),
    React.createElement(ShapesGrid, { store })
  );

export const ElementsPanel = ({ store }: { store: StoreType }) => {
  const timerRef = React.useRef<any>();
  const [inputValue, setInputValue] = React.useState('');
  const [query, setQuery] = React.useState(inputValue);

  React.useEffect(() => {
    timerRef.current = setTimeout(() => { setQuery(inputValue); }, 500);
    return () => { clearTimeout(timerRef.current); };
  }, [inputValue]);

  const hasQuery = !!query;

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
    React.createElement(InputGroup, {
      leftIcon: React.createElement(Search, null),
      placeholder: s('sidePanel.searchPlaceholder'),
      onChange: (e: any) => { setInputValue(e.target.value); },
      style: { marginBottom: '20px' },
      type: 'search',
    }),
    hasQuery && React.createElement(NounprojectPanel, { query, store }),
    !hasQuery && React.createElement(Shapes, { store })
  );
};
