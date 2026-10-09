import type { Rarity } from '../types/models';

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'exotic', 'legendary', 'impossible'];

/**
 * Seltenheitsstufen wie in einem Sammelspiel.
 *   Gewöhnlich  – Alltagsautos
 *   Selten      – Premium-Sportwagen & Luxus (911 Carrera, Ferrari Roma, Rolls-Royce Ghost)
 *   Episch      – Top-Supersportwagen & Sondermodelle (911 GT3 RS, SF90, 765LT)
 *   Exotisch    – Hypercars aus Kleinserie (Bugatti Chiron, McLaren Senna, Porsche 918)
 *   Legendär    – Ikonen & streng limitierte Hypercars (Ferrari F40, LaFerrari, Koenigsegg Jesko)
 *   Unmöglich   – Einzelstücke & < 100 Exemplare (Bugatti Divo, Lamborghini Sián, Bentley Batur)
 */
export const RARITY_META: Record<Rarity, { label: string; emoji: string; color: string; xp: number }> = {
  common: { label: 'Gewöhnlich', emoji: '⚪', color: '#9aa3ad', xp: 0 },
  rare: { label: 'Selten', emoji: '🔷', color: '#3aa0ff', xp: 250 },
  epic: { label: 'Episch', emoji: '💜', color: '#b26bff', xp: 500 },
  exotic: { label: 'Exotisch', emoji: '🌴', color: '#1fd1b2', xp: 750 },
  legendary: { label: 'Legendär', emoji: '👑', color: '#ffb020', xp: 1000 },
  impossible: { label: 'Unmöglich', emoji: '🌌', color: '#ff3d7f', xp: 2500 },
};

export const rarityRank = (r: Rarity) => RARITY_ORDER.indexOf(r);
export const atLeast = (r: Rarity, min: Rarity) => rarityRank(r) >= rarityRank(min);

/** Alte Werte (v0.1–v0.4) auf die neuen Stufen abbilden. */
export function normalizeRarity(r: string | undefined): Rarity {
  if (r === 'very_rare') return 'epic';
  if (r === 'extreme') return 'legendary';
  return (RARITY_ORDER as string[]).includes(r ?? '') ? (r as Rarity) : 'common';
}
