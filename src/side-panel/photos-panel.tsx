'use client';
import React from 'react';
import { InputGroup } from '@blueprintjs/core';
import { Search } from '@blueprintjs/icons';
import { ImagesGrid } from './images-grid';
import { useInfiniteAPI } from '../utils/use-api';
import { t as s } from '../utils/l10n';
import { unsplashList, unsplashDownload } from '../utils/api';
import { selectImage } from './select-image';
import { StoreType } from '../model/store';

export const PhotosPanel = ({ store }: { store: StoreType }) => {
  const { setQuery, loadMore, isReachingEnd, data, isLoading, error } = useInfiniteAPI({
    defaultQuery: '',
    getAPI: ({ page, query }: any) => unsplashList({ page, query }),
  });

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
    React.createElement(InputGroup, {
      leftIcon: React.createElement(Search, null),
      placeholder: s('sidePanel.searchPlaceholder'),
      onChange: (e: any) => { setQuery(e.target.value); },
      type: 'search',
      style: { marginBottom: '20px' },
    }),
    React.createElement(
      'p',
      { style: { textAlign: 'center' } },
      'Photos by ',
      React.createElement('a', { href: 'https://unsplash.com/', target: '_blank' }, 'Unsplash')
    ),
    React.createElement(ImagesGrid, {
      images: data?.map((d: any) => d.results).flat().filter(Boolean),
      getPreview: (item: any) => item.urls.small,
      onSelect: async (item: any, pos: any, el: any) => {
        fetch(unsplashDownload(item.id));
        selectImage({ src: item.urls.regular, store, droppedPos: pos, targetElement: el });
      },
      isLoading,
      error,
      loadMore: !isReachingEnd && loadMore,
      getCredit: (item: any) =>
        React.createElement(
          'span',
          null,
          'Photo by ',
          React.createElement(
            'a',
            { href: `https://unsplash.com/@${item.user.username}?utm_source=raeditor&utm_medium=referral`, target: '_blank' },
            item.user.name
          ),
          ' on ',
          React.createElement('a', { href: 'https://unsplash.com/?utm_source=raeditor&utm_medium=referral', target: '_blank' }, 'Unsplash')
        ),
    })
  );
};
