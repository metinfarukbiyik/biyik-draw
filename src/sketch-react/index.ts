/**
 * biyik draw — React arayüzü. Kullanım:
 *
 *   import { Draw } from 'biyik-draw/react';
 *   import 'biyik-draw/styles.css';
 *
 *   <div style={{ position: 'fixed', inset: 0 }}><Draw /></div>
 */
export { default as Draw, Wordmark, type DrawProps, type DrawLink } from './DrawApp';
export type { AboutInfo } from './Dialogs';
export { messages, browserLang, type Lang, type MessageKey } from './i18n';
