import type { CardEffectId, CardFrameId, CardStyle, CardTextStyle, ID, Rarity } from '../types/models';

/**
 * CUSTOM SPOT CARDS – SpotDrive Pro
 * ─────────────────────────────────
 * Alle Designs, Hintergründe, Rahmen, Effekte und Schriften als Registry.
 * Neue Einträge einfach hier ergänzen – Editor und Karten lesen die Listen automatisch.
 * Die Optik steckt in global.css (Klassen car-card--theme-*, --frame-*, --fx-*, --text-*).
 */

// ─── Freischaltung ────────────────────────────────────────────────────────

export type UnlockRule =
  | { kind: 'free' }
  | { kind: 'pro' }
  | { kind: 'level'; level: number }
  | { kind: 'raritySpots'; minRarity: Rarity; count: number }
  | { kind: 'challenge' };

export interface CardTheme {
  id: ID;
  name: string;
  emoji: string;
  description: string;
  unlock: UnlockRule;
  /** erlaubte Hintergrundfarben (erste = Standard) */
  palette: string[];
  defaults: Omit<CardStyle, 'themeId' | 'color'>;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: 'standard',
    name: 'Standard',
    emoji: '🃏',
    description: 'Klassische SpotDrive-Karte in der Farbe der Seltenheit',
    unlock: { kind: 'free' },
    palette: ['rarity'],
    defaults: { backgroundId: 'rarity', frameId: 'rarity', effects: [], textStyle: 'modern' },
  },
  {
    id: 'dark',
    name: 'Dark',
    emoji: '🌑',
    description: 'Minimalistisch, tiefschwarz, maximaler Fokus aufs Auto',
    unlock: { kind: 'pro' },
    palette: ['#1b1e24', '#1a2233', '#261a1a', '#17241d', '#241a2b', '#2a2620'],
    defaults: { backgroundId: 'midnight', frameId: 'clean', effects: [], textStyle: 'modern' },
  },
  {
    id: 'carbon',
    name: 'Carbon',
    emoji: '🖤',
    description: 'Sichtcarbon wie im Innenraum eines Supersportwagens',
    unlock: { kind: 'pro' },
    palette: ['#2a2d33', '#23324a', '#3a2222', '#1f3a2c', '#3a2f1a', '#332447'],
    defaults: { backgroundId: 'carbon-weave', frameId: 'clean', effects: ['carbon'], textStyle: 'tech' },
  },
  {
    id: 'racing',
    name: 'Racing',
    emoji: '🏁',
    description: 'Rennstreifen und Startnummer-Look',
    unlock: { kind: 'level', level: 10 },
    palette: ['#d7263d', '#1e5eff', '#ffb020', '#1fae5b', '#f2f2f2', '#ff5a1f'],
    defaults: { backgroundId: 'auto-stripes', frameId: 'racing', effects: [], textStyle: 'racing' },
  },
  {
    id: 'luxury',
    name: 'Luxury',
    emoji: '🏆',
    description: 'Edles Leder-Dunkel mit Goldakzenten',
    unlock: { kind: 'pro' },
    palette: ['#2b2116', '#16222c', '#2c1624', '#13261d', '#1e1e28', '#2a1a14'],
    defaults: { backgroundId: 'gradient-radial', frameId: 'gold', effects: ['metallic'], textStyle: 'elegant' },
  },
  {
    id: 'neon',
    name: 'Neon',
    emoji: '🌌',
    description: 'Nachtfahrt durch Tokio – leuchtende Kanten',
    unlock: { kind: 'pro' },
    palette: ['#ff3d7f', '#3aa0ff', '#b26bff', '#1fd1b2', '#ffe53b', '#ff7a1a'],
    defaults: { backgroundId: 'pattern-grid', frameId: 'neon', effects: ['glow'], textStyle: 'tech' },
  },
  {
    id: 'gold',
    name: 'Gold',
    emoji: '🪙',
    description: 'Gebürstetes Gold mit Lichtreflexion',
    unlock: { kind: 'pro' },
    palette: ['#c8961e', '#b07a12', '#d9b25a', '#a8864a', '#c77b30', '#9c8f6a'],
    defaults: { backgroundId: 'metal-brushed', frameId: 'gold', effects: ['metallic', 'shine'], textStyle: 'elegant' },
  },
  {
    id: 'electric',
    name: 'Electric',
    emoji: '⚡',
    description: 'Hochspannung – für E-Hypercars wie Nevera & Taycan',
    unlock: { kind: 'pro' },
    palette: ['#37e2ff', '#7cff4f', '#ffe53b', '#8a7bff', '#2bffc6', '#ff4fd8'],
    defaults: { backgroundId: 'auto-speed', frameId: 'neon', effects: ['particles'], textStyle: 'tech' },
  },
  {
    id: 'motorsport',
    name: 'Motorsport',
    emoji: '🏎️',
    description: 'Zielflagge, Boxenfunk, Podium',
    unlock: { kind: 'pro' },
    palette: ['#ff5a1f', '#e10600', '#00a19c', '#0090ff', '#ffd400', '#7a7f87'],
    defaults: { backgroundId: 'auto-checker', frameId: 'racing', effects: ['shine'], textStyle: 'racing' },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    emoji: '💎',
    description: 'Facettenschliff mit funkelnden Reflexionen',
    unlock: { kind: 'raritySpots', minRarity: 'legendary', count: 10 },
    palette: ['#9fdcff', '#d6c7ff', '#ffc7e3', '#c7fff1', '#e8eef5', '#ffe9b0'],
    defaults: { backgroundId: 'pattern-facets', frameId: 'chrome', effects: ['shine', 'particles'], textStyle: 'elegant' },
  },
  {
    id: 'legendary',
    name: 'Legendary',
    emoji: '👑',
    description: 'Goldene Aura für echte Legenden',
    unlock: { kind: 'raritySpots', minRarity: 'legendary', count: 3 },
    palette: ['#ffb020', '#ff7a1a', '#ffd86b', '#ff3d7f', '#b26bff', '#ffe9b0'],
    defaults: { backgroundId: 'gradient-radial', frameId: 'gold', effects: ['glow', 'particles'], textStyle: 'bold' },
  },
  {
    id: 'master',
    name: 'Master Card',
    emoji: '🎖️',
    description: 'Nur für Spotter ab Level 50',
    unlock: { kind: 'level', level: 50 },
    palette: ['#b26bff', '#ffcf6b', '#ff3d7f', '#37e2ff', '#e8eef5', '#1fd1b2'],
    defaults: { backgroundId: 'metal-chrome', frameId: 'chrome', effects: ['glow', 'shine'], textStyle: 'bold' },
  },
  {
    id: 'holo',
    name: 'Holo-Regenbogen',
    emoji: '🌈',
    description: 'Nur über legendäre Challenges erhältlich',
    unlock: { kind: 'challenge' },
    palette: ['#b26bff', '#3aa0ff', '#1fd1b2', '#ff3d7f', '#ffb020', '#e8eef5'],
    defaults: { backgroundId: 'gradient-duo', frameId: 'rarity', effects: ['shine', 'float'], textStyle: 'modern' },
  },
];

export const themeById = (id: ID) => CARD_THEMES.find((t) => t.id === id) ?? CARD_THEMES[0];

/** Namen für Challenge-Belohnungen (alte IDs bleiben lesbar). */
export const CARD_DESIGNS: Record<string, { name: string }> = Object.fromEntries(CARD_THEMES.map((t) => [t.id, { name: `${t.emoji} ${t.name}` }]));

/** Alte Design-IDs (v0.7) → neue Themes */
export const LEGACY_DESIGN_IDS: Record<string, ID> = {
  'design-standard': 'standard',
  'design-carbon': 'racing',
  'design-gold': 'legendary',
  'design-neon': 'neon',
  'design-holo': 'holo',
};

// ─── Hintergründe ────────────────────────────────────────────────────────

export type BackgroundCategory = 'Vorlagen' | 'Verläufe' | 'Muster' | 'Automotive' | 'Carbon' | 'Metall';

export interface CardBackground {
  id: ID;
  name: string;
  category: BackgroundCategory;
  /** erzeugt den CSS-Hintergrund aus der gewählten Farbe */
  css: (c: string) => string;
}

const mix = (c: string, pct: number, base = '#0b0c0f') => `color-mix(in srgb, ${c} ${pct}%, ${base})`;

export const CARD_BACKGROUNDS: CardBackground[] = [
  // Vorlagen
  { id: 'rarity', name: 'Seltenheit', category: 'Vorlagen', css: () => `linear-gradient(160deg, color-mix(in srgb, var(--rc) 22%, #15171b), #0d0e11 55%, color-mix(in srgb, var(--rc) 14%, #0d0e11))` },
  { id: 'midnight', name: 'Midnight', category: 'Vorlagen', css: (c) => `radial-gradient(120% 80% at 50% 0%, ${mix(c, 70)} 0%, #0a0b0e 70%)` },
  { id: 'aurora', name: 'Aurora', category: 'Vorlagen', css: (c) => `radial-gradient(90% 60% at 10% 0%, ${mix(c, 45)} 0%, transparent 60%), radial-gradient(80% 60% at 100% 100%, color-mix(in srgb, ${c} 30%, #3aa0ff 20%) 0%, transparent 60%), #0b0c10` },
  { id: 'nightdrive', name: 'Night Drive', category: 'Vorlagen', css: (c) => `linear-gradient(180deg, #06070a 0%, ${mix(c, 35)} 62%, #06070a 100%), repeating-linear-gradient(90deg, transparent 0 22px, rgba(255,255,255,.04) 22px 23px)` },
  // Verläufe
  { id: 'gradient-diagonal', name: 'Diagonal', category: 'Verläufe', css: (c) => `linear-gradient(145deg, ${mix(c, 75)} 0%, #0c0d10 60%, ${mix(c, 30)} 100%)` },
  { id: 'gradient-radial', name: 'Spotlight', category: 'Verläufe', css: (c) => `radial-gradient(circle at 50% 28%, ${mix(c, 70)} 0%, ${mix(c, 22)} 45%, #08090b 100%)` },
  { id: 'gradient-duo', name: 'Duo', category: 'Verläufe', css: (c) => `linear-gradient(135deg, ${mix(c, 70)} 0%, color-mix(in srgb, ${c} 40%, #3aa0ff 30%) 50%, ${mix(c, 20)} 100%)` },
  // Muster
  { id: 'pattern-dots', name: 'Punkte', category: 'Muster', css: (c) => `radial-gradient(color-mix(in srgb, ${c} 45%, transparent) 1.2px, transparent 1.6px) 0 0 / 10px 10px, linear-gradient(160deg, ${mix(c, 30)}, #0b0c0f)` },
  { id: 'pattern-stripes', name: 'Streifen', category: 'Muster', css: (c) => `repeating-linear-gradient(135deg, ${mix(c, 32)} 0 8px, ${mix(c, 22)} 8px 16px)` },
  { id: 'pattern-grid', name: 'Grid', category: 'Muster', css: (c) => `linear-gradient(color-mix(in srgb, ${c} 28%, transparent) 1px, transparent 1px) 0 0 / 16px 16px, linear-gradient(90deg, color-mix(in srgb, ${c} 28%, transparent) 1px, transparent 1px) 0 0 / 16px 16px, radial-gradient(circle at 50% 110%, ${mix(c, 50)}, #07080a 70%)` },
  { id: 'pattern-facets', name: 'Facetten', category: 'Muster', css: (c) => `conic-gradient(from 45deg at 30% 30%, ${mix(c, 40)}, ${mix(c, 18)}, ${mix(c, 55)}, ${mix(c, 25)}, ${mix(c, 40)}) 0 0 / 38px 38px, linear-gradient(160deg, ${mix(c, 40)}, #0b0c10)` },
  // Automotive
  { id: 'auto-checker', name: 'Zielflagge', category: 'Automotive', css: (c) => `repeating-conic-gradient(rgba(255,255,255,.07) 0 25%, transparent 0 50%) 0 0 / 14px 14px, linear-gradient(160deg, ${mix(c, 55)}, #0a0b0d 70%)` },
  { id: 'auto-stripes', name: 'Rennstreifen', category: 'Automotive', css: (c) => `linear-gradient(90deg, transparent 38%, ${c} 38% 45%, transparent 45% 55%, ${c} 55% 62%, transparent 62%), linear-gradient(170deg, #17191e, #0a0b0d)` },
  { id: 'auto-tread', name: 'Reifenprofil', category: 'Automotive', css: (c) => `repeating-linear-gradient(60deg, transparent 0 6px, rgba(0,0,0,.35) 6px 10px), repeating-linear-gradient(-60deg, transparent 0 6px, rgba(0,0,0,.35) 6px 10px), linear-gradient(160deg, ${mix(c, 35, '#1a1b1f')}, #0d0e11)` },
  { id: 'auto-speed', name: 'Speed Lines', category: 'Automotive', css: (c) => `repeating-linear-gradient(100deg, transparent 0 14px, color-mix(in srgb, ${c} 22%, transparent) 14px 15px, transparent 15px 36px), radial-gradient(circle at 80% 20%, ${mix(c, 45)}, #07080a 70%)` },
  // Carbon
  { id: 'carbon-weave', name: 'Carbon', category: 'Carbon', css: (c) => `linear-gradient(27deg, #151618 5px, transparent 5px) 0 5px / 20px 20px, linear-gradient(207deg, #151618 5px, transparent 5px) 10px 0 / 20px 20px, linear-gradient(27deg, #222 5px, transparent 5px) 0 10px / 20px 20px, linear-gradient(207deg, #222 5px, transparent 5px) 10px 5px / 20px 20px, linear-gradient(90deg, #1b1b1b 10px, transparent 10px) 0 0 / 20px 20px, linear-gradient(#1d1d1d 25%, #1a1a1a 25%, #1a1a1a 50%, transparent 50%, transparent 75%, #242424 75%, #242424) 0 0 / 20px 20px, ${mix(c, 60, '#131313')}` },
  { id: 'carbon-forged', name: 'Forged Carbon', category: 'Carbon', css: (c) => `radial-gradient(ellipse 6px 3px at 20% 30%, rgba(255,255,255,.08), transparent), radial-gradient(ellipse 5px 8px at 70% 60%, rgba(255,255,255,.06), transparent), radial-gradient(ellipse 9px 4px at 40% 80%, rgba(0,0,0,.4), transparent) 0 0 / 24px 24px, linear-gradient(160deg, ${mix(c, 30, '#16171a')}, #0b0b0d)` },
  // Metall
  { id: 'metal-brushed', name: 'Gebürstet', category: 'Metall', css: (c) => `repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 3px), linear-gradient(160deg, ${mix(c, 70, '#222')} 0%, ${mix(c, 35, '#0f0f10')} 55%, ${mix(c, 60, '#1a1a1a')} 100%)` },
  { id: 'metal-chrome', name: 'Chrom', category: 'Metall', css: (c) => `linear-gradient(170deg, ${mix(c, 30, '#3a3f47')} 0%, #101216 38%, ${mix(c, 40, '#4a505a')} 52%, #0d0f12 70%, ${mix(c, 25, '#2a2e35')} 100%)` },
  { id: 'metal-titanium', name: 'Titan', category: 'Metall', css: (c) => `repeating-radial-gradient(circle at 50% 120%, rgba(255,255,255,.035) 0 2px, transparent 2px 5px), linear-gradient(160deg, ${mix(c, 30, '#2c3036')}, #121417)` },
];

export const BACKGROUND_CATEGORIES: BackgroundCategory[] = ['Vorlagen', 'Verläufe', 'Muster', 'Automotive', 'Carbon', 'Metall'];
export const backgroundById = (id: ID) => CARD_BACKGROUNDS.find((b) => b.id === id) ?? CARD_BACKGROUNDS[0];

// ─── Rahmen, Effekte, Schrift ────────────────────────────────────────────

export const CARD_FRAMES: { id: CardFrameId; name: string; description: string }[] = [
  { id: 'rarity', name: 'Seltenheit', description: 'Automatisch: je seltener, desto spektakulärer' },
  { id: 'clean', name: 'Clean', description: 'Feine, ruhige Linie' },
  { id: 'double', name: 'Doppelt', description: 'Zwei Linien in Akzentfarbe' },
  { id: 'racing', name: 'Racing', description: 'Zielflaggen-Rand' },
  { id: 'gold', name: 'Gold', description: 'Goldrahmen mit Ecken' },
  { id: 'neon', name: 'Neon', description: 'Leuchtende Kante' },
  { id: 'chrome', name: 'Chrom', description: 'Polierter Metallrand' },
];

export const CARD_EFFECTS: { id: CardEffectId; name: string; icon: string; description: string }[] = [
  { id: 'glow', name: 'Glow', icon: '✨', description: 'Weiches Leuchten um die Karte' },
  { id: 'float', name: 'Animation', icon: '🌊', description: 'Hintergrund bewegt sich langsam' },
  { id: 'particles', name: 'Partikel', icon: '💫', description: 'Feine aufsteigende Funken' },
  { id: 'shine', name: 'Lichtreflexion', icon: '🔆', description: 'Lichtstreifen gleitet über die Karte' },
  { id: 'carbon', name: 'Carbon-Struktur', icon: '🖤', description: 'Feine Carbon-Textur' },
  { id: 'metallic', name: 'Metallic', icon: '🪩', description: 'Metallischer Schimmer' },
];
export const MAX_EFFECTS = 3;

export const CARD_TEXT_STYLES: { id: CardTextStyle; name: string }[] = [
  { id: 'modern', name: 'Modern' },
  { id: 'racing', name: 'Racing' },
  { id: 'elegant', name: 'Elegant' },
  { id: 'tech', name: 'Tech' },
  { id: 'bold', name: 'Bold' },
];

// ─── Styles & Vorlagen ───────────────────────────────────────────────────

export function styleFromTheme(themeId: ID, color?: string): CardStyle {
  const t = themeById(themeId);
  return { themeId: t.id, color: color && t.palette.includes(color) ? color : t.palette[0], ...t.defaults, effects: [...t.defaults.effects] };
}

/** Kostenloser Standard (auch für Free-Nutzer) – Seltenheits-Designs sind immer aktiv. */
export const FREE_STYLE: CardStyle = styleFromTheme('standard');

/** Test-Designs / Beispiel-Cards – mit einem Tipp übernehmen. */
export const CARD_PRESETS: { id: ID; name: string; style: CardStyle }[] = [
  { id: 'p-stealth', name: 'Stealth', style: { themeId: 'dark', backgroundId: 'midnight', color: '#1b1e24', frameId: 'clean', effects: [], textStyle: 'modern' } },
  { id: 'p-night-carbon', name: 'Night Carbon', style: { themeId: 'carbon', backgroundId: 'carbon-weave', color: '#23324a', frameId: 'double', effects: ['carbon', 'shine'], textStyle: 'tech' } },
  { id: 'p-le-mans', name: 'Le Mans', style: { themeId: 'motorsport', backgroundId: 'auto-checker', color: '#0090ff', frameId: 'racing', effects: ['shine'], textStyle: 'racing' } },
  { id: 'p-monaco', name: 'Monaco', style: { themeId: 'luxury', backgroundId: 'gradient-radial', color: '#16222c', frameId: 'gold', effects: ['metallic'], textStyle: 'elegant' } },
  { id: 'p-tokyo', name: 'Tokyo Neon', style: { themeId: 'neon', backgroundId: 'pattern-grid', color: '#ff3d7f', frameId: 'neon', effects: ['glow', 'particles'], textStyle: 'tech' } },
  { id: 'p-gold-rush', name: 'Gold Rush', style: { themeId: 'gold', backgroundId: 'metal-brushed', color: '#c8961e', frameId: 'gold', effects: ['metallic', 'shine'], textStyle: 'elegant' } },
  { id: 'p-voltage', name: 'Voltage', style: { themeId: 'electric', backgroundId: 'auto-speed', color: '#37e2ff', frameId: 'neon', effects: ['particles', 'glow'], textStyle: 'tech' } },
  { id: 'p-diamond', name: 'Diamond Ice', style: { themeId: 'diamond', backgroundId: 'pattern-facets', color: '#9fdcff', frameId: 'chrome', effects: ['shine', 'particles'], textStyle: 'elegant' } },
  { id: 'p-hall-of-fame', name: 'Hall of Fame', style: { themeId: 'legendary', backgroundId: 'gradient-radial', color: '#ffb020', frameId: 'gold', effects: ['glow', 'particles'], textStyle: 'bold' } },
  { id: 'p-grid-start', name: 'Startaufstellung', style: { themeId: 'racing', backgroundId: 'auto-stripes', color: '#d7263d', frameId: 'racing', effects: [], textStyle: 'racing' } },
];

/** Beispiel-Standards wie in der Anforderung (Common → Dark, Rare → Carbon, Epic → Neon, Legendary → Diamond). */
export const DEMO_CARD_STYLES = {
  byRarity: {
    common: styleFromTheme('dark'),
    rare: styleFromTheme('carbon'),
    epic: styleFromTheme('neon'),
    legendary: styleFromTheme('diamond'),
  } as Partial<Record<Rarity, CardStyle>>,
  byModel: {} as Record<ID, CardStyle>,
};

/** Beispielautos je Seltenheit für die Editor-Vorschau */
export const SAMPLE_MODEL_BY_RARITY: Record<Rarity, ID> = {
  common: 'porsche-911-carrera',
  rare: 'ferrari-296-gtb',
  epic: 'porsche-911-gt3-rs',
  exotic: 'bugatti-chiron-super-sport',
  legendary: 'ferrari-f40',
  impossible: 'bugatti-divo',
};
