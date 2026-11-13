/** Panoya kopyalama yardımcıları (PNG, SVG, metin, paylaşım bağlantısı) ve panodan yapıştırma. */
import { exportToCanvas, exportToSvg, fontFamilyCss, type Editor, type FontFamily } from '../sketch';
import { inlineFontCss } from './offline';
import { encodeShare, shareUrl } from './share';

/** Seçim varsa seçim, yoksa görünen tüm öğeler. */
const targets = (editor: Editor) =>
  editor.state.selectedIds.length ? editor.selectedElements() : editor.visibleElements();

const exportOptions = (editor: Editor) => ({
  background: editor.state.background,
  theme: editor.state.theme,
  scale: 2,
  paper: editor.state.paper,
});

export async function copyPng(editor: Editor): Promise<boolean> {
  const els = targets(editor);
  if (!els.length) return false;
  try {
    // Safari: ClipboardItem bir Promise ile hemen oluşturulmalı (kullanıcı hareketi içinde)
    const blob = exportToCanvas(els, editor.files, exportOptions(editor)).then(
      (canvas) => new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject()), 'image/png')),
    );
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function svgText(editor: Editor): Promise<string> {
  const els = targets(editor);
  const used = new Set<FontFamily>(els.filter((el) => el.text).map((el) => el.fontFamily));
  const fonts = await inlineFontCss([...used].map((f) => fontFamilyCss(f)));
  let text = exportToSvg(els, editor.files, exportOptions(editor));
  if (fonts) text = text.replace(/^(<svg[^>]*>)/, `$1<style>${fonts.replace(/</g, '\\3c ')}</style>`);
  return text;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function copySvg(editor: Editor) {
  if (!targets(editor).length) return false;
  return copyText(await svgText(editor));
}

export async function copyShareLink(editor: Editor) {
  const els = targets(editor);
  if (!els.length) return false;
  const files: Record<string, string> = {};
  for (const el of els) if (el.fileId && editor.files[el.fileId]) files[el.fileId] = editor.files[el.fileId];
  const fragment = await encodeShare({
    elements: els,
    files,
    background: editor.state.background,
    paper: editor.state.paper,
  });
  return copyText(shareUrl(fragment));
}

/** Panodan yapıştırır: görsel, kendi öğelerimiz ya da düz metin. */
export async function pasteFromClipboard(editor: Editor): Promise<boolean> {
  try {
    if ('read' in navigator.clipboard) {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) {
          const blob = await item.getType(type);
          await editor.insertImageFile(new File([blob], 'pano', { type }));
          return true;
        }
      }
    }
    return editor.pasteText(await navigator.clipboard.readText());
  } catch {
    return false;
  }
}
