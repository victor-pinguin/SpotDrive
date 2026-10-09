import type { CardStyle, CardStyleSettings, ID, Rarity, Spot } from '../types/models';
import { CARD_THEMES, FREE_STYLE, MAX_EFFECTS, backgroundById, themeById, type CardTheme } from '../data/cardDesigns';
import { getModel } from '../data/cars';
import { atLeast, RARITY_META } from './rarity';

export interface UnlockContext {
  isPro: boolean;
  level: number;
  /** Spots des Nutzers je Seltenheit (für „10 Legendary Spots“) */
  spots: Spot[];
  userId: ID;
  /** über Challenges freigeschaltete Designs */
  challengeUnlocks: ID[];
}

export interface ThemeStatus {
  unlocked: boolean;
  /** z. B. „Level 10“, „10 legendäre Spots“ */
  requirement?: string;
  /** Fortschritt 0..1 für die Anzeige */
  progress?: number;
  progressLabel?: string;
  /** Pro-Kennzeichnung (alles außer Standard) */
  pro: boolean;
}

export function themeStatus(t: CardTheme, ctx: UnlockContext): ThemeStatus {
  const u = t.unlock;
  const viaChallenge = ctx.challengeUnlocks.includes(t.id);
  if (u.kind === 'free') return { unlocked: true, pro: false };
  if (!ctx.isPro) return { unlocked: false, pro: true, requirement: 'SpotDrive Pro' };
  if (u.kind === 'pro') return { unlocked: true, pro: true };
  if (u.kind === 'challenge') return { unlocked: viaChallenge, pro: true, requirement: 'Legendäre Challenge' };
  if (u.kind === 'level') {
    const ok = ctx.level >= u.level || viaChallenge;
    return { unlocked: ok, pro: true, requirement: `Level ${u.level}`, progress: Math.min(1, ctx.level / u.level), progressLabel: `Level ${ctx.level}/${u.level}` };
  }
  const n = ctx.spots.filter((s) => s.userId === ctx.userId && atLeast(getModel(s.modelId).rarity, u.minRarity)).length;
  return {
    unlocked: n >= u.count || viaChallenge,
    pro: true,
    requirement: `${u.count} ${RARITY_META[u.minRarity].label}-Spots`,
    progress: Math.min(1, n / u.count),
    progressLabel: `${Math.min(n, u.count)}/${u.count}`,
  };
}

export const unlockedThemeIds = (ctx: UnlockContext) => new Set(CARD_THEMES.filter((t) => themeStatus(t, ctx).unlocked).map((t) => t.id));

/** Hält einen Style gültig: bekannte IDs, Farbe aus der erlaubten Palette, max. 3 Effekte. */
export function sanitizeStyle(s: CardStyle): CardStyle {
  const t = themeById(s.themeId);
  return {
    themeId: t.id,
    backgroundId: backgroundById(s.backgroundId).id,
    color: t.palette.includes(s.color) ? s.color : t.palette[0],
    frameId: s.frameId ?? 'rarity',
    effects: [...new Set(s.effects ?? [])].slice(0, MAX_EFFECTS),
    textStyle: s.textStyle ?? 'modern',
  };
}

/**
 * Welches Design bekommt eine Card?
 *   Free-Nutzer → Standard (Seltenheits-Rahmen bleiben aktiv)
 *   Pro         → einzelne Card → Standard der Seltenheit → „Alle“ → Standard
 * Gesperrte Designs (z. B. Level zu niedrig) fallen auf Standard zurück.
 */
export function resolveCardStyle(modelId: ID, rarity: Rarity, settings: CardStyleSettings, ctx: UnlockContext, unlocked = unlockedThemeIds(ctx)): CardStyle {
  if (!ctx.isPro) return FREE_STYLE;
  const s = settings.byModel[modelId] ?? settings.byRarity[rarity] ?? settings.all;
  if (!s || !unlocked.has(s.themeId)) return FREE_STYLE;
  return sanitizeStyle(s);
}

/** CSS-Hintergrund einer Card */
export const backgroundCss = (s: CardStyle) => backgroundById(s.backgroundId).css(s.color === 'rarity' ? 'var(--rc)' : s.color);

/** Akzentfarbe (für Rahmen, Glow, Text) – Standard nutzt die Seltenheitsfarbe */
export const accentOf = (s: CardStyle) => (s.color === 'rarity' ? 'var(--rc)' : s.color);
