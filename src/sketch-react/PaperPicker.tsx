'use client';

import type { ReactNode } from 'react';
import type { Paper } from '../sketch';
import { useI18n, type MessageKey } from './i18n';

const G = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden>
    <rect x="3" y="3" width="14" height="14" rx="2.5" strokeWidth="1.3" />
    {children}
  </svg>
);

export const PAPER_ICONS: Record<Paper, ReactNode> = {
  none: <G>{null}</G>,
  grid: (
    <G>
      <path d="M7.7 3v14M12.3 3v14M3 7.7h14M3 12.3h14" strokeWidth="0.9" />
    </G>
  ),
  dots: (
    <G>
      {[7, 10, 13].flatMap((x) =>
        [7, 10, 13].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.85" fill="currentColor" stroke="none" />),
      )}
    </G>
  ),
  lines: (
    <G>
      <path d="M5.5 7h11M5.5 10h11M5.5 13h11" strokeWidth="0.9" />
      <path d="M5.5 3v14" strokeWidth="0.9" opacity="0.6" />
    </G>
  ),
  guide: (
    <G>
      <path d="M3 6h14M3 14h14" strokeWidth="0.8" opacity="0.6" />
      <path d="M3 8.7h14M3 11.3h14" strokeWidth="1.3" />
    </G>
  ),
};

export const PAPERS: Paper[] = ['none', 'grid', 'dots', 'lines', 'guide'];

/** Kâğıt deseni seçici (bölmeli düğmeler). */
export function PaperPicker({ value, onChange }: { value: Paper; onChange: (p: Paper) => void }) {
  const { t } = useI18n();
  return (
    <div className="sk-seg" role="group" aria-label={t('paper.title')}>
      {PAPERS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={value === p}
          aria-label={t(`paper.${p}` as MessageKey)}
          title={t(`paper.${p}` as MessageKey)}
          onClick={() => onChange(p)}
        >
          {PAPER_ICONS[p]}
        </button>
      ))}
    </div>
  );
}
