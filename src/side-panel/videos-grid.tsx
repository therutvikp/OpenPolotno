'use client';
import React, { useCallback, useRef } from 'react';
import styled from '../utils/styled';
import { Spinner } from '@blueprintjs/core';
import { registerNextDomDrop } from '../canvas/page';

const ScrollContainer = styled('div', React.forwardRef)`
  height: 100%;
  overflow: auto;
`;

const Column = styled('div')`
  width: 50%;
  float: left;
`;

const VideoWrapper = styled('div')`
  padding: 5px;
  width: 100%;
  &:hover .video-grid__item-credit {
    opacity: 1;
  }
`;

const VideoFrame = styled('div')`
  position: relative;
`;

const StyledVideo = styled('video', React.forwardRef)`
  width: 100%;
  cursor: pointer;
  display: block;
  max-height: 300px;
  min-height: 50px;
  object-fit: cover;
  border-radius: 5px;
  box-shadow: 0 0 5px rgba(16, 22, 26, 0.3);
`;

const DurationBadge = styled('div')`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 2px 7px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4rem;
`;

const DurationText = styled('span')`
  font-size: 12px;
`;

const LoadMoreContainer = styled('div', React.forwardRef)`
  padding: 3rem;
`;

const CreditOverlay = styled('div')`
  position: absolute;
  opacity: 0;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 3px;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0),
    rgba(0, 0, 0, 0.4),
    rgba(0, 0, 0, 0.6)
  );
  color: white;
  font-size: 10px;
  text-align: center;
`;

const VideoItem = ({ item, onClick, onDragEnd, onDragStart, getCredit }: any) => {
  const videoRef = useRef<any>(null);
  const videoFile = item.video_files.find((f: any) => f.quality === 'sd');
  const videoUrl = videoFile?.link || '';
  if (!videoUrl) return null;

  const isoTime = new Date(item.duration * 1000).toISOString();
  const duration = item.duration > 3600 ? isoTime.substring(11, 19) : isoTime.substring(14, 19);

  return React.createElement(
    VideoWrapper,
    null,
    React.createElement(
      VideoFrame,
      { draggable: true, onClick, onDragEnd, onDragStart,
        onMouseEnter: () => { videoRef.current?.play()?.catch(() => {}); },
        onMouseLeave: () => { videoRef.current?.pause()?.catch(() => {}); if (videoRef.current) videoRef.current.currentTime = 0; },
      },
      React.createElement(
        StyledVideo,
        { poster: item.video_pictures[0].picture, controls: false, ref: videoRef, muted: true, preload: 'none', playsInline: true },
        React.createElement('source', { src: videoUrl })
      ),
      React.createElement(DurationBadge, null, React.createElement(DurationText, null, duration)),
      getCredit && React.createElement(CreditOverlay, { className: 'video-grid__item-credit' }, getCredit(item))
    )
  );
};

export const VideosGrid = ({ items, onSelect, loadMore, isLoading, error, getCredit }: {
  items: any;
  onSelect: any;
  loadMore: any;
  isLoading: any;
  error: any;
  getCredit: any;
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((el: any) => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    if (el) observerRef.current.observe(el);
  }, [isLoading]);

  if (error) return React.createElement('div', null, error.message);
  if (!items || items.length === 0) return null;

  const odd = items.filter((_: any, i: number) => i % 2 === 1);
  const even = items.filter((_: any, i: number) => i % 2 === 0);

  return React.createElement(
    ScrollContainer,
    null,
    [odd, even].map((col: any[], colIdx: number) =>
      React.createElement(
        Column,
        { key: colIdx },
        col.map((item: any) =>
          React.createElement(VideoItem, {
            key: item.id,
            item,
            onClick: () => onSelect(item),
            onDragStart: (e: any) => {
              registerNextDomDrop((pos: any, el: any) => { onSelect(item, pos, el); });
            },
            onDragEnd: () => registerNextDomDrop(null),
            getCredit,
          })
        ),
        React.createElement(LoadMoreContainer, { ref: loadMoreRef }, isLoading && React.createElement(Spinner, null))
      )
    )
  );
};
