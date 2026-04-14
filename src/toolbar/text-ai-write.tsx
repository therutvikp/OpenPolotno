'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Position, Menu, MenuItem, MenuDivider, TextArea, Popover, Dialog } from '@blueprintjs/core';
import { Clean } from '@blueprintjs/icons';
import { t } from '../utils/l10n';
import { URLS } from '../utils/api';

async function callAiText({ text = '', command, tone }: { text?: string; command: string; tone?: string }) {
  try {
    const resp = await fetch(URLS.aiText(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, command, tone }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error(err);
      throw new Error('Failed to rewrite text');
    }
    return (await resp.json()).response;
  } catch (e) {
    console.error(e);
    return text;
  }
}

const TONES = [{ text: 'friendly' }, { text: 'professional' }, { text: 'humorous' }, { text: 'formal' }];

export const TextAiWrite = observer(({ store }: { store: any }) => {
  const hasElements = store.selectedElements.length > 0;
  const [isLoading, setIsLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogPage, setDialogPage] = React.useState(1);
  const [prompt, setPrompt] = React.useState('');
  const [generated, setGenerated] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const textAreaRef = React.useRef<any>(null);
  const hasNonEditable = store.selectedElements.some((e: any) => !e.contentEditable);

  React.useEffect(() => {
    if (dialogOpen && dialogPage === 1) {
      setTimeout(() => { textAreaRef.current?.focus(); }, 100);
    }
  }, [dialogOpen, dialogPage]);

  const applyText = async (command: string, tone?: string) => {
    setIsLoading(true);
    const elId = store.selectedElements[0].id;
    const originalText = store.selectedElements[0].text;
    const result = await callAiText({ text: originalText, command, tone });
    const el = store.getElementById(elId);
    if (el) { el.set({ text: result }); }
    setIsLoading(false);
  };

  const generate = async () => {
    setIsGenerating(true);
    const result = await callAiText({ command: 'custom', text: store.selectedElements[0].text, tone: prompt });
    setGenerated(result);
    setIsGenerating(false);
    setDialogPage(2);
  };

  if (hasNonEditable) return null;
  if (isLoading) return React.createElement(Button, { icon: React.createElement(Clean, null), minimal: true, text: 'AI write', loading: true });

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Popover,
      {
        disabled: !hasElements,
        content: React.createElement(
          Menu,
          null,
          React.createElement(MenuItem, { text: t('toolbar.aiText.rewrite'), onClick: () => applyText('rewrite') }),
          React.createElement(MenuItem, { text: t('toolbar.aiText.shorten'), onClick: () => applyText('shorten') }),
          React.createElement(MenuItem, { text: t('toolbar.aiText.continue'), onClick: () => applyText('continue') }),
          React.createElement(MenuItem, { text: t('toolbar.aiText.proofread'), onClick: () => applyText('proofread') }),
          React.createElement('li', { className: 'bp5-menu-header' }, React.createElement('h6', { className: 'bp5-heading' }, t('toolbar.aiText.tones'))),
          ...TONES.map((tone) =>
            React.createElement(MenuItem, { key: tone.text, text: t(`toolbar.aiText.${tone.text}`), onClick: () => applyText('tone', tone.text) }),
          ),
          React.createElement(MenuDivider, null),
          React.createElement(MenuItem, {
            text: t('toolbar.aiText.customPrompt'),
            onClick: (e: any) => { e.preventDefault(); e.stopPropagation(); setDialogOpen(true); },
          }),
        ),
        position: Position.BOTTOM,
      },
      React.createElement(Button, { icon: React.createElement(Clean, null), minimal: true, text: t('toolbar.aiText.aiWrite') }),
    ),
    React.createElement(
      Dialog,
      {
        isOpen: dialogOpen,
        onClose: () => { if (!isGenerating) { setDialogOpen(false); setDialogPage(1); setPrompt(''); setGenerated(''); } },
        title: t(dialogPage === 1 ? 'toolbar.aiText.customPrompt' : 'toolbar.aiText.generatedResult'),
      },
      dialogPage === 1
        ? React.createElement('div', { className: 'bp5-dialog-body' },
            React.createElement(TextArea, {
              inputRef: textAreaRef,
              value: prompt,
              onChange: (e: any) => setPrompt(e.target.value),
              placeholder: t('toolbar.aiText.promptPlaceholder'),
              fill: true,
              disabled: isGenerating,
              style: { minHeight: 100 },
            }),
            React.createElement('div', { className: 'bp5-dialog-footer' },
              React.createElement('div', { className: 'bp5-dialog-footer-actions' },
                React.createElement(Button, { onClick: () => setDialogOpen(false), text: t('toolbar.aiText.cancel'), disabled: isGenerating }),
                React.createElement(Button, { intent: 'primary', onClick: generate, loading: isGenerating, disabled: !prompt, text: t('toolbar.aiText.generate') }),
              ),
            ),
          )
        : React.createElement('div', { className: 'bp5-dialog-body' },
            React.createElement(TextArea, {
              value: generated,
              onChange: (e: any) => setGenerated(e.target.value),
              fill: true,
              growVertically: true,
              style: { minHeight: 100 },
            }),
            React.createElement('div', { className: 'bp5-dialog-footer' },
              React.createElement('div', { className: 'bp5-dialog-footer-actions' },
                React.createElement(Button, { onClick: () => setDialogPage(1), text: t('toolbar.aiText.back'), disabled: isGenerating }),
                React.createElement(Button, { onClick: generate, text: t('toolbar.aiText.tryAgain'), loading: isGenerating }),
                React.createElement(Button, {
                  intent: 'primary',
                  onClick: () => {
                    const el = store.getElementById(store.selectedElements[0].id);
                    if (el) el.set({ text: generated });
                    setDialogOpen(false); setDialogPage(1); setPrompt(''); setGenerated('');
                  },
                  text: t('toolbar.aiText.insert'),
                  disabled: isGenerating,
                }),
              ),
            ),
          ),
    ),
  );
});
