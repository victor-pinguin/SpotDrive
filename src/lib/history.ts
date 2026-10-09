import { getBrand, getModel } from '../data/cars';
import type { ID, Rarity, Spot } from '../types/models';
import { rarityRank } from './rarity';
import { periodStartDate } from './cards';

/**
 * SPOTTING-HISTORY
 * Nur für den Nutzer selbst: enthält auch private Spots und den eigenen (exakten)
 * Ortsnamen. TODO(backend): Endpoint GET /me/history – nur mit eigenem Auth-Token,
 * niemals für andere Nutzer abrufbar (Row Level Security: user_id = auth.uid()).
 */

export type HistoryPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

export interface HistoryFilter {
  period: HistoryPeriod;
  brandId?: ID;
  rarity?: Rarity;
}

export function mySpots(spots: Spot[], userId: ID) {
  return spots.filter((s) => s.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function filterHistory(spots: Spot[], userId: ID, f: HistoryFilter): Spot[] {
  const from = f.period === 'all' ? null : periodStartDate(f.period);
  return mySpots(spots, userId).filter((s) => {
    const m = getModel(s.modelId);
    if (from && new Date(s.createdAt) < from) return false;
    if (f.brandId && m.brandId !== f.brandId) return false;
    if (f.rarity && m.rarity !== f.rarity) return false;
    return true;
  });
}

/** Nach Kalendertag gruppieren (neueste zuerst). */
export function groupByDay(spots: Spot[]): { day: string; date: Date; spots: Spot[] }[] {
  const map = new Map<string, Spot[]>();
  spots.forEach((s) => {
    const key = dayKey(new Date(s.createdAt));
    map.set(key, [...(map.get(key) ?? []), s]);
  });
  return [...map.entries()].map(([day, list]) => ({ day, date: new Date(day + 'T12:00:00'), spots: list }));
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface HistoryStats {
  total: number;
  distinctModels: number;
  rarest: Spot[];
  topBrand?: { brandId: ID; count: number };
  longestStreak: number;
  currentStreak: number;
  xp: number;
}

export function historyStats(spots: Spot[]): HistoryStats {
  const brandCount = new Map<ID, number>();
  spots.forEach((s) => {
    const b = getModel(s.modelId).brandId;
    brandCount.set(b, (brandCount.get(b) ?? 0) + 1);
  });
  const top = [...brandCount.entries()].sort((a, b) => b[1] - a[1] || getBrand(a[0]).name.localeCompare(getBrand(b[0]).name))[0];

  // seltenste Spots: pro Modell nur einmal, höchste Seltenheit zuerst
  const seen = new Set<ID>();
  const rarest = [...spots]
    .sort((a, b) => rarityRank(getModel(b.modelId).rarity) - rarityRank(getModel(a.modelId).rarity) || a.createdAt.localeCompare(b.createdAt))
    .filter((s) => (seen.has(s.modelId) ? false : (seen.add(s.modelId), true)))
    .slice(0, 3);

  // Serien: aufeinanderfolgende Kalendertage mit mindestens einem Spot
  const days = [...new Set(spots.map((s) => dayKey(new Date(s.createdAt))))].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    const cur = new Date(d + 'T12:00:00');
    run = prev && Math.round((cur.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = cur;
  }
  // aktuelle Serie: endet heute oder gestern
  let current = 0;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const set = new Set(days);
  const probe = new Date(today);
  if (!set.has(dayKey(probe))) probe.setDate(probe.getDate() - 1);
  while (set.has(dayKey(probe))) {
    current++;
    probe.setDate(probe.getDate() - 1);
  }

  return {
    total: spots.length,
    distinctModels: new Set(spots.map((s) => s.modelId)).size,
    rarest,
    topBrand: top ? { brandId: top[0], count: top[1] } : undefined,
    longestStreak: longest,
    currentStreak: current,
    xp: spots.reduce((a, s) => a + s.xpAwarded, 0),
  };
}

/** Emoji je Marke für die Timeline (Fallback: Rennwagen). */
export const BRAND_EMOJI: Record<string, string> = {
  lamborghini: '🐂',
  ferrari: '🐎',
  porsche: '🏎️',
  bugatti: '💎',
  mclaren: '🧡',
  koenigsegg: '👻',
  'mercedes-amg': '⭐',
  'mercedes-benz': '⭐',
  bmw: '🔵',
  audi: '⭕',
  tesla: '⚡',
  'rolls-royce': '👑',
  pagani: '🌀',
};
export const brandEmoji = (brandId: ID) => BRAND_EMOJI[brandId] ?? '🚗';
