import { type ReactNode } from "react";
import { type Theme } from "../sketch/index.js";
import { type AboutInfo } from "./Dialogs.js";
import { type Lang } from "./i18n.js";
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
    /**
     * Kullanım olayları (ör. analytics): share_open, export_open, help_open, about_open,
     * teaching_mode, shared_view, shared_added, file_save.
     */
    onEvent?: (name: string, params?: Record<string, unknown>) => void;
}
export declare function Wordmark({ name, suffix, }: {
    name?: string;
    suffix?: string;
}): import("react").JSX.Element;
export default function DrawApp({ handFont, storageKey, initialTheme, onThemeChange, brand, links, docsUrl, about, lang: langProp, onLangChange, onEvent, }: DrawProps): import("react").JSX.Element;
