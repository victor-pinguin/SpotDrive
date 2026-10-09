import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GarageItemCategory, ID } from '../types/models';
import { useApp, useUserStats } from '../state/AppStore';
import { GarageScene } from '../components/GarageScene';
import { CATEGORY_LABELS, itemsByCategory } from '../data/garageItems';
import { garageTier, nextGarageTier } from '../lib/xp';
import { brandCollections, rarestModel } from '../lib/collection';
import { getBrand, getModel } from '../data/cars';
import { CarPhoto } from '../components/CarPhoto';
import { CardCollection } from '../components/CardCollection';
import { RARITY_ORDER } from '../lib/rarity';
import { EmptyState, ProBadge, RarityTag, Sheet, Stat, XpBar, fmt } from '../components/ui';
import { Icon } from '../components/Icon';

type Tab = 'collection' | 'favorites' | 'design';
const CATEGORIES: GarageItemCategory[] = ['floor', 'wall', 'lighting', 'background', 'decoration'];

export function GarageScreen() {
  const { state, me, updateGarage, toggleFavorite, showToast } = useApp();
  const { level, modelCount, brandCount } = useUserStats(me.id);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('collection');
  const [cat, setCat] = useState<GarageItemCategory>('floor');
  const [slotSheet, setSlotSheet] = useState<number | null>(null);
  const [modelSheet, setModelSheet] = useState<ID | null>(null);

  const tier = garageTier(level.level);
  const next = nextGarageTier(level.level);
  const collections = useMemo(() => brandCollections(state.spots, me.id), [state.spots, me.id]);
  const rarest = rarestModel(state.spots, me.id);
  const collectedIds = collections.flatMap((c) => c.models.map((m) => m.model.id));
  const g = state.garage;

  /**
   * Garage = ALLE gesammelten Autos (keine Platzbegrenzung), jedes Modell genau einmal.
   * Gespeichert wird nur die Reihenfolge; neue Modelle werden hinten angehängt.
   */
  const order = useMemo(() => {
    const have = new Set(collectedIds);
    const kept = g.slotModelIds.filter((id, i, arr) => id && have.has(id) && arr.indexOf(id) === i);
    return [...kept, ...collectedIds.filter((id) => !kept.includes(id))];
  }, [g.slotModelIds, collectedIds]);

  /** Modell an Position `index` stellen; das dortige Auto tauscht den Platz. */
  const placeModel = (index: number, modelId: ID) => {
    const slots = [...order];
    const from = slots.indexOf(modelId);
    if (from >= 0) slots[from] = slots[index];
    slots[index] = modelId;
    updateGarage({ slotModelIds: slots });
  };

  const selectItem = (id: ID, locked: 'level' | 'pro' | 'challenge' | null, unlockLevel: number) => {
    if (locked === 'challenge') return showToast('Nur als Challenge-Belohnung erhältlich');
    if (locked === 'pro') return navigate('/pro');
    if (locked === 'level') return showToast(`Wird ab Level ${unlockLevel} freigeschaltet`);
    if (cat === 'floor') updateGarage({ floorId: id });
    if (cat === 'wall') updateGarage({ wallId: id });
    if (cat === 'lighting') updateGarage({ lightingId: id });
    if (cat === 'background') updateGarage({ backgroundId: id });
    if (cat === 'decoration')
      updateGarage({ decorationIds: g.decorationIds.includes(id) ? g.decorationIds.filter((d) => d !== id) : [...g.decorationIds, id] });
  };

  const activeId = { floor: g.floorId, wall: g.wallId, lighting: g.lightingId, background: g.backgroundId, decoration: '' }[cat];

  return (
    <div className="screen">
      <header className="garage-head">
        <div>
          <div className="eyebrow">@{me.username}</div>
          <h1>{tier.name}</h1>
        </div>
        <div className="garage-head__tier">
          <Icon name="garage" size={16} /> {order.length} {order.length === 1 ? 'Auto' : 'Autos'}
        </div>
      </header>

      <GarageScene config={{ ...g, slotModelIds: order }} slots={Math.max(1, order.length)} spots={state.spots} userId={me.id} onSlotClick={(i) => setSlotSheet(i)} />
      <p className="muted small center">Unbegrenzt Platz – jedes Modell steht einmal in deiner Garage. Tippe auf ein Auto, um die Reihenfolge zu ändern.</p>

      <div className="card">
        <XpBar level={level} />
        {next && (
          <div className="muted small mt-s">
            Nächstes Garage-Upgrade: <b>{next.name}</b> ab Level {next.minLevel}
          </div>
        )}
      </div>

      <div className="stats-grid">
        <Stat value={modelCount} label="Modelle" />
        <Stat value={brandCount} label="Marken" />
        <Stat value={fmt(me.xp)} label="XP" />
        <Stat value={level.level} label="Garage-Level" />
      </div>

      {rarest && (
        <button className="rarest" onClick={() => setModelSheet(rarest.id)} style={{ ['--brand' as string]: getBrand(rarest.brandId).color }}>
          <div className="rarest__label">
            <Icon name="trophy" size={16} /> Seltenstes Auto
          </div>
          <div className="rarest__row">
            <CarPhoto modelId={rarest.id} spots={state.spots} userId={me.id} className="rarest__art" width={500} />
            <div>
              <div className="eyebrow">{getBrand(rarest.brandId).name}</div>
              <b>{rarest.name}</b>
              <div>
                <RarityTag rarity={rarest.rarity} />
              </div>
            </div>
          </div>
        </button>
      )}

      <div className="segmented">
        <button className={tab === 'collection' ? 'on' : ''} onClick={() => setTab('collection')}>
          🃏 Car Cards
        </button>
        <button className={tab === 'favorites' ? 'on' : ''} onClick={() => setTab('favorites')}>
          Favoriten
        </button>
        <button className={tab === 'design' ? 'on' : ''} onClick={() => setTab('design')}>
          <Icon name="brush" size={15} /> Gestalten
        </button>
      </div>

      {tab === 'collection' && (
        <div className="collection">
          <div className="rarity-legend">
            {RARITY_ORDER.map((r) => (
              <RarityTag key={r} rarity={r} />
            ))}
          </div>
          <CardCollection />
        </div>
      )}

      {tab === 'favorites' && (
        <div className="fav-grid">
          {me.favoriteModelIds.map((id) => {
            const m = getModel(id);
            return (
              <button key={id} className="fav-card" onClick={() => setModelSheet(id)} style={{ ['--brand' as string]: getBrand(m.brandId).color }}>
                <CarPhoto modelId={m.id} spots={state.spots} userId={me.id} width={500} />
                <div className="eyebrow">{getBrand(m.brandId).name}</div>
                <b>{m.name}</b>
              </button>
            );
          })}
          {!me.favoriteModelIds.length && <EmptyState icon="star" title="Noch keine Favoriten" text="Öffne ein Auto aus deiner Sammlung und markiere es mit ★." />}
        </div>
      )}

      {tab === 'design' && (
        <div className="design">
          <div className="chip-row chip-row--wrap">
            {CATEGORIES.map((c) => (
              <button key={c} className={`chip chip--btn ${cat === c ? 'chip--on' : ''}`} onClick={() => setCat(c)}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="design-grid">
            {itemsByCategory(cat).map((item) => {
              const locked: 'level' | 'pro' | 'challenge' | null = item.challengeOnly
                ? state.unlocks.decorations.includes(item.id) ? null : 'challenge'
                : item.pro && !me.isPro ? 'pro' : level.level < item.unlockLevel ? 'level' : null;
              const active = cat === 'decoration' ? g.decorationIds.includes(item.id) : activeId === item.id;
              const swatch =
                cat === 'lighting'
                  ? { background: `radial-gradient(circle at 50% 0%, ${item.style['--light']}, #0d0e10 75%)` }
                  : cat === 'decoration'
                    ? {}
                    : { background: item.style.background };
              return (
                <button key={item.id} className={`design-item ${active ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`} onClick={() => selectItem(item.id, locked, item.unlockLevel)}>
                  <div className="design-item__swatch" style={swatch}>
                    {item.glyph && <span>{item.glyph}</span>}
                    {locked && (
                      <span className="design-item__lock">
                        <Icon name="lock" size={16} />
                      </span>
                    )}
                  </div>
                  <div className="design-item__name">{item.name}</div>
                  <div className="design-item__meta">{item.challengeOnly ? (locked ? '🏁 Challenge-Belohnung' : active ? 'Aktiv' : '🏁 Freigeschaltet') : item.pro ? <ProBadge small /> : locked ? `ab LV ${item.unlockLevel}` : active ? 'Aktiv' : 'Frei'}</div>
                </button>
              );
            })}
          </div>
          <p className="muted small">Weitere Designs folgen – neue Elemente werden in data/garageItems.ts registriert.</p>
        </div>
      )}

      {/* Platz belegen */}
      <Sheet open={slotSheet !== null} onClose={() => setSlotSheet(null)} title={slotSheet === 0 ? 'Welches Auto auf die Drehbühne?' : `Welches Auto auf Platz ${(slotSheet ?? 0) + 1}?`}>
        {collectedIds.length ? (
          <div className="slot-list">
            {collectedIds.map((id) => {
              const m = getModel(id);
              const pos = order.indexOf(id);
              return (
                <button
                  key={id}
                  className="model-row"
                  onClick={() => {
                    placeModel(slotSheet!, id);
                    setSlotSheet(null);
                  }}
                >
                  <div className="model-row__art">
                    <CarPhoto modelId={m.id} spots={state.spots} userId={me.id} width={500} />
                  </div>
                  <div className="model-row__info">
                    <div className="eyebrow">{getBrand(m.brandId).name}</div>
                    <div className="model-row__name">{m.name}</div>
                  </div>
                  {pos >= 0 && <span className="chip chip--ghost">{pos === 0 ? 'Hero' : `Platz ${pos + 1}`}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="camera" title="Noch keine Autos" text="Spotte dein erstes Auto, um es hier zu parken." />
        )}
      </Sheet>

      {/* Modell-Details */}
      <Sheet open={!!modelSheet} onClose={() => setModelSheet(null)} title="Aus deiner Sammlung">
        {modelSheet &&
          (() => {
            const m = getModel(modelSheet);
            const b = getBrand(m.brandId);
            const fav = me.favoriteModelIds.includes(m.id);
            const mySpots = state.spots.filter((s) => s.userId === me.id && s.modelId === m.id);
            return (
              <div className="model-detail" style={{ ['--brand' as string]: b.color }}>
                <div className="model-detail__stage">
                  <CarPhoto modelId={m.id} spots={state.spots} userId={me.id} />
                </div>
                <div className="eyebrow">{b.name}</div>
                <h2>{m.name}</h2>
                <div className="row gap-s">
                  <RarityTag rarity={m.rarity} size="md" />
                  {m.years && <span className="chip chip--ghost">{m.years}</span>}
                  <span className="chip chip--ghost">{mySpots.length}× gespottet</span>
                </div>
                <div className="row gap-s mt">
                  <button className={`btn grow ${fav ? 'btn--primary' : 'btn--outline'}`} onClick={() => toggleFavorite(m.id)}>
                    <Icon name="star" size={16} fill={fav} /> {fav ? 'Favorit' : 'Als Favorit'}
                  </button>
                  <button
                    className="btn btn--outline grow"
                    onClick={() => {
                      placeModel(0, m.id);
                      setModelSheet(null);
                      showToast(`${m.name} steht jetzt auf der Drehbühne`);
                    }}
                  >
                    <Icon name="arrowUp" size={16} /> Auf Drehbühne
                  </button>
                </div>
                {mySpots[0] && (
                  <button className="link-btn mt" onClick={() => navigate(`/spot/${mySpots[0].id}`)}>
                    Letzten Spot ansehen <Icon name="chevronRight" size={14} />
                  </button>
                )}
              </div>
            );
          })()}
      </Sheet>
    </div>
  );
}
