/**
 * Çevrimdışı paylaşım dosyası: internet olmadan her tarayıcıda açılan tek bir HTML.
 * İçinde çizimin SVG'si, kullanılan yazı tiplerinin gömülü hâli ve sahne verisi bulunur;
 * dosya draw.biyik.dev'de "Aç" ile yeniden düzenlenebilir.
 */
import { type SceneFile } from '../sketch/index.js';
/**
 * Sayfadaki @font-face kurallarından verilen ailelere ait olanları, dosyaları gömülü (data:)
 * olarak döndürür. Böylece SVG/HTML dışa aktarımında el yazısı her yerde aynı görünür.
 */
export declare function inlineFontCss(families: string[]): Promise<string>;
export declare function buildOfflineHtml(opts: {
    scene: SceneFile;
    title: string;
    editUrl?: string;
    editLabel: string;
    lang: string;
    dark?: boolean;
}): Promise<string>;
/** Çevrimdışı HTML dosyasından sahneyi okur (Aç ile içe aktarma). */
export declare function sceneFromHtml(text: string): unknown;
