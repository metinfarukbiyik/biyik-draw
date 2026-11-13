'use client';

import {
  BrushCleaning,
  Eraser,
  Hand,
  Highlighter,
  Minimize2,
  MousePointer2,
  Pencil,
  Redo2,
  Type,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { HIGHLIGHT_COLORS, type Editor, type Paper, type Tool } from '../sketch';
import { useEditor } from './useEditor';
import { useI18n, type MessageKey } from './i18n';
import { LaserIcon } from './Toolbar';
import { PAPER_ICONS, PAPERS } from './PaperPicker';

/** Ders modunda kalem renkleri: büyük, kolay seçilen beş renk. */
const PEN_COLORS = ['#18181b', '#dc2626', '#2563eb', '#16a34a', '#d97706'];

const TOOLS: { tool: Tool; Icon: LucideIcon }[] = [
  { tool: 'freedraw', Icon: Pencil },
  { tool: 'highlighter', Icon: Highlighter },
  { tool: 'laser', Icon: LaserIcon as LucideIcon },
  { tool: 'eraser', Icon: Eraser },
  { tool: 'text', Icon: Type },
  { tool: 'select', Icon: MousePointer2 },
  { tool: 'hand', Icon: Hand },
];

/**
 * Ders modu çubuğu: tablette parmakla rahat basılan büyük düğmeler. Kalem, fosforlu kalem,
 * lazer, silgi; renk ve kalınlık; kâğıt deseni; geri al ve yeni sayfa.
 */
export default function PresentBar({ editor, onExit }: { editor: Editor; onExit: () => void }) {
  const state = useEditor(editor);
  const { t } = useI18n();
  const highlighter = state.tool === 'highlighter';
  const colors = highlighter ? HIGHLIGHT_COLORS : PEN_COLORS;
  const current = highlighter ? state.highlightColor : state.style.strokeColor;
  const nextPaper = (p: Paper): Paper => PAPERS[(PAPERS.indexOf(p) + 1) % PAPERS.length];

  return (
    <div className="sk-present sk-glass" role="toolbar" aria-label={t('menu.present')}>
      <div className="sk-present-group">
        {TOOLS.map(({ tool, Icon }) => {
          const label = t((tool === 'freedraw' ? 'tool.freedraw' : `tool.${tool}`) as MessageKey);
          return (
            <button
              key={tool}
              type="button"
              className="sk-present-btn"
              aria-pressed={state.tool === tool}
              aria-label={label}
              title={label}
              onClick={() => editor.setTool(tool)}
            >
              <Icon size={20} strokeWidth={1.75} />
            </button>
          );
        })}
      </div>
      <span className="sk-present-sep" aria-hidden />
      <div className="sk-present-group">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            className="sk-present-color"
            style={{ background: c }}
            aria-pressed={current === c}
            aria-label={c}
            onClick={() => {
              if (highlighter) editor.setHighlightColor(c);
              else {
                editor.setStyle({ strokeColor: c });
                if (state.tool !== 'freedraw' && state.tool !== 'text') editor.setTool('freedraw');
              }
            }}
          />
        ))}
      </div>
      <span className="sk-present-sep" aria-hidden />
      <div className="sk-present-group" role="group" aria-label={t('present.size')}>
        {[1, 2, 4].map((w) => (
          <button
            key={w}
            type="button"
            className="sk-present-btn"
            aria-pressed={state.style.strokeWidth === w}
            aria-label={`${t('present.size')} ${w}`}
            onClick={() => editor.setStyle({ strokeWidth: w })}
          >
            <span className="sk-present-dot" style={{ width: 4 + w * 2.5, height: 4 + w * 2.5 }} />
          </button>
        ))}
      </div>
      <span className="sk-present-sep" aria-hidden />
      <div className="sk-present-group">
        <button
          type="button"
          className="sk-present-btn"
          aria-label={`${t('present.paper')}: ${t(`paper.${state.paper}` as MessageKey)}`}
          title={`${t('present.paper')}: ${t(`paper.${state.paper}` as MessageKey)}`}
          onClick={() => editor.setPaper(nextPaper(state.paper))}
        >
          {PAPER_ICONS[state.paper]}
        </button>
        <button
          type="button"
          className="sk-present-btn"
          aria-label={t('history.undo')}
          disabled={!editor.canUndo}
          onClick={() => editor.undo()}
        >
          <Undo2 size={20} />
        </button>
        <button
          type="button"
          className="sk-present-btn"
          aria-label={t('history.redo')}
          disabled={!editor.canRedo}
          onClick={() => editor.redo()}
        >
          <Redo2 size={20} />
        </button>
        <button
          type="button"
          className="sk-present-btn"
          aria-label={t('present.clear')}
          title={t('present.clear')}
          onClick={() => editor.clear()}
        >
          <BrushCleaning size={20} />
        </button>
        <button
          type="button"
          className="sk-present-btn is-exit"
          aria-label={t('present.exit')}
          title={t('present.exit')}
          onClick={onExit}
        >
          <Minimize2 size={20} />
        </button>
      </div>
    </div>
  );
}
