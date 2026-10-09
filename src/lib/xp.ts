import type { CarModel, GarageTier, LevelInfo, MediaType, XpEvent } from '../types/models';
import { RARITY_META } from './rarity';

/**
 * XP-Regeln an EINER Stelle. Im echten Backend müssen diese Regeln serverseitig
 * laufen (z. B. Edge Function / Cloud Function beim Insert in `spots`),
 * sonst könnten Clients sich XP selbst gutschreiben.
 */
export const XP_RULES = {
  carSpotted: 50, // jedes gespottete Auto
  newModel: 100, // Modell zum ersten Mal in der Sammlung
  newBrand: 50, // erste Marke überhaupt
  // Seltenheitsbonus beim Erstfund – siehe RARITY_META.xp (0 / 250 / 500 / 750 / 1000 / 2500)
  video: 25,
} as const;

export interface SpotXpInput {
  model: CarModel;
  mediaType: MediaType;
  isNewModel: boolean;
  isNewBrand: boolean;
}

/**
 * Berechnet die XP für einen neuen Spot.
 * Seltenheits-Bonus gibt es nur beim ERSTEN Fund eines Modells –
 * so kann niemand XP farmen, indem er dasselbe seltene Auto 20× hochlädt.
 */
export function xpForSpot({ model, mediaType, isNewModel, isNewBrand }: SpotXpInput): XpEvent[] {
  const events: XpEvent[] = [{ reason: 'car_spotted', amount: XP_RULES.carSpotted, label: 'Auto entdeckt' }];
  if (isNewModel) {
    events.push({ reason: 'new_model', amount: XP_RULES.newModel, label: 'Neues Modell' });
    const bonus = RARITY_META[model.rarity].xp;
    if (bonus > 0) {
      events.push({ reason: 'rarity_bonus', amount: bonus, label: `${RARITY_META[model.rarity].label}es Auto` });
    }
  }
  if (isNewBrand) events.push({ reason: 'new_brand', amount: XP_RULES.newBrand, label: 'Neue Marke' });
  if (mediaType === 'video') events.push({ reason: 'video', amount: XP_RULES.video, label: 'Video-Spot' });
  return events;
}

export const sumXp = (events: XpEvent[]) => events.reduce((s, e) => s + e.amount, 0);

// ─── Level-Kurve ──────────────────────────────────────────────────────────

/**
 * XP, die man in Level n braucht, um Level n+1 zu erreichen.
 * Steigt überproportional: am Anfang geht es schnell, hohe Ränge dauern lange.
 *   Spotter (6) ≈ 900 XP · Pro Spotter (16) ≈ 13.500 XP
 *   Elite Spotter (31) ≈ 98.000 XP · Master Spotter (75) ≈ 1,3 Mio. XP
 * Zum Vergleich: ein neues sehr seltenes Modell bringt ~650 XP.
 */
export const xpToNext = (level: number) => Math.round((100 + 15 * Math.pow(level - 1, 1.9)) / 10) * 10;

/** Gesamt-XP, die man braucht, um Level `level` zu erreichen. */
export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let n = 1; n < level; n++) sum += xpToNext(n);
  return sum;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  const need = xpToNext(level);
  return {
    level,
    title: levelTitle(level),
    xpIntoLevel: remaining,
    xpForNext: need,
    progress: remaining / need,
    totalXp,
  };
}

/** Ränge nach Level-Bereich – bestimmen Titel, Emoji und Farbe des Profilbild-Rings. */
export interface Rank {
  min: number;
  max: number | null;
  title: string;
  emoji: string;
  color: string;
}

export const RANKS: Rank[] = [
  { min: 1, max: 5, title: 'Beginner', emoji: '🟢', color: '#3ddc84' },
  { min: 6, max: 15, title: 'Spotter', emoji: '🔵', color: '#3aa0ff' },
  { min: 16, max: 30, title: 'Pro Spotter', emoji: '🟣', color: '#b26bff' },
  { min: 31, max: 74, title: 'Elite Spotter', emoji: '🔴', color: '#ff3b3b' },
  { min: 75, max: null, title: 'Master Spotter', emoji: '👑', color: '#ffb020' },
];

export const rankFor = (level: number) => [...RANKS].reverse().find((r) => level >= r.min)!;
export const nextRank = (level: number) => RANKS.find((r) => r.min > level);

/**
 * LEVEL OHNE OBERGRENZE (∞)
 * Es gibt kein Maximal-Level – die Kurve oben gilt für jedes Level.
 * Ab Master Spotter (Level 75) gibt es alle 25 Level einen weiteren Stern:
 *   75–99 Master Spotter · 100–124 Master Spotter ★2 · 125–149 ★3 · … unendlich weiter.
 */
export const MASTER_STAR_STEP = 25;
export const masterStars = (level: number) => (level < 75 ? 0 : Math.floor((level - 75) / MASTER_STAR_STEP) + 1);
/** Nächstes Ziel: nächster Rang oder (als Master) der nächste Stern */
export function nextMilestone(level: number): { level: number; label: string; emoji: string } {
  const r = nextRank(level);
  if (r) return { level: r.min, label: r.title, emoji: r.emoji };
  const stars = masterStars(level);
  return { level: 75 + stars * MASTER_STAR_STEP, label: `Master Spotter ★${stars + 1}`, emoji: '👑' };
}
export const levelTitle = (level: number) => {
  const stars = masterStars(level);
  return stars >= 2 ? `Master Spotter ★${stars}` : rankFor(level).title;
};

// ─── Garagen-Stufen ───────────────────────────────────────────────────────

export const GARAGE_TIERS: GarageTier[] = [
  { minLevel: 1, name: 'Kleine Garage', slots: 4 },
  { minLevel: 10, name: 'Große Garage', slots: 8 },
  { minLevel: 25, name: 'Luxury Garage', slots: 12 },
  { minLevel: 50, name: 'Supercar Showroom', slots: 20 },
];

export const garageTier = (level: number) =>
  [...GARAGE_TIERS].reverse().find((t) => level >= t.minLevel)!;

export const nextGarageTier = (level: number) => GARAGE_TIERS.find((t) => t.minLevel > level);
