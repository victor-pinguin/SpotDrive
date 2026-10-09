import { useRef, useState, type PointerEvent } from 'react';
import type { PrivacyRegion } from '../services/carRecognition';
import { Icon } from './Icon';

/**
 * Bereiche zum Verpixeln selbst setzen oder entfernen.
 * Ziehen = neuer Bereich · ✕ = Bereich entfernen. Koordinaten normiert (0..1).
 */
export function PrivacyEditor({ src, regions, onChange, onDone }: { src: string; regions: PrivacyRegion[]; onChange: (r: PrivacyRegion[]) => void; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const pos = (e: PointerEvent) => {
    const b = box.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), y: Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)) };
  };
  const down = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.pv-box__x')) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pos(e);
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };
  const move = (e: PointerEvent) => {
    if (!draft) return;
    const p = pos(e);
    setDraft({ ...draft, x1: p.x, y1: p.y });
  };
  const up = () => {
    if (!draft) return;
    const x = Math.min(draft.x0, draft.x1);
    const y = Math.min(draft.y0, draft.y1);
    let w = Math.abs(draft.x1 - draft.x0);
    let h = Math.abs(draft.y1 - draft.y0);
    // Tippen statt Ziehen → Standardgröße (ungefähr ein Kennzeichen)
    if (w < 0.02 && h < 0.02) {
      w = 0.18;
      h = 0.07;
      onChange([...regions, { type: 'manual', box: [Math.max(0, Math.min(1 - w, x - w / 2)), Math.max(0, Math.min(1 - h, y - h / 2)), w, h] }]);
    } else onChange([...regions, { type: 'manual', box: [x, y, w, h] }]);
    setDraft(null);
  };

  const pct = (v: number) => `${v * 100}%`;
  return (
    <div className="stack">
      <p className="muted small">
        Ziehe einen Rahmen über Kennzeichen oder Gesichter (oder tippe darauf). Mit ✕ entfernst du einen Bereich. Gespeichert wird nur das verpixelte Bild.
      </p>
      <div ref={box} className="pv-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDraft(null)}>
        <img src={src} alt="" draggable={false} />
        {regions.map((r, i) => (
          <div key={i} className={`pv-box pv-box--${r.type}`} style={{ left: pct(r.box[0]), top: pct(r.box[1]), width: pct(r.box[2]), height: pct(r.box[3]) }}>
            <span className="pv-box__label">{r.type === 'face' ? 'Gesicht' : r.type === 'plate' ? 'Kennzeichen' : 'Bereich'}</span>
            <button className="pv-box__x" onClick={() => onChange(regions.filter((_, k) => k !== i))} aria-label="Bereich entfernen">
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
        {draft && (
          <div
            className="pv-box pv-box--draft"
            style={{ left: pct(Math.min(draft.x0, draft.x1)), top: pct(Math.min(draft.y0, draft.y1)), width: pct(Math.abs(draft.x1 - draft.x0)), height: pct(Math.abs(draft.y1 - draft.y0)) }}
          />
        )}
      </div>
      <div className="row gap-s">
        <span className="muted small grow">{regions.length ? `${regions.length} Bereich${regions.length > 1 ? 'e' : ''} werden verpixelt` : 'Noch nichts markiert'}</span>
        {regions.length > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={() => onChange([])}>
            Alle entfernen
          </button>
        )}
      </div>
      <button className="btn btn--primary btn--block" onClick={onDone}>
        Fertig
      </button>
    </div>
  );
}
