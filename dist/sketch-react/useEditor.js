import { useSyncExternalStore } from 'react';
/** Düzenleyici her değiştiğinde bileşeni yeniden çizer; güncel durumu döndürür. */
export function useEditor(editor) {
    useSyncExternalStore(editor.subscribe, editor.getVersion, editor.getVersion);
    return editor.state;
}
