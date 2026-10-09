import type { ID, Rarity, Spot } from '../types/models';
import { getModel } from '../data/cars';
import { rarityRank } from './rarity';

/**
 * PERSONAL SPOTTING CALENDAR
 * ──────────────────────────
 * Nur eigene Spots (inkl. private) – nie für andere Nutzer abrufbar.
 * TODO(backend): GET /me/calendar?month=2026-09 → Tageszähler + Monatsstatistik
 * (SQL: GROUP BY date_trunc('day', created_at AT TIME ZONE user_tz)).
 * Zeitzone: Tage werden in der lokalen Zeit des Geräts gebildet.
 */

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

/** Monatsraster (Montag zuerst). null = Leerfeld vor/nach dem Monat. */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))];
  while (cells.length % 7) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export interface DayInfo {
  spots: Spot[];
  /** höchste Seltenheit des Tages (für die Markierung) */
  topRarity: Rarity;
  newModels: number;
  xp: number;
}

/** Eigene Spots nach Tag (lokale Zeit). */
export function spotsByDay(spots: Spot[], userId: ID): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>();
  for (const s of spots) {
    if (s.userId !== userId) continue;
    const k = dayKey(new Date(s.createdAt));
    const d = map.get(k) ?? { spots: [], topRarity: 'common' as Rarity, newModels: 0, xp: 0 };
    d.spots.push(s);
    const r = getModel(s.modelId).rarity;
    if (rarityRank(r) > rarityRank(d.topRarity)) d.topRarity = r;
    if (s.wasNewModel) d.newModels++;
    d.xp += s.xpAwarded || 0;
    map.set(k, d);
  }
  map.forEach((d) => d.spots.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  return map;
}

export interface MonthStats {
  total: number;
  activeDays: number;
  newModels: number;
  xp: number;
  rarest?: Spot;
  topBrand?: { brandId: ID; count: number };
  bestDay?: { key: string; count: number };
  longestStreak: number;
  /** Veränderung ggü. Vormonat in Spots */
  deltaPrev: number;
}

function monthSpots(byDay: Map<string, DayInfo>, y: number, m: number): [string, DayInfo][] {
  const prefix = monthKey(y, m);
  return [...byDay.entries()].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b));
}

export function monthStats(byDay: Map<string, DayInfo>, y: number, m: number): MonthStats {
  const days = monthSpots(byDay, y, m);
  const spots = days.flatMap(([, d]) => d.spots);
  const brands = new Map<ID, number>();
  spots.forEach((s) => {
    const b = getModel(s.modelId).brandId;
    brands.set(b, (brands.get(b) ?? 0) + 1);
  });
  const top = [...brands.entries()].sort((a, b) => b[1] - a[1])[0];
  const rarest = [...spots].sort((a, b) => rarityRank(getModel(b.modelId).rarity) - rarityRank(getModel(a.modelId).rarity) || a.createdAt.localeCompare(b.createdAt))[0];
  const best = days.reduce<{ key: string; count: number } | undefined>((acc, [k, d]) => (!acc || d.spots.length > acc.count ? { key: k, count: d.spots.length } : acc), undefined);

  let longest = 0;
  let run = 0;
  let prev = -99;
  for (const [k] of days) {
    const n = +k.slice(8);
    run = n === prev + 1 ? run + 1 : 1;
    prev = n;
    longest = Math.max(longest, run);
  }
  const pm = m === 0 ? 11 : m - 1;
  const py = m === 0 ? y - 1 : y;
  const prevTotal = monthSpots(byDay, py, pm).reduce((a, [, d]) => a + d.spots.length, 0);

  return {
    total: spots.length,
    activeDays: days.length,
    newModels: days.reduce((a, [, d]) => a + d.newModels, 0),
    xp: days.reduce((a, [, d]) => a + d.xp, 0),
    rarest,
    topBrand: top ? { brandId: top[0], count: top[1] } : undefined,
    bestDay: best,
    longestStreak: longest,
    deltaPrev: spots.length - prevTotal,
  };
}

/** Spots je Monat eines Jahres (Jahresleiste). */
export function yearCounts(byDay: Map<string, DayInfo>, y: number): number[] {
  const out = Array(12).fill(0);
  byDay.forEach((d, k) => {
    if (k.startsWith(`${y}-`)) out[+k.slice(5, 7) - 1] += d.spots.length;
  });
  return out;
}
