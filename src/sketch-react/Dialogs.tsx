'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen, Check, ClipboardCopy, Copy, Download, FileCode2, Github, Send, X } from 'lucide-react';
import { exportToCanvas, exportToSvg, fontFamilyCss, type Editor, type FontFamily } from '../sketch';
import { encodeShare, shareUrl } from './share';
import { buildOfflineHtml, inlineFontCss } from './offline';
import { useI18n, type T } from './i18n';

export function Dialog({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="sk-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={`sk-dialog${wide ? ' is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="sk-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="sk-icon-btn" onClick={onClose} aria-label={t('close')}>
            <X size={16} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function download(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

const fileStamp = (prefix: string) => {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

export function ExportDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { t } = useI18n();
  const hasSelection = editor.state.selectedIds.length > 0;
  const [onlySelected, setOnlySelected] = useState(hasSelection);
  const [withBackground, setWithBackground] = useState(true);
  const [dark, setDark] = useState(editor.state.theme === 'dark');
  const [scale, setScale] = useState(2);
  const hasPaper = editor.state.paper !== 'none';
  const [withPaper, setWithPaper] = useState(hasPaper);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const elements = onlySelected && hasSelection ? editor.selectedElements() : editor.visibleElements();
  const options = {
    background: withBackground ? editor.state.background : null,
    theme: dark ? 'dark' : 'light',
    scale,
    paper: withPaper ? editor.state.paper : 'none',
  } as const;

  useEffect(() => {
    let cancelled = false;
    if (!elements.length) return;
    exportToCanvas(elements, editor.files, { ...options, scale: 1 }).then((c) => {
      if (!cancelled) setPreview(c.toDataURL('image/png'));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlySelected, withBackground, dark, withPaper]);

  const png = async () => {
    const canvas = await exportToCanvas(elements, editor.files, options);
    download(canvas.toDataURL('image/png'), `${fileStamp(t('file.name'))}.png`);
  };
  const svg = async () => {
    // Kullanılan yazı tiplerini SVG'ye göm: dosya her yerde aynı görünür
    const used = new Set<FontFamily>(elements.filter((el) => el.text).map((el) => el.fontFamily));
    const fonts = await inlineFontCss([...used].map((f) => fontFamilyCss(f)));
    let text = exportToSvg(elements, editor.files, options);
    if (fonts) text = text.replace(/^(<svg[^>]*>)/, `$1<style>${fonts.replace(/</g, '\\3c ')}</style>`);
    const blob = new Blob([text], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    download(url, `${fileStamp(t('file.name'))}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copy = async () => {
    try {
      const canvas = await exportToCanvas(elements, editor.files, options);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (!blob) throw new Error('blob');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setStatus(t('export.copied'));
    } catch {
      setStatus(t('export.copyFailed'));
    }
  };

  return (
    <Dialog title={t('export.title')} onClose={onClose} wide>
      {!elements.length ? (
        <p className="sk-muted">{t('export.empty')}</p>
      ) : (
        <div className="sk-export">
          <div className={`sk-export-preview${withBackground ? '' : ' is-checker'}`}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={t('export.preview')} />
            ) : (
              <span className="sk-muted">{t('export.preparing')}</span>
            )}
          </div>
          <div className="sk-export-options">
            {hasSelection && (
              <label className="sk-check">
                <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} />
                {t('export.onlySelected')}
              </label>
            )}
            <label className="sk-check">
              <input type="checkbox" checked={withBackground} onChange={(e) => setWithBackground(e.target.checked)} />
              {t('export.background')}
            </label>
            <label className="sk-check">
              <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
              {t('export.dark')}
            </label>
            {hasPaper && (
              <label className="sk-check">
                <input type="checkbox" checked={withPaper} onChange={(e) => setWithPaper(e.target.checked)} />
                {t('export.paper')}
              </label>
            )}
            <div className="sk-scale" role="group" aria-label={t('export.scale')}>
              <span>{t('export.scale')}</span>
              {[1, 2, 3].map((s) => (
                <button key={s} type="button" className="sk-opt" aria-pressed={scale === s} onClick={() => setScale(s)}>
                  {s}×
                </button>
              ))}
            </div>
            <div className="sk-export-actions">
              <button type="button" className="sk-btn is-primary" onClick={png}>
                <Download size={15} /> PNG
              </button>
              <button type="button" className="sk-btn" onClick={svg}>
                <Download size={15} /> SVG
              </button>
              <button type="button" className="sk-btn" onClick={copy}>
                <ClipboardCopy size={15} /> {t('export.copy')}
              </button>
            </div>
            {status && (
              <p className="sk-muted" role="status">
                {status}
              </p>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

const mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

const shortcuts = (t: T): [string, [string, string][]][] => [
  [
    t('help.tools'),
    [
      [t('tool.select'), 'V · 1'],
      [t('tool.hand'), `H · ${t('help.space')}`],
      [t('tool.rectangle'), 'R · 2'],
      [t('tool.diamond'), 'D · 3'],
      [t('tool.triangle'), 'U'],
      [t('tool.ellipse'), 'O · 4'],
      [t('tool.arrow'), 'A · 5'],
      [t('tool.line'), 'L · 6'],
      [t('tool.freedraw'), 'P · 7'],
      [t('tool.text'), 'T · 8'],
      [t('type.image'), '9'],
      [t('tool.eraser'), 'E · 0'],
      [t('tool.highlighter'), 'M'],
      [t('tool.laser'), 'K'],
      [t('help.lockTool'), 'Q'],
    ],
  ],
  [
    t('help.editing'),
    [
      [t('history.undo'), `${mod} Z`],
      [t('history.redo'), `${mod} ⇧ Z`],
      [t('help.cutPaste'), `${mod} C / X / V`],
      [t('action.duplicate'), `${mod} D`],
      [t('help.selectAll'), `${mod} A`],
      [t('action.delete'), 'Delete'],
      [t('help.groupUngroup'), `${mod} G / ${mod} ⇧ G`],
      [t('help.order'), `${mod} ] / ${mod} [`],
      [t('help.flip'), '⇧ H / ⇧ V'],
      [t('help.styleCopy'), `${mod} ⌥ C / V`],
      [t('action.lock'), `${mod} ⇧ L`],
      [t('help.bind'), t('help.bindKeys')],
      [t('help.altDrag'), t('help.altDragKeys')],
      [t('help.shift'), 'Shift'],
      [t('help.editText'), t('help.editTextKeys')],
      [t('help.polyline'), t('help.polylineKeys')],
    ],
  ],
  [
    t('help.view'),
    [
      [t('help.zoom'), `${mod} + / ${mod} −`],
      ['100%', `${mod} 0`],
      [t('help.fit'), '⇧ 1'],
      [t('help.fitSel'), '⇧ 2'],
      [t('menu.grid'), `${mod} '`],
      [t('menu.layers'), '⌥ L'],
      [t('menu.present'), '⌥ P'],
      [t('ctx.copyPng'), '⇧ ⌥ C'],
      [t('help.saveOpen'), `${mod} S / ${mod} O`],
      [t('top.export'), `${mod} ⇧ E`],
      [t('menu.shortcuts'), '?'],
    ],
  ],
];

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog title={t('help.title')} onClose={onClose} wide>
      <div className="sk-help">
        {shortcuts(t).map(([group, rows]) => (
          <section key={group}>
            <h3>{group}</h3>
            <dl>
              {rows.map(([label, keys]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <kbd>{keys}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="sk-muted sk-help-foot">{t('help.foot')}</p>
    </Dialog>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog title={title} onClose={onClose}>
      <p className="sk-muted">{message}</p>
      <div className="sk-dialog-actions">
        <button type="button" className="sk-btn" onClick={onClose}>
          {t('cancel')}
        </button>
        <button
          type="button"
          className="sk-btn is-danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export interface AboutInfo {
  name: string;
  version: string;
  description: string;
  author?: { name: string; url?: string };
  repoUrl?: string;
  license?: string;
}

export function AboutDialog({ info, docsUrl, onClose }: { info: AboutInfo; docsUrl?: string; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog title={t('about.title')} onClose={onClose}>
      <div className="sk-about">
        <div className="sk-about-head">
          <strong>{info.name}</strong>
          <span className="sk-about-version">v{info.version}</span>
        </div>
        <p className="sk-muted">{info.description}</p>
        <dl className="sk-about-list">
          {info.author && (
            <div>
              <dt>{t('about.author')}</dt>
              <dd>{info.author.url ? <a href={info.author.url}>{info.author.name}</a> : info.author.name}</dd>
            </div>
          )}
          {info.license && (
            <div>
              <dt>{t('about.license')}</dt>
              <dd>
                {info.license} · {t('about.openSource')}
              </dd>
            </div>
          )}
          <div>
            <dt>{t('about.privacy')}</dt>
            <dd>{t('about.privacyText')}</dd>
          </div>
        </dl>
        <div className="sk-dialog-actions is-start">
          {info.repoUrl && (
            <a className="sk-btn is-primary" href={info.repoUrl} target="_blank" rel="noopener">
              <Github size={15} /> GitHub
            </a>
          )}
          {docsUrl && (
            <a className="sk-btn" href={docsUrl} target="_blank" rel="noopener">
              <BookOpen size={15} /> {t('menu.docs')}
            </a>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Uzun bağlantı uyarı eşiği (karakter). Sohbet uygulamaları bu boyutun üstünü kesebilir. */
const LONG_LINK = 30_000;

export function ShareDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { t, lang } = useI18n();
  const hasSelection = editor.state.selectedIds.length > 0;
  const [onlySelected, setOnlySelected] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const elements = onlySelected && hasSelection ? editor.selectedElements() : editor.visibleElements();

  const scene = () => {
    const files: Record<string, string> = {};
    for (const el of elements) if (el.fileId && editor.files[el.fileId]) files[el.fileId] = editor.files[el.fileId];
    return { elements, files, background: editor.state.background, paper: editor.state.paper };
  };

  useEffect(() => {
    let cancelled = false;
    if (!elements.length) return;
    encodeShare(scene()).then((frag) => {
      if (!cancelled) setLink(shareUrl(frag));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlySelected]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* seçili metinden elle kopyalanabilir */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const html = async () => {
    const s = scene();
    const text = await buildOfflineHtml({
      scene: { type: 'biyik-draw', version: 1, source: location.origin, ...s },
      title: `${t('file.name')} — ${location.host}`,
      editUrl: link ?? undefined,
      editLabel: t('share.editIn'),
      lang,
      dark: editor.state.theme === 'dark',
    });
    downloadBlob(new Blob([text], { type: 'text/html' }), `${fileStamp(t('file.name'))}.html`);
  };

  const sceneFile = () => {
    const s = scene();
    const data = { type: 'biyik-draw', version: 1, source: location.origin, ...s };
    downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `${fileStamp(t('file.name'))}.biyikdraw`);
  };

  return (
    <Dialog title={t('share.title')} onClose={onClose}>
      {!elements.length ? (
        <p className="sk-muted">{t('share.empty')}</p>
      ) : (
        <div className="sk-share">
          <p className="sk-muted">{t('share.lead')}</p>
          {hasSelection && (
            <label className="sk-check">
              <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} />
              {t('export.onlySelected')}
            </label>
          )}
          <div className="sk-share-field">
            <span className="sk-share-label">{t('share.link')}</span>
            <div className="sk-share-row">
              <input
                className="sk-share-input"
                readOnly
                value={link ?? t('share.preparing')}
                onFocus={(e) => e.target.select()}
                aria-label={t('share.link')}
              />
              <button type="button" className="sk-btn is-primary" onClick={copy} disabled={!link}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? t('share.copied') : t('share.copy')}
              </button>
            </div>
            {link && (
              <span className="sk-share-meta">
                {t('share.size')}: {(link.length / 1024).toFixed(1)} KB
                {canNativeShare && (
                  <button
                    type="button"
                    className="sk-share-native"
                    onClick={() => navigator.share({ url: link, title: t('share.title') }).catch(() => undefined)}
                  >
                    <Send size={13} /> {t('share.native')}
                  </button>
                )}
              </span>
            )}
            {link && link.length > LONG_LINK && <p className="sk-share-warn">{t('share.long')}</p>}
          </div>
          <div className="sk-share-offline">
            <strong>{t('share.offline')}</strong>
            <p className="sk-muted">{t('share.offlineLead')}</p>
            <div className="sk-dialog-actions is-start">
              <button type="button" className="sk-btn" onClick={html}>
                <FileCode2 size={15} /> {t('share.html')}
              </button>
              <button type="button" className="sk-btn" onClick={sceneFile}>
                <Download size={15} /> {t('share.file')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
