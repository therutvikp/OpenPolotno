'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import Konva from 'konva';
import { Group } from 'react-konva';
import { TextElement } from './text-element';
import { ImageElement } from './image-element';
import { LineElement } from './line-element';
import { VideoElement } from './video-element';
import { FigureElement } from './figure-element';
import { GifElement } from './gif-element';
import { Highlighter } from './highlighter';
import { forEveryChild } from '../model/group-model';
import { flags } from '../utils/flags';
import { StoreType } from '../model/store';
import { ShapeType } from '../model/shape-model';

// Dynamic import of HTMLElement to avoid circular deps
let HTMLElementComponent: any = null;
try {
  // Lazy load to avoid SSR issues
  import('./html-element').then((m) => { HTMLElementComponent = m.HTMLElement; });
} catch (_) {}

// Registry of shape type -> component
const shapeComponents: Record<string, React.ComponentType<any>> = {
  text: TextElement as any,
  image: ImageElement as any,
  svg: ImageElement as any,
  line: LineElement as any,
  video: VideoElement as any,
  figure: FigureElement as any,
  group: observer(({ element, store, ...rest }: any) => {
    const { children } = element;
    const isListening = element.selectable || store.role === 'admin';
    return React.createElement(
      Group,
      { opacity: element.opacity, listening: isListening, hideInExport: !element.showInExport },
      children.map((child: any) =>
        React.createElement(Element, { ...rest, key: child.id, store, element: child }),
      ),
    );
  }),
  gif: GifElement as any,
};

export function registerShapeComponent(type: string, component: any): void {
  shapeComponents[type] = component;
}

// Compute bounding rect for a group element (all non-group children)
function getGroupBoundingRect(
  element: any,
  rotation: number,
): { x: number; y: number; width: number; height: number; rotation: number } {
  const corners: { x: number; y: number }[] = [];
  forEveryChild(element, (child: any) => {
    if (child.type !== 'group') {
      const a = child.a;
      const pts = [
        { x: 0, y: 0 },
        { x: a.width, y: 0 },
        { x: a.width, y: a.height },
        { x: 0, y: a.height },
      ];
      const tf = new Konva.Transform();
      tf.translate(a.x, a.y);
      tf.rotate(Konva.Util.degToRad(a.rotation));
      pts.forEach((p) => corners.push(tf.point(p)));
    }
  });

  const inv = new Konva.Transform();
  inv.rotate(-Konva.Util.degToRad(rotation));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  corners.forEach((p) => {
    const tp = inv.point(p);
    minX = Math.min(minX, tp.x);
    minY = Math.min(minY, tp.y);
    maxX = Math.max(maxX, tp.x);
    maxY = Math.max(maxY, tp.y);
  });
  inv.invert();
  const origin = inv.point({ x: minX, y: minY });
  return { x: origin.x, y: origin.y, width: maxX - minX, height: maxY - minY, rotation };
}

type ShapeProps = {
  store: StoreType;
  element: ShapeType;
  onClick?: Function;
};

const Element = observer((props: ShapeProps) => {
  const { element, store } = props;
  const [isHovered, setIsHovered] = React.useState(false);
  const isSelected = (store as any).selectedElements.indexOf(element) >= 0 && (element as any).selectable;
  const isInGroup = (element as any).parent?.type === 'group';

  // Lazily find the stage for hover tracking
  const [stage, setStage] = React.useState<any>(null);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const pageId = (element as any).page.id;
      const found = Konva.stages.find((s: any) => s.getAttr('pageId') === pageId);
      if (!found) console.error('No stage is found for element', (element as any).id);
      setStage(found || null);
    });
    return () => clearTimeout(timer);
  }, [(element as any).id]);

  // Hover tracking via stage mouse events
  React.useEffect(() => {
    if (!stage) return;
    const onMouseOver = (e: any) => {
      const target = e.target.findAncestor('.element', true);
      const el = (store as any).getElementById(target?.id());
      const topId = el?.top?.id;
      const newValue = topId === (element as any).id;
      // Defer setState to avoid "Cannot update during render" React warning.
      // Konva events can fire synchronously during another component's render cycle.
      setTimeout(() => setIsHovered(newValue), 0);
    };
    const onMouseLeave = () => setTimeout(() => setIsHovered(false), 0);
    stage.on('mouseover', onMouseOver);
    stage.on('mouseleave', onMouseLeave);
    return () => {
      stage.off('mouseover', onMouseOver);
      stage.off('mouseleave', onMouseLeave);
    };
  }, [stage]);

  const transformer = stage?.findOne('Transformer');

  if (!(element as any).visible) return null;

  // Resolve which component to use
  let Component = shapeComponents[(element as any).type];
  if ((element as any).type === 'text' && flags.htmlRenderEnabled) {
    Component = HTMLElementComponent || Component;
  }

  if (!Component) {
    console.error('Can not find component for ' + (element as any).type);
    return null;
  }

  const showHighlighter = (isHovered || isSelected) && !isInGroup;
  const highlighterElement =
    (element as any).type === 'group'
      ? { a: getGroupBoundingRect(element, transformer?.rotation() || 0) }
      : element;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Component, props),
    showHighlighter && React.createElement(Highlighter, { element: highlighterElement as any }),
  );
});

(Element as any).displayName = 'Element';

export default Element;
