'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Text, Group, Path, TextPath } from 'react-konva';
import { Html } from 'react-konva-utils';
import { autorun } from 'mobx';
import Konva from 'konva';
import { parsePath, roundCommands } from 'svg-round-corners';
import { useColor } from './use-color';
import { incrementLoader } from '../utils/loader';
import { isFontLoaded } from '../utils/fonts';
import { flags } from '../utils/flags';
import { removeTags } from '../utils/text';
import { applyFilter } from './apply-filters';
import { useFadeIn } from './use-fadein';
import { isTouchDevice } from '../utils/screen';
import { isAlive } from 'mobx-state-tree';
import { getLimitedFontSize } from './text-element/max-font-size';
import { getOptimalCaretColor } from './text-element/caret-color';
import { StoreType } from '../model/store';
import { TextElementType } from '../model/text-model';

// Fix Konva text rendering
(Konva as any)._fixTextRendering = true;

let styleEl: HTMLStyleElement | null = null;
function getOrCreateStyleEl(): HTMLStyleElement {
  if (!styleEl) {
    styleEl = document.getElementById('raeditor-text-style') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'raeditor-text-style';
      document.head.appendChild(styleEl);
    }
  }
  return styleEl;
}

const BASE_TEXTAREA_STYLE: React.CSSProperties = {
  border: 'none',
  padding: '0px',
  overflow: 'hidden',
  background: 'none',
  outline: 'none',
  resize: 'none',
  overflowWrap: 'break-word',
  whiteSpace: 'pre-wrap',
  userSelect: 'text',
  wordBreak: 'normal',
  textTransform: 'none',
};

const RTL_CHARS = '֑-߿‏‫‮יִ-﷽ﹰ-ﻼ';

function hasRTLChar(char: string): boolean {
  return new RegExp(`^[^${RTL_CHARS}]*?[${RTL_CHARS}]`).test(char);
}

export function isRTLText(text: string): boolean {
  const stripped = text.replace(/\s/g, '');
  let rtlCount = 0;
  for (let i = 0; i < stripped.length; i++) {
    if (hasRTLChar(stripped[i])) rtlCount++;
  }
  return rtlCount > stripped.length / 2;
}

export function getDir(text: string): 'ltr' | 'rtl' {
  return isRTLText(text) ? 'rtl' : 'ltr';
}

export const useFontLoader = (store: StoreType, fontFamily: string): boolean[] => {
  const [, forceUpdate] = React.useReducer((n: number) => n + 1, 0);
  const loadedRef = React.useRef(isFontLoaded(fontFamily));
  const cleanupRef = React.useRef<(() => void) | null>(null);

  React.useLayoutEffect(() => {
    loadedRef.current = isFontLoaded(fontFamily);
    if (loadedRef.current) return;

    let alive = true;
    (async () => {
      loadedRef.current = false;
      forceUpdate();
      const done = incrementLoader(`text ${fontFamily}`);
      await store.loadFont(fontFamily);
      if (alive) {
        cleanupRef.current = done;
        loadedRef.current = true;
        forceUpdate();
      } else {
        done();
      }
    })();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      alive = false;
    };
  }, [fontFamily]);

  React.useEffect(() => {
    if (loadedRef.current) {
      setTimeout(() => {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
      });
    }
  }, [loadedRef.current]);

  return [loadedRef.current];
};

export const getLineHeight = ({
  fontLoaded,
  fontFamily,
  fontSize,
  lineHeight,
}: {
  fontLoaded: any;
  fontFamily: any;
  fontSize: any;
  lineHeight: any;
}): number =>
  React.useMemo(() => {
    if (typeof lineHeight === 'number') return lineHeight;
    const div = document.createElement('div');
    div.style.fontFamily = fontFamily;
    div.style.fontSize = fontSize + 'px';
    div.style.lineHeight = lineHeight;
    div.innerText = 'Test text';
    document.body.appendChild(div);
    const height = div.offsetHeight;
    document.body.removeChild(div);
    return height / fontSize;
  }, [fontLoaded, fontFamily, fontSize, lineHeight]);

export function usePrevious(value: any): any {
  const prevRef = React.useRef(value);
  const currRef = React.useRef(value);
  React.useMemo(() => {
    prevRef.current = currRef.current;
    currRef.current = value;
  }, [value]);
  return prevRef.current;
}

export function getCurvePath(
  width: number,
  height: number,
  power: number,
  absLineHeight: number,
): string {
  const clamped = Math.max(-0.9999, Math.min(0.9999, power));
  if (Math.abs(clamped) < 1e-4) return `M 0 ${height / 2} L ${width} ${height / 2}`;

  const r = (5 * absLineHeight) / (2 * Math.abs(clamped)) - absLineHeight;
  const cx = width / 2;

  if (clamped > 0) {
    const bottom = 2 * r + absLineHeight / 2;
    return [
      `M ${cx} ${bottom}`,
      `A ${r} ${r} 0 1 1 ${cx} ${bottom - 2 * r}`,
      `A ${r} ${r} 0 1 1 ${cx} ${bottom}`,
    ].join(' ');
  } else {
    const top = -(2 * r - Math.round(height)) - absLineHeight / 2;
    return [
      `M ${cx} ${top}`,
      `A ${r} ${r} 0 1 0 ${cx} ${top + 2 * r}`,
      `A ${r} ${r} 0 1 0 ${cx} ${top}`,
    ].join(' ');
  }
}

// Textarea overlay component for edit mode
const TextareaOverlay = observer(
  ({
    textNodeRef,
    element,
    onBlur,
    selectAll,
    cursorPosition,
  }: {
    textNodeRef: React.RefObject<any>;
    element: TextElementType;
    onBlur: () => void;
    selectAll: boolean;
    cursorPosition: number | null;
  }) => {
    const [textareaStyle, setTextareaStyle] = React.useState(BASE_TEXTAREA_STYLE);
    const textNode = textNodeRef.current;

    React.useLayoutEffect(() => {
      if (!textNode) return;
      const newStyle: Record<string, any> = {};
      newStyle.width = textNode.width() - 2 * textNode.padding() + 'px';
      newStyle.height =
        textNode.height() - 2 * textNode.padding() + textNode.fontSize() * textNode.lineHeight() + 'px';
      newStyle.fontSize = textNode.fontSize() + 'px';
      newStyle.lineHeight = textNode.lineHeight() + 0.01;
      newStyle.fontFamily = textNode.fontFamily();
      newStyle.textAlign = textNode.align();
      newStyle.color = textNode.fill();
      newStyle.fontWeight = (element as any).fontWeight;
      newStyle.fontStyle = (element as any).fontStyle;
      newStyle.letterSpacing = (element as any).letterSpacing + 'em';
      newStyle.opacity = Math.max((element as any).a.opacity, 0.2);
      newStyle.textTransform = (element as any).textTransform;
      newStyle.caretColor = getOptimalCaretColor(element);

      const placeholderCss = `
        .raeditor-input::placeholder {
          color: ${newStyle.color};
          opacity: 0.6;
        }
      `;
      const styleNode = getOrCreateStyleEl();
      styleNode.innerHTML = '';
      styleNode.appendChild(document.createTextNode(placeholderCss));

      if (JSON.stringify(newStyle) !== JSON.stringify(textareaStyle)) {
        setTextareaStyle(newStyle as any);
      }
    });

    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    React.useLayoutEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const pos = cursorPosition !== null ? cursorPosition! : el.value.length;
      el.selectionStart = el.selectionEnd = pos;
      if (selectAll) {
        el.select();
        document.execCommand('selectAll', false, undefined);
      }
    }, []);

    React.useEffect(() => {
      window.addEventListener('blur', onBlur);
      const onTouchStart = (e: TouchEvent) => {
        if (!textareaRef.current?.contains(e.target as Node)) onBlur();
      };
      window.addEventListener('touchstart', onTouchStart);
      return () => {
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('touchstart', onTouchStart);
      };
    }, []);

    const textLines = (textNode as any)?.textArr || [];
    const lineCount = textLines.length;
    const lineHeightVal = (textNode as any)?.lineHeight?.() || 1;
    const fontSize = (textNode as any)?.fontSize?.() || 16;
    const totalTextHeight = lineCount * lineHeightVal * fontSize;

    let paddingTop = 0;
    if ((element as any).verticalAlign === 'middle') {
      paddingTop = ((element as any).a.height - totalTextHeight) / 2;
    } else if ((element as any).verticalAlign === 'bottom') {
      paddingTop = (element as any).a.height - totalTextHeight;
    }

    const plainText = removeTags((element as any).text);

    return React.createElement('textarea', {
      className: 'raeditor-input',
      ref: textareaRef,
      dir: getDir(plainText),
      style: { ...BASE_TEXTAREA_STYLE, ...textareaStyle, paddingTop: paddingTop + 'px' },
      value: plainText,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newFontSize = getLimitedFontSize({
          oldText: (element as any).text,
          newText: e.target.value,
          element,
        });
        (element as any).set({ text: e.target.value, fontSize: newFontSize });
      },
      placeholder: (element as any).placeholder,
      onBlur,
    });
  },
);

const HtmlOverlay = observer((props: any) =>
  React.createElement(Html, null, React.createElement(TextareaOverlay, props)),
);

type ShapeProps = {
  store: StoreType;
  element: TextElementType;
};

export const TextElement = observer(({ element, store }: ShapeProps) => {
  const textRef = React.useRef<any>(null);
  const textPathRef = React.useRef<any>(null);
  const bgRef = React.useRef<any>(null);

  const [fontLoaded] = useFontLoader(store, (element as any).fontFamily);
  const fallbackFont = usePrevious(fontLoaded ? (element as any).fontFamily : 'Arial');

  const isTouch = isTouchDevice();
  const isSelected = store.selectedShapes.indexOf(element as any) >= 0 && element.selectable;
  const isSelectable = element.selectable || (store as any).role === 'admin';

  // Edit mode management
  const isTransforming_unused = false; // Kept to not change hook order if needed, but better remove
  const [isTransforming, setIsTransforming] = React.useState(false);
  const cursorPosRef = React.useRef<number | null>(null);
  const prevHeightRef = React.useRef(0);
  const prevPositionRef = React.useRef<{ x: number; y: number } | null>(null);

  const lineHeightVal = getLineHeight({
    fontLoaded,
    fontFamily: (element as any).fontFamily,
    fontSize: (element as any).a.fontSize,
    lineHeight: (element as any).lineHeight,
  });

  const plainText = removeTags((element as any).text);

  // Apply filters reactively
  React.useLayoutEffect(() => {
    if (!textRef.current) return;
    applyFilter(textRef.current, element as any);
    return autorun(
      () => { if (textRef.current) applyFilter(textRef.current, element as any); },
      { delay: 100 },
    );
  }, []);

  useFadeIn(textRef, (element as any).a.opacity);

  const fillProps = useColor(element as any, (element as any).a.fill, 'fill');

  const computedFontFamily = fontLoaded
    ? `"${(element as any).fontFamily}"`
    : fallbackFont === (element as any).fontFamily
    ? 'Arial'
    : `"${fallbackFont}"`;

  const curveEnabled = (element as any).curveEnabled;
  const curvePath = curveEnabled
    ? getCurvePath(
        (element as any).a.width,
        (element as any).a.height,
        (element as any).curvePower,
        (element as any).a.fontSize,
      )
    : '';

  const getTextHeight = () => {
    if (!textRef.current) return 0;
    return textRef.current.height();
  };

  const handleClick = (e: any) => {
    if (!isSelected || (store as any).editorMode !== 'select') return;
    if (element._editModeEnabled) {
      const pos = textRef.current?.getRelativePointerPosition?.();
      if (pos) cursorPosRef.current = pos.x;
    } else {
      element.toggleEditMode(true);
    }
  };

  let verticalOffset = 0;
  if (!curveEnabled) {
    const textLines = textRef.current?.textArr?.length || 1;
    const totalH = textLines * lineHeightVal * (element as any).a.fontSize;
    if ((element as any).verticalAlign === 'middle') verticalOffset = ((element as any).a.height - totalH) / 2;
    else if ((element as any).verticalAlign === 'bottom') verticalOffset = (element as any).a.height - totalH;
  }

  const commonTextProps = {
    ...fillProps,
    stroke: (element as any).stroke,
    strokeWidth: (element as any).strokeWidth,
    lineJoin: 'round',
    fillAfterStrokeEnabled: true,
    fontSize: (element as any).a.fontSize,
    fontFamily: `"${(element as any).fontFamily}", "${fallbackFont}"`,
    fontStyle: `${(element as any).fontStyle} ${(element as any).fontWeight}`,
    textDecoration: (element as any).textDecoration,
    letterSpacing: (element as any).letterSpacing * (element as any).a.fontSize,
    shadowEnabled: (element as any).shadowEnabled,
    shadowBlur: (element as any).shadowBlur,
    shadowOffsetX: (element as any).shadowOffsetX,
    shadowOffsetY: (element as any).shadowOffsetY,
    shadowColor: (element as any).shadowColor,
    shadowOpacity: (element as any).shadowOpacity,
  };

  return React.createElement(
    React.Fragment,
    null,
    // Background path
    React.createElement(Path, {
      ref: bgRef,
      x: (element as any).a.x,
      y: (element as any).a.y,
      rotation: (element as any).a.rotation,
      hideInExport: !element.showInExport,
      listening: false,
      visible: (element as any).backgroundEnabled,
      opacity: (element as any).backgroundOpacity * (element as any).a.opacity,
      data: '',
      fill: (element as any).backgroundColor,
      offsetY: -verticalOffset,
    }),
    // Curved text path
    React.createElement(TextPath, {
      ref: textPathRef,
      visible: curveEnabled,
      data: curvePath,
      text: plainText || (element as any).placeholder,
      listening: false,
      align: 'center',
      textBaseline: 'middle',
      ...commonTextProps,
      fontFamily: `"${(element as any).fontFamily}", "${fallbackFont}"`,
      x: (element as any).a.x,
      y: (element as any).a.y,
      rotation: (element as any).a.rotation,
      opacity: element._editModeEnabled ? 0.3 : (element as any).a.opacity,
      hideInExport: !element.showInExport,
    }),
    // Main text node
    React.createElement(Text, {
      ref: textRef,
      id: element.id,
      name: 'element',
      hideInExport: !element.showInExport,
      x: (element as any).a.x,
      y: (element as any).a.y,
      rotation: (element as any).a.rotation,
      width: (element as any).a.width,
      height: (element as any).a.height,
      text: plainText || (element as any).placeholder,
      direction: getDir(plainText),
      ...commonTextProps,
      fontFamily: computedFontFamily,
      align: (element as any).align,
      verticalAlign: (element as any).verticalAlign,
      draggable: isTouch ? (element as any).draggable && isSelected : (element as any).draggable,
      preventDefault: !isTouch || isSelected,
      opacity: curveEnabled ? 0 : (element as any).a.opacity,
      visible: !element._editModeEnabled,
      ellipsis: (flags as any).textOverflow === 'ellipsis',
      lineHeight: lineHeightVal,
      listening: isSelectable,
      onDragMove: (e: any) => { (element as any).set({ x: e.target.x(), y: e.target.y() }); },
      onDragEnd: (e: any) => { (element as any).set({ x: e.target.x(), y: e.target.y() }); },
      onClick: handleClick,
      onTap: handleClick,
      onTransformStart: () => {
        setIsTransforming(true);
        prevHeightRef.current = textRef.current?.height() || 0;
      },
      onTransform: (e: any) => {
        const node = e.target;
        bgRef.current?.setAttrs({ x: node.x(), y: node.y(), rotation: node.rotation(), scale: node.scale() });

        const anchor = e.target.getStage()?.findOne('Transformer')?.getActiveAnchor();
        if (anchor === 'middle-left' || anchor === 'middle-right') {
          const scaleX = node.scaleX();
          const newWidth = node.width() * scaleX;
          const minWidth = (element as any).a.fontSize;
          const finalWidth = newWidth < minWidth ? minWidth : newWidth;
          if (prevPositionRef.current && newWidth < minWidth) {
            node.position(prevPositionRef.current);
          }
          node.width(finalWidth);
          node.scaleX(1);
          node.scaleY(1);

          const textH = getTextHeight();
          const newHeight = (flags as any).textVerticalResizeEnabled
            ? Math.max(textH, prevHeightRef.current)
            : textH;
          node.height(newHeight);
          (element as any).set({
            x: node.x(),
            width: node.width(),
            rotation: node.rotation(),
            height: newHeight,
          });
          applyFilter(node, element as any);
        }

        if (anchor === 'top-center' || anchor === 'bottom-center') {
          const minH =
            (flags as any).textOverflow === 'resize'
              ? getTextHeight()
              : lineHeightVal * (element as any).a.fontSize;
          node.height(Math.max(minH, node.height() * node.scaleY()));
          node.scaleY(1);
        }

        prevPositionRef.current = node.position();
        const scaleX = node.scaleX();
        bgRef.current?.setAttrs({ scaleX: 1, scaleY: 1 });
        node.scaleX(1);
        node.scaleY(1);
        (element as any).set({
          fontSize: (element as any).a.fontSize * scaleX,
          width: node.width() * scaleX,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          height: node.height() * scaleX,
          shadowBlur: (element as any).shadowBlur * scaleX,
          shadowOffsetX: (element as any).shadowOffsetX * scaleX,
          shadowOffsetY: (element as any).shadowOffsetY * scaleX,
          strokeWidth: (element as any).strokeWidth * scaleX,
        });
      },
      onTransformEnd: (e: any) => {
        const node = e.target;
        const scale = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        (element as any).set({
          fontSize: Math.round((element as any).a.fontSize * scale),
          width: Math.ceil(node.width() * scale),
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          height: node.height() * scale,
          shadowBlur: (element as any).shadowBlur * scale,
          shadowOffsetX: (element as any).shadowOffsetX * scale,
          shadowOffsetY: (element as any).shadowOffsetY * scale,
          strokeWidth: (element as any).strokeWidth * scale,
        });
        bgRef.current?.setAttrs({ scaleX: 1, scaleY: 1 });
        setIsTransforming(false);
      },
    }),
    // Edit mode overlay
    element._editModeEnabled &&
      React.createElement(
        Group,
        { x: (element as any).a.x, y: (element as any).a.y, rotation: (element as any).a.rotation },
        React.createElement(HtmlOverlay, {
          textNodeRef: textRef,
          element,
          selectAll: false,
          cursorPosition: cursorPosRef.current,
          onBlur: () => { element.toggleEditMode(false); },
        }),
      ),
  );
}) as ((props: ShapeProps) => React.JSX.Element) & { displayName: string };

TextElement.displayName = 'TextElement';
