/** Panoya kopyalama yardımcıları (PNG, SVG, metin, paylaşım bağlantısı) ve panodan yapıştırma. */
import { type Editor } from '../sketch/index.js';
export declare function copyPng(editor: Editor): Promise<boolean>;
export declare function svgText(editor: Editor): Promise<string>;
export declare function copyText(text: string): Promise<boolean>;
export declare function copySvg(editor: Editor): Promise<boolean>;
export declare function copyShareLink(editor: Editor): Promise<boolean>;
/** Panodan yapıştırır: görsel, kendi öğelerimiz ya da düz metin. */
export declare function pasteFromClipboard(editor: Editor): Promise<boolean>;
