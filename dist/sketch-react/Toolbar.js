'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRight, Circle, Diamond, Eraser, Hand, Highlighter, ImagePlus, Lock, LockOpen, Minus, MousePointer2, Pencil, Square, Triangle, Type, } from 'lucide-react';
import { useEditor } from './useEditor.js';
import { useI18n } from './i18n.js';
/** Lazer işaretçi ikonu: parlayan nokta ve iz. */
export function LaserIcon({ size = 17 }) {
    return (_jsxs("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: "1.75", strokeLinecap: "round", "aria-hidden": true, children: [_jsx("path", { d: "M3 20c3-1 5-3 7-6s4.5-5 7.5-6", opacity: "0.45" }), _jsx("circle", { cx: "18.5", cy: "7.5", r: "2.5", fill: "currentColor", stroke: "none" }), _jsx("path", { d: "M18.5 2.5v1.2M23.5 7.5h-1.2M22 4l-.9.9" })] }));
}
const TOOLS = [
    { tool: 'hand', key: 'H', Icon: Hand },
    { tool: 'select', key: 'V', Icon: MousePointer2 },
    { tool: 'rectangle', key: 'R', Icon: Square },
    { tool: 'diamond', key: 'D', Icon: Diamond },
    { tool: 'triangle', key: 'U', Icon: Triangle },
    { tool: 'ellipse', key: 'O', Icon: Circle },
    { tool: 'arrow', key: 'A', Icon: ArrowRight },
    { tool: 'line', key: 'L', Icon: Minus },
    { tool: 'freedraw', key: 'P', Icon: Pencil },
    { tool: 'highlighter', key: 'M', Icon: Highlighter },
    { tool: 'laser', key: 'K', Icon: LaserIcon },
    { tool: 'text', key: 'T', Icon: Type },
    { tool: 'image', key: '9', Icon: ImagePlus },
    { tool: 'eraser', key: 'E', Icon: Eraser },
];
export default function Toolbar({ editor }) {
    const state = useEditor(editor);
    const { t } = useI18n();
    return (_jsxs("div", { className: "sk-toolbar sk-glass", role: "toolbar", "aria-label": t('tools.aria'), children: [_jsx("button", { type: "button", className: "sk-tool sk-tool-lock", "aria-pressed": state.toolLocked, title: `${t('tools.lock')} (Q)`, onClick: () => editor.toggleToolLock(), children: state.toolLocked ? _jsx(Lock, { size: 16 }) : _jsx(LockOpen, { size: 16 }) }), _jsx("span", { className: "sk-toolbar-sep", "aria-hidden": true }), TOOLS.map(({ tool, key, Icon }) => {
                const label = t(`tool.${tool}`);
                return (_jsxs("button", { type: "button", className: "sk-tool", "aria-pressed": state.tool === tool, "aria-label": label, title: `${label} — ${key}`, onClick: () => editor.setTool(tool), children: [_jsx(Icon, { size: 17, strokeWidth: 1.75 }), _jsx("span", { className: "sk-tool-key", "aria-hidden": true, children: key })] }, tool));
            })] }));
}
