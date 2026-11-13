'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useI18n } from './i18n.js';
const G = ({ children }) => (_jsxs("svg", { viewBox: "0 0 20 20", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeLinecap: "round", "aria-hidden": true, children: [_jsx("rect", { x: "3", y: "3", width: "14", height: "14", rx: "2.5", strokeWidth: "1.3" }), children] }));
export const PAPER_ICONS = {
    none: _jsx(G, { children: null }),
    grid: (_jsx(G, { children: _jsx("path", { d: "M7.7 3v14M12.3 3v14M3 7.7h14M3 12.3h14", strokeWidth: "0.9" }) })),
    dots: (_jsx(G, { children: [7, 10, 13].flatMap((x) => [7, 10, 13].map((y) => _jsx("circle", { cx: x, cy: y, r: "0.85", fill: "currentColor", stroke: "none" }, `${x}-${y}`))) })),
    lines: (_jsxs(G, { children: [_jsx("path", { d: "M5.5 7h11M5.5 10h11M5.5 13h11", strokeWidth: "0.9" }), _jsx("path", { d: "M5.5 3v14", strokeWidth: "0.9", opacity: "0.6" })] })),
    guide: (_jsxs(G, { children: [_jsx("path", { d: "M3 6h14M3 14h14", strokeWidth: "0.8", opacity: "0.6" }), _jsx("path", { d: "M3 8.7h14M3 11.3h14", strokeWidth: "1.3" })] })),
};
export const PAPERS = ['none', 'grid', 'dots', 'lines', 'guide'];
/** Kâğıt deseni seçici (bölmeli düğmeler). */
export function PaperPicker({ value, onChange }) {
    const { t } = useI18n();
    return (_jsx("div", { className: "sk-seg", role: "group", "aria-label": t('paper.title'), children: PAPERS.map((p) => (_jsx("button", { type: "button", "aria-pressed": value === p, "aria-label": t(`paper.${p}`), title: t(`paper.${p}`), onClick: () => onChange(p), children: PAPER_ICONS[p] }, p))) }));
}
