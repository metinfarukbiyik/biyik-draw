'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from 'react';
import { fontString, ImageCache, isShape, labelCenterY, labelWidth, LINE_HEIGHT, renderScene, themed, wrapText, } from '../sketch/index.js';
import { useEditor } from './useEditor.js';
import { useI18n } from './i18n.js';
const toInput = (e, rect) => ({
    id: e.pointerId,
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    button: e.button,
    type: e.pointerType,
    shift: e.shiftKey,
    alt: e.altKey,
    mod: e.metaKey || e.ctrlKey,
});
export default function Board({ editor, onDropFile, }) {
    const state = useEditor(editor);
    const { t } = useI18n();
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);
    const frame = useRef(0);
    const size = useRef({ width: 0, height: 0, dpr: 1 });
    const images = useMemo(() => new ImageCache(() => editor.remeasureText()), [editor]);
    // Tuval boyutu
    useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas)
            return;
        const ro = new ResizeObserver(() => {
            const { width, height } = wrap.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            size.current = { width, height, dpr };
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            editor.setViewport(width, height);
        });
        ro.observe(wrap);
        return () => ro.disconnect();
    }, [editor]);
    // Çizim: her değişiklikte bir sonraki kareye
    useEffect(() => {
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
            const ctx = canvasRef.current?.getContext('2d');
            const { width, height, dpr } = size.current;
            if (!ctx || !width)
                return;
            renderScene(ctx, editor.elements, editor.getOverlay(), {
                view: state.view,
                width,
                height,
                dpr,
                theme: state.theme,
                background: state.background,
                grid: state.grid ? 20 : null,
                images,
                files: editor.files,
            });
        });
    });
    // Tekerlek: yakınlaştırma (Ctrl/⌘ ya da iki parmak) ve kaydırma
    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap)
            return;
        const onWheel = (e) => {
            e.preventDefault();
            const rect = wrap.getBoundingClientRect();
            const scale = e.deltaMode === 1 ? 16 : 1;
            editor.wheel({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                dx: e.deltaX * scale,
                dy: e.deltaY * scale,
                ctrl: e.ctrlKey || e.metaKey,
                shift: e.shiftKey,
            });
        };
        // Safari'nin kendi kıstırma yakınlaştırmasını kapat
        const stop = (e) => e.preventDefault();
        wrap.addEventListener('wheel', onWheel, { passive: false });
        wrap.addEventListener('gesturestart', stop);
        wrap.addEventListener('gesturechange', stop);
        return () => {
            wrap.removeEventListener('wheel', onWheel);
            wrap.removeEventListener('gesturestart', stop);
            wrap.removeEventListener('gesturechange', stop);
        };
    }, [editor]);
    const rect = () => canvasRef.current.getBoundingClientRect();
    const editing = editor.getElement(state.editingId);
    return (_jsxs("div", { ref: wrapRef, className: "sk-board", style: { cursor: editor.cursor }, onDragOver: (e) => e.preventDefault(), onDrop: (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (!file)
                return;
            const r = rect();
            onDropFile(file, editor.toWorld(e.clientX - r.left, e.clientY - r.top));
        }, children: [_jsx("canvas", { ref: canvasRef, className: "sk-canvas", "aria-label": t('board.aria'), onPointerDown: (e) => {
                    // Varsayılan odak değişimini engelle: yeni açılan metin kutusu odağını kaybetmesin
                    e.preventDefault();
                    document.activeElement?.blur?.();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    editor.pointerDown(toInput(e, rect()));
                }, onPointerMove: (e) => editor.pointerMove(toInput(e, rect())), onPointerUp: (e) => editor.pointerUp(toInput(e, rect())), onPointerCancel: (e) => editor.pointerCancel(toInput(e, rect())), onDoubleClick: (e) => {
                    const r = rect();
                    editor.doubleClick(e.clientX - r.left, e.clientY - r.top);
                }, onContextMenu: (e) => e.preventDefault() }), editing && _jsx(TextEditor, { editor: editor, element: editing }, editing.id)] }));
}
function TextEditor({ editor, element: el }) {
    const ref = useRef(null);
    const { view, theme } = editor.state;
    useEffect(() => {
        const ta = ref.current;
        if (!ta)
            return;
        ta.focus();
        ta.select();
    }, []);
    const label = isShape(el);
    const lh = el.fontSize * LINE_HEIGHT;
    let width = el.width;
    let height = el.height;
    if (label) {
        width = Math.max(20, labelWidth(el));
        const lines = wrapText(el.text || ' ', fontString(el.fontSize, el.fontFamily), width);
        height = lines.length * lh;
    }
    // Ekran koordinatında metnin merkezi (döndürme öğe merkezi etrafında)
    const cx = (el.x + el.width / 2 + view.scrollX) * view.zoom;
    const cy = (el.y + el.height / 2 + view.scrollY) * view.zoom;
    // Etiket şeklin ortasında değilse (üçgen) metin kutusunu öğe merkezine göre kaydır
    const labelShift = label ? labelCenterY(el) - el.height / 2 : 0;
    // Yazarken genişleyen metin titremesin diye biraz pay
    const boxWidth = label ? width : width + el.fontSize;
    // Dönüşüm noktası öğenin merkezine denk gelir; metnin hizalı kenarı öğeninkiyle çakışır
    const originX = label || el.textAlign === 'center' ? boxWidth / 2 : el.textAlign === 'left' ? el.width / 2 : boxWidth - el.width / 2;
    return (_jsx("textarea", { ref: ref, className: "sk-text-editor", value: el.text ?? '', spellCheck: false, wrap: label ? 'soft' : 'off', style: {
            left: cx - originX,
            top: cy - height / 2 + labelShift,
            width: boxWidth,
            height,
            font: fontString(el.fontSize, el.fontFamily),
            lineHeight: LINE_HEIGHT,
            color: themed(el.strokeColor, theme),
            opacity: el.opacity / 100,
            textAlign: el.textAlign,
            whiteSpace: label ? 'pre-wrap' : 'pre',
            transform: `scale(${view.zoom}) rotate(${el.angle}rad)`,
            transformOrigin: `${originX}px ${height / 2 - labelShift}px`,
        }, onChange: (e) => editor.updateText(el.id, e.target.value), onBlur: () => editor.finishEditing(), onKeyDown: (e) => {
            e.stopPropagation();
            if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
                e.preventDefault();
                editor.finishEditing();
            }
        } }));
}
