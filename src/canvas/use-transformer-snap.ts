'use client';

import React from 'react';
import Konva from 'konva';
import { getClientRect } from '../utils/math';
import { StoreType } from '../model/store';

export type SnapGuideStyle = {
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
};

const snapStyle: Required<SnapGuideStyle> = {
  stroke: 'rgb(0, 161, 255)',
  strokeWidth: 1,
  dash: [4, 6],
};

export const setSnapGuideStyle = ({ stroke, strokeWidth, dash }: SnapGuideStyle) => {
  if (stroke !== undefined) snapStyle.stroke = stroke;
  if (strokeWidth !== undefined) snapStyle.strokeWidth = strokeWidth;
  if (dash !== undefined) snapStyle.dash = dash;
};

let snapFilterFunc = ({
  distance,
}: {
  targetKonvaNodes: any;
  guideKonvaNode: any;
  distance: number;
  snapDirection: any;
}) => distance < 5;

export const setSnapFilterFunc = (fn: typeof snapFilterFunc) => {
  snapFilterFunc = fn;
};

function dot(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.x + a.y * b.y;
}

const OPPOSITE_ANCHOR: Record<string, string> = {
  'top-left': 'bottom-right',
  'top-center': 'bottom-center',
  'top-right': 'bottom-left',
  'middle-right': 'middle-left',
  'bottom-right': 'top-left',
  'bottom-center': 'top-center',
  'bottom-left': 'top-right',
  'middle-left': 'middle-right',
};

function getGuideLines(
  transformer: Konva.Transformer,
  isCandidate: (node: Konva.Node) => boolean,
) {
  const stage = transformer.getStage();
  const vertical: any[] = [];
  const horizontal: any[] = [];

  stage?.find(isCandidate).forEach((node) => {
    if (transformer.nodes().indexOf(node) >= 0) return;
    const rect = node.getClientRect({ skipShadow: true, skipStroke: true });
    vertical.push(
      { offset: rect.x, node, snap: 'start' },
      { offset: rect.x + rect.width, node, snap: 'end' },
      { offset: rect.x + rect.width / 2, node, snap: 'center' },
    );
    horizontal.push(
      { offset: rect.y, node, snap: 'start' },
      { offset: rect.y + rect.height, node, snap: 'end' },
      { offset: rect.y + rect.height / 2, node, snap: 'center' },
    );
  });

  return { vertical, horizontal };
}

function matchGuides(guides: any, target: any) {
  const matchV: any[] = [];
  const matchH: any[] = [];

  guides.vertical.forEach((g: any) => {
    target.vertical.forEach((t: any) => {
      const diff = Math.abs(g.offset - t.guide);
      if (
        snapFilterFunc({ targetKonvaNodes: t.nodes, guideKonvaNode: g.node, distance: diff, snapDirection: g.snap })
      ) matchV.push({ lineGuide: g.offset, diff, snap: t.snap, offset: t.offset });
    });
  });

  guides.horizontal.forEach((g: any) => {
    target.horizontal.forEach((t: any) => {
      const diff = Math.abs(g.offset - t.guide);
      if (
        snapFilterFunc({ targetKonvaNodes: t.nodes, guideKonvaNode: g.node, distance: diff, snapDirection: g.snap })
      ) matchH.push({ lineGuide: g.offset, diff, snap: t.snap, offset: t.offset });
    });
  });

  const results: any[] = [];
  const bestV = matchV.sort((a, b) => a.diff - b.diff)[0];
  const bestH = matchH.sort((a, b) => a.diff - b.diff)[0];
  if (bestV) matchV.filter((g) => Math.abs(g.diff - bestV.diff) < 0.1).forEach((g) => results.push({ orientation: 'V', ...g }));
  if (bestH) matchH.filter((g) => Math.abs(g.diff - bestH.diff) < 0.1).forEach((g) => results.push({ orientation: 'H', ...g }));
  return results;
}

function drawGuides(guides: any[], layer: Konva.Layer) {
  const guidesGroup = layer.findOne('.line-guides') as Konva.Group | undefined;
  guides.forEach((g) => {
    if (g.orientation === 'H') {
      guidesGroup?.add(new Konva.Line({
        x: -layer.getStage()!.x(),
        y: -layer.getStage()!.y(),
        points: [-6000, g.lineGuide, 6000, g.lineGuide],
        stroke: snapStyle.stroke,
        strokeWidth: snapStyle.strokeWidth,
        name: 'guid-line',
        dash: snapStyle.dash,
      }));
    } else if (g.orientation === 'V') {
      guidesGroup?.add(new Konva.Line({
        x: -layer.getStage()!.x(),
        y: -layer.getStage()!.y(),
        points: [g.lineGuide, -6000, g.lineGuide, 6000],
        stroke: snapStyle.stroke,
        strokeWidth: snapStyle.strokeWidth,
        name: 'guid-line',
        dash: snapStyle.dash,
      }));
    }
    layer.batchDraw();
  });
}

function getRulerGuideCandidates(store: StoreType, transformer: Konva.Transformer) {
  const storeGuides: any[] = (store as any).guides || [];
  if (!storeGuides.length) return { vertical: [] as any[], horizontal: [] as any[] };

  const stage = transformer.getStage();
  const elemArea = stage?.findOne('.elements-area');
  if (!elemArea) return { vertical: [] as any[], horizontal: [] as any[] };

  const rect = elemArea.getClientRect({ skipShadow: true, skipStroke: true });
  const scale = (store as any).scale as number;
  const vertical: any[] = [];
  const horizontal: any[] = [];

  storeGuides.forEach((guide: any) => {
    if (guide.orientation === 'V') {
      vertical.push({ offset: rect.x + guide.position * scale, node: null, snap: 'start' });
    } else {
      horizontal.push({ offset: rect.y + guide.position * scale, node: null, snap: 'start' });
    }
  });

  return { vertical, horizontal };
}

export const ensureDragOrder = () => {
  if ((Konva as any).DD._dragElements.size === 0) return;
  const entries = [...(Konva as any).DD._dragElements.entries()];
  const transformerEntry = entries.find(([, v]: [any, any]) => v.node instanceof Konva.Transformer);
  if (transformerEntry) {
    entries.splice(entries.indexOf(transformerEntry), 1);
    entries.unshift(transformerEntry);
    (Konva as any).DD._dragElements.clear();
    entries.forEach(([k, v]: [any, any]) => (Konva as any).DD._dragElements.set(k, v));
  }
};

export function useSnap(
  ref: { current: Konva.Transformer | null },
  store: StoreType,
  style?: SnapGuideStyle,
): void {
  const guideLayerRef = React.useRef<Konva.Group | null>(null);
  if (style) setSnapGuideStyle(style);

  const isCandidate = (node: Konva.Node) =>
    node.hasName('element') ||
    node.hasName('page-background') ||
    (!guideLayerRef.current && node.hasName('elements-area'));

  React.useEffect(() => {
    if (!ref.current) return;
    const transformer = ref.current;

    const getTargetSnapPoints = (tr: Konva.Transformer) => {
      const nodeRect = (tr as any).__getNodeRect();
      const rect = getClientRect({ ...nodeRect, rotation: (Konva.Util as any).radToDeg(nodeRect.rotation) });
      const pos = tr.getAbsolutePosition();
      return {
        vertical: [
          { guide: rect.x, offset: pos.x - rect.x, snap: 'start', nodes: tr.nodes() },
          { guide: rect.x + rect.width / 2, offset: pos.x - rect.x - rect.width / 2, snap: 'center', nodes: tr.nodes() },
          { guide: rect.x + rect.width, offset: pos.x - rect.x - rect.width, snap: 'end', nodes: tr.nodes() },
        ],
        horizontal: [
          { guide: rect.y, offset: pos.y - rect.y, snap: 'start', nodes: tr.nodes() },
          { guide: rect.y + rect.height / 2, offset: pos.y - rect.y - rect.height / 2, snap: 'center', nodes: tr.nodes() },
          { guide: rect.y + rect.height, offset: pos.y - rect.y - rect.height, snap: 'end', nodes: tr.nodes() },
        ],
      };
    };

    const onDragMove = (e: any) => {
      const layer = e.target.getLayer();
      layer?.findOne('.line-guides')?.destroyChildren();

      const candidates = getGuideLines(transformer, isCandidate);
      const rulerCandidates = getRulerGuideCandidates(store, transformer);
      candidates.vertical.push(...rulerCandidates.vertical);
      candidates.horizontal.push(...rulerCandidates.horizontal);
      const targetPoints = getTargetSnapPoints(transformer);
      const guides = matchGuides(candidates, targetPoints);
      if (!guides.length) return;

      drawGuides(guides, layer);

      const pos = e.target.getAbsolutePosition();
      const newPos = { ...pos };
      guides.forEach((g) => {
        if (g.snap === 'start' || g.snap === 'center' || g.snap === 'end') {
          if (g.orientation === 'V') newPos.x = g.lineGuide + g.offset;
          if (g.orientation === 'H') newPos.y = g.lineGuide + g.offset;
        }
      });

      if (!e.evt.ctrlKey && !e.evt.metaKey) {
        const dx = newPos.x - pos.x;
        const dy = newPos.y - pos.y;
        transformer.nodes().forEach((node) => {
          const npos = node.getAbsolutePosition();
          node.setAbsolutePosition({ x: npos.x + dx, y: npos.y + dy });
        });
      }
    };

    // Konva calls anchorDragBoundFunc(oldAbs, newNodePos, event).
    // Return the constrained new position; returning oldPos cancels the resize.
    const onAnchorDragBound = (oldPos: any, newPos: any, event: any) => {
      const layer = transformer.getLayer();
      layer?.findOne('.line-guides')?.destroyChildren();

      if (transformer.getActiveAnchor() === 'rotater') return newPos;

      const activeAnchor = transformer.getActiveAnchor();
      const oppositeAnchorName = OPPOSITE_ANCHOR[activeAnchor];
      const oppositeAnchor = transformer.findOne(`.${oppositeAnchorName}`);
      if (!oppositeAnchor) return newPos;

      const anchorPos = oppositeAnchor.getAbsolutePosition();
      const direction = { x: newPos.x - anchorPos.x, y: newPos.y - anchorPos.y };
      const projected = { x: anchorPos.x + direction.x, y: anchorPos.y + direction.y };

      const candidates = getGuideLines(transformer, isCandidate);
      const rulerCandidates = getRulerGuideCandidates(store, transformer);
      candidates.vertical.push(...rulerCandidates.vertical);
      candidates.horizontal.push(...rulerCandidates.horizontal);
      const targetPoints = {
        vertical: [{ guide: projected.x, offset: 0, snap: 'start', nodes: transformer.nodes() }],
        horizontal: [{ guide: projected.y, offset: 0, snap: 'start', nodes: transformer.nodes() }],
      };
      const guides = matchGuides(candidates, targetPoints);
      if (!guides.length) return newPos;

      if (layer) drawGuides(guides, layer);
      if (event.ctrlKey || event.metaKey) return newPos;

      const snapped = [...guides];
      let best = snapped[0];
      let bestDist = Math.sqrt(Math.pow(projected.x - best.lineGuide, 2) + Math.pow(projected.y - best.lineGuide, 2));
      snapped.forEach((g) => {
        const dist = Math.sqrt(Math.pow(projected.x - g.lineGuide, 2) + Math.pow(projected.y - g.lineGuide, 2));
        if (dist < bestDist) { bestDist = dist; best = g; }
      });

      if (bestDist < 10) return projected;
      return newPos;
    };

    const onDragEnd = (e: any) => {
      if (!e.target) return;
      const layer = e.target.getLayer();
      layer?.findOne('.line-guides')?.destroyChildren();
      layer?.batchDraw();
    };

    transformer.anchorDragBoundFunc(onAnchorDragBound);
    transformer.on('dragstart', () => { setTimeout(ensureDragOrder); });
    transformer.on('dragmove', onDragMove);
    transformer.on('dragend', onDragEnd);
    transformer.on('transformend', onDragEnd);
    transformer.on('transform', (e: any) => {
      if (e.evt.ctrlKey || e.evt.metaKey) {
        transformer.rotationSnapTolerance(0);
      } else {
        transformer.rotationSnapTolerance(5);
      }
    });
  }, []);
}

type ShapeRef = { current: Konva.Shape | null };

export function useAnchorSnap(
  ref: ShapeRef,
  skipRefs: Array<ShapeRef>,
  deps: any,
): void {
  const isCandidate = (node: Konva.Node) =>
    node.hasName('element') ||
    node.hasName('line-anchor') ||
    node.hasName('page-background') ||
    node.hasName('elements-area');

  const onDragMove = (e: any) => {
    const target = e.target;
    if (!ref.current) return;
    const layer = target.getLayer();
    layer?.findOne('.line-guides')?.destroyChildren();

    const allNodes = [target, ...skipRefs.map((r) => r.current).filter(Boolean)];
    const candidates: any = { vertical: [], horizontal: [] };

    e.target.getStage()?.find(isCandidate).forEach((node: Konva.Node) => {
      if (allNodes.indexOf(node) >= 0) return;
      let rect = node.getClientRect({ skipShadow: true, skipStroke: true });
      if (node.hasName('line-anchor')) {
        rect = { x: (node as any).absolutePosition().x, y: (node as any).absolutePosition().y, width: 0, height: 0 };
      }
      candidates.vertical.push(
        { offset: rect.x, node, snap: 'start' },
        { offset: rect.x + rect.width, node, snap: 'end' },
        { offset: rect.x + rect.width / 2, node, snap: 'center' },
      );
      candidates.horizontal.push(
        { offset: rect.y, node, snap: 'start' },
        { offset: rect.y + rect.height, node, snap: 'end' },
        { offset: rect.y + rect.height / 2, node, snap: 'center' },
      );
    });

    let targetNode = target;
    const targetPoints = {
      vertical: [{ guide: targetNode.absolutePosition().x, offset: 0, snap: 'center', nodes: [targetNode] }],
      horizontal: [{ guide: targetNode.absolutePosition().y, offset: 0, snap: 'center', nodes: [targetNode] }],
    };

    const guides = matchGuides(candidates, targetPoints);
    if (!guides.length) return;

    if (layer) {
      const guidesGroup = layer.findOne('.line-guides') as Konva.Group | undefined;
      guides.forEach((g) => {
        if (g.orientation === 'H') {
          guidesGroup?.add(new Konva.Line({ points: [-6000, g.lineGuide, 6000, g.lineGuide], stroke: snapStyle.stroke, strokeWidth: snapStyle.strokeWidth, name: 'guid-line', dash: snapStyle.dash }));
        } else if (g.orientation === 'V') {
          guidesGroup?.add(new Konva.Line({ points: [g.lineGuide, -6000, g.lineGuide, 6000], stroke: snapStyle.stroke, strokeWidth: snapStyle.strokeWidth, name: 'guid-line', dash: snapStyle.dash }));
        }
        layer.batchDraw();
      });
    }

    const pos = target.getAbsolutePosition();
    const newPos = { ...pos };
    guides.forEach((g) => {
      if (g.orientation === 'V') newPos.x = g.lineGuide + g.offset;
      if (g.orientation === 'H') newPos.y = g.lineGuide + g.offset;
    });

    if (!e.evt.ctrlKey && !e.evt.metaKey) {
      const tpos = target.getAbsolutePosition();
      target.absolutePosition({ x: tpos.x + (newPos.x - pos.x), y: tpos.y + (newPos.y - pos.y) });
    }
  };

  const onDragEnd = (e: any) => {
    if (!e.target) return;
    const layer = e.target.getLayer();
    layer?.findOne('.line-guides')?.destroyChildren();
    layer?.batchDraw();
  };

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.on('dragmove', onDragMove);
    ref.current.on('dragend', onDragEnd);
  }, deps);
}
