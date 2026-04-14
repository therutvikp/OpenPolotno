'use client';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Tab, Tabs } from '@blueprintjs/core';
import useSWR from 'swr';
import { Upload, Trash } from '@blueprintjs/icons';
import { t as s } from '../utils/l10n';
import styled from '../utils/styled';
import { isMobile } from '../utils/screen';
import { ImagesGrid } from './images-grid';
import { textTemplateList } from '../utils/api';
import { fetcher } from '../utils/use-api';
import { localFileToURL } from '../utils/file';
import { registerNextDomDrop } from '../canvas/page';
import { StoreType } from '../model/store';

const TextPanelContent = styled('div')`
  height: calc(100% - 40px);
  display: flex;
  flex-direction: column;

  .bp5-dark & .raeditor-text-preview-plain {
    filter: invert(1);
  }
`;

const FontPreviewBox = styled('div')`
  height: 100px;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(16, 22, 26, 0.3);
  border-radius: 5px;
  background-color: rgba(0, 0, 0, 0.4);
  position: relative;
  font-size: 25px;
  display: flex;
  justify-content: center;
  align-content: center;
  flex-direction: column;
  text-align: center;
  color: white;
  margin-bottom: 10px;
`;

let fontUploadFunc: (file: File) => Promise<string> = async (f) => localFileToURL(f);
export function setFontUploadFunc(func: any) { fontUploadFunc = func; }

const FontItem = observer(({ onSelect, onRemove, font }: any) =>
  React.createElement(
    FontPreviewBox,
    { style: { fontFamily: font.fontFamily }, className: 'raeditor-font-item', onClick: onSelect },
    font.fontFamily, ' text',
    React.createElement(Button, {
      style: { position: 'absolute', right: 0, bottom: 0 },
      minimal: true,
      icon: React.createElement(Trash, null),
      onClick: (e: any) => { e.stopPropagation(); onRemove(); },
    })
  )
);

const DraggableButton = ({ onSelect, ...rest }: any) =>
  React.createElement(Button, {
    ...rest,
    draggable: true,
    className: 'raeditor-close-panel',
    onClick: () => onSelect(),
    onDragStart: () => { registerNextDomDrop(({ x, y }: any) => { onSelect({ x, y }); }); },
    onDragEnd: () => { registerNextDomDrop(null); },
  });

export const TextPanel = observer(({ store }: { store: StoreType }) => {
  React.useEffect(() => { store.loadFont('Roboto'); }, []);

  const addText = (attrs: any) => {
    const width = attrs.width || store.width / 2;
    const x = ((attrs?.x) || store.width / 2) - width / 2;
    const y = ((attrs?.y) || store.height / 2) - attrs.fontSize / 2;
    const scale = (store.width + store.height) / 2160;
    const el = store.activePage?.addElement(Object.assign({ type: 'text', fontFamily: 'Roboto' }, attrs, {
      x, y, width, fontSize: attrs.fontSize * scale,
    }));
    if (!isMobile()) el?.toggleEditMode(true);
  };

  React.useEffect(() => { store.fonts.forEach((f: any) => store.loadFont(f.fontFamily)); }, [store.fonts]);

  const { data, error } = useSWR(textTemplateList(), fetcher);
  const [activeTab, setActiveTab] = React.useState('text');

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
    React.createElement(
      Tabs,
      { large: true, onChange: (id: any) => setActiveTab(id) },
      React.createElement(Tab, { id: 'text' }, s('sidePanel.text')),
      React.createElement(Tab, { id: 'font' }, s('sidePanel.myFonts'))
    ),
    activeTab === 'text' && React.createElement(
      TextPanelContent,
      null,
      React.createElement(DraggableButton, {
        style: { marginBottom: '5px', width: '100%', fontSize: '25px', fontFamily: 'Roboto' },
        minimal: true,
        onSelect: (pos: any) => { addText(Object.assign(Object.assign({}, pos), { fontSize: 76, text: s('sidePanel.headerText'), fontFamily: 'Roboto' })); },
      }, s('sidePanel.createHeader')),
      React.createElement(DraggableButton, {
        style: { marginBottom: '5px', width: '100%', fontSize: '18px', fontFamily: 'Roboto' },
        minimal: true,
        onSelect: (pos: any) => { addText(Object.assign(Object.assign({}, pos), { fontSize: 44, text: s('sidePanel.subHeaderText'), fontFamily: 'Roboto' })); },
      }, s('sidePanel.createSubHeader')),
      React.createElement(DraggableButton, {
        style: { marginBottom: '5px', width: '100%', fontSize: '14px', fontFamily: 'Roboto' },
        minimal: true,
        onSelect: (pos: any) => { addText(Object.assign(Object.assign({}, pos), { fontSize: 30, text: s('sidePanel.bodyText'), fontFamily: 'Roboto' })); },
      }, s('sidePanel.createBody')),
      React.createElement(ImagesGrid, {
        shadowEnabled: false,
        images: data?.items,
        getPreview: (item: any) => item.preview,
        getImageClassName: (item: any) => item.json.indexOf('plain') >= 0 ? 'raeditor-text-preview-plain' : '',
        isLoading: !data,
        error,
        onSelect: async (item: any, pos: any) => {
          const res = await fetch(item.json);
          const json = await res.json();
          if (!store.activePage) return;
          const scale = (store.width + store.height) / 2160;
          const baseX = pos ? pos.x - (json.width / 2) * scale : store.width / 2 - (json.width / 2) * scale;
          const baseY = pos ? pos.y - (json.height / 2) * scale : store.height / 2 - (json.height / 2) * scale;
          store.history.transaction(() => {
            const children = json.pages[0].children;
            const ids: string[] = [];
            children.forEach((child: any) => {
              delete child.id;
              const { id } = store.activePage?.addElement(Object.assign(Object.assign({}, child), {
                fontSize: child.fontSize * scale,
                x: child.x * scale + baseX,
                y: child.y * scale + baseY,
                width: child.width * scale,
                height: child.height * scale,
              }));
              ids.push(id);
            });
            store.selectElements(ids);
          });
        },
      })
    ),
    activeTab === 'font' && React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', height: 'calc(100% - 50px)' } },
      React.createElement(
        'label',
        { htmlFor: 'raeditor-font-upload' },
        React.createElement(Button, {
          icon: React.createElement(Upload, null),
          style: { width: '100%' },
          onClick: () => { (document.querySelector('#raeditor-font-upload') as HTMLElement)?.click(); },
        }, s('sidePanel.uploadFont')),
        React.createElement('input', {
          type: 'file',
          accept: '.ttf, .otf, .woff, .woff2, .eot',
          id: 'raeditor-font-upload',
          style: { display: 'none' },
          onChange: async (e: any) => {
            const { target } = e;
            for (const file of target.files) {
              const url = await fontUploadFunc(file);
              const fontFamily = file.name.split('.')[0].replace(/,/g, '');
              store.addFont({ fontFamily, url });
            }
            target.value = null;
          },
        })
      ),
      React.createElement(
        'div',
        { style: { paddingTop: '20px', overflow: 'auto', height: '100%' } },
        store.fonts.map((font: any, idx: number) =>
          React.createElement(FontItem, {
            font,
            key: idx,
            onSelect: () => { addText({ fontSize: 80, text: 'Cool text', fontFamily: font.fontFamily }); },
            onRemove: () => {
              store.find((el: any) => {
                if (el.type === 'text' && el.fontFamily === font.fontFamily) el.set({ fontFamily: 'Roboto' });
              });
              store.removeFont(font.fontFamily);
            },
          })
        )
      )
    )
  );
});
