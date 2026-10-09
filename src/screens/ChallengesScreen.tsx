import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChallengeMeasure, ChallengeRule, Rarity } from '../types/models';
import { useApp } from '../state/AppStore';
import { ChallengeCard, CommunityCard } from '../components/Progress';
import { EmptyState, ProBadge } from '../components/ui';
import { Icon } from '../components/Icon';
import { COMMUNITY_CHALLENGES, CHALLENGE_RARITY, STREAK_REWARDS } from '../data/challenges';
import { challengeStreak, communityProgress, dailyChallenges, personalActive, progressOf, weeklyChallenges, dayStart, weekStart } from '../lib/challenges';
import { BRANDS } from '../data/cars';
import { RARITY_META, RARITY_ORDER } from '../lib/rarity';

type Tab = 'today' | 'week' | 'mine' | 'community' | 'done';
const TABS: { v: Tab; label: string }[] = [
  { v: 'today', label: '🔥 Heute' },
  { v: 'week', label: '📅 Diese Woche' },
  { v: 'mine', label: '👤 Meine' },
  { v: 'community', label: '🌍 Community' },
  { v: 'done', label: '✅ Abgeschlossen' },
];

/** Challenge-Seite (SpotDrive Pro). */
export function ChallengesScreen() {
  const { state, me, removePersonalChallenge } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('today');
  const [creating, setCreating] = useState(false);
  const c = state.challengeCompletions;

  const daily = useMemo(() => dailyChallenges().map((a) => progressOf(a, state.spots, me.id, c)), [state.spots, me.id, c]);
  const weekly = useMemo(() => weeklyChallenges().map((a) => progressOf(a, state.spots, me.id, c)), [state.spots, me.id, c]);
  const personal = useMemo(() => state.personalChallenges.map((p) => progressOf(personalActive(p), state.spots, me.id, c)), [state.personalChallenges, state.spots, me.id, c]);
  const community = useMemo(() => COMMUNITY_CHALLENGES.map((x) => communityProgress(x, state.spots, me.id)), [state.spots, me.id]);
  const streak = challengeStreak(c);
  const nextStreak = STREAK_REWARDS.find((s) => s.days > streak);
  const openCount = [...daily, ...weekly].filter((p) => !p.completed).length;

  if (!me.isPro) {
    return (
      <div className="screen">
        <header className="ch-head">
          <h1>Challenges</h1>
          <span className="chip chip--ghost">{daily[0].completed ? '✅ Heute geschafft' : '1 offen'}</span>
        </header>
        <div className="ch-free">
          <div className="ch-free__head">
            <b>🎁 Deine Gratis-Daily</b>
            <span className="muted small">Jeden Tag neu – für alle</span>
          </div>
          <ChallengeCard p={daily[0]} />
        </div>
        <div className="ch-section-title">
          Mehr Challenges <ProBadge small />
        </div>
        <div className="ch-paywall">
          <div className="ch-paywall__preview" aria-hidden="true">
            {[...daily.slice(1, 3), ...weekly.slice(-1)].map((p) => (
              <ChallengeCard key={p.active.key} p={p} />
            ))}
          </div>
          <div className="ch-paywall__cta">
            <div className="ch-paywall__icon">🏁</div>
            <h2>Alle Challenges mit Pro</h2>
            <p className="muted">Alle 3 Dailys, wöchentliche Challenges, eigene Ziele, Community-Challenges, legendäre Challenges, Streaks, exklusive Badges, Titel, Garage-Deko und Car-Card-Designs.</p>
            <button className="btn btn--primary btn--block btn--lg" onClick={() => navigate('/pro')}>
              <Icon name="crown" size={18} fill strokeWidth={0} /> SpotDrive Pro freischalten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="ch-head">
        <h1>Challenges</h1>
        <span className="chip chip--ghost">{openCount} offen</span>
      </header>

      <div className={`ch-streak ${streak ? 'ch-streak--on' : ''}`}>
        <span className="ch-streak__flame">🔥</span>
        <div>
          <b>{streak ? `${streak}-Tage-Challenge-Streak` : 'Noch keine Streak'}</b>
          <div className="muted small">
            {nextStreak ? `Noch ${nextStreak.days - streak} ${nextStreak.days - streak === 1 ? 'Tag' : 'Tage'} bis +${nextStreak.xp} XP${nextStreak.badge ? ` & ${nextStreak.badge.icon} ${nextStreak.badge.name}` : ''}` : 'Maximale Streak-Stufe!'}
          </div>
        </div>
      </div>

      <div className="chip-row ch-tabs">
        {TABS.map((t) => (
          <button key={t.v} className={`chip chip--btn ${tab === t.v ? 'chip--on' : ''}`} onClick={() => setTab(t.v)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="stack">
        {tab === 'today' && daily.map((p) => <ChallengeCard key={p.active.key} p={p} />)}
        {tab === 'week' && weekly.map((p) => <ChallengeCard key={p.active.key} p={p} />)}
        {tab === 'mine' && (
          <>
            <button className="custom-cta" onClick={() => setCreating(true)}>
              <Icon name="plus" size={18} />
              <span>
                <b>Eigene Challenge erstellen</b>
                <small>z. B. „10 Ferrari sammeln“ oder „20 Spots diese Woche“</small>
              </span>
            </button>
            {creating && <PersonalForm onDone={() => setCreating(false)} />}
            {personal.map((p) => (
              <ChallengeCard key={p.active.key} p={p} onDelete={() => removePersonalChallenge(p.active.def.id)} />
            ))}
            {!personal.length && !creating && <EmptyState icon="target" title="Noch keine eigenen Ziele" text="Setz dir ein Ziel – der Fortschritt wird automatisch gezählt." />}
          </>
        )}
        {tab === 'community' && community.map((x) => <CommunityCard key={x.def.id} c={x} joined={state.communityJoined.includes(x.def.id)} />)}
        {tab === 'done' && <DoneList />}
      </div>
    </div>
  );
}

function DoneList() {
  const { state } = useApp();
  const list = [...state.challengeCompletions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const u = state.unlocks;
  return (
    <>
      {(u.badges.length > 0 || u.titles.length > 0) && (
        <div className="card ch-trophies">
          <div className="eyebrow">Deine Challenge-Trophäen</div>
          <div className="row gap-s">
            {u.badges.map((b) => (
              <span key={b.id} className="chip">
                {b.icon} {b.name}
              </span>
            ))}
            {u.titles.map((t) => (
              <span key={t} className="chip chip--ghost">
                🏷️ {t}
              </span>
            ))}
          </div>
        </div>
      )}
      {list.map((c) => (
        <div key={c.key} className="ch-done-row" style={{ ['--cr' as string]: CHALLENGE_RARITY[c.rarity].color }}>
          <span className="ch-done-row__dot" />
          <div>
            <b>{c.title}</b>
            <div className="muted small">
              {new Date(c.completedAt).toLocaleDateString('de-DE')} · {CHALLENGE_RARITY[c.rarity].label} · {c.scope === 'daily' ? 'Daily' : c.scope === 'weekly' ? 'Weekly' : c.scope === 'personal' ? 'Eigene' : 'Community'}
            </div>
          </div>
          <span className="timeline__xp">+{c.xp} XP</span>
        </div>
      ))}
      {!list.length && <EmptyState icon="trophy" title="Noch nichts abgeschlossen" />}
    </>
  );
}

type Goal = 'spots' | 'models' | 'brand' | 'brands' | 'rarity';
type Span = 'today' | 'week' | 'month' | '30d';

function PersonalForm({ onDone }: { onDone: () => void }) {
  const { addPersonalChallenge } = useApp();
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState<Goal>('brand');
  const [brandId, setBrandId] = useState('ferrari');
  const [rarity, setRarity] = useState<Rarity>('rare');
  const [count, setCount] = useState(10);
  const [span, setSpan] = useState<Span>('month');
  const [desc, setDesc] = useState('');

  const measure: ChallengeMeasure = goal === 'spots' ? 'spots' : goal === 'brands' ? 'distinct_brands' : 'distinct_models';
  const rule: ChallengeRule = {
    measure,
    count,
    filter: goal === 'brand' ? { brandIds: [brandId] } : goal === 'rarity' ? { minRarity: rarity } : undefined,
  };
  const now = new Date();
  const range = (): [Date, Date] => {
    if (span === 'today') return [dayStart(now), new Date(dayStart(now).getTime() + 86400000)];
    if (span === 'week') return [weekStart(now), new Date(weekStart(now).getTime() + 7 * 86400000)];
    if (span === 'month') return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)];
    return [now, new Date(now.getTime() + 30 * 86400000)];
  };

  return (
    <form
      className="card ch-form"
      onSubmit={(e) => {
        e.preventDefault();
        const [a, b] = range();
        addPersonalChallenge({ title: title.trim() || 'Mein Ziel', description: desc.trim() || undefined, rule, startsAt: a.toISOString(), endsAt: b.toISOString() });
        onDone();
      }}
    >
      <label className="field">
        <span>Name der Challenge</span>
        <input id="pc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Ferrari-Monat" maxLength={40} />
      </label>
      <label className="field">
        <span>Ziel</span>
        <select id="pc-goal" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
          <option value="brand">Modelle einer Marke sammeln</option>
          <option value="models">Verschiedene Modelle finden</option>
          <option value="brands">Verschiedene Marken finden</option>
          <option value="rarity">Seltene Autos finden</option>
          <option value="spots">Spots erstellen</option>
        </select>
      </label>
      {goal === 'brand' && (
        <label className="field">
          <span>Marke</span>
          <select id="pc-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            {[...BRANDS].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {goal === 'rarity' && (
        <label className="field">
          <span>Mindestens</span>
          <select id="pc-rarity" value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)}>
            {RARITY_ORDER.slice(1).map((r) => (
              <option key={r} value={r}>
                {RARITY_META[r].emoji} {RARITY_META[r].label}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="ch-form__row">
        <label className="field">
          <span>Anzahl</span>
          <input id="pc-count" type="number" min={1} max={500} value={count} onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} />
        </label>
        <label className="field">
          <span>Zeitraum</span>
          <select id="pc-span" value={span} onChange={(e) => setSpan(e.target.value as Span)}>
            <option value="today">Heute</option>
            <option value="week">Diese Woche</option>
            <option value="month">Dieser Monat</option>
            <option value="30d">Nächste 30 Tage</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Beschreibung (optional)</span>
        <input id="pc-desc" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={80} />
      </label>
      <div className="row gap-s">
        <button type="button" className="btn btn--ghost grow" onClick={onDone}>
          Abbrechen
        </button>
        <button className="btn btn--primary grow">Challenge starten</button>
      </div>
      <p className="muted small">Eigene Challenges geben 25–250 XP (10 XP pro Ziel-Einheit) – damit sich Mini-Ziele nicht zum XP-Farmen eignen.</p>
    </form>
  );
}
