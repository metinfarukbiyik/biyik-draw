import { type Editor } from '../sketch/index.js';
export default function Board({ editor, onDropFile, onContextMenu, }: {
    editor: Editor;
    onDropFile: (file: File, at: [number, number]) => void;
    /** Sağ tık ya da uzun basma: ekran (client) koordinatı. */
    onContextMenu?: (x: number, y: number) => void;
}): import("react").JSX.Element;
