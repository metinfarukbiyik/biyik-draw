import { type Editor } from '../sketch/index.js';
/**
 * Ders modu çubuğu: tablette parmakla rahat basılan büyük düğmeler. Kalem, fosforlu kalem,
 * lazer, silgi; renk ve kalınlık; kâğıt deseni; geri al ve yeni sayfa.
 */
export default function PresentBar({ editor, onExit }: {
    editor: Editor;
    onExit: () => void;
}): import("react").JSX.Element;
