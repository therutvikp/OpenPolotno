'use client';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { observable } from 'mobx';
import { InputGroup } from '@blueprintjs/core';
import { Search } from '@blueprintjs/icons';
import IosColorPalette from '@meronex/icons/ios/IosColorPalette';
import { ColorPicker } from '../toolbar/color-picker';
import { ImagesGrid } from './images-grid';
import styled from '../utils/styled';
import { t as s } from '../utils/l10n';
import { useInfiniteAPI } from '../utils/use-api';
import { unsplashList, unsplashDownload } from '../utils/api';
import { StoreType } from '../model/store';

let defaultQuery = 'gradient';
export const setDefaultQuery = (query: string) => { defaultQuery = query; };

const colorPresets = observable([
  'white',
  'rgb(82, 113, 255)',
  'rgb(255, 145, 77)',
  'rgb(126, 217, 87)',
  'rgb(255, 222, 89)',
  'rgb(203, 108, 230)',
  'rgb(0, 0, 0, 0)',
]);
export const setBackgroundColorsPreset = (newColors: string[]) => { colorPresets.replace(newColors); };

const ColorSwatch = styled('div')`
  display: inline-block;
  width: 30px;
  height: 30px;
  border-radius: 2px;
  box-shadow: 0 0 2px rgba(16, 22, 26, 0.3);
  cursor: pointer;
`;

const TransparentSwatch = ({ children, color, ...rest }: any) =>
  React.createElement(
    ColorSwatch,
    {
      ...rest,
      style: {
        ...rest.style,
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 8 8'%3E%3Cg fill='rgba(112, 112, 116, 1)' fill-opacity='1'%3E%3Cpath fill-rule='evenodd' d='M0 0h4v4H0V0zm4 4h4v4H4V4z'/%3E%3C/g%3E%3C/svg%3E")`,
      },
    },
    React.createElement('div', { style: { width: '100%', height: '100%', background: color } }, children)
  );

export const BackgroundPanel = observer(({ store }: { store: StoreType }) => {
  const { setQuery, loadMore, isReachingEnd, data, isLoading, error } = useInfiniteAPI({
    defaultQuery,
    getAPI: ({ page, query }: any) => unsplashList({ page, query }),
  });

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-around', paddingBottom: '10px' } },
      React.createElement(
        ColorPicker,
        {
          value: store.activePage?.background || 'white',
          onChange: (color: string) => { store.activePage?.set({ background: color }); },
          store,
          position: 'bottom-left',
          gradientEnabled: true,
        },
        React.createElement(TransparentSwatch, { color: store.activePage?.background, style: { fontSize: '30px' } },
          React.createElement(IosColorPalette, { style: { mixBlendMode: 'difference' } })
        )
      ),
      colorPresets.map((color: string) =>
        React.createElement(TransparentSwatch, {
          key: color,
          color,
          onClick: () => { store.activePage?.set({ background: color }); },
        })
      )
    ),
    React.createElement(InputGroup, {
      leftIcon: React.createElement(Search, null),
      placeholder: s('sidePanel.searchPlaceholder'),
      onChange: (e: any) => { setQuery(e.target.value || defaultQuery); },
      type: 'search',
      style: { marginBottom: '20px' },
    }),
    React.createElement('p', { style: { textAlign: 'center' } },
      'Photos by ', React.createElement('a', { href: 'https://unsplash.com/', target: '_blank' }, 'Unsplash')
    ),
    React.createElement(ImagesGrid, {
      images: data?.map((d: any) => d.results).flat().filter(Boolean),
      isLoading,
      getPreview: (item: any) => item.urls.small,
      loadMore: !isReachingEnd && loadMore,
      onSelect: async (item: any) => {
        fetch(unsplashDownload(item.id));
        store.activePage?.set({ background: item.urls.regular });
      },
      error,
      getCredit: (item: any) =>
        React.createElement('span', null,
          'Photo by ',
          React.createElement('a', { href: `https://unsplash.com/@${item.user.username}?utm_source=raeditor&utm_medium=referral`, target: '_blank' }, item.user.name),
          ' on ',
          React.createElement('a', { href: 'https://unsplash.com/?utm_source=raeditor&utm_medium=referral', target: '_blank' }, 'Unsplash')
        ),
    })
  );
});
