import { type Editor } from '../sketch/index.js';
export default function Board({ editor, onDropFile, }: {
    editor: Editor;
    onDropFile: (file: File, at: [number, number]) => void;
}): import("react").JSX.Element;
