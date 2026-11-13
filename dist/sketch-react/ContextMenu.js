'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from './i18n.js';
import { PaperPicker } from './PaperPicker.js';
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
/** Kısayol gösterimi: Mac'te ⌘⇧⌥, diğerlerinde Ctrl+Shift+Alt+. */
const keys = (...parts) => parts
    .map((p) => isMac ? { mod: '⌘', shift: '⇧', alt: '⌥' }[p] ?? p : { mod: 'Ctrl+', shift: 'Shift+', alt: 'Alt+' }[p] ?? p)
    .join('');
export default function ContextMenu({ editor, x, y, actions, onClose, }) {
    const { t } = useI18n();
    const ref = useRef(null);
    const [pos, setPos] = useState({ left: x, top: y });
    // Ekrandan taşmasın
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const { width, height } = el.getBoundingClientRect();
        setPos({
            left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
            top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
        });
    }, [x, y]);
    const state = editor.state;
    const selected = editor.selectedElements();
    const has = selected.length > 0;
    const units = new Set(selected.map((el) => el.groupId ?? el.id)).size;
    const grouped = selected.some((el) => el.groupId);
    const item = (label, action, shortcut, extra = {}) => ({
        kind: 'item',
        label: t(label),
        action,
        shortcut,
        ...extra,
    });
    const sep = { kind: 'sep' };
    const exportItems = [
        item('ctx.copyPng', actions.copyPng, keys('shift', 'alt', 'C')),
        item('ctx.copySvg', actions.copySvg),
        item('ctx.copyText', actions.copyText),
    ];
    let items;
    if (state.readOnly) {
        items = [...exportItems, sep, item('ctx.fit', () => editor.zoomToFit(), keys('shift', '1'))];
    }
    else if (has) {
        items = [
            item('ctx.cut', actions.cut, keys('mod', 'X')),
            item('ctx.copy', actions.copy, keys('mod', 'C')),
            item('ctx.paste', actions.paste, keys('mod', 'V')),
            sep,
            item('ctx.frame', () => editor.wrapSelectionInFrame()),
            sep,
            ...exportItems,
            sep,
            item('action.copyStyle', () => editor.copyStyle(), keys('mod', 'alt', 'C')),
            item('action.pasteStyle', () => editor.pasteStyle(), keys('mod', 'alt', 'V')),
            sep,
            ...(editor.canBindText() ? [item('ctx.bindText', () => editor.bindTextToContainer())] : []),
            ...(editor.canWrapText() ? [item('ctx.wrapText', () => editor.wrapTextInContainer())] : []),
            ...(units > 1 && !grouped ? [item('action.group', () => editor.group(), keys('mod', 'G'))] : []),
            ...(grouped ? [item('action.ungroup', () => editor.ungroup(), keys('mod', 'shift', 'G'))] : []),
            sep,
            item('layer.backward', () => editor.reorder('backward'), keys('mod', '[')),
            item('layer.forward', () => editor.reorder('forward'), keys('mod', ']')),
            item('layer.back', () => editor.reorder('back'), keys('mod', 'shift', '[')),
            item('layer.front', () => editor.reorder('front'), keys('mod', 'shift', ']')),
            sep,
            item('action.flipH', () => editor.flip('x'), keys('shift', 'H')),
            item('action.flipV', () => editor.flip('y'), keys('shift', 'V')),
            sep,
            item('ctx.copyLink', actions.copyLink),
            sep,
            item('action.duplicate', () => editor.duplicateSelected(), keys('mod', 'D')),
            item('action.lock', () => editor.lockSelected(), keys('mod', 'shift', 'L')),
            sep,
            item('action.delete', () => editor.deleteSelected(), 'Delete', { danger: true }),
        ];
    }
    else {
        items = [
            item('ctx.paste', actions.paste, keys('mod', 'V')),
            item('help.selectAll', () => editor.selectAll(), keys('mod', 'A')),
            sep,
            ...exportItems,
            sep,
            item('menu.grid', () => editor.toggleGrid(), keys('mod', "'"), { checked: state.grid }),
            {
                kind: 'custom',
                node: (_jsxs("div", { className: "sk-ctx-paper", children: [_jsx("span", { children: t('paper.title') }), _jsx(PaperPicker, { value: state.paper, onChange: (p) => editor.setPaper(p) })] })),
            },
            item('ctx.fit', () => editor.zoomToFit(), keys('shift', '1')),
            item(state.theme === 'dark' ? 'menu.light' : 'menu.dark', () => editor.setTheme(state.theme === 'dark' ? 'light' : 'dark')),
            sep,
            item('menu.present', actions.present, keys('alt', 'P')),
            item('menu.share', actions.share),
        ];
    }
    // Art arda ya da baştaki/sondaki ayraçları at
    const cleaned = items.filter((it, i, arr) => it.kind !== 'sep' || (i > 0 && i < arr.length - 1 && arr[i - 1].kind !== 'sep'));
    return (_jsx("div", { ref: ref, className: "sk-ctx sk-glass", role: "menu", style: { left: pos.left, top: pos.top }, onContextMenu: (e) => e.preventDefault(), children: cleaned.map((it, i) => it.kind === 'sep' ? (_jsx("hr", {}, `sep-${i}`)) : it.kind === 'custom' ? (_jsx("div", { children: it.node }, `custom-${i}`)) : (_jsxs("button", { type: "button", role: it.checked === undefined ? 'menuitem' : 'menuitemcheckbox', "aria-checked": it.checked, className: it.danger ? 'is-danger' : undefined, onClick: () => {
                onClose();
                it.action();
            }, children: [_jsxs("span", { children: [it.label, it.checked && ' ✓'] }), it.shortcut && _jsx("kbd", { children: it.shortcut })] }, it.label))) }));
}
