import type { ChallengeDefinition, ChallengeRarity } from '../types/models';

/**
 * CHALLENGE-POOL (Testdaten)
 * TODO(backend): Tabelle `challenges` + täglicher Cron-Job, der die aktiven
 * Daily/Weekly-Challenges für alle Nutzer gleich auswählt.
 *
 * XP nach Schwierigkeit (Challenge-Seltenheit):
 *   Gewöhnlich +100 · Ungewöhnlich +250 · Selten +500 · Episch +1.000 · Legendär +2.000
 */
export const CHALLENGE_RARITY: Record<ChallengeRarity, { label: string; color: string; icon: string; xp: number }> = {
  common: { label: 'Gewöhnlich', color: '#9aa3ad', icon: '⚪', xp: 100 },
  uncommon: { label: 'Ungewöhnlich', color: '#3ddc84', icon: '🟢', xp: 250 },
  rare: { label: 'Selten', color: '#3aa0ff', icon: '🔷', xp: 500 },
  epic: { label: 'Episch', color: '#b26bff', icon: '💜', xp: 1000 },
  legendary: { label: 'Legendär', color: '#ffb020', icon: '👑', xp: 2000 },
};

const xp = (r: ChallengeRarity) => CHALLENGE_RARITY[r].xp;

// ─── Daily-Pool: jeden Tag werden 3 davon ausgewählt ────────────────────
export const DAILY_POOL: ChallengeDefinition[] = [
  { id: 'd-porsche3', scope: 'daily', rarity: 'uncommon', icon: '🏎️', title: 'Zuffenhausen-Tag', description: 'Finde 3 verschiedene Porsche', rule: { measure: 'distinct_models', count: 3, filter: { brandIds: ['porsche'] } }, reward: { xp: xp('uncommon') } },
  { id: 'd-bmwm2', scope: 'daily', rarity: 'uncommon', icon: 'Ⓜ️', title: 'M-Power', description: 'Finde 2 BMW M-Modelle', rule: { measure: 'distinct_models', count: 2, filter: { brandIds: ['bmw'], modelPrefix: 'M' } }, reward: { xp: xp('uncommon') } },
  { id: 'd-lambo', scope: 'daily', rarity: 'rare', icon: '🐂', title: 'Raging Bull', description: 'Finde einen Lamborghini', rule: { measure: 'spots', count: 1, filter: { brandIds: ['lamborghini'] } }, reward: { xp: xp('rare') } },
  { id: 'd-italy', scope: 'daily', rarity: 'rare', icon: '🇮🇹', title: 'Bella Macchina', description: 'Finde ein italienisches Supercar', rule: { measure: 'spots', count: 1, filter: { countries: ['IT'], carClasses: ['supercar', 'hypercar'] } }, reward: { xp: xp('rare') } },
  { id: 'd-500ps', scope: 'daily', rarity: 'uncommon', icon: '💪', title: 'Pferdestärken', description: 'Finde ein Auto mit mehr als 500 PS', rule: { measure: 'spots', count: 1, filter: { minHp: 501 } }, reward: { xp: xp('uncommon') } },
  { id: 'd-new1', scope: 'daily', rarity: 'common', icon: '✨', title: 'Frischer Fund', description: 'Finde ein Auto, das du noch nie gesammelt hast', rule: { measure: 'distinct_models', count: 1, filter: { newToCollection: true } }, reward: { xp: xp('common') } },
  { id: 'd-spots3', scope: 'daily', rarity: 'common', icon: '📸', title: 'Daily Drive', description: 'Erstelle heute 3 Spots', rule: { measure: 'spots', count: 3 }, reward: { xp: xp('common') } },
  { id: 'd-ferrari', scope: 'daily', rarity: 'rare', icon: '🐎', title: 'Cavallino', description: 'Finde einen Ferrari', rule: { measure: 'spots', count: 1, filter: { brandIds: ['ferrari'] } }, reward: { xp: xp('rare') } },
  { id: 'd-german3', scope: 'daily', rarity: 'common', icon: '🇩🇪', title: 'Made in Germany', description: 'Finde 3 verschiedene deutsche Autos', rule: { measure: 'distinct_models', count: 3, filter: { countries: ['DE'] } }, reward: { xp: xp('common') } },
];

// ─── Weekly-Pool: jede Woche 3 davon ─────────────────────────────────────
export const WEEKLY_POOL: ChallengeDefinition[] = [
  { id: 'w-models10', scope: 'weekly', rarity: 'rare', icon: '🗂️', title: 'Katalog-Jäger', description: 'Finde 10 verschiedene Automodelle', rule: { measure: 'distinct_models', count: 10 }, reward: { xp: xp('rare') } },
  { id: 'w-brands5', scope: 'weekly', rarity: 'uncommon', icon: '🧭', title: 'Markenvielfalt', description: 'Finde 5 verschiedene Marken', rule: { measure: 'distinct_brands', count: 5 }, reward: { xp: xp('uncommon') } },
  {
    id: 'w-super3', scope: 'weekly', rarity: 'epic', icon: '🔥', title: 'Supercar Hunter', description: 'Finde 3 verschiedene Supercars',
    rule: { measure: 'distinct_models', count: 3, filter: { carClasses: ['supercar', 'hypercar'] } },
    reward: { xp: xp('epic'), badge: { id: 'cb-supercar-hunter', name: 'Supercar Hunter', icon: '🏆' }, decorationId: 'deco-podium' },
  },
  { id: 'w-rare2', scope: 'weekly', rarity: 'rare', icon: '💎', title: 'Rare Air', description: 'Finde 2 seltene Autos', rule: { measure: 'distinct_models', count: 2, filter: { minRarity: 'rare' } }, reward: { xp: xp('rare'), cardDesignId: 'racing' } },
  {
    id: 'w-legend1', scope: 'weekly', rarity: 'epic', icon: '👑', title: 'Legenden-Jagd', description: 'Finde ein legendäres Auto',
    rule: { measure: 'spots', count: 1, filter: { minRarity: 'legendary' } },
    reward: { xp: xp('epic'), title: 'Legendenjäger', cardDesignId: 'legendary' },
  },
  { id: 'w-spots15', scope: 'weekly', rarity: 'uncommon', icon: '📅', title: 'Spotting-Woche', description: 'Erstelle 15 Spots in dieser Woche', rule: { measure: 'spots', count: 15 }, reward: { xp: xp('uncommon') } },
  { id: 'w-video3', scope: 'weekly', rarity: 'uncommon', icon: '🎬', title: 'Sound Check', description: 'Veröffentliche 3 Video-Spots', rule: { measure: 'spots', count: 3, filter: { videoOnly: true } }, reward: { xp: xp('uncommon') } },
];

// ─── Legendäre Challenges: tauchen selten auf (manche Wochen) ────────────
export const LEGENDARY_POOL: ChallengeDefinition[] = [
  {
    id: 'l-koenigsegg', scope: 'weekly', rarity: 'legendary', icon: '👻', title: 'Ghost Hunter', description: 'Finde einen Koenigsegg',
    rule: { measure: 'spots', count: 1, filter: { brandIds: ['koenigsegg'] } },
    reward: { xp: xp('legendary'), badge: { id: 'cb-legendary-hunter', name: 'Legendary Hunter', icon: '👑' }, title: 'Legendary Hunter', decorationId: 'deco-gold-car' },
  },
  {
    id: 'l-bugatti', scope: 'weekly', rarity: 'legendary', icon: '💎', title: 'Molsheim Mission', description: 'Finde einen Bugatti',
    rule: { measure: 'spots', count: 1, filter: { brandIds: ['bugatti'] } },
    reward: { xp: xp('legendary'), badge: { id: 'cb-bugatti', name: 'Bugatti-Bezwinger', icon: '💎' }, cardDesignId: 'holo' },
  },
  {
    id: 'l-impossible', scope: 'weekly', rarity: 'legendary', icon: '🌌', title: 'Das Unmögliche', description: 'Finde ein unmögliches Auto (< 100 Stück gebaut)',
    rule: { measure: 'spots', count: 1, filter: { minRarity: 'impossible' } },
    reward: { xp: 3000, badge: { id: 'cb-impossible', name: 'Einhorn-Jäger', icon: '🦄' }, title: 'Unmöglich-Jäger', cardDesignId: 'holo' },
  },
];

// ─── Community (weltweit, alle zählen zusammen) ──────────────────────────
export interface CommunityChallengeDef extends ChallengeDefinition {
  goal: number;
  /** Simulierter Stand aller anderen Spotter (Testdaten) */
  baseProgress: number;
  participants: number;
  startsAt: string;
  endsAt: string;
}

const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

/**
 * TODO(backend): Fortschritt kommt live vom Server (SUM aller gültigen Spots seit Start),
 * z. B. per Supabase Realtime. Hier: fester Testwert + deine eigenen Spots.
 */
export const COMMUNITY_CHALLENGES: CommunityChallengeDef[] = [
  {
    id: 'c-10k', scope: 'community', rarity: 'epic', icon: '🌍', title: 'Spot 10.000 Autos', description: 'Gemeinsam 10.000 verschiedene Autos weltweit spotten',
    rule: { measure: 'spots', count: 1 }, goal: 10000, baseProgress: 7428, participants: 3182, startsAt: daysFromNow(-12), endsAt: daysFromNow(18),
    reward: { xp: 1000, badge: { id: 'cb-community-10k', name: 'Weltenbummler', icon: '🌍' } },
  },
  {
    id: 'c-porsche', scope: 'community', rarity: 'rare', icon: '🏎️', title: '10.000 Porsche Spots', description: 'Die Community jagt Porsche – jeder Porsche-Spot zählt',
    rule: { measure: 'spots', count: 1, filter: { brandIds: ['porsche'] } }, goal: 10000, baseProgress: 8911, participants: 1760, startsAt: daysFromNow(-20), endsAt: daysFromNow(10),
    reward: { xp: 500, decorationId: 'deco-porsche-sign' },
  },
  {
    id: 'c-super', scope: 'community', rarity: 'epic', icon: '⚡', title: '5.000 Supercars', description: 'Supercars & Hypercars aus aller Welt',
    rule: { measure: 'spots', count: 1, filter: { carClasses: ['supercar', 'hypercar'] } }, goal: 5000, baseProgress: 3304, participants: 2240, startsAt: daysFromNow(-5), endsAt: daysFromNow(25),
    reward: { xp: 1000, cardDesignId: 'neon' },
  },
  {
    id: 'c-rare', scope: 'community', rarity: 'legendary', icon: '💎', title: '1.000 seltene Autos', description: 'Nur Selten und höher zählt',
    rule: { measure: 'spots', count: 1, filter: { minRarity: 'rare' } }, goal: 1000, baseProgress: 612, participants: 980, startsAt: daysFromNow(-3), endsAt: daysFromNow(4),
    reward: { xp: 2000, badge: { id: 'cb-community-rare', name: 'Seltenheits-Sammler', icon: '💎' }, title: 'Community-Held' },
  },
  {
    id: 'c-weekend', scope: 'community', rarity: 'uncommon', icon: '🗓️', title: 'Spotting Weekend', description: 'Ein Wochenende, 20.000 Spots – raus auf die Straße!',
    rule: { measure: 'spots', count: 1 }, goal: 20000, baseProgress: 15890, participants: 5120, startsAt: daysFromNow(-1), endsAt: daysFromNow(2),
    reward: { xp: 250 },
  },
];

// ─── Streak-Boni ─────────────────────────────────────────────────────────
export const STREAK_REWARDS: { days: number; xp: number; badge?: { id: string; name: string; icon: string } }[] = [
  { days: 3, xp: 150 },
  { days: 7, xp: 500, badge: { id: 'cb-streak-7', name: '7-Tage-Streak', icon: '🔥' } },
  { days: 14, xp: 1000, badge: { id: 'cb-streak-14', name: 'Unaufhaltsam', icon: '⚡' } },
  { days: 30, xp: 3000, badge: { id: 'cb-streak-30', name: 'Challenge-Legende', icon: '👑' } },
];

// Car-Card-Designs (Challenge-Belohnungen) → siehe data/cardDesigns.ts
export { CARD_DESIGNS } from './cardDesigns';
