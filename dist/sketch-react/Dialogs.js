'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ClipboardCopy, Copy, Download, FileCode2, Github, Send, X } from 'lucide-react';
import { exportToCanvas, exportToSvg, fontFamilyCss } from '../sketch/index.js';
import { encodeShare, shareUrl } from './share.js';
import { buildOfflineHtml, inlineFontCss } from './offline.js';
import { useI18n } from './i18n.js';
export function Dialog({ title, onClose, children, wide, }) {
    const ref = useRef(null);
    const { t } = useI18n();
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    });
    useEffect(() => {
        const prev = document.activeElement;
        ref.current?.focus();
        const onKey = (e) => {
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
    return (_jsx("div", { className: "sk-overlay", onMouseDown: (e) => e.target === e.currentTarget && onClose(), children: _jsxs("div", { ref: ref, className: `sk-dialog${wide ? ' is-wide' : ''}`, role: "dialog", "aria-modal": "true", "aria-label": title, tabIndex: -1, children: [_jsxs("header", { className: "sk-dialog-head", children: [_jsx("h2", { children: title }), _jsx("button", { type: "button", className: "sk-icon-btn", onClick: onClose, "aria-label": t('close'), children: _jsx(X, { size: 16 }) })] }), children] }) }));
}
function download(href, name) {
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
}
const fileStamp = (prefix) => {
    const d = new Date();
    const p = (v) => String(v).padStart(2, '0');
    return `${prefix}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};
export function ExportDialog({ editor, onClose }) {
    const { t } = useI18n();
    const hasSelection = editor.state.selectedIds.length > 0;
    const [onlySelected, setOnlySelected] = useState(hasSelection);
    const [withBackground, setWithBackground] = useState(true);
    const [dark, setDark] = useState(editor.state.theme === 'dark');
    const [scale, setScale] = useState(2);
    const hasPaper = editor.state.paper !== 'none';
    const [withPaper, setWithPaper] = useState(hasPaper);
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState('');
    const elements = onlySelected && hasSelection ? editor.selectedElements() : editor.visibleElements();
    const options = {
        background: withBackground ? editor.state.background : null,
        theme: dark ? 'dark' : 'light',
        scale,
        paper: withPaper ? editor.state.paper : 'none',
    };
    useEffect(() => {
        let cancelled = false;
        if (!elements.length)
            return;
        exportToCanvas(elements, editor.files, { ...options, scale: 1 }).then((c) => {
            if (!cancelled)
                setPreview(c.toDataURL('image/png'));
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
        const used = new Set(elements.filter((el) => el.text).map((el) => el.fontFamily));
        const fonts = await inlineFontCss([...used].map((f) => fontFamilyCss(f)));
        let text = exportToSvg(elements, editor.files, options);
        if (fonts)
            text = text.replace(/^(<svg[^>]*>)/, `$1<style>${fonts.replace(/</g, '\\3c ')}</style>`);
        const blob = new Blob([text], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        download(url, `${fileStamp(t('file.name'))}.svg`);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const copy = async () => {
        try {
            const canvas = await exportToCanvas(elements, editor.files, options);
            const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
            if (!blob)
                throw new Error('blob');
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setStatus(t('export.copied'));
        }
        catch {
            setStatus(t('export.copyFailed'));
        }
    };
    return (_jsx(Dialog, { title: t('export.title'), onClose: onClose, wide: true, children: !elements.length ? (_jsx("p", { className: "sk-muted", children: t('export.empty') })) : (_jsxs("div", { className: "sk-export", children: [_jsx("div", { className: `sk-export-preview${withBackground ? '' : ' is-checker'}`, children: preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    _jsx("img", { src: preview, alt: t('export.preview') })) : (_jsx("span", { className: "sk-muted", children: t('export.preparing') })) }), _jsxs("div", { className: "sk-export-options", children: [hasSelection && (_jsxs("label", { className: "sk-check", children: [_jsx("input", { type: "checkbox", checked: onlySelected, onChange: (e) => setOnlySelected(e.target.checked) }), t('export.onlySelected')] })), _jsxs("label", { className: "sk-check", children: [_jsx("input", { type: "checkbox", checked: withBackground, onChange: (e) => setWithBackground(e.target.checked) }), t('export.background')] }), _jsxs("label", { className: "sk-check", children: [_jsx("input", { type: "checkbox", checked: dark, onChange: (e) => setDark(e.target.checked) }), t('export.dark')] }), hasPaper && (_jsxs("label", { className: "sk-check", children: [_jsx("input", { type: "checkbox", checked: withPaper, onChange: (e) => setWithPaper(e.target.checked) }), t('export.paper')] })), _jsxs("div", { className: "sk-scale", role: "group", "aria-label": t('export.scale'), children: [_jsx("span", { children: t('export.scale') }), [1, 2, 3].map((s) => (_jsxs("button", { type: "button", className: "sk-opt", "aria-pressed": scale === s, onClick: () => setScale(s), children: [s, "\u00D7"] }, s)))] }), _jsxs("div", { className: "sk-export-actions", children: [_jsxs("button", { type: "button", className: "sk-btn is-primary", onClick: png, children: [_jsx(Download, { size: 15 }), " PNG"] }), _jsxs("button", { type: "button", className: "sk-btn", onClick: svg, children: [_jsx(Download, { size: 15 }), " SVG"] }), _jsxs("button", { type: "button", className: "sk-btn", onClick: copy, children: [_jsx(ClipboardCopy, { size: 15 }), " ", t('export.copy')] })] }), status && (_jsx("p", { className: "sk-muted", role: "status", children: status }))] })] })) }));
}
const mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
const shortcuts = (t) => [
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
export function HelpDialog({ onClose }) {
    const { t } = useI18n();
    return (_jsxs(Dialog, { title: t('help.title'), onClose: onClose, wide: true, children: [_jsx("div", { className: "sk-help", children: shortcuts(t).map(([group, rows]) => (_jsxs("section", { children: [_jsx("h3", { children: group }), _jsx("dl", { children: rows.map(([label, keys]) => (_jsxs("div", { children: [_jsx("dt", { children: label }), _jsx("dd", { children: _jsx("kbd", { children: keys }) })] }, label))) })] }, group))) }), _jsx("p", { className: "sk-muted sk-help-foot", children: t('help.foot') })] }));
}
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose, }) {
    const { t } = useI18n();
    return (_jsxs(Dialog, { title: title, onClose: onClose, children: [_jsx("p", { className: "sk-muted", children: message }), _jsxs("div", { className: "sk-dialog-actions", children: [_jsx("button", { type: "button", className: "sk-btn", onClick: onClose, children: t('cancel') }), _jsx("button", { type: "button", className: "sk-btn is-danger", onClick: () => {
                            onConfirm();
                            onClose();
                        }, children: confirmLabel })] })] }));
}
export function AboutDialog({ info, docsUrl, onClose }) {
    const { t } = useI18n();
    return (_jsx(Dialog, { title: t('about.title'), onClose: onClose, children: _jsxs("div", { className: "sk-about", children: [_jsxs("div", { className: "sk-about-head", children: [_jsx("strong", { children: info.name }), _jsxs("span", { className: "sk-about-version", children: ["v", info.version] })] }), _jsx("p", { className: "sk-muted", children: info.description }), _jsxs("dl", { className: "sk-about-list", children: [info.author && (_jsxs("div", { children: [_jsx("dt", { children: t('about.author') }), _jsx("dd", { children: info.author.url ? _jsx("a", { href: info.author.url, children: info.author.name }) : info.author.name })] })), info.license && (_jsxs("div", { children: [_jsx("dt", { children: t('about.license') }), _jsxs("dd", { children: [info.license, " \u00B7 ", t('about.openSource')] })] })), _jsxs("div", { children: [_jsx("dt", { children: t('about.privacy') }), _jsx("dd", { children: t('about.privacyText') })] })] }), _jsxs("div", { className: "sk-dialog-actions is-start", children: [info.repoUrl && (_jsxs("a", { className: "sk-btn is-primary", href: info.repoUrl, target: "_blank", rel: "noopener", children: [_jsx(Github, { size: 15 }), " GitHub"] })), docsUrl && (_jsxs("a", { className: "sk-btn", href: docsUrl, target: "_blank", rel: "noopener", children: [_jsx(BookOpen, { size: 15 }), " ", t('menu.docs')] }))] })] }) }));
}
function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    download(url, name);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Uzun bağlantı uyarı eşiği (karakter). Sohbet uygulamaları bu boyutun üstünü kesebilir. */
const LONG_LINK = 30000;
export function ShareDialog({ editor, onClose }) {
    const { t, lang } = useI18n();
    const hasSelection = editor.state.selectedIds.length > 0;
    const [onlySelected, setOnlySelected] = useState(false);
    const [link, setLink] = useState(null);
    const [copied, setCopied] = useState(false);
    const elements = onlySelected && hasSelection ? editor.selectedElements() : editor.visibleElements();
    const scene = () => {
        const files = {};
        for (const el of elements)
            if (el.fileId && editor.files[el.fileId])
                files[el.fileId] = editor.files[el.fileId];
        return { elements, files, background: editor.state.background, paper: editor.state.paper };
    };
    useEffect(() => {
        let cancelled = false;
        if (!elements.length)
            return;
        encodeShare(scene()).then((frag) => {
            if (!cancelled)
                setLink(shareUrl(frag));
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onlySelected]);
    const copy = async () => {
        if (!link)
            return;
        try {
            await navigator.clipboard.writeText(link);
        }
        catch {
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
    return (_jsx(Dialog, { title: t('share.title'), onClose: onClose, children: !elements.length ? (_jsx("p", { className: "sk-muted", children: t('share.empty') })) : (_jsxs("div", { className: "sk-share", children: [_jsx("p", { className: "sk-muted", children: t('share.lead') }), hasSelection && (_jsxs("label", { className: "sk-check", children: [_jsx("input", { type: "checkbox", checked: onlySelected, onChange: (e) => setOnlySelected(e.target.checked) }), t('export.onlySelected')] })), _jsxs("div", { className: "sk-share-field", children: [_jsx("span", { className: "sk-share-label", children: t('share.link') }), _jsxs("div", { className: "sk-share-row", children: [_jsx("input", { className: "sk-share-input", readOnly: true, value: link ?? t('share.preparing'), onFocus: (e) => e.target.select(), "aria-label": t('share.link') }), _jsxs("button", { type: "button", className: "sk-btn is-primary", onClick: copy, disabled: !link, children: [copied ? _jsx(Check, { size: 15 }) : _jsx(Copy, { size: 15 }), " ", copied ? t('share.copied') : t('share.copy')] })] }), link && (_jsxs("span", { className: "sk-share-meta", children: [t('share.size'), ": ", (link.length / 1024).toFixed(1), " KB", canNativeShare && (_jsxs("button", { type: "button", className: "sk-share-native", onClick: () => navigator.share({ url: link, title: t('share.title') }).catch(() => undefined), children: [_jsx(Send, { size: 13 }), " ", t('share.native')] }))] })), link && link.length > LONG_LINK && _jsx("p", { className: "sk-share-warn", children: t('share.long') })] }), _jsxs("div", { className: "sk-share-offline", children: [_jsx("strong", { children: t('share.offline') }), _jsx("p", { className: "sk-muted", children: t('share.offlineLead') }), _jsxs("div", { className: "sk-dialog-actions is-start", children: [_jsxs("button", { type: "button", className: "sk-btn", onClick: html, children: [_jsx(FileCode2, { size: 15 }), " ", t('share.html')] }), _jsxs("button", { type: "button", className: "sk-btn", onClick: sceneFile, children: [_jsx(Download, { size: 15 }), " ", t('share.file')] })] })] })] })) }));
}
