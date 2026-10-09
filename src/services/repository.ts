import type { AlertArea, CardStyleSettings, CarModel, DreamAlert, DreamAlertSettings, DreamCar, ChallengeCompletion, GarageConfig, ID, PersonalChallenge, Rarity, Spot, User } from '../types/models';
import { restoreAiRarity, restoreCustomModels } from '../data/cars';
import { DEFAULT_DREAM_SETTINGS, DEMO_AREAS, DEMO_DREAM_CARS } from '../data/dreamCars';
import { DEMO_CARD_STYLES, LEGACY_DESIGN_IDS, styleFromTheme } from '../data/cardDesigns';
import { INITIAL_GARAGE, SPOTS, USERS, CURRENT_USER_ID } from '../data/mockData';

/**
 * DATENZUGRIFF
 * ────────────
 * Aktuell: kompletter App-State lokal (Testdaten + localStorage).
 *
 * Für ein echtes Backend (Empfehlung: Supabase = Postgres + Auth + Storage,
 * alternativ Firebase) werden die Funktionen in src/state/AppStore.tsx
 * durch API-Aufrufe ersetzt, z. B.:
 *   createSpot   → upload media to storage, INSERT INTO spots (XP-Berechnung serverseitig)
 *   toggleLike   → INSERT/DELETE likes
 *   addComment   → INSERT comments
 *   getFeed      → SELECT aus einer View `public_spots`, die location.exact
 *                  per lib/location.ts-Logik unkenntlich macht
 *   auth         → supabase.auth.signInWithOtp / OAuth (Apple, Google)
 *
 * Die Screens greifen nur über den Store (useApp) auf Daten zu, nie direkt
 * auf diese Datei → der Umbau bleibt lokal.
 */

export interface PersistedState {
  version: 6;
  /** Von KI oder Nutzer angelegte Modelle, die nicht im Katalog stehen */
  customModels: CarModel[];
  /** Von der KI bestimmte Seltenheit je Modell (Nutzer können sie nicht wählen) */
  aiRarity?: Record<ID, Rarity>;
  currentUserId: ID;
  users: User[];
  spots: Spot[];
  garage: GarageConfig;
  /** Abgeschlossene & belohnte Challenges (Schlüssel = Challenge@Zeitfenster) */
  challengeCompletions: ChallengeCompletion[];
  personalChallenges: PersonalChallenge[];
  communityJoined: ID[];
  /** Freigeschaltete Challenge-Belohnungen */
  unlocks: { badges: { id: ID; name: string; icon: string; earnedAt: string }[]; decorations: ID[]; cardDesigns: ID[]; titles: string[] };
  streakRewards: string[];
  activeTitle?: string;
  /** Custom Spot Cards (Pro): Standard-Designs je Seltenheit / für alle / je Card */
  cardStyles: CardStyleSettings;
  /** Dream Car Alerts: Wunschliste, Gebiete, Einstellungen, Benachrichtigungen */
  dreamCars: DreamCar[];
  alertAreas: AlertArea[];
  dreamSettings: DreamAlertSettings;
  dreamAlerts: DreamAlert[];
  /** bereits geprüfte Spot-IDs → kein Spot löst zweimal einen Alert aus */
  dreamProcessed: ID[];
  rewardedBadgeIds: string[];
  recognitions: { date: string; count: number };
}

const KEY = 'spotdrive:v6';

/** Testdaten: an den letzten 2 Tagen je eine Challenge geschafft → laufende Challenge-Streak. */
function DEMO_COMPLETIONS(): ChallengeCompletion[] {
  const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  return [
    { key: 'd-spots3@demo-2', challengeId: 'd-spots3', title: 'Daily Drive', scope: 'daily', rarity: 'common', xp: 100, completedAt: day(2) },
    { key: 'd-german3@demo-1', challengeId: 'd-german3', title: 'Made in Germany', scope: 'daily', rarity: 'common', xp: 100, completedAt: day(1) },
  ];
}

export function initialState(): PersistedState {
  return {
    version: 6,
    customModels: [],
    aiRarity: {},
    currentUserId: CURRENT_USER_ID,
    users: structuredClone(USERS),
    spots: structuredClone(SPOTS),
    garage: structuredClone(INITIAL_GARAGE),
    challengeCompletions: DEMO_COMPLETIONS(),
    personalChallenges: [],
    communityJoined: ['c-10k'],
    unlocks: { badges: [], decorations: [], cardDesigns: ['standard'], titles: [] },
    streakRewards: [],
    cardStyles: structuredClone(DEMO_CARD_STYLES),
    ...demoDream(),
    rewardedBadgeIds: ['first-spot'],
    recognitions: { date: '', count: 0 },
  };
}

/** v0.7 → v0.8: einzelnes `cardDesign` wird zu Custom-Card-Einstellungen. */
function migrateCardStyles(p: PersistedState & { cardDesign?: string }): PersistedState {
  if (p.cardStyles) return p;
  const unlocks = { ...p.unlocks, cardDesigns: [...new Set(p.unlocks.cardDesigns.map((d) => LEGACY_DESIGN_IDS[d] ?? d))] };
  const legacy = p.cardDesign ? LEGACY_DESIGN_IDS[p.cardDesign] : undefined;
  const cardStyles: CardStyleSettings = structuredClone(DEMO_CARD_STYLES);
  if (legacy && legacy !== 'standard') cardStyles.all = styleFromTheme(legacy);
  const { cardDesign: _old, ...rest } = p;
  void _old;
  return { ...rest, unlocks, cardStyles };
}

function demoDream() {
  return {
    dreamCars: DEMO_DREAM_CARS(),
    alertAreas: structuredClone(DEMO_AREAS),
    dreamSettings: { ...DEFAULT_DREAM_SETTINGS },
    dreamAlerts: [] as DreamAlert[],
    dreamProcessed: [] as ID[],
  };
}

/** v0.8 → v0.9: Dream Car Alerts + neue Test-Spots ergänzen */
function migrateDream(p: PersistedState): PersistedState {
  if (p.dreamCars) return p;
  const have = new Set(p.spots.map((s) => s.id));
  const extra = SPOTS.filter((s) => !have.has(s.id));
  return { ...p, ...demoDream(), spots: [...p.spots, ...structuredClone(extra)] };
}

/** Neue Test-Spots späterer Versionen auch in bestehende Demo-Stände übernehmen. */
function addMissingSeedSpots(p: PersistedState): PersistedState {
  const have = new Set(p.spots.map((s) => s.id));
  const extra = SPOTS.filter((s) => !have.has(s.id));
  return extra.length ? { ...p, spots: [...p.spots, ...structuredClone(extra)] } : p;
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.version === 6) {
        restoreCustomModels(parsed.customModels ?? []);
        restoreAiRarity(parsed.aiRarity ?? {});
        return addMissingSeedSpots(migrateDream(migrateCardStyles(parsed)));
      }
    }
  } catch {
    /* privater Modus / blockierter Speicher → Testdaten */
  }
  return initialState();
}

export function saveState(state: PersistedState) {
  try {
    // Video-ObjectURLs (blob:) überleben keinen Reload → nicht speichern.
    // TODO(backend): Videos in Storage hochladen und die dauerhafte URL speichern.
    const spots = state.spots.map((s) =>
      s.media.url?.startsWith('blob:') ? { ...s, media: { type: s.media.type, placeholder: true } } : s,
    );
    localStorage.setItem(KEY, JSON.stringify({ ...state, spots }));
  } catch (e) {
    // Häufigster Fall: Speicher voll wegen Fotos. Mit echtem Backend entfällt das.
    console.warn('[SpotDrive] Lokales Speichern fehlgeschlagen', e);
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
