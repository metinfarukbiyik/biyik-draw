/** Renk paletleri ve koyu tema dönüşümü. */
import type { Theme } from './types.js';
export declare const STROKE_COLORS: string[];
export declare const BACKGROUND_COLORS: string[];
/** Fosforlu kalem renkleri. */
export declare const HIGHLIGHT_COLORS: string[];
export declare const CANVAS_COLORS: string[];
export declare const SELECTION_COLOR = "#3b82f6";
/**
 * Koyu temada rengin açıklığını tersine çevirir, tonu korur: siyah mürekkep açık griye,
 * pastel dolgular koyu tonlara döner. Açık temada renk olduğu gibi kalır.
 */
export declare function themed(color: string, theme: Theme): string;
