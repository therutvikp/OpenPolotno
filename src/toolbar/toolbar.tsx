'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Navbar, Alignment, Divider } from '@blueprintjs/core';
import styled from '../utils/styled';
import { mobileStyle } from '../utils/screen';
import { HistoryButtons } from './history-buttons';
import { TextToolbar } from './text-toolbar';
import { HtmlToolbar } from './html-toolbar';
import { ImageToolbar } from './image-toolbar';
import { SvgToolbar } from './svg-toolbar';
import { LineToolbar } from './line-toolbar';
import { VideoToolbar } from './video-toolbar';
import { FigureToolbar } from './figure-toolbar';
import { GifToolbar } from './gif-toolbar';
import { ManyToolbar } from './many-toolbar';
import { PageToolbar } from './page-toolbar';
import { DownloadButton } from './download-button';
import { DuplicateButton } from './duplicate-button';
import { RemoveButton } from './remove-button';
import { LockButton } from './lock-button';
import { PositionPicker } from './position-picker';
import { OpacityPicker } from './opacity-picker';
import { AdminButton } from './admin-button';
import { GroupButton } from './group-button';
import { flags } from '../utils/flags';
import { CopyStyleButton } from './copy-style';
import { RulerToggleButton } from './ruler-toggle-button';
import { AdvancedSelectButton } from './advanced-select-button';
import { ShortcutsButton } from './shortcuts-panel';
import { PresentationButton } from './presentation-button';

const toolbarRegistry: Record<string, any> = {
  text: TextToolbar,
  image: ImageToolbar,
  svg: SvgToolbar,
  many: ManyToolbar,
  line: LineToolbar,
  video: VideoToolbar,
  figure: FigureToolbar,
  gif: GifToolbar,
  page: PageToolbar,
};

export function registerToolbarComponent(type: string, component: any) {
  toolbarRegistry[type] = component;
}

export function useToolbarCondensed(threshold = 480) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = React.useState(false);
  const check = React.useCallback(() => {
    const el = containerRef.current;
    if (el) setCondensed(el.clientWidth < threshold);
  }, [threshold]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => check());
    ro.observe(el);
    const mo = new MutationObserver(() => check());
    mo.observe(el, { childList: true, subtree: true, attributes: true });
    window.addEventListener('resize', check);
    requestAnimationFrame(check);
    return () => { ro.disconnect(); mo.disconnect(); window.removeEventListener('resize', check); };
  }, [check]);

  return { containerRef, condensed };
}

const ToolbarContainer = styled('div', React.forwardRef)`
  white-space: nowrap;

  & .bp5-button:has(.bp5-button-text) {
    min-width: max-content;
  }

  &.condensed .raeditor-position .bp5-button-text {
    display: none;
  }

  &.condensed .raeditor-download-button .bp5-button-text {
    display: none;
  }

  ${mobileStyle(`
    max-width: 100vw;
    overflow-x: auto;
    overflow-y: hidden;
  `)}
`;

const ToolbarInner = styled('div')`
  width: 100%;
  height: 100%;
  ${mobileStyle(`
    display: flex;
  `)}
`;

export const Toolbar = observer(({ store, downloadButtonEnabled, components: componentsProp = {} }: any) => {
  const allSameType = new Set(store.selectedElements.map((el: any) => el.type)).size === 1;
  const isSingle = store.selectedElements.length === 1;
  const first = store.selectedElements[0];
  const allStyleEditable = store.selectedElements.every((el: any) => el.styleEditable);

  let ActiveToolbar: any = allStyleEditable && isSingle && toolbarRegistry[first?.type];
  if (allSameType) ActiveToolbar = toolbarRegistry[first?.type];
  if (store.selectedElements.length > 1) ActiveToolbar = toolbarRegistry.many;
  if (store.selectedElements.length === 0 && store._selectedPagesIds.length === 1) ActiveToolbar = toolbarRegistry.page;
  if (isSingle && first?.type === 'text' && flags.htmlRenderEnabled) ActiveToolbar = HtmlToolbar;

  const isCropMode = isSingle && first?._cropModeEnabled;

  // Stable components ref to avoid unnecessary re-renders
  const componentsRef = React.useRef(componentsProp);
  if (
    Object.keys(componentsProp).some((k) => componentsProp[k] !== componentsRef.current[k]) ||
    Object.keys(componentsRef.current).some((k) => !(k in componentsProp))
  ) {
    componentsRef.current = { ...componentsProp };
  }
  const components = componentsRef.current;

  const { containerRef, condensed } = useToolbarCondensed(480);

  const ActionControls = components?.ActionControls || (downloadButtonEnabled ? DownloadButton : null);
  const Position_ = components?.Position || PositionPicker;
  const Opacity = components?.Opacity || OpacityPicker;
  const Lock = components?.Lock || LockButton;
  const Duplicate = components?.Duplicate || DuplicateButton;
  const Remove = components?.Remove || RemoveButton;
  const Group = components?.Group || GroupButton;
  const History = components?.History || HistoryButtons;
  const Admin = components?.Admin || AdminButton;
  const CopyStyle = components?.CopyStyle || CopyStyleButton;

  return React.createElement(
    ToolbarContainer,
    { ref: containerRef, className: `bp5-navbar raeditor-toolbar${condensed ? ' condensed' : ''}` },
    React.createElement(
      ToolbarInner,
      null,
      !isCropMode && React.createElement(History, { store }),
      ActiveToolbar && allStyleEditable && React.createElement(ActiveToolbar, { store, components }),
      !isCropMode && React.createElement(
        Navbar.Group,
        { align: Alignment.RIGHT },
        store.role === 'admin' && React.createElement(Admin, { store }),
        React.createElement(PresentationButton, { store }),
        React.createElement(ShortcutsButton, { store }),
        React.createElement(RulerToggleButton, { store }),
        React.createElement(AdvancedSelectButton, { store }),
        React.createElement(Group, { store }),
        React.createElement(Position_, { store }),
        allStyleEditable && React.createElement(Opacity, { store }),
        React.createElement(Lock, { store }),
        React.createElement(Duplicate, { store }),
        React.createElement(Remove, { store }),
        React.createElement(CopyStyle, { store }),
        ActionControls && React.createElement(
          React.Fragment,
          null,
          React.createElement(Divider, { style: { height: '100%', margin: '0 15px' } }),
          React.createElement(ActionControls, { store }),
        ),
      ),
    ),
  );
});

export default Toolbar;
