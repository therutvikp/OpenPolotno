'use client';
import React from 'react';
import { Button } from '@blueprintjs/core';
import { Cross } from '@blueprintjs/icons';
import { observer } from 'mobx-react-lite';
import { ImagesGrid } from './images-grid';
import { svgToURL } from '../utils/svg';
import { figureToSvg, TYPES } from '../utils/figure-to-svg';
import styled from '../utils/styled';
import { t as s } from '../utils/l10n';
import { StoreType } from '../model/store';

const shapeTypes = Object.keys(TYPES);
const baseShapes = [{ width: 300, height: 300, fill: 'lightgray', stroke: '#0c0c0c', strokeWidth: 0, url: '' }];
const shapes: any[] = [];
shapeTypes.forEach((subType) => {
  baseShapes.forEach((base) => { shapes.push(Object.assign({ subType }, base)); });
});
shapes.forEach((shape) => { shape.url = svgToURL(figureToSvg(shape)); });

const ShapesContainer = styled('div')`
  height: 220px;
`;

export const ImageClipPanel = observer(({ store }: { store: StoreType }) => {
  const rows = Math.ceil(shapes.length / 4) || 1;
  const getIds = () => store.selectedElements.map((e: any) => e.id).join(',');
  const initialIds = React.useMemo(getIds, []);
  const currentIds = getIds();

  React.useEffect(() => {
    if (initialIds !== currentIds) store.openSidePanel(store.previousOpenedSidePanel);
  }, [initialIds, currentIds]);

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' } },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between' } },
      React.createElement('h3', { style: { margin: 0, lineHeight: '30px' } }, s('sidePanel.clipImage')),
      React.createElement(Button, {
        minimal: true,
        icon: React.createElement(Cross, null),
        onClick: () => store.openSidePanel(store.previousOpenedSidePanel),
      })
    ),
    React.createElement(
      ShapesContainer,
      { style: { height: 110 * rows + 'px' } },
      React.createElement(ImagesGrid, {
        shadowEnabled: false,
        rowsNumber: 4,
        images: shapes,
        getPreview: (item: any) => item.url,
        isLoading: false,
        itemHeight: 100,
        onSelect: async (item: any, _pos: any, el: any) => {
          const targets = el ? [el] : store.selectedElements;
          targets.forEach((t: any) => {
            if ((t.type === 'image' || t.type === 'video') && t.contentEditable) {
              t.set({ clipSrc: item.url });
            }
          });
        },
      })
    )
  );
});
