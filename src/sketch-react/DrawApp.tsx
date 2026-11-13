"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  BookOpen,
  Check,
  CircleHelp,
  FolderOpen,
  Grid3x3,
  ImageDown,
  Info,
  Languages,
  Layers,
  Menu,
  Minus,
  Moon,
  Plus,
  Redo2,
  Save,
  Share2,
  SlidersHorizontal,
  Sun,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  CANVAS_COLORS,
  configureFonts,
  DEFAULT_STYLE,
  Editor,
  type SceneFile,
  type SketchElement,
  type StyleProps,
  type Theme,
  type View,
} from "../sketch";
import Board from "./Board";
import Toolbar from "./Toolbar";
import StylePanel from "./StylePanel";
import LayersPanel from "./LayersPanel";
import {
  AboutDialog,
  ConfirmDialog,
  ExportDialog,
  HelpDialog,
  type AboutInfo,
} from "./Dialogs";
import { getItem, setItem } from "./storage";
import { useEditor } from "./useEditor";
import { browserLang, I18nContext, makeT, type Lang } from "./i18n";

export interface DrawLink {
  label: string;
  href: string;
  icon?: ReactNode;
}

export interface DrawProps {
  /** Tuvaldeki el yazısı ailesi (CSS font-family). Varsayılan: Caveat, yoksa cursive. */
  handFont?: string;
  /** Tarayıcıda (IndexedDB) saklama anahtarı. Aynı sayfada birden çok tahta varsa farklı verin. */
  storageKey?: string;
  /** Başlangıç teması. Verilmezse sistem ayarı kullanılır. */
  initialTheme?: Theme;
  /** Tema değiştiğinde çağrılır (ör. sitenin kendi temasını eşitlemek için). */
  onThemeChange?: (theme: Theme) => void;
  /** Karşılama ekranındaki logo / ad. */
  brand?: ReactNode;
  /** Menünün altındaki bağlantılar. */
  links?: DrawLink[];
  /** Dokümantasyon adresi; verilirse menüde görünür. */
  docsUrl?: string;
  /** "Hakkında" penceresinin içeriği; verilirse menüde görünür. */
  about?: AboutInfo;
  /** Arayüz dili. Verilmezse tarayıcı dili (tr değilse en) kullanılır ve menüden değiştirilebilir. */
  lang?: Lang;
  /** Menüden dil değiştirildiğinde çağrılır. */
  onLangChange?: (lang: Lang) => void;
}

const isField = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

function isSceneFile(data: unknown): data is SceneFile {
  return (
    !!data &&
    typeof data === "object" &&
    (data as SceneFile).type === "biyik-draw" &&
    Array.isArray((data as SceneFile).elements)
  );
}

interface Prefs {
  background: string;
  grid: boolean;
  view: View;
  style: StyleProps;
  toolLocked: boolean;
}

export function Wordmark({
  name = "draw",
  suffix = "",
}: {
  name?: string;
  suffix?: string;
}) {
  return (
    <span className="sk-wordmark">
      <svg
        viewBox="0 0 32 32"
        width="34"
        height="34"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="2.5" y="2.5" width="27" height="27" rx="8" strokeWidth="1.5" />
        <path
          d="M9 21.5c2.2-.3 3.4-1.2 4.6-2.5l7.6-7.7a1.9 1.9 0 0 0-2.7-2.7l-7.7 7.6c-1.2 1.2-2.1 2.4-2.5 4.6"
          strokeWidth="1.6"
        />
        <path d="M17.3 10.6l2.9 2.9" strokeWidth="1.6" />
        <path d="M8 25.2c3.4-1 6.5-.6 9 .2s5 1 7-.6" strokeWidth="1.4" />
      </svg>
      <span>
        {name}
        {suffix && <span className="sk-wordmark-domain">{suffix}</span>}
      </span>
    </span>
  );
}

const systemTheme = (): Theme =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

export default function DrawApp({
  handFont = "'Caveat', 'Comic Sans MS', cursive",
  storageKey = "sketch",
  initialTheme,
  onThemeChange,
  brand,
  links = [],
  docsUrl,
  about,
  lang: langProp,
  onLangChange,
}: DrawProps) {
  const [langState, setLangState] = useState<Lang>(
    () => langProp ?? browserLang(),
  );
  const lang = langProp ?? langState;
  const t = makeT(lang);
  const changeLang = (next: Lang) => {
    setLangState(next);
    onLangChange?.(next);
  };
  const [editor] = useState(() => new Editor());
  const state = useEditor(editor);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [dialog, setDialog] = useState<
    "export" | "help" | "clear" | "about" | null
  >(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const imageAt = useRef<[number, number] | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const themeCallback = useRef(onThemeChange);
  useEffect(() => {
    themeCallback.current = onThemeChange;
  });

  const sceneKey = `${storageKey}-scene`;
  const prefsKey = `${storageKey}-prefs`;

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
        getItem<{ elements: SketchElement[]; files: Record<string, string> }>(
          sceneKey,
        ),
        getItem<Prefs>(prefsKey),
      ]);
      if (cancelled) return;
      editor.state = {
        ...editor.state,
        theme: initialTheme ?? systemTheme(),
        background: prefs?.background ?? editor.state.background,
        grid: prefs?.grid ?? false,
        view: prefs?.view ?? editor.state.view,
        style: { ...DEFAULT_STYLE, ...prefs?.style },
        toolLocked: prefs?.toolLocked ?? false,
      };
      if (scene?.elements?.length) editor.load(scene, { resetHistory: true });
      else editor.remeasureText();
      setReady(true);
      // Yazı tipleri yüklenince metin ölçüleri değişir
      await Promise.all(
        [handFont, sans || "system-ui", mono || "monospace"].map((f) =>
          document.fonts.load(`24px ${f}`).catch(() => null),
        ),
      );
      if (!cancelled) editor.remeasureText();
    })();
    return () => {
      cancelled = true;
    };
    // initialTheme yalnızca ilk açılışta okunur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, handFont, sceneKey, prefsKey]);

  /* ── Otomatik kayıt ve tema bildirimi ── */
  useEffect(() => {
    if (!ready) return;
    let sceneTimer: number | undefined;
    let prefsTimer: number | undefined;
    let lastScene = editor.sceneVersion;
    let lastTheme = editor.state.theme;
    const saveScene = () => {
      const used = new Set(
        editor.elements.flatMap((el) => (el.fileId ? [el.fileId] : [])),
      );
      const files: Record<string, string> = {};
      for (const id of used) if (editor.files[id]) files[id] = editor.files[id];
      void setItem(sceneKey, { elements: editor.elements, files });
    };
    const savePrefs = () => {
      const { background, grid, view, style, toolLocked } = editor.state;
      void setItem(prefsKey, {
        background,
        grid,
        view,
        style,
        toolLocked,
      } satisfies Prefs);
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
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [editor, t]);

  const loadFile = useCallback(
    async (file: File) => {
      try {
        const data = JSON.parse(await file.text());
        if (!isSceneFile(data)) throw new Error("format");
        editor.load(data);
        if (data.background) editor.setBackground(data.background);
        editor.zoomToFit();
      } catch {
        window.alert(t("file.invalid"));
      }
    },
    [editor, t],
  );

  const handleFile = useCallback(
    (file: File, at: [number, number] | null) => {
      if (file.type.startsWith("image/")) void editor.insertImageFile(file, at);
      else void loadFile(file);
    },
    [editor, loadFile],
  );

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (isField(e.target) || dialog) return;
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
      if (editor.keyDown(e)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => editor.keyUp(e);
    const onCopy = (e: ClipboardEvent) => {
      if (isField(e.target)) return;
      const data = editor.copySelection();
      if (data && e.clipboardData) {
        e.clipboardData.setData("text/plain", data);
        e.preventDefault();
      }
    };
    const onCut = (e: ClipboardEvent) => {
      if (isField(e.target)) return;
      const data = editor.cutSelection();
      if (data && e.clipboardData) {
        e.clipboardData.setData("text/plain", data);
        e.preventDefault();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isField(e.target) || !e.clipboardData) return;
      const file = [...e.clipboardData.files].find((f) =>
        f.type.startsWith("image/"),
      );
      e.preventDefault();
      if (file) void editor.insertImageFile(file);
      else editor.pasteText(e.clipboardData.getData("text/plain"));
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
  }, [editor, dialog, menuOpen, saveFile]);

  /* ── Menü dışına tıklayınca kapan ── */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  const empty = ready && editor.elements.length === 0 && !state.editingId;
  const hasPanel =
    editor.selectedElements().length > 0 ||
    !!state.editingId ||
    !["select", "hand", "eraser", "image"].includes(state.tool);
  const closeMenuThen = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <I18nContext.Provider value={{ lang, t }}>
      <div
        className={`sk-app${state.theme === "dark" ? " is-dark" : ""}${layersOpen ? " has-layers" : ""}`}
      >
        <Board
          editor={editor}
          onDropFile={(file, at) => handleFile(file, at)}
        />

        <div className="sk-top">
          <div className="sk-top-left" ref={menuRef}>
            <button
              type="button"
              className="sk-icon-btn sk-glass"
              aria-label={t("menu.aria")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Menu size={18} />
            </button>
            {menuOpen && (
              <div className="sk-menu sk-glass" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={closeMenuThen(() => fileInput.current?.click())}
                >
                  <FolderOpen size={16} /> {t("menu.open")} <kbd>⌘O</kbd>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={closeMenuThen(saveFile)}
                >
                  <Save size={16} /> {t("menu.save")} <kbd>⌘S</kbd>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={closeMenuThen(() => setDialog("export"))}
                >
                  <ImageDown size={16} /> {t("menu.export")} <kbd>⌘⇧E</kbd>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={closeMenuThen(() => setDialog("clear"))}
                >
                  <Trash2 size={16} /> {t("menu.clear")}
                </button>
                <hr />
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={layersOpen}
                  onClick={closeMenuThen(() => setLayersOpen((v) => !v))}
                >
                  <Layers size={16} /> {t("menu.layers")} <kbd>⌥L</kbd>
                </button>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={state.grid}
                  onClick={() => editor.toggleGrid()}
                >
                  <Grid3x3 size={16} /> {t("menu.grid")}{" "}
                  {state.grid && <Check size={15} className="sk-menu-check" />}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    editor.setTheme(state.theme === "dark" ? "light" : "dark")
                  }
                >
                  {state.theme === "dark" ? (
                    <Sun size={16} />
                  ) : (
                    <Moon size={16} />
                  )}
                  {state.theme === "dark" ? t("menu.light") : t("menu.dark")}
                </button>
                <div
                  className="sk-menu-lang"
                  role="group"
                  aria-label={t("menu.language")}
                >
                  <Languages size={16} />
                  <span>{t("menu.language")}</span>
                  <div className="sk-seg">
                    {(["tr", "en"] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={lang === l}
                        onClick={() => changeLang(l)}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sk-menu-section">
                  <span>{t("menu.canvas")}</span>
                  <div className="sk-menu-swatches">
                    {CANVAS_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="sk-swatch"
                        style={{ background: c }}
                        aria-pressed={state.background === c}
                        aria-label={`${t("menu.canvasColor")} ${c}`}
                        onClick={() => editor.setBackground(c)}
                      />
                    ))}
                  </div>
                </div>
                <hr />
                <button
                  type="button"
                  role="menuitem"
                  onClick={closeMenuThen(() => setDialog("help"))}
                >
                  <CircleHelp size={16} /> {t("menu.shortcuts")} <kbd>?</kbd>
                </button>
                {docsUrl && (
                  <a
                    role="menuitem"
                    href={docsUrl}
                    target="_blank"
                    rel="noopener"
                  >
                    <BookOpen size={16} /> {t("menu.docs")}
                  </a>
                )}
                {about && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={closeMenuThen(() => setDialog("about"))}
                  >
                    <Info size={16} /> {t("menu.about")}
                  </button>
                )}
                {links.length > 0 && <hr />}
                {links.map((l) => (
                  <a
                    key={l.href}
                    role="menuitem"
                    href={l.href}
                    target={l.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener"
                  >
                    {l.icon} {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <Toolbar editor={editor} />

          <div className="sk-top-right">
            <button
              type="button"
              className="sk-icon-btn sk-glass"
              aria-label={t("menu.layers")}
              aria-pressed={layersOpen}
              title={`${t("menu.layers")} (⌥L)`}
              onClick={() => setLayersOpen((v) => !v)}
            >
              <Layers size={17} />
            </button>
            <button
              type="button"
              className="sk-btn is-primary"
              onClick={() => setDialog("export")}
            >
              <Share2 size={15} />{" "}
              <span className="sk-hide-sm">{t("top.export")}</span>
            </button>
          </div>
        </div>

        {hasPanel && (
          <>
            <button
              type="button"
              className="sk-panel-toggle sk-icon-btn sk-glass"
              aria-label={t("top.styles")}
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen((v) => !v)}
            >
              <SlidersHorizontal size={17} />
            </button>
            <div className={`sk-panel-wrap${panelOpen ? " is-open" : ""}`}>
              <StylePanel editor={editor} />
            </div>
          </>
        )}

        {layersOpen && (
          <div className="sk-layers-wrap">
            <LayersPanel editor={editor} onClose={() => setLayersOpen(false)} />
          </div>
        )}

        <div className="sk-bottom-left">
          <div className="sk-group sk-glass">
            <button
              type="button"
              className="sk-icon-btn"
              aria-label={t("zoom.out")}
              onClick={() => editor.zoomBy(1 / 1.2)}
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              className="sk-zoom"
              title={t("zoom.reset")}
              onClick={() => editor.resetZoom()}
            >
              {Math.round(state.view.zoom * 100)}%
            </button>
            <button
              type="button"
              className="sk-icon-btn"
              aria-label={t("zoom.in")}
              onClick={() => editor.zoomBy(1.2)}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="sk-group sk-glass">
            <button
              type="button"
              className="sk-icon-btn"
              aria-label={t("history.undo")}
              disabled={!editor.canUndo}
              onClick={() => editor.undo()}
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              className="sk-icon-btn"
              aria-label={t("history.redo")}
              disabled={!editor.canRedo}
              onClick={() => editor.redo()}
            >
              <Redo2 size={16} />
            </button>
          </div>
        </div>

        <div className="sk-bottom-right">
          <button
            type="button"
            className="sk-icon-btn sk-glass"
            aria-label={t("menu.shortcuts")}
            onClick={() => setDialog("help")}
          >
            <CircleHelp size={17} />
          </button>
        </div>

        {empty && (
          <div className="sk-welcome">
            {brand ?? <Wordmark />}
            <p>{t("welcome.text")}</p>
            <div className="sk-welcome-actions">
              <button
                type="button"
                className="sk-btn"
                onClick={() => fileInput.current?.click()}
              >
                <FolderOpen size={15} /> {t("welcome.open")}
              </button>
              <button
                type="button"
                className="sk-btn"
                onClick={() => setDialog("help")}
              >
                <CircleHelp size={15} /> {t("welcome.shortcuts")}
              </button>
              {docsUrl && (
                <a
                  className="sk-btn"
                  href={docsUrl}
                  target="_blank"
                  rel="noopener"
                >
                  <BookOpen size={15} /> {t("welcome.docs")}
                </a>
              )}
            </div>
            <p className="sk-welcome-hint">{t("welcome.hint")}</p>
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept=".biyikdraw,.json,application/json,image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file, null);
            e.target.value = "";
          }}
        />
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void editor.insertImageFile(file, imageAt.current);
            e.target.value = "";
          }}
        />

        {dialog === "export" && (
          <ExportDialog editor={editor} onClose={() => setDialog(null)} />
        )}
        {dialog === "help" && <HelpDialog onClose={() => setDialog(null)} />}
        {dialog === "about" && about && (
          <AboutDialog
            info={about}
            docsUrl={docsUrl}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog === "clear" && (
          <ConfirmDialog
            title={t("menu.clear")}
            message={t("clear.message")}
            confirmLabel={t("clear.confirm")}
            onConfirm={() => editor.clear()}
            onClose={() => setDialog(null)}
          />
        )}
      </div>
    </I18nContext.Provider>
  );
}
