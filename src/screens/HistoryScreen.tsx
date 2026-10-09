import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ID, Rarity } from "../types/models";
import { useApp } from "../state/AppStore";
import { TopBar } from "../components/Layout";
import { SpotMedia } from "../components/SpotMedia";
import { EmptyState, ProBadge, RarityTag, Sheet, Stat } from "../components/ui";
import { CarCard } from "../components/CarCard";
import { spotCard } from "../lib/cards";
import { Icon } from "../components/Icon";
import { BRANDS, getBrand, getModel } from "../data/cars";
import { RARITY_META, RARITY_ORDER } from "../lib/rarity";
import {
  brandEmoji,
  filterHistory,
  groupByDay,
  historyStats,
  mySpots,
  type HistoryPeriod,
} from "../lib/history";

const PERIODS: { v: HistoryPeriod; label: string }[] = [
  { v: "all", label: "Alles" },
  { v: "today", label: "Heute" },
  { v: "week", label: "Diese Woche" },
  { v: "month", label: "Dieser Monat" },
  { v: "year", label: "Dieses Jahr" },
];

/**
 * Persönliche Spotting-History – nur für den eingeloggten Nutzer.
 * Enthält auch private Spots und eigene Ortsnamen; andere Nutzer haben keinen Zugang
 * (es gibt keine Route /user/:id/history).
 */
export function HistoryScreen() {
  const { state, me } = useApp();
  const [period, setPeriod] = useState<HistoryPeriod>("all");
  const [brandId, setBrandId] = useState<ID | "">("");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [view, setView] = useState<"timeline" | "cards">("timeline");
  const [openSpot, setOpenSpot] = useState<ID | null>(null);

  const all = useMemo(() => mySpots(state.spots, me.id), [state.spots, me.id]);
  const list = useMemo(
    () =>
      filterHistory(state.spots, me.id, {
        period,
        brandId: brandId || undefined,
        rarity: rarity || undefined,
      }),
    [state.spots, me.id, period, brandId, rarity],
  );
  const stats = useMemo(() => historyStats(list), [list]);
  const openCard = useMemo(() => {
    const sp = openSpot
      ? state.spots.find((x) => x.id === openSpot)
      : undefined;
    return sp ? spotCard(sp, state.spots, me.id) : null;
  }, [openSpot, state.spots, me.id]);
  const days = groupByDay(list);
  const brands = useMemo(() => {
    const ids = new Set(all.map((s) => getModel(s.modelId).brandId));
    return BRANDS.filter((b) => ids.has(b.id)).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [all]);

  return (
    <div className="screen">
      <TopBar
        back
        title="Spotting-History"
        right={
          <span className="chip chip--ghost">
            <Icon name="lock" size={12} /> Nur für dich
          </span>
        }
      />

      <div className="chip-row">
        {PERIODS.map((p) => (
          <button
            key={p.v}
            className={`chip chip--btn ${period === p.v ? "chip--on" : ""}`}
            onClick={() => setPeriod(p.v)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="history-filters">
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          aria-label="Marke"
        >
          <option value="">Alle Marken</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={rarity}
          onChange={(e) => setRarity(e.target.value as Rarity | "")}
          aria-label="Seltenheit"
        >
          <option value="">Alle Seltenheiten</option>
          {RARITY_ORDER.map((r) => (
            <option key={r} value={r}>
              {RARITY_META[r].emoji} {RARITY_META[r].label}
            </option>
          ))}
        </select>
      </div>

      {/* Statistiken */}
      <div className="stats-grid">
        <Stat value={stats.total} label="Spots" />
        <Stat value={stats.distinctModels} label="Modelle" />
        <Stat value={`🔥 ${stats.longestStreak}`} label="Längste Serie" />
        <Stat value={`+${stats.xp.toLocaleString("de-DE")}`} label="XP" />
      </div>
      <div className="history-highlights">
        <div className="card">
          <div className="eyebrow">Meistgespottete Marke</div>
          {stats.topBrand ? (
            <b>
              {brandEmoji(stats.topBrand.brandId)}{" "}
              {getBrand(stats.topBrand.brandId).name} · {stats.topBrand.count}×
            </b>
          ) : (
            <span className="muted">–</span>
          )}
          <div className="muted small mt-s">
            Aktuelle Serie: {stats.currentStreak}{" "}
            {stats.currentStreak === 1 ? "Tag" : "Tage"}
          </div>
        </div>
        <div className="card">
          <div className="eyebrow">Seltenste Spots</div>
          {stats.rarest.map((s) => {
            const m = getModel(s.modelId);
            return (
              <Link key={s.id} to={`/spot/${s.id}`} className="history-rare">
                <span>
                  {getBrand(m.brandId).name} {m.name}
                </span>
                <RarityTag rarity={m.rarity} />
              </Link>
            );
          })}
          {!stats.rarest.length && <span className="muted">–</span>}
        </div>
      </div>

      <Link to="/calendar" className="btn btn--outline btn--block mt">
        📅 Kalender-Ansicht {!me.isPro && <ProBadge small />}
      </Link>

      {/* Ansicht: Timeline oder Spot Cards */}
      <div className="segmented segmented--tight mt">
        <button
          className={view === "timeline" ? "on" : ""}
          onClick={() => setView("timeline")}
        >
          Timeline
        </button>
        <button
          className={view === "cards" ? "on" : ""}
          onClick={() => setView("cards")}
        >
          🃏 Spot Cards
        </button>
      </div>

      {view === "cards" && (
        <>
          <div className="history-cards">
            {list.map((s) => (
              <CarCard
                key={s.id}
                card={spotCard(s, state.spots, me.id)}
                onClick={() => setOpenSpot(s.id)}
              />
            ))}
          </div>
          {!list.length && (
            <EmptyState
              icon="calendar"
              title="Keine Spots im Zeitraum"
              text="Ändere die Filter oder geh spotten."
            />
          )}
          <Sheet
            open={!!openCard}
            onClose={() => setOpenSpot(null)}
            title="Spot Card"
          >
            {openCard && (
              <div className="card-detail">
                <CarCard card={openCard} size="lg" viewerId={me.id} />
                <div className="row gap-s mt">
                  <Link
                    className="btn btn--outline grow"
                    to={`/spot/${openSpot}`}
                  >
                    Spot ansehen
                  </Link>
                  <Link
                    className="btn btn--outline grow"
                    to={`/cards/editor?model=${encodeURIComponent(openCard.model.id)}`}
                  >
                    🎨 Design {!me.isPro && <ProBadge small />}
                  </Link>
                </div>
              </div>
            )}
          </Sheet>
        </>
      )}

      {/* Timeline */}
      {view === "timeline" && (
        <div className="timeline">
          {days.map((d) => (
            <section key={d.day} className="timeline__day">
              <h3 className="timeline__date">
                {d.date.toLocaleDateString("de-DE", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
                <span className="muted small">
                  {" "}
                  · {d.spots.length} {d.spots.length === 1 ? "Spot" : "Spots"}
                </span>
              </h3>
              {d.spots.map((s) => {
                const m = getModel(s.modelId);
                return (
                  <Link
                    key={s.id}
                    to={`/spot/${s.id}`}
                    className={`timeline__item timeline__item--${m.rarity}`}
                  >
                    <span
                      className="timeline__dot"
                      style={{
                        ["--rc" as string]: RARITY_META[m.rarity].color,
                      }}
                    />
                    <div className="timeline__media">
                      <SpotMedia spot={s} showCredit={false} />
                    </div>
                    <div className="timeline__info">
                      <div className="timeline__time">
                        {new Date(s.createdAt).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {!s.isPublic && (
                          <span className="chip chip--ghost">
                            <Icon name="lock" size={10} /> privat
                          </span>
                        )}
                      </div>
                      <b>
                        {brandEmoji(m.brandId)} {getBrand(m.brandId).name}{" "}
                        {m.name}
                      </b>
                      <span className="muted small">
                        <Icon name="pin" size={12} /> {s.location.areaLabel}
                      </span>
                      <div className="row gap-s">
                        <RarityTag rarity={m.rarity} />
                        <span className="timeline__xp">+{s.xpAwarded} XP</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </section>
          ))}
          {!list.length && (
            <EmptyState
              icon="calendar"
              title="Keine Spots im Zeitraum"
              text="Ändere die Filter oder geh spotten."
            />
          )}
        </div>
      )}
    </div>
  );
}
