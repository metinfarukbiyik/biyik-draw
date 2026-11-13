/** Tuvale çizim ve dışa aktarma (PNG / SVG). */
import type { Files, Point, SketchElement, Theme, View } from './types.js';
import { type DrawOp } from './shapes.js';
export declare function getOps(el: SketchElement): DrawOp[];
/** Görseller: dosya kimliği → yüklenmiş <img>. Yüklenince `onLoad` çağrılır. */
export declare class ImageCache {
    private onLoad;
    private images;
    constructor(onLoad: () => void);
    private ensure;
    get(fileId: string, files: Files): HTMLImageElement | null;
    /** Verilen görsellerin hepsi yüklenince (ya da hata verince) çözülür. */
    preload(fileIds: string[], files: Files): Promise<void>;
}
export declare function dashFor(el: SketchElement): number[];
/** Şekil etiketinin sığacağı genişlik (elips ve eşkenar dörtgende iç kutu daha dar). */
export declare function labelWidth(el: SketchElement): number;
/** Şekil etiketinin dikey merkezi (üçgende geniş tabana yakın). */
export declare function labelCenterY(el: SketchElement): number;
export declare function drawElement(ctx: CanvasRenderingContext2D, el: SketchElement, theme: Theme, images: ImageCache | null, files: Files, alpha?: number): void;
export interface Overlay {
    /** Seçim çerçevesi (dünya): merkez, boyut, açı. */
    frame: {
        cx: number;
        cy: number;
        w: number;
        h: number;
        angle: number;
    } | null;
    /** Ayrı ayrı vurgulanacak seçili öğe kutuları (çoklu seçimde). */
    outlines: SketchElement[];
    handles: {
        x: number;
        y: number;
        kind: 'square' | 'circle' | 'point';
    }[];
    marquee: [Point, Point] | null;
    hovered: SketchElement | null;
    erasing: Set<string>;
    editingId: string | null;
    /** Ok ucunun bağlanacağı öğe: kalın, yarı saydam kenarla vurgulanır. */
    bindTarget: SketchElement | null;
}
export interface SceneRenderOptions {
    view: View;
    width: number;
    height: number;
    dpr: number;
    theme: Theme;
    background: string;
    grid: number | null;
    images: ImageCache;
    files: Files;
}
export declare const GRID_SIZE = 20;
export declare function renderScene(ctx: CanvasRenderingContext2D, elements: readonly SketchElement[], overlay: Overlay, opts: SceneRenderOptions): void;
export interface ExportOptions {
    background: string | null;
    theme: Theme;
    scale: number;
    padding?: number;
}
export declare function exportToCanvas(elements: readonly SketchElement[], files: Files, { background, theme, scale, padding }: ExportOptions): Promise<HTMLCanvasElement>;
export declare function exportToSvg(elements: readonly SketchElement[], files: Files, { background, theme, padding }: ExportOptions): string;
