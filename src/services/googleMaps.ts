/**
 * Google Maps JavaScript API – Lader.
 * Der Schlüssel kommt NUR aus der Umgebung (VITE_GOOGLE_MAPS_KEY, lokale .env bzw. Hoster-Einstellung),
 * nie aus dem Code. Er muss in der Google Cloud Console auf HTTP-Referrer (+ Android/iOS-App-ID)
 * und auf die Maps JavaScript API beschränkt sein.
 * Ohne Schlüssel oder bei Fehlern (falscher Referrer, Abrechnung aus) nutzt SpotDrive automatisch die kostenlose Leaflet-Karte.
 */
import { useEffect, useState } from 'react';

const STORE = 'spotdrive:gmKey';
/** Schlüssel: in der App eingefügt (nur auf diesem Gerät gespeichert) hat Vorrang vor VITE_GOOGLE_MAPS_KEY. */
export const getStoredMapsKey = (): string => {
  try {
    return localStorage.getItem(STORE) ?? '';
  } catch {
    return '';
  }
};
export function setStoredMapsKey(k: string) {
  try {
    if (k.trim()) localStorage.setItem(STORE, k.trim());
    else localStorage.removeItem(STORE);
  } catch {
    /* ignore */
  }
}
const KEY = getStoredMapsKey() || (import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined)?.trim();

export type GoogleMapsStatus = 'off' | 'loading' | 'ready' | 'failed';

let status: GoogleMapsStatus = KEY ? 'loading' : 'off';
let promise: Promise<void> | null = null;
const listeners = new Set<() => void>();
const set = (s: GoogleMapsStatus) => {
  status = s;
  listeners.forEach((l) => l());
};

export const googleMapsConfigured = !!KEY;

export function loadGoogleMaps(): Promise<void> {
  if (!KEY) return Promise.reject(new Error('Kein Google-Maps-Schlüssel'));
  if (promise) return promise;
  promise = new Promise<void>((resolve, reject) => {
    // Google ruft diese Funktion bei ungültigem Schlüssel / Referrer auf
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
      set('failed');
      reject(new Error('Google Maps: Schlüssel abgelehnt'));
    };
    (window as unknown as { __sdGmReady?: () => void }).__sdGmReady = () => {
      set('ready');
      resolve();
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&language=de&callback=__sdGmReady`;
    s.async = true;
    s.onerror = () => {
      set('failed');
      reject(new Error('Google Maps konnte nicht geladen werden'));
    };
    document.head.appendChild(s);
    setTimeout(() => status === 'loading' && (set('failed'), reject(new Error('Zeitüberschreitung'))), 12000);
  });
  promise.catch(() => undefined);
  return promise;
}

export function useGoogleMaps(): GoogleMapsStatus {
  const [s, setS] = useState(status);
  useEffect(() => {
    const l = () => setS(status);
    listeners.add(l);
    if (KEY) void loadGoogleMaps();
    l();
    return () => void listeners.delete(l);
  }, []);
  return s;
}
