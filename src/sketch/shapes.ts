/**
 * Öğeden çizim komutları (DrawOp) üretir. Komutlar öğenin kendi kutusuna göredir
 * (0,0 → width,height); döndürme ve konum çizim sırasında uygulanır.
 */
import type { Arrowhead, Point, SketchElement } from './types';
import { createRng, type Rng } from './random';
import {
  ellipseOutline,
  ellipsePath,
  freehandPath,
  hatchSegments,
  polylinePath,
  roundedPolygonOutline,
  roundedPolygonPath,
  sketchCurve,
  sketchEllipsePoints,
  sketchLine,
  sketchPolygon,
  sketchRoundedPolygon,
  sketchSegment,
} from './rough';

export type DrawMode =
  /** Kontur rengi, kontur kalınlığı ve kontur stiliyle çizilir. */
  | 'stroke'
  /** Arka plan rengiyle doldurulur. */
  | 'fill'
  /** Arka plan rengiyle ince tarama çizgisi. */
  | 'hatch'
  /** Kontur rengiyle doldurulup çizilir (ok ucu). */
  | 'head'
  /** Kontur rengiyle, ok ucunun yalnızca çizgisi (düz stil). */
  | 'headStroke'
  /** Serbest çizim izi. */
  | 'free';

export interface DrawOp {
  d: string;
  mode: DrawMode;
}

const SHAPE_RADIUS = 24;

export const isShape = (el: Pick<SketchElement, 'type'>) =>
  el.type === 'rectangle' || el.type === 'diamond' || el.type === 'ellipse' || el.type === 'triangle';
/** Köşeli şekiller (köşe stili seçilebilir). */
export const isPolygon = (el: Pick<SketchElement, 'type'>) =>
  el.type === 'rectangle' || el.type === 'diamond' || el.type === 'triangle';
export const isLinear = (el: Pick<SketchElement, 'type'>) => el.type === 'line' || el.type === 'arrow';
export const hasPoints = (el: Pick<SketchElement, 'type'>) => isLinear(el) || el.type === 'freedraw';

function corners(el: SketchElement): Point[] {
  const { width: w, height: h } = el;
  if (el.type === 'diamond') return [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
  if (el.type === 'triangle') return [[w / 2, 0], [w, h], [0, h]];
  return [[0, 0], [w, 0], [w, h], [0, h]];
}

/** Şeklin kapalı dış çizgisi (dolgu, tarama ve isabet testi için). */
export function outlinePolygon(el: SketchElement): Point[] | null {
  if (el.type === 'ellipse') return ellipseOutline(el.width, el.height);
  if (isPolygon(el)) {
    const c = corners(el);
    return el.edges === 'round' ? roundedPolygonOutline(c, radiusFor(el)) : c;
  }
  return null;
}

function radiusFor(el: SketchElement) {
  return el.type === 'rectangle' ? SHAPE_RADIUS : SHAPE_RADIUS * 0.75;
}

function fillOps(el: SketchElement, r: Rng): DrawOp[] {
  if (el.backgroundColor === 'transparent') return [];
  const outline = outlinePolygon(el);
  if (!outline) return [];
  if (el.fillStyle === 'solid') {
    let d: string;
    if (el.type === 'ellipse') d = ellipsePath(el.width, el.height);
    else if (el.edges === 'round') d = roundedPolygonPath(corners(el), radiusFor(el));
    else d = polylinePath(corners(el), true);
    return [{ d, mode: 'fill' }];
  }
  const gap = Math.max(5, el.strokeWidth * 4.5);
  const angles = el.fillStyle === 'cross' ? [-41, 49] : [-41];
  let d = '';
  for (const angle of angles) {
    for (const [a, b] of hatchSegments(outline, gap, angle)) {
      d += sketchSegment(a, b, el.roughness * 0.4, r);
    }
  }
  return d ? [{ d, mode: 'hatch' }] : [];
}

function shapeStroke(el: SketchElement, r: Rng): string {
  const double = el.strokeStyle === 'solid';
  const { roughness } = el;
  if (el.type === 'ellipse') {
    if (roughness <= 0) return ellipsePath(el.width, el.height);
    let d = sketchCurve(sketchEllipsePoints(el.width, el.height, roughness, r), false, 0, r);
    if (double) d += sketchCurve(sketchEllipsePoints(el.width, el.height, roughness * 0.55, r), false, 0, r);
    return d;
  }
  const c = corners(el);
  if (el.edges === 'round') {
    let d = sketchRoundedPolygon(c, radiusFor(el), roughness, r);
    if (double && roughness > 0) d += sketchRoundedPolygon(c, radiusFor(el), roughness * 0.55, r);
    return d;
  }
  let d = sketchPolygon(c, roughness, r);
  if (double && roughness > 0) d += sketchPolygon(c, roughness * 0.55, r);
  return d;
}

function arrowheadOps(
  kind: Arrowhead,
  tip: Point,
  from: Point,
  el: SketchElement,
  r: Rng,
): DrawOp[] {
  if (kind === 'none') return [];
  const dx = tip[0] - from[0];
  const dy = tip[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return [];
  const ux = dx / len;
  const uy = dy / len;
  const size = Math.min(14 + el.strokeWidth * 3, Math.max(len * 0.5, 6));

  if (kind === 'dot') {
    const rad = Math.max(3, size / 3.2);
    const cx = tip[0] - ux * rad * 0.6;
    const cy = tip[1] - uy * rad * 0.6;
    return [
      {
        d: `M${cx - rad} ${cy}A${rad} ${rad} 0 1 0 ${cx + rad} ${cy}A${rad} ${rad} 0 1 0 ${cx - rad} ${cy}Z`,
        mode: 'head',
      },
    ];
  }
  if (kind === 'bar') {
    const half = size / 2;
    const a: Point = [tip[0] - uy * half, tip[1] + ux * half];
    const b: Point = [tip[0] + uy * half, tip[1] - ux * half];
    return [{ d: sketchLine(a, b, el.roughness, r, el.roughness > 0), mode: 'headStroke' }];
  }

  const spread = kind === 'triangle' ? 0.42 : 0.5;
  const cos = Math.cos(spread);
  const sin = Math.sin(spread);
  const left: Point = [tip[0] - size * (ux * cos - uy * sin), tip[1] - size * (uy * cos + ux * sin)];
  const right: Point = [tip[0] - size * (ux * cos + uy * sin), tip[1] - size * (uy * cos - ux * sin)];
  if (kind === 'triangle') return [{ d: polylinePath([tip, left, right], true), mode: 'head' }];
  const double = el.roughness > 0;
  return [
    {
      d: sketchLine(left, tip, el.roughness * 0.6, r, double) + sketchLine(right, tip, el.roughness * 0.6, r, double),
      mode: 'headStroke',
    },
  ];
}

function linearOps(el: SketchElement, r: Rng): DrawOp[] {
  const pts = el.points ?? [];
  if (pts.length < 2) return [];
  const double = el.strokeStyle === 'solid' && el.roughness > 0;
  let d = '';
  if (el.edges === 'round' && pts.length > 2) {
    d = sketchCurve(pts, false, el.roughness, r);
    if (double) d += sketchCurve(pts, false, el.roughness * 0.7, r);
  } else if (el.roughness <= 0) {
    d = polylinePath(pts);
  } else {
    for (let i = 0; i + 1 < pts.length; i++) d += sketchLine(pts[i], pts[i + 1], el.roughness, r, double);
  }
  const ops: DrawOp[] = [{ d, mode: 'stroke' }];
  if (el.type === 'arrow') {
    const last = pts.length - 1;
    ops.push(...arrowheadOps(el.endArrowhead, pts[last], pts[last - 1], el, r));
    ops.push(...arrowheadOps(el.startArrowhead, pts[0], pts[1], el, r));
  }
  return ops;
}

export function generateOps(el: SketchElement): DrawOp[] {
  const r = createRng(el.seed);
  switch (el.type) {
    case 'rectangle':
    case 'diamond':
    case 'triangle':
    case 'ellipse':
      return [...fillOps(el, r), { d: shapeStroke(el, r), mode: 'stroke' }];
    case 'line':
    case 'arrow':
      return linearOps(el, r);
    case 'freedraw':
      return [{ d: freehandPath(el.points ?? []), mode: 'free' }];
    default:
      return [];
  }
}

/** Çizgi/ok isabet testi ve eğri önizlemesi için eğrinin üzerinden örneklenmiş noktalar. */
export function linearSamplePoints(el: SketchElement): Point[] {
  const pts = el.points ?? [];
  if (el.edges !== 'round' || pts.length < 3) return pts;
  const out: Point[] = [];
  const count = pts.length;
  const at = (i: number) => pts[Math.max(0, Math.min(count - 1, i))];
  for (let i = 0; i < count - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < 8; s++) {
      const t = s / 8;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[count - 1]);
  return out;
}

