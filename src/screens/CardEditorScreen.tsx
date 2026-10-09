import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CardEffectId, CardStyle, Rarity } from '../types/models';
import { useApp, type CardStyleTarget } from '../state/AppStore';
import { TopBar } from '../components/Layout';
import { CarCard } from '../components/CarCard';
import { Icon } from '../components/Icon';
import { ProBadge } from '../components/ui';
import { carCards, sampleCard, type CarCardData } from '../lib/cards';
import { RARITY_META, RARITY_ORDER } from '../lib/rarity';
import { resolveCardStyle, sanitizeStyle, themeStatus } from '../lib/cardStyle';
import {
  BACKGROUND_CATEGORIES,
  CARD_BACKGROUNDS,
  CARD_EFFECTS,
  CARD_FRAMES,
  CARD_PRESETS,
  CARD_TEXT_STYLES,
  CARD_THEMES,
  FREE_STYLE,
  MAX_EFFECTS,
  SAMPLE_MODEL_BY_RARITY,
  styleFromTheme,
  themeById,
  type BackgroundCategory,
} from '../data/cardDesigns';

type Tab = 'design' | 'background' | 'frame' | 'effect' | 'text';
const TABS: { v: Tab; label: string }[] = [
  { v: 'design', label: 'Design' },
  { v: 'background', label: 'Hintergrund' },
  { v: 'frame', label: 'Rahmen' },
  { v: 'effect', label: 'Effekt' },
  { v: 'text', label: 'Text-Stil' },
];

const targetKey = (t: CardStyleTarget) => (t.kind === 'model' ? `model:${t.modelId}` : t.kind === 'rarity' ? `rarity:${t.rarity}` : 'all');

/**
 * CARD EDITOR – Custom Spot Cards (SpotDrive Pro)
 * Oben die Live-Vorschau, darunter Design · Hintergrund · Rahmen · Effekt · Text-Stil.
 * Aufruf: /cards/editor (Standards je Seltenheit) oder /cards/editor?model=<id> (eine bestimmte Card).
 */
export function CardEditorScreen() {
  const { state, me, cardCtx, unlockedThemes, saveCardStyle, resetCardStyle, showToast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const myCards = useMemo(() => carCards(state.spots, me.id), [state.spots, me.id]);
  const ownCard = myCards.find((c) => c.model.id === params.get('model'));

  const [rarity, setRarity] = useState<Rarity>(ownCard?.model.rarity ?? 'epic');
  const [target, setTarget] = useState<CardStyleTarget>(ownCard ? { kind: 'model', modelId: ownCard.model.id } : { kind: 'rarity', rarity });
  const [tab, setTab] = useState<Tab>('design');
  const [bgCat, setBgCat] = useState<BackgroundCategory | 'Alle'>('Alle');
  const [detail, setDetail] = useState(false);

  // Vorschau-Card: eigene Card → eigene Card dieser Seltenheit → Beispiel-Card
  const preview: CarCardData = useMemo(() => {
    if (ownCard && target.kind === 'model') return ownCard;
    const same = myCards.filter((c) => c.model.rarity === rarity);
    const mine = same.find((c) => c.photoSpot && !c.photoSpot.media.placeholder) ?? same[0];
    return mine ?? sampleCard(SAMPLE_MODEL_BY_RARITY[rarity]);
  }, [ownCard, target.kind, myCards, rarity]);

  const saved = (t: CardStyleTarget): CardStyle | undefined =>
    t.kind === 'all' ? state.cardStyles.all : t.kind === 'rarity' ? state.cardStyles.byRarity[t.rarity] : state.cardStyles.byModel[t.modelId];

  const [style, setStyle] = useState<CardStyle>(() => {
    const cur = resolveCardStyle(preview.model.id, preview.model.rarity, state.cardStyles, cardCtx, unlockedThemes);
    return cur.themeId === 'standard' && me.isPro ? styleFromTheme('dark') : cur;
  });

  useEffect(() => window.scrollTo(0, 0), []);

  // Beim Wechsel des Ziels das dort gespeicherte Design laden
  useEffect(() => {
    const s = saved(target);
    if (s) setStyle(sanitizeStyle(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey(target)]);

  const theme = themeById(style.themeId);
  const set = (patch: Partial<CardStyle>) => setStyle((s) => ({ ...s, ...patch }));
  const pickTheme = (id: string) => {
    const t = themeById(id);
    const st = themeStatus(t, cardCtx);
    if (!st.unlocked) return showToast(`🔒 ${t.name}: ${st.requirement}${st.progressLabel ? ` (${st.progressLabel})` : ''}`);
    setStyle(styleFromTheme(id));
  };
  const toggleEffect = (id: CardEffectId) =>
    setStyle((s) => {
      if (s.effects.includes(id)) return { ...s, effects: s.effects.filter((e) => e !== id) };
      if (s.effects.length >= MAX_EFFECTS) {
        showToast(`Maximal ${MAX_EFFECTS} Effekte – damit alles lesbar bleibt`);
        return s;
      }
      return { ...s, effects: [...s.effects, id] };
    });

  const chooseRarity = (r: Rarity) => {
    setRarity(r);
    if (target.kind !== 'all') setTarget({ kind: 'rarity', rarity: r });
  };

  const save = () => {
    saveCardStyle(target, style);
    const label = target.kind === 'all' ? 'alle Cards' : target.kind === 'rarity' ? `${RARITY_META[target.rarity].label}-Cards` : 'diese Card';
    showToast(`✅ ${theme.emoji} ${theme.name} ist jetzt Standard für ${label}`);
  };

  // ─── Free: Vorschau + Pro-Hinweis ────────────────────────────────────
  if (!me.isPro) {
    return (
      <div className="screen">
        <TopBar back title={<span className="row gap-s">Custom Spot Cards <ProBadge small /></span>} />
        <p className="muted">Gestalte deine Car Cards mit exklusiven Designs, Hintergründen, Rahmen und Effekten – und lege für jede Seltenheit ein eigenes Standard-Design fest.</p>
        <div className="ce-showcase">
          {CARD_PRESETS.slice(0, 6).map((p, i) => (
            <div key={p.id} className="ce-showcase__item">
              <CarCard card={sampleCard(SAMPLE_MODEL_BY_RARITY[RARITY_ORDER[i % RARITY_ORDER.length]], 12 + i * 7)} size="xs" styleOverride={p.style} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
        <div className="ce-paywall">
          <div className="ch-paywall__icon">🎨</div>
          <h2>Custom Spot Cards sind Pro</h2>
          <p className="muted small">12 Designs · 20 Hintergründe · 7 Rahmen · 6 Effekte · 5 Schriften · Standards je Seltenheit. Seltenheits-Rahmen (Rare, Epic, Legendary …) bekommst du auch ohne Pro.</p>
          <button className="btn btn--primary btn--block btn--lg" onClick={() => navigate('/pro')}>
            <Icon name="crown" size={18} fill strokeWidth={0} /> SpotDrive Pro freischalten
          </button>
        </div>
      </div>
    );
  }

  const bgs = CARD_BACKGROUNDS.filter((b) => (bgCat === 'Alle' ? true : b.category === bgCat));

  return (
    <div className="screen ce">
      <TopBar back title={<span className="row gap-s">Card Editor <ProBadge small /></span>} />

      {/* ── Live-Vorschau ── */}
      <div className={`ce-preview ${detail ? 'ce-preview--detail' : ''}`}>
        <div className="ce-preview__card">
          <CarCard card={preview} size={detail ? 'lg' : 'sm'} viewerId={me.id} styleOverride={style} />
        </div>
        <div className="ce-preview__side">
          <div className="eyebrow">Vorschau</div>
          <b>
            {theme.emoji} {theme.name}
          </b>
          <span className="muted small">{preview.sample ? 'Beispiel-Card' : 'Deine Card'}</span>
          <button className="chip chip--btn" onClick={() => setDetail((d) => !d)}>
            {detail ? 'Kompakt' : 'Alle Infos'}
          </button>
        </div>
      </div>

      {/* ── Für welche Cards? ── */}
      <div className="ce-target">
        <span className="eyebrow">Gilt für</span>
        <div className="chip-row chip-row--scroll">
          {ownCard && (
            <button className={`chip chip--btn ${target.kind === 'model' ? 'chip--on' : ''}`} onClick={() => setTarget({ kind: 'model', modelId: ownCard.model.id })}>
              Nur diese Card
            </button>
          )}
          {RARITY_ORDER.map((r) => (
            <button key={r} className={`chip chip--btn ${target.kind === 'rarity' && target.rarity === r ? 'chip--on' : ''}`} onClick={() => chooseRarity(r)} style={{ ['--rc' as string]: RARITY_META[r].color }}>
              {RARITY_META[r].emoji} {RARITY_META[r].label}
            </button>
          ))}
          <button className={`chip chip--btn ${target.kind === 'all' ? 'chip--on' : ''}`} onClick={() => setTarget({ kind: 'all' })}>
            Alle
          </button>
        </div>
      </div>

      {/* ── Vorlagen (Test-Designs) ── */}
      <div className="ce-section-title">Vorlagen</div>
      <div className="ce-presets">
        {CARD_PRESETS.map((p) => {
          const locked = !unlockedThemes.has(p.style.themeId);
          return (
            <button key={p.id} className={`ce-tile ${locked ? 'is-locked' : ''}`} onClick={() => (locked ? pickTheme(p.style.themeId) : setStyle({ ...p.style, effects: [...p.style.effects] }))}>
              <CarCard card={preview} size="xs" styleOverride={p.style} />
              <span className="ce-tile__name">{p.name}</span>
              {locked && <LockBadge />}
            </button>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="segmented ce-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.v} role="tab" aria-selected={tab === t.v} className={tab === t.v ? 'on' : ''} onClick={() => setTab(t.v)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'design' && (
        <div className="ce-grid">
          {CARD_THEMES.map((t) => {
            const st = themeStatus(t, cardCtx);
            return (
              <button key={t.id} className={`ce-tile ${style.themeId === t.id ? 'is-active' : ''} ${st.unlocked ? '' : 'is-locked'}`} onClick={() => pickTheme(t.id)}>
                <CarCard card={preview} size="xs" styleOverride={styleFromTheme(t.id)} />
                <span className="ce-tile__name">
                  {t.emoji} {t.name}
                </span>
                <span className="ce-tile__meta">
                  {st.unlocked ? (t.unlock.kind === 'free' ? 'Kostenlos' : t.unlock.kind === 'pro' ? 'Pro' : '✓ Freigeschaltet') : `🔒 ${st.requirement}`}
                </span>
                {!st.unlocked && st.progress !== undefined && (
                  <span className="ce-tile__bar">
                    <span style={{ width: `${Math.max(4, st.progress * 100)}%` }} />
                  </span>
                )}
                {!st.unlocked && <LockBadge />}
              </button>
            );
          })}
        </div>
      )}

      {tab === 'background' && (
        <div className="stack">
          <div>
            <div className="ce-section-title">Farbe {theme.palette[0] === 'rarity' && <span className="muted small">– Standard nutzt die Seltenheitsfarbe</span>}</div>
            {theme.palette[0] !== 'rarity' && (
              <div className="ce-swatches" role="radiogroup" aria-label="Hintergrundfarbe">
                {theme.palette.map((c) => (
                  <button key={c} role="radio" aria-checked={style.color === c} aria-label={c} className={`ce-swatch ${style.color === c ? 'is-active' : ''}`} style={{ background: c }} onClick={() => set({ color: c })} />
                ))}
              </div>
            )}
            <p className="muted small">Farben sind pro Design abgestimmt, damit jede Card hochwertig und lesbar bleibt.</p>
          </div>
          <div className="chip-row chip-row--scroll">
            {(['Alle', ...BACKGROUND_CATEGORIES] as const).map((c) => (
              <button key={c} className={`chip chip--btn ${bgCat === c ? 'chip--on' : ''}`} onClick={() => setBgCat(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="ce-grid ce-grid--bg">
            {bgs.map((b) => (
              <button key={b.id} className={`ce-bg ${style.backgroundId === b.id ? 'is-active' : ''}`} onClick={() => set({ backgroundId: b.id })} style={{ ['--rc' as string]: RARITY_META[preview.model.rarity].color }}>
                <span className="ce-bg__swatch" style={{ background: b.css(style.color === 'rarity' ? 'var(--rc)' : style.color) }} />
                <span className="ce-tile__name">{b.name}</span>
                <span className="ce-tile__meta">{b.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'frame' && (
        <div className="ce-grid">
          {CARD_FRAMES.map((f) => (
            <button key={f.id} className={`ce-tile ${style.frameId === f.id ? 'is-active' : ''}`} onClick={() => set({ frameId: f.id })}>
              <CarCard card={preview} size="xs" styleOverride={{ ...style, frameId: f.id }} />
              <span className="ce-tile__name">{f.name}</span>
              <span className="ce-tile__meta">{f.description}</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'effect' && (
        <div className="stack">
          <p className="muted small">
            Bis zu {MAX_EFFECTS} Effekte. Sie liegen hinter der Info-Fläche und stören die Lesbarkeit nicht. Bei „Bewegung reduzieren“ im System laufen keine Animationen.
          </p>
          <div className="ce-effects">
            {CARD_EFFECTS.map((e) => {
              const on = style.effects.includes(e.id);
              return (
                <button key={e.id} className={`ce-effect ${on ? 'is-active' : ''}`} onClick={() => toggleEffect(e.id)} aria-pressed={on}>
                  <span className="ce-effect__icon">{e.icon}</span>
                  <span>
                    <b>{e.name}</b>
                    <span className="muted small">{e.description}</span>
                  </span>
                  <span className="ce-effect__check">{on ? <Icon name="check" size={16} /> : null}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'text' && (
        <div className="ce-grid">
          {CARD_TEXT_STYLES.map((t) => (
            <button key={t.id} className={`ce-tile ${style.textStyle === t.id ? 'is-active' : ''}`} onClick={() => set({ textStyle: t.id })}>
              <CarCard card={preview} size="xs" styleOverride={{ ...style, textStyle: t.id }} />
              <span className="ce-tile__name">{t.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Gespeicherte Standards je Seltenheit ── */}
      <div className="ce-section-title mt">Deine Standard-Designs</div>
      <div className="ce-defaults">
        {state.cardStyles.all && (
          <div className="ce-default">
            <span>Alle Cards</span>
            <b>
              {themeById(state.cardStyles.all.themeId).emoji} {themeById(state.cardStyles.all.themeId).name}
            </b>
          </div>
        )}
        {RARITY_ORDER.map((r) => {
          const s = state.cardStyles.byRarity[r] ?? state.cardStyles.all;
          const t = themeById((s ?? FREE_STYLE).themeId);
          const locked = s && !unlockedThemes.has(s.themeId);
          return (
            <button key={r} className="ce-default" onClick={() => chooseRarity(r)} style={{ ['--rc' as string]: RARITY_META[r].color }}>
              <span>
                {RARITY_META[r].emoji} {RARITY_META[r].label}
              </span>
              <b>
                {t.emoji} {t.name}
                {locked && <span className="muted small"> · 🔒 noch gesperrt</span>}
              </b>
            </button>
          );
        })}
        {Object.keys(state.cardStyles.byModel).length > 0 && (
          <div className="ce-default">
            <span>Einzelne Cards</span>
            <b>{Object.keys(state.cardStyles.byModel).length} angepasst</b>
          </div>
        )}
      </div>
      <p className="muted small">Neue Cards bekommen automatisch das Design ihrer Seltenheit. Gesperrte Designs werden erst angezeigt, wenn du sie freigeschaltet hast.</p>

      <div className="submit-bar ce-save">
        {saved(target) && (
          <button className="btn btn--ghost" onClick={() => { resetCardStyle(target); showToast('Zurückgesetzt'); }}>
            Zurücksetzen
          </button>
        )}
        <button className="btn btn--primary grow" onClick={save} disabled={!unlockedThemes.has(style.themeId)}>
          {unlockedThemes.has(style.themeId) ? 'Als Standard speichern' : `🔒 ${theme.name} noch gesperrt`}
          <span className="ce-save__target">
            {target.kind === 'all' ? 'Alle Cards' : target.kind === 'rarity' ? `${RARITY_META[target.rarity].emoji} ${RARITY_META[target.rarity].label}` : 'Diese Card'}
          </span>
        </button>
      </div>
    </div>
  );
}

function LockBadge() {
  return (
    <span className="ce-tile__lock" aria-label="gesperrt">
      <Icon name="lock" size={14} />
    </span>
  );
}
