'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, Circle, Diamond, Eye, EyeOff, Folder, Group, Image as ImageIcon, Lock, LockOpen, Minus, Pencil, Square, Triangle, Type, Ungroup, X, } from 'lucide-react';
import { useEditor } from './useEditor.js';
import { useI18n } from './i18n.js';
const TYPE_META = {
    rectangle: { Icon: Square },
    diamond: { Icon: Diamond },
    triangle: { Icon: Triangle },
    ellipse: { Icon: Circle },
    line: { Icon: Minus },
    arrow: { Icon: ArrowRight },
    freedraw: { Icon: Pencil },
    text: { Icon: Type },
    image: { Icon: ImageIcon },
};
function displayName(el, t) {
    if (el.name)
        return el.name;
    const base = t((el.type === 'image' ? 'type.image' : `tool.${el.type}`));
    const text = el.text?.trim().split('\n')[0];
    if (el.type === 'text')
        return text || base;
    return text ? `${base} · ${text}` : base;
}
const DRAG_TYPE = 'application/x-biyik-layers';
export default function LayersPanel({ editor, onClose }) {
    const state = useEditor(editor);
    const { t } = useI18n();
    const [collapsed, setCollapsed] = useState(new Set());
    const [renaming, setRenaming] = useState(null);
    const [drop, setDrop] = useState(null);
    const selected = new Set(state.selectedIds);
    // Üstteki öğe listenin başında; grup üyeleri grubun altında toplanır
    const ordered = [...editor.elements].reverse();
    const rows = [];
    const seen = new Set();
    for (const el of ordered) {
        if (el.groupId) {
            if (seen.has(el.groupId))
                continue;
            seen.add(el.groupId);
            const members = ordered.filter((m) => m.groupId === el.groupId);
            const isCollapsed = collapsed.has(el.groupId);
            rows.push({ kind: 'group', id: el.groupId, members, collapsed: isCollapsed });
            if (!isCollapsed)
                for (const m of members)
                    rows.push({ kind: 'element', el: m, depth: 1 });
        }
        else
            rows.push({ kind: 'element', el, depth: 0 });
    }
    const rowIds = (row) => (row.kind === 'group' ? row.members.map((m) => m.id) : [row.el.id]);
    const rowKey = (row) => (row.kind === 'group' ? `g:${row.id}` : row.el.id);
    const onDragStart = (e, row) => {
        e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(rowIds(row)));
        e.dataTransfer.effectAllowed = 'move';
    };
    const whereOf = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        return e.clientY < r.top + r.height / 2 ? 'above' : 'below';
    };
    const onDrop = (e, row) => {
        e.preventDefault();
        setDrop(null);
        const raw = e.dataTransfer.getData(DRAG_TYPE);
        if (!raw)
            return;
        const ids = JSON.parse(raw);
        const where = whereOf(e);
        // Listede üstte görünen = sahnede üstte. Grubun üstüne: en üst üye; altına: en alt üye.
        const target = row.kind === 'group' ? (where === 'above' ? row.members[0] : row.members[row.members.length - 1]) : row.el;
        editor.placeLayers(ids, target.id, where);
    };
    const dropProps = (row) => ({
        onDragOver: (e) => {
            if (!e.dataTransfer.types.includes(DRAG_TYPE))
                return;
            e.preventDefault();
            const where = whereOf(e);
            const key = rowKey(row);
            if (drop?.key !== key || drop.where !== where)
                setDrop({ key, where });
        },
        onDragLeave: () => setDrop(null),
        onDrop: (e) => onDrop(e, row),
    });
    const dropClass = (row) => drop?.key === rowKey(row) ? (drop.where === 'above' ? ' is-drop-above' : ' is-drop-below') : '';
    const toggles = (ids, hidden, locked) => (_jsxs("span", { className: "sk-layer-tools", children: [_jsx("button", { type: "button", className: `sk-layer-tool${locked ? ' is-on' : ''}`, "aria-label": locked ? t('action.unlock') : t('action.lock'), title: locked ? t('action.unlock') : t('action.lock'), onClick: (e) => {
                    e.stopPropagation();
                    editor.setLocked(ids, !locked);
                }, children: locked ? _jsx(Lock, { size: 13 }) : _jsx(LockOpen, { size: 13 }) }), _jsx("button", { type: "button", className: `sk-layer-tool${hidden ? ' is-on' : ''}`, "aria-label": hidden ? t('action.show') : t('action.hide'), title: hidden ? t('action.show') : t('action.hide'), onClick: (e) => {
                    e.stopPropagation();
                    editor.setHidden(ids, !hidden);
                }, children: hidden ? _jsx(EyeOff, { size: 13 }) : _jsx(Eye, { size: 13 }) })] }));
    const canGroup = new Set(editor.selectedElements().map((el) => el.groupId ?? el.id)).size > 1;
    return (_jsxs("aside", { className: "sk-layers sk-glass", "aria-label": t('layers.title'), children: [_jsxs("header", { className: "sk-layers-head", children: [_jsxs("span", { children: [t('layers.title'), " ", _jsx("span", { className: "sk-layers-count", children: editor.elements.length })] }), _jsxs("span", { className: "sk-layers-actions", children: [_jsx("button", { type: "button", className: "sk-ibtn", disabled: !canGroup, title: `${t('layers.groupSelection')} (⌘G)`, "aria-label": t('layers.groupSelection'), onClick: () => editor.group(), children: _jsx(Group, { size: 15 }) }), _jsx("button", { type: "button", className: "sk-ibtn", title: t('close'), "aria-label": t('close'), onClick: onClose, children: _jsx(X, { size: 15 }) })] })] }), !rows.length ? (_jsx("p", { className: "sk-layers-empty", children: t('layers.empty') })) : (_jsx("ul", { className: "sk-layer-list", role: "list", children: rows.map((row) => {
                    if (row.kind === 'group') {
                        const ids = row.members.map((m) => m.id);
                        const allHidden = row.members.every((m) => m.hidden);
                        const allLocked = row.members.every((m) => m.locked);
                        const isSel = row.members.every((m) => selected.has(m.id));
                        return (_jsxs("li", { className: `sk-layer is-group${isSel ? ' is-selected' : ''}${allHidden ? ' is-hidden' : ''}${dropClass(row)}`, draggable: true, onDragStart: (e) => onDragStart(e, row), ...dropProps(row), onClick: () => editor.select(ids), children: [_jsx("button", { type: "button", className: "sk-layer-caret", "aria-label": row.collapsed ? t('layers.expand') : t('layers.collapse'), onClick: (e) => {
                                        e.stopPropagation();
                                        setCollapsed((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(row.id))
                                                next.delete(row.id);
                                            else
                                                next.add(row.id);
                                            return next;
                                        });
                                    }, children: row.collapsed ? _jsx(ChevronRight, { size: 13 }) : _jsx(ChevronDown, { size: 13 }) }), _jsx(Folder, { size: 14, className: "sk-layer-icon" }), _jsxs("span", { className: "sk-layer-name", children: [t('layers.group'), " ", _jsx("span", { className: "sk-layers-count", children: row.members.length })] }), _jsx("span", { className: "sk-layer-tools", children: _jsx("button", { type: "button", className: "sk-layer-tool", title: t('action.ungroup'), "aria-label": t('action.ungroup'), onClick: (e) => {
                                            e.stopPropagation();
                                            editor.select(ids);
                                            editor.ungroup();
                                        }, children: _jsx(Ungroup, { size: 13 }) }) }), toggles(ids, allHidden, allLocked)] }, rowKey(row)));
                    }
                    const { el, depth } = row;
                    const { Icon } = TYPE_META[el.type];
                    return (_jsxs("li", { className: `sk-layer${selected.has(el.id) ? ' is-selected' : ''}${el.hidden ? ' is-hidden' : ''}${el.locked ? ' is-locked' : ''}${depth ? ' is-child' : ''}${dropClass(row)}`, draggable: renaming !== el.id, onDragStart: (e) => onDragStart(e, row), ...dropProps(row), onClick: (e) => {
                            if (el.hidden || el.locked)
                                return;
                            if (e.shiftKey || e.metaKey || e.ctrlKey) {
                                const next = new Set(selected);
                                if (next.has(el.id))
                                    next.delete(el.id);
                                else
                                    next.add(el.id);
                                editor.selectExact([...next]);
                            }
                            else
                                editor.selectExact([el.id]);
                        }, onDoubleClick: () => setRenaming(el.id), children: [_jsx(Icon, { size: 14, className: "sk-layer-icon" }), renaming === el.id ? (_jsx("input", { className: "sk-layer-input", defaultValue: el.name ?? displayName(el, t), autoFocus: true, onFocus: (e) => e.target.select(), onClick: (e) => e.stopPropagation(), onKeyDown: (e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter')
                                        e.target.blur();
                                    if (e.key === 'Escape')
                                        setRenaming(null);
                                }, onBlur: (e) => {
                                    if (renaming === el.id)
                                        editor.rename(el.id, e.target.value === displayName({ ...el, name: undefined }, t) ? '' : e.target.value);
                                    setRenaming(null);
                                } })) : (_jsx("span", { className: "sk-layer-name", title: t('layers.renameHint'), children: displayName(el, t) })), toggles([el.id], !!el.hidden, !!el.locked)] }, rowKey(row)));
                }) })), _jsx("p", { className: "sk-layers-foot", children: t('layers.foot') })] }));
}
