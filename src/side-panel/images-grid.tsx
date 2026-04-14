'use client';
import React from 'react';
import styled from '../utils/styled';
import { Spinner } from '@blueprintjs/core';
import { t as s } from '../utils/l10n';
import { registerNextDomDrop } from '../canvas/page';
import { mobileStyle } from '../utils/screen';
import { ShapeType } from '../model/shape-model';

const ScrollContainer = styled('div', React.forwardRef)`
  height: 100%;
  overflow: auto;
`;

const Column = styled('div')`
  width: 33%;
  float: left;
`;

const ImageWrapper = styled('div')`
  padding: 5px;
  width: 100%;
  &:hover .credit {
    opacity: 1;
  }
  ${mobileStyle(`
    .credit {
      opacity: 1;
    }
  `)}
`;

const ImageFrame = styled('div')`
  border-radius: 5px;
  position: relative;
  overflow: hidden;
  box-shadow: ${(p: any) => p['data-shadowenabled'] ? '0 0 5px rgba(16, 22, 26, 0.3)' : ''};
`;

const StyledImg = styled('img')`
  width: 100%;
  cursor: pointer;
  display: block;
  max-height: 300px;
  min-height: 50px;
  object-fit: contain;
`;

const CreditOverlay = styled('div')`
  position: absolute;
  bottom: 0px;
  left: 0px;
  font-size: 10px;
  padding: 3px;
  padding-top: 10px;
  text-align: center;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0),
    rgba(0, 0, 0, 0.4),
    rgba(0, 0, 0, 0.6)
  );
  width: 100%;
  opacity: 0;
  color: white;
`;

const NoResults = styled('p')`
  text-align: center;
  padding: 30px;
`;

const ImageItem = ({ url, credit, onSelect, crossOrigin, shadowEnabled, itemHeight, className, onLoad }: any) => {
  const shadowOn = shadowEnabled == null || shadowEnabled;
  return React.createElement(
    ImageWrapper,
    { onClick: () => onSelect(), className: 'raeditor-close-panel' },
    React.createElement(
      ImageFrame,
      { 'data-shadowenabled': shadowOn },
      React.createElement(StyledImg, {
        className,
        style: { height: itemHeight != null ? itemHeight : 'auto' },
        src: url,
        draggable: true,
        loading: 'lazy',
        crossOrigin,
        onDragStart: () => {
          registerNextDomDrop(({ x, y }: any, el: any, ev: any) => { onSelect({ x, y }, el, ev); });
        },
        onDragEnd: () => { registerNextDomDrop(null); },
        onLoad,
      }),
      credit && React.createElement(CreditOverlay, { className: 'credit' }, credit)
    )
  );
};

type Props<ImageType> = {
  images: ImageType[] | undefined;
  onSelect: (image: ImageType, pos?: { x: number; y: number }, element?: ShapeType | undefined, event?: any) => void;
  isLoading: boolean;
  getPreview: (image: ImageType) => string;
  loadMore?: false | undefined | null | (() => void);
  getCredit?: (image: ImageType) => any;
  getImageClassName?: (image: ImageType) => string;
  rowsNumber?: number;
  crossOrigin?: string;
  shadowEnabled?: boolean;
  itemHeight?: number;
  error?: any;
  hideNoResults?: boolean;
};

export const ImagesGrid = <ImageType,>({
  images,
  onSelect,
  isLoading,
  getPreview,
  loadMore,
  getCredit,
  getImageClassName,
  rowsNumber,
  crossOrigin = 'anonymous',
  shadowEnabled,
  itemHeight,
  error,
  hideNoResults = false,
}: Props<ImageType>) => {
  const cols = rowsNumber || 2;
  const containerRef = React.useRef<any>(null);
  const timerRef = React.useRef<any>(null);

  const columns: ImageType[][] = [];
  for (let i = 0; i < cols; i++) {
    columns.push((images || []).filter((_, idx) => idx % cols === i));
  }

  const tryLoadMore = () => {
    const el = containerRef.current;
    const scrollable = el?.scrollHeight > el?.offsetHeight + 5;
    const hasItems = images && images.length;
    const allLoaded = Array.from(el?.querySelectorAll('img') || []).every((img: any) => img.complete);
    if (!scrollable && loadMore && !isLoading && hasItems && allLoaded) {
      if (!timerRef.current) {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          loadMore && (loadMore as any)();
        }, 100);
      }
    }
  };

  React.useEffect(() => {
    tryLoadMore();
    return () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [images && images.length, isLoading]);

  return React.createElement(
    ScrollContainer,
    {
      onScroll: (e: any) => {
        const remaining = e.target.scrollHeight - e.target.scrollTop - e.target.offsetHeight;
        if (loadMore && !isLoading && remaining < 200) (loadMore as any)();
      },
      ref: containerRef,
    },
    columns.map((col, colIdx) =>
      React.createElement(
        Column,
        { key: colIdx, style: { width: 100 / cols + '%' } },
        col.map((item, itemIdx) =>
          React.createElement(ImageItem, {
            url: getPreview(item),
            onSelect: (pos: any, el: any, ev: any) => onSelect(item, pos, el, ev),
            key: itemIdx,
            credit: getCredit && getCredit(item),
            crossOrigin,
            shadowEnabled,
            itemHeight,
            className: getImageClassName && getImageClassName(item),
            onLoad: tryLoadMore,
          })
        ),
        isLoading && React.createElement('div', { style: { padding: '30px' } }, React.createElement(Spinner, null))
      )
    ),
    !isLoading && (!images || !images.length) && !error && !hideNoResults &&
      React.createElement(NoResults, null, s('sidePanel.noResults')),
    error && React.createElement(NoResults, null, s('sidePanel.error'))
  );
};
