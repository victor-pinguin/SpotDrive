import { useState } from 'react';
import { getStoredMapsKey, googleMapsConfigured, setStoredMapsKey, useGoogleMaps } from '../services/googleMaps';

/**
 * Google-Maps-Schlüssel direkt in der App einfügen (Einstellungen).
 * Wird nur auf diesem Gerät gespeichert (nie gesendet außer an Google beim Laden der Karte).
 * Nur ein beschränkter Maps-JavaScript-Schlüssel – keine Stripe-/KI-Geheimschlüssel!
 */
export function MapsKeyField() {
  const status = useGoogleMaps();
  const [val, setVal] = useState('');
  const stored = getStoredMapsKey();
  const t = val.trim();
  const odd = t.length > 0 && !/^AIza[0-9A-Za-z_-]{30,}$/.test(t);

  const label =
    status === 'ready' ? '✅ Google Maps aktiv' : status === 'loading' ? '⏳ Lädt …' : status === 'failed' ? '⚠️ Schlüssel abgelehnt – kostenlose Karte aktiv' : 'Kostenlose Karte aktiv';

  return (
    <div className="setting-row mt" style={{ display: 'block' }}>
      <b>Google-Maps-Schlüssel</b>
      <div className="muted small">{label}</div>
      {googleMapsConfigured && !stored && <div className="muted small">Schlüssel kommt aus der Konfiguration (.env).</div>}
      <input
        className="input mt-s"
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder={stored ? '•••••••• (gespeichert)' : 'Schlüssel hier einfügen (beginnt mit AIza…)'}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        aria-label="Google-Maps-Schlüssel"
      />
      {odd && <div className="small mt-s" style={{ color: 'var(--warn, #ffb020)' }}>Das sieht nicht wie ein Google-Maps-Schlüssel aus (beginnt normalerweise mit „AIza“). Du kannst ihn trotzdem testen.</div>}
      <div className="row gap-s mt-s">
        <button
          className="btn btn--primary btn--sm"
          disabled={!t}
          onClick={() => {
            setStoredMapsKey(t);
            location.reload();
          }}
        >
          Speichern &amp; Karte laden
        </button>
        {stored && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setStoredMapsKey('');
              location.reload();
            }}
          >
            Entfernen
          </button>
        )}
      </div>
      <div className="muted small mt-s">Bleibt nur auf diesem Gerät. Beschränke den Schlüssel in der Google Cloud Console (HTTP-Referrer + Maps JavaScript API).</div>
    </div>
  );
}
