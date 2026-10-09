import type { CSSProperties } from 'react';
import type { GarageConfig, ID, Spot } from '../types/models';
import { garageItem } from '../data/garageItems';
import { getBrand, getModel } from '../data/cars';
import { CarPhoto } from './CarPhoto';

/**
 * Virtueller Showroom (2.5D mit CSS) – zeigt die ECHTEN Fotos der gesammelten Autos.
 * Aufbau: Wand/Fenster → Lichtkegel → Boden → Hero-Display mit Spiegelung → Stellplätze → Deko.
 * Erweiterbar: neue Designelemente in data/garageItems.ts; für echtes 3D später
 * durch three.js / react-three-fiber ersetzbar – die Props bleiben gleich.
 */
export function GarageScene({
  config,
  slots,
  spots,
  userId,
  onSlotClick,
  selectedSlot,
}: {
  config: GarageConfig;
  slots: number;
  spots?: Spot[];
  userId?: ID;
  onSlotClick?: (index: number, modelId?: ID) => void;
  selectedSlot?: number | null;
}) {
  const floor = garageItem(config.floorId);
  const wall = garageItem(config.wallId);
  const light = garageItem(config.lightingId);
  const bg = garageItem(config.backgroundId);
  const [hero, ...rest] = config.slotModelIds;
  const smallSlots = Array.from({ length: Math.max(0, slots - 1) }, (_, i) => rest[i]);
  const heroModel = hero ? getModel(hero) : null;

  return (
    <div className="garage" style={light.style as CSSProperties}>
      <div className="garage__stage">
      <div className="garage__wall" style={wall.style as CSSProperties}>
        {config.backgroundId !== 'bg-none' && <div className="garage__window" style={bg.style as CSSProperties} />}
        <div className="garage__sign">SPOTDRIVE</div>
      </div>
      <div className="garage__lights">
        <span />
        <span />
        <span />
      </div>
      <div className="garage__floor" style={floor.style as CSSProperties} />

      <button
        className={`garage__hero ${selectedSlot === 0 ? 'is-selected' : ''}`}
        onClick={() => onSlotClick?.(0, hero)}
        aria-label={heroModel ? `Hero: ${getBrand(heroModel.brandId).name} ${heroModel.name}` : 'Leerer Hero-Platz'}
      >
        {heroModel ? (
          <>
            <div className="garage__display">
              <CarPhoto modelId={heroModel.id} spots={spots} userId={userId} />
            </div>
            <div className="garage__reflection" aria-hidden="true">
              <CarPhoto modelId={heroModel.id} spots={spots} userId={userId} width={500} />
            </div>
            <div className="garage__plate">
              <span>{getBrand(heroModel.brandId).name}</span>
              <b>{heroModel.name}</b>
            </div>
          </>
        ) : (
          <div className="garage__empty">Hero-Platz frei</div>
        )}
      </button>

      {config.decorationIds.map((id) => {
        const d = garageItem(id);
        return (
          <span key={id} className="garage__deco" style={d.style as CSSProperties} title={d.name}>
            {d.glyph}
          </span>
        );
      })}
      </div>

      <div className="garage__row" style={floor.style as CSSProperties}>
        {smallSlots.map((id, i) => {
          const m = id ? getModel(id) : null;
          return (
            <button
              key={i}
              className={`garage__slot ${m ? '' : 'garage__slot--empty'} ${selectedSlot === i + 1 ? 'is-selected' : ''}`}
              onClick={() => onSlotClick?.(i + 1, id)}
              aria-label={m ? m.name : 'Leerer Platz'}
            >
              {m ? <CarPhoto modelId={m.id} spots={spots} userId={userId} width={500} /> : <span>+</span>}
            </button>
          );
        })}
      </div>

    </div>
  );
}
