'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Editor, Paper } from '../sketch';
import { useI18n, type MessageKey } from './i18n';
import { PaperPicker } from './PaperPicker';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
/** Kısayol gösterimi: Mac'te ⌘⇧⌥, diğerlerinde Ctrl+Shift+Alt+. */
const keys = (...parts: string[]) =>
  parts
    .map((p) =>
      isMac ? ({ mod: '⌘', shift: '⇧', alt: '⌥' } as Record<string, string>)[p] ?? p : ({ mod: 'Ctrl+', shift: 'Shift+', alt: 'Alt+' } as Record<string, string>)[p] ?? p,
    )
    .join('');

type Item =
  | { kind: 'item'; label: string; shortcut?: string; action: () => void; danger?: boolean; checked?: boolean }
  | { kind: 'sep' }
  | { kind: 'custom'; node: ReactNode };

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

export default function ContextMenu({
  editor,
  x,
  y,
  actions,
  onClose,
}: {
  editor: Editor;
  x: number;
  y: number;
  actions: ContextActions;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Ekrandan taşmasın
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
  }, [x, y]);

  const state = editor.state;
  const selected = editor.selectedElements();
  const has = selected.length > 0;
  const units = new Set(selected.map((el) => el.groupId ?? el.id)).size;
  const grouped = selected.some((el) => el.groupId);
  const item = (label: MessageKey, action: () => void, shortcut?: string, extra: Partial<Item> = {}): Item => ({
    kind: 'item',
    label: t(label),
    action,
    shortcut,
    ...extra,
  } as Item);
  const sep: Item = { kind: 'sep' };

  const exportItems: Item[] = [
    item('ctx.copyPng', actions.copyPng, keys('shift', 'alt', 'C')),
    item('ctx.copySvg', actions.copySvg),
    item('ctx.copyText', actions.copyText),
  ];

  let items: Item[];
  if (state.readOnly) {
    items = [...exportItems, sep, item('ctx.fit', () => editor.zoomToFit(), keys('shift', '1'))];
  } else if (has) {
    items = [
      item('ctx.cut', actions.cut, keys('mod', 'X')),
      item('ctx.copy', actions.copy, keys('mod', 'C')),
      item('ctx.paste', actions.paste, keys('mod', 'V')),
      sep,
      item('ctx.frame', () => editor.wrapSelectionInFrame()),
      sep,
      ...exportItems,
      sep,
      item('action.copyStyle', () => editor.copyStyle(), keys('mod', 'alt', 'C')),
      item('action.pasteStyle', () => editor.pasteStyle(), keys('mod', 'alt', 'V')),
      sep,
      ...(editor.canBindText() ? [item('ctx.bindText', () => editor.bindTextToContainer())] : []),
      ...(editor.canWrapText() ? [item('ctx.wrapText', () => editor.wrapTextInContainer())] : []),
      ...(units > 1 && !grouped ? [item('action.group', () => editor.group(), keys('mod', 'G'))] : []),
      ...(grouped ? [item('action.ungroup', () => editor.ungroup(), keys('mod', 'shift', 'G'))] : []),
      sep,
      item('layer.backward', () => editor.reorder('backward'), keys('mod', '[')),
      item('layer.forward', () => editor.reorder('forward'), keys('mod', ']')),
      item('layer.back', () => editor.reorder('back'), keys('mod', 'shift', '[')),
      item('layer.front', () => editor.reorder('front'), keys('mod', 'shift', ']')),
      sep,
      item('action.flipH', () => editor.flip('x'), keys('shift', 'H')),
      item('action.flipV', () => editor.flip('y'), keys('shift', 'V')),
      sep,
      item('ctx.copyLink', actions.copyLink),
      sep,
      item('action.duplicate', () => editor.duplicateSelected(), keys('mod', 'D')),
      item('action.lock', () => editor.lockSelected(), keys('mod', 'shift', 'L')),
      sep,
      item('action.delete', () => editor.deleteSelected(), 'Delete', { danger: true }),
    ];
  } else {
    items = [
      item('ctx.paste', actions.paste, keys('mod', 'V')),
      item('help.selectAll', () => editor.selectAll(), keys('mod', 'A')),
      sep,
      ...exportItems,
      sep,
      item('menu.grid', () => editor.toggleGrid(), keys('mod', "'"), { checked: state.grid }),
      {
        kind: 'custom',
        node: (
          <div className="sk-ctx-paper">
            <span>{t('paper.title')}</span>
            <PaperPicker value={state.paper} onChange={(p: Paper) => editor.setPaper(p)} />
          </div>
        ),
      },
      item('ctx.fit', () => editor.zoomToFit(), keys('shift', '1')),
      item(state.theme === 'dark' ? 'menu.light' : 'menu.dark', () =>
        editor.setTheme(state.theme === 'dark' ? 'light' : 'dark'),
      ),
      sep,
      item('menu.present', actions.present, keys('alt', 'P')),
      item('menu.share', actions.share),
    ];
  }

  // Art arda ya da baştaki/sondaki ayraçları at
  const cleaned = items.filter(
    (it, i, arr) => it.kind !== 'sep' || (i > 0 && i < arr.length - 1 && arr[i - 1].kind !== 'sep'),
  );

  return (
    <div
      ref={ref}
      className="sk-ctx sk-glass"
      role="menu"
      style={{ left: pos.left, top: pos.top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {cleaned.map((it, i) =>
        it.kind === 'sep' ? (
          <hr key={`sep-${i}`} />
        ) : it.kind === 'custom' ? (
          <div key={`custom-${i}`}>{it.node}</div>
        ) : (
          <button
            key={it.label}
            type="button"
            role={it.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
            aria-checked={it.checked}
            className={it.danger ? 'is-danger' : undefined}
            onClick={() => {
              onClose();
              it.action();
            }}
          >
            <span>
              {it.label}
              {it.checked && ' ✓'}
            </span>
            {it.shortcut && <kbd>{it.shortcut}</kbd>}
          </button>
        ),
      )}
    </div>
  );
}
