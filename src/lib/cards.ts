import { getBrand, getModel, modelsOfBrand, MODELS } from '../data/cars';
import type { CarModel, ID, Rarity, Spot } from '../types/models';
import { rarityRank } from './rarity';

/**
 * DIGITAL CAR CARDS
 * ─────────────────
 * Jede Karte entsteht automatisch aus den Spots eines Nutzers: 1 Karte pro Modell.
 * Nichts davon wird separat gespeichert – im Backend kann das eine View
 * `user_car_cards` (GROUP BY user_id, model_id) sein.
 *
 * Karten-Stufen (persönlicher Fortschritt je Modell, nach Anzahl Spots):
 *   Bronze 1× · Silber 3× · Gold 5× · Platin 10×
 */
export const CARD_LEVELS = [
  { min: 1, name: 'Bronze', color: '#cd8a4f' },
  { min: 3, name: 'Silber', color: '#c9d1da' },
  { min: 5, name: 'Gold', color: '#ffc94a' },
  { min: 10, name: 'Platin', color: '#a8f0ff' },
] as const;

export type CardLevel = (typeof CARD_LEVELS)[number];

export function cardLevel(count: number) {
  const idx = CARD_LEVELS.reduce((acc, l, i) => (count >= l.min ? i : acc), 0);
  const current = CARD_LEVELS[idx];
  const next = CARD_LEVELS[idx + 1];
  return {
    current,
    next,
    /** 0..1 Fortschritt bis zur nächsten Stufe (1 = max) */
    progress: next ? (count - current.min) / (next.min - current.min) : 1,
    toNext: next ? next.min - count : 0,
  };
}

export interface CarCardData {
  model: CarModel;
  collected: boolean;
  count: number;
  firstSpot?: Spot;
  lastSpot?: Spot;
  /** Laufende Nummer des ersten Spots dieses Modells in der persönlichen History */
  spotNumber?: number;
  variant?: string;
  /** bestes eigenes Foto/Video für die Karte */
  photoSpot?: Spot;
  /** mit diesem Modell verdiente XP */
  xp?: number;
  /** Beispiel-Card (Editor-Vorschau) */
  sample?: { place: string; date: string };
}

/** Alle gesammelten Karten eines Nutzers. */
export function carCards(spots: Spot[], userId: ID): CarCardData[] {
  const mine = spots.filter((s) => s.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const numberOf = new Map(mine.map((s, i) => [s.id, i + 1]));
  const byModel = new Map<ID, Spot[]>();
  mine.forEach((s) => byModel.set(s.modelId, [...(byModel.get(s.modelId) ?? []), s]));
  return [...byModel.entries()].map(([modelId, list]) => {
    const withMedia = [...list].reverse().find((s) => !s.media.placeholder && (s.media.url || s.media.posterUrl));
    return {
      model: getModel(modelId),
      collected: true,
      count: list.length,
      firstSpot: list[0],
      lastSpot: list[list.length - 1],
      spotNumber: numberOf.get(list[0].id),
      variant: list.map((s) => s.variant).find(Boolean),
      photoSpot: withMedia ?? list[list.length - 1],
      xp: list.reduce((sum, s) => sum + (s.xpAwarded || 0), 0),
    };
  });
}

/** Card zu einem einzelnen Spot (Spotting-History): Nummer, Datum, Ort und XP genau dieses Spots. */
export function spotCard(spot: Spot, spots: Spot[], userId: ID): CarCardData {
  const mine = spots.filter((s) => s.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const sameModel = mine.filter((s) => s.modelId === spot.modelId);
  return {
    model: getModel(spot.modelId),
    collected: true,
    count: sameModel.length,
    firstSpot: spot,
    lastSpot: spot,
    spotNumber: mine.findIndex((s) => s.id === spot.id) + 1,
    variant: spot.variant,
    photoSpot: spot,
    xp: spot.xpAwarded,
  };
}

/** Beispiel-Card für Vorschauen (Editor, Paywall) */
export function sampleCard(modelId: ID, n = 42): CarCardData {
  return { model: getModel(modelId), collected: true, count: 3, spotNumber: n, variant: 'Beispiel-Card', xp: 250 + n * 5, sample: { place: 'Monaco', date: new Date().toISOString() } };
}

/** Noch nicht gesammelte Karten (für den Filter „noch nicht gesammelt“). */
export function missingCards(collectedIds: Set<ID>, brandId?: ID): CarCardData[] {
  const pool = brandId ? modelsOfBrand(brandId) : MODELS.filter((m) => m.source === 'curated');
  return pool.filter((m) => !collectedIds.has(m.id)).map((model) => ({ model, collected: false, count: 0 }));
}

export type CardSort = 'newest' | 'oldest' | 'rarity' | 'brand' | 'count';
export type CardStatus = 'collected' | 'missing';
export type CardPeriod = 'all' | 'week' | 'month' | 'year';

export interface CardFilter {
  brandId?: ID;
  model?: string;
  rarity?: Rarity;
  period: CardPeriod;
  status: CardStatus;
  sort: CardSort;
}

export function periodStartDate(period: CardPeriod | 'today', now = new Date()): Date | null {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === 'today') return d;
  if (period === 'week') {
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  }
  if (period === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (period === 'year') return new Date(d.getFullYear(), 0, 1);
  return null;
}

export function filterCards(spots: Spot[], userId: ID, f: CardFilter): CarCardData[] {
  const collected = carCards(spots, userId);
  let list = f.status === 'collected' ? collected : missingCards(new Set(collected.map((c) => c.model.id)), f.brandId);
  if (f.brandId) list = list.filter((c) => c.model.brandId === f.brandId);
  if (f.rarity) list = list.filter((c) => c.model.rarity === f.rarity);
  if (f.model?.trim()) {
    const q = f.model.trim().toLowerCase();
    list = list.filter((c) => `${getBrand(c.model.brandId).name} ${c.model.name}`.toLowerCase().includes(q));
  }
  const from = periodStartDate(f.period);
  if (from && f.status === 'collected') list = list.filter((c) => c.firstSpot && new Date(c.firstSpot.createdAt) >= from);

  const date = (c: CarCardData) => c.firstSpot?.createdAt ?? '';
  const sorters: Record<CardSort, (a: CarCardData, b: CarCardData) => number> = {
    newest: (a, b) => date(b).localeCompare(date(a)),
    oldest: (a, b) => date(a).localeCompare(date(b)),
    rarity: (a, b) => rarityRank(b.model.rarity) - rarityRank(a.model.rarity) || date(b).localeCompare(date(a)),
    brand: (a, b) => getBrand(a.model.brandId).name.localeCompare(getBrand(b.model.brandId).name) || a.model.name.localeCompare(b.model.name),
    count: (a, b) => b.count - a.count || date(b).localeCompare(date(a)),
  };
  return [...list].sort(sorters[f.sort]);
}
