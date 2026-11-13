'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen, ClipboardCopy, Download, Github, X } from 'lucide-react';
import { exportToCanvas, exportToSvg, type Editor } from '../sketch';
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
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const elements = onlySelected && hasSelection ? editor.selectedElements() : editor.visibleElements();
  const options = { background: withBackground ? editor.state.background : null, theme: dark ? 'dark' : 'light', scale } as const;

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
  }, [onlySelected, withBackground, dark]);

  const png = async () => {
    const canvas = await exportToCanvas(elements, editor.files, options);
    download(canvas.toDataURL('image/png'), `${fileStamp(t('file.name'))}.png`);
  };
  const svg = () => {
    const blob = new Blob([exportToSvg(elements, editor.files, options)], { type: 'image/svg+xml' });
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
