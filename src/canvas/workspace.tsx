'use client';

import React from 'react';
import { WorkspaceCanvas, WorkspaceProps } from './workspace-canvas';
import { PageControls } from './page-controls';
import { Tooltip } from './tooltip';
import { ContextMenu } from './context-menu/context-menu';

export const Workspace = ({ components, ...restProps }: WorkspaceProps) => {
  const resolvedComponents = components || {};
  resolvedComponents.PageControls = resolvedComponents.PageControls ?? PageControls;
  resolvedComponents.Tooltip = resolvedComponents.Tooltip ?? Tooltip;
  resolvedComponents.ContextMenu = resolvedComponents.ContextMenu ?? ContextMenu;
  return React.createElement(WorkspaceCanvas, { ...restProps, components: resolvedComponents });
};

export default Workspace;
