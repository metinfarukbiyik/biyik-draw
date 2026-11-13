'use client';

import { useState, type DragEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Circle,
  Diamond,
  Eye,
  EyeOff,
  Folder,
  Group,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Minus,
  Pencil,
  Square,
  Triangle,
  Type,
  Ungroup,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Editor, ElementType, SketchElement } from '../sketch';
import { useEditor } from './useEditor';
import { useI18n, type MessageKey, type T } from './i18n';

const TYPE_META: Record<ElementType, { Icon: LucideIcon }> = {
  rectangle: { Icon: Square },
  diamond: { Icon: Diamond },
  triangle: { Icon: Triangle },
  ellipse: { Icon: Circle },
  line: { Icon: Minus },
  arrow: { Icon: ArrowRight },
  freedraw: { Icon: Pencil },
  text: { Icon: Type },
  image: { Icon: ImageIcon },
};

function displayName(el: SketchElement, t: T) {
  if (el.name) return el.name;
  const base = t((el.type === 'image' ? 'type.image' : `tool.${el.type}`) as MessageKey);
  const text = el.text?.trim().split('\n')[0];
  if (el.type === 'text') return text || base;
  return text ? `${base} · ${text}` : base;
}

type Row =
  | { kind: 'element'; el: SketchElement; depth: number }
  | { kind: 'group'; id: string; members: SketchElement[]; collapsed: boolean };

const DRAG_TYPE = 'application/x-biyik-layers';

export default function LayersPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const state = useEditor(editor);
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ key: string; where: 'above' | 'below' } | null>(null);
  const selected = new Set(state.selectedIds);

  // Üstteki öğe listenin başında; grup üyeleri grubun altında toplanır
  const ordered = [...editor.elements].reverse();
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const el of ordered) {
    if (el.groupId) {
      if (seen.has(el.groupId)) continue;
      seen.add(el.groupId);
      const members = ordered.filter((m) => m.groupId === el.groupId);
      const isCollapsed = collapsed.has(el.groupId);
      rows.push({ kind: 'group', id: el.groupId, members, collapsed: isCollapsed });
      if (!isCollapsed) for (const m of members) rows.push({ kind: 'element', el: m, depth: 1 });
    } else rows.push({ kind: 'element', el, depth: 0 });
  }

  const rowIds = (row: Row) => (row.kind === 'group' ? row.members.map((m) => m.id) : [row.el.id]);
  const rowKey = (row: Row) => (row.kind === 'group' ? `g:${row.id}` : row.el.id);

  const onDragStart = (e: DragEvent, row: Row) => {
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(rowIds(row)));
    e.dataTransfer.effectAllowed = 'move';
  };
  const whereOf = (e: DragEvent): 'above' | 'below' => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientY < r.top + r.height / 2 ? 'above' : 'below';
  };
  const onDrop = (e: DragEvent, row: Row) => {
    e.preventDefault();
    setDrop(null);
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    const ids: string[] = JSON.parse(raw);
    const where = whereOf(e);
    // Listede üstte görünen = sahnede üstte. Grubun üstüne: en üst üye; altına: en alt üye.
    const target =
      row.kind === 'group' ? (where === 'above' ? row.members[0] : row.members[row.members.length - 1]) : row.el;
    editor.placeLayers(ids, target.id, where);
  };

  const dropProps = (row: Row) => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
      e.preventDefault();
      const where = whereOf(e);
      const key = rowKey(row);
      if (drop?.key !== key || drop.where !== where) setDrop({ key, where });
    },
    onDragLeave: () => setDrop(null),
    onDrop: (e: DragEvent) => onDrop(e, row),
  });

  const dropClass = (row: Row) =>
    drop?.key === rowKey(row) ? (drop.where === 'above' ? ' is-drop-above' : ' is-drop-below') : '';

  const toggles = (ids: string[], hidden: boolean, locked: boolean): ReactNode => (
    <span className="sk-layer-tools">
      <button
        type="button"
        className={`sk-layer-tool${locked ? ' is-on' : ''}`}
        aria-label={locked ? t('action.unlock') : t('action.lock')}
        title={locked ? t('action.unlock') : t('action.lock')}
        onClick={(e) => {
          e.stopPropagation();
          editor.setLocked(ids, !locked);
        }}
      >
        {locked ? <Lock size={13} /> : <LockOpen size={13} />}
      </button>
      <button
        type="button"
        className={`sk-layer-tool${hidden ? ' is-on' : ''}`}
        aria-label={hidden ? t('action.show') : t('action.hide')}
        title={hidden ? t('action.show') : t('action.hide')}
        onClick={(e) => {
          e.stopPropagation();
          editor.setHidden(ids, !hidden);
        }}
      >
        {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </span>
  );

  const canGroup = new Set(editor.selectedElements().map((el) => el.groupId ?? el.id)).size > 1;

  return (
    <aside className="sk-layers sk-glass" aria-label={t('layers.title')}>
      <header className="sk-layers-head">
        <span>
          {t('layers.title')} <span className="sk-layers-count">{editor.elements.length}</span>
        </span>
        <span className="sk-layers-actions">
          <button
            type="button"
            className="sk-ibtn"
            disabled={!canGroup}
            title={`${t('layers.groupSelection')} (⌘G)`}
            aria-label={t('layers.groupSelection')}
            onClick={() => editor.group()}
          >
            <Group size={15} />
          </button>
          <button type="button" className="sk-ibtn" title={t('close')} aria-label={t('close')} onClick={onClose}>
            <X size={15} />
          </button>
        </span>
      </header>

      {!rows.length ? (
        <p className="sk-layers-empty">{t('layers.empty')}</p>
      ) : (
        <ul className="sk-layer-list" role="list">
          {rows.map((row) => {
            if (row.kind === 'group') {
              const ids = row.members.map((m) => m.id);
              const allHidden = row.members.every((m) => m.hidden);
              const allLocked = row.members.every((m) => m.locked);
              const isSel = row.members.every((m) => selected.has(m.id));
              return (
                <li
                  key={rowKey(row)}
                  className={`sk-layer is-group${isSel ? ' is-selected' : ''}${allHidden ? ' is-hidden' : ''}${dropClass(row)}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, row)}
                  {...dropProps(row)}
                  onClick={() => editor.select(ids)}
                >
                  <button
                    type="button"
                    className="sk-layer-caret"
                    aria-label={row.collapsed ? t('layers.expand') : t('layers.collapse')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsed((prev) => {
                        const next = new Set(prev);
                        if (next.has(row.id)) next.delete(row.id);
                        else next.add(row.id);
                        return next;
                      });
                    }}
                  >
                    {row.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <Folder size={14} className="sk-layer-icon" />
                  <span className="sk-layer-name">
                    {t('layers.group')} <span className="sk-layers-count">{row.members.length}</span>
                  </span>
                  <span className="sk-layer-tools">
                    <button
                      type="button"
                      className="sk-layer-tool"
                      title={t('action.ungroup')}
                      aria-label={t('action.ungroup')}
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.select(ids);
                        editor.ungroup();
                      }}
                    >
                      <Ungroup size={13} />
                    </button>
                  </span>
                  {toggles(ids, allHidden, allLocked)}
                </li>
              );
            }
            const { el, depth } = row;
            const { Icon } = TYPE_META[el.type];
            return (
              <li
                key={rowKey(row)}
                className={`sk-layer${selected.has(el.id) ? ' is-selected' : ''}${el.hidden ? ' is-hidden' : ''}${
                  el.locked ? ' is-locked' : ''
                }${depth ? ' is-child' : ''}${dropClass(row)}`}
                draggable={renaming !== el.id}
                onDragStart={(e) => onDragStart(e, row)}
                {...dropProps(row)}
                onClick={(e) => {
                  if (el.hidden || el.locked) return;
                  if (e.shiftKey || e.metaKey || e.ctrlKey) {
                    const next = new Set(selected);
                    if (next.has(el.id)) next.delete(el.id);
                    else next.add(el.id);
                    editor.selectExact([...next]);
                  } else editor.selectExact([el.id]);
                }}
                onDoubleClick={() => setRenaming(el.id)}
              >
                <Icon size={14} className="sk-layer-icon" />
                {renaming === el.id ? (
                  <input
                    className="sk-layer-input"
                    defaultValue={el.name ?? displayName(el, t)}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    onBlur={(e) => {
                      if (renaming === el.id) editor.rename(el.id, e.target.value === displayName({ ...el, name: undefined }, t) ? '' : e.target.value);
                      setRenaming(null);
                    }}
                  />
                ) : (
                  <span className="sk-layer-name" title={t('layers.renameHint')}>
                    {displayName(el, t)}
                  </span>
                )}
                {toggles([el.id], !!el.hidden, !!el.locked)}
              </li>
            );
          })}
        </ul>
      )}
      <p className="sk-layers-foot">{t('layers.foot')}</p>
    </aside>
  );
}
