import type { Editor } from '../sketch/index.js';
export default function LayersPanel({ editor, onClose }: {
    editor: Editor;
    onClose: () => void;
}): import("react").JSX.Element;
