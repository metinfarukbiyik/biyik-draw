/**
 * Kâğıt desenleri: kareli, noktalı, çizgili defter ve kılavuz çizgili (dört çizgili güzel yazı
 * defteri). Desen dünya koordinatına bağlıdır: tahtayla birlikte kayar ve yakınlaşır.
 */
import type { Paper, Theme } from './types.js';
type Rect = [left: number, top: number, right: number, bottom: number];
interface Line {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    width: number;
}
interface Dot {
    x: number;
    y: number;
    r: number;
    color: string;
}
/** Kılavuz çizgili satır: dört çizgi arası (s) ve satırlar arası boşluk. */
export declare const GUIDE_SPACING = 16;
export declare const GUIDE_GAP = 28;
/**
 * Verilen dünya dikdörtgenini kaplayan desen parçaları. `px` bir ekran pikselinin dünya
 * karşılığıdır (çizgi kalınlığı için), `zoom` çok sık desenleri atlamak için.
 */
export declare function paperPrimitives(paper: Paper, [l, t, r, b]: Rect, theme: Theme, px: number, zoom: number): {
    lines: Line[];
    dots: Dot[];
};
export declare function drawPaper(ctx: CanvasRenderingContext2D, paper: Paper, rect: Rect, theme: Theme, px: number, zoom: number): void;
/** SVG dışa aktarım için desen; `ox`, `oy` dünya→SVG kaydırması. */
export declare function paperSvg(paper: Paper, rect: Rect, theme: Theme, ox: number, oy: number): string;
export {};
