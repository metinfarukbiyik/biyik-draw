/**
 * Öğeden çizim komutları (DrawOp) üretir. Komutlar öğenin kendi kutusuna göredir
 * (0,0 → width,height); döndürme ve konum çizim sırasında uygulanır.
 */
import type { Point, SketchElement } from './types.js';
export type DrawMode = 
/** Kontur rengi, kontur kalınlığı ve kontur stiliyle çizilir. */
'stroke'
/** Arka plan rengiyle doldurulur. */
 | 'fill'
/** Arka plan rengiyle ince tarama çizgisi. */
 | 'hatch'
/** Kontur rengiyle doldurulup çizilir (ok ucu). */
 | 'head'
/** Kontur rengiyle, ok ucunun yalnızca çizgisi (düz stil). */
 | 'headStroke'
/** Serbest çizim izi. */
 | 'free'
/** Basınçlı serbest çizim: kontur renginde dolgu. */
 | 'freeFill'
/** Fosforlu kalem: yarı saydam, geniş iz. */
 | 'highlight';
export interface DrawOp {
    d: string;
    mode: DrawMode;
}
export declare const isShape: (el: Pick<SketchElement, "type">) => boolean;
/** Köşeli şekiller (köşe stili seçilebilir). */
export declare const isPolygon: (el: Pick<SketchElement, "type">) => boolean;
export declare const isLinear: (el: Pick<SketchElement, "type">) => boolean;
export declare const hasPoints: (el: Pick<SketchElement, "type">) => boolean;
/** Şeklin kapalı dış çizgisi (dolgu, tarama ve isabet testi için). */
export declare function outlinePolygon(el: SketchElement): Point[] | null;
export declare function generateOps(el: SketchElement): DrawOp[];
/** Çizgi/ok isabet testi ve eğri önizlemesi için eğrinin üzerinden örneklenmiş noktalar. */
export declare function linearSamplePoints(el: SketchElement): Point[];
