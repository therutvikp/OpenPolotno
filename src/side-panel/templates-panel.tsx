'use client';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Switch, Alignment, InputGroup } from '@blueprintjs/core';
import { nanoid } from 'nanoid';
import { forEveryChild } from '../model/group-model';
import { Search } from '@blueprintjs/icons';
import { t as s } from '../utils/l10n';
import { ImagesGrid } from './images-grid';
import { templateList } from '../utils/api';
import { useInfiniteAPI } from '../utils/use-api';
import { StoreType } from '../model/store';

const useUpdateEffect = (fn: () => void, deps: any[]) => {
  const isFirstRun = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return; }
    fn();
  }, deps);
};

const TemplatesList = observer(({ sizeQuery, query, store }: { sizeQuery: string; query: string; store: StoreType }) => {
  const { setQuery, loadMore, hasMore, data, isLoading, reset, error } = useInfiniteAPI({
    getAPI: ({ page, query: q }: any) => templateList({ page, query: q, sizeQuery }),
    getSize: (d: any) => d.totalPages,
  });

  useUpdateEffect(() => { reset(); }, [sizeQuery]);
  useUpdateEffect(() => { setQuery(query); }, [query]);

  return React.createElement(ImagesGrid, {
    images: data?.map((d: any) => d.items).flat(),
    getPreview: (item: any) => item.preview,
    isLoading,
    onSelect: async (item: any) => {
      const res = await fetch(item.json);
      const json = await res.json();
      if (store.pages.length <= 1) {
        store.loadJSON(json, true);
      } else {
        const current = JSON.parse(JSON.stringify(store.toJSON()));
        if (current.width !== json.width || current.height !== json.height) {
          json.pages.forEach((p: any) => {
            p.width = p.width || json.width;
            p.height = p.height || json.height;
          });
        }
        forEveryChild({ children: json.pages }, (el: any) => { el.id = nanoid(10); });
        const idx = store.pages.indexOf(store.activePage);
        current.pages.splice(idx, 1, ...json.pages);
        store.loadJSON(current, true);
      }
    },
    loadMore: hasMore && loadMore,
    error,
  });
});

export const TemplatesPanel = observer(({ store }: { store: StoreType }) => {
  const [sameSize, setSameSize] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const sizeQuery = sameSize ? `${store.width}x${store.height}` : 'all';

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
    React.createElement(InputGroup, {
      leftIcon: React.createElement(Search, null),
      placeholder: s('sidePanel.searchPlaceholder'),
      type: 'search',
      onChange: (e: any) => { setQuery(e.target.value); },
      style: { marginBottom: '20px' },
    }),
    React.createElement(
      Switch,
      {
        checked: sameSize,
        onChange: (e: any) => { setSameSize(e.target.checked); },
        alignIndicator: Alignment.RIGHT,
        style: { marginTop: '8px', marginBottom: '25px' },
      },
      s('sidePanel.searchTemplatesWithSameSize'), ' '
    ),
    React.createElement(TemplatesList, { store, sizeQuery: 'size=' + sizeQuery, query })
  );
});
