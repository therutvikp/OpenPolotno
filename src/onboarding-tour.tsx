'use client';
import React from 'react';
import { Button } from '@blueprintjs/core';

const LS_KEY = 'raeditor_tour_v1_done';
const TOOLTIP_WIDTH = 288;
const SPOT_PAD = 10;
const GAP = 16;

interface Step {
  id: string;
  target: string | null;
  title: string;
  desc: string;
  placement: 'center' | 'right' | 'bottom' | 'bottom-left' | 'top';
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to the Editor 👋',
    desc: "Let's take a quick tour of the key features. It'll only take about 30 seconds!",
    placement: 'center',
  },
  {
    id: 'side-panel',
    target: '[data-tour="side-panel"]',
    title: 'Add Elements',
    desc: 'Browse and add text, photos, shapes, videos, and more to your design from the side panel.',
    placement: 'right',
  },
  {
    id: 'canvas',
    target: '[data-tour="canvas"]',
    title: 'Your Canvas',
    desc: 'This is your design area. Click any element to select it — then drag to move or resize it.',
    placement: 'center',
  },
  {
    id: 'toolbar',
    target: '[data-tour="toolbar"]',
    title: 'Editing Toolbar',
    desc: 'When you select an element, editing tools appear here — fonts, colors, blend modes, effects, filters, animations, and more.',
    placement: 'bottom',
  },
  {
    id: 'download',
    target: '[data-tour="download"]',
    title: 'Export Your Design',
    desc: 'When you are ready, click here to download your design as PNG, JPG, PDF, SVG, or video.',
    placement: 'bottom-left',
  },
  {
    id: 'done',
    target: null,
    title: "You're All Set! 🎉",
    desc: "That covers the essentials. Start creating — add elements from the side panel and click them to edit. Have fun!",
    placement: 'center',
  },
];

interface Rect { top: number; left: number; width: number; height: number }

function queryRect(sel: string | null): Rect | null {
  if (!sel) return null;
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - SPOT_PAD, left: r.left - SPOT_PAD, width: r.width + SPOT_PAD * 2, height: r.height + SPOT_PAD * 2 };
}

function tooltipPos(placement: Step['placement'], rect: Rect | null): React.CSSProperties {
  if (!rect || placement === 'center') {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: TOOLTIP_WIDTH };
  }
  if (placement === 'right') {
    return { position: 'fixed', top: rect.top + rect.height / 2, left: rect.left + rect.width + GAP, transform: 'translateY(-50%)', width: TOOLTIP_WIDTH };
  }
  if (placement === 'bottom') {
    const left = Math.max(GAP, Math.min(window.innerWidth - TOOLTIP_WIDTH - GAP, rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2));
    return { position: 'fixed', top: rect.top + rect.height + GAP, left, width: TOOLTIP_WIDTH };
  }
  if (placement === 'bottom-left') {
    const left = Math.max(GAP, rect.left + rect.width - TOOLTIP_WIDTH);
    return { position: 'fixed', top: rect.top + rect.height + GAP, left, width: TOOLTIP_WIDTH };
  }
  if (placement === 'top') {
    const left = Math.max(GAP, Math.min(window.innerWidth - TOOLTIP_WIDTH - GAP, rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2));
    return { position: 'fixed', top: rect.top - GAP, left, transform: 'translateY(-100%)', width: TOOLTIP_WIDTH };
  }
  return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: TOOLTIP_WIDTH };
}

export const OnboardingTour: React.FC = () => {
  const [step, setStep] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const [rect, setRect] = React.useState<Rect | null>(null);

  React.useEffect(() => {
    if (!localStorage.getItem(LS_KEY)) {
      // small delay so DOM is fully ready
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    setRect(queryRect(STEPS[step].target));
  }, [step, visible]);

  const dismiss = () => { localStorage.setItem(LS_KEY, '1'); setVisible(false); };
  const next = () => step >= STEPS.length - 1 ? dismiss() : setStep(s => s + 1);
  const back = () => step > 0 && setStep(s => s - 1);

  if (!visible) return null;

  const cur = STEPS[step];
  const isCenter = !cur.target || cur.placement === 'center' || !rect;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const tipStyle = tooltipPos(cur.placement, rect);

  return React.createElement(
    React.Fragment,
    null,

    // Dark backdrop
    React.createElement('div', {
      key: 'backdrop',
      onClick: isCenter ? undefined : (e: any) => e.stopPropagation(),
      style: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 9000,
        pointerEvents: isCenter ? 'all' : 'none',
      },
    }),

    // Spotlight ring (when targeting a specific element)
    !isCenter && rect && React.createElement('div', {
      key: 'spotlight',
      style: {
        position: 'fixed',
        top: rect.top, left: rect.left, width: rect.width, height: rect.height,
        borderRadius: 8,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
        outline: '2px solid rgba(255,255,255,0.4)',
        zIndex: 9001,
        pointerEvents: 'none',
        transition: 'top 0.28s ease, left 0.28s ease, width 0.28s ease, height 0.28s ease',
      },
    }),

    // Transparent click-blocker over the rest of the screen (not spotlight)
    !isCenter && React.createElement('div', {
      key: 'blocker',
      style: { position: 'fixed', inset: 0, zIndex: 9002, pointerEvents: 'all', background: 'transparent' },
      onClick: (e: any) => e.stopPropagation(),
    }),

    // Tooltip card
    React.createElement(
      'div',
      {
        key: 'tooltip',
        style: {
          ...tipStyle,
          zIndex: 9003,
          background: '#ffffff',
          borderRadius: 12,
          padding: '20px 20px 16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
          pointerEvents: 'all',
        },
      },

      // Step progress dots
      React.createElement(
        'div',
        { style: { display: 'flex', gap: 5, marginBottom: 14 } },
        STEPS.map((_, i) =>
          React.createElement('div', {
            key: i,
            style: {
              height: 5, width: i === step ? 22 : 5, borderRadius: 3,
              background: i === step ? '#2d72d2' : '#dce3eb',
              transition: 'width 0.22s ease, background 0.22s ease',
            },
          }),
        ),
      ),

      // Title
      React.createElement('div', {
        style: { fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#1c2127', lineHeight: 1.35 },
      }, cur.title),

      // Description
      React.createElement('div', {
        style: { fontSize: 13, lineHeight: 1.6, color: '#4a5568', marginBottom: 18 },
      }, cur.desc),

      // Actions row
      React.createElement(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        React.createElement(
          'div',
          { style: { display: 'flex', gap: 6 } },
          !isFirst && React.createElement(Button, { minimal: true, small: true, text: 'Back', onClick: back }),
          React.createElement(Button, { intent: 'primary', small: true, text: isLast ? 'Get Started' : 'Next →', onClick: next }),
        ),
        !isLast && React.createElement(
          'span',
          {
            onClick: dismiss,
            style: { fontSize: 12, color: '#8a9ba8', cursor: 'pointer', userSelect: 'none' },
          },
          'Skip tour',
        ),
      ),
    ),
  );
};
