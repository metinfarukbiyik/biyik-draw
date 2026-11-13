/**
 * Paylaşım bağlantısı: sahne sıkıştırılıp adresin # kısmına yazılır.
 * # kısmı tarayıcıdan sunucuya hiç gönderilmez; çizim hiçbir sunucuya yüklenmez.
 *
 *   https://draw.biyik.dev/#share=1.<base64url(deflate(json))>
 */
import type { Files, SketchElement } from '../sketch';

export interface SharePayload {
  elements: SketchElement[];
  files: Files;
  background?: string;
}

const KEY = 'share=';

/** Sayıları kısaltır, sürüm alanını atar: bağlantı daha kısa olur. */
function compactJson(p: SharePayload): string {
  return JSON.stringify(
    {
      v: 1,
      b: p.background,
      e: p.elements.map((el) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { version, ...rest } = el;
        return rest;
      }),
      f: p.files,
    },
    (_k, value) => (typeof value === 'number' && !Number.isInteger(value) ? Math.round(value * 100) / 100 : value),
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const blob = new Blob([bytes as BlobPart]);
  const res = new Response(blob.stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

const canCompress = () => typeof CompressionStream !== 'undefined';

/** Sahneyi adres parçasına (# sonrası) çevirir. */
export async function encodeShare(payload: SharePayload): Promise<string> {
  const raw = new TextEncoder().encode(compactJson(payload));
  if (canCompress()) return `${KEY}1.${toBase64Url(await pipe(raw, new CompressionStream('deflate-raw')))}`;
  return `${KEY}0.${toBase64Url(raw)}`;
}

export const hasShare = (hash: string) => hash.replace(/^#/, '').startsWith(KEY);

/** Adres parçasından sahneyi çözer; bozuksa null. */
export async function decodeShare(hash: string): Promise<SharePayload | null> {
  try {
    const frag = hash.replace(/^#/, '');
    if (!frag.startsWith(KEY)) return null;
    const [mode, data] = frag.slice(KEY.length).split('.', 2);
    let bytes = fromBase64Url(data);
    if (mode === '1') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    const json = JSON.parse(new TextDecoder().decode(bytes));
    if (json?.v !== 1 || !Array.isArray(json.e)) return null;
    return {
      elements: json.e.map((el: SketchElement) => ({ ...el, version: 1 })),
      files: json.f ?? {},
      background: json.b,
    };
  } catch {
    return null;
  }
}

export const shareUrl = (fragment: string) =>
  `${location.origin}${location.pathname}${location.search}#${fragment}`;
