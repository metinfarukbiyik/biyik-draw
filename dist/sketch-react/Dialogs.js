'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { BookOpen, ClipboardCopy, Download, Github, X } from 'lucide-react';
import { exportToCanvas, exportToSvg } from '../sketch/index.js';
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
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState('');
    const elements = onlySelected && hasSelection ? editor.selectedElements() : editor.visibleElements();
    const options = { background: withBackground ? editor.state.background : null, theme: dark ? 'dark' : 'light', scale };
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
                    _jsx("img", { src: preview, alt: t('export.preview') })) : (_jsx("span", { className: "sk-muted", children: t('export.preparing') })) }), _jsxs("div", { className: "sk-export-options", children: [hasSelection && (_jsxs("label", { className: "sk-check", children: [_jsx("input", { type: "checkbox", checked: onlySelected, onChange: (e) => setOnlySelected(e.target.checked) }), t('export.onlySelected')] })), _jsxs("label", { className: "sk-check", children: [_jsx("input", { type: "checkbox", checked: withBackground, onChange: (e) => setWithBackground(e.target.checked) }), t('export.background')] }), _jsxs("label", { className: "sk-check", children: [_jsx("input", { type: "checkbox", checked: dark, onChange: (e) => setDark(e.target.checked) }), t('export.dark')] }), _jsxs("div", { className: "sk-scale", role: "group", "aria-label": t('export.scale'), children: [_jsx("span", { children: t('export.scale') }), [1, 2, 3].map((s) => (_jsxs("button", { type: "button", className: "sk-opt", "aria-pressed": scale === s, onClick: () => setScale(s), children: [s, "\u00D7"] }, s)))] }), _jsxs("div", { className: "sk-export-actions", children: [_jsxs("button", { type: "button", className: "sk-btn is-primary", onClick: png, children: [_jsx(Download, { size: 15 }), " PNG"] }), _jsxs("button", { type: "button", className: "sk-btn", onClick: svg, children: [_jsx(Download, { size: 15 }), " SVG"] }), _jsxs("button", { type: "button", className: "sk-btn", onClick: copy, children: [_jsx(ClipboardCopy, { size: 15 }), " ", t('export.copy')] })] }), status && (_jsx("p", { className: "sk-muted", role: "status", children: status }))] })] })) }));
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
