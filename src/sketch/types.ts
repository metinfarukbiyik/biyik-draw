/**
 * biyik.dev Sketch — veri modeli.
 *
 * Her öğe dünya koordinatlarında (x, y, width, height) bir kutu kaplar ve kutunun merkezi
 * etrafında `angle` (radyan) kadar döner. Çizgi, ok ve serbest çizim öğelerinin noktaları
 * kutunun sol üst köşesine göredir ve her zaman 0…width / 0…height aralığındadır.
 * Öğeler değişmez (immutable) tutulur: her değişiklik yeni bir nesne üretir.
 */

export type Point = [number, number];

export type ElementType =
  | 'rectangle'
  | 'diamond'
  | 'triangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'freedraw'
  | 'text'
  | 'image';

export type Tool =
  | 'select'
  | 'hand'
  | 'rectangle'
  | 'diamond'
  | 'triangle'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'image'
  | 'eraser';

export type FillStyle = 'hachure' | 'cross' | 'solid';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type Arrowhead = 'none' | 'arrow' | 'triangle' | 'dot' | 'bar';
export type FontFamily = 'hand' | 'sans' | 'mono';
export type TextAlign = 'left' | 'center' | 'right';
export type Edges = 'sharp' | 'round';
export type Theme = 'light' | 'dark';

/** Çizim araçlarının ve seçili öğelerin paylaştığı stil özellikleri. */
export interface StyleProps {
  strokeColor: string;
  /** `transparent` ise dolgu yoktur. */
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  /** 0 düz, 1 doğal, 2 serbest el */
  roughness: number;
  /** 0–100 */
  opacity: number;
  edges: Edges;
  fontSize: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
  startArrowhead: Arrowhead;
  endArrowhead: Arrowhead;
}

export interface SketchElement extends StyleProps {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  /** El çizimi titreşimini her çizimde aynı tutan tohum. */
  seed: number;
  /** Her değişiklikte artar; önbellekler bunu kullanır. */
  version: number;
  /** Çizgi, ok ve serbest çizim noktaları (kutuya göre). */
  points?: Point[];
  /** Metin öğesinin içeriği ya da şekil içindeki etiket. */
  text?: string;
  /** Görsel öğesinin dosya kimliği (`Scene.files`). */
  fileId?: string;
  groupId?: string | null;
  /** Okun başlangıç / bitiş ucunun bağlı olduğu öğe. Öğe taşınınca ok onu izler. */
  startBinding?: string | null;
  endBinding?: string | null;
  /** Katmanlar panelinde verilen ad. */
  name?: string;
  /** Gizli öğeler çizilmez, seçilemez ve dışa aktarılmaz. */
  hidden?: boolean;
  /** Kilitli öğeler tuvalde seçilemez, taşınamaz ve silinemez. */
  locked?: boolean;
}

export type Files = Record<string, string>;

export interface View {
  zoom: number;
  scrollX: number;
  scrollY: number;
}

/** Kaydedilen / dışa aktarılan sahne dosyası (.biyikdraw). */
export interface SceneFile {
  type: 'biyik-draw';
  version: 1;
  source: string;
  elements: SketchElement[];
  files: Files;
  background?: string;
}
