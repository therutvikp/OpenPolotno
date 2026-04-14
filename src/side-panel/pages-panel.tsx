'use client';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { ImagesGrid } from './images-grid';
import { StoreType } from '../model/store';

export const PagesPanel = observer(({ store }: { store: StoreType }) => {
  const [previews, setPreviews] = React.useState<Record<string, any>>({});

  const updatePreviews = () => {
    const map: Record<string, any> = {};
    store.pages.forEach((page: any) => {
      const url = store.toDataURL({ pageId: page.id, pixelRatio: 0.2 });
      map[page.id] = url;
    });
    setPreviews(map);
  };

  React.useEffect(() => {
    const interval = setInterval(updatePreviews, 1000);
    return () => clearInterval(interval);
  }, []);

  return React.createElement(
    'div',
    { style: { height: '100%' } },
    React.createElement(ImagesGrid, {
      images: store.pages.slice(),
      getPreview: (page: any) => previews[page.id] || store.pages.indexOf(page),
      onSelect: async (page: any) => { store.selectPage(page.id); },
      isLoading: false,
      rowsNumber: 2,
    })
  );
});
