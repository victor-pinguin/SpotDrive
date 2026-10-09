import type { AlertArea, DreamAlertSettings, DreamCar, GeoPoint } from '../types/models';

/** Bonus, wenn man ein eigenes Dream Car selbst spottet */
export const DREAM_FOUND_XP = 500;

export const DEFAULT_DREAM_SETTINGS: DreamAlertSettings = { enabled: true, push: false, inApp: true, frequency: 'instant' };

/**
 * Vordefinierte Regionen (Auswahl „Region“).
 * TODO(api): durch echte Geocoding-/Regionssuche ersetzen (z. B. Mapbox, Nominatim) – Polygon statt Kreis.
 */
export const REGIONS: { name: string; center: GeoPoint; radiusKm: number }[] = [
  { name: 'Großraum Zürich', center: { lat: 47.3769, lng: 8.5417 }, radiusKm: 35 },
  { name: 'Großraum München', center: { lat: 48.1374, lng: 11.5755 }, radiusKm: 40 },
  { name: 'Region Stuttgart', center: { lat: 48.7758, lng: 9.1829 }, radiusKm: 35 },
  { name: 'Ulm / Neu-Ulm', center: { lat: 48.3984, lng: 9.9916 }, radiusKm: 25 },
  { name: 'Rhein-Main', center: { lat: 50.1109, lng: 8.6821 }, radiusKm: 45 },
  { name: 'Rhein-Ruhr', center: { lat: 51.35, lng: 7.0 }, radiusKm: 60 },
  { name: 'Côte d’Azur & Monaco', center: { lat: 43.7, lng: 7.3 }, radiusKm: 45 },
  { name: 'Großraum London', center: { lat: 51.5072, lng: -0.1276 }, radiusKm: 40 },
  { name: 'Dubai & Abu Dhabi', center: { lat: 24.8, lng: 54.8 }, radiusKm: 120 },
  { name: 'Los Angeles', center: { lat: 34.05, lng: -118.25 }, radiusKm: 60 },
  { name: 'Großraum Tokio', center: { lat: 35.6762, lng: 139.6503 }, radiusKm: 50 },
];

export const RADIUS_STEPS = [2, 5, 10, 25, 50, 100, 200];

const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

export const DEMO_AREAS: AlertArea[] = [
  { id: 'area-zurich', label: 'Zürich', center: { lat: 47.3769, lng: 8.5417 }, radiusKm: 10, source: 'city' },
  { id: 'area-munich', label: 'München', center: { lat: 48.1374, lng: 11.5755 }, radiusKm: 25, source: 'city' },
];

/** 8 Dream Cars: 3 davon hat der Demo-Nutzer schon gespottet (G 63, 911 GT3, Roma) */
export function DEMO_DREAM_CARS(): DreamCar[] {
  return [
    { id: 'dc-gt3rs', modelId: 'porsche-911-gt3-rs', variant: 'Weissach-Paket', addedAt: daysAgo(20), alertsOn: true, areaId: 'area-zurich' },
    { id: 'dc-chiron', modelId: 'bugatti-chiron', addedAt: daysAgo(18), alertsOn: true, areaId: 'area-munich' },
    { id: 'dc-12cil', modelId: 'ferrari-12cilindri', addedAt: daysAgo(12), alertsOn: false, areaId: 'area-munich' },
    { id: 'dc-revuelto', modelId: 'lamborghini-revuelto', addedAt: daysAgo(9), alertsOn: true, areaId: 'all' },
    { id: 'dc-jesko', modelId: 'koenigsegg-jesko', addedAt: daysAgo(5), alertsOn: true, areaId: 'all' },
    { id: 'dc-gt3', modelId: 'porsche-911-gt3', addedAt: daysAgo(30), alertsOn: false, areaId: 'all', foundRewardedAt: daysAgo(8) },
    { id: 'dc-g63', modelId: 'mercedes-amg-g-63', addedAt: daysAgo(40), alertsOn: false, areaId: 'all', foundRewardedAt: daysAgo(17) },
    { id: 'dc-roma', modelId: 'ferrari-roma', addedAt: daysAgo(10), alertsOn: false, areaId: 'all', foundRewardedAt: daysAgo(1) },
  ];
}
