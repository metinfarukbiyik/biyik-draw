'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignLeft, AlignRight, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, ArrowDown, ArrowUp, BringToFront, Copy, FlipHorizontal2, FlipVertical2, Group, Lock, Paintbrush, PaintBucket, SendToBack, Trash2, Ungroup, } from 'lucide-react';
import { BACKGROUND_COLORS, HIGHLIGHT_COLORS, STROKE_COLORS, } from '../sketch/index.js';
import { useEditor } from './useEditor.js';
import { useI18n } from './i18n.js';
const TOOL_TYPE = {
    rectangle: 'rectangle',
    diamond: 'diamond',
    triangle: 'triangle',
    ellipse: 'ellipse',
    arrow: 'arrow',
    line: 'line',
    freedraw: 'freedraw',
    highlighter: 'freedraw',
    text: 'text',
};
const SHAPES = ['rectangle', 'diamond', 'triangle', 'ellipse'];
/* ── Küçük çizim ikonları ── */
const Glyph = ({ children }) => (_jsx("svg", { viewBox: "0 0 20 20", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: children }));
const ARROWHEADS = [
    { value: 'none', end: 'M3 10h14', start: 'M3 10h14' },
    { value: 'arrow', end: 'M3 10h14M12 5l5 5-5 5', start: 'M3 10h14M8 5l-5 5 5 5' },
    { value: 'triangle', end: 'M3 10h10M12 5.5 17 10l-5 4.5z', start: 'M7 10h10M8 5.5 3 10l5 4.5z' },
    { value: 'dot', end: 'M3 10h9M17 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z', start: 'M8 10h9M8 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z' },
    { value: 'bar', end: 'M3 10h14M17 5v10', start: 'M3 10h14M3 5v10' },
];
/* ── Yapı taşları ── */
function Section({ children }) {
    return _jsx("section", { className: "sk-sec", children: children });
}
function Field({ label, aside, value, half, children, }) {
    return (_jsxs("div", { className: `sk-field${half ? ' is-half' : ''}`, children: [_jsxs("div", { className: "sk-field-head", children: [_jsx("span", { children: label }), aside ?? (value && _jsx("span", { className: "sk-field-value", children: value }))] }), children] }));
}
function Seg({ value, options, onChange, label, }) {
    return (_jsx("div", { className: "sk-seg", role: "group", "aria-label": label, children: options.map((o) => (_jsx("button", { type: "button", "aria-pressed": o.value === value, "aria-label": o.label, title: o.label, onClick: () => onChange(o.value), children: o.icon }, String(o.value)))) }));
}
function IconBtn({ label, onClick, children }) {
    return (_jsx("button", { type: "button", className: "sk-ibtn", "aria-label": label, title: label, onClick: onClick, children: children }));
}
function Swatches({ colors, value, onChange, label, }) {
    const custom = !colors.includes(value);
    const { t } = useI18n();
    const noFill = t('style.noFill');
    return (_jsxs("div", { className: "sk-swatches", role: "group", "aria-label": label, style: { gridTemplateColumns: `repeat(${colors.length}, minmax(0, 1fr)) 1px minmax(0, 1fr)` }, children: [colors.map((c) => (_jsx("button", { type: "button", className: `sk-swatch${c === 'transparent' ? ' is-none' : ''}`, style: c === 'transparent' ? undefined : { background: c }, "aria-pressed": value === c, "aria-label": c === 'transparent' ? noFill : c, title: c === 'transparent' ? noFill : c, onClick: () => onChange(c) }, c))), _jsx("span", { className: "sk-swatches-sep", "aria-hidden": true }), _jsx("label", { className: `sk-swatch is-custom${custom ? ' is-active' : ''}`, style: custom && value !== 'transparent' ? { background: value } : undefined, title: `${label} · ${t('style.custom')}`, children: _jsx("input", { type: "color", value: custom && value !== 'transparent' ? value : '#000000', onChange: (e) => onChange(e.target.value), "aria-label": `${label} · ${t('style.custom')}` }) })] }));
}
export default function StylePanel({ editor }) {
    const state = useEditor(editor);
    const { t } = useI18n();
    const editing = editor.getElement(state.editingId);
    const selected = editor.selectedElements();
    const targets = editing ? [editing] : selected;
    const toolType = TOOL_TYPE[state.tool];
    if (!targets.length && !toolType)
        return null;
    const types = new Set(targets.length ? targets.map((t) => t.type) : [toolType]);
    // Fosforlu kalem: kendi renk paleti ve rengi
    const highlightMode = targets.length ? targets.every((el) => el.highlight) : state.tool === 'highlighter';
    const v = targets[0] ?? (highlightMode ? { ...state.style, strokeColor: state.highlightColor } : state.style);
    const set = (patch) => editor.setStyle(patch);
    const has = (...t) => t.some((x) => types.has(x));
    const onlyImages = types.size === 1 && types.has('image');
    const hasShape = has(...SHAPES);
    const hasLines = has(...SHAPES, 'line', 'arrow', 'freedraw');
    const showText = has('text') || targets.some((t) => SHAPES.includes(t.type) && t.text) || (!!editing && SHAPES.includes(editing.type));
    const units = new Set(selected.map((el) => el.groupId ?? el.id)).size;
    const grouped = selected.some((el) => el.groupId);
    return (_jsxs("aside", { className: "sk-panel sk-glass", "aria-label": t('style.aria'), 
        // Metin yazılırken panel düğmeleri odağı metin kutusundan almasın
        onMouseDown: (e) => {
            if (editing && !(e.target instanceof HTMLInputElement))
                e.preventDefault();
        }, children: [!onlyImages && (_jsxs(Section, { children: [_jsx(Field, { label: t('style.stroke'), value: v.strokeColor.toUpperCase(), children: _jsx(Swatches, { colors: highlightMode ? HIGHLIGHT_COLORS : STROKE_COLORS, value: v.strokeColor, onChange: (c) => (highlightMode ? editor.setHighlightColor(c) : set({ strokeColor: c })), label: t('style.stroke') }) }), hasShape && (_jsx(Field, { label: t('style.background'), value: v.backgroundColor === 'transparent' ? t('style.noFill') : v.backgroundColor.toUpperCase(), children: _jsx(Swatches, { colors: BACKGROUND_COLORS, value: v.backgroundColor, onChange: (c) => set({ backgroundColor: c }), label: t('style.background') }) })), hasShape && v.backgroundColor !== 'transparent' && (_jsx(Field, { label: t('style.fill'), value: t(v.fillStyle === 'hachure' ? 'style.hachure' : v.fillStyle === 'cross' ? 'style.cross' : 'style.solid'), children: _jsx(Seg, { label: t('style.fill'), value: v.fillStyle, onChange: (fillStyle) => set({ fillStyle }), options: [
                                {
                                    value: 'hachure',
                                    label: t('style.hachure'),
                                    icon: (_jsxs(Glyph, { children: [_jsx("rect", { x: "3.5", y: "3.5", width: "13", height: "13", rx: "3", strokeWidth: "1.4" }), _jsx("path", { d: "M4 11 11 4M6 16 16 6M11 16l5-5", strokeWidth: "1.1" })] })),
                                },
                                {
                                    value: 'cross',
                                    label: t('style.cross'),
                                    icon: (_jsxs(Glyph, { children: [_jsx("rect", { x: "3.5", y: "3.5", width: "13", height: "13", rx: "3", strokeWidth: "1.4" }), _jsx("path", { d: "M4 11 11 4M6 16 16 6M11 16l5-5M9 4l7 7M4 6l10 10M4 11l5 5", strokeWidth: "0.9" })] })),
                                },
                                {
                                    value: 'solid',
                                    label: t('style.solid'),
                                    icon: (_jsx(Glyph, { children: _jsx("rect", { x: "3.5", y: "3.5", width: "13", height: "13", rx: "3", strokeWidth: "1.4", fill: "currentColor" }) })),
                                },
                            ] }) }))] })), hasLines && (_jsxs(Section, { children: [_jsx(Field, { label: t('style.width'), half: has(...SHAPES, 'line', 'arrow'), children: _jsx(Seg, { label: t('style.width'), value: v.strokeWidth, onChange: (strokeWidth) => set({ strokeWidth }), options: [1, 2, 4].map((w) => ({
                                value: w,
                                label: t(w === 1 ? 'style.thin' : w === 2 ? 'style.bold' : 'style.extra'),
                                icon: (_jsx(Glyph, { children: _jsx("path", { d: "M4 10h12", strokeWidth: w * 0.9 + 0.7 }) })),
                            })) }) }), has(...SHAPES, 'line', 'arrow') && (_jsxs(_Fragment, { children: [_jsx(Field, { label: t('style.strokeStyle'), half: true, children: _jsx(Seg, { label: t('style.strokeStyle'), value: v.strokeStyle, onChange: (strokeStyle) => set({ strokeStyle }), options: [
                                        { value: 'solid', label: t('style.solidLine'), icon: _jsx(Glyph, { children: _jsx("path", { d: "M3 10h14", strokeWidth: "1.8" }) }) },
                                        { value: 'dashed', label: t('style.dashed'), icon: _jsx(Glyph, { children: _jsx("path", { d: "M3 10h14", strokeWidth: "1.8", strokeDasharray: "4 3" }) }) },
                                        { value: 'dotted', label: t('style.dotted'), icon: _jsx(Glyph, { children: _jsx("path", { d: "M3 10h14", strokeWidth: "2.2", strokeDasharray: "0.1 3.8" }) }) },
                                    ] }) }), _jsx(Field, { label: t('style.roughness'), half: has('rectangle', 'diamond', 'triangle', 'line', 'arrow'), children: _jsx(Seg, { label: t('style.roughness'), value: v.roughness, onChange: (roughness) => set({ roughness }), options: [
                                        {
                                            value: 0,
                                            label: t('style.rough0'),
                                            icon: (_jsx(Glyph, { children: _jsx("path", { d: "M3 10h14", strokeWidth: "1.6" }) })),
                                        },
                                        {
                                            value: 1,
                                            label: t('style.rough1'),
                                            icon: (_jsx(Glyph, { children: _jsx("path", { d: "M3 10.6c3-1.6 5.6.9 8.6-.5 2.4-1.1 4-.1 5.4-.5", strokeWidth: "1.5" }) })),
                                        },
                                        {
                                            value: 2,
                                            label: t('style.rough2'),
                                            icon: (_jsxs(Glyph, { children: [_jsx("path", { d: "M3 12c2-4.2 4.4 2.6 7-1.6s4.6 2.4 7-2.2", strokeWidth: "1.3" }), _jsx("path", { d: "M3.4 10c2.4-2.4 4.4 2.8 6.9-.4 2.2-2.8 4.4 1 6.5-1.6", strokeWidth: "0.9" })] })),
                                        },
                                    ] }) })] })), has('rectangle', 'diamond', 'triangle', 'line', 'arrow') && (_jsx(Field, { label: t('style.edges'), half: true, children: _jsx(Seg, { label: t('style.edges'), value: v.edges, onChange: (edges) => set({ edges }), options: [
                                { value: 'sharp', label: t('style.sharp'), icon: _jsx(Glyph, { children: _jsx("path", { d: "M5 15V5h10", strokeWidth: "1.6" }) }) },
                                { value: 'round', label: t('style.round'), icon: _jsx(Glyph, { children: _jsx("path", { d: "M5 15V10a5 5 0 0 1 5-5h5", strokeWidth: "1.6" }) }) },
                            ] }) }))] })), has('arrow') && (_jsxs(Section, { children: [_jsx(Field, { label: t('style.startHead'), value: t(`head.${v.startArrowhead}`), children: _jsx(Seg, { label: t('style.startHead'), value: v.startArrowhead, onChange: (startArrowhead) => set({ startArrowhead }), options: ARROWHEADS.map((a) => ({
                                value: a.value,
                                label: t(`head.${a.value}`),
                                icon: _jsx(Glyph, { children: _jsx("path", { d: a.start, strokeWidth: "1.5" }) }),
                            })) }) }), _jsx(Field, { label: t('style.endHead'), value: t(`head.${v.endArrowhead}`), children: _jsx(Seg, { label: t('style.endHead'), value: v.endArrowhead, onChange: (endArrowhead) => set({ endArrowhead }), options: ARROWHEADS.map((a) => ({
                                value: a.value,
                                label: t(`head.${a.value}`),
                                icon: _jsx(Glyph, { children: _jsx("path", { d: a.end, strokeWidth: "1.5" }) }),
                            })) }) })] })), showText && (_jsxs(Section, { children: [_jsx(Field, { label: t('style.font'), value: t(v.fontFamily === 'hand' ? 'style.fontHand' : v.fontFamily === 'sans' ? 'style.fontSans' : 'style.fontMono'), children: _jsx(Seg, { label: t('style.font'), value: v.fontFamily, onChange: (fontFamily) => set({ fontFamily }), options: [
                                { value: 'hand', label: t('style.fontHand'), icon: _jsx("span", { className: "sk-seg-text is-hand", children: "Aa" }) },
                                { value: 'sans', label: t('style.fontSans'), icon: _jsx("span", { className: "sk-seg-text", children: "Aa" }) },
                                { value: 'mono', label: t('style.fontMono'), icon: _jsx("span", { className: "sk-seg-text is-mono", children: '{}' }) },
                            ] }) }), _jsx(Field, { label: t('style.size'), half: true, children: _jsx(Seg, { label: t('style.size'), value: v.fontSize, onChange: (fontSize) => set({ fontSize }), options: [
                                [16, 'S'],
                                [24, 'M'],
                                [32, 'L'],
                                [48, 'XL'],
                            ].map(([size, l]) => ({ value: size, label: `${t('style.size')} ${l}`, icon: _jsx("span", { className: "sk-seg-text", children: l }) })) }) }), _jsx(Field, { label: t('style.align'), half: true, children: _jsx(Seg, { label: t('style.align'), value: v.textAlign, onChange: (textAlign) => set({ textAlign }), options: [
                                { value: 'left', label: t('style.alignLeft'), icon: _jsx(AlignLeft, { size: 16 }) },
                                { value: 'center', label: t('style.alignCenter'), icon: _jsx(AlignCenter, { size: 16 }) },
                                { value: 'right', label: t('style.alignRight'), icon: _jsx(AlignRight, { size: 16 }) },
                            ] }) })] })), _jsx(Section, { children: _jsx(Field, { label: t('style.opacity'), aside: _jsxs("span", { className: "sk-field-value", children: [v.opacity, "%"] }), children: _jsx("input", { className: "sk-range", type: "range", min: 0, max: 100, step: 5, value: v.opacity, style: { ['--val']: `${v.opacity}%` }, onChange: (e) => set({ opacity: Number(e.target.value) }), "aria-label": t('style.opacity') }) }) }), selected.length > 0 && !editing && (_jsxs(Section, { children: [units > 1 && (_jsx(Field, { label: t('style.arrange'), children: _jsxs("div", { className: "sk-icons", children: [_jsx(IconBtn, { label: t('arrange.left'), onClick: () => editor.align('left'), children: _jsx(AlignStartVertical, { size: 16 }) }), _jsx(IconBtn, { label: t('arrange.hcenter'), onClick: () => editor.align('hcenter'), children: _jsx(AlignCenterVertical, { size: 16 }) }), _jsx(IconBtn, { label: t('arrange.right'), onClick: () => editor.align('right'), children: _jsx(AlignEndVertical, { size: 16 }) }), _jsx(IconBtn, { label: t('arrange.top'), onClick: () => editor.align('top'), children: _jsx(AlignStartHorizontal, { size: 16 }) }), _jsx(IconBtn, { label: t('arrange.vcenter'), onClick: () => editor.align('vcenter'), children: _jsx(AlignCenterHorizontal, { size: 16 }) }), _jsx(IconBtn, { label: t('arrange.bottom'), onClick: () => editor.align('bottom'), children: _jsx(AlignEndHorizontal, { size: 16 }) }), units > 2 && (_jsxs(_Fragment, { children: [_jsx(IconBtn, { label: t('arrange.distX'), onClick: () => editor.distribute('x'), children: _jsx(AlignHorizontalDistributeCenter, { size: 16 }) }), _jsx(IconBtn, { label: t('arrange.distY'), onClick: () => editor.distribute('y'), children: _jsx(AlignVerticalDistributeCenter, { size: 16 }) })] }))] }) })), _jsx(Field, { label: t('style.layer'), children: _jsxs("div", { className: "sk-icons", children: [_jsx(IconBtn, { label: `${t('layer.back')} (⌘⇧[)`, onClick: () => editor.reorder('back'), children: _jsx(SendToBack, { size: 16 }) }), _jsx(IconBtn, { label: `${t('layer.backward')} (⌘[)`, onClick: () => editor.reorder('backward'), children: _jsx(ArrowDown, { size: 16 }) }), _jsx(IconBtn, { label: `${t('layer.forward')} (⌘])`, onClick: () => editor.reorder('forward'), children: _jsx(ArrowUp, { size: 16 }) }), _jsx(IconBtn, { label: `${t('layer.front')} (⌘⇧])`, onClick: () => editor.reorder('front'), children: _jsx(BringToFront, { size: 16 }) })] }) }), _jsx(Field, { label: t('style.actions'), children: _jsxs("div", { className: "sk-icons", children: [_jsx(IconBtn, { label: `${t('action.duplicate')} (⌘D)`, onClick: () => editor.duplicateSelected(), children: _jsx(Copy, { size: 16 }) }), _jsx(IconBtn, { label: `${t('action.flipH')} (⇧H)`, onClick: () => editor.flip('x'), children: _jsx(FlipHorizontal2, { size: 16 }) }), _jsx(IconBtn, { label: `${t('action.flipV')} (⇧V)`, onClick: () => editor.flip('y'), children: _jsx(FlipVertical2, { size: 16 }) }), units > 1 && !grouped && (_jsx(IconBtn, { label: `${t('action.group')} (⌘G)`, onClick: () => editor.group(), children: _jsx(Group, { size: 16 }) })), grouped && (_jsx(IconBtn, { label: `${t('action.ungroup')} (⌘⇧G)`, onClick: () => editor.ungroup(), children: _jsx(Ungroup, { size: 16 }) })), _jsx(IconBtn, { label: `${t('action.copyStyle')} (⌘⌥C)`, onClick: () => editor.copyStyle(), children: _jsx(Paintbrush, { size: 16 }) }), _jsx(IconBtn, { label: `${t('action.pasteStyle')} (⌘⌥V)`, onClick: () => editor.pasteStyle(), children: _jsx(PaintBucket, { size: 16 }) }), _jsx(IconBtn, { label: `${t('action.lock')} (⌘⇧L)`, onClick: () => editor.lockSelected(), children: _jsx(Lock, { size: 16 }) }), _jsx(IconBtn, { label: `${t('action.delete')} (Delete)`, onClick: () => editor.deleteSelected(), children: _jsx(Trash2, { size: 16 }) })] }) })] }))] }));
}
