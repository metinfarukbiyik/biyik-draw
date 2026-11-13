import { useSyncExternalStore } from 'react';
import type { Editor } from '../sketch';

/** Düzenleyici her değiştiğinde bileşeni yeniden çizer; güncel durumu döndürür. */
export function useEditor(editor: Editor) {
  useSyncExternalStore(editor.subscribe, editor.getVersion, editor.getVersion);
  return editor.state;
}
