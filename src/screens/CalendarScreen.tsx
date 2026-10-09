import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppStore';
import { TopBar } from '../components/Layout';
import { SpotMedia } from '../components/SpotMedia';
import { Icon } from '../components/Icon';
import { EmptyState, ProBadge, RarityTag } from '../components/ui';
import { fullName, getBrand, getModel } from '../data/cars';
import { RARITY_META } from '../lib/rarity';
import { MONTHS, WEEKDAYS, dayKey, monthGrid, monthStats, spotsByDay, yearCounts } from '../lib/calendar';

/**
 * 📅 PERSONAL SPOTTING CALENDAR (SpotDrive Pro)
 * Monatskalender mit allen eigenen Spots, Monatsübersicht und Tagesdetails.
 * Nur für den Nutzer selbst sichtbar (enthält auch private Spots).
 * Direktlink: /calendar?d=2026-09-14
 */
export function CalendarScreen() {
  const { state, me } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = new Date();
  const initial = params.get('d') ? new Date(params.get('d') + 'T12:00:00') : today;
  const [ym, setYm] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
  const [selected, setSelected] = useState<string>(dayKey(initial));

  const byDay = useMemo(() => spotsByDay(state.spots, me.id), [state.spots, me.id]);
  const stats = useMemo(() => monthStats(byDay, ym.y, ym.m), [byDay, ym]);
  const weeks = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const year = useMemo(() => yearCounts(byDay, ym.y), [byDay, ym.y]);
  const maxDay = Math.max(1, ...[...byDay.entries()].filter(([k]) => k.startsWith(`${ym.y}-${String(ym.m + 1).padStart(2, '0')}`)).map(([, d]) => d.spots.length));
  const day = byDay.get(selected);

  const go = (delta: number) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const pick = (k: string) => {
    setSelected(k);
    setParams({ d: k }, { replace: true });
  };
  const goToday = () => {
    setYm({ y: today.getFullYear(), m: today.getMonth() });
    pick(dayKey(today));
  };

  // Wischen: links/rechts = nächster/vorheriger Monat
  const touch = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touch.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touch.current === null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touch.current = null;
  };

  const isFuture = (d: Date) => d.getTime() > today.getTime();
  const monthTitle = `${MONTHS[ym.m]} ${ym.y}`;

  const calendar = (
    <div className="cal" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="cal__nav">
        <button className="icon-btn" onClick={() => go(-1)} aria-label="Vorheriger Monat">
          <Icon name="chevronLeft" />
        </button>
        <h2 className="cal__title">{monthTitle.toUpperCase()}</h2>
        <button className="icon-btn" onClick={() => go(1)} aria-label="Nächster Monat">
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="cal__grid" role="grid" aria-label={monthTitle}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal__wd" role="columnheader">
            {w}
          </div>
        ))}
        {weeks.flat().map((d, i) => {
          if (!d) return <div key={`e${i}`} className="cal__cell cal__cell--empty" />;
          const k = dayKey(d);
          const info = byDay.get(k);
          const n = info?.spots.length ?? 0;
          const color = info ? RARITY_META[info.topRarity].color : undefined;
          return (
            <button
              key={k}
              role="gridcell"
              className={`cal__cell ${n ? 'cal__cell--spots' : ''} ${k === selected ? 'is-selected' : ''} ${k === dayKey(today) ? 'is-today' : ''} ${isFuture(d) ? 'is-future' : ''}`}
              style={n ? ({ ['--rc' as string]: color, ['--heat' as string]: String(0.12 + 0.3 * (n / maxDay)) } as React.CSSProperties) : undefined}
              onClick={() => pick(k)}
              aria-label={`${d.getDate()}. ${MONTHS[d.getMonth()]}: ${n ? `${n} Spot${n > 1 ? 's' : ''}` : 'keine Spots'}`}
            >
              <span className="cal__num">{d.getDate()}</span>
              {n > 0 && (
                <span className="cal__mark">
                  🚗{n > 1 && <b>{n}</b>}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="cal__legend">
        <span>🚗 Tag mit Spots</span>
        <span>
          <i style={{ background: RARITY_META.epic.color }} /> Farbe = seltenster Spot
        </span>
        {(ym.y !== today.getFullYear() || ym.m !== today.getMonth() || selected !== dayKey(today)) && (
          <button className="chip chip--btn" onClick={goToday}>
            Heute
          </button>
        )}
      </div>
    </div>
  );

  // ─── Free: Vorschau ────────────────────────────────────────────────────
  if (!me.isPro) {
    return (
      <div className="screen">
        <TopBar back title={<span className="row gap-s">📅 Kalender <ProBadge small /></span>} />
        <div className="ch-paywall">
          <div className="ch-paywall__preview" aria-hidden="true">
            {calendar}
          </div>
          <div className="ch-paywall__cta">
            <div className="ch-paywall__icon">📅</div>
            <div className="dream-pro__kicker">👑 SPOTDRIVE PRO</div>
            <h2>Personal Spotting Calendar</h2>
            <p className="muted">Alle deine Spots im Monatskalender – mit Monatsübersicht, Serien, seltensten Funden und jedem Spot pro Tag.</p>
            <button className="btn btn--primary btn--block btn--lg" onClick={() => navigate('/pro')}>
              <Icon name="crown" size={18} fill strokeWidth={0} /> SpotDrive Pro freischalten
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rarest = stats.rarest ? getModel(stats.rarest.modelId) : undefined;
  return (
    <div className="screen cal-screen">
      <TopBar
        back
        title={<span className="row gap-s">📅 Kalender <ProBadge small /></span>}
        right={
          <span className="chip chip--ghost">
            <Icon name="lock" size={12} /> Nur für dich
          </span>
        }
      />

      {/* 📊 Monatsübersicht */}
      <div className="cal-sum">
        <div className="cal-sum__head">
          <b>📅 {monthTitle}</b>
          {stats.deltaPrev !== 0 && (
            <span className={`chip ${stats.deltaPrev > 0 ? 'chip--on' : 'chip--ghost'}`}>
              {stats.deltaPrev > 0 ? '▲' : '▼'} {Math.abs(stats.deltaPrev)} ggü. Vormonat
            </span>
          )}
        </div>
        <div className="cal-sum__grid">
          <div>
            <b>📸 {stats.total}</b>
            <span>Spots</span>
          </div>
          <div>
            <b>⭐ {stats.newModels}</b>
            <span>Neue Modelle</span>
          </div>
          <div>
            <b>📆 {stats.activeDays}</b>
            <span>Spotting-Tage</span>
          </div>
          <div>
            <b>⚡ {stats.xp.toLocaleString('de-DE')}</b>
            <span>XP</span>
          </div>
          <div>
            <b>🔥 {stats.longestStreak}</b>
            <span>Längste Serie</span>
          </div>
          <div>
            <b>🏷️ {stats.topBrand ? getBrand(stats.topBrand.brandId).name : '–'}</b>
            <span>Top-Marke</span>
          </div>
        </div>
        {rarest && stats.rarest && (
          <Link to={`/spot/${stats.rarest.id}`} className="cal-sum__rare" style={{ ['--rc' as string]: RARITY_META[rarest.rarity].color }}>
            <span>💎 Seltenster Spot</span>
            <b>{fullName(rarest)}</b>
            <RarityTag rarity={rarest.rarity} />
          </Link>
        )}
      </div>

      {calendar}

      {/* Jahresleiste */}
      <div className="cal-year" aria-label={`Spots ${ym.y}`}>
        {year.map((n, i) => (
          <button key={i} className={`cal-year__m ${i === ym.m ? 'is-active' : ''}`} onClick={() => setYm({ y: ym.y, m: i })}>
            <span className="cal-year__bar" style={{ height: `${Math.min(100, (n / Math.max(1, ...year)) * 100)}%` }} />
            <span>{MONTHS[i].slice(0, 3)}</span>
          </button>
        ))}
      </div>

      {/* Tagesdetails */}
      <section className="cal-day">
        <h3>
          {new Date(selected + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>
        {day ? (
          <>
            <div className="muted small">
              📸 {day.spots.length} {day.spots.length === 1 ? 'Spot' : 'Spots'} · ⚡ +{day.xp} XP{day.newModels ? ` · ⭐ ${day.newModels} neu` : ''}
            </div>
            <div className="cal-day__list">
              {day.spots.map((s) => {
                const m = getModel(s.modelId);
                return (
                  <Link key={s.id} to={`/spot/${s.id}`} className="cal-spot">
                    <div className="cal-spot__media">
                      <SpotMedia spot={s} showCredit={false} />
                    </div>
                    <div className="cal-spot__info">
                      <span className="muted small">
                        🕐 {new Date(s.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        {!s.isPublic && ' · 🔒 privat'}
                      </span>
                      <b>{fullName(m)}</b>
                      <span className="muted small">📍 {s.location.areaLabel}</span>
                      <div className="row gap-s">
                        <RarityTag rarity={m.rarity} />
                        {s.wasNewModel && <span className="chip chip--new">Neu</span>}
                        <span className="timeline__xp">+{s.xpAwarded} XP</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            icon="calendar"
            title="Keine Spots an diesem Tag"
            text={selected === dayKey(today) ? 'Heute noch nichts gespottet – Zeit für eine Runde!' : undefined}
            action={
              selected === dayKey(today) ? (
                <Link to="/create" className="btn btn--primary">
                  <Icon name="camera" size={16} /> Spot erstellen
                </Link>
              ) : undefined
            }
          />
        )}
      </section>
    </div>
  );
}
