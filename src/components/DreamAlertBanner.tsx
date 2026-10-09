import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppStore';
import { fullName, getModel } from '../data/cars';
import { CarPhoto } from './CarPhoto';
import { timeAgo } from './ui';

/**
 * In-App-Benachrichtigung „DREAM CAR SPOTTED!“.
 * Zeigt nur den groben, öffentlichen Ort – nie den exakten Standort.
 */
export function DreamAlertBanner() {
  const { dreamBanner, dismissDreamBanner, rewards } = useApp();
  // warten, bis Belohnungs-Animationen geschlossen sind
  const a = rewards.length ? null : dreamBanner;
  const navigate = useNavigate();
  // blendet sich nach 10 s aus – der Alert bleibt im Postfach (Dream Cars → Alerts)
  useEffect(() => {
    if (!a) return;
    const t = window.setTimeout(dismissDreamBanner, 10000);
    return () => window.clearTimeout(t);
  }, [a?.id, dismissDreamBanner]);
  if (!a) return null;
  const model = getModel(a.modelId);
  const count = a.spotIds.length;
  const open = () => {
    dismissDreamBanner();
    navigate(`/spot/${a.spotIds[0]}`);
  };
  return (
    <div className="dream-banner" role="alert" key={a.id}>
      <div className="dream-banner__photo">
        <CarPhoto modelId={model.id} width={500} />
      </div>
      <div className="dream-banner__body">
        <div className="dream-banner__kicker">🔔 DREAM CAR SPOTTED!</div>
        <b>{fullName(model)}</b>
        <span className="muted small">wurde in deinem ausgewählten Gebiet gespottet.</span>
        <span className="dream-banner__meta">
          📍 {a.areaLabel} · 🕐 {timeAgo(a.spottedAt)}
          {count > 1 ? ` · ${count} Meldungen` : ''}
        </span>
        <div className="row gap-s">
          <button className="btn btn--primary btn--sm" onClick={open}>
            Spot ansehen
          </button>
          <button className="btn btn--ghost btn--sm" onClick={dismissDreamBanner}>
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
