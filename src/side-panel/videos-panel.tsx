'use client';
import React from 'react';
import { InputGroup } from '@blueprintjs/core';
import { useInfiniteAPI } from '../utils/use-api';
import { t as s } from '../utils/l10n';
import { selectVideo } from './select-video';
import { getKey } from '../utils/validate-key';
import { observer } from 'mobx-react-lite';
import { VideosGrid } from './videos-grid';
import { Search } from '@blueprintjs/icons';
import { StoreType } from '../model/store';

const getPexelsVideosAPI = ({ query, page }: any) =>
  `https://api.polotno.com/api/pexels/videos/${query ? 'search' : 'popular'}?query=${query}&per_page=20&page=${page}&KEY=${getKey()}`;

export const VideosPanel = observer(({ store }: { store: StoreType }) => {
  const { setQuery, loadMore, isReachingEnd, data, isLoading, error } = useInfiniteAPI({
    defaultQuery: '',
    getAPI: ({ page, query }: any) => getPexelsVideosAPI({ page, query }),
    getSize: (d: any) => d.total_results / d.per_page,
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
    React.createElement('p', { style: { textAlign: 'center' } },
      'Videos by ', React.createElement('a', { href: 'https://www.pexels.com/', target: '_blank' }, 'Pexels')
    ),
    React.createElement(VideosGrid, {
      items: data?.map((d: any) => d.videos).flat().filter(Boolean),
      onSelect: async (item: any, pos: any, el: any) => {
        const hdFile = item.video_files.find((f: any) => f.quality === 'hd');
        const src = hdFile?.link || item.video_files[0].link;
        selectVideo({ src, store, droppedPos: pos, targetElement: el, attrs: { width: item.width, height: item.height } });
      },
      isLoading,
      error,
      loadMore: !isReachingEnd && loadMore,
      getCredit: (item: any) =>
        React.createElement('span', null,
          'Video by ',
          React.createElement('a', { href: item.user.url, target: '_blank', rel: 'noreferrer' }, item.user.name),
          ' on ',
          React.createElement('a', { href: 'https://pexels.com/?utm_source=raeditor&utm_medium=referral', target: '_blank', rel: 'noreferrer noopener' }, 'Pexels')
        ),
    })
  );
});
