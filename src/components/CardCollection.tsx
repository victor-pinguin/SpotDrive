import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ID } from '../types/models';
import { useApp } from '../state/AppStore';
import { carCards, filterCards, type CardFilter, type CardPeriod, type CardSort } from '../lib/cards';
import { BRANDS, getBrand } from '../data/cars';
import { RARITY_META, RARITY_ORDER } from '../lib/rarity';
import { CarCard } from './CarCard';
import { ShareCardButton } from './ShareCardButton';
import { EmptyState, ProBadge, Sheet } from './ui';
import { Icon } from './Icon';

const SORTS: { v: CardSort; label: string }[] = [
  { v: 'newest', label: 'Neueste zuerst' },
  { v: 'oldest', label: 'Älteste zuerst' },
  { v: 'rarity', label: 'Seltenheit' },
  { v: 'brand', label: 'Marke A–Z' },
  { v: 'count', label: 'Meist gespottet' },
];
const PERIODS: { v: CardPeriod; label: string }[] = [
  { v: 'all', label: 'Immer' },
  { v: 'week', label: 'Diese Woche' },
  { v: 'month', label: 'Dieser Monat' },
  { v: 'year', label: 'Dieses Jahr' },
];

/** Karten-Album: alle Car Cards mit Sortierung und Filtern. */
export function CardCollection() {
  const { state, me, toggleFavorite, updateGarage, showToast } = useApp();
  const navigate = useNavigate();
  const [f, setF] = useState<CardFilter>({ period: 'all', status: 'collected', sort: 'newest' });
  const [open, setOpen] = useState<ID | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const all = useMemo(() => carCards(state.spots, me.id), [state.spots, me.id]);
  const cards = useMemo(() => filterCards(state.spots, me.id, f), [state.spots, me.id, f]);
  const myBrands = useMemo(() => {
    const ids = new Set(all.map((c) => c.model.brandId));
    return BRANDS.filter((b) => ids.has(b.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);
  const brandOptions = f.status === 'missing' ? [...BRANDS].sort((a, b) => a.name.localeCompare(b.name)) : myBrands;
  const active = [f.brandId, f.rarity, f.model, f.period !== 'all' ? f.period : ''].filter(Boolean).length;
  const set = (patch: Partial<CardFilter>) => setF((x) => ({ ...x, ...patch }));
  const detail = open ? (all.find((c) => c.model.id === open) ?? cards.find((c) => c.model.id === open)) : null;

  return (
    <div className="album">
      <div className="album__bar">
        <div className="segmented segmented--tight">
          <button className={f.status === 'collected' ? 'on' : ''} onClick={() => set({ status: 'collected' })}>
            Gesammelt · {all.length}
          </button>
          <button className={f.status === 'missing' ? 'on' : ''} onClick={() => set({ status: 'missing' })}>
            Noch nicht gesammelt
          </button>
        </div>
        <div className="album__tools">
          <select value={f.sort} onChange={(e) => set({ sort: e.target.value as CardSort })} aria-label="Sortieren">
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="row gap-s">
            <button className="chip chip--btn album__design-btn" onClick={() => navigate('/cards/editor')}>
              🎨 Design <ProBadge small />
            </button>
            <button className={`chip chip--btn ${showFilters || active ? 'chip--on' : ''}`} onClick={() => setShowFilters((v) => !v)}>
              <Icon name="filter" size={14} /> Filter{active ? ` (${active})` : ''}
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="album__filters">
          <label className="field">
            <span>Marke</span>
            <select value={f.brandId ?? ''} onChange={(e) => set({ brandId: e.target.value || undefined })}>
              <option value="">Alle Marken</option>
              {brandOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Modell</span>
            <input value={f.model ?? ''} onChange={(e) => set({ model: e.target.value })} placeholder="z. B. GT3" />
          </label>
          <label className="field">
            <span>Seltenheit</span>
            <select value={f.rarity ?? ''} onChange={(e) => set({ rarity: (e.target.value || undefined) as CardFilter['rarity'] })}>
              <option value="">Alle</option>
              {RARITY_ORDER.map((r) => (
                <option key={r} value={r}>
                  {RARITY_META[r].emoji} {RARITY_META[r].label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Datum (erster Spot)</span>
            <select value={f.period} onChange={(e) => set({ period: e.target.value as CardPeriod })} disabled={f.status === 'missing'}>
              {PERIODS.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {active > 0 && (
            <button className="link-btn" onClick={() => setF({ period: 'all', status: f.status, sort: f.sort })}>
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {f.status === 'missing' && !f.brandId && <p className="muted small">Ohne Marken-Filter zeigen wir die Top-Supercars. Wähle eine Marke für alle ihre Modelle.</p>}

      <div className="card-grid">
        {cards.slice(0, 120).map((c) => (
          <CarCard key={c.model.id} card={c} onClick={() => setOpen(c.model.id)} />
        ))}
      </div>
      {!cards.length && (
        <EmptyState icon="grid" title={f.status === 'collected' ? 'Keine Karten gefunden' : 'Alles gesammelt! 🏆'} text={f.status === 'collected' ? 'Ändere die Filter oder spotte neue Autos.' : undefined} />
      )}

      <Sheet open={!!detail} onClose={() => setOpen(null)} title="Car Card">
        {detail && (
          <div className="card-detail">
            <CarCard card={detail} size="lg" viewerId={me.id} />
            {detail.collected ? (
              <div className="row gap-s mt">
                <button className={`btn grow ${me.favoriteModelIds.includes(detail.model.id) ? 'btn--primary' : 'btn--outline'}`} onClick={() => toggleFavorite(detail.model.id)}>
                  <Icon name="star" size={16} fill={me.favoriteModelIds.includes(detail.model.id)} /> Favorit
                </button>
                <button
                  className="btn btn--outline grow"
                  onClick={() => {
                    const rest = state.garage.slotModelIds.filter((x) => x !== detail.model.id);
                    updateGarage({ slotModelIds: [detail.model.id, ...rest] });
                    showToast(`${detail.model.name} steht jetzt auf der Drehbühne`);
                  }}
                >
                  <Icon name="arrowUp" size={16} /> Drehbühne
                </button>
                {detail.firstSpot && (
                  <button className="btn btn--ghost grow" onClick={() => navigate(`/spot/${detail.lastSpot!.id}`)}>
                    Spot ansehen
                  </button>
                )}
                <ShareCardButton card={detail} />
                <button className="btn btn--outline btn--block" onClick={() => navigate(`/cards/editor?model=${encodeURIComponent(detail.model.id)}`)}>
                  🎨 Card-Design anpassen {!me.isPro && <ProBadge small />}
                </button>
              </div>
            ) : (
              <button className="btn btn--primary btn--block mt" onClick={() => navigate('/create')}>
                <Icon name="camera" size={16} /> {getBrand(detail.model.brandId).name} {detail.model.name} jagen
              </button>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
