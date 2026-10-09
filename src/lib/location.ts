import type { GeoPoint, ID, PublicLocation, Spot, SpotLocation } from '../types/models';
import WORLD_CITIES from '../data/worldCities.json';

/**
 * STANDORT-PRIVATSPHÄRE
 * ─────────────────────
 * Standard: Andere Nutzer sehen nur einen ~2 km großen Bereich, nie den exakten Punkt.
 * Der Mittelpunkt wird auf ein festes Raster "eingerastet" – dadurch lässt sich der
 * echte Punkt auch aus vielen Spots derselben Person nicht zurückrechnen
 * (anders als bei zufälligem Rauschen, das sich herausmitteln lässt).
 *
 * WICHTIG fürs Backend: Diese Funktion muss SERVERSEITIG laufen (z. B. als View
 * oder API-Serializer). Der Client anderer Nutzer darf `location.exact` nie erhalten.
 */
export const AREA_RADIUS_M = 1500;
const GRID_DEG = 0.02; // ≈ 2,2 km Nord-Süd

export function snapToGrid(p: GeoPoint): GeoPoint {
  const snap = (v: number) => Math.floor(v / GRID_DEG) * GRID_DEG + GRID_DEG / 2;
  return { lat: +snap(p.lat).toFixed(5), lng: +snap(p.lng).toFixed(5) };
}

export function publicLocation(loc: SpotLocation): PublicLocation {
  if (loc.visibility === 'hidden') return { point: null, radiusM: 0, areaLabel: loc.areaLabel };
  if (loc.visibility === 'exact') return { point: loc.exact, radiusM: 0, areaLabel: loc.areaLabel };
  return { point: snapToGrid(loc.exact), radiusM: AREA_RADIUS_M, areaLabel: loc.areaLabel };
}

/** Standort, wie ihn `viewerId` sehen darf. Eigene Spots sieht man exakt. */
export function visibleLocation(spot: Spot, viewerId: ID): PublicLocation {
  if (spot.userId === viewerId) return { point: spot.location.exact, radiusM: 0, areaLabel: spot.location.areaLabel };
  return publicLocation(spot.location);
}

// ─── Grober Ortsname ──────────────────────────────────────────────────────

/**
 * Demo-"Reverse Geocoding": nächstgelegene bekannte Stadt.
 * TODO(api): Durch echten Reverse-Geocoder ersetzen (z. B. Nominatim, Mapbox,
 * Google Geocoding) – und dabei nur Stadt/Stadtteil speichern, keine Hausnummer.
 */
export const KNOWN_AREAS: { name: string; p: GeoPoint }[] = [
  { name: 'Ulm', p: { lat: 48.3984, lng: 9.9916 } },
  { name: 'Stuttgart-Mitte', p: { lat: 48.7758, lng: 9.1829 } },
  { name: 'Stuttgart-Zuffenhausen', p: { lat: 48.8345, lng: 9.1527 } },
  { name: 'München-Maxvorstadt', p: { lat: 48.1486, lng: 11.5695 } },
  { name: 'München-Altstadt', p: { lat: 48.1374, lng: 11.5755 } },
  { name: 'Frankfurt am Main', p: { lat: 50.1109, lng: 8.6821 } },
  { name: 'Düsseldorf – Kö', p: { lat: 51.2254, lng: 6.7763 } },
  { name: 'Hamburg-Neustadt', p: { lat: 53.5511, lng: 9.9937 } },
  { name: 'Berlin-Charlottenburg', p: { lat: 52.5044, lng: 13.3053 } },
  { name: 'Nürburgring', p: { lat: 50.3356, lng: 6.9475 } },
  { name: 'Zürich', p: { lat: 47.3769, lng: 8.5417 } },
  { name: 'Monaco', p: { lat: 43.7384, lng: 7.4246 } },
  { name: 'Augsburg', p: { lat: 48.3705, lng: 10.8978 } },
  { name: 'Köln', p: { lat: 50.9375, lng: 6.9603 } },
  // weltweit
  { name: 'Dubai – Downtown', p: { lat: 25.1972, lng: 55.2744 } },
  { name: 'Dubai Marina', p: { lat: 25.0805, lng: 55.1403 } },
  { name: 'Abu Dhabi', p: { lat: 24.4539, lng: 54.3773 } },
  { name: 'Riad', p: { lat: 24.7136, lng: 46.6753 } },
  { name: 'Doha', p: { lat: 25.2854, lng: 51.531 } },
  { name: 'London – Knightsbridge', p: { lat: 51.5015, lng: -0.1607 } },
  { name: 'Paris – Champs-Élysées', p: { lat: 48.8698, lng: 2.3079 } },
  { name: 'New York – Manhattan', p: { lat: 40.7614, lng: -73.9776 } },
  { name: 'Miami Beach', p: { lat: 25.7907, lng: -80.13 } },
  { name: 'Los Angeles – Beverly Hills', p: { lat: 34.0696, lng: -118.4053 } },
  { name: 'Monterey – Pebble Beach', p: { lat: 36.5687, lng: -121.9502 } },
  { name: 'Las Vegas Strip', p: { lat: 36.1147, lng: -115.1728 } },
  { name: 'Tokio – Shibuya', p: { lat: 35.658, lng: 139.7016 } },
  { name: 'Tokio – Daikoku PA', p: { lat: 35.4637, lng: 139.6784 } },
  { name: 'Hongkong – Central', p: { lat: 22.2819, lng: 114.1582 } },
  { name: 'Singapur – Marina Bay', p: { lat: 1.2834, lng: 103.8607 } },
  { name: 'Shanghai – Bund', p: { lat: 31.2400, lng: 121.4900 } },
  { name: 'Sydney', p: { lat: -33.8688, lng: 151.2093 } },
  { name: 'São Paulo – Jardins', p: { lat: -23.5656, lng: -46.6679 } },
  { name: 'Mexiko-Stadt – Polanco', p: { lat: 19.4326, lng: -99.1953 } },
  { name: 'Kapstadt', p: { lat: -33.9249, lng: 18.4241 } },
  { name: 'Istanbul', p: { lat: 41.0422, lng: 29.0083 } },
];

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Grober Ortsname weltweit: bekannte Spotting-Orte (≤ 25 km) oder die nächste
 * Stadt aus ~1.900 Weltstädten (Natural Earth, ≤ 80 km), sonst Koordinaten.
 */
export function areaLabelFor(p: GeoPoint): string {
  const nearest = KNOWN_AREAS.map((a) => ({ a, d: distanceKm(a.p, p) })).sort((x, y) => x.d - y.d)[0];
  if (nearest.d < 25) return `Nähe ${nearest.a.name}`;
  let best: { name: string; d: number } | null = null;
  for (const [name, lat, lng] of WORLD_CITIES as [string, number, number][]) {
    if (Math.abs(lat - p.lat) > 1.2) continue;
    const d = distanceKm({ lat, lng }, p);
    if (!best || d < best.d) best = { name, d };
  }
  if (best && best.d < 80) return `Nähe ${best.name}`;
  return `${p.lat.toFixed(1)}°, ${p.lng.toFixed(1)}°`;
}

/**
 * Städtesuche für Alert-Gebiete (bekannte Spotting-Orte + ~1.900 Weltstädte).
 * TODO(api): echte Ortssuche (Geocoding-API) anbinden.
 */
export function searchCities(q: string, limit = 8): { name: string; p: GeoPoint }[] {
  const n = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.length < 2) return [];
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pool = [
    ...KNOWN_AREAS,
    ...(WORLD_CITIES as [string, number, number][]).map(([name, lat, lng]) => ({ name, p: { lat, lng } })),
  ];
  const seen = new Set<string>();
  const hits = pool
    .filter((c) => norm(c.name).includes(n))
    .sort((a, b) => Number(!norm(a.name).startsWith(n)) - Number(!norm(b.name).startsWith(n)) || a.name.length - b.name.length)
    .filter((c) => (seen.has(norm(c.name)) ? false : (seen.add(norm(c.name)), true)));
  return hits.slice(0, limit);
}
