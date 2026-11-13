/**
 * El çizimi görünümü üreten geometri. Çıktılar SVG yol (path `d`) metinleridir; aynı metin hem
 * tuvalde (Path2D) hem SVG dışa aktarımında kullanılır.
 *
 * İlkeler:
 * - Şekiller tek, sürekli bir yoldur: köşelerde kopukluk ya da taşma olmaz.
 * - Kenarlar hafifçe bükülmüş kübik Bézier eğrileridir; bükülme uzunlukla büyür ama sınırlıdır,
 *   böylece küçük şekiller titrek, büyük şekiller çarpık görünmez.
 * - Elips çevresindeki sapma rastgele gürültü değil, düşük frekanslı dalgadır: eğri pürüzsüz kalır.
 * - "Doğal" ve "serbest" düzeylerde şekil ikinci kez, daha hafif titreşimle geçilir.
 */
import type { Point } from './types.js';
import type { Rng } from './random.js';
export declare function polylinePath(points: Point[], closed?: boolean): string;
/** Tek bir el çizimi doğru parçası (uçlar çok hafif kayar). */
export declare function sketchSegment(a: Point, b: Point, roughness: number, r: Rng): string;
export declare function sketchLine(a: Point, b: Point, roughness: number, r: Rng, double: boolean): string;
/** Keskin köşeli kapalı çokgen: köşeler hafifçe kayar, kenarlar bükülür, yol kesintisizdir. */
export declare function sketchPolygon(corners: Point[], roughness: number, r: Rng): string;
/** Noktalardan geçen yumuşak eğri (Catmull-Rom → kübik Bézier). */
export declare function smoothPath(points: Point[], closed: boolean): string;
/** Noktaları çok hafif kaydırıp yumuşak eğriyle birleştirir (çok noktalı eğri çizgiler). */
export declare function sketchCurve(points: Point[], closed: boolean, roughness: number, r: Rng): string;
/**
 * Elips çevresi. Yarıçaptaki sapma düşük frekanslı iki dalganın toplamıdır; başlangıç açısı
 * rastgeledir ve kalem kapanırken başlangıcın biraz üstüne biner.
 */
export declare function sketchEllipsePoints(w: number, h: number, roughness: number, r: Rng): Point[];
export declare function ellipsePath(w: number, h: number): string;
export declare function ellipseOutline(w: number, h: number, steps?: number): Point[];
/** Yuvarlak köşeli çokgenin kesin (titreşimsiz) yolu. */
export declare function roundedPolygonPath(corners: Point[], radius: number): string;
/** Yuvarlak köşeli çokgenin çevresinden örneklenmiş noktalar (dolgu ve isabet testi için). */
export declare function roundedPolygonOutline(corners: Point[], radius: number, samples?: number): Point[];
/** Yuvarlak köşeli çokgenin el çizimi hâli: tek parça yol, bükülmüş kenarlar, yumuşak köşeler. */
export declare function sketchRoundedPolygon(corners: Point[], radius: number, roughness: number, r: Rng): string;
/**
 * Tarama (hachure) dolgusu: çokgeni verilen açıyla döndürüp yatay tarama çizgileriyle keser,
 * kesişim çiftlerini doğru parçası yapar ve geri döndürür.
 */
export declare function hatchSegments(polygon: Point[], gap: number, angleDeg: number): [Point, Point][];
/** Serbest çizim izini yumuşatır (ardışık noktaların orta noktalarından geçen eğri). */
export declare function freehandPath(points: Point[]): string;
