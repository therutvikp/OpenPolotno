'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Popover, Tooltip } from '@blueprintjs/core';

// ─── Icon ────────────────────────────────────────────────────────────────────

const HistoryIcon = () =>
  React.createElement(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 },
    React.createElement('circle', { cx: 8, cy: 8, r: 6 }),
    React.createElement('polyline', { points: '8 5 8 8 10.5 10.5', strokeLinecap: 'round', strokeLinejoin: 'round' }),
    // counter-clockwise arrow on top-left arc
    React.createElement('path', { d: 'M4.2 3.5 L2.5 2 L2.5 4.8', strokeLinecap: 'round', strokeLinejoin: 'round' }),
  );

// ─── Label generation ─────────────────────────────────────────────────────────

function generateLabel(prev: any | null, curr: any): string {
  if (!prev) return 'Initial state';

  if (prev.pages.length !== curr.pages.length) {
    return curr.pages.length > prev.pages.length ? 'Added page' : 'Removed page';
  }

  if (prev.width !== curr.width || prev.height !== curr.height) {
    return 'Resized canvas';
  }

  let added = 0;
  let removed = 0;

  for (let i = 0; i < curr.pages.length; i++) {
    const prevPage = prev.pages[i];
    const currPage = curr.pages[i];
    const prevIds = new Set<string>((prevPage?.children ?? []).map((el: any) => el.id as string));
    const currIds = new Set<string>((currPage?.children ?? []).map((el: any) => el.id as string));
    for (const id of currIds) if (!prevIds.has(id)) added++;
    for (const id of prevIds) if (!currIds.has(id)) removed++;
  }

  if (added > 0 && removed === 0) return added === 1 ? 'Added element' : `Added ${added} elements`;
  if (removed > 0 && added === 0) return removed === 1 ? 'Removed element' : `Removed ${removed} elements`;
  if (added > 0 && removed > 0) return 'Replaced elements';
  return 'Modified';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PANEL_WIDTH = 230;

// ─── Panel content ────────────────────────────────────────────────────────────

interface HistoryPanelContentProps {
  history: any;
  listRef: React.RefObject<HTMLDivElement>;
}

const HistoryPanelContent = observer(({ history, listRef }: HistoryPanelContentProps) => {
  const { history: states, undoIdx } = history;
  const count = states.length;

  // Compute labels once (memoised on length; length changes when states are added/pruned)
  const labels = React.useMemo<string[]>(() => {
    const result: string[] = [];
    for (let i = 0; i < states.length; i++) {
      result.push(generateLabel(i === 0 ? null : states[i - 1], states[i]));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  if (count === 0) {
    return React.createElement(
      'div',
      { style: { padding: '12px 16px', opacity: 0.5, fontSize: 13 } },
      'No history yet.',
    );
  }

  // Render newest-first so the most recent action is at top
  const rows: React.ReactNode[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const isCurrent = i === undoIdx;
    const isFuture = i > undoIdx;
    const stepNum = i + 1;

    const dotColor = isCurrent ? '#2d72d2' : isFuture ? 'rgba(128,128,128,0.35)' : 'rgba(128,128,128,0.6)';
    const dotFill = isCurrent ? '#2d72d2' : 'none';
    const textOpacity = isFuture ? 0.45 : isCurrent ? 1 : 0.75;
    const fontWeight = isCurrent ? 600 : 400;
    const bg = isCurrent ? 'rgba(45,114,210,0.08)' : 'transparent';

    const isLast = i === 0;
    const isFirst = i === count - 1;

    const dot = React.createElement(
      'div',
      { style: { position: 'relative', width: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' } },
      // top line segment
      !isFirst && React.createElement('div', {
        style: {
          position: 'absolute',
          top: 0,
          bottom: '50%',
          width: 1,
          background: 'rgba(128,128,128,0.25)',
        },
      }),
      // bottom line segment
      !isLast && React.createElement('div', {
        style: {
          position: 'absolute',
          top: '50%',
          bottom: 0,
          width: 1,
          background: 'rgba(128,128,128,0.25)',
        },
      }),
      // circle
      React.createElement(
        'svg',
        { width: 10, height: 10, viewBox: '0 0 10 10', style: { position: 'relative', zIndex: 1 } },
        React.createElement('circle', { cx: 5, cy: 5, r: 4, fill: dotFill, stroke: dotColor, strokeWidth: isCurrent ? 2 : 1.5 }),
      ),
    );

    rows.push(
      React.createElement(
        'div',
        {
          key: i,
          'data-current': isCurrent ? 'true' : undefined,
          onClick: () => history.jumpTo(i),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            cursor: 'pointer',
            background: bg,
            borderRadius: 4,
            transition: 'background 0.1s',
            minHeight: 32,
          },
          onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
            if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = 'rgba(128,128,128,0.07)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
            (e.currentTarget as HTMLDivElement).style.background = isCurrent ? 'rgba(45,114,210,0.08)' : 'transparent';
          },
        },
        dot,
        React.createElement(
          'div',
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            'div',
            { style: { fontSize: 13, fontWeight, opacity: textOpacity, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            labels[i] ?? 'Modified',
          ),
          React.createElement(
            'div',
            { style: { fontSize: 10, opacity: 0.35 } },
            `Step ${stepNum}`,
          ),
        ),
        isCurrent && React.createElement(
          'div',
          { style: { fontSize: 10, color: '#2d72d2', fontWeight: 600, flexShrink: 0 } },
          'Current',
        ),
      ),
    );
  }

  return React.createElement(
    'div',
    { ref: listRef as React.RefObject<HTMLDivElement>, style: { width: PANEL_WIDTH, maxHeight: 320, overflowY: 'auto', padding: '6px 0' } },
    React.createElement(
      'div',
      { style: { padding: '4px 12px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.45 } },
      `History  (${count} steps)`,
    ),
    ...rows,
  );
});

// ─── Button ────────────────────────────────────────────────────────────────────

export const HistoryPanelButton = observer(({ store }: { store: any }) => {
  const listRef = React.useRef<HTMLDivElement>(null);

  const scrollToCurrent = React.useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector('[data-current="true"]') as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, []);

  const content = React.createElement(HistoryPanelContent, { history: store.history, listRef });

  return React.createElement(
    Tooltip,
    { content: 'History', position: 'bottom' },
    React.createElement(
      Popover,
      {
        content,
        position: 'bottom-left',
        minimal: true,
        onOpened: scrollToCurrent,
      },
      React.createElement(Button, {
        minimal: true,
        icon: React.createElement(HistoryIcon),
        'aria-label': 'History',
      }),
    ),
  );
});
