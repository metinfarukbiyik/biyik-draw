import type { Editor } from '../sketch/index.js';
export interface ContextActions {
    copyPng: () => void;
    copySvg: () => void;
    copyText: () => void;
    copyLink: () => void;
    paste: () => void;
    cut: () => void;
    copy: () => void;
    present: () => void;
    share: () => void;
}
export default function ContextMenu({ editor, x, y, actions, onClose, }: {
    editor: Editor;
    x: number;
    y: number;
    actions: ContextActions;
    onClose: () => void;
}): import("react").JSX.Element;
