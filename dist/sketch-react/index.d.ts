/**
 * biyik draw — React arayüzü. Kullanım:
 *
 *   import { Draw } from 'biyik-draw/react';
 *   import 'biyik-draw/styles.css';
 *
 *   <div style={{ position: 'fixed', inset: 0 }}><Draw /></div>
 */
export { default as Draw, Wordmark, type DrawProps, type DrawLink } from './DrawApp.js';
export type { AboutInfo } from './Dialogs.js';
export { messages, browserLang, type Lang, type MessageKey } from './i18n.js';
export { encodeShare, decodeShare, hasShare, shareUrl, type SharePayload } from './share.js';
export { buildOfflineHtml, inlineFontCss, sceneFromHtml } from './offline.js';
