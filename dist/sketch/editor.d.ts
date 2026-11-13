/**
 * biyik.dev Sketch — düzenleyici çekirdeği. Arayüzden bağımsızdır: işaretçi, tekerlek ve klavye
 * olaylarını alır, sahneyi (öğeler + görünüm) günceller ve abonelerine haber verir.
 */
import type { Paper, Files, Point, SceneFile, SketchElement, StyleProps, Theme, Tool, View } from './types.js';
import { isLinear, isShape } from './shapes.js';
import { type Overlay } from './render.js';
export declare const DEFAULT_STYLE: StyleProps;
export interface AppState {
    tool: Tool;
    /** Açıkken araç, çizimden sonra seçime dönmez. */
    toolLocked: boolean;
    style: StyleProps;
    selectedIds: string[];
    editingId: string | null;
    theme: Theme;
    background: string;
    grid: boolean;
    /** Kâğıt deseni (kareli, çizgili, kılavuz çizgili…). */
    paper: Paper;
    /** Avuç içi koruması: dokunmatik yalnızca kaydırır/yakınlaştırır, kalem çizer. */
    penOnly: boolean;
    /** Fosforlu kalem rengi. */
    highlightColor: string;
    view: View;
    viewport: {
        width: number;
        height: number;
    };
    /** Salt okunur görüntüleme (paylaşılan çizim): yalnızca kaydırma ve yakınlaştırma. */
    readOnly: boolean;
}
export interface PointerInput {
    id: number;
    x: number;
    y: number;
    button: number;
    type: string;
    shift: boolean;
    alt: boolean;
    mod: boolean;
    /** Kalem basıncı (0–1); fare için 0.5. */
    pressure?: number;
}
export interface Frame {
    cx: number;
    cy: number;
    w: number;
    h: number;
    angle: number;
}
export declare const MIN_ZOOM = 0.1;
export declare const MAX_ZOOM = 30;
export declare class Editor {
    elements: SketchElement[];
    files: Files;
    state: AppState;
    cursor: string;
    /** Sürüm: her değişiklikte artar (React aboneliği için). */
    version: number;
    /** Sahne içeriği değişince artar (kaydetme için). */
    sceneVersion: number;
    /** Görsel aracı seçilince arayüz dosya seçiciyi açar. */
    onRequestImage: ((at: Point | null) => void) | null;
    private listeners;
    private past;
    private future;
    private coalesceKey;
    private coalesceAt;
    private drag;
    private dragSnapshot;
    /** Sürüklemeyi başlatan işaretçi: diğer parmaklar/avuç içi ona karışmaz. */
    private dragPointer;
    /** Kalem ilk kez algılanınca çağrılır (avuç içi koruması otomatik açıldı). */
    onPenDetected: (() => void) | null;
    private penSeen;
    /** Lazer izinin noktaları (dünya koordinatı + zaman). */
    private laser;
    private laserFrame;
    private editSnapshot;
    private pending;
    private pointers;
    private hoverId;
    private erasing;
    private spaceDown;
    private pointerWorld;
    private pointerType;
    /** Ok çizerken ya da ucunu sürüklerken bağlanacak öğe (vurgulanır). */
    private bindTarget;
    subscribe: (fn: () => void) => () => boolean;
    getVersion: () => number;
    private emit;
    private setState;
    toWorld(sx: number, sy: number): Point;
    toScreen([x, y]: Point): Point;
    setViewport(width: number, height: number): void;
    /** Görünüm henüz ölçülmeden istenen sığdırma, ölçü gelince uygulanır. */
    private pendingFit;
    private viewportCenterWorld;
    zoomAt(nextZoom: number, sx: number, sy: number): void;
    zoomBy(factor: number): void;
    resetZoom(): void;
    zoomToFit(onlySelected?: boolean): void;
    scrollBy(dx: number, dy: number): void;
    setTheme(theme: Theme): void;
    setBackground(background: string): void;
    toggleGrid(): void;
    setReadOnly(readOnly: boolean): void;
    setTool(tool: Tool): void;
    toggleToolLock(): void;
    /** Stil değişikliği: geçerli araç stiline ve seçili öğelere uygulanır. */
    setStyle(patch: Partial<StyleProps>): void;
    private commit;
    private record;
    private setElementsLive;
    private byId;
    /** Ok ucunun bağlanabileceği öğe (oklar dışında, başka öğelere bağlanmaz). */
    private bindCandidate;
    private replace;
    get canUndo(): boolean;
    get canRedo(): boolean;
    undo(): void;
    redo(): void;
    private cleanSelection;
    load(scene: {
        elements: SketchElement[];
        files?: Files;
    }, opts?: {
        resetHistory?: boolean;
    }): void;
    clear(): void;
    toSceneFile(): SceneFile;
    /** Yazı tipleri yüklendikten sonra metin kutularını yeniden ölçer. */
    remeasureText(): void;
    selectedElements(): SketchElement[];
    getElement(id: string | null): SketchElement | null;
    private expandGroups;
    select(ids: string[]): void;
    /** Grupları genişletmeden seç (katmanlar panelinden tek öğe seçimi). */
    selectExact(ids: string[]): void;
    visibleElements(): SketchElement[];
    setHidden(ids: string[], hidden: boolean): void;
    setLocked(ids: string[], locked: boolean): void;
    /** Seçimi kilitle / kilidi aç (seçim kilitli öğe içeremeyeceği için yalnız kilitler). */
    lockSelected(): void;
    rename(id: string, name: string): void;
    /** Öğeleri (göreli sıralarını koruyarak) hedef öğenin üstüne ya da altına taşır. */
    placeLayers(ids: string[], targetId: string, where: 'above' | 'below'): void;
    /** Seçimi birimlere ayırır: grup tek birim, diğerleri tek tek. */
    private selectionUnits;
    private moveUnits;
    align(kind: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'): void;
    /** Birimleri aralarındaki boşluklar eşit olacak şekilde dağıtır. */
    distribute(axis: 'x' | 'y'): void;
    /** Seçimi yatay ya da dikey eksende aynalar. */
    flip(axis: 'x' | 'y'): void;
    private copiedStyle;
    copyStyle(): void;
    pasteStyle(): void;
    selectAll(): void;
    deleteSelected(): void;
    private cloneElements;
    duplicateSelected(): void;
    group(): void;
    ungroup(): void;
    reorder(kind: 'front' | 'back' | 'forward' | 'backward'): void;
    nudge(dx: number, dy: number): void;
    /** Sağ tık/uzun basma: tıklanan öğe seçili değilse onu seçer; boşlukta seçimi temizler. */
    selectAt(sx: number, sy: number): void;
    /** Seçimde bir metin ve bir şekil varsa: metin şeklin etiketi olur. */
    canBindText(): boolean;
    bindTextToContainer(): void;
    canWrapText(): boolean;
    /** Seçili metinleri, metni etiket olarak taşıyan dikdörtgenlere dönüştürür. */
    wrapTextInContainer(): void;
    /** Seçimin çevresine bir çerçeve çizer ve hepsini gruplar. */
    wrapSelectionInFrame(): void;
    /** Seçimdeki (yoksa tüm) metinler: metin öğeleri ve şekil etiketleri, yukarıdan aşağıya. */
    plainText(): string;
    copySelection(): string | null;
    cutSelection(): string | null;
    /** Panodan gelen metni yapıştırır: kendi öğelerimiz ya da düz metin. */
    pasteText(text: string): boolean;
    pasteElements(els: SketchElement[], files: Files, opts?: {
        beside?: boolean;
    }): void;
    insertImageFile(file: File, at?: Point | null): Promise<void>;
    private fitText;
    startEditing(id: string): void;
    updateText(id: string, text: string): void;
    finishEditing(): void;
    private newElement;
    private snap;
    getFrame(): Frame | null;
    private handlePositions;
    private hitHandle;
    private hitElement;
    private hitInteractive;
    /** Metin/etiket düzenlemek için: önce metin öğesi, sonra içi dolu ya da boş şekil. */
    private textTargetAt;
    getOverlay(): Overlay;
    pointerDown(p: PointerInput): void;
    private createTextAt;
    private startSelect;
    private linearDown;
    private finishPending;
    pointerMove(p: PointerInput): void;
    pointerUp(p: PointerInput): void;
    pointerCancel(p: PointerInput): void;
    /** Uzun basma ile bağlam menüsü açılınca devam eden hareketi geri al. */
    cancelGesture(): void;
    private static LASER_MS;
    private addLaserPoint;
    private tickLaser;
    /** Lazer izi: nokta ve 0–1 arası tazelik (1 en yeni). */
    laserTrail(): {
        x: number;
        y: number;
        life: number;
    }[];
    setPaper(paper: Paper): void;
    setPenOnly(penOnly: boolean): void;
    setHighlightColor(highlightColor: string): void;
    private endCreation;
    private commitDrag;
    private cancelDrag;
    private constrainAngle;
    private eraseAlong;
    private applyResize;
    private updateHover;
    private updateCursor;
    wheel(e: {
        x: number;
        y: number;
        dx: number;
        dy: number;
        ctrl: boolean;
        shift: boolean;
    }): void;
    doubleClick(sx: number, sy: number): void;
    keyUp(e: KeyboardEvent): void;
    /** Kısayollar. İşlendiyse true döner. */
    keyDown(e: KeyboardEvent): boolean;
}
export { isShape, isLinear };
