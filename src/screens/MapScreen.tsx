import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Spot } from '../types/models';
import { useApp } from '../state/AppStore';
import { MapStyleSwitch, SpotMap, useMapStyle, type MapSpot } from '../components/MapViews';
import { BRANDS, getBrand, getModel } from '../data/cars';
import { publicLocation, visibleLocation } from '../lib/location';
import { atLeast } from '../lib/rarity';
import { Icon } from '../components/Icon';
import { getCurrentPosition } from '../services/device';
import { ProBadge, RarityTag, timeAgo } from '../components/ui';
import { SpotMedia } from '../components/SpotMedia';

type Filter = 'all' | 'other' | 'rare' | string;
const FEATURED = BRANDS.filter((b) => b.featured);

export function MapScreen() {
  const { state, me } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [recent, setRecent] = useState(false);
  const [selected, setSelected] = useState<Spot | null>(null);
  const [style, setStyle] = useMapStyle();
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // TODO(backend): GET /map/spots?bbox=… – der Server liefert NUR öffentliche,
  // bereits vergröberte Positionen (siehe lib/location.ts → publicLocation).
  const items: MapSpot[] = useMemo(() => {
    return state.spots
      .filter((s) => s.isPublic || s.userId === me.id)
      .filter((s) => {
        const m = getModel(s.modelId);
        if (filter === 'all') return true;
        if (filter === 'rare') return atLeast(m.rarity, 'rare');
        if (filter === 'other') return !FEATURED.some((b) => b.id === m.brandId);
        return m.brandId === filter;
      })
      .filter((s) => !recent || Date.now() - new Date(s.createdAt).getTime() < 86400_000)
      .map((spot) => ({ spot, loc: spot.userId === me.id ? visibleLocation(spot, me.id) : publicLocation(spot.location) }))
      .filter((x) => x.loc.point);
  }, [state.spots, filter, recent, me.id]);

  const center = useMemo(() => {
    if (selected) {
      const l = items.find((i) => i.spot.id === selected.id)?.loc.point;
      if (l) return l;
    }
    return focus ?? { lat: 25, lng: 20 }; // Weltansicht
  }, [selected, items, focus]);

  const chips: { id: Filter; label: string; color?: string }[] = [
    { id: 'all', label: 'Alle' },
    ...FEATURED.map((b) => ({ id: b.id, label: b.name, color: b.color })),
    { id: 'other', label: 'Andere Marken' },
    { id: 'rare', label: '✦ Selten' },
  ];

  const sel = selected ? { model: getModel(selected.modelId) } : null;
  const selLoc = selected ? visibleLocation(selected, me.id) : null;

  return (
    <div className="map-screen">
      <SpotMap items={items} center={center} zoom={selected ? 12 : focus ? 10 : 1} style={style} selectedId={selected?.id} onSelect={setSelected} />

      <div className="map-top">
        <div className="map-top__bar">
          <div className="map-top__title">
            <Icon name="map" size={18} /> Karte
            <span className="chip chip--ghost">{items.length} Spots</span>
          </div>
          <button className="chip chip--btn" onClick={() => navigate('/dream?tab=map')} title="Dream-Car-Map" aria-label="Dream-Car-Map">
            ❤️ {!me.isPro && <ProBadge small />}
          </button>
          <button
            className={`chip chip--btn ${recent ? 'chip--on' : ''}`}
            onClick={() => (me.isPro ? setRecent((r) => !r) : navigate('/pro'))}
            title="Erweiterter Filter"
          >
            Letzte 24 h {!me.isPro && <ProBadge small />}
          </button>
        </div>
        <div className="chip-row">
          {chips.map((c) => (
            <button key={c.id} className={`chip chip--btn ${filter === c.id ? 'chip--on' : ''}`} onClick={() => { setFilter(c.id); setSelected(null); }}>
              {c.color && <span className="brand-dot brand-dot--sm" style={{ background: c.color }} />}
              {c.label}
            </button>
          ))}
        </div>
        <div className="map-top__row">
          <MapStyleSwitch value={style} onChange={setStyle} />
          <button className={`chip chip--btn ${!focus ? 'chip--on' : ''}`} onClick={() => { setFocus(null); setSelected(null); }}>
            🌍 Weltweit
          </button>
          <button
            className={`chip chip--btn ${focus ? 'chip--on' : ''}`}
            disabled={locating}
            onClick={async () => {
              setLocating(true);
              try {
                setFocus(await getCurrentPosition());
                setSelected(null);
              } catch {
                /* GPS verweigert – Weltansicht bleibt */
              } finally {
                setLocating(false);
              }
            }}
          >
            <Icon name="gps" size={14} /> Nähe
          </button>
        </div>
      </div>

      <div className="map-privacy">
        <Icon name="lock" size={13} /> Standorte anderer Nutzer werden nur als ungefährer Bereich angezeigt.
      </div>

      {selected && sel && selLoc && (
        <div className="map-card" key={selected.id}>
          <button className="icon-btn icon-btn--float" onClick={() => setSelected(null)} aria-label="Schließen">
            <Icon name="x" size={18} />
          </button>
          <Link to={`/spot/${selected.id}`} className="map-card__inner">
            <div className="map-card__media">
              <SpotMedia spot={selected} />
            </div>
            <div className="map-card__info">
              <div className="eyebrow">{getBrand(sel.model.brandId).name}</div>
              <b>{sel.model.name}</b>
              <RarityTag rarity={sel.model.rarity} />
              <div className="muted small">
                <Icon name="pin" size={12} /> {selLoc.areaLabel} {selLoc.radiusM > 0 && '(Bereich)'} · {timeAgo(selected.createdAt)}
              </div>
            </div>
            <Icon name="chevronRight" />
          </Link>
        </div>
      )}
    </div>
  );
}
