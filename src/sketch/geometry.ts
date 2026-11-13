/** Koordinat dönüşümleri, sınırlar ve isabet testi. */
import type { Point, SketchElement } from './types';
import { hasPoints, isShape, linearSamplePoints, outlinePolygon } from './shapes';

export type Bounds = [minX: number, minY: number, maxX: number, maxY: number];

export function rotatePoint([x, y]: Point, [cx, cy]: Point, angle: number): Point {
  if (!angle) return [x, y];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

export const center = (el: SketchElement): Point => [el.x + el.width / 2, el.y + el.height / 2];

/** Dünya noktasını öğenin kutu koordinatlarına çevirir. */
export function toLocal(el: SketchElement, p: Point): Point {
  const [x, y] = rotatePoint(p, center(el), -el.angle);
  return [x - el.x, y - el.y];
}

export function toWorld(el: SketchElement, [x, y]: Point): Point {
  return rotatePoint([el.x + x, el.y + y], center(el), el.angle);
}

export function elementBounds(el: SketchElement): Bounds {
  let pts: Point[];
  if (hasPoints(el) && el.points?.length) pts = el.points.map((p) => toWorld(el, p));
  else
    pts = [
      toWorld(el, [0, 0]),
      toWorld(el, [el.width, 0]),
      toWorld(el, [el.width, el.height]),
      toWorld(el, [0, el.height]),
    ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

export function commonBounds(elements: readonly SketchElement[]): Bounds | null {
  if (!elements.length) return null;
  let b: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (const el of elements) {
    const [a, c, d, e] = elementBounds(el);
    b = [Math.min(b[0], a), Math.min(b[1], c), Math.max(b[2], d), Math.max(b[3], e)];
  }
  return b;
}

export function distToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function distToPolyline(p: Point, pts: Point[], closed = false): number {
  let best = Infinity;
  const last = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < last; i++) best = Math.min(best, distToSegment(p, pts[i], pts[(i + 1) % pts.length]));
  if (pts.length === 1) best = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]);
  return best;
}

export function pointInPolygon([x, y]: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Dünya noktası öğeye isabet ediyor mu? `tolerance` dünya biriminde. */
export function hitTest(el: SketchElement, p: Point, tolerance: number): boolean {
  const local = toLocal(el, p);
  const tol = tolerance + el.strokeWidth / 2;
  const [x, y] = local;
  if (x < -tol - 20 || y < -tol - 20 || x > el.width + tol + 20 || y > el.height + tol + 20) return false;

  if (isShape(el)) {
    const poly = outlinePolygon(el)!;
    if ((el.backgroundColor !== 'transparent' || el.text) && pointInPolygon(local, poly)) return true;
    return distToPolyline(local, poly, true) <= tol;
  }
  if (el.type === 'line' || el.type === 'arrow') {
    return distToPolyline(local, linearSamplePoints(el)) <= tol;
  }
  if (el.type === 'freedraw') {
    return distToPolyline(local, el.points ?? []) <= tol + el.strokeWidth;
  }
  // Metin ve görsel: kutunun içi
  return x >= -tol && y >= -tol && x <= el.width + tol && y <= el.height + tol;
}

export function boundsContain(outer: Bounds, inner: Bounds) {
  return inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3];
}

export function boundsIntersect(a: Bounds, b: Bounds) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/**
 * Dünya koordinatlarındaki noktalardan çizgi öğesi kutusunu yeniden kurar. Öğenin açısı korunur;
 * noktalar kutunun sol üstüne göre normalleştirilir.
 */
export function rebuildFromWorldPoints(
  el: SketchElement,
  world: Point[],
): Pick<SketchElement, 'x' | 'y' | 'width' | 'height' | 'points'> {
  const pivot = center(el);
  const local = world.map((p) => rotatePoint(p, pivot, -el.angle));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of local) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const c = rotatePoint([minX + width / 2, minY + height / 2], pivot, el.angle);
  return {
    x: c[0] - width / 2,
    y: c[1] - height / 2,
    width,
    height,
    points: local.map(([x, y]) => [x - minX, y - minY] as Point),
  };
}

export const snapAngle = (angle: number, step = Math.PI / 12) => Math.round(angle / step) * step;

export function normalizeAngle(a: number) {
  const full = Math.PI * 2;
  return ((a % full) + full) % full;
}
