/** Metin ölçümü ve satır kırma. Yazı aileleri çalışma anında `configureFonts` ile verilir. */
import type { FontFamily } from './types.js';
export declare const LINE_HEIGHT = 1.25;
/** Şekil etiketi ile şekil kenarı arasındaki boşluk. */
export declare const LABEL_PADDING = 10;
export declare function configureFonts(next: Partial<Record<FontFamily, string>>): void;
export declare const fontFamilyCss: (family: FontFamily) => string;
export declare const fontString: (size: number, family: FontFamily) => string;
export declare function textWidth(text: string, font: string): number;
/** Çok satırlı metnin kutu ölçüsü. */
export declare function measureText(text: string, size: number, family: FontFamily): {
    width: number;
    height: number;
};
/** Metni verilen genişliğe sığacak şekilde satırlara böler (şekil etiketleri). */
export declare function wrapText(text: string, font: string, maxWidth: number): string[];
