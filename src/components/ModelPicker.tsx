import { useMemo, useState } from 'react';
import { BRANDS, MODELS, POPULAR_BRAND_IDS, getBrand, modelsOfBrand, norm, type CustomModelInput } from '../data/cars';
import type { CarModel, ID } from '../types/models';
import { CarPhoto } from './CarPhoto';
import { RarityTag } from './ui';
import { Icon } from './Icon';

const PAGE = 60;

type View = { kind: 'home' } | { kind: 'brands' } | { kind: 'brand'; id: ID } | { kind: 'all' } | { kind: 'custom'; brand?: string; model?: string };

/**
 * Auswahl aus dem offenen Katalog (alle Marken, ~2.000 Modelle).
 * Steht ein Auto nicht drin, kann es direkt angelegt werden → jedes Auto ist spotbar.
 */
export function ModelPicker({
  collected,
  onPick,
  onCreate,
}: {
  collected: Set<ID>;
  onPick: (m: CarModel) => void;
  onCreate: (input: CustomModelInput) => CarModel;
}) {
  const [view, setView] = useState<View>({ kind: 'home' });
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const results = useMemo(() => {
    const term = norm(q);
    if (term) return MODELS.filter((m) => norm(`${getBrand(m.brandId).name} ${m.name}`).includes(term) || norm(m.name).includes(term));
    if (view.kind === 'brand') return modelsOfBrand(view.id);
    if (view.kind === 'all') return [...MODELS].sort((a, b) => getBrand(a.brandId).name.localeCompare(getBrand(b.brandId).name) || a.name.localeCompare(b.name));
    return [];
  }, [q, view]);

  const go = (v: View) => {
    setView(v);
    setLimit(PAGE);
  };

  const popular = POPULAR_BRAND_IDS.map(getBrand);
  const sortedBrands = useMemo(() => [...BRANDS].sort((a, b) => a.name.localeCompare(b.name)), []);

  if (view.kind === 'custom') {
    return <CustomForm initialBrand={view.brand} initialModel={view.model} onBack={() => go({ kind: 'home' })} onCreate={(i) => onPick(onCreate(i))} />;
  }

  return (
    <div className="picker">
      <label className="search">
        <Icon name="filter" size={18} />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="Marke oder Modell suchen, z. B. Golf GTI"
        />
      </label>

      {!q && view.kind === 'home' && (
        <>
          <div className="brand-grid">
            <button className="brand-tile brand-tile--all" onClick={() => go({ kind: 'all' })} style={{ ['--c' as string]: '#ff5a1f' }}>
              <span className="brand-tile__mark">
                <Icon name="grid" size={18} />
              </span>
              <span className="brand-tile__name">Alle</span>
            </button>
            {popular.map((b) => (
              <button key={b.id} className="brand-tile" onClick={() => go({ kind: 'brand', id: b.id })} style={{ ['--c' as string]: b.color }}>
                <span className="brand-tile__mark">{b.name.slice(0, 1)}</span>
                <span className="brand-tile__name">{b.name}</span>
              </button>
            ))}
          </div>
          <button className="btn btn--outline btn--block" onClick={() => go({ kind: 'brands' })}>
            Alle Marken A–Z ({BRANDS.length})
          </button>
        </>
      )}

      {!q && view.kind === 'brands' && (
        <>
          <button className="link-btn" onClick={() => go({ kind: 'home' })}>
            <Icon name="chevronLeft" size={16} /> Zurück
          </button>
          <div className="brand-list">
            {sortedBrands.map((b) => (
              <button key={b.id} onClick={() => go({ kind: 'brand', id: b.id })}>
                <span className="brand-dot brand-dot--sm" style={{ background: b.color }} />
                {b.name}
              </button>
            ))}
          </div>
        </>
      )}

      {!q && (view.kind === 'brand' || view.kind === 'all') && (
        <button className="link-btn" onClick={() => go({ kind: 'home' })}>
          <Icon name="chevronLeft" size={16} /> Zurück zu den Marken
        </button>
      )}
      {!q && view.kind === 'all' && <div className="eyebrow">Alle Modelle</div>}
      {!q && view.kind === 'brand' && <div className="eyebrow">{getBrand(view.id).name}</div>}

      <div className="model-list">
        {results.slice(0, limit).map((m) => {
          const has = collected.has(m.id);
          return (
            <button key={m.id} className="model-row" onClick={() => onPick(m)}>
              <div className="model-row__art">
                <CarPhoto modelId={m.id} width={500} />
              </div>
              <div className="model-row__info">
                <div className="eyebrow">{getBrand(m.brandId).name}</div>
                <div className="model-row__name">{m.name}</div>
                <div className="model-row__meta">
                  <RarityTag rarity={m.rarity} />
                </div>
              </div>
              {has ? <span className="chip chip--ghost">In Garage</span> : <span className="chip chip--new">NEU</span>}
            </button>
          );
        })}
        {results.length > limit && (
          <button className="btn btn--ghost btn--block" onClick={() => setLimit((l) => l + PAGE)}>
            Mehr anzeigen
          </button>
        )}
      </div>

      {(q || view.kind === 'brand' || view.kind === 'all') && (
        <button className="custom-cta" onClick={() => go({ kind: 'custom', brand: view.kind === 'brand' ? getBrand(view.id).name : undefined, model: q || undefined })}>
          <Icon name="plus" size={18} />
          <span>
            <b>Auto nicht dabei?</b>
            <small>Marke & Modell selbst eintragen – jedes Auto zählt</small>
          </span>
        </button>
      )}
    </div>
  );
}

function CustomForm({
  initialBrand = '',
  initialModel = '',
  onBack,
  onCreate,
}: {
  initialBrand?: string;
  initialModel?: string;
  onBack: () => void;
  onCreate: (i: CustomModelInput) => void;
}) {
  const [brand, setBrand] = useState(initialBrand);
  const [model, setModel] = useState(initialModel);
  const ok = brand.trim().length >= 2 && model.trim().length >= 1;
  return (
    <form
      className="picker"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onCreate({ brandName: brand.trim(), modelName: model.trim() });
      }}
    >
      <button type="button" className="link-btn" onClick={onBack}>
        <Icon name="chevronLeft" size={16} /> Zurück
      </button>
      {/* TODO(backend): neu angelegte Modelle von Community/Moderatoren prüfen lassen */}
      <p className="muted small">Das Auto kommt in deine Sammlung wie jedes andere. 🤖 Die Seltenheit bestimmt die KI – du kannst sie nicht selbst wählen.</p>
      <label className="field">
        <span>Marke</span>
        <input id="custom-brand" list="brand-options" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="z. B. Volkswagen" autoFocus />
        <datalist id="brand-options">
          {BRANDS.map((b) => (
            <option key={b.id} value={b.name} />
          ))}
        </datalist>
      </label>
      <label className="field">
        <span>Modell</span>
        <input id="custom-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="z. B. Golf GTI Clubsport" />
      </label>
      <button className="btn btn--primary btn--block" disabled={!ok}>
        Auto übernehmen
      </button>
    </form>
  );
}
