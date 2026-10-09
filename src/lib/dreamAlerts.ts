import type { AlertArea, AlertFrequency, DreamAlert, DreamAlertSettings, DreamCar, GeoPoint, ID, Spot } from '../types/models';
import { distanceKm, publicLocation } from './location';

/**
 * DREAM CAR ALERTS – Abgleich-Logik
 * ─────────────────────────────────
 * Reine Funktionen ohne UI → 1:1 in eine Server-Funktion übertragbar
 * (z. B. Supabase Edge Function / DB-Trigger „nach INSERT in spots“):
 *
 *   neuer öffentlicher Spot
 *     → Standort prüfen (nur öffentlicher Bereich, nie der exakte Punkt)
 *     → Dream-Car-Listen mit diesem Modell finden   (SQL: dream_cars WHERE model_id = …)
 *     → passende Gebiete prüfen                      (PostGIS: ST_DWithin(area.center, spot.area, radius))
 *     → Duplikate / ähnliche Meldungen zusammenfassen
 *     → Häufigkeits-Limit prüfen
 *     → Benachrichtigung senden (Push über FCM/APNs, In-App über Realtime)
 */

/** ähnliche Meldungen: gleiches Modell, ≤ 3 km, ≤ 2 Stunden auseinander */
export const SIMILAR_KM = 3;
export const SIMILAR_MS = 2 * 3600_000;
export const FREQUENCY_MS: Record<AlertFrequency, number> = { instant: 0, hourly: 3600_000, daily: 24 * 3600_000 };
export const FREQUENCY_LABEL: Record<AlertFrequency, string> = {
  instant: 'Sofort bei jedem Spot',
  hourly: 'Max. 1 pro Stunde je Auto',
  daily: 'Max. 1 pro Tag je Auto',
};
/** Kurze Toleranz, weil öffentliche Spot-Bereiche ~1,5 km groß sind */
const AREA_SLACK_KM = 1.5;

export type SpotCheck =
  | { kind: 'skip'; reason: 'own' | 'private' | 'hidden' | 'no-match' | 'no-area' | 'disabled' }
  | { kind: 'merge'; alertId: ID }
  | { kind: 'new'; alert: DreamAlert; notify: boolean };

export interface DreamContext {
  userId: ID;
  isPro: boolean;
  dreamCars: DreamCar[];
  areas: AlertArea[];
  settings: DreamAlertSettings;
  alerts: DreamAlert[];
  now?: number;
}

/** Öffentlich sichtbarer Punkt eines Spots – null, wenn der Ort verborgen ist. */
export function publicPointOf(spot: Spot): { point: GeoPoint; radiusM: number } | null {
  const pub = publicLocation(spot.location);
  return pub.point ? { point: pub.point, radiusM: pub.radiusM } : null;
}

export function areasFor(dc: DreamCar, areas: AlertArea[]): AlertArea[] {
  return dc.areaId === 'all' ? areas : areas.filter((a) => a.id === dc.areaId);
}

export function areaContains(area: AlertArea, p: GeoPoint): boolean {
  return distanceKm(area.center, p) <= area.radiusKm + AREA_SLACK_KM;
}

/** Prüft einen einzelnen neuen Spot für EINEN Nutzer. */
export function checkSpot(spot: Spot, ctx: DreamContext, nextId: () => ID): SpotCheck {
  if (!ctx.isPro || !ctx.settings.enabled) return { kind: 'skip', reason: 'disabled' };
  if (spot.userId === ctx.userId) return { kind: 'skip', reason: 'own' };
  if (!spot.isPublic) return { kind: 'skip', reason: 'private' };
  const pub = publicPointOf(spot);
  if (!pub) return { kind: 'skip', reason: 'hidden' };
  const dc = ctx.dreamCars.find((d) => d.modelId === spot.modelId && d.alertsOn);
  if (!dc) return { kind: 'skip', reason: 'no-match' };
  const area = areasFor(dc, ctx.areas).find((a) => areaContains(a, pub.point));
  if (!area) return { kind: 'skip', reason: 'no-area' };

  const t = new Date(spot.createdAt).getTime();
  // Duplikat-Schutz: derselbe Spot oder eine ähnliche Meldung (gleiches Auto, gleicher Ort, kurz danach)
  const similar = ctx.alerts.find(
    (a) => a.spotIds.includes(spot.id) || (a.modelId === spot.modelId && distanceKm(a.publicPoint, pub.point) <= SIMILAR_KM && Math.abs(new Date(a.spottedAt).getTime() - t) <= SIMILAR_MS),
  );
  if (similar) return { kind: 'merge', alertId: similar.id };

  // Häufigkeit: innerhalb des Fensters schon benachrichtigt → nur ins Postfach
  const now = ctx.now ?? Date.now();
  const windowMs = FREQUENCY_MS[ctx.settings.frequency];
  const recentlyNotified = windowMs > 0 && ctx.alerts.some((a) => a.dreamCarId === dc.id && a.notified && now - new Date(a.createdAt).getTime() < windowMs);
  const notify = !recentlyNotified && (ctx.settings.push || ctx.settings.inApp);

  return {
    kind: 'new',
    notify,
    alert: {
      id: nextId(),
      dreamCarId: dc.id,
      modelId: spot.modelId,
      spotIds: [spot.id],
      areaId: area.id,
      // grober Ortsname des Spots; der exakte Punkt wird nie übernommen
      areaLabel: spot.location.areaLabel.replace(/^Nähe /, ''),
      publicPoint: pub.point,
      publicRadiusM: pub.radiusM,
      spottedAt: spot.createdAt,
      createdAt: new Date(now).toISOString(),
      notified: notify,
      read: false,
    },
  };
}

/**
 * Verarbeitet mehrere neue Spots (älteste zuerst). Jeder Spot wird nur einmal geprüft
 * (processed-Liste) → derselbe Spot löst nie zweimal einen Alert aus.
 */
export function processSpots(spots: Spot[], ctx: DreamContext, processed: Set<ID>, nextId: () => ID) {
  let alerts = [...ctx.alerts];
  const notifications: DreamAlert[] = [];
  const done: ID[] = [];
  for (const spot of [...spots].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (processed.has(spot.id)) continue;
    done.push(spot.id);
    const r = checkSpot(spot, { ...ctx, alerts }, nextId);
    if (r.kind === 'merge') alerts = alerts.map((a) => (a.id === r.alertId && !a.spotIds.includes(spot.id) ? { ...a, spotIds: [...a.spotIds, spot.id] } : a));
    if (r.kind === 'new') {
      alerts = [r.alert, ...alerts];
      if (r.notify) notifications.push(r.alert);
    }
  }
  return { alerts, notifications, processedIds: done };
}

/** Status eines Dream Cars: gespottet, wenn eigener Spot existiert oder manuell markiert. */
export function dreamStatus(dc: DreamCar, spots: Spot[], userId: ID): { spotted: boolean; at?: string; spotId?: ID } {
  const own = spots.filter((s) => s.userId === userId && s.modelId === dc.modelId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (own) return { spotted: true, at: own.createdAt, spotId: own.id };
  if (dc.markedSpottedAt) return { spotted: true, at: dc.markedSpottedAt };
  return { spotted: false };
}

/**
 * Dream-Car-Map: passende öffentliche Spots der letzten Tage in den eigenen Gebieten.
 * Liefert nur öffentliche Punkte/Bereiche.
 */
export function recentDreamSpots(spots: Spot[], dreamCars: DreamCar[], areas: AlertArea[], userId: ID, days = 7) {
  const since = Date.now() - days * 86400_000;
  const models = new Map(dreamCars.map((d) => [d.modelId, d]));
  const out: { spot: Spot; dream: DreamCar; area: AlertArea; point: GeoPoint; radiusM: number }[] = [];
  for (const s of spots) {
    if (s.userId === userId || !s.isPublic || new Date(s.createdAt).getTime() < since) continue;
    const dc = models.get(s.modelId);
    if (!dc) continue;
    const pub = publicPointOf(s);
    if (!pub) continue;
    const area = areas.find((a) => areaContains(a, pub.point));
    if (area) out.push({ spot: s, dream: dc, area, point: pub.point, radiusM: pub.radiusM });
  }
  return out.sort((a, b) => b.spot.createdAt.localeCompare(a.spot.createdAt));
}

/** Zufälliger Punkt im Gebiet (Testmodus) */
export function randomPointIn(area: AlertArea, seed = Math.random()): GeoPoint {
  const r = (area.radiusKm * 0.6 * Math.sqrt(seed)) / 111;
  const a = seed * 997 * Math.PI;
  return { lat: area.center.lat + r * Math.cos(a), lng: area.center.lng + (r * Math.sin(a)) / Math.cos((area.center.lat * Math.PI) / 180) };
}
