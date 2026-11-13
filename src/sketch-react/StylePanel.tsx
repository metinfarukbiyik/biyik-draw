'use client';

import type { ReactNode } from 'react';
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDown,
  ArrowUp,
  BringToFront,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  Lock,
  Paintbrush,
  PaintBucket,
  SendToBack,
  Trash2,
  Ungroup,
} from 'lucide-react';
import {
  BACKGROUND_COLORS,
  STROKE_COLORS,
  type Arrowhead,
  type Editor,
  type ElementType,
  type StyleProps,
  type Tool,
} from '../sketch';
import { useEditor } from './useEditor';
import { useI18n, type MessageKey } from './i18n';

const TOOL_TYPE: Partial<Record<Tool, ElementType>> = {
  rectangle: 'rectangle',
  diamond: 'diamond',
  triangle: 'triangle',
  ellipse: 'ellipse',
  arrow: 'arrow',
  line: 'line',
  freedraw: 'freedraw',
  text: 'text',
};

const SHAPES: ElementType[] = ['rectangle', 'diamond', 'triangle', 'ellipse'];

/* ── Küçük çizim ikonları ── */

const Glyph = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

const ARROWHEADS: { value: Arrowhead; end: string; start: string }[] = [
  { value: 'none', end: 'M3 10h14', start: 'M3 10h14' },
  { value: 'arrow', end: 'M3 10h14M12 5l5 5-5 5', start: 'M3 10h14M8 5l-5 5 5 5' },
  { value: 'triangle', end: 'M3 10h10M12 5.5 17 10l-5 4.5z', start: 'M7 10h10M8 5.5 3 10l5 4.5z' },
  { value: 'dot', end: 'M3 10h9M17 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z', start: 'M8 10h9M8 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z' },
  { value: 'bar', end: 'M3 10h14M17 5v10', start: 'M3 10h14M3 5v10' },
];

/* ── Yapı taşları ── */

function Section({ children }: { children: ReactNode }) {
  return <section className="sk-sec">{children}</section>;
}

function Field({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="sk-field">
      <div className="sk-field-head">
        <span>{label}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}

interface SegOption<T> {
  value: T;
  label: string;
  icon: ReactNode;
}

function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="sk-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          aria-label={o.label}
          title={o.label}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="sk-ibtn" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function Swatches({
  colors,
  value,
  onChange,
  label,
}: {
  colors: string[];
  value: string;
  onChange: (c: string) => void;
  label: string;
}) {
  const custom = !colors.includes(value);
  const { t } = useI18n();
  const noFill = t('style.noFill');
  return (
    <div className="sk-swatches" role="group" aria-label={label}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className={`sk-swatch${c === 'transparent' ? ' is-none' : ''}`}
          style={c === 'transparent' ? undefined : { background: c }}
          aria-pressed={value === c}
          aria-label={c === 'transparent' ? noFill : c}
          title={c === 'transparent' ? noFill : c}
          onClick={() => onChange(c)}
        />
      ))}
      <span className="sk-swatches-sep" aria-hidden />
      <label
        className={`sk-swatch is-custom${custom ? ' is-active' : ''}`}
        style={custom && value !== 'transparent' ? { background: value } : undefined}
        title={`${label} · ${t('style.custom')}`}
      >
        <input
          type="color"
          value={custom && value !== 'transparent' ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} · ${t('style.custom')}`}
        />
      </label>
    </div>
  );
}

export default function StylePanel({ editor }: { editor: Editor }) {
  const state = useEditor(editor);
  const { t } = useI18n();
  const editing = editor.getElement(state.editingId);
  const selected = editor.selectedElements();
  const targets = editing ? [editing] : selected;
  const toolType = TOOL_TYPE[state.tool];
  if (!targets.length && !toolType) return null;

  const types = new Set<ElementType>(targets.length ? targets.map((t) => t.type) : [toolType!]);
  const v: StyleProps = targets[0] ?? state.style;
  const set = (patch: Partial<StyleProps>) => editor.setStyle(patch);
  const has = (...t: ElementType[]) => t.some((x) => types.has(x));
  const onlyImages = types.size === 1 && types.has('image');

  const hasShape = has(...SHAPES);
  const hasLines = has(...SHAPES, 'line', 'arrow', 'freedraw');
  const showText =
    has('text') || targets.some((t) => SHAPES.includes(t.type) && t.text) || (!!editing && SHAPES.includes(editing.type));
  const units = new Set(selected.map((el) => el.groupId ?? el.id)).size;
  const grouped = selected.some((el) => el.groupId);

  return (
    <aside
      className="sk-panel sk-glass"
      aria-label={t('style.aria')}
      // Metin yazılırken panel düğmeleri odağı metin kutusundan almasın
      onMouseDown={(e) => {
        if (editing && !(e.target instanceof HTMLInputElement)) e.preventDefault();
      }}
    >
      {!onlyImages && (
        <Section>
          <Field label={t('style.stroke')}>
            <Swatches colors={STROKE_COLORS} value={v.strokeColor} onChange={(c) => set({ strokeColor: c })} label={t('style.stroke')} />
          </Field>
          {hasShape && (
            <Field label={t('style.background')}>
              <Swatches
                colors={BACKGROUND_COLORS}
                value={v.backgroundColor}
                onChange={(c) => set({ backgroundColor: c })}
                label={t('style.background')}
              />
            </Field>
          )}
          {hasShape && v.backgroundColor !== 'transparent' && (
            <Field label={t('style.fill')}>
              <Seg
                label={t('style.fill')}
                value={v.fillStyle}
                onChange={(fillStyle) => set({ fillStyle })}
                options={[
                  {
                    value: 'hachure',
                    label: t('style.hachure'),
                    icon: (
                      <Glyph>
                        <rect x="3.5" y="3.5" width="13" height="13" rx="3" strokeWidth="1.4" />
                        <path d="M4 11 11 4M6 16 16 6M11 16l5-5" strokeWidth="1.1" />
                      </Glyph>
                    ),
                  },
                  {
                    value: 'cross',
                    label: t('style.cross'),
                    icon: (
                      <Glyph>
                        <rect x="3.5" y="3.5" width="13" height="13" rx="3" strokeWidth="1.4" />
                        <path d="M4 11 11 4M6 16 16 6M11 16l5-5M9 4l7 7M4 6l10 10M4 11l5 5" strokeWidth="0.9" />
                      </Glyph>
                    ),
                  },
                  {
                    value: 'solid',
                    label: t('style.solid'),
                    icon: (
                      <Glyph>
                        <rect x="3.5" y="3.5" width="13" height="13" rx="3" strokeWidth="1.4" fill="currentColor" />
                      </Glyph>
                    ),
                  },
                ]}
              />
            </Field>
          )}
        </Section>
      )}

      {hasLines && (
        <Section>
          <Field label={t('style.width')}>
            <Seg
              label={t('style.width')}
              value={v.strokeWidth}
              onChange={(strokeWidth) => set({ strokeWidth })}
              options={[1, 2, 4].map((w) => ({
                value: w,
                label: t(w === 1 ? 'style.thin' : w === 2 ? 'style.bold' : 'style.extra'),
                icon: (
                  <Glyph>
                    <path d="M4 10h12" strokeWidth={w * 0.9 + 0.7} />
                  </Glyph>
                ),
              }))}
            />
          </Field>
          {has(...SHAPES, 'line', 'arrow') && (
            <>
              <Field label={t('style.strokeStyle')}>
                <Seg
                  label={t('style.strokeStyle')}
                  value={v.strokeStyle}
                  onChange={(strokeStyle) => set({ strokeStyle })}
                  options={[
                    { value: 'solid', label: t('style.solidLine'), icon: <Glyph><path d="M3 10h14" strokeWidth="1.8" /></Glyph> },
                    { value: 'dashed', label: t('style.dashed'), icon: <Glyph><path d="M3 10h14" strokeWidth="1.8" strokeDasharray="4 3" /></Glyph> },
                    { value: 'dotted', label: t('style.dotted'), icon: <Glyph><path d="M3 10h14" strokeWidth="2.2" strokeDasharray="0.1 3.8" /></Glyph> },
                  ]}
                />
              </Field>
              <Field label={t('style.roughness')}>
                <Seg
                  label={t('style.roughness')}
                  value={v.roughness}
                  onChange={(roughness) => set({ roughness })}
                  options={[
                    {
                      value: 0,
                      label: t('style.rough0'),
                      icon: (
                        <Glyph>
                          <path d="M3 10h14" strokeWidth="1.6" />
                        </Glyph>
                      ),
                    },
                    {
                      value: 1,
                      label: t('style.rough1'),
                      icon: (
                        <Glyph>
                          <path d="M3 10.6c3-1.6 5.6.9 8.6-.5 2.4-1.1 4-.1 5.4-.5" strokeWidth="1.5" />
                        </Glyph>
                      ),
                    },
                    {
                      value: 2,
                      label: t('style.rough2'),
                      icon: (
                        <Glyph>
                          <path d="M3 12c2-4.2 4.4 2.6 7-1.6s4.6 2.4 7-2.2" strokeWidth="1.3" />
                          <path d="M3.4 10c2.4-2.4 4.4 2.8 6.9-.4 2.2-2.8 4.4 1 6.5-1.6" strokeWidth="0.9" />
                        </Glyph>
                      ),
                    },
                  ]}
                />
              </Field>
            </>
          )}
          {has('rectangle', 'diamond', 'triangle', 'line', 'arrow') && (
            <Field label={t('style.edges')}>
              <Seg
                label={t('style.edges')}
                value={v.edges}
                onChange={(edges) => set({ edges })}
                options={[
                  { value: 'sharp', label: t('style.sharp'), icon: <Glyph><path d="M5 15V5h10" strokeWidth="1.6" /></Glyph> },
                  { value: 'round', label: t('style.round'), icon: <Glyph><path d="M5 15V10a5 5 0 0 1 5-5h5" strokeWidth="1.6" /></Glyph> },
                ]}
              />
            </Field>
          )}
        </Section>
      )}

      {has('arrow') && (
        <Section>
          <Field label={t('style.startHead')}>
            <Seg
              label={t('style.startHead')}
              value={v.startArrowhead}
              onChange={(startArrowhead) => set({ startArrowhead })}
              options={ARROWHEADS.map((a) => ({
                value: a.value,
                label: t(`head.${a.value}` as MessageKey),
                icon: <Glyph><path d={a.start} strokeWidth="1.5" /></Glyph>,
              }))}
            />
          </Field>
          <Field label={t('style.endHead')}>
            <Seg
              label={t('style.endHead')}
              value={v.endArrowhead}
              onChange={(endArrowhead) => set({ endArrowhead })}
              options={ARROWHEADS.map((a) => ({
                value: a.value,
                label: t(`head.${a.value}` as MessageKey),
                icon: <Glyph><path d={a.end} strokeWidth="1.5" /></Glyph>,
              }))}
            />
          </Field>
        </Section>
      )}

      {showText && (
        <Section>
          <Field label={t('style.font')}>
            <Seg
              label={t('style.font')}
              value={v.fontFamily}
              onChange={(fontFamily) => set({ fontFamily })}
              options={[
                { value: 'hand', label: t('style.fontHand'), icon: <span className="sk-seg-text is-hand">Aa</span> },
                { value: 'sans', label: t('style.fontSans'), icon: <span className="sk-seg-text">Aa</span> },
                { value: 'mono', label: t('style.fontMono'), icon: <span className="sk-seg-text is-mono">{'{}'}</span> },
              ]}
            />
          </Field>
          <Field label={t('style.size')}>
            <Seg
              label={t('style.size')}
              value={v.fontSize}
              onChange={(fontSize) => set({ fontSize })}
              options={[
                [16, 'S'],
                [24, 'M'],
                [32, 'L'],
                [48, 'XL'],
              ].map(([size, l]) => ({ value: size as number, label: `${t('style.size')} ${l}`, icon: <span className="sk-seg-text">{l}</span> }))}
            />
          </Field>
          <Field label={t('style.align')}>
            <Seg
              label={t('style.align')}
              value={v.textAlign}
              onChange={(textAlign) => set({ textAlign })}
              options={[
                { value: 'left', label: t('style.alignLeft'), icon: <AlignLeft size={16} /> },
                { value: 'center', label: t('style.alignCenter'), icon: <AlignCenter size={16} /> },
                { value: 'right', label: t('style.alignRight'), icon: <AlignRight size={16} /> },
              ]}
            />
          </Field>
        </Section>
      )}

      <Section>
        <Field label={t('style.opacity')} aside={<span className="sk-field-value">{v.opacity}%</span>}>
          <input
            className="sk-range"
            type="range"
            min={0}
            max={100}
            step={5}
            value={v.opacity}
            style={{ ['--val' as string]: `${v.opacity}%` }}
            onChange={(e) => set({ opacity: Number(e.target.value) })}
            aria-label={t('style.opacity')}
          />
        </Field>
      </Section>

      {selected.length > 0 && !editing && (
        <Section>
          {units > 1 && (
            <Field label={t('style.arrange')}>
              <div className="sk-icons">
                <IconBtn label={t('arrange.left')} onClick={() => editor.align('left')}>
                  <AlignStartVertical size={16} />
                </IconBtn>
                <IconBtn label={t('arrange.hcenter')} onClick={() => editor.align('hcenter')}>
                  <AlignCenterVertical size={16} />
                </IconBtn>
                <IconBtn label={t('arrange.right')} onClick={() => editor.align('right')}>
                  <AlignEndVertical size={16} />
                </IconBtn>
                <IconBtn label={t('arrange.top')} onClick={() => editor.align('top')}>
                  <AlignStartHorizontal size={16} />
                </IconBtn>
                <IconBtn label={t('arrange.vcenter')} onClick={() => editor.align('vcenter')}>
                  <AlignCenterHorizontal size={16} />
                </IconBtn>
                <IconBtn label={t('arrange.bottom')} onClick={() => editor.align('bottom')}>
                  <AlignEndHorizontal size={16} />
                </IconBtn>
                {units > 2 && (
                  <>
                    <IconBtn label={t('arrange.distX')} onClick={() => editor.distribute('x')}>
                      <AlignHorizontalDistributeCenter size={16} />
                    </IconBtn>
                    <IconBtn label={t('arrange.distY')} onClick={() => editor.distribute('y')}>
                      <AlignVerticalDistributeCenter size={16} />
                    </IconBtn>
                  </>
                )}
              </div>
            </Field>
          )}
          <Field label={t('style.layer')}>
            <div className="sk-icons">
              <IconBtn label={`${t('layer.back')} (⌘⇧[)`} onClick={() => editor.reorder('back')}>
                <SendToBack size={16} />
              </IconBtn>
              <IconBtn label={`${t('layer.backward')} (⌘[)`} onClick={() => editor.reorder('backward')}>
                <ArrowDown size={16} />
              </IconBtn>
              <IconBtn label={`${t('layer.forward')} (⌘])`} onClick={() => editor.reorder('forward')}>
                <ArrowUp size={16} />
              </IconBtn>
              <IconBtn label={`${t('layer.front')} (⌘⇧])`} onClick={() => editor.reorder('front')}>
                <BringToFront size={16} />
              </IconBtn>
            </div>
          </Field>
          <Field label={t('style.actions')}>
            <div className="sk-icons">
              <IconBtn label={`${t('action.duplicate')} (⌘D)`} onClick={() => editor.duplicateSelected()}>
                <Copy size={16} />
              </IconBtn>
              <IconBtn label={`${t('action.flipH')} (⇧H)`} onClick={() => editor.flip('x')}>
                <FlipHorizontal2 size={16} />
              </IconBtn>
              <IconBtn label={`${t('action.flipV')} (⇧V)`} onClick={() => editor.flip('y')}>
                <FlipVertical2 size={16} />
              </IconBtn>
              {units > 1 && !grouped && (
                <IconBtn label={`${t('action.group')} (⌘G)`} onClick={() => editor.group()}>
                  <Group size={16} />
                </IconBtn>
              )}
              {grouped && (
                <IconBtn label={`${t('action.ungroup')} (⌘⇧G)`} onClick={() => editor.ungroup()}>
                  <Ungroup size={16} />
                </IconBtn>
              )}
              <IconBtn label={`${t('action.copyStyle')} (⌘⌥C)`} onClick={() => editor.copyStyle()}>
                <Paintbrush size={16} />
              </IconBtn>
              <IconBtn label={`${t('action.pasteStyle')} (⌘⌥V)`} onClick={() => editor.pasteStyle()}>
                <PaintBucket size={16} />
              </IconBtn>
              <IconBtn label={`${t('action.lock')} (⌘⇧L)`} onClick={() => editor.lockSelected()}>
                <Lock size={16} />
              </IconBtn>
              <IconBtn label={`${t('action.delete')} (Delete)`} onClick={() => editor.deleteSelected()}>
                <Trash2 size={16} />
              </IconBtn>
            </div>
          </Field>
        </Section>
      )}
    </aside>
  );
}
