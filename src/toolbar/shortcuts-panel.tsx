'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Tooltip, Dialog, DialogBody } from '@blueprintjs/core';

// ─── Icon ────────────────────────────────────────────────────────────────────

const KeyboardIcon = () =>
  React.createElement(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 },
    React.createElement('rect', { x: 1, y: 3, width: 14, height: 10, rx: 1.5 }),
    // top row keys
    React.createElement('rect', { x: 3, y: 5.5, width: 2, height: 1.5, rx: 0.4, fill: 'currentColor', stroke: 'none' }),
    React.createElement('rect', { x: 6.5, y: 5.5, width: 2, height: 1.5, rx: 0.4, fill: 'currentColor', stroke: 'none' }),
    React.createElement('rect', { x: 10, y: 5.5, width: 2, height: 1.5, rx: 0.4, fill: 'currentColor', stroke: 'none' }),
    // bottom row — spacebar
    React.createElement('rect', { x: 4.5, y: 9, width: 7, height: 1.5, rx: 0.4, fill: 'currentColor', stroke: 'none' }),
  );

// ─── Shortcut data ────────────────────────────────────────────────────────────

interface ShortcutItem {
  keys: string[];
  label: string;
}

interface ShortcutCategory {
  category: string;
  items: ShortcutItem[];
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    category: 'Edit',
    items: [
      { keys: ['Ctrl', 'Z'], label: 'Undo' },
      { keys: ['Ctrl', 'Y'], label: 'Redo' },
      { keys: ['Ctrl', 'C'], label: 'Copy' },
      { keys: ['Ctrl', 'X'], label: 'Cut' },
      { keys: ['Ctrl', 'V'], label: 'Paste' },
      { keys: ['Ctrl', 'A'], label: 'Select All' },
      { keys: ['Ctrl', 'D'], label: 'Duplicate' },
      { keys: ['Del'], label: 'Delete Selected' },
      { keys: ['Ctrl', 'G'], label: 'Group / Ungroup' },
    ],
  },
  {
    category: 'Add Elements',
    items: [
      { keys: ['T'], label: 'Add Text' },
      { keys: ['R'], label: 'Add Rectangle' },
      { keys: ['O'], label: 'Add Circle' },
      { keys: ['L'], label: 'Add Line' },
    ],
  },
  {
    category: 'Move',
    items: [
      { keys: ['↑', '↓', '←', '→'], label: 'Nudge 1 px' },
    ],
  },
  {
    category: 'Zoom',
    items: [
      { keys: ['Ctrl', '+'], label: 'Zoom In' },
      { keys: ['Ctrl', '−'], label: 'Zoom Out' },
    ],
  },
  {
    category: 'Align (multi-select)',
    items: [
      { keys: ['Alt', 'A'], label: 'Align Left' },
      { keys: ['Alt', 'D'], label: 'Align Right' },
      { keys: ['Alt', 'W'], label: 'Align Top' },
      { keys: ['Alt', 'S'], label: 'Align Bottom' },
      { keys: ['Alt', 'H'], label: 'Center Horizontally' },
      { keys: ['Alt', 'V'], label: 'Center Vertically' },
    ],
  },
  {
    category: 'Layers',
    items: [
      { keys: [']'], label: 'Move Up One Layer' },
      { keys: ['['], label: 'Move Down One Layer' },
      { keys: ['Ctrl', ']'], label: 'Bring to Front' },
      { keys: ['Ctrl', '['], label: 'Send to Back' },
    ],
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  body: {
    padding: '4px 0 8px',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0 24px',
  },
  categoryBlock: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    opacity: 0.5,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: '1px solid rgba(128,128,128,0.2)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '3px 0',
    gap: 8,
  },
  label: {
    fontSize: 13,
    flexShrink: 0,
  },
  keysGroup: {
    display: 'flex',
    gap: 3,
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end',
  },
  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1px 5px',
    borderRadius: 4,
    border: '1px solid rgba(128,128,128,0.4)',
    background: 'rgba(128,128,128,0.08)',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: '18px',
    minWidth: 20,
    whiteSpace: 'nowrap' as const,
  },
  plus: {
    fontSize: 11,
    opacity: 0.4,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function renderKeys(keys: string[]) {
  const parts: React.ReactNode[] = [];
  keys.forEach((k, i) => {
    parts.push(React.createElement('span', { key: k + i, style: styles.kbd }, k));
    if (i < keys.length - 1) {
      parts.push(React.createElement('span', { key: `plus-${i}`, style: styles.plus }, '+'));
    }
  });
  return React.createElement('span', { style: styles.keysGroup }, ...parts);
}

function renderRow(item: ShortcutItem, idx: number) {
  return React.createElement(
    'div',
    { key: idx, style: styles.row },
    React.createElement('span', { style: styles.label }, item.label),
    renderKeys(item.keys),
  );
}

function renderCategory(cat: ShortcutCategory, idx: number) {
  return React.createElement(
    'div',
    { key: idx, style: styles.categoryBlock },
    React.createElement('div', { style: styles.categoryTitle }, cat.category),
    ...cat.items.map(renderRow),
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const ShortcutsButton = observer(({ store }: { store: any }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // '?' key toggles the panel (ignored when typing in inputs)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      if (
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA' ||
        active?.contentEditable === 'true'
      ) {
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Split categories into two columns
  const mid = Math.ceil(SHORTCUTS.length / 2);
  const leftCols = SHORTCUTS.slice(0, mid);
  const rightCols = SHORTCUTS.slice(mid);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Tooltip,
      { content: 'Keyboard Shortcuts (?)', position: 'bottom' },
      React.createElement(Button, {
        minimal: true,
        icon: React.createElement(KeyboardIcon),
        onClick: () => setIsOpen(true),
        'aria-label': 'Keyboard Shortcuts',
      }),
    ),
    React.createElement(
      Dialog,
      {
        isOpen,
        onClose: () => setIsOpen(false),
        title: 'Keyboard Shortcuts',
        style: { width: 560 },
      },
      React.createElement(
        DialogBody,
        null,
        React.createElement(
          'div',
          { style: styles.body },
          React.createElement(
            'div',
            { style: styles.columns },
            React.createElement('div', null, ...leftCols.map(renderCategory)),
            React.createElement('div', null, ...rightCols.map(renderCategory)),
          ),
        ),
      ),
    ),
  );
});
