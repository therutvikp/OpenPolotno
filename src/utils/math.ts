export function degToRad(deg: number): number {
  return (deg / 180) * Math.PI;
}

function rotatePoint(
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  angle: number,
): { x: number; y: number } {
  const dist = Math.sqrt(dx * dx + dy * dy);
  angle += Math.atan2(dy, dx);
  return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
}

export interface ClientRect {
  x: number;
  y: number;
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function getClientRect(node: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}): ClientRect {
  const { x, y, width, height } = node;
  const angle = degToRad(node.rotation ?? 0);
  const p0 = rotatePoint(x, y, 0, 0, angle);
  const p1 = rotatePoint(x, y, width, 0, angle);
  const p2 = rotatePoint(x, y, width, height, angle);
  const p3 = rotatePoint(x, y, 0, height, angle);
  const minX = Math.min(p0.x, p1.x, p2.x, p3.x);
  const minY = Math.min(p0.y, p1.y, p2.y, p3.y);
  const maxX = Math.max(p0.x, p1.x, p2.x, p3.x);
  const maxY = Math.max(p0.y, p1.y, p2.y, p3.y);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, minX, minY, maxX, maxY };
}

export function getTotalClientRect(nodes: Array<{ x: number; y: number; width: number; height: number; rotation?: number }>): ClientRect {
  const rects = nodes.map(getClientRect);
  const minX = Math.min(...rects.map((r) => r.minX));
  const minY = Math.min(...rects.map((r) => r.minY));
  const maxX = Math.max(...rects.map((r) => r.maxX));
  const maxY = Math.max(...rects.map((r) => r.maxY));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, minX, minY, maxX, maxY };
}

export function getCenter(node: { x: number; y: number; width: number; height: number; rotation?: number }): { x: number; y: number } {
  const angle = degToRad(node.rotation ?? 0);
  return {
    x: node.x + (node.width / 2) * Math.cos(angle) + (node.height / 2) * Math.sin(-angle),
    y: node.y + (node.height / 2) * Math.cos(angle) + (node.width / 2) * Math.sin(angle),
  };
}

export function rotateAroundPoint(
  node: { x: number; y: number; rotation: number; [key: string]: any },
  angleDeg: number,
  pivot: { x: number; y: number },
): typeof node {
  const angle = degToRad(angleDeg);
  const newX = pivot.x + (node.x - pivot.x) * Math.cos(angle) - (node.y - pivot.y) * Math.sin(angle);
  const newY = pivot.y + (node.x - pivot.x) * Math.sin(angle) + (node.y - pivot.y) * Math.cos(angle);
  return { ...node, rotation: node.rotation + angleDeg, x: newX, y: newY };
}

export function rotateAroundCenter(
  node: { x: number; y: number; width: number; height: number; rotation: number; [key: string]: any },
  angleDeg: number,
): typeof node {
  return rotateAroundPoint(node, angleDeg, getCenter(node));
}
