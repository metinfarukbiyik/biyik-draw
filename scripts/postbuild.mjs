// Derleme sonrası:
// 1) Göreli içe aktarmalara uzantı ekler (./types → ./types.js, ../sketch → ../sketch/index.js)
//    böylece paket hem paketleyicilerde hem doğrudan ESM olarak çalışır.
// 2) Stil dosyasını dist/styles.css olarak kopyalar.
import { copyFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const spec = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\2/g;
for (const file of walk(dist).filter((f) => f.endsWith('.js') || f.endsWith('.d.ts'))) {
  const src = readFileSync(file, 'utf8');
  const out = src.replace(spec, (match, lead, quote, path) => {
    if (/\.(js|css|json)$/.test(path)) return match;
    const abs = resolve(dirname(file), path);
    const fixed = existsSync(`${abs}.js`) || existsSync(`${abs}.d.ts`) ? `${path}.js` : `${path}/index.js`;
    return `${lead}${quote}${fixed}${quote}`;
  });
  if (out !== src) writeFileSync(file, out);
}

copyFileSync(join(root, 'src/sketch-react/styles.css'), join(dist, 'styles.css'));
console.log('postbuild: ok');
