'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrushCleaning, Eraser, Hand, Highlighter, Minimize2, MousePointer2, Pencil, Redo2, Type, Undo2, } from 'lucide-react';
import { HIGHLIGHT_COLORS } from '../sketch/index.js';
import { useEditor } from './useEditor.js';
import { useI18n } from './i18n.js';
import { LaserIcon } from './Toolbar.js';
import { PAPER_ICONS, PAPERS } from './PaperPicker.js';
/** Ders modunda kalem renkleri: büyük, kolay seçilen beş renk. */
const PEN_COLORS = ['#18181b', '#dc2626', '#2563eb', '#16a34a', '#d97706'];
const TOOLS = [
    { tool: 'freedraw', Icon: Pencil },
    { tool: 'highlighter', Icon: Highlighter },
    { tool: 'laser', Icon: LaserIcon },
    { tool: 'eraser', Icon: Eraser },
    { tool: 'text', Icon: Type },
    { tool: 'select', Icon: MousePointer2 },
    { tool: 'hand', Icon: Hand },
];
/**
 * Ders modu çubuğu: tablette parmakla rahat basılan büyük düğmeler. Kalem, fosforlu kalem,
 * lazer, silgi; renk ve kalınlık; kâğıt deseni; geri al ve yeni sayfa.
 */
export default function PresentBar({ editor, onExit }) {
    const state = useEditor(editor);
    const { t } = useI18n();
    const highlighter = state.tool === 'highlighter';
    const colors = highlighter ? HIGHLIGHT_COLORS : PEN_COLORS;
    const current = highlighter ? state.highlightColor : state.style.strokeColor;
    const nextPaper = (p) => PAPERS[(PAPERS.indexOf(p) + 1) % PAPERS.length];
    return (_jsxs("div", { className: "sk-present sk-glass", role: "toolbar", "aria-label": t('menu.present'), children: [_jsx("div", { className: "sk-present-group", children: TOOLS.map(({ tool, Icon }) => {
                    const label = t((tool === 'freedraw' ? 'tool.freedraw' : `tool.${tool}`));
                    return (_jsx("button", { type: "button", className: "sk-present-btn", "aria-pressed": state.tool === tool, "aria-label": label, title: label, onClick: () => editor.setTool(tool), children: _jsx(Icon, { size: 20, strokeWidth: 1.75 }) }, tool));
                }) }), _jsx("span", { className: "sk-present-sep", "aria-hidden": true }), _jsx("div", { className: "sk-present-group", children: colors.map((c) => (_jsx("button", { type: "button", className: "sk-present-color", style: { background: c }, "aria-pressed": current === c, "aria-label": c, onClick: () => {
                        if (highlighter)
                            editor.setHighlightColor(c);
                        else {
                            editor.setStyle({ strokeColor: c });
                            if (state.tool !== 'freedraw' && state.tool !== 'text')
                                editor.setTool('freedraw');
                        }
                    } }, c))) }), _jsx("span", { className: "sk-present-sep", "aria-hidden": true }), _jsx("div", { className: "sk-present-group", role: "group", "aria-label": t('present.size'), children: [1, 2, 4].map((w) => (_jsx("button", { type: "button", className: "sk-present-btn", "aria-pressed": state.style.strokeWidth === w, "aria-label": `${t('present.size')} ${w}`, onClick: () => editor.setStyle({ strokeWidth: w }), children: _jsx("span", { className: "sk-present-dot", style: { width: 4 + w * 2.5, height: 4 + w * 2.5 } }) }, w))) }), _jsx("span", { className: "sk-present-sep", "aria-hidden": true }), _jsxs("div", { className: "sk-present-group", children: [_jsx("button", { type: "button", className: "sk-present-btn", "aria-label": `${t('present.paper')}: ${t(`paper.${state.paper}`)}`, title: `${t('present.paper')}: ${t(`paper.${state.paper}`)}`, onClick: () => editor.setPaper(nextPaper(state.paper)), children: PAPER_ICONS[state.paper] }), _jsx("button", { type: "button", className: "sk-present-btn", "aria-label": t('history.undo'), disabled: !editor.canUndo, onClick: () => editor.undo(), children: _jsx(Undo2, { size: 20 }) }), _jsx("button", { type: "button", className: "sk-present-btn", "aria-label": t('history.redo'), disabled: !editor.canRedo, onClick: () => editor.redo(), children: _jsx(Redo2, { size: 20 }) }), _jsx("button", { type: "button", className: "sk-present-btn", "aria-label": t('present.clear'), title: t('present.clear'), onClick: () => editor.clear(), children: _jsx(BrushCleaning, { size: 20 }) }), _jsx("button", { type: "button", className: "sk-present-btn is-exit", "aria-label": t('present.exit'), title: t('present.exit'), onClick: onExit, children: _jsx(Minimize2, { size: 20 }) })] })] }));
}
