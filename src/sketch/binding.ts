/**
 * Ok bağlama. Okun ucu bir şeklin üzerine bırakılınca o şekle bağlanır: uç, okun komşu
 * noktasından şeklin merkezine giden doğrunun şekil kenarıyla kesiştiği yere, küçük bir boşlukla
 * yerleşir. Şekil taşınınca, boyutlanınca ya da dönünce ok yeniden hesaplanır.
 */
import type { Point, SketchElement } from './types';
import { center, distToPolyline, pointInPolygon, rebuildFromWorldPoints, toLocal, toWorld } from './geometry';
import { isShape, outlinePolygon } from './shapes';

export const isBindable = (el: SketchElement) => isShape(el) || el.type === 'text' || el.type === 'image';

function localOutline(el: SketchElement): Point[] {
  return (
    outlinePolygon(el) ?? [
      [0, 0],
      [el.width, 0],
      [el.width, el.height],
      [0, el.height],
    ]
  );
}

export function worldOutline(el: SketchElement): Point[] {
  return localOutline(el).map((p) => toWorld(el, p));
}

/** Noktanın üzerinde (içinde ya da kenarına yakın) olduğu en üstteki bağlanabilir öğe. */
export function bindableAt(
  elements: readonly SketchElement[],
  world: Point,
  tolerance: number,
  excludeId?: string,
): SketchElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.id === excludeId || !isBindable(el)) continue;
    const local = toLocal(el, world);
    const poly = localOutline(el);
    if (pointInPolygon(local, poly) || distToPolyline(local, poly, true) <= tolerance) return el;
  }
  return null;
}

/** p→q doğru parçasının a→b ile kesişimi; p'den uzaklık oranı (0…1) ile birlikte. */
function intersect(p: Point, q: Point, a: Point, b: Point): { t: number; point: Point } | null {
  const rx = q[0] - p[0];
  const ry = q[1] - p[1];
  const sx = b[0] - a[0];
  const sy = b[1] - a[1];
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((a[0] - p[0]) * sy - (a[1] - p[1]) * sx) / denom;
  const u = ((a[0] - p[0]) * ry - (a[1] - p[1]) * rx) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, point: [p[0] + rx * t, p[1] + ry * t] };
}

/**
 * `from` noktasından hedefin merkezine bakan uç noktası: kenar kesişimi, `gap` kadar dışarıda.
 * `from` şeklin içindeyse (örtüşen şekiller) null döner.
 */
export function edgePoint(target: SketchElement, from: Point, gap: number): Point | null {
  const c = center(target);
  const poly = worldOutline(target);
  let best: { t: number; point: Point } | null = null;
  for (let i = 0; i < poly.length; i++) {
    const hit = intersect(from, c, poly[i], poly[(i + 1) % poly.length]);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  if (!best) return null;
  const dx = from[0] - c[0];
  const dy = from[1] - c[1];
  const len = Math.hypot(dx, dy) || 1;
  return [best.point[0] + (dx / len) * gap, best.point[1] + (dy / len) * gap];
}

/** Okun bağlı uçlarını hedeflerine göre yeniden yerleştirir. Olmayan hedeflerin bağı çözülür. */
export function recomputeArrow(arrow: SketchElement, byId: Map<string, SketchElement>): SketchElement {
  const pts = arrow.points ?? [];
  if (arrow.type !== 'arrow' || pts.length < 2) return arrow;
  const start = arrow.startBinding ? byId.get(arrow.startBinding) ?? null : null;
  const end = arrow.endBinding ? byId.get(arrow.endBinding) ?? null : null;
  const patch: Partial<SketchElement> = {};
  if (arrow.startBinding && !start) patch.startBinding = null;
  if (arrow.endBinding && !end) patch.endBinding = null;
  if (!start && !end) return Object.keys(patch).length ? { ...arrow, ...patch, version: arrow.version + 1 } : arrow;

  const world = pts.map((p) => toWorld(arrow, p));
  const last = world.length - 1;
  const gap = 5 + arrow.strokeWidth;
  if (start) {
    const ref = world.length > 2 ? world[1] : end ? center(end) : world[last];
    const p = edgePoint(start, ref, gap);
    if (p) world[0] = p;
  }
  if (end) {
    const ref = world.length > 2 ? world[last - 1] : start ? center(start) : world[0];
    const p = edgePoint(end, ref, gap);
    if (p) world[last] = p;
  }
  return { ...arrow, ...patch, ...rebuildFromWorldPoints(arrow, world), version: arrow.version + 1 };
}

/**
 * Bir değişiklikten sonra, değişen ya da silinen öğelere bağlı okları günceller.
 * Hiçbir ok etkilenmediyse aynı diziyi döndürür.
 */
export function syncBindings(prev: readonly SketchElement[], next: SketchElement[]): SketchElement[] {
  if (prev === next) return next;
  const prevById = new Map(prev.map((el) => [el.id, el]));
  const byId = new Map(next.map((el) => [el.id, el]));
  const changed = new Set<string>();
  for (const el of next) if (prevById.get(el.id) !== el) changed.add(el.id);
  for (const id of prevById.keys()) if (!byId.has(id)) changed.add(id);
  if (!changed.size) return next;

  let touched = false;
  const out = next.map((el) => {
    if (el.type !== 'arrow' || (!el.startBinding && !el.endBinding)) return el;
    const affected =
      (el.startBinding && changed.has(el.startBinding)) || (el.endBinding && changed.has(el.endBinding));
    if (!affected) return el;
    touched = true;
    return recomputeArrow(el, byId);
  });
  return touched ? out : next;
}
