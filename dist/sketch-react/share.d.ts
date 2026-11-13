/**
 * Paylaşım bağlantısı: sahne sıkıştırılıp adresin # kısmına yazılır.
 * # kısmı tarayıcıdan sunucuya hiç gönderilmez; çizim hiçbir sunucuya yüklenmez.
 *
 *   https://draw.biyik.dev/#share=1.<base64url(deflate(json))>
 */
import type { Files, SketchElement } from '../sketch/index.js';
export interface SharePayload {
    elements: SketchElement[];
    files: Files;
    background?: string;
}
/** Sahneyi adres parçasına (# sonrası) çevirir. */
export declare function encodeShare(payload: SharePayload): Promise<string>;
export declare const hasShare: (hash: string) => boolean;
/** Adres parçasından sahneyi çözer; bozuksa null. */
export declare function decodeShare(hash: string): Promise<SharePayload | null>;
export declare const shareUrl: (fragment: string) => string;
