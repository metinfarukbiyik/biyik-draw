import type { ReactNode } from 'react';
import type { Paper } from '../sketch/index.js';
export declare const PAPER_ICONS: Record<Paper, ReactNode>;
export declare const PAPERS: Paper[];
/** Kâğıt deseni seçici (bölmeli düğmeler). */
export declare function PaperPicker({ value, onChange }: {
    value: Paper;
    onChange: (p: Paper) => void;
}): import("react").JSX.Element;
