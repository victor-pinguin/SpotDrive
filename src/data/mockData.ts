import type { Comment, GeoPoint, LocationVisibility, Spot, User } from '../types/models';
import { KNOWN_AREAS } from '../lib/location';
import { getModel } from './cars';
import { levelFromXp, sumXp, totalXpForLevel, xpForSpot } from '../lib/xp';
import { defaultGarage } from './garageItems';
import { DEMO_VIDEOS, catalogPhoto } from './carPhotos';

/**
 * TESTDATEN
 * TODO(backend): Diese Datei entfällt, sobald Nutzer/Spots aus der Datenbank kommen.
 */

export const CURRENT_USER_ID = 'u-me';

export const USERS: User[] = [
  { id: CURRENT_USER_ID, username: 'spotter_one', displayName: 'Du', avatarColor: '#ff5a1f', bio: 'Neu bei SpotDrive – auf der Jagd nach dem ersten Hypercar.', homeArea: 'Raum Ulm', isPro: false, joinedAt: '2026-08-02T10:00:00Z', xp: 0, favoriteModelIds: [], savedSpotIds: [], followingIds: ['u-lena', 'u-marco'] },
  { id: 'u-lena', username: 'lena.shoots.cars', displayName: 'Lena K.', avatarColor: '#3aa0ff', bio: 'Porsche-Fan · Stuttgart · Canon R6', homeArea: 'Stuttgart', isPro: true, joinedAt: '2025-03-12T10:00:00Z', xp: 18450, favoriteModelIds: [], savedSpotIds: [], followingIds: [] },
  { id: 'u-marco', username: 'marco_hypercars', displayName: 'Marco R.', avatarColor: '#ffb020', bio: 'Monaco-Sommer, Kö-Winter. Nur Hypercars.', homeArea: 'Düsseldorf', isPro: true, joinedAt: '2024-11-02T10:00:00Z', xp: 64200, favoriteModelIds: [], savedSpotIds: [], followingIds: [] },
  { id: 'u-jonas', username: 'jonas.v8', displayName: 'Jonas', avatarColor: '#2fa84f', bio: 'V8 > alles. München.', homeArea: 'München', isPro: false, joinedAt: '2025-09-20T10:00:00Z', xp: 6120, favoriteModelIds: [], savedSpotIds: [], followingIds: [] },
  { id: 'u-sofia', username: 'sofia_spots', displayName: 'Sofia', avatarColor: '#b26bff', bio: 'Carspotting in Hamburg & Berlin 📸', homeArea: 'Hamburg', isPro: false, joinedAt: '2026-01-05T10:00:00Z', xp: 3310, favoriteModelIds: [], savedSpotIds: [], followingIds: [] },
  { id: 'u-omar', username: 'omar.dxb', displayName: 'Omar', avatarColor: '#1fd1b2', bio: 'Dubai · Hypercars zum Frühstück', homeArea: 'Dubai', isPro: true, joinedAt: '2024-06-01T10:00:00Z', xp: 0, favoriteModelIds: [], savedSpotIds: [], followingIds: [] },
  { id: 'u-kenji', username: 'kenji_daikoku', displayName: 'Kenji', avatarColor: '#ff3d7f', bio: 'Daikoku PA every Friday night 🌙 JDM & Supercars', homeArea: 'Tokio', isPro: false, joinedAt: '2025-02-11T10:00:00Z', xp: 0, favoriteModelIds: [], savedSpotIds: [], followingIds: [] },
  { id: 'u-emma', username: 'emma.la.spots', displayName: 'Emma', avatarColor: '#ffb020', bio: 'Beverly Hills · Pebble Beach · Miami', homeArea: 'Los Angeles', isPro: true, joinedAt: '2024-09-09T10:00:00Z', xp: 0, favoriteModelIds: [], savedSpotIds: [], followingIds: [] },
  { id: 'u-liam', username: 'liam_knightsbridge', displayName: 'Liam', avatarColor: '#3a6df0', bio: 'Supercar season in London 🇬🇧', homeArea: 'London', isPro: false, joinedAt: '2025-04-20T10:00:00Z', xp: 0, favoriteModelIds: [], savedSpotIds: [], followingIds: [] },
  { id: 'u-tim', username: 'ring.tim', displayName: 'Tim', avatarColor: '#e3120b', bio: 'Jedes Wochenende am Nürburgring.', homeArea: 'Eifel', isPro: true, joinedAt: '2025-05-17T10:00:00Z', xp: 27800, favoriteModelIds: [], savedSpotIds: [], followingIds: [] },
];

const area = (name: string) => KNOWN_AREAS.find((a) => a.name === name)!.p;
/** deterministischer kleiner Versatz, damit Spots nicht exakt auf dem Stadtzentrum liegen */
const jitter = (p: GeoPoint, seed: number): GeoPoint => ({
  lat: p.lat + (((seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 0.03,
  lng: p.lng + (((seed * 4933 + 1237) % 23328) / 23328 - 0.5) * 0.04,
});
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

type SeedRow = [
  userId: string,
  modelId: string,
  areaName: string,
  hoursAgo: number,
  visibility: LocationVisibility,
  description: string,
  likes: number,
  video?: keyof typeof DEMO_VIDEOS,
];

const SEED: SeedRow[] = [
  // eigene Spots (älter → Sammlung zum Start)
  [CURRENT_USER_ID, 'porsche-911-carrera', 'Ulm', 900, 'area', 'Mein allererster Spot 🙌', 4],
  [CURRENT_USER_ID, 'bmw-m2', 'Ulm', 700, 'area', 'Zandvoort Blue im Regen', 6],
  [CURRENT_USER_ID, 'audi-rs-6-avant', 'Augsburg', 520, 'area', 'Familienkombi mit 600 PS', 9],
  [CURRENT_USER_ID, 'mercedes-amg-g-63', 'München-Altstadt', 400, 'area', '', 3],
  [CURRENT_USER_ID, 'porsche-911-carrera-s', 'Stuttgart-Zuffenhausen', 260, 'area', 'Direkt vor dem Werk', 12],
  [CURRENT_USER_ID, 'porsche-911-gt3', 'Stuttgart-Mitte', 180, 'area', 'Python Green GT3 – endlich!', 21],
  [CURRENT_USER_ID, 'ferrari-roma', 'Ulm', 30, 'area', 'Roma in Grigio', 8],

  // Community
  ['u-marco', 'bugatti-chiron', 'Monaco', 2, 'area', 'Chiron vor dem Casino. Monaco liefert immer.', 842],
  ['u-lena', 'porsche-911-gt3-rs', 'Stuttgart-Zuffenhausen', 4, 'area', 'Acid Green GT3 RS beim Kaffee-Stopp ☕', 311],
  ['u-tim', 'porsche-911-gt3', 'Nürburgring', 6, 'exact', 'GT3-Testwagen in Action – Ton an 🔊', 207, 'gt3'],
  ['u-jonas', 'porsche-911-carrera', 'München-Maxvorstadt', 9, 'area', 'Zwei 911 Targa von oben – Drohnenshot 🚁', 188, 'targa'],
  ['u-sofia', 'rolls-royce-cullinan', 'Hamburg-Neustadt', 12, 'area', 'Black Badge Cullinan am Jungfernstieg', 96],
  ['u-marco', 'koenigsegg-jesko', 'Düsseldorf – Kö', 20, 'area', 'JESKO. Auf der Kö. Ich zittere noch.', 1204],
  ['u-lena', 'ferrari-296-gtb', 'Stuttgart-Mitte', 27, 'area', 'Rosso Imola 296 in der Königstraße', 143],
  ['u-tim', 'porsche-918-spyder', 'Nürburgring', 33, 'area', 'Weissach-Paket 918 🤯', 655],
  ['u-jonas', 'mercedes-amg-amg-gt-black-series', 'München-Altstadt', 40, 'area', 'Magmabeam Orange Black Series', 174],
  ['u-sofia', 'ferrari-sf90-stradale', 'Berlin-Charlottenburg', 52, 'area', 'SF90 Assetto Fiorano am Ku’damm', 231],
  ['u-marco', 'pagani-huayra', 'Monaco', 70, 'area', 'Huayra Roadster – Carbon everywhere', 978],
  ['u-lena', 'porsche-911-s-t', 'Stuttgart-Zuffenhausen', 90, 'area', 'Heritage Design S/T 😍', 256],
  ['u-jonas', 'bmw-m4-csl', 'München-Maxvorstadt', 110, 'area', '', 64],
  ['u-tim', 'nissan-skyline-gt-r-r34', 'Köln', 130, 'area', 'Bayside Blue R34 – JDM Legende', 402],
  ['u-sofia', 'lamborghini-urus-performante', 'Hamburg-Neustadt', 150, 'area', '', 58],
  ['u-marco', 'mclaren-senna', 'Zürich', 170, 'area', 'Senna in Zürich, Bahnhofstrasse', 512],
  ['u-lena', 'lamborghini-revuelto', 'Frankfurt am Main', 200, 'area', 'Revuelto in Weiß – sieht aus wie ein Raumschiff', 389],
  ['u-marco', 'ferrari-f80', 'Monaco', 1, 'area', 'F80 in Bewegung. Gänsehaut.', 1530, 'f80'],
  ['u-marco', 'bugatti-divo', 'Monaco', 3, 'area', 'BUGATTI DIVO. Nur 40 Stück weltweit. Ich kann nicht mehr. 🌌', 2310],
  ['u-tim', 'ferrari-f40', 'Nürburgring', 14, 'area', 'F40 auf dem Parkplatz – pure Legende', 904],
  ['u-tim', 'mclaren-765lt', 'Nürburgring', 60, 'area', '765LT im Parkplatz Döttinger Höhe', 143],
  ['u-jonas', 'lamborghini-huracan-sto', 'München-Maxvorstadt', 80, 'area', 'Blu Laufey STO. Der Sound…', 166],

  // weitere eigene Spots (für History, Serie und Car-Card-Fortschritt; hinten angehängt, damit Kommentar-Indizes stimmen)
  [CURRENT_USER_ID, 'volkswagen-golf', 'Ulm', 100, 'area', 'Golf GTI Clubsport – unterschätzt!', 2],
  [CURRENT_USER_ID, 'porsche-911-carrera-s', 'Ulm', 76, 'area', 'Schon wieder ein Carrera S 😅', 5],
  [CURRENT_USER_ID, 'tesla-model-y', 'Augsburg', 52, 'area', '', 1],
  [CURRENT_USER_ID, 'bmw-m2', 'Ulm', 28, 'area', 'M2 Nummer zwei', 3],
  [CURRENT_USER_ID, 'porsche-911-carrera-s', 'Stuttgart-Mitte', 5, 'area', 'Carrera S #3', 4],

  // 🌍 weltweit
  ['u-omar', 'bugatti-chiron-super-sport', 'Dubai – Downtown', 2, 'area', 'Chiron Super Sport vor dem Burj Khalifa 🌆', 1890],
  ['u-omar', 'lamborghini-countach-lpi-800-4', 'Dubai Marina', 30, 'area', 'Countach LPI 800-4 – eins von 112', 1377],
  ['u-omar', 'koenigsegg-regera', 'Abu Dhabi', 58, 'area', 'Regera an der Corniche', 820],
  ['u-omar', 'bugatti-tourbillon', 'Riad', 96, 'area', 'TOURBILLON. Erstes Mal in echt gesehen!', 2604],
  ['u-kenji', 'nissan-skyline-gt-r-r34', 'Tokio – Daikoku PA', 7, 'area', 'Daikoku Friday – R34 Bayside Blue 💙', 1102],
  ['u-kenji', 'lamborghini-aventador-svj', 'Tokio – Shibuya', 40, 'area', 'SVJ an der Shibuya-Kreuzung', 688],
  ['u-kenji', 'nissan-gt-r-nismo', 'Tokio – Daikoku PA', 120, 'area', '', 240],
  ['u-emma', 'ferrari-laferrari', 'Los Angeles – Beverly Hills', 10, 'area', 'LaFerrari auf dem Rodeo Drive', 1450],
  ['u-emma', 'ferrari-daytona-sp3', 'Monterey – Pebble Beach', 36, 'area', 'Monterey Car Week – Daytona SP3', 990],
  ['u-emma', 'mclaren-p1', 'Miami Beach', 66, 'area', 'P1 am Ocean Drive 🌴', 704],
  ['u-emma', 'rolls-royce-spectre', 'Las Vegas Strip', 140, 'area', 'Spectre vor dem Bellagio', 310],
  ['u-emma', 'ford-gt-2017', 'New York – Manhattan', 160, 'area', 'Ford GT in Midtown', 455],
  ['u-liam', 'aston-martin-valkyrie', 'London – Knightsbridge', 16, 'area', 'Valkyrie in Knightsbridge. Harrods-Parkplatz liefert.', 1320],
  ['u-liam', 'mclaren-elva', 'London – Knightsbridge', 84, 'area', 'Elva ohne Windschutzscheibe im Londoner Regen 😂', 530],
  ['u-marco', 'bugatti-veyron', 'Paris – Champs-Élysées', 50, 'area', 'Veyron auf den Champs-Élysées', 610],
  ['u-lena', 'mercedes-amg-amg-one', 'Hongkong – Central', 72, 'area', 'AMG ONE in Hongkong – Formel-1-Motor auf der Straße', 1210],
  ['u-sofia', 'rimac-nevera', 'Singapur – Marina Bay', 100, 'area', 'Nevera an der Marina Bay ⚡', 802],
  ['u-jonas', 'porsche-918-spyder', 'Sydney', 180, 'area', '918 Spyder am Opera House', 690],
  ['u-tim', 'lamborghini-revuelto', 'São Paulo – Jardins', 210, 'area', 'Revuelto in São Paulo', 377],
  ['u-kenji', 'pagani-zonda', 'Shanghai – Bund', 230, 'area', 'Zonda am Bund 🌃', 1044],

  // ── Dream Car Alerts (Testdaten): passende öffentliche Spots in Zürich & München ──
  ['u-lena', 'porsche-911-gt3-rs', 'Zürich', 2, 'area', 'GT3 RS am Bellevue 🔥', 54],
  ['u-emma', 'porsche-911-gt3-rs', 'Zürich', 1.7, 'area', 'Derselbe GT3 RS – jetzt am See!', 12], // ähnliche Meldung → wird zusammengefasst
  ['u-jonas', 'ferrari-12cilindri', 'München-Maxvorstadt', 26, 'area', '12Cilindri in Giallo Modena', 40],
  ['u-kenji', 'bugatti-chiron', 'München-Altstadt', 30, 'area', 'Chiron in der Maximilianstraße', 120],
  ['u-liam', 'lamborghini-revuelto', 'Zürich', 3, 'hidden', 'Standort bewusst verborgen', 5], // verborgener Ort → darf KEINEN Alert auslösen

  // ── Personal Spotting Calendar (Testdaten): weitere eigene Spots im laufenden Monat ──
  [CURRENT_USER_ID, 'bmw-m5', 'Ulm', 3, 'area', 'Neuer M5 an der Ampel', 2],
  [CURRENT_USER_ID, 'audi-rs-e-tron-gt', 'Ulm', 27, 'area', '', 3],
  [CURRENT_USER_ID, 'rolls-royce-ghost', 'München-Altstadt', 50, 'area', 'Ghost vor dem Bayerischen Hof', 7],
  [CURRENT_USER_ID, 'bentley-bentayga', 'München-Altstadt', 51, 'area', '', 2],
  [CURRENT_USER_ID, 'bmw-m4-csl', 'Stuttgart-Mitte', 98, 'area', 'CSL in Frozen Brooklyn Grey', 11],
  [CURRENT_USER_ID, 'ford-mustang-dark-horse', 'Augsburg', 170, 'area', '', 4],
  [CURRENT_USER_ID, 'audi-rs-q8', 'Augsburg', 172, 'area', '', 1],
  [CURRENT_USER_ID, 'nissan-gt-r-nismo', 'Stuttgart-Zuffenhausen', 220, 'area', 'Godzilla 🦖', 15],
  [CURRENT_USER_ID, 'audi-r8-v10-performance', 'Frankfurt am Main', 290, 'area', 'R8 am Main', 9],
  [CURRENT_USER_ID, 'bmw-m8-competition', 'Ulm', 340, 'area', '', 3],
  [CURRENT_USER_ID, 'rolls-royce-cullinan', 'Stuttgart-Mitte', 410, 'area', '', 5],
  [CURRENT_USER_ID, 'mercedes-amg-sls-amg', 'Ulm', 500, 'area', 'Flügeltüren! 😍', 18],
  [CURRENT_USER_ID, 'porsche-911-carrera', 'Ulm', 560, 'area', 'Wieder ein Carrera', 1],
];

/** Testdaten-Medien: echte Fotos/Videos von Wikimedia Commons (siehe carPhotos.ts). */
function seedMedia(modelId: string, video?: keyof typeof DEMO_VIDEOS): Spot['media'] {
  const photo = catalogPhoto(modelId);
  if (video) {
    const v = DEMO_VIDEOS[video];
    return { type: 'video', url: v.webm, urlAlt: v.mp4, posterUrl: photo?.url, credit: { author: v.author, license: v.license, sourceUrl: v.sourceUrl } };
  }
  if (!photo) return { type: 'photo', placeholder: true };
  return { type: 'photo', url: photo.url, credit: { author: photo.author, license: photo.license, sourceUrl: photo.sourceUrl } };
}

const COMMENTS: [spotIdx: number, userId: string, text: string][] = [
  [7, 'u-lena', 'Unfassbar, wie oft stehen die da? 😍'],
  [7, 'u-jonas', 'Monaco ist einfach unfair'],
  [8, 'u-tim', 'Acid Green ist die einzig richtige Farbe'],
  [12, 'u-sofia', 'Legendär. Glückwunsch zum Spot!'],
  [12, CURRENT_USER_ID, 'Wie selten ist das bitte?!'],
  [10, 'u-marco', 'Hör dir den Sound an 🔊'],
];

/** Spots chronologisch pro Nutzer durchgehen → wasNewModel & xpAwarded konsistent berechnen. */
function buildSpots(): Spot[] {
  const spots: Spot[] = SEED.map(([userId, modelId, areaName, h, visibility, description, likes, video], i) => ({
    id: `s-${i + 1}`,
    userId,
    modelId,
    description: description || undefined,
    media: seedMedia(modelId, video),
    location: { exact: jitter(area(areaName), i + 7), visibility, areaLabel: areaName, source: 'gps' },
    createdAt: hoursAgo(h),
    isPublic: true,
    // fiktive Like-IDs, damit die Zahl stimmt; echte Likes kommen aus Tabelle `likes`
    likedBy: Array.from({ length: likes }, (_, k) => `anon-${k}`),
    comments: [],
    xpAwarded: 0,
    wasNewModel: false,
  }));

  const seenModels = new Map<string, Set<string>>();
  const seenBrands = new Map<string, Set<string>>();
  [...spots]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((s) => {
      const m = getModel(s.modelId);
      const models = seenModels.get(s.userId) ?? new Set();
      const brands = seenBrands.get(s.userId) ?? new Set();
      const isNewModel = !models.has(m.id);
      const isNewBrand = !brands.has(m.brandId);
      s.wasNewModel = isNewModel;
      s.xpAwarded = sumXp(xpForSpot({ model: m, mediaType: s.media.type, isNewModel, isNewBrand }));
      models.add(m.id);
      brands.add(m.brandId);
      seenModels.set(s.userId, models);
      seenBrands.set(s.userId, brands);
    });

  COMMENTS.forEach(([idx, userId, text], k) => {
    const s = spots[idx];
    const c: Comment = { id: `c-${k}`, spotId: s.id, userId, text, createdAt: hoursAgo(1) };
    s.comments.push(c);
  });
  return spots;
}

export const SPOTS: Spot[] = buildSpots();

// Start-XP des eigenen Nutzers = XP aus eigenen Spots (+ First-Spot-Badge).
// So ist der Nutzer knapp vor einem Level-Up und sieht beim ersten Spot die Animation.
const me = USERS[0];
const FIRST_SPOT_BADGE_XP = 50;
const DEMO_CHALLENGE_XP = 250; // früher abgeschlossene Challenges (Testdaten)
me.xp = SPOTS.filter((s) => s.userId === me.id).reduce((a, s) => a + s.xpAwarded, 0) + FIRST_SPOT_BADGE_XP + DEMO_CHALLENGE_XP;
// Demo: knapp vor dem nächsten Level starten, damit der erste neue Spot ein Level-Up auslöst.
{
  const l = levelFromXp(me.xp);
  me.xp = totalXpForLevel(l.level) + Math.round(l.xpForNext * 0.8);
}

// Testnutzer über alle Ränge verteilt (Level → XP aus der Level-Kurve)
const DEMO_LEVELS: Record<string, number> = { 'u-omar': 58, 'u-kenji': 27, 'u-emma': 41, 'u-liam': 14, 'u-marco': 76, 'u-tim': 34, 'u-lena': 19, 'u-jonas': 9, 'u-sofia': 4 };
USERS.forEach((u) => {
  const lvl = DEMO_LEVELS[u.id];
  if (lvl) u.xp = totalXpForLevel(lvl) + Math.round((totalXpForLevel(lvl + 1) - totalXpForLevel(lvl)) / 3);
});
me.favoriteModelIds = ['porsche-911-gt3'];

export const INITIAL_GARAGE = defaultGarage(CURRENT_USER_ID, [
  'porsche-911-gt3',
  'ferrari-roma',
  'porsche-911-carrera-s',
  'bmw-m2',
]);
