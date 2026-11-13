"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, } from "react";
import { BookOpen, Check, CircleHelp, FolderOpen, Grid3x3, ImageDown, Info, Languages, Layers, Menu, Minus, Moon, Plus, Redo2, Save, Share2, SlidersHorizontal, Sun, Trash2, Undo2, Eye, Presentation, PenLine, } from "lucide-react";
import { CANVAS_COLORS, configureFonts, DEFAULT_STYLE, Editor, } from "../sketch/index.js";
import Board from "./Board.js";
import Toolbar from "./Toolbar.js";
import StylePanel from "./StylePanel.js";
import LayersPanel from "./LayersPanel.js";
import { AboutDialog, ConfirmDialog, ExportDialog, HelpDialog, ShareDialog, } from "./Dialogs.js";
import { decodeShare, hasShare } from "./share.js";
import { sceneFromHtml } from "./offline.js";
import ContextMenu from "./ContextMenu.js";
import PresentBar from "./PresentBar.js";
import { PaperPicker } from "./PaperPicker.js";
import { copyPng, copyShareLink, copySvg, copyText, pasteFromClipboard, } from "./clipboard.js";
import { getItem, setItem } from "./storage.js";
import { useEditor } from "./useEditor.js";
import { browserLang, I18nContext, makeT } from "./i18n.js";
const isField = (t) => t instanceof HTMLElement &&
    (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
function isSceneFile(data) {
    return (!!data &&
        typeof data === "object" &&
        data.type === "biyik-draw" &&
        Array.isArray(data.elements));
}
export function Wordmark({ name = "draw", suffix = "", }) {
    return (_jsxs("span", { className: "sk-wordmark", children: [_jsxs("svg", { viewBox: "0 0 32 32", width: "34", height: "34", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: [_jsx("rect", { x: "2.5", y: "2.5", width: "27", height: "27", rx: "8", strokeWidth: "1.5" }), _jsx("path", { d: "M9 21.5c2.2-.3 3.4-1.2 4.6-2.5l7.6-7.7a1.9 1.9 0 0 0-2.7-2.7l-7.7 7.6c-1.2 1.2-2.1 2.4-2.5 4.6", strokeWidth: "1.6" }), _jsx("path", { d: "M17.3 10.6l2.9 2.9", strokeWidth: "1.6" }), _jsx("path", { d: "M8 25.2c3.4-1 6.5-.6 9 .2s5 1 7-.6", strokeWidth: "1.4" })] }), _jsxs("span", { children: [name, suffix && _jsx("span", { className: "sk-wordmark-domain", children: suffix })] })] }));
}
const systemTheme = () => typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
export default function DrawApp({ handFont = "'Caveat', 'Comic Sans MS', cursive", storageKey = "sketch", initialTheme, onThemeChange, brand, links = [], docsUrl, about, lang: langProp, onLangChange, onEvent, }) {
    const [langState, setLangState] = useState(() => langProp ?? browserLang());
    const lang = langProp ?? langState;
    const t = makeT(lang);
    const changeLang = (next) => {
        setLangState(next);
        onLangChange?.(next);
    };
    const [editor] = useState(() => new Editor());
    const state = useEditor(editor);
    const [ready, setReady] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [layersOpen, setLayersOpen] = useState(false);
    const [dialog, setDialog] = useState(null);
    /** Paylaşılan çizim açıkken kullanıcının kendi tahtası burada bekler. */
    const ownBoard = useRef(null);
    const [presenting, setPresenting] = useState(false);
    const [ctxMenu, setCtxMenu] = useState(null);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(undefined);
    const showToast = useCallback((text, ms = 2200) => {
        setToast(text);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), ms);
    }, []);
    const [shared, setShared] = useState(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const fileInput = useRef(null);
    const imageInput = useRef(null);
    const imageAt = useRef(null);
    const menuRef = useRef(null);
    const themeCallback = useRef(onThemeChange);
    const eventCallback = useRef(onEvent);
    useEffect(() => {
        themeCallback.current = onThemeChange;
        eventCallback.current = onEvent;
    });
    const emitEvent = (name, params) => eventCallback.current?.(name, params);
    const sceneKey = `${storageKey}-scene`;
    const prefsKey = `${storageKey}-prefs`;
    /* ── Paylaşılan çizim ── */
    async function openShared(hash) {
        const payload = await decodeShare(hash);
        if (!payload) {
            window.alert(t("view.invalid"));
            history.replaceState(null, "", location.pathname + location.search);
            return;
        }
        if (!editor.state.readOnly) {
            ownBoard.current = {
                elements: editor.elements,
                files: editor.files,
                view: editor.state.view,
                background: editor.state.background,
                paper: editor.state.paper,
            };
        }
        editor.load(payload, { resetHistory: true });
        editor.state = {
            ...editor.state,
            background: payload.background ?? editor.state.background,
            paper: payload.paper ?? "none",
        };
        editor.setReadOnly(true);
        setShared(payload);
        emitEvent("shared_view", { elements: payload.elements.length });
        editor.zoomToFit();
    }
    const closeShared = (addToBoard) => {
        const own = ownBoard.current;
        history.replaceState(null, "", location.pathname + location.search);
        editor.load({ elements: own?.elements ?? [], files: own?.files ?? {} }, { resetHistory: true });
        editor.state = {
            ...editor.state,
            view: own?.view ?? editor.state.view,
            background: own?.background ?? editor.state.background,
            paper: own?.paper ?? editor.state.paper,
        };
        editor.setReadOnly(false);
        emitEvent(addToBoard ? "shared_added" : "shared_closed");
        if (addToBoard && shared) {
            editor.pasteElements(shared.elements, shared.files, { beside: true });
            editor.zoomToFit(true);
        }
        ownBoard.current = null;
        setShared(null);
    };
    // Uygulama açıkken adres çubuğuna yeni bir paylaşım bağlantısı yapıştırılırsa
    useEffect(() => {
        if (!ready)
            return;
        const onHash = () => {
            if (hasShare(location.hash))
                void openShared(location.hash);
        };
        window.addEventListener("hashchange", onHash);
        return () => window.removeEventListener("hashchange", onHash);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready]);
    /* ── Yazı tipleri ve kayıtlı sahne ── */
    useEffect(() => {
        const css = getComputedStyle(document.documentElement);
        const sans = css.getPropertyValue("--font-geist-sans").trim();
        const mono = css.getPropertyValue("--font-geist-mono").trim();
        configureFonts({
            hand: `${handFont}, cursive`,
            sans: `${sans ? `${sans}, ` : ""}system-ui, -apple-system, 'Segoe UI', sans-serif`,
            mono: `${mono ? `${mono}, ` : ""}ui-monospace, 'SF Mono', Menlo, monospace`,
        });
        let cancelled = false;
        (async () => {
            const [scene, prefs] = await Promise.all([
                getItem(sceneKey),
                getItem(prefsKey),
            ]);
            if (cancelled)
                return;
            editor.state = {
                ...editor.state,
                theme: initialTheme ?? systemTheme(),
                background: prefs?.background ?? editor.state.background,
                grid: prefs?.grid ?? false,
                view: prefs?.view ?? editor.state.view,
                style: { ...DEFAULT_STYLE, ...prefs?.style },
                toolLocked: prefs?.toolLocked ?? false,
                paper: prefs?.paper ?? "none",
                penOnly: prefs?.penOnly ?? false,
                highlightColor: prefs?.highlightColor ?? editor.state.highlightColor,
            };
            if (scene?.elements?.length)
                editor.load(scene, { resetHistory: true });
            else
                editor.remeasureText();
            if (hasShare(location.hash))
                await openShared(location.hash);
            if (cancelled)
                return;
            setReady(true);
            // Yazı tipleri yüklenince metin ölçüleri değişir
            await Promise.all([handFont, sans || "system-ui", mono || "monospace"].map((f) => document.fonts.load(`24px ${f}`).catch(() => null)));
            if (!cancelled)
                editor.remeasureText();
        })();
        return () => {
            cancelled = true;
        };
        // initialTheme yalnızca ilk açılışta okunur
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, handFont, sceneKey, prefsKey]);
    /* ── Otomatik kayıt ve tema bildirimi ── */
    useEffect(() => {
        if (!ready)
            return;
        let sceneTimer;
        let prefsTimer;
        let lastScene = editor.sceneVersion;
        let lastTheme = editor.state.theme;
        const saveScene = () => {
            // Paylaşılan çizim görüntülenirken kendi kaydının üzerine yazma
            if (editor.state.readOnly)
                return;
            const used = new Set(editor.elements.flatMap((el) => (el.fileId ? [el.fileId] : [])));
            const files = {};
            for (const id of used)
                if (editor.files[id])
                    files[id] = editor.files[id];
            void setItem(sceneKey, { elements: editor.elements, files });
        };
        const savePrefs = () => {
            if (editor.state.readOnly)
                return;
            const { background, grid, view, style, toolLocked, paper, penOnly, highlightColor, } = editor.state;
            void setItem(prefsKey, {
                background,
                grid,
                view,
                style,
                toolLocked,
                paper,
                penOnly,
                highlightColor,
            });
        };
        const unsub = editor.subscribe(() => {
            if (editor.state.theme !== lastTheme) {
                lastTheme = editor.state.theme;
                themeCallback.current?.(lastTheme);
            }
            if (editor.sceneVersion !== lastScene) {
                lastScene = editor.sceneVersion;
                clearTimeout(sceneTimer);
                sceneTimer = window.setTimeout(saveScene, 400);
            }
            clearTimeout(prefsTimer);
            prefsTimer = window.setTimeout(savePrefs, 600);
        });
        const flush = () => {
            saveScene();
            savePrefs();
        };
        window.addEventListener("pagehide", flush);
        return () => {
            unsub();
            window.removeEventListener("pagehide", flush);
            clearTimeout(sceneTimer);
            clearTimeout(prefsTimer);
        };
    }, [editor, ready, sceneKey, prefsKey]);
    /* ── Dosya işlemleri ── */
    const saveFile = useCallback(() => {
        const blob = new Blob([JSON.stringify(editor.toSceneFile())], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${t("file.name")}.biyikdraw`;
        eventCallback.current?.("file_save");
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, [editor, t]);
    const loadFile = useCallback(async (file) => {
        try {
            const text = await file.text();
            // Çevrimdışı HTML paylaşım dosyası da açılabilir
            const data = text.trimStart().startsWith("<")
                ? sceneFromHtml(text)
                : JSON.parse(text);
            if (!isSceneFile(data))
                throw new Error("format");
            editor.load(data);
            if (data.background)
                editor.setBackground(data.background);
            if (data.paper)
                editor.setPaper(data.paper);
            editor.zoomToFit();
        }
        catch {
            window.alert(t("file.invalid"));
        }
    }, [editor, t]);
    const handleFile = useCallback((file, at) => {
        if (file.type.startsWith("image/"))
            void editor.insertImageFile(file, at);
        else
            void loadFile(file);
    }, [editor, loadFile]);
    useEffect(() => {
        editor.onPenDetected = () => showToast(t("toast.pen"), 4500);
        return () => {
            editor.onPenDetected = null;
        };
    }, [editor, showToast, t]);
    /* ── Ders modu: tam ekran, sade arayüz ── */
    const enterPresent = useCallback(() => {
        setMenuOpen(false);
        setLayersOpen(false);
        setPresenting(true);
        eventCallback.current?.("teaching_mode");
        if (!["freedraw", "highlighter", "laser"].includes(editor.state.tool))
            editor.setTool("freedraw");
        document.documentElement.requestFullscreen?.().catch(() => undefined);
    }, [editor]);
    const exitPresent = useCallback(() => {
        setPresenting(false);
        if (document.fullscreenElement)
            document.exitFullscreen().catch(() => undefined);
    }, []);
    useEffect(() => {
        // Tarayıcı tam ekrandan (Esc ile) çıkarsa ders modundan da çık
        const onFs = () => {
            if (!document.fullscreenElement)
                setPresenting(false);
        };
        document.addEventListener("fullscreenchange", onFs);
        return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);
    // Pencere açılışları (paylaş, dışa aktar, kısayollar, hakkında)
    useEffect(() => {
        if (dialog && dialog !== "clear")
            eventCallback.current?.(`${dialog}_open`);
    }, [dialog]);
    /* ── Pano işlemleri (sağ tık menüsü ve kısayollar) ── */
    const notify = useCallback((ok, okKey = "toast.copied") => showToast(t(ok ? okKey : "toast.copyFailed")), [showToast, t]);
    const ctxActions = {
        copyPng: () => void copyPng(editor).then((ok) => notify(ok)),
        copySvg: () => void copySvg(editor).then((ok) => notify(ok)),
        copyText: () => void copyText(editor.plainText()).then((ok) => notify(ok)),
        copyLink: () => void copyShareLink(editor).then((ok) => notify(ok, "toast.linkCopied")),
        paste: () => void pasteFromClipboard(editor),
        cut: () => {
            const data = editor.cutSelection();
            if (data)
                void copyText(data);
        },
        copy: () => {
            const data = editor.copySelection();
            if (data)
                void copyText(data).then((ok) => notify(ok));
        },
        present: enterPresent,
        share: () => setDialog("share"),
    };
    useEffect(() => {
        editor.onRequestImage = (at) => {
            imageAt.current = at;
            imageInput.current?.click();
        };
        return () => {
            editor.onRequestImage = null;
        };
    }, [editor]);
    /* ── Klavye ve pano ── */
    useEffect(() => {
        const onKeyDown = (e) => {
            if (isField(e.target) || dialog)
                return;
            const mod = e.metaKey || e.ctrlKey;
            const key = e.key.toLowerCase();
            if (mod && key === "s") {
                e.preventDefault();
                saveFile();
                return;
            }
            if (mod && key === "o") {
                e.preventDefault();
                fileInput.current?.click();
                return;
            }
            if (mod && e.shiftKey && key === "e") {
                e.preventDefault();
                setDialog("export");
                return;
            }
            if (e.altKey && e.code === "KeyP" && !mod) {
                e.preventDefault();
                if (presenting)
                    exitPresent();
                else
                    enterPresent();
                return;
            }
            if (e.altKey && e.shiftKey && e.code === "KeyC" && !mod) {
                e.preventDefault();
                void copyPng(editor).then((ok) => showToast(t(ok ? "toast.copied" : "toast.copyFailed")));
                return;
            }
            if (e.key === "Escape" &&
                presenting &&
                !editor.state.selectedIds.length &&
                !editor.state.editingId) {
                exitPresent();
                return;
            }
            if (e.altKey && e.code === "KeyL" && !mod) {
                e.preventDefault();
                setLayersOpen((v) => !v);
                return;
            }
            if (e.key === "?") {
                setDialog("help");
                return;
            }
            if (e.key === "Escape" && menuOpen) {
                setMenuOpen(false);
                return;
            }
            if (editor.keyDown(e))
                e.preventDefault();
        };
        const onKeyUp = (e) => editor.keyUp(e);
        const onCopy = (e) => {
            if (isField(e.target))
                return;
            const data = editor.copySelection();
            if (data && e.clipboardData) {
                e.clipboardData.setData("text/plain", data);
                e.preventDefault();
            }
        };
        const onCut = (e) => {
            if (isField(e.target))
                return;
            const data = editor.cutSelection();
            if (data && e.clipboardData) {
                e.clipboardData.setData("text/plain", data);
                e.preventDefault();
            }
        };
        const onPaste = (e) => {
            if (isField(e.target) || !e.clipboardData)
                return;
            const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
            e.preventDefault();
            if (file)
                void editor.insertImageFile(file);
            else
                editor.pasteText(e.clipboardData.getData("text/plain"));
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        document.addEventListener("copy", onCopy);
        document.addEventListener("cut", onCut);
        document.addEventListener("paste", onPaste);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            document.removeEventListener("copy", onCopy);
            document.removeEventListener("cut", onCut);
            document.removeEventListener("paste", onPaste);
        };
    }, [editor, dialog, menuOpen, saveFile, presenting, enterPresent, exitPresent, showToast, t]);
    /* ── Menü dışına tıklayınca kapan ── */
    useEffect(() => {
        if (!menuOpen)
            return;
        const onDown = (e) => {
            if (!menuRef.current?.contains(e.target))
                setMenuOpen(false);
        };
        window.addEventListener("pointerdown", onDown);
        return () => window.removeEventListener("pointerdown", onDown);
    }, [menuOpen]);
    const empty = ready && editor.elements.length === 0 && !state.editingId && !shared;
    const readOnly = state.readOnly;
    const hasPanel = editor.selectedElements().length > 0 ||
        !!state.editingId ||
        !["select", "hand", "eraser", "image", "laser"].includes(state.tool);
    const closeMenuThen = (fn) => () => {
        setMenuOpen(false);
        fn();
    };
    return (_jsx(I18nContext.Provider, { value: { lang, t }, children: _jsxs("div", { className: `sk-app${state.theme === "dark" ? " is-dark" : ""}${layersOpen ? " has-layers" : ""}${presenting ? " is-presenting" : ""}`, children: [_jsx(Board, { editor: editor, onDropFile: (file, at) => handleFile(file, at), onContextMenu: (x, y) => {
                        setMenuOpen(false);
                        setCtxMenu({ x, y });
                    } }), presenting && _jsx(PresentBar, { editor: editor, onExit: exitPresent }), ctxMenu && (_jsxs(_Fragment, { children: [_jsx("div", { className: "sk-ctx-backdrop", onPointerDown: () => setCtxMenu(null), onContextMenu: (e) => {
                                e.preventDefault();
                                setCtxMenu(null);
                            } }), _jsx(ContextMenu, { editor: editor, x: ctxMenu.x, y: ctxMenu.y, actions: ctxActions, onClose: () => setCtxMenu(null) })] })), toast && (_jsx("div", { className: "sk-toast", role: "status", children: toast })), _jsxs("div", { className: "sk-top", hidden: presenting, children: [_jsxs("div", { className: "sk-top-left", ref: menuRef, children: [_jsx("button", { type: "button", className: "sk-icon-btn sk-glass", "aria-label": t("menu.aria"), "aria-expanded": menuOpen, onClick: () => setMenuOpen((v) => !v), children: _jsx(Menu, { size: 18 }) }), menuOpen && (_jsxs("div", { className: "sk-menu sk-glass", role: "menu", children: [_jsxs("button", { type: "button", role: "menuitem", onClick: closeMenuThen(() => setDialog("share")), children: [_jsx(Share2, { size: 16 }), " ", t("menu.share")] }), _jsxs("button", { type: "button", role: "menuitem", onClick: closeMenuThen(enterPresent), children: [_jsx(Presentation, { size: 16 }), " ", t("menu.present"), " ", _jsx("kbd", { children: "\u2325P" })] }), !readOnly && (_jsxs("button", { type: "button", role: "menuitem", onClick: closeMenuThen(() => fileInput.current?.click()), children: [_jsx(FolderOpen, { size: 16 }), " ", t("menu.open"), " ", _jsx("kbd", { children: "\u2318O" })] })), _jsxs("button", { type: "button", role: "menuitem", onClick: closeMenuThen(saveFile), children: [_jsx(Save, { size: 16 }), " ", t("menu.save"), " ", _jsx("kbd", { children: "\u2318S" })] }), _jsxs("button", { type: "button", role: "menuitem", onClick: closeMenuThen(() => setDialog("export")), children: [_jsx(ImageDown, { size: 16 }), " ", t("menu.export"), " ", _jsx("kbd", { children: "\u2318\u21E7E" })] }), !readOnly && (_jsxs("button", { type: "button", role: "menuitem", onClick: closeMenuThen(() => setDialog("clear")), children: [_jsx(Trash2, { size: 16 }), " ", t("menu.clear")] })), _jsx("hr", {}), _jsxs("button", { type: "button", role: "menuitemcheckbox", "aria-checked": layersOpen, onClick: closeMenuThen(() => setLayersOpen((v) => !v)), children: [_jsx(Layers, { size: 16 }), " ", t("menu.layers"), " ", _jsx("kbd", { children: "\u2325L" })] }), _jsxs("button", { type: "button", role: "menuitemcheckbox", "aria-checked": state.grid, onClick: () => editor.toggleGrid(), children: [_jsx(Grid3x3, { size: 16 }), " ", t("menu.grid"), " ", state.grid && _jsx(Check, { size: 15, className: "sk-menu-check" })] }), _jsxs("button", { type: "button", role: "menuitem", onClick: () => editor.setTheme(state.theme === "dark" ? "light" : "dark"), children: [state.theme === "dark" ? (_jsx(Sun, { size: 16 })) : (_jsx(Moon, { size: 16 })), state.theme === "dark" ? t("menu.light") : t("menu.dark")] }), _jsxs("div", { className: "sk-menu-lang", role: "group", "aria-label": t("menu.language"), children: [_jsx(Languages, { size: 16 }), _jsx("span", { children: t("menu.language") }), _jsx("div", { className: "sk-seg", children: ["tr", "en"].map((l) => (_jsx("button", { type: "button", "aria-pressed": lang === l, onClick: () => changeLang(l), children: l.toUpperCase() }, l))) })] }), _jsxs("div", { className: "sk-menu-section", children: [_jsx("span", { children: t("paper.title") }), _jsx(PaperPicker, { value: state.paper, onChange: (p) => editor.setPaper(p) })] }), _jsxs("button", { type: "button", role: "menuitemcheckbox", "aria-checked": state.penOnly, title: t("menu.penOnlyHint"), onClick: () => editor.setPenOnly(!state.penOnly), children: [_jsx(PenLine, { size: 16 }), " ", t("menu.penOnly"), " ", state.penOnly && _jsx(Check, { size: 15, className: "sk-menu-check" })] }), _jsxs("div", { className: "sk-menu-section", children: [_jsx("span", { children: t("menu.canvas") }), _jsx("div", { className: "sk-menu-swatches", children: CANVAS_COLORS.map((c) => (_jsx("button", { type: "button", className: "sk-swatch", style: { background: c }, "aria-pressed": state.background === c, "aria-label": `${t("menu.canvasColor")} ${c}`, onClick: () => editor.setBackground(c) }, c))) })] }), _jsx("hr", {}), _jsxs("button", { type: "button", role: "menuitem", onClick: closeMenuThen(() => setDialog("help")), children: [_jsx(CircleHelp, { size: 16 }), " ", t("menu.shortcuts"), " ", _jsx("kbd", { children: "?" })] }), docsUrl && (_jsxs("a", { role: "menuitem", href: docsUrl, target: "_blank", rel: "noopener", children: [_jsx(BookOpen, { size: 16 }), " ", t("menu.docs")] })), about && (_jsxs("button", { type: "button", role: "menuitem", onClick: closeMenuThen(() => setDialog("about")), children: [_jsx(Info, { size: 16 }), " ", t("menu.about")] })), links.length > 0 && _jsx("hr", {}), links.map((l) => (_jsxs("a", { role: "menuitem", href: l.href, target: l.href.startsWith("http") ? "_blank" : undefined, rel: "noopener", children: [l.icon, " ", l.label] }, l.href)))] }))] }), readOnly ? (_jsxs("div", { className: "sk-viewbar sk-glass", role: "status", children: [_jsxs("span", { className: "sk-viewbar-label", children: [_jsx(Eye, { size: 15 }), " ", t("view.banner")] }), _jsx("button", { type: "button", className: "sk-btn is-primary", onClick: () => closeShared(true), children: t("view.add") }), _jsx("button", { type: "button", className: "sk-btn", onClick: () => closeShared(false), children: t("view.close") })] })) : (_jsx(Toolbar, { editor: editor })), _jsxs("div", { className: "sk-top-right", children: [_jsx("button", { type: "button", className: "sk-icon-btn sk-glass", "aria-label": t("menu.layers"), "aria-pressed": layersOpen, title: `${t("menu.layers")} (⌥L)`, onClick: () => setLayersOpen((v) => !v), children: _jsx(Layers, { size: 17 }) }), _jsx("button", { type: "button", className: "sk-icon-btn sk-glass", "aria-label": t("top.export"), title: `${t("top.export")} (⌘⇧E)`, onClick: () => setDialog("export"), children: _jsx(ImageDown, { size: 17 }) }), _jsxs("button", { type: "button", className: "sk-btn is-primary", onClick: () => setDialog("share"), children: [_jsx(Share2, { size: 15 }), " ", _jsx("span", { className: "sk-hide-sm", children: t("menu.share") })] })] })] }), hasPanel && !readOnly && !presenting && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "sk-panel-toggle sk-icon-btn sk-glass", "aria-label": t("top.styles"), "aria-expanded": panelOpen, onClick: () => setPanelOpen((v) => !v), children: _jsx(SlidersHorizontal, { size: 17 }) }), _jsx("div", { className: `sk-panel-wrap${panelOpen ? " is-open" : ""}`, children: _jsx(StylePanel, { editor: editor }) })] })), layersOpen && !readOnly && !presenting && (_jsx("div", { className: "sk-layers-wrap", children: _jsx(LayersPanel, { editor: editor, onClose: () => setLayersOpen(false) }) })), _jsxs("div", { className: "sk-bottom-left", hidden: presenting, children: [_jsxs("div", { className: "sk-group sk-glass", children: [_jsx("button", { type: "button", className: "sk-icon-btn", "aria-label": t("zoom.out"), onClick: () => editor.zoomBy(1 / 1.2), children: _jsx(Minus, { size: 16 }) }), _jsxs("button", { type: "button", className: "sk-zoom", title: t("zoom.reset"), onClick: () => editor.resetZoom(), children: [Math.round(state.view.zoom * 100), "%"] }), _jsx("button", { type: "button", className: "sk-icon-btn", "aria-label": t("zoom.in"), onClick: () => editor.zoomBy(1.2), children: _jsx(Plus, { size: 16 }) })] }), _jsxs("div", { className: "sk-group sk-glass", children: [_jsx("button", { type: "button", className: "sk-icon-btn", "aria-label": t("history.undo"), disabled: !editor.canUndo, onClick: () => editor.undo(), children: _jsx(Undo2, { size: 16 }) }), _jsx("button", { type: "button", className: "sk-icon-btn", "aria-label": t("history.redo"), disabled: !editor.canRedo, onClick: () => editor.redo(), children: _jsx(Redo2, { size: 16 }) })] })] }), _jsx("div", { className: "sk-bottom-right", hidden: presenting, children: _jsx("button", { type: "button", className: "sk-icon-btn sk-glass", "aria-label": t("menu.shortcuts"), onClick: () => setDialog("help"), children: _jsx(CircleHelp, { size: 17 }) }) }), empty && !presenting && (_jsxs("div", { className: "sk-welcome", children: [brand ?? _jsx(Wordmark, {}), _jsx("p", { children: t("welcome.text") }), _jsxs("div", { className: "sk-welcome-actions", children: [_jsxs("button", { type: "button", className: "sk-btn", onClick: () => fileInput.current?.click(), children: [_jsx(FolderOpen, { size: 15 }), " ", t("welcome.open")] }), _jsxs("button", { type: "button", className: "sk-btn", onClick: () => setDialog("help"), children: [_jsx(CircleHelp, { size: 15 }), " ", t("welcome.shortcuts")] }), docsUrl && (_jsxs("a", { className: "sk-btn", href: docsUrl, target: "_blank", rel: "noopener", children: [_jsx(BookOpen, { size: 15 }), " ", t("welcome.docs")] }))] }), _jsx("p", { className: "sk-welcome-hint", children: t("welcome.hint") })] })), _jsx("input", { ref: fileInput, type: "file", accept: ".biyikdraw,.json,application/json,image/*", hidden: true, onChange: (e) => {
                        const file = e.target.files?.[0];
                        if (file)
                            handleFile(file, null);
                        e.target.value = "";
                    } }), _jsx("input", { ref: imageInput, type: "file", accept: "image/*", hidden: true, onChange: (e) => {
                        const file = e.target.files?.[0];
                        if (file)
                            void editor.insertImageFile(file, imageAt.current);
                        e.target.value = "";
                    } }), dialog === "export" && (_jsx(ExportDialog, { editor: editor, onClose: () => setDialog(null) })), dialog === "help" && _jsx(HelpDialog, { onClose: () => setDialog(null) }), dialog === "share" && (_jsx(ShareDialog, { editor: editor, onClose: () => setDialog(null) })), dialog === "about" && about && (_jsx(AboutDialog, { info: about, docsUrl: docsUrl, onClose: () => setDialog(null) })), dialog === "clear" && (_jsx(ConfirmDialog, { title: t("menu.clear"), message: t("clear.message"), confirmLabel: t("clear.confirm"), onConfirm: () => editor.clear(), onClose: () => setDialog(null) }))] }) }));
}
