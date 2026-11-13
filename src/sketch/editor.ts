/**
 * biyik.dev Sketch — düzenleyici çekirdeği. Arayüzden bağımsızdır: işaretçi, tekerlek ve klavye
 * olaylarını alır, sahneyi (öğeler + görünüm) günceller ve abonelerine haber verir.
 */
import type {
  Files,
  Point,
  SceneFile,
  SketchElement,
  StyleProps,
  Theme,
  Tool,
  View,
} from './types';
import { randomId, randomSeed } from './random';
import {
  boundsContain,
  center,
  commonBounds,
  elementBounds,
  hitTest,
  normalizeAngle,
  pointInPolygon,
  rebuildFromWorldPoints,
  rotatePoint,
  snapAngle,
  toLocal,
  toWorld,
} from './geometry';
import { hasPoints, isLinear, isShape, outlinePolygon } from './shapes';
import { bindableAt, recomputeArrow, syncBindings } from './binding';
import { LINE_HEIGHT, measureText } from './text';
import { GRID_SIZE, type Overlay } from './render';

export const DEFAULT_STYLE: StyleProps = {
  strokeColor: '#18181b',
  backgroundColor: 'transparent',
  fillStyle: 'hachure',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
  edges: 'round',
  fontSize: 24,
  fontFamily: 'hand',
  textAlign: 'left',
  startArrowhead: 'none',
  endArrowhead: 'arrow',
};

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
  view: View;
  viewport: { width: number; height: number };
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
}

export interface Frame {
  cx: number;
  cy: number;
  w: number;
  h: number;
  angle: number;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type HandleHit = { kind: 'resize'; handle: ResizeHandle } | { kind: 'rotate' } | { kind: 'point'; index: number };

type Drag =
  | { kind: 'pan'; sx: number; sy: number; scrollX: number; scrollY: number }
  | { kind: 'create'; id: string; origin: Point }
  | { kind: 'linear'; id: string; origin: Point; startScreen: Point; startBind: string | null }
  | { kind: 'freedraw'; id: string; world: Point[] }
  | { kind: 'move'; start: Point; originals: Map<string, SketchElement>; duplicate: boolean; moved: boolean }
  | { kind: 'resize'; handle: ResizeHandle; frame: Frame; originals: SketchElement[]; keepAspect: boolean }
  | { kind: 'rotate'; frame: Frame; startAngle: number; originals: SketchElement[] }
  | { kind: 'point'; id: string; index: number; original: SketchElement }
  | { kind: 'marquee'; start: Point; current: Point; base: string[] }
  | { kind: 'erase'; last: Point }
  | { kind: 'pinch'; dist: number; zoom: number; worldMid: Point };

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 30;
const CLIPBOARD_TYPE = 'biyik-draw/clipboard';

const RESIZE_CURSORS = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize'];
const HANDLE_BASE_ANGLE: Record<ResizeHandle, number> = { n: 0, ne: 45, e: 90, se: 135, s: 0, sw: 45, w: 90, nw: 135 };

const bump = (el: SketchElement, patch: Partial<SketchElement>): SketchElement => ({
  ...el,
  ...patch,
  version: el.version + 1,
});

export class Editor {
  elements: SketchElement[] = [];
  files: Files = {};
  state: AppState = {
    tool: 'select',
    toolLocked: false,
    style: { ...DEFAULT_STYLE },
    selectedIds: [],
    editingId: null,
    theme: 'light',
    background: '#ffffff',
    grid: false,
    view: { zoom: 1, scrollX: 0, scrollY: 0 },
    viewport: { width: 0, height: 0 },
    readOnly: false,
  };
  cursor = 'default';
  /** Sürüm: her değişiklikte artar (React aboneliği için). */
  version = 0;
  /** Sahne içeriği değişince artar (kaydetme için). */
  sceneVersion = 0;

  /** Görsel aracı seçilince arayüz dosya seçiciyi açar. */
  onRequestImage: ((at: Point | null) => void) | null = null;

  private listeners = new Set<() => void>();
  private past: SketchElement[][] = [];
  private future: SketchElement[][] = [];
  private coalesceKey = '';
  private coalesceAt = 0;
  private drag: Drag | null = null;
  private dragSnapshot: SketchElement[] | null = null;
  private editSnapshot: SketchElement[] | null = null;
  private pending: { id: string; snapshot: SketchElement[] } | null = null;
  private pointers = new Map<number, Point>();
  private hoverId: string | null = null;
  private erasing = new Set<string>();
  private spaceDown = false;
  private pointerWorld: Point | null = null;
  private pointerType = 'mouse';
  /** Ok çizerken ya da ucunu sürüklerken bağlanacak öğe (vurgulanır). */
  private bindTarget: string | null = null;

  /* ───────────── Abonelik ───────────── */

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = () => this.version;

  private emit(sceneChanged = false) {
    this.version++;
    if (sceneChanged) this.sceneVersion++;
    for (const fn of this.listeners) fn();
  }

  private setState(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  /* ───────────── Görünüm ───────────── */

  toWorld(sx: number, sy: number): Point {
    const { zoom, scrollX, scrollY } = this.state.view;
    return [sx / zoom - scrollX, sy / zoom - scrollY];
  }

  toScreen([x, y]: Point): Point {
    const { zoom, scrollX, scrollY } = this.state.view;
    return [(x + scrollX) * zoom, (y + scrollY) * zoom];
  }

  setViewport(width: number, height: number) {
    this.setState({ viewport: { width, height } });
    if (this.pendingFit && width > 0 && height > 0) {
      const onlySelected = this.pendingFit === 'selection';
      this.pendingFit = null;
      this.zoomToFit(onlySelected);
    }
  }

  /** Görünüm henüz ölçülmeden istenen sığdırma, ölçü gelince uygulanır. */
  private pendingFit: 'all' | 'selection' | null = null;

  private viewportCenterWorld(): Point {
    return this.toWorld(this.state.viewport.width / 2, this.state.viewport.height / 2);
  }

  zoomAt(nextZoom: number, sx: number, sy: number) {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    const [wx, wy] = this.toWorld(sx, sy);
    this.setState({ view: { zoom, scrollX: sx / zoom - wx, scrollY: sy / zoom - wy } });
  }

  zoomBy(factor: number) {
    const { width, height } = this.state.viewport;
    this.zoomAt(this.state.view.zoom * factor, width / 2, height / 2);
  }

  resetZoom() {
    const { width, height } = this.state.viewport;
    this.zoomAt(1, width / 2, height / 2);
  }

  zoomToFit(onlySelected = false) {
    if (!this.state.viewport.width || !this.state.viewport.height) {
      this.pendingFit = onlySelected ? 'selection' : 'all';
      return;
    }
    const els = onlySelected && this.state.selectedIds.length ? this.selectedElements() : this.visibleElements();
    const b = commonBounds(els);
    if (!b) return this.resetZoom();
    const { width, height } = this.state.viewport;
    const pad = 80;
    const zoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min((width - pad * 2) / Math.max(b[2] - b[0], 1), (height - pad * 2) / Math.max(b[3] - b[1], 1), 1)),
    );
    const cx = (b[0] + b[2]) / 2;
    const cy = (b[1] + b[3]) / 2;
    this.setState({ view: { zoom, scrollX: width / 2 / zoom - cx, scrollY: height / 2 / zoom - cy } });
  }

  scrollBy(dx: number, dy: number) {
    const { view } = this.state;
    this.setState({ view: { ...view, scrollX: view.scrollX - dx / view.zoom, scrollY: view.scrollY - dy / view.zoom } });
  }

  /* ───────────── Ayarlar ───────────── */

  setTheme(theme: Theme) {
    this.setState({ theme });
    this.emit(true);
  }

  setBackground(background: string) {
    this.setState({ background });
    this.emit(true);
  }

  toggleGrid() {
    this.setState({ grid: !this.state.grid });
    this.emit(true);
  }

  setReadOnly(readOnly: boolean) {
    this.finishPending();
    this.state = { ...this.state, readOnly, selectedIds: [], editingId: null, tool: readOnly ? 'hand' : 'select' };
    this.updateCursor();
    this.emit();
  }

  setTool(tool: Tool) {
    if (this.state.readOnly) return;
    this.finishPending();
    if (this.state.editingId) this.finishEditing();
    if (tool === 'image') {
      this.setState({ tool: 'select' });
      this.onRequestImage?.(null);
      return;
    }
    this.setState({ tool, selectedIds: tool === 'select' ? this.state.selectedIds : [] });
    this.updateCursor();
  }

  toggleToolLock() {
    this.setState({ toolLocked: !this.state.toolLocked });
  }

  /** Stil değişikliği: geçerli araç stiline ve seçili öğelere uygulanır. */
  setStyle(patch: Partial<StyleProps>) {
    this.state = { ...this.state, style: { ...this.state.style, ...patch } };
    const ids = new Set(this.state.selectedIds);
    if (this.state.editingId) ids.add(this.state.editingId);
    if (!ids.size) return this.emit();
    const next = this.elements.map((el) => {
      if (!ids.has(el.id)) return el;
      let updated = bump(el, patch);
      if (el.type === 'text' && ('fontSize' in patch || 'fontFamily' in patch)) {
        updated = { ...updated, ...this.fitText(updated, updated.text ?? '') };
      }
      return updated;
    });
    this.commit(next, Object.keys(patch).join(','));
  }

  /* ───────────── Sahne ───────────── */

  private commit(next: SketchElement[], coalesce?: string) {
    const now = Date.now();
    const merge = coalesce && coalesce === this.coalesceKey && now - this.coalesceAt < 800;
    if (!merge) this.record(this.elements);
    this.coalesceKey = coalesce ?? '';
    this.coalesceAt = now;
    this.elements = syncBindings(this.elements, next);
    this.emit(true);
  }

  private record(prev: SketchElement[]) {
    this.past.push(prev);
    if (this.past.length > 200) this.past.shift();
    this.future = [];
  }

  private setElementsLive(next: SketchElement[]) {
    this.elements = syncBindings(this.elements, next);
    this.emit(true);
  }

  private byId() {
    return new Map(this.elements.map((el) => [el.id, el]));
  }

  /** Ok ucunun bağlanabileceği öğe (oklar dışında, başka öğelere bağlanmaz). */
  private bindCandidate(arrow: SketchElement, at: Point, other: string | null | undefined): string | null {
    if (arrow.type !== 'arrow') return null;
    const target = bindableAt(
      this.elements.filter((el) => !el.hidden),
      at,
      10 / this.state.view.zoom,
      arrow.id,
    );
    return target && target.id !== other ? target.id : null;
  }

  private replace(updated: SketchElement[]) {
    const map = new Map(updated.map((el) => [el.id, el]));
    return this.elements.map((el) => map.get(el.id) ?? el);
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  undo() {
    this.finishPending();
    if (this.state.editingId) this.finishEditing();
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push(this.elements);
    this.elements = prev;
    this.coalesceKey = '';
    this.cleanSelection();
  }

  redo() {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.elements);
    this.elements = next;
    this.coalesceKey = '';
    this.cleanSelection();
  }

  private cleanSelection() {
    const ids = new Set(this.elements.map((el) => el.id));
    this.state = { ...this.state, selectedIds: this.state.selectedIds.filter((id) => ids.has(id)) };
    this.emit(true);
  }

  load(scene: { elements: SketchElement[]; files?: Files }, opts: { resetHistory?: boolean } = {}) {
    this.finishPending();
    if (!opts.resetHistory) this.record(this.elements);
    else {
      this.past = [];
      this.future = [];
    }
    this.elements = scene.elements.map((el) => ({ ...el }));
    this.files = { ...this.files, ...(scene.files ?? {}) };
    this.state = { ...this.state, selectedIds: [], editingId: null };
    this.emit(true);
  }

  clear() {
    if (!this.elements.length) return;
    // Dosyalar silinmez: geri al ile görseller de geri gelsin (kayıtta kullanılmayanlar atılır)
    this.commit([]);
    this.setState({ selectedIds: [] });
  }

  toSceneFile(): SceneFile {
    const used = new Set(this.elements.flatMap((el) => (el.fileId ? [el.fileId] : [])));
    const files: Files = {};
    for (const id of used) if (this.files[id]) files[id] = this.files[id];
    return {
      type: 'biyik-draw',
      version: 1,
      source: 'https://draw.biyik.dev',
      elements: this.elements,
      files,
      background: this.state.background,
    };
  }

  /** Yazı tipleri yüklendikten sonra metin kutularını yeniden ölçer. */
  remeasureText() {
    let changed = false;
    const next = this.elements.map((el) => {
      if (el.type !== 'text') return el;
      const fit = this.fitText(el, el.text ?? '');
      if (Math.abs(fit.width - el.width) < 0.5 && Math.abs(fit.height - el.height) < 0.5) return el;
      changed = true;
      return { ...el, ...fit };
    });
    if (changed) this.elements = syncBindings(this.elements, next);
    this.emit(changed);
  }

  /* ───────────── Seçim ───────────── */

  selectedElements(): SketchElement[] {
    const ids = new Set(this.state.selectedIds);
    return this.elements.filter((el) => ids.has(el.id));
  }

  getElement(id: string | null) {
    return id ? this.elements.find((el) => el.id === id) ?? null : null;
  }

  private expandGroups(ids: Iterable<string>): string[] {
    const set = new Set(ids);
    const groups = new Set(
      this.elements.filter((el) => set.has(el.id) && el.groupId).map((el) => el.groupId as string),
    );
    if (groups.size) for (const el of this.elements) if (el.groupId && groups.has(el.groupId)) set.add(el.id);
    return this.elements.filter((el) => set.has(el.id) && interactive(el)).map((el) => el.id);
  }

  select(ids: string[]) {
    this.setState({ selectedIds: this.expandGroups(ids).filter((id) => interactive(this.getElement(id))) });
  }

  /** Grupları genişletmeden seç (katmanlar panelinden tek öğe seçimi). */
  selectExact(ids: string[]) {
    this.setState({ tool: 'select', selectedIds: ids.filter((id) => interactive(this.getElement(id))) });
  }

  visibleElements() {
    return this.elements.filter((el) => !el.hidden);
  }

  /* ───────────── Katmanlar ───────────── */

  setHidden(ids: string[], hidden: boolean) {
    const set = new Set(ids);
    this.commit(this.elements.map((el) => (set.has(el.id) ? bump(el, { hidden }) : el)));
    if (hidden) this.setState({ selectedIds: this.state.selectedIds.filter((id) => !set.has(id)) });
  }

  setLocked(ids: string[], locked: boolean) {
    const set = new Set(ids);
    this.commit(this.elements.map((el) => (set.has(el.id) ? bump(el, { locked }) : el)));
    if (locked) this.setState({ selectedIds: this.state.selectedIds.filter((id) => !set.has(id)) });
  }

  /** Seçimi kilitle / kilidi aç (seçim kilitli öğe içeremeyeceği için yalnız kilitler). */
  lockSelected() {
    if (this.state.selectedIds.length) this.setLocked(this.state.selectedIds, true);
  }

  rename(id: string, name: string) {
    const el = this.getElement(id);
    if (!el || (el.name ?? '') === name) return;
    this.commit(this.replace([bump(el, { name: name.trim() || undefined })]));
  }

  /** Öğeleri (göreli sıralarını koruyarak) hedef öğenin üstüne ya da altına taşır. */
  placeLayers(ids: string[], targetId: string, where: 'above' | 'below') {
    const set = new Set(ids);
    if (set.has(targetId)) return;
    const moving = this.elements.filter((el) => set.has(el.id));
    const rest = this.elements.filter((el) => !set.has(el.id));
    const idx = rest.findIndex((el) => el.id === targetId);
    if (idx < 0 || !moving.length) return;
    const at = where === 'above' ? idx + 1 : idx;
    this.commit([...rest.slice(0, at), ...moving, ...rest.slice(at)]);
  }

  /* ───────────── Hizalama, dağıtma, çevirme ───────────── */

  /** Seçimi birimlere ayırır: grup tek birim, diğerleri tek tek. */
  private selectionUnits(): SketchElement[][] {
    const units = new Map<string, SketchElement[]>();
    for (const el of this.selectedElements()) {
      const key = el.groupId ?? el.id;
      if (!units.has(key)) units.set(key, []);
      units.get(key)!.push(el);
    }
    return [...units.values()];
  }

  private moveUnits(moves: Map<SketchElement[], Point>) {
    const delta = new Map<string, Point>();
    for (const [unit, d] of moves) for (const el of unit) delta.set(el.id, d);
    const ids = new Set(this.state.selectedIds);
    this.commit(
      this.elements.map((el) => {
        const d = delta.get(el.id);
        return d && (d[0] || d[1]) ? bump(el, { x: el.x + d[0], y: el.y + d[1], ...keepBindings(el, ids) }) : el;
      }),
    );
  }

  align(kind: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') {
    const units = this.selectionUnits();
    if (units.length < 2) return;
    const all = commonBounds(units.flat())!;
    const moves = new Map<SketchElement[], Point>();
    for (const unit of units) {
      const b = commonBounds(unit)!;
      let dx = 0;
      let dy = 0;
      if (kind === 'left') dx = all[0] - b[0];
      if (kind === 'right') dx = all[2] - b[2];
      if (kind === 'hcenter') dx = (all[0] + all[2]) / 2 - (b[0] + b[2]) / 2;
      if (kind === 'top') dy = all[1] - b[1];
      if (kind === 'bottom') dy = all[3] - b[3];
      if (kind === 'vcenter') dy = (all[1] + all[3]) / 2 - (b[1] + b[3]) / 2;
      moves.set(unit, [dx, dy]);
    }
    this.moveUnits(moves);
  }

  /** Birimleri aralarındaki boşluklar eşit olacak şekilde dağıtır. */
  distribute(axis: 'x' | 'y') {
    const units = this.selectionUnits();
    if (units.length < 3) return;
    const lo = axis === 'x' ? 0 : 1;
    const hi = axis === 'x' ? 2 : 3;
    const items = units
      .map((unit) => ({ unit, b: commonBounds(unit)! }))
      .sort((a, b) => a.b[lo] + a.b[hi] - (b.b[lo] + b.b[hi]));
    const span = items[items.length - 1].b[hi] - items[0].b[lo];
    const sizes = items.reduce((sum, it) => sum + (it.b[hi] - it.b[lo]), 0);
    const gap = (span - sizes) / (items.length - 1);
    let cursor = items[0].b[lo];
    const moves = new Map<SketchElement[], Point>();
    for (const it of items) {
      const d = cursor - it.b[lo];
      moves.set(it.unit, axis === 'x' ? [d, 0] : [0, d]);
      cursor += it.b[hi] - it.b[lo] + gap;
    }
    this.moveUnits(moves);
  }

  /** Seçimi yatay ya da dikey eksende aynalar. */
  flip(axis: 'x' | 'y') {
    const sel = this.selectedElements();
    const b = commonBounds(sel);
    if (!b) return;
    const fx = (b[0] + b[2]) / 2;
    const fy = (b[1] + b[3]) / 2;
    const ids = new Set(sel.map((el) => el.id));
    this.commit(
      this.elements.map((el) => {
        if (!ids.has(el.id)) return el;
        const [cx, cy] = center(el);
        const nc: Point = axis === 'x' ? [2 * fx - cx, cy] : [cx, 2 * fy - cy];
        const patch: Partial<SketchElement> = { x: nc[0] - el.width / 2, y: nc[1] - el.height / 2 };
        if (hasPoints(el) && el.points) {
          patch.points = el.points.map(([px, py]) => (axis === 'x' ? [el.width - px, py] : [px, el.height - py]));
          patch.angle = normalizeAngle(-el.angle);
        } else if (el.type === 'triangle' && axis === 'y') {
          // Üçgen yalnızca dikey eksene göre simetrik: dikey aynalama = 180° döndürme
          patch.angle = normalizeAngle(Math.PI - el.angle);
        } else {
          patch.angle = normalizeAngle(-el.angle);
        }
        return bump(el, patch);
      }),
    );
  }

  private copiedStyle: Partial<StyleProps> | null = null;

  copyStyle() {
    const el = this.selectedElements()[0];
    if (!el) return;
    const keys = Object.keys(DEFAULT_STYLE) as (keyof StyleProps)[];
    this.copiedStyle = Object.fromEntries(keys.map((k) => [k, el[k]])) as Partial<StyleProps>;
  }

  pasteStyle() {
    if (this.copiedStyle && this.state.selectedIds.length) this.setStyle(this.copiedStyle);
  }

  selectAll() {
    this.setState({ tool: 'select', selectedIds: this.elements.filter(interactive).map((el) => el.id) });
  }

  deleteSelected() {
    const ids = new Set(this.state.selectedIds);
    if (!ids.size) return;
    this.commit(this.elements.filter((el) => !ids.has(el.id)));
    this.setState({ selectedIds: [] });
  }

  private cloneElements(els: SketchElement[], offset: Point): SketchElement[] {
    const groupMap = new Map<string, string>();
    const idMap = new Map(els.map((el) => [el.id, randomId()]));
    return els.map((el) => {
      let groupId = el.groupId ?? null;
      if (groupId) {
        if (!groupMap.has(groupId)) groupMap.set(groupId, randomId());
        groupId = groupMap.get(groupId)!;
      }
      return {
        ...el,
        id: idMap.get(el.id)!,
        seed: randomSeed(),
        version: 1,
        startBinding: el.startBinding ? idMap.get(el.startBinding) ?? null : null,
        endBinding: el.endBinding ? idMap.get(el.endBinding) ?? null : null,
        x: el.x + offset[0],
        y: el.y + offset[1],
        groupId,
        points: el.points?.map((p) => [...p] as Point),
      };
    });
  }

  duplicateSelected() {
    const sel = this.selectedElements();
    if (!sel.length) return;
    const clones = this.cloneElements(sel, [12, 12]);
    this.commit([...this.elements, ...clones]);
    this.setState({ selectedIds: clones.map((el) => el.id) });
  }

  group() {
    const sel = this.state.selectedIds;
    if (sel.length < 2) return;
    const groupId = randomId();
    const ids = new Set(sel);
    this.commit(this.elements.map((el) => (ids.has(el.id) ? bump(el, { groupId }) : el)));
  }

  ungroup() {
    const ids = new Set(this.state.selectedIds);
    if (!this.elements.some((el) => ids.has(el.id) && el.groupId)) return;
    this.commit(this.elements.map((el) => (ids.has(el.id) && el.groupId ? bump(el, { groupId: null }) : el)));
  }

  reorder(kind: 'front' | 'back' | 'forward' | 'backward') {
    const ids = new Set(this.state.selectedIds);
    if (!ids.size) return;
    let next = [...this.elements];
    if (kind === 'front') next = [...next.filter((e) => !ids.has(e.id)), ...next.filter((e) => ids.has(e.id))];
    else if (kind === 'back') next = [...next.filter((e) => ids.has(e.id)), ...next.filter((e) => !ids.has(e.id))];
    else if (kind === 'forward') {
      for (let i = next.length - 2; i >= 0; i--)
        if (ids.has(next[i].id) && !ids.has(next[i + 1].id)) [next[i], next[i + 1]] = [next[i + 1], next[i]];
    } else {
      for (let i = 1; i < next.length; i++)
        if (ids.has(next[i].id) && !ids.has(next[i - 1].id)) [next[i], next[i - 1]] = [next[i - 1], next[i]];
    }
    this.commit(next);
  }

  nudge(dx: number, dy: number) {
    const ids = new Set(this.state.selectedIds);
    if (!ids.size) return;
    this.commit(
      this.elements.map((el) => (ids.has(el.id) ? bump(el, { x: el.x + dx, y: el.y + dy, ...keepBindings(el, ids) }) : el)),
      'nudge',
    );
  }

  /* ───────────── Pano ───────────── */

  copySelection(): string | null {
    const sel = this.selectedElements();
    if (!sel.length) return null;
    const files: Files = {};
    for (const el of sel) if (el.fileId && this.files[el.fileId]) files[el.fileId] = this.files[el.fileId];
    return JSON.stringify({ type: CLIPBOARD_TYPE, elements: sel, files });
  }

  cutSelection(): string | null {
    const data = this.copySelection();
    if (data) this.deleteSelected();
    return data;
  }

  /** Panodan gelen metni yapıştırır: kendi öğelerimiz ya da düz metin. */
  pasteText(text: string): boolean {
    if (this.state.readOnly) return false;
    try {
      const data = JSON.parse(text);
      if (data?.type === CLIPBOARD_TYPE && Array.isArray(data.elements)) {
        this.pasteElements(data.elements, data.files ?? {});
        return true;
      }
      if (data?.type === 'biyik-draw' && Array.isArray(data.elements)) {
        this.pasteElements(data.elements, data.files ?? {});
        return true;
      }
    } catch {
      /* düz metin */
    }
    if (!text.trim()) return false;
    const at = this.pointerWorld ?? this.viewportCenterWorld();
    const el = this.newElement('text', at, { text });
    const fit = this.fitText(el, text);
    const placed = { ...el, ...fit, x: at[0] - fit.width / 2, y: at[1] - fit.height / 2 };
    this.commit([...this.elements, placed]);
    this.setState({ selectedIds: [placed.id], tool: 'select' });
    return true;
  }

  pasteElements(els: SketchElement[], files: Files, opts: { beside?: boolean } = {}) {
    const b = commonBounds(els);
    if (!b) return;
    let at = this.pointerWorld ?? this.viewportCenterWorld();
    // Yanına yerleştir: mevcut çizimlerle üst üste binmesin
    const own = opts.beside ? commonBounds(this.visibleElements()) : null;
    if (own) at = [own[2] + 80 + (b[2] - b[0]) / 2, (own[1] + own[3]) / 2];
    const offset: Point = [at[0] - (b[0] + b[2]) / 2, at[1] - (b[1] + b[3]) / 2];
    const clones = this.cloneElements(els, offset);
    Object.assign(this.files, files);
    this.commit([...this.elements, ...clones]);
    this.setState({ selectedIds: clones.map((el) => el.id), tool: 'select' });
  }

  /* ───────────── Görsel ───────────── */

  async insertImageFile(file: File, at?: Point | null) {
    if (this.state.readOnly) return;
    const dataUrl = await readImage(file);
    if (!dataUrl) return;
    const img = await loadImage(dataUrl.url);
    const fileId = randomId();
    this.files[fileId] = dataUrl.url;
    const { zoom } = this.state.view;
    const maxW = (this.state.viewport.width * 0.5) / zoom;
    const maxH = (this.state.viewport.height * 0.5) / zoom;
    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const c = at ?? this.pointerWorld ?? this.viewportCenterWorld();
    const el = this.newElement('image', [c[0] - w / 2, c[1] - h / 2], { width: w, height: h, fileId });
    this.commit([...this.elements, el]);
    this.setState({ selectedIds: [el.id], tool: 'select' });
  }

  /* ───────────── Metin düzenleme ───────────── */

  private fitText(el: SketchElement, text: string) {
    const m = measureText(text || ' ', el.fontSize, el.fontFamily);
    // Hizalamaya göre sabit kalan kenar
    const anchorX = el.textAlign === 'left' ? el.x : el.textAlign === 'right' ? el.x + el.width : el.x + el.width / 2;
    const x = el.textAlign === 'left' ? anchorX : el.textAlign === 'right' ? anchorX - m.width : anchorX - m.width / 2;
    return { x, width: m.width, height: m.height };
  }

  startEditing(id: string) {
    const el = this.getElement(id);
    if (!el || !(el.type === 'text' || isShape(el))) return;
    this.editSnapshot = this.elements;
    this.setState({ editingId: id, selectedIds: el.type === 'text' ? [] : [id] });
  }

  updateText(id: string, text: string) {
    const el = this.getElement(id);
    if (!el) return;
    const next = el.type === 'text' ? bump(el, { text, ...this.fitText(el, text) }) : bump(el, { text });
    this.setElementsLive(this.replace([next]));
  }

  finishEditing() {
    const id = this.state.editingId;
    if (!id) return;
    const el = this.getElement(id);
    let next = this.elements;
    if (el?.type === 'text' && !(el.text ?? '').trim()) next = next.filter((e) => e.id !== id);
    if (el && isShape(el) && !(el.text ?? '').trim() && el.text) next = this.replace([bump(el, { text: '' })]);
    const snapshot = this.editSnapshot;
    this.editSnapshot = null;
    this.elements = next;
    if (snapshot && snapshot !== next) this.record(snapshot);
    const kept = next.some((e) => e.id === id);
    this.state = {
      ...this.state,
      editingId: null,
      selectedIds: kept ? [id] : [],
      tool: this.state.toolLocked ? this.state.tool : 'select',
    };
    this.emit(true);
  }

  /* ───────────── Öğe oluşturma ───────────── */

  private newElement(type: SketchElement['type'], [x, y]: Point, extra: Partial<SketchElement> = {}): SketchElement {
    const style = this.state.style;
    return {
      ...style,
      ...(isShape({ type }) ? { textAlign: 'center' as const } : {}),
      ...(type === 'line' ? { startArrowhead: 'none' as const, endArrowhead: 'none' as const } : {}),
      id: randomId(),
      type,
      x,
      y,
      width: 0,
      height: 0,
      angle: 0,
      seed: randomSeed(),
      version: 1,
      groupId: null,
      ...extra,
    };
  }

  private snap(p: Point): Point {
    if (!this.state.grid) return p;
    return [Math.round(p[0] / GRID_SIZE) * GRID_SIZE, Math.round(p[1] / GRID_SIZE) * GRID_SIZE];
  }

  /* ───────────── Seçim çerçevesi ve tutamaçlar ───────────── */

  getFrame(): Frame | null {
    const sel = this.selectedElements();
    if (!sel.length) return null;
    if (sel.length === 1) {
      const el = sel[0];
      return { cx: el.x + el.width / 2, cy: el.y + el.height / 2, w: el.width, h: el.height, angle: el.angle };
    }
    const b = commonBounds(sel)!;
    return { cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, w: b[2] - b[0], h: b[3] - b[1], angle: 0 };
  }

  private handlePositions(): { hit: HandleHit; p: Point }[] {
    if (this.state.tool !== 'select' || this.state.editingId) return [];
    const sel = this.selectedElements();
    const frame = this.getFrame();
    if (!frame || !sel.length) return [];
    const out: { hit: HandleHit; p: Point }[] = [];
    const single = sel.length === 1 ? sel[0] : null;

    if (single && isLinear(single)) {
      (single.points ?? []).forEach((pt, index) => out.push({ hit: { kind: 'point', index }, p: toWorld(single, pt) }));
      if ((single.points?.length ?? 0) <= 2) return out;
    }

    const { zoom } = this.state.view;
    const pad = 6 / zoom;
    const { cx, cy, w, h, angle } = frame;
    const hw = w / 2 + pad;
    const hh = h / 2 + pad;
    const cornersOnly = !!single && (single.type === 'text' || single.type === 'image');
    const tinyX = w * zoom < 24;
    const tinyY = h * zoom < 24;
    const local: [ResizeHandle, number, number][] = [
      ['nw', -hw, -hh],
      ['ne', hw, -hh],
      ['se', hw, hh],
      ['sw', -hw, hh],
    ];
    if (!cornersOnly) {
      if (!tinyX) local.push(['n', 0, -hh], ['s', 0, hh]);
      if (!tinyY) local.push(['e', hw, 0], ['w', -hw, 0]);
    }
    const toW = (lx: number, ly: number) => rotatePoint([cx + lx, cy + ly], [cx, cy], angle);
    for (const [handle, lx, ly] of local) out.push({ hit: { kind: 'resize', handle }, p: toW(lx, ly) });
    out.push({ hit: { kind: 'rotate' }, p: toW(0, -hh - 22 / zoom) });
    return out;
  }

  private hitHandle(sx: number, sy: number): HandleHit | null {
    const r = this.pointerType === 'touch' ? 16 : 9;
    let best: HandleHit | null = null;
    let bestD = Infinity;
    for (const { hit, p } of this.handlePositions()) {
      const [hx, hy] = this.toScreen(p);
      const d = Math.hypot(hx - sx, hy - sy);
      if (d <= r && d < bestD) {
        best = hit;
        bestD = d;
      }
    }
    return best;
  }

  private hitElement(world: Point): SketchElement | null {
    return this.hitInteractive(world);
  }

  private hitInteractive(world: Point): SketchElement | null {
    const tol = (this.pointerType === 'touch' ? 14 : 8) / this.state.view.zoom;
    const selected = new Set(this.state.selectedIds);
    // Seçili öğenin kutusu içindeyse, sürüklemeye o öğe öncelikli
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (!selected.has(el.id)) continue;
      const [lx, ly] = toLocal(el, world);
      if (lx >= -tol && ly >= -tol && lx <= el.width + tol && ly <= el.height + tol) return el;
    }
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (interactive(el) && hitTest(el, world, tol)) return el;
    }
    return null;
  }

  /** Metin/etiket düzenlemek için: önce metin öğesi, sonra içi dolu ya da boş şekil. */
  private textTargetAt(world: Point): SketchElement | null {
    const hit = this.hitElement(world);
    if (hit && (hit.type === 'text' || isShape(hit))) return hit;
    if (hit) return null;
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (!isShape(el) || !interactive(el)) continue;
      const poly = outlinePolygon(el);
      if (poly && pointInPolygon(toLocal(el, world), poly)) return el;
    }
    return null;
  }

  getOverlay(): Overlay {
    const sel = this.selectedElements();
    const frame = this.state.tool === 'select' && !this.state.editingId ? this.getFrame() : null;
    const single = sel.length === 1 ? sel[0] : null;
    const linearSimple = single && isLinear(single) && (single.points?.length ?? 0) <= 2;
    const d = this.drag;
    return {
      frame: linearSimple || (d && d.kind === 'marquee') ? null : frame,
      outlines: sel.length > 1 ? sel : [],
      handles:
        d && (d.kind === 'move' || d.kind === 'marquee')
          ? []
          : this.handlePositions().map(({ hit, p }) => ({
              x: p[0],
              y: p[1],
              kind: hit.kind === 'resize' ? 'square' : hit.kind === 'point' ? 'point' : 'circle',
            })),
      marquee: d?.kind === 'marquee' ? [d.start, d.current] : null,
      hovered: !d && this.hoverId && !this.state.selectedIds.includes(this.hoverId) ? this.getElement(this.hoverId) : null,
      erasing: this.erasing,
      bindTarget: this.getElement(this.bindTarget),
      editingId: this.state.editingId,
    };
  }

  /* ───────────── İşaretçi ───────────── */

  pointerDown(p: PointerInput) {
    this.pointerType = p.type;
    this.pointers.set(p.id, [p.x, p.y]);
    const world = this.toWorld(p.x, p.y);
    this.pointerWorld = world;

    if (this.pointers.size === 2) {
      this.cancelDrag();
      const [a, b] = [...this.pointers.values()];
      const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      this.drag = {
        kind: 'pinch',
        dist: Math.hypot(a[0] - b[0], a[1] - b[1]),
        zoom: this.state.view.zoom,
        worldMid: this.toWorld(mid[0], mid[1]),
      };
      return;
    }
    if (this.pointers.size > 2) return;

    if (this.state.readOnly) {
      const { scrollX, scrollY } = this.state.view;
      this.drag = { kind: 'pan', sx: p.x, sy: p.y, scrollX, scrollY };
      this.cursor = 'grabbing';
      this.emit();
      return;
    }

    if (this.state.editingId) this.finishEditing();

    const { tool } = this.state;
    if (p.button === 1 || (p.button === 0 && (this.spaceDown || tool === 'hand'))) {
      const { scrollX, scrollY } = this.state.view;
      this.drag = { kind: 'pan', sx: p.x, sy: p.y, scrollX, scrollY };
      this.cursor = 'grabbing';
      this.emit();
      return;
    }
    if (p.button !== 0) return;

    this.dragSnapshot = this.elements;
    switch (tool) {
      case 'select':
        return this.startSelect(p, world);
      case 'rectangle':
      case 'diamond':
      case 'triangle':
      case 'ellipse': {
        const origin = this.snap(world);
        const el = this.newElement(tool, origin);
        this.drag = { kind: 'create', id: el.id, origin };
        this.setElementsLive([...this.elements, el]);
        this.setState({ selectedIds: [] });
        return;
      }
      case 'line':
      case 'arrow':
        return this.linearDown(p, world, tool);
      case 'freedraw': {
        const el = this.newElement('freedraw', world, { points: [[0, 0]] });
        this.drag = { kind: 'freedraw', id: el.id, world: [world] };
        this.setElementsLive([...this.elements, el]);
        return;
      }
      case 'text': {
        const target = this.textTargetAt(world);
        if (target) this.startEditing(target.id);
        else this.createTextAt(world);
        return;
      }
      case 'eraser':
        this.drag = { kind: 'erase', last: world };
        this.eraseAlong(world, world);
        return;
    }
  }

  private createTextAt(world: Point) {
    const at = this.snap(world);
    const lh = this.state.style.fontSize * LINE_HEIGHT;
    const el = this.newElement('text', [at[0], at[1] - lh / 2], { text: '' });
    const fit = this.fitText(el, '');
    const placed = { ...el, width: fit.width, height: fit.height };
    this.editSnapshot = this.elements;
    this.elements = [...this.elements, placed];
    this.state = { ...this.state, editingId: placed.id, selectedIds: [] };
    this.emit(true);
  }

  private startSelect(p: PointerInput, world: Point) {
    const handle = this.hitHandle(p.x, p.y);
    const sel = this.selectedElements();
    if (handle && sel.length) {
      if (handle.kind === 'point') {
        const el = sel[0];
        this.drag = { kind: 'point', id: el.id, index: handle.index, original: el };
        return;
      }
      const frame = this.getFrame()!;
      if (handle.kind === 'rotate') {
        this.drag = {
          kind: 'rotate',
          frame,
          startAngle: Math.atan2(world[1] - frame.cy, world[0] - frame.cx),
          originals: sel,
        };
        return;
      }
      this.drag = {
        kind: 'resize',
        handle: handle.handle,
        frame,
        originals: sel,
        keepAspect: sel.some((el) => el.type === 'text' || el.type === 'image'),
      };
      return;
    }

    const hit = this.hitElement(world);
    if (hit) {
      const ids = this.expandGroups([hit.id]);
      const selected = new Set(this.state.selectedIds);
      const already = selected.has(hit.id);
      if (p.shift) {
        if (already) ids.forEach((id) => selected.delete(id));
        else ids.forEach((id) => selected.add(id));
        this.setState({ selectedIds: [...selected] });
        if (already) return;
      } else if (!already) {
        this.setState({ selectedIds: ids });
      }
      const originals = new Map(this.selectedElements().map((el) => [el.id, el]));
      this.drag = { kind: 'move', start: world, originals, duplicate: p.alt, moved: false };
      return;
    }

    const base = p.shift ? this.state.selectedIds : [];
    if (!p.shift) this.setState({ selectedIds: [] });
    this.drag = { kind: 'marquee', start: world, current: world, base };
  }

  private linearDown(p: PointerInput, world: Point, tool: 'line' | 'arrow') {
    if (this.pending) {
      const el = this.getElement(this.pending.id);
      if (!el) {
        this.pending = null;
      } else {
        const pts = (el.points ?? []).map((pt) => toWorld(el, pt));
        const fixed = pts[pts.length - 2];
        const [fx, fy] = this.toScreen(fixed);
        if (Math.hypot(fx - p.x, fy - p.y) < 10) {
          this.finishPending();
          return;
        }
        const at = this.snap(world);
        pts[pts.length - 1] = at;
        pts.push(at);
        this.setElementsLive(this.replace([recomputeArrow(bump(el, rebuildFromWorldPoints(el, pts)), this.byId())]));
        return;
      }
    }
    const origin = this.snap(world);
    const el = this.newElement(tool, origin, { points: [[0, 0], [0, 0]] });
    const startBind = this.bindCandidate(el, world, null);
    this.drag = { kind: 'linear', id: el.id, origin, startScreen: [p.x, p.y], startBind };
    this.setElementsLive([...this.elements, el]);
    this.setState({ selectedIds: [] });
  }

  private finishPending() {
    if (!this.pending) return;
    const { id, snapshot } = this.pending;
    this.pending = null;
    const el = this.getElement(id);
    if (!el) return;
    const pts = (el.points ?? []).map((pt) => toWorld(el, pt)).slice(0, -1);
    this.bindTarget = null;
    let next: SketchElement[];
    if (pts.length < 2) next = this.elements.filter((e) => e.id !== id);
    else {
      const endBinding = this.bindCandidate(el, pts[pts.length - 1], el.startBinding);
      next = this.replace([recomputeArrow(bump(el, { ...rebuildFromWorldPoints(el, pts), endBinding }), this.byId())]);
    }
    this.elements = syncBindings(this.elements, next);
    this.record(snapshot);
    const kept = next.some((e) => e.id === id);
    this.state = {
      ...this.state,
      selectedIds: kept && !this.state.toolLocked ? [id] : [],
      tool: this.state.toolLocked ? this.state.tool : 'select',
    };
    this.emit(true);
  }

  pointerMove(p: PointerInput) {
    this.pointerType = p.type;
    if (this.pointers.has(p.id)) this.pointers.set(p.id, [p.x, p.y]);
    const world = this.toWorld(p.x, p.y);
    this.pointerWorld = world;
    const d = this.drag;

    if (!d) {
      if (this.pending) {
        const el = this.getElement(this.pending.id);
        if (el) {
          const pts = (el.points ?? []).map((pt) => toWorld(el, pt));
          let at = this.snap(world);
          if (p.shift && pts.length > 1) at = this.constrainAngle(pts[pts.length - 2], at);
          pts[pts.length - 1] = at;
          const endBinding = this.bindCandidate(el, at, el.startBinding);
          this.bindTarget = endBinding;
          this.elements = this.replace([
            recomputeArrow(bump(el, { ...rebuildFromWorldPoints(el, pts), endBinding }), this.byId()),
          ]);
          this.emit();
        }
        return;
      }
      this.updateHover(p, world);
      return;
    }

    switch (d.kind) {
      case 'pinch': {
        const pts = [...this.pointers.values()];
        if (pts.length < 2) return;
        const [a, b] = pts;
        const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, d.zoom * (Math.hypot(a[0] - b[0], a[1] - b[1]) / d.dist)));
        this.setState({
          view: { zoom, scrollX: mid[0] / zoom - d.worldMid[0], scrollY: mid[1] / zoom - d.worldMid[1] },
        });
        return;
      }
      case 'pan': {
        const { zoom } = this.state.view;
        this.setState({
          view: { zoom, scrollX: d.scrollX + (p.x - d.sx) / zoom, scrollY: d.scrollY + (p.y - d.sy) / zoom },
        });
        return;
      }
      case 'create': {
        const el = this.getElement(d.id);
        if (!el) return;
        const [ox, oy] = d.origin;
        const [px, py] = this.snap(world);
        let w = px - ox;
        let h = py - oy;
        if (p.shift) {
          const s = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w || 1) * s;
          h = Math.sign(h || 1) * s;
        }
        let x = Math.min(ox, ox + w);
        let y = Math.min(oy, oy + h);
        let width = Math.abs(w);
        let height = Math.abs(h);
        if (p.alt) {
          x = ox - width;
          y = oy - height;
          width *= 2;
          height *= 2;
        }
        this.setElementsLive(this.replace([bump(el, { x, y, width, height })]));
        return;
      }
      case 'linear': {
        const el = this.getElement(d.id);
        if (!el) return;
        let at = this.snap(world);
        if (p.shift) at = this.constrainAngle(d.origin, at);
        const endBinding = this.bindCandidate(el, at, d.startBind);
        this.bindTarget = endBinding;
        const next = bump(el, {
          ...rebuildFromWorldPoints({ ...el, angle: 0 }, [d.origin, at]),
          startBinding: d.startBind,
          endBinding,
        });
        this.setElementsLive(this.replace([recomputeArrow(next, this.byId())]));
        return;
      }
      case 'freedraw': {
        const el = this.getElement(d.id);
        if (!el) return;
        const last = d.world[d.world.length - 1];
        if (Math.hypot(world[0] - last[0], world[1] - last[1]) * this.state.view.zoom < 1.5) return;
        d.world.push(world);
        this.setElementsLive(this.replace([bump(el, rebuildFromWorldPoints({ ...el, angle: 0 }, d.world))]));
        return;
      }
      case 'move': {
        let dx = world[0] - d.start[0];
        let dy = world[1] - d.start[1];
        if (!d.moved && Math.hypot(dx, dy) * this.state.view.zoom < 2) return;
        if (p.shift) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        if (!d.moved && d.duplicate) {
          // Alt ile sürükleme: kopyalar yerinde kalır, asıllar taşınır
          const clones = this.cloneElements([...d.originals.values()], [0, 0]);
          const idx = this.elements.findIndex((e) => d.originals.has(e.id));
          const next = [...this.elements];
          next.splice(idx, 0, ...clones);
          this.elements = next;
        }
        d.moved = true;
        if (this.state.grid) {
          const first = [...d.originals.values()][0];
          const [sx, sy] = this.snap([first.x + dx, first.y + dy]);
          dx = sx - first.x;
          dy = sy - first.y;
        }
        this.setElementsLive(
          this.elements.map((el) => {
            const o = d.originals.get(el.id);
            return o ? bump(o, { x: o.x + dx, y: o.y + dy, ...keepBindings(o, d.originals) }) : el;
          }),
        );
        return;
      }
      case 'resize':
        return this.applyResize(d, world, p.shift, p.alt);
      case 'rotate': {
        const { cx, cy } = d.frame;
        let delta = Math.atan2(world[1] - cy, world[0] - cx) - d.startAngle;
        const single = d.originals.length === 1;
        if (single) {
          const o = d.originals[0];
          let angle = normalizeAngle(o.angle + delta);
          if (p.shift) angle = normalizeAngle(snapAngle(angle));
          this.setElementsLive(this.replace([bump(o, { angle })]));
          return;
        }
        if (p.shift) delta = snapAngle(delta);
        this.setElementsLive(
          this.replace(
            d.originals.map((o) => {
              const c = rotatePoint(center(o), [cx, cy], delta);
              return bump(o, {
                x: c[0] - o.width / 2,
                y: c[1] - o.height / 2,
                angle: normalizeAngle(o.angle + delta),
              });
            }),
          ),
        );
        return;
      }
      case 'point': {
        const o = d.original;
        const pts = (o.points ?? []).map((pt) => toWorld(o, pt));
        let at = this.snap(world);
        const neighbor = pts[d.index === 0 ? 1 : d.index - 1];
        if (p.shift && neighbor) at = this.constrainAngle(neighbor, at);
        pts[d.index] = at;
        const patch: Partial<SketchElement> = rebuildFromWorldPoints(o, pts);
        if (d.index === 0) patch.startBinding = this.bindCandidate(o, at, o.endBinding);
        else if (d.index === pts.length - 1) patch.endBinding = this.bindCandidate(o, at, o.startBinding);
        this.bindTarget = d.index === 0 ? patch.startBinding ?? null : d.index === pts.length - 1 ? patch.endBinding ?? null : null;
        this.setElementsLive(this.replace([recomputeArrow(bump(o, patch), this.byId())]));
        return;
      }
      case 'marquee': {
        d.current = world;
        const box: [number, number, number, number] = [
          Math.min(d.start[0], world[0]),
          Math.min(d.start[1], world[1]),
          Math.max(d.start[0], world[0]),
          Math.max(d.start[1], world[1]),
        ];
        const inside = this.elements
          .filter((el) => interactive(el) && boundsContain(box, elementBounds(el)))
          .map((el) => el.id);
        this.setState({ selectedIds: this.expandGroups([...d.base, ...inside]) });
        return;
      }
      case 'erase':
        this.eraseAlong(d.last, world);
        d.last = world;
        return;
    }
  }

  pointerUp(p: PointerInput) {
    this.pointers.delete(p.id);
    const d = this.drag;
    if (!d) return;
    if (d.kind === 'pinch') {
      if (this.pointers.size === 0) this.drag = null;
      return;
    }
    this.drag = null;
    this.bindTarget = null;

    switch (d.kind) {
      case 'pan':
        this.updateCursor();
        break;
      case 'create': {
        const el = this.getElement(d.id);
        if (!el) break;
        if (el.width < 2 && el.height < 2) {
          this.elements = this.elements.filter((e) => e.id !== d.id);
          this.emit(true);
          break;
        }
        this.endCreation(el.id);
        break;
      }
      case 'linear': {
        const el = this.getElement(d.id);
        if (!el) break;
        const moved = Math.hypot(p.x - d.startScreen[0], p.y - d.startScreen[1]);
        if (moved < 5) {
          // Tıklayarak çok noktalı çizgi: sonraki tıklamalar nokta ekler
          const pts: Point[] = [d.origin, d.origin];
          this.elements = this.replace([
            bump(el, { ...rebuildFromWorldPoints({ ...el, angle: 0 }, pts), startBinding: d.startBind, endBinding: null }),
          ]);
          this.pending = { id: el.id, snapshot: this.dragSnapshot ?? this.elements };
          this.dragSnapshot = null;
          this.emit(true);
          return;
        }
        this.endCreation(el.id);
        break;
      }
      case 'freedraw':
        this.commitDrag();
        break;
      case 'erase': {
        if (this.erasing.size) {
          const ids = this.erasing;
          this.elements = syncBindings(this.elements, this.elements.filter((el) => !ids.has(el.id)));
          this.erasing = new Set();
          this.state = { ...this.state, selectedIds: this.state.selectedIds.filter((id) => !ids.has(id)) };
        }
        this.commitDrag();
        break;
      }
      default:
        this.commitDrag();
    }
    this.emit(true);
  }

  pointerCancel(p: PointerInput) {
    this.pointers.delete(p.id);
    if (this.pointers.size === 0 && this.drag?.kind === 'pinch') this.drag = null;
  }

  private endCreation(id: string) {
    this.commitDrag();
    const locked = this.state.toolLocked;
    this.state = {
      ...this.state,
      selectedIds: locked ? [] : [id],
      tool: locked ? this.state.tool : 'select',
    };
    this.updateCursor();
    this.emit(true);
  }

  private commitDrag() {
    if (this.dragSnapshot && this.dragSnapshot !== this.elements) this.record(this.dragSnapshot);
    this.dragSnapshot = null;
    this.coalesceKey = '';
  }

  private cancelDrag() {
    const d = this.drag;
    if (!d) return;
    if (this.dragSnapshot) this.elements = this.dragSnapshot;
    this.dragSnapshot = null;
    this.drag = null;
    this.erasing = new Set();
    this.emit(true);
  }

  private constrainAngle(origin: Point, p: Point): Point {
    const dx = p[0] - origin[0];
    const dy = p[1] - origin[1];
    const len = Math.hypot(dx, dy);
    const a = snapAngle(Math.atan2(dy, dx));
    return [origin[0] + Math.cos(a) * len, origin[1] + Math.sin(a) * len];
  }

  private eraseAlong(from: Point, to: Point) {
    const tol = (this.pointerType === 'touch' ? 12 : 6) / this.state.view.zoom;
    const steps = Math.max(1, Math.ceil((Math.hypot(to[0] - from[0], to[1] - from[1]) * this.state.view.zoom) / 4));
    let changed = false;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const pt: Point = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
      for (const el of this.elements) {
        if (this.erasing.has(el.id) || !interactive(el) || !hitTest(el, pt, tol)) continue;
        for (const id of this.expandGroups([el.id])) this.erasing.add(id);
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  private applyResize(d: Extract<Drag, { kind: 'resize' }>, world: Point, shift: boolean, alt: boolean) {
    const { cx, cy, w, h, angle } = d.frame;
    const q = rotatePoint(world, [cx, cy], -angle);
    const qx = q[0] - (cx - w / 2);
    const qy = q[1] - (cy - h / 2);
    const hx = d.handle.includes('e') ? 1 : d.handle.includes('w') ? -1 : 0;
    const hy = d.handle.includes('s') ? 1 : d.handle.includes('n') ? -1 : 0;

    // Sabit kalan kenar (alt: merkez) ve sürüklenen kenarın ilk konumu
    const ax = alt ? w / 2 : hx === 1 ? 0 : w;
    const ex = hx === 1 ? w : 0;
    const ay = alt ? h / 2 : hy === 1 ? 0 : h;
    const ey = hy === 1 ? h : 0;
    let sx = hx ? (qx - ax) / (ex - ax || 1) : 1;
    let sy = hy ? (qy - ay) / (ey - ay || 1) : 1;

    const keep = shift || d.keepAspect;
    if (keep) {
      if (hx && hy) {
        const s = Math.max(Math.abs(sx), Math.abs(sy));
        sx = Math.sign(sx || 1) * s;
        sy = Math.sign(sy || 1) * s;
      } else if (hx) sy = Math.abs(sx);
      else if (hy) sx = Math.abs(sy);
    }
    // Sıfıra inmesin
    const minScale = (size: number) => (size > 0 ? 1 / size : 1);
    if (Math.abs(sx) < minScale(w)) sx = Math.sign(sx || 1) * minScale(w);
    if (Math.abs(sy) < minScale(h)) sy = Math.sign(sy || 1) * minScale(h);

    const range = (has: number, a: number, e: number, size: number, s: number): [number, number] => {
      if (has) {
        const end = a + s * (e - a);
        const start = alt ? a - s * (e - a) : a;
        return [Math.min(start, end), Math.max(start, end)];
      }
      return [size / 2 - (size * Math.abs(s)) / 2, size / 2 + (size * Math.abs(s)) / 2];
    };
    const [x0, x1] = range(hx, ax, ex, w, sx);
    const [y0, y1] = range(hy, ay, ey, h, sy);
    const newCenter = rotatePoint([cx - w / 2 + (x0 + x1) / 2, cy - h / 2 + (y0 + y1) / 2], [cx, cy], angle);

    const scaleEl = (o: SketchElement, c: Point, width: number, height: number): SketchElement => {
      const patch: Partial<SketchElement> = { x: c[0] - width / 2, y: c[1] - height / 2, width, height };
      if (hasPoints(o) && o.points)
        patch.points = o.points.map(([px, py]) => [
          (sx < 0 ? o.width - px : px) * Math.abs(sx),
          (sy < 0 ? o.height - py : py) * Math.abs(sy),
        ]);
      if (o.type === 'text') patch.fontSize = Math.max(4, o.fontSize * Math.abs(sy));
      return bump(o, patch);
    };

    if (d.originals.length === 1) {
      const o = d.originals[0];
      this.setElementsLive(this.replace([scaleEl(o, newCenter, Math.abs(x1 - x0), Math.abs(y1 - y0))]));
      return;
    }
    this.setElementsLive(
      this.replace(
        d.originals.map((o) => {
          const c = center(o);
          const nc: Point = [newCenter[0] + (c[0] - cx) * sx, newCenter[1] + (c[1] - cy) * sy];
          return scaleEl(o, nc, o.width * Math.abs(sx), o.height * Math.abs(sy));
        }),
      ),
    );
  }

  private updateHover(p: PointerInput, world: Point) {
    const prevHover = this.hoverId;
    const prevCursor = this.cursor;
    this.hoverId = null;
    if (this.spaceDown || this.state.tool === 'hand' || this.state.readOnly) this.cursor = 'grab';
    else if (this.state.tool === 'select') {
      const handle = this.hitHandle(p.x, p.y);
      if (handle?.kind === 'resize') {
        const deg = HANDLE_BASE_ANGLE[handle.handle] + ((this.getFrame()?.angle ?? 0) * 180) / Math.PI;
        this.cursor = RESIZE_CURSORS[Math.round((((deg % 180) + 180) % 180) / 45) % 4];
      } else if (handle?.kind === 'rotate') this.cursor = 'grab';
      else if (handle?.kind === 'point') this.cursor = 'pointer';
      else {
        const hit = this.hitElement(world);
        this.hoverId = hit?.id ?? null;
        this.cursor = hit ? 'move' : 'default';
      }
    } else this.updateCursor();
    if (prevHover !== this.hoverId || prevCursor !== this.cursor) this.emit();
  }

  private updateCursor() {
    const { tool } = this.state;
    this.cursor =
      this.spaceDown || tool === 'hand' || this.state.readOnly
        ? 'grab'
        : tool === 'select'
          ? 'default'
          : tool === 'text'
            ? 'text'
            : 'crosshair';
  }

  /* ───────────── Tekerlek, çift tıklama, klavye ───────────── */

  wheel(e: { x: number; y: number; dx: number; dy: number; ctrl: boolean; shift: boolean }) {
    if (e.ctrl) {
      const factor = Math.exp(-Math.max(-50, Math.min(50, e.dy)) * 0.01);
      this.zoomAt(this.state.view.zoom * factor, e.x, e.y);
      return;
    }
    if (e.shift && !e.dx) this.scrollBy(-e.dy, 0);
    else this.scrollBy(-e.dx, -e.dy);
  }

  doubleClick(sx: number, sy: number) {
    if (this.state.readOnly) return;
    if (this.pending) {
      this.finishPending();
      return;
    }
    if (this.state.tool !== 'select' && this.state.tool !== 'text') return;
    const world = this.toWorld(sx, sy);
    const target = this.textTargetAt(world);
    if (target) this.startEditing(target.id);
    else if (!this.hitElement(world)) this.createTextAt(world);
  }

  keyUp(e: KeyboardEvent) {
    if (e.key === ' ' && this.spaceDown) {
      this.spaceDown = false;
      this.updateCursor();
      this.emit();
    }
  }

  /** Kısayollar. İşlendiyse true döner. */
  keyDown(e: KeyboardEvent): boolean {
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();

    if (e.key === ' ') {
      if (!this.spaceDown) {
        this.spaceDown = true;
        this.cursor = 'grab';
        this.emit();
      }
      return true;
    }
    if (this.state.readOnly) {
      const zoomKey = mod && ['=', '+', '-', '0'].includes(key);
      if (!zoomKey && !(e.shiftKey && e.code === 'Digit1')) return false;
    }
    if (mod && key === 'z') {
      if (e.shiftKey) this.redo();
      else this.undo();
      return true;
    }
    if (mod && key === 'y') return this.redo(), true;
    if (mod && e.altKey && e.code === 'KeyC') return this.copyStyle(), true;
    if (mod && e.altKey && e.code === 'KeyV') return this.pasteStyle(), true;
    if (mod && e.shiftKey && e.code === 'KeyL') return this.lockSelected(), true;
    if (mod && key === 'a') return this.selectAll(), true;
    if (mod && key === 'd') return this.duplicateSelected(), true;
    if (mod && key === 'g') {
      if (e.shiftKey) this.ungroup();
      else this.group();
      return true;
    }
    if (mod && (e.code === 'BracketRight' || e.code === 'BracketLeft')) {
      const up = e.code === 'BracketRight';
      this.reorder(e.shiftKey ? (up ? 'front' : 'back') : up ? 'forward' : 'backward');
      return true;
    }
    if (mod && (key === '=' || key === '+')) return this.zoomBy(1.2), true;
    if (mod && key === '-') return this.zoomBy(1 / 1.2), true;
    if (mod && key === '0') return this.resetZoom(), true;
    if (mod && (key === "'" || e.code === 'Quote')) return this.toggleGrid(), true;
    if (e.shiftKey && e.code === 'Digit1') return this.zoomToFit(), true;
    if (e.shiftKey && e.code === 'Digit2') return this.zoomToFit(true), true;
    if (!mod && e.shiftKey && e.code === 'KeyH') return this.flip('x'), true;
    if (!mod && e.shiftKey && e.code === 'KeyV') return this.flip('y'), true;
    if (mod) return false;

    if (e.key === 'Delete' || e.key === 'Backspace') return this.deleteSelected(), true;
    if (e.key === 'Escape') {
      if (this.pending) this.finishPending();
      else if (this.drag) this.cancelDrag();
      else if (this.state.selectedIds.length) this.setState({ selectedIds: [] });
      else this.setTool('select');
      return true;
    }
    if (e.key === 'Enter') {
      if (this.pending) return this.finishPending(), true;
      const sel = this.selectedElements();
      if (sel.length === 1 && (sel[0].type === 'text' || isShape(sel[0]))) {
        this.startEditing(sel[0].id);
        return true;
      }
      return false;
    }
    if (e.key.startsWith('Arrow')) {
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      this.nudge(dx, dy);
      return true;
    }
    if (e.altKey || e.shiftKey) return false;
    const tools: Record<string, Tool> = {
      v: 'select',
      '1': 'select',
      h: 'hand',
      r: 'rectangle',
      '2': 'rectangle',
      d: 'diamond',
      '3': 'diamond',
      u: 'triangle',
      o: 'ellipse',
      '4': 'ellipse',
      a: 'arrow',
      '5': 'arrow',
      l: 'line',
      '6': 'line',
      p: 'freedraw',
      '7': 'freedraw',
      t: 'text',
      '8': 'text',
      '9': 'image',
      e: 'eraser',
      '0': 'eraser',
    };
    const tool = tools[key];
    if (tool) return this.setTool(tool), true;
    if (key === 'q') return this.toggleToolLock(), true;
    return false;
  }
}

/* ───────────── Yardımcılar ───────────── */

/** Tuvalde seçilebilir ve düzenlenebilir mi? */
const interactive = (el: SketchElement | null | undefined) => !!el && !el.hidden && !el.locked;

/**
 * Ok kendi başına taşınınca bağları çözülür; bağlı olduğu öğe de birlikte taşınıyorsa korunur.
 */
function keepBindings(el: SketchElement, moving: { has(id: string): boolean }): Partial<SketchElement> {
  if (el.type !== 'arrow') return {};
  return {
    startBinding: el.startBinding && moving.has(el.startBinding) ? el.startBinding : null,
    endBinding: el.endBinding && moving.has(el.endBinding) ? el.endBinding : null,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Görseli okur; çok büyükse 2048 px'e küçültür (tarayıcı belleği için). */
async function readImage(file: File): Promise<{ url: string } | null> {
  if (!file.type.startsWith('image/')) return null;
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return { url };
  const img = await loadImage(url);
  const max = 2048;
  if (img.width <= max && img.height <= max) return { url };
  const scale = max / Math.max(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { url: canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9) };
}

export { isShape, isLinear };
