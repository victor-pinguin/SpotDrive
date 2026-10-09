import type { GarageConfig, GarageItem, GarageItemCategory, ID } from '../types/models';

/**
 * Registry aller Garage-Designelemente.
 * → Neues Element hinzufügen = einfach ein Objekt ergänzen. Die Showroom-Szene
 *   (components/GarageScene.tsx) liest `style` als CSS-Variablen/Styles ein.
 * → Später können hier auch 3D-Assets / Bild-URLs referenziert werden.
 */
export const GARAGE_ITEMS: GarageItem[] = [
  // Boden
  { id: 'floor-concrete', category: 'floor', name: 'Beton poliert', unlockLevel: 1, style: { background: 'linear-gradient(180deg,#2a2d31,#141619)' } },
  { id: 'floor-epoxy', category: 'floor', name: 'Epoxy Grau', unlockLevel: 3, style: { background: 'linear-gradient(180deg,#3a3f46,#1b1e22)' } },
  { id: 'floor-checker', category: 'floor', name: 'Racing Checker', unlockLevel: 8, style: { background: 'repeating-conic-gradient(#1c1e21 0 25%,#2c2f33 0 50%) 0 0/48px 48px' } },
  { id: 'floor-carbon', category: 'floor', name: 'Carbon', unlockLevel: 12, style: { background: 'repeating-linear-gradient(45deg,#161719 0 6px,#202226 6px 12px)' } },
  { id: 'floor-marble', category: 'floor', name: 'Schwarzer Marmor', unlockLevel: 25, pro: true, style: { background: 'radial-gradient(ellipse at 30% 40%,#3b3b42,#0e0e11 70%)' } },

  // Wände
  { id: 'wall-graphite', category: 'wall', name: 'Graphit', unlockLevel: 1, style: { background: 'linear-gradient(180deg,#17191c,#202328)' } },
  { id: 'wall-panels', category: 'wall', name: 'Akustik-Paneele', unlockLevel: 4, style: { background: 'repeating-linear-gradient(90deg,#1a1c20 0 38px,#15171a 38px 40px)' } },
  { id: 'wall-brick', category: 'wall', name: 'Loft-Ziegel', unlockLevel: 7, style: { background: 'repeating-linear-gradient(0deg,#2a1c19 0 18px,#1a1110 18px 20px),#2a1c19' } },
  { id: 'wall-wood', category: 'wall', name: 'Nussbaum', unlockLevel: 15, style: { background: 'repeating-linear-gradient(90deg,#3a2718 0 60px,#2e1f13 60px 62px)' } },
  { id: 'wall-glass', category: 'wall', name: 'Glasfront', unlockLevel: 30, pro: true, style: { background: 'linear-gradient(180deg,rgba(80,120,160,.25),rgba(20,30,40,.6)),repeating-linear-gradient(90deg,transparent 0 120px,#0c0f12 120px 124px)' } },

  // Licht
  { id: 'light-cool', category: 'lighting', name: 'Studio Kühlweiß', unlockLevel: 1, style: { '--light': 'rgba(220,235,255,.55)', '--light2': 'rgba(200,220,255,.12)' } },
  { id: 'light-warm', category: 'lighting', name: 'Warm Gold', unlockLevel: 2, style: { '--light': 'rgba(255,205,140,.55)', '--light2': 'rgba(255,180,90,.12)' } },
  { id: 'light-neon', category: 'lighting', name: 'Neon Blau', unlockLevel: 6, style: { '--light': 'rgba(60,160,255,.6)', '--light2': 'rgba(40,120,255,.18)' } },
  { id: 'light-sunset', category: 'lighting', name: 'Sunset', unlockLevel: 10, style: { '--light': 'rgba(255,90,31,.55)', '--light2': 'rgba(255,60,120,.16)' } },
  { id: 'light-rgb', category: 'lighting', name: 'RGB Show', unlockLevel: 20, pro: true, style: { '--light': 'rgba(190,80,255,.6)', '--light2': 'rgba(0,220,200,.18)' } },

  // Hintergrund (Fenster/Ausblick hinter der Wand)
  { id: 'bg-none', category: 'background', name: 'Geschlossen', unlockLevel: 1, style: { background: 'transparent' } },
  { id: 'bg-city', category: 'background', name: 'City Night', unlockLevel: 5, style: { background: 'linear-gradient(180deg,#0b1020 0%,#1a2140 60%,#ff5a1f33 100%)' } },
  { id: 'bg-alps', category: 'background', name: 'Alpenpass', unlockLevel: 12, style: { background: 'linear-gradient(180deg,#9cc3e6 0%,#dfe9f2 55%,#6b7a86 56%,#3b4650 100%)' } },
  { id: 'bg-track', category: 'background', name: 'Rennstrecke', unlockLevel: 25, pro: true, style: { background: 'linear-gradient(180deg,#1b2a3a 0%,#2d4a5e 50%,#2f3a2a 51%,#1a2016 100%)' } },

  // Deko
  { id: 'deco-tires', category: 'decoration', name: 'Reifenstapel', unlockLevel: 2, glyph: '🛞', style: { left: '4%', bottom: '30%' } },
  { id: 'deco-tools', category: 'decoration', name: 'Werkzeugwand', unlockLevel: 4, glyph: '🧰', style: { right: '5%', bottom: '32%' } },
  { id: 'deco-flag', category: 'decoration', name: 'Zielflagge', unlockLevel: 6, glyph: '🏁', style: { left: '10%', top: '12%' } },
  { id: 'deco-trophy', category: 'decoration', name: 'Pokal', unlockLevel: 9, glyph: '🏆', style: { right: '10%', top: '14%' } },
  { id: 'deco-plant', category: 'decoration', name: 'Pflanze', unlockLevel: 3, glyph: '🪴', style: { right: '2%', bottom: '30%' } },
  { id: 'deco-neon', category: 'decoration', name: 'Neon-Schild', unlockLevel: 14, pro: true, glyph: '⚡', style: { left: '45%', top: '8%' } },
  // Challenge-Belohnungen (nicht kaufbar, nur durch Challenges)
  { id: 'deco-podium', category: 'decoration', name: 'Siegerpodest', unlockLevel: 1, challengeOnly: true, glyph: '🥇', style: { left: '3%', top: '14%' } },
  { id: 'deco-gold-car', category: 'decoration', name: 'Goldenes Auto', unlockLevel: 1, challengeOnly: true, glyph: '🏎️', style: { right: '3%', top: '30%' } },
  { id: 'deco-porsche-sign', category: 'decoration', name: 'Zuffenhausen-Schild', unlockLevel: 1, challengeOnly: true, glyph: '🛡️', style: { left: '18%', top: '6%' } },
];

export const itemsByCategory = (c: GarageItemCategory) => GARAGE_ITEMS.filter((i) => i.category === c);
export const garageItem = (id: ID) => GARAGE_ITEMS.find((i) => i.id === id)!;

export const CATEGORY_LABELS: Record<GarageItemCategory, string> = {
  floor: 'Boden',
  wall: 'Wände',
  lighting: 'Beleuchtung',
  background: 'Hintergrund',
  decoration: 'Deko',
};

export const defaultGarage = (userId: ID, slotModelIds: ID[] = []): GarageConfig => ({
  userId,
  floorId: 'floor-concrete',
  wallId: 'wall-graphite',
  lightingId: 'light-cool',
  backgroundId: 'bg-none',
  decorationIds: [],
  slotModelIds,
});
