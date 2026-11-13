/**
 * Ok bağlama. Okun ucu bir şeklin üzerine bırakılınca o şekle bağlanır: uç, okun komşu
 * noktasından şeklin merkezine giden doğrunun şekil kenarıyla kesiştiği yere, küçük bir boşlukla
 * yerleşir. Şekil taşınınca, boyutlanınca ya da dönünce ok yeniden hesaplanır.
 */
import type { Point, SketchElement } from './types.js';
export declare const isBindable: (el: SketchElement) => boolean;
export declare function worldOutline(el: SketchElement): Point[];
/** Noktanın üzerinde (içinde ya da kenarına yakın) olduğu en üstteki bağlanabilir öğe. */
export declare function bindableAt(elements: readonly SketchElement[], world: Point, tolerance: number, excludeId?: string): SketchElement | null;
/**
 * `from` noktasından hedefin merkezine bakan uç noktası: kenar kesişimi, `gap` kadar dışarıda.
 * `from` şeklin içindeyse (örtüşen şekiller) null döner.
 */
export declare function edgePoint(target: SketchElement, from: Point, gap: number): Point | null;
/** Okun bağlı uçlarını hedeflerine göre yeniden yerleştirir. Olmayan hedeflerin bağı çözülür. */
export declare function recomputeArrow(arrow: SketchElement, byId: Map<string, SketchElement>): SketchElement;
/**
 * Bir değişiklikten sonra, değişen ya da silinen öğelere bağlı okları günceller.
 * Hiçbir ok etkilenmediyse aynı diziyi döndürür.
 */
export declare function syncBindings(prev: readonly SketchElement[], next: SketchElement[]): SketchElement[];
