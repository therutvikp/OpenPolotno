'use client';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, ButtonGroup, Slider, NumericInput } from '@blueprintjs/core';
import { Edit, Highlight, Select } from '@blueprintjs/icons';
import styled from '../utils/styled';
import ColorPicker from '../toolbar/color-picker';
import { StoreType } from '../model/store';

const PanelContainer = styled('div')`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
`;

const Section = styled('div')`
  margin-bottom: 30px;
`;

const SectionTitle = styled('h3')`
  margin-bottom: 15px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--bp5-text-color-muted);
`;

const ActiveButton = styled(Button)`
  flex: 1;
  ${(p: any) => p.active && `
    background-color: var(--bp5-intent-primary) !important;
    color: white !important;
  `}
`;

const Row = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
`;

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const DrawPanel = observer(({ store }: { store: StoreType }) => {
  const { brushType, strokeWidth, strokeColor, opacity } = (store as any).drawingOptions;
  const isSelection = store.editorMode === 'selection';

  const setTool = (tool: string) => {
    if (tool === 'selection') {
      store.setEditorMode('selection');
    } else {
      store.setEditorMode('draw');
      (store as any).updateDrawingOptions({ brushType: tool, opacity: tool === 'highlighter' ? 0.5 : 1 });
    }
  };

  const setStrokeWidth = (w: number) => { (store as any).updateDrawingOptions({ strokeWidth: w }); };
  const setOpacity = (v: number) => { (store as any).updateDrawingOptions({ opacity: v }); };

  return React.createElement(
    PanelContainer,
    null,
    React.createElement(
      Section,
      null,
      React.createElement(SectionTitle, null, 'Tool'),
      React.createElement(
        ButtonGroup,
        { fill: true },
        React.createElement(ActiveButton, { active: isSelection, onClick: () => setTool('selection'), icon: React.createElement(Select, null) }, 'Selection'),
        React.createElement(ActiveButton, { active: !isSelection && brushType === 'brush', onClick: () => setTool('brush'), icon: React.createElement(Edit, null) }, 'Brush'),
        React.createElement(ActiveButton, { active: !isSelection && brushType === 'highlighter', onClick: () => setTool('highlighter'), icon: React.createElement(Highlight, null) }, 'Highlighter')
      )
    ),
    React.createElement(
      Section,
      { style: { opacity: isSelection ? 0.5 : 1 } },
      React.createElement(
        Row,
        null,
        React.createElement('div', null, 'Stroke Width'),
        React.createElement(NumericInput, {
          value: strokeWidth,
          onValueChange: (v: number) => { if (!Number.isNaN(v)) setStrokeWidth(clamp(v, 1, 50)); },
          style: { width: '60px' },
          min: 1,
          max: 50,
          buttonPosition: 'none',
          disabled: isSelection,
        })
      ),
      React.createElement(Slider, { min: 1, max: 50, stepSize: 1, value: strokeWidth, onChange: setStrokeWidth, labelRenderer: false, showTrackFill: false, disabled: isSelection })
    ),
    React.createElement(
      Section,
      { style: { opacity: isSelection ? 0.5 : 1, pointerEvents: isSelection ? 'none' : 'auto' } },
      React.createElement(
        Row,
        null,
        React.createElement('div', { style: { lineHeight: '30px' } }, 'Color'),
        React.createElement(ColorPicker, {
          value: strokeColor,
          size: 30,
          onChange: (color: string) => { (store as any).updateDrawingOptions({ strokeColor: color }); },
          store,
        })
      )
    ),
    brushType !== 'highlighter' && React.createElement(
      Section,
      { style: { opacity: isSelection ? 0.5 : 1 } },
      React.createElement(
        Row,
        null,
        React.createElement('div', null, 'Opacity'),
        React.createElement(NumericInput, {
          value: Math.round(100 * opacity),
          onValueChange: (v: number) => { if (!Number.isNaN(v)) setOpacity(clamp(v, 0, 100) / 100); },
          style: { width: '60px' },
          min: 0,
          max: 100,
          buttonPosition: 'none',
          disabled: isSelection,
        })
      ),
      React.createElement(Slider, { min: 0, max: 100, stepSize: 1, value: Math.round(100 * opacity), onChange: (v: number) => setOpacity(v / 100), labelRenderer: false, showTrackFill: false, disabled: isSelection })
    )
  );
});
