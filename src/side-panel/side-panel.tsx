'use client';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Icon } from '@blueprintjs/core';
import { Video, Control, NewTextBox, Media, CloudUpload, LayoutGrid, Layers, Fullscreen, More } from '@blueprintjs/icons';
import styled from '../utils/styled';
import { useMobile, mobileStyle } from '../utils/screen';
import { flags } from '../utils/flags';
import FaShapes from '@meronex/icons/fa/FaShapes';
import FdPageMultiple from '@meronex/icons/fd/FdPageMultiple';
import { t as s } from '../utils/l10n';
import { SectionTab } from './tab-button';
import { StoreType } from '../model/store';

export { SectionTab } from './tab-button';
export { ImagesGrid } from './images-grid';

import { TextPanel } from './text-panel';
import { SizePanel } from './size-panel';
import { UploadPanel } from './upload-panel';
import { PhotosPanel } from './photos-panel';
import { BackgroundPanel } from './background-panel';
import { ElementsPanel } from './elements-panel';
import { PagesPanel } from './pages-panel';
import { TemplatesPanel } from './templates-panel';
import { LayersPanel } from './layers-panel';
import { VideosPanel } from './videos-panel';
import { ImageClipPanel } from './image-clip-panel';
import { AnimationsPanel } from './animations-panel';
import { EffectsPanel } from './effects-panel';
import { HistoryPanel } from './history-panel';

export const TemplatesSection = {
  name: 'templates',
  Tab: observer((props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.templates') }, props), React.createElement(Icon, { icon: React.createElement(Control, null) }))),
  Panel: ({ store }: any) => React.createElement(TemplatesPanel, { store }),
};
export const TextSection = {
  name: 'text',
  Tab: observer((props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.text') }, props), React.createElement(Icon, { icon: React.createElement(NewTextBox, null) }))),
  Panel: ({ store }: any) => React.createElement(TextPanel, { store }),
};
export const PhotosSection = {
  name: 'photos',
  Tab: observer((props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.photos') }, props), React.createElement(Icon, { icon: React.createElement(Media, null) }))),
  Panel: ({ store }: any) => React.createElement(PhotosPanel, { store }),
};
export const ElementsSection = {
  name: 'elements',
  Tab: observer((props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.elements'), iconSize: 16 }, props), React.createElement('span', { className: 'bp5-icon' }, React.createElement(FaShapes, null)))),
  Panel: ({ store }: any) => React.createElement(ElementsPanel, { store }),
};
export const UploadSection = {
  name: 'upload',
  Tab: observer((props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.upload') }, props), React.createElement(Icon, { icon: React.createElement(CloudUpload, null) }))),
  Panel: ({ store }: any) => React.createElement(UploadPanel, { store }),
};
export const BackgroundSection = {
  name: 'background',
  Tab: observer((props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.background') }, props), React.createElement(Icon, { icon: React.createElement(LayoutGrid, null) }))),
  Panel: ({ store }: any) => React.createElement(BackgroundPanel, { store }),
};
export const PagesSection = {
  name: 'pages',
  Tab: observer((props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.pages') }, props), React.createElement(FdPageMultiple, null))),
  Panel: ({ store }: any) => React.createElement(PagesPanel, { store }),
  visibleInList: false,
};
export const LayersSection = {
  name: 'layers',
  Tab: observer((props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.layers') }, props), React.createElement(Icon, { icon: React.createElement(Layers, null) }))),
  Panel: ({ store }: any) => React.createElement(LayersPanel, { store }),
};

const HistoryTabIcon = () =>
  React.createElement(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M2.5 8A5.5 5.5 0 1 0 4 4.4' }),
    React.createElement('polyline', { points: '2.5 2 2.5 5 5.5 5' }),
    React.createElement('polyline', { points: '8 5.5 8 8 10 10' }),
  );

export const HistorySection = {
  name: 'history',
  Tab: observer((props: any) =>
    React.createElement(
      SectionTab,
      Object.assign({ name: 'History', iconSize: 16 }, props),
      React.createElement('span', { className: 'bp5-icon' }, React.createElement(HistoryTabIcon)),
    )
  ),
  Panel: ({ store }: any) => React.createElement(HistoryPanel, { store }),
};
export const SizeSection = {
  name: 'size',
  Tab: observer((props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.resize') }, props), React.createElement(Icon, { icon: React.createElement(Fullscreen, null) }))),
  Panel: ({ store }: any) => React.createElement(SizePanel, { store }),
};

export const VideosSection = {
  name: 'videos',
  Tab: (props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.videos') }, props), React.createElement(Video, null)),
  Panel: VideosPanel,
};

observer((props: any) => React.createElement(SectionTab, Object.assign({ name: s('sidePanel.more') }, props), React.createElement(Icon, { icon: React.createElement(More, null) })));

export const DEFAULT_SECTIONS = [
  TemplatesSection,
  TextSection,
  PhotosSection,
  ElementsSection,
  UploadSection,
  BackgroundSection,
  LayersSection,
  HistorySection,
  SizeSection,
];

const ImageClipSection = { name: 'image-clip', Tab: () => null, Panel: ImageClipPanel };
const EffectsSection = { name: 'effects', Tab: () => null, Panel: EffectsPanel };
const AnimationSection = { name: 'animation', Tab: () => null, Panel: AnimationsPanel };

export const INTERNAL_SECTIONS = [ImageClipSection, EffectsSection];

const SidePanelContainer = styled('div')`
  display: flex;
  height: 100% !important;
  padding: 0px !important;
  position: relative;

  &.bp5-navbar {
    box-shadow: none;
  }

  ${mobileStyle(`
    height: auto !important;
    width: 100%;
    position: relative;
  `)}
`;

const TabsScrollContainer = styled('div', React.forwardRef)`
  @media screen and (min-width: 501px) {
    overflow-y: auto;
    overflow-x: hidden;
    min-width: 72px;
  }
  ${mobileStyle(`
    width: 100%;
    overflow: auto;
  `)}
`;

const TabsList = styled('div', React.forwardRef)`
  display: flex;
  flex-direction: column;

  ${mobileStyle(`
    flex-direction: row;
    min-width: min-content;
  `)}
`;

const PanelContainer = styled('div')`
  padding: 10px 10px 0px 10px !important;
  height: 100% !important;

  &.bp5-navbar {
    width: 350px;
  }

  &.bp5-navbar.collapsed {
    width: 0px;
  }

  ${mobileStyle(`
    &.bp5-navbar {
      position: absolute;
      bottom: 54px;
      z-index: 100;
      height: 50vh !important;
      width: 100%;
    }
  `)}
`;

const MobileOverlay = styled('div')`
  display: none;

  ${mobileStyle(`
    position: absolute;
    bottom: 72px;
    display: block;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.05);
  `)}
`;

const CollapseButton = styled('div')`
  position: absolute;
  right: -14px;
  top: 50%;
  height: 96px;
  width: 15px;
  fill: white;
  cursor: pointer;
  z-index: 10;

  .bp5-dark & {
    right: -13px;
  }

  & .stroke {
    stroke: rgba(0, 0, 0, 0.3);
    fill: none;
  }

  & .fill {
    fill: white;
  }

  .bp5-dark & .fill {
    fill: #2f343c;
  }

  & .pointer {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scaleY(2);
    font-size: 0.5rem;
    color: rgba(171, 179, 191, 0.6);
  }

  .bp5-dark & .pointer {
    color: rgba(171, 179, 191, 0.6);
  }

  &:hover .pointer {
    color: black;
  }

  .bp5-dark &:hover .pointer {
    color: white;
  }

  ${mobileStyle(`
    display: none;
  `)}
`;

const CollapseHandle = ({ onClick }: any) =>
  React.createElement(
    CollapseButton,
    { onClick },
    React.createElement(
      'svg',
      { width: '15', height: '96', viewBox: '0 0 16 96', xmlns: 'http://www.w3.org/2000/svg' },
      React.createElement('path', {
        className: 'fill stroke',
        d: 'M 1 7 C 2 9 4 10 7.2 13.28 C 7.45 13.4625 7.6 13.6 7.7 13.8048 L 7.8 13.8 C 9.8 15.8 11.6 17.6 12.9 19.7 C 14 21.6 14.7 23.9 14.9 27 H 15 V 68 C 15 71.7 14.3 74.3 13 76.6 C 11.7 78.8 9.9 80.5 7.8 82.6344 L 7.79 82.6 C 7.6 82.8 7.4507 83 7.2729 83.2127 C 3.9102 86.5228 2 87 1 90',
      })
    ),
    React.createElement('div', { className: 'pointer' }, '<')
  );

export const SidePanel = observer(({ store, sections, defaultSection = 'photos' }: { store: StoreType; sections?: any[]; defaultSection?: string }) => {
  // Open default section on first render
  (() => {
    const isFirst = React.useRef(true);
    if (isFirst.current) { isFirst.current = false; store.openSidePanel(defaultSection); }
  })();

  const isMobileView = useMobile();

  React.useLayoutEffect(() => {
    if (isMobileView) store.openSidePanel('');
    else store.openSidePanel(defaultSection);
  }, [isMobileView]);

  const allSections = [...(sections || DEFAULT_SECTIONS)];

  INTERNAL_SECTIONS.forEach((sec) => {
    if (!allSections.find((s) => s.name === sec.name)) allSections.push(sec);
  });

  if (flags.animationsEnabled) {
    if (!allSections.find((s) => s.name === 'videos')) {
      const idx = Math.floor(allSections.length / 2);
      allSections.splice(idx, 0, VideosSection);
    }
    if (!allSections.find((s) => s.name === 'animations')) {
      const idx = Math.floor(allSections.length / 2);
      allSections.splice(idx, 0, AnimationSection);
    }
  }

  const visibleTabs = allSections.filter((sec) => sec.visibleInList !== false);
  const ActivePanel = allSections.find((sec) => sec.name === store.openedSidePanel)?.Panel;
  const tabsRef = React.useRef<any>(null);

  return React.createElement(
    SidePanelContainer,
    { className: 'bp5-navbar raeditor-side-panel' + (store.openedSidePanel ? '' : ' collapsed') },
    React.createElement(
      TabsScrollContainer,
      { ref: tabsRef, className: 'raeditor-side-tabs-container' },
      React.createElement(
        TabsList,
        { className: 'raeditor-side-tabs-inner' },
        visibleTabs.map(({ name, Tab }: any) =>
          React.createElement(Tab, {
            key: name,
            active: name === store.openedSidePanel,
            onClick: () => {
              if (name === store.openedSidePanel && isMobileView) store.openSidePanel('');
              else store.openSidePanel(name);
            },
          })
        )
      )
    ),
    ActivePanel && React.createElement(
      PanelContainer,
      {
        className: 'bp5-navbar raeditor-panel-container',
        onClick: (e: any) => {
          const closePanel = e.target.closest('.raeditor-close-panel');
          const mobileEl = e.target.closest('.raeditor-mobile');
          if (closePanel && (isMobileView || mobileEl)) store.openSidePanel('');
        },
      },
      React.createElement(ActivePanel, { store })
    ),
    store.openedSidePanel && React.createElement(MobileOverlay, { onClick: () => store.openSidePanel('') }),
    store.openedSidePanel && React.createElement(CollapseHandle, { onClick: () => store.openSidePanel('') })
  );
});

export default SidePanel;
