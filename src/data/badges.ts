import type { BadgeDefinition, ID, Spot } from '../types/models';
import { getModel } from './cars';
import { atLeast } from '../lib/rarity';

/**
 * Badge-Definitionen. Jede Definition hat eine `progress`-Funktion,
 * die aus den Spots des Nutzers den aktuellen Wert berechnet.
 * Neues Badge = neuer Eintrag hier, sonst nichts.
 */
export interface BadgeRule extends BadgeDefinition {
  progress: (mySpots: Spot[]) => number;
}

const countBrand = (brandId: ID) => (s: Spot[]) => s.filter((x) => getModel(x.modelId).brandId === brandId).length;
const distinctModels = (s: Spot[]) => new Set(s.map((x) => x.modelId)).size;
const distinctBrands = (s: Spot[]) => new Set(s.map((x) => getModel(x.modelId).brandId)).size;

export const BADGES: BadgeRule[] = [
  { id: 'first-spot', name: 'First Spot', description: 'Ersten Spot erstellt', icon: '📸', target: 1, xpReward: 50, tier: 'bronze', progress: (s) => s.length },
  { id: 'ferrari-hunter', name: 'Ferrari Hunter', description: '10 Ferrari entdeckt', icon: '🐎', target: 10, xpReward: 300, tier: 'gold', progress: countBrand('ferrari') },
  { id: 'porsche-collector', name: 'Porsche Collector', description: '25 Porsche entdeckt', icon: '🛡️', target: 25, xpReward: 400, tier: 'gold', progress: countBrand('porsche') },
  { id: 'lambo-hunter', name: 'Raging Bull', description: '10 Lamborghini entdeckt', icon: '🐂', target: 10, xpReward: 300, tier: 'gold', progress: countBrand('lamborghini') },
  {
    id: 'supercar-hunter', name: 'Supercar Hunter', description: '50 Supercars entdeckt', icon: '⚡', target: 50, xpReward: 750, tier: 'platinum',
    progress: (s) => s.filter((x) => ['supercar', 'hypercar'].includes(getModel(x.modelId).carClass)).length,
  },
  { id: 'rare-hunter', name: 'Rare Hunter', description: '10 seltene Autos entdeckt', icon: '💎', target: 10, xpReward: 500, tier: 'silver', progress: (s) => s.filter((x) => atLeast(getModel(x.modelId).rarity, 'rare')).length },
  { id: 'unicorn', name: 'Unicorn', description: 'Ein legendäres Auto entdeckt', icon: '🦄', target: 1, xpReward: 250, tier: 'platinum', progress: (s) => s.filter((x) => atLeast(getModel(x.modelId).rarity, 'legendary')).length },
  { id: 'exotic-hunter', name: 'Exoten-Jäger', description: '5 exotische Autos entdeckt', icon: '🌴', target: 5, xpReward: 400, tier: 'gold', progress: (s) => s.filter((x) => atLeast(getModel(x.modelId).rarity, 'exotic')).length },
  { id: 'impossible', name: 'Das Unmögliche', description: 'Ein unmögliches Auto entdeckt', icon: '🌌', target: 1, xpReward: 1000, tier: 'platinum', progress: (s) => s.filter((x) => getModel(x.modelId).rarity === 'impossible').length },
  { id: 'collector-10', name: 'Sammler', description: '10 verschiedene Modelle', icon: '🗂️', target: 10, xpReward: 200, tier: 'silver', progress: distinctModels },
  { id: 'brand-explorer', name: 'Brand Explorer', description: '8 verschiedene Marken', icon: '🧭', target: 8, xpReward: 250, tier: 'silver', progress: distinctBrands },
  { id: 'filmmaker', name: 'Filmmaker', description: '5 Video-Spots', icon: '🎬', target: 5, xpReward: 150, tier: 'bronze', progress: (s) => s.filter((x) => x.media.type === 'video').length },
];
