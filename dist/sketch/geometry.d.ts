/** Koordinat dönüşümleri, sınırlar ve isabet testi. */
import type { Point, SketchElement } from './types.js';
export type Bounds = [minX: number, minY: number, maxX: number, maxY: number];
export declare function rotatePoint([x, y]: Point, [cx, cy]: Point, angle: number): Point;
export declare const center: (el: SketchElement) => Point;
/** Dünya noktasını öğenin kutu koordinatlarına çevirir. */
export declare function toLocal(el: SketchElement, p: Point): Point;
export declare function toWorld(el: SketchElement, [x, y]: Point): Point;
export declare function elementBounds(el: SketchElement): Bounds;
export declare function commonBounds(elements: readonly SketchElement[]): Bounds | null;
export declare function distToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number;
export declare function distToPolyline(p: Point, pts: Point[], closed?: boolean): number;
export declare function pointInPolygon([x, y]: Point, poly: Point[]): boolean;
/** Dünya noktası öğeye isabet ediyor mu? `tolerance` dünya biriminde. */
export declare function hitTest(el: SketchElement, p: Point, tolerance: number): boolean;
export declare function boundsContain(outer: Bounds, inner: Bounds): boolean;
export declare function boundsIntersect(a: Bounds, b: Bounds): boolean;
/**
 * Dünya koordinatlarındaki noktalardan çizgi öğesi kutusunu yeniden kurar. Öğenin açısı korunur;
 * noktalar kutunun sol üstüne göre normalleştirilir.
 */
export declare function rebuildFromWorldPoints(el: SketchElement, world: Point[]): Pick<SketchElement, 'x' | 'y' | 'width' | 'height' | 'points'>;
export declare const snapAngle: (angle: number, step?: number) => number;
export declare function normalizeAngle(a: number): number;
