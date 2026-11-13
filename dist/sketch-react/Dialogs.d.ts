import { type ReactNode } from 'react';
import { type Editor } from '../sketch/index.js';
export declare function Dialog({ title, onClose, children, wide, }: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    wide?: boolean;
}): import("react").JSX.Element;
export declare function ExportDialog({ editor, onClose }: {
    editor: Editor;
    onClose: () => void;
}): import("react").JSX.Element;
export declare function HelpDialog({ onClose }: {
    onClose: () => void;
}): import("react").JSX.Element;
export declare function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose, }: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    onClose: () => void;
}): import("react").JSX.Element;
export interface AboutInfo {
    name: string;
    version: string;
    description: string;
    author?: {
        name: string;
        url?: string;
    };
    repoUrl?: string;
    license?: string;
}
export declare function AboutDialog({ info, docsUrl, onClose }: {
    info: AboutInfo;
    docsUrl?: string;
    onClose: () => void;
}): import("react").JSX.Element;
