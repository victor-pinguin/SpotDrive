import { COMMUNITY_CHALLENGES, DAILY_POOL, LEGENDARY_POOL, WEEKLY_POOL, type CommunityChallengeDef } from '../data/challenges';
import { getBrand, getModel } from '../data/cars';
import type { ActiveChallenge, ChallengeCompletion, ChallengeDefinition, ChallengeProgress, ChallengeRule, ID, PersonalChallenge, Spot, SpotFilter } from '../types/models';
import { atLeast } from './rarity';

/**
 * CHALLENGE-ENGINE (SpotDrive Pro)
 * ───────────────────────────────
 * Fortschritt wird NIE gespeichert, sondern immer aus den Spots im Zeitfenster
 * berechnet → kein Doppelzählen, keine Inkonsistenzen. Gespeichert wird nur,
 * welche Challenge (Schlüssel = Challenge + Zeitfenster) schon belohnt wurde.
 * TODO(backend): dieselbe Logik serverseitig beim Spot-Insert ausführen.
 */

// ─── Zeitfenster ────────────────────────────────────────────────────────

export function dayStart(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function weekStart(d = new Date()) {
  const x = dayStart(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Deterministischer Zufall: alle Nutzer bekommen am selben Tag dieselben Challenges. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function pick<T>(pool: T[], n: number, seed: string): T[] {
  const rnd = seeded(seed);
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
}

// ─── Aktive Challenges ──────────────────────────────────────────────────

export function dailyChallenges(now = new Date()): ActiveChallenge[] {
  const start = dayStart(now);
  const key = dayKey(start);
  return pick(DAILY_POOL, 3, `daily-${key}`).map((def) => ({ def, key: `${def.id}@${key}`, startsAt: start.toISOString(), endsAt: addDays(start, 1).toISOString() }));
}

export function weeklyChallenges(now = new Date()): ActiveChallenge[] {
  const start = weekStart(now);
  const key = dayKey(start);
  // 3 normale + 1 legendäre Challenge pro Woche
  const defs = [...pick(WEEKLY_POOL, 3, `weekly-${key}`), ...pick(LEGENDARY_POOL, 1, `legend-${key}`)];
  return defs.map((def) => ({ def, key: `${def.id}@${key}`, startsAt: start.toISOString(), endsAt: addDays(start, 7).toISOString() }));
}

export function personalXp(rule: ChallengeRule) {
  // Eigene Ziele geben bewusst wenig XP (kein Farmen durch Mini-Ziele)
  return Math.max(25, Math.min(250, rule.count * 10));
}

export function personalActive(p: PersonalChallenge): ActiveChallenge {
  const def: ChallengeDefinition = {
    id: p.id,
    scope: 'personal',
    rarity: p.rule.count >= 20 ? 'rare' : p.rule.count >= 8 ? 'uncommon' : 'common',
    icon: '🎯',
    title: p.title,
    description: p.description || describeRule(p.rule),
    rule: p.rule,
    reward: { xp: personalXp(p.rule) },
  };
  return { def, key: `${p.id}@personal`, startsAt: p.startsAt, endsAt: p.endsAt };
}

export function communityActive(c: CommunityChallengeDef): ActiveChallenge {
  return { def: c, key: `${c.id}@community`, startsAt: c.startsAt, endsAt: c.endsAt };
}

// ─── Messen ──────────────────────────────────────────────────────────────

export function matches(spot: Spot, f?: SpotFilter): boolean {
  if (!f) return true;
  const m = getModel(spot.modelId);
  if (f.brandIds && !f.brandIds.includes(m.brandId)) return false;
  if (f.countries && !f.countries.includes(getBrand(m.brandId).country)) return false;
  if (f.carClasses && !f.carClasses.includes(m.carClass)) return false;
  if (f.minRarity && !atLeast(m.rarity, f.minRarity)) return false;
  if (f.modelPrefix && !m.name.toUpperCase().startsWith(f.modelPrefix.toUpperCase())) return false;
  if (f.minHp && !((m.hp ?? 0) >= f.minHp)) return false;
  if (f.newToCollection && !spot.wasNewModel) return false;
  if (f.videoOnly && spot.media.type !== 'video') return false;
  return true;
}

/** Zählt – je nach Regel – Spots, verschiedene Modelle oder verschiedene Marken. */
export function measure(spots: Spot[], rule: ChallengeRule): number {
  const hits = spots.filter((s) => matches(s, rule.filter));
  if (rule.measure === 'distinct_models') return new Set(hits.map((s) => s.modelId)).size;
  if (rule.measure === 'distinct_brands') return new Set(hits.map((s) => getModel(s.modelId).brandId)).size;
  return hits.length;
}

const inWindow = (s: Spot, a: ActiveChallenge) => s.createdAt >= a.startsAt && s.createdAt < a.endsAt;

export function progressOf(a: ActiveChallenge, spots: Spot[], userId: ID, completions: ChallengeCompletion[]): ChallengeProgress {
  const mine = spots.filter((s) => s.userId === userId && inWindow(s, a));
  const target = a.def.rule.count;
  const current = Math.min(measure(mine, a.def.rule), target);
  const done = completions.find((c) => c.key === a.key);
  return { active: a, current, target, completed: !!done || current >= target, completedAt: done?.completedAt };
}

export interface CommunityProgress {
  active: ActiveChallenge;
  def: CommunityChallengeDef;
  total: number;
  goal: number;
  mine: number;
  completed: boolean;
}

export function communityProgress(c: CommunityChallengeDef, spots: Spot[], userId: ID): CommunityProgress {
  const a = communityActive(c);
  const mine = spots.filter((s) => s.userId === userId && inWindow(s, a) && matches(s, c.rule.filter)).length;
  const total = Math.min(c.goal, c.baseProgress + mine);
  return { active: a, def: c, total, goal: c.goal, mine, completed: total >= c.goal };
}

/** Alle Challenges, die aktuell für den Nutzer laufen (ohne Community). */
export function allActive(personal: PersonalChallenge[], now = new Date()): ActiveChallenge[] {
  const nowIso = now.toISOString();
  return [
    ...dailyChallenges(now),
    ...weeklyChallenges(now),
    ...personal.filter((p) => p.endsAt > nowIso).map(personalActive),
  ];
}

/**
 * Welche Challenges wurden durch einen neuen Spot gerade abgeschlossen?
 * (Fortschritt jetzt ≥ Ziel UND noch keine Belohnung für diesen Schlüssel.)
 */
/** Für ALLE Nutzer: die erste Daily des Tages ist kostenlos (Rest = Pro). */
export const freeDailyChallenge = (now = new Date()): ActiveChallenge => dailyChallenges(now)[0];

export function newlyCompleted(
  spots: Spot[],
  userId: ID,
  personal: PersonalChallenge[],
  completions: ChallengeCompletion[],
  communityJoined: ID[],
  now = new Date(),
  isPro = true,
): ActiveChallenge[] {
  const done = new Set(completions.map((c) => c.key));
  if (!isPro) {
    const free = freeDailyChallenge(now);
    return !done.has(free.key) && progressOf(free, spots, userId, completions).current >= free.def.rule.count ? [free] : [];
  }
  const regular = allActive(personal, now).filter((a) => !done.has(a.key) && progressOf(a, spots, userId, completions).current >= a.def.rule.count);
  const community = COMMUNITY_CHALLENGES.filter((c) => communityJoined.includes(c.id))
    .map((c) => communityProgress(c, spots, userId))
    .filter((p) => p.completed && p.mine > 0 && !done.has(p.active.key))
    .map((p) => p.active);
  return [...regular, ...community];
}

// ─── Streak ──────────────────────────────────────────────────────────────

/** Tage in Folge (bis heute oder gestern) mit mindestens einer abgeschlossenen Challenge. */
export function challengeStreak(completions: ChallengeCompletion[], now = new Date()): number {
  const days = new Set(completions.map((c) => dayKey(new Date(c.completedAt))));
  let d = dayStart(now);
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

// ─── Texte ───────────────────────────────────────────────────────────────

export function describeRule(r: ChallengeRule): string {
  const f = r.filter ?? {};
  const brand = f.brandIds?.map((b) => getBrand(b).name).join(' / ');
  const what = r.measure === 'distinct_brands' ? 'verschiedene Marken' : r.measure === 'distinct_models' ? `verschiedene ${brand ?? ''} Modelle` : `${brand ?? ''} Spots`;
  return `${r.count} ${what.replace(/\s+/g, ' ').trim()}`;
}

export function timeLeft(endsAt: string, now = new Date()) {
  const ms = new Date(endsAt).getTime() - now.getTime();
  if (ms <= 0) return 'abgelaufen';
  const h = Math.floor(ms / 3600000);
  if (h >= 48) return `noch ${Math.floor(h / 24)} Tage`;
  if (h >= 1) return `noch ${h} Std.`;
  return `noch ${Math.max(1, Math.floor(ms / 60000))} Min.`;
}
