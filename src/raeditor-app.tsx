'use client';
import React from 'react';
import ReactDOM from 'react-dom/client';
import Workspace from './canvas/workspace';
import Toolbar from './toolbar/toolbar';
import SidePanel, { DEFAULT_SECTIONS } from './side-panel/side-panel';
import ZoomButtons from './toolbar/zoom-buttons';
import { DownloadButton } from './toolbar/download-button';
import styled from './utils/styled';
import { mobileStyle } from './utils/screen';
import { createStore } from './model/store';
import { StoreType } from './model/store';
import { OnboardingTour } from './onboarding-tour';

export const RaeditorContainer = styled('div')`
  display: flex;
  height: 100%;
  width: 100%;
  max-height: 100vh;
  overflow: hidden;
  font-family: var(--font-inter, 'Inter', system-ui, -apple-system, sans-serif);

  ${mobileStyle(`
    flex-direction: column-reverse;
  `)}
`;

export const SidePanelWrap = styled('div')`
  height: 100%;
  width: auto;
  max-height: 100vh;

  ${mobileStyle(`
    height: auto;
    width: 100vw;
  `)}
`;

export const WorkspaceWrap = styled('div')`
  display: flex;
  height: 100%;
  width: 100%;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

export const RaeditorApp = ({ store, style, sections }: { store: StoreType; style?: any; sections?: Array<string> }) => {
  let resolvedSections: any[] = DEFAULT_SECTIONS;
  if (sections) {
    resolvedSections = sections.map((name) => {
      const found = DEFAULT_SECTIONS.find((s: any) => s.name === name);
      if (!found) console.error(`Section ${name} not found`);
      return found;
    }).filter(Boolean) as any[];
  }

  return React.createElement(
    RaeditorContainer,
    { className: 'raeditor-app-container', style },
    React.createElement(SidePanelWrap, { 'data-tour': 'side-panel' } as any,
      React.createElement(SidePanel, { store, sections: resolvedSections })
    ),
    React.createElement(WorkspaceWrap, { 'data-tour': 'canvas' } as any,
      React.createElement(Toolbar, { store, components: { ActionControls: () => React.createElement(DownloadButton, { store }) } }),
      React.createElement(Workspace, { store }),
      React.createElement(ZoomButtons, { store })
    ),
    React.createElement(OnboardingTour, null)
  );
};

export function createRaeditorApp({ container, key, showCredit, sections }: { container: any; key: any; showCredit: any; sections: any }) {
  const store = createStore({ key, showCredit });
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(RaeditorApp, { store, sections }));
  store.addPage();
  store.history.clear();
  return { store, root, destroy: () => root.unmount() };
}

export const createDemoApp = createRaeditorApp;
