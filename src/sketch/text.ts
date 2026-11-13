/** Metin ölçümü ve satır kırma. Yazı aileleri çalışma anında `configureFonts` ile verilir. */
import type { FontFamily } from './types';

export const LINE_HEIGHT = 1.25;
/** Şekil etiketi ile şekil kenarı arasındaki boşluk. */
export const LABEL_PADDING = 10;

const families: Record<FontFamily, string> = {
  hand: 'cursive',
  sans: 'system-ui, sans-serif',
  mono: 'ui-monospace, monospace',
};

export function configureFonts(next: Partial<Record<FontFamily, string>>) {
  Object.assign(families, next);
}

export const fontFamilyCss = (family: FontFamily) => families[family];
export const fontString = (size: number, family: FontFamily) => `${size}px ${families[family]}`;

let ctx: CanvasRenderingContext2D | null = null;
function measureCtx() {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  return ctx!;
}

export function textWidth(text: string, font: string): number {
  const c = measureCtx();
  c.font = font;
  return c.measureText(text).width;
}

/** Çok satırlı metnin kutu ölçüsü. */
export function measureText(text: string, size: number, family: FontFamily) {
  const font = fontString(size, family);
  const lines = text.split('\n');
  let width = 0;
  for (const line of lines) width = Math.max(width, textWidth(line, font));
  return { width: Math.ceil(width) + 2, height: Math.ceil(lines.length * size * LINE_HEIGHT) };
}

/** Metni verilen genişliğe sığacak şekilde satırlara böler (şekil etiketleri). */
export function wrapText(text: string, font: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/(\s+)/);
    let line = '';
    for (const word of words) {
      const candidate = line + word;
      if (line && textWidth(candidate, font) > maxWidth) {
        out.push(line.trimEnd());
        line = word.trimStart();
        // Tek başına sığmayan uzun kelimeyi harf harf böl
        while (textWidth(line, font) > maxWidth && line.length > 1) {
          let cut = line.length - 1;
          while (cut > 1 && textWidth(line.slice(0, cut), font) > maxWidth) cut--;
          out.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      } else {
        line = candidate;
      }
    }
    out.push(line);
  }
  return out;
}
