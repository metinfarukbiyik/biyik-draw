/**
 * Çevrimdışı paylaşım dosyası: internet olmadan her tarayıcıda açılan tek bir HTML.
 * İçinde çizimin SVG'si, kullanılan yazı tiplerinin gömülü hâli ve sahne verisi bulunur;
 * dosya draw.biyik.dev'de "Aç" ile yeniden düzenlenebilir.
 */
import { exportToSvg, fontFamilyCss, type FontFamily, type SceneFile } from '../sketch';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const familyNames = (css: string) =>
  css
    .split(',')
    .map((f) => f.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Sayfadaki @font-face kurallarından verilen ailelere ait olanları, dosyaları gömülü (data:)
 * olarak döndürür. Böylece SVG/HTML dışa aktarımında el yazısı her yerde aynı görünür.
 */
export async function inlineFontCss(families: string[]): Promise<string> {
  const wanted = new Set(families.flatMap(familyNames).map((f) => f.toLowerCase()));
  const rules: CSSFontFaceRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue; // başka kökenden gelen stil dosyası
    }
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSFontFaceRule) {
        const fam = rule.style.getPropertyValue('font-family').trim().replace(/^['"]|['"]$/g, '');
        if (wanted.has(fam.toLowerCase())) rules.push(rule);
      }
    }
  }
  const out: string[] = [];
  for (const rule of rules) {
    let css = rule.cssText;
    const base = rule.parentStyleSheet?.href ?? location.href;
    const urls = [...css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)].map((m) => m[2]);
    for (const u of urls) {
      if (u.startsWith('data:')) continue;
      const data = await toDataUrl(new URL(u, base).href);
      if (data) css = css.split(u).join(data);
    }
    out.push(css);
  }
  return out.join('\n');
}

export async function buildOfflineHtml(opts: {
  scene: SceneFile;
  title: string;
  editUrl?: string;
  editLabel: string;
  lang: string;
  dark?: boolean;
}): Promise<string> {
  const { scene } = opts;
  const elements = scene.elements.filter((el) => !el.hidden);
  const background = scene.background ?? '#ffffff';
  const theme = opts.dark ? 'dark' : 'light';
  const svg = exportToSvg(elements, scene.files, { background, theme, scale: 1, padding: 32, paper: scene.paper });
  const used = new Set<FontFamily>(elements.filter((el) => el.text).map((el) => el.fontFamily));
  const fontCss = await inlineFontCss([...used].map((f) => fontFamilyCss(f)));
  // Sahne verisi: </script> kaçışıyla güvenli gömme
  const data = JSON.stringify(scene).replace(/</g, '\\u003c');
  const pageBg = opts.dark ? '#121214' : '#f4f4f5';

  return `<!doctype html>
<html lang="${opts.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="draw.biyik.dev">
<title>${esc(opts.title)}</title>
<style>
${fontCss}
html,body{margin:0;height:100%;background:${pageBg};font:14px system-ui,-apple-system,'Segoe UI',sans-serif}
main{box-sizing:border-box;min-height:100%;display:grid;place-items:center;padding:24px}
main svg{display:block;max-width:100%;height:auto;border-radius:12px;box-shadow:0 1px 2px rgb(0 0 0/6%),0 12px 40px -12px rgb(0 0 0/25%)}
footer{position:fixed;right:16px;bottom:16px;display:flex;gap:8px}
footer a{padding:9px 14px;border-radius:10px;background:${opts.dark ? '#f5f5f7' : '#171717'};color:${opts.dark ? '#171717' : '#fff'};text-decoration:none;font-weight:500}
</style>
</head>
<body>
<main>${svg}</main>
${opts.editUrl ? `<footer><a href="${esc(opts.editUrl)}">${esc(opts.editLabel)}</a></footer>` : ''}
<script type="application/json" id="biyik-draw-scene">${data}</script>
</body>
</html>`;
}

/** Çevrimdışı HTML dosyasından sahneyi okur (Aç ile içe aktarma). */
export function sceneFromHtml(text: string): unknown {
  const m = text.match(/<script type="application\/json" id="biyik-draw-scene">([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}
