'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';

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

// ─── Panel ────────────────────────────────────────────────────────────────────

export const HistoryPanel = observer(({ store }: { store: any }) => {
  const h = store.history;
  const states: any[] = h.history;
  const undoIdx: number = h.undoIdx;
  const count = states.length;

  const labels = React.useMemo<string[]>(() => {
    const result: string[] = [];
    for (let i = 0; i < states.length; i++) {
      result.push(generateLabel(i === 0 ? null : states[i - 1], states[i]));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // Ref attached to the current item for auto-scroll
  const currentRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [undoIdx]);

  if (count === 0) {
    return React.createElement(
      'div',
      { style: { padding: '24px 0', textAlign: 'center', opacity: 0.5, fontSize: 13 } },
      'No history yet.',
    );
  }

  // Newest at top
  const rows: React.ReactNode[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const isCurrent = i === undoIdx;
    const isFuture = i > undoIdx;
    const isLast = i === 0;
    const isFirst = i === count - 1;
    const stepNum = i + 1;

    const dotColor = isCurrent ? '#2d72d2' : isFuture ? 'rgba(128,128,128,0.3)' : 'rgba(128,128,128,0.55)';
    const dotFill = isCurrent ? '#2d72d2' : 'none';
    const textOpacity = isFuture ? 0.4 : isCurrent ? 1 : 0.75;
    const bgColor = isCurrent ? 'rgba(45,114,210,0.1)' : 'transparent';

    const timelineDot = React.createElement(
      'div',
      {
        style: {
          position: 'relative',
          width: 24,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          alignSelf: 'stretch',
        },
      },
      !isFirst && React.createElement('div', {
        style: { position: 'absolute', top: 0, bottom: '50%', width: 1, background: 'rgba(128,128,128,0.2)' },
      }),
      !isLast && React.createElement('div', {
        style: { position: 'absolute', top: '50%', bottom: 0, width: 1, background: 'rgba(128,128,128,0.2)' },
      }),
      React.createElement(
        'svg',
        { width: 10, height: 10, viewBox: '0 0 10 10', style: { position: 'relative', zIndex: 1, marginTop: 11 } },
        React.createElement('circle', {
          cx: 5, cy: 5, r: 4,
          fill: dotFill,
          stroke: dotColor,
          strokeWidth: isCurrent ? 2 : 1.5,
        }),
      ),
    );

    rows.push(
      React.createElement(
        'div',
        {
          key: i,
          ref: isCurrent ? currentRef : undefined,
          onClick: () => h.jumpTo(i),
          style: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '4px 8px',
            cursor: 'pointer',
            borderRadius: 4,
            background: bgColor,
            transition: 'background 0.1s',
            userSelect: 'none',
          },
          onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
            if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = 'rgba(128,128,128,0.06)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
            (e.currentTarget as HTMLDivElement).style.background = isCurrent ? 'rgba(45,114,210,0.1)' : 'transparent';
          },
        },
        timelineDot,
        React.createElement(
          'div',
          { style: { flex: 1, minWidth: 0, padding: '3px 0' } },
          React.createElement(
            'div',
            {
              style: {
                fontSize: 13,
                fontWeight: isCurrent ? 600 : 400,
                opacity: textOpacity,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            },
            labels[i] ?? 'Modified',
          ),
          React.createElement(
            'div',
            { style: { fontSize: 11, opacity: 0.35, marginTop: 1 } },
            `Step ${stepNum}`,
          ),
        ),
        isCurrent && React.createElement(
          'div',
          {
            style: {
              fontSize: 10,
              color: '#2d72d2',
              fontWeight: 600,
              flexShrink: 0,
              marginTop: 6,
              background: 'rgba(45,114,210,0.12)',
              padding: '1px 5px',
              borderRadius: 3,
            },
          },
          'Now',
        ),
      ),
    );
  }

  return React.createElement(
    'div',
    { style: { height: '100%', overflowY: 'auto', margin: '0 -10px', padding: '0 6px 16px' } },
    React.createElement(
      'div',
      { style: { padding: '2px 10px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.4 } },
      `${count} step${count !== 1 ? 's' : ''}`,
    ),
    ...rows,
  );
});
