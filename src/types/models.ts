/**
 * SpotDrive – zentrales Datenmodell.
 *
 * Diese Typen sind so geschnitten, dass sie 1:1 auf Datenbank-Tabellen /
 * Collections abgebildet werden können (z. B. Supabase/Postgres oder Firestore):
 *   users, spots, comments, car_brands, car_models, user_badges,
 *   challenge_progress, garages.
 * Abgeleitete Werte (Level, Sammlung, Badges-Fortschritt) werden NICHT gespeichert,
 * sondern aus Spots + XP-Log berechnet (siehe src/lib).
 */

export type ID = string;

// ─── Autos ────────────────────────────────────────────────────────────────

/** Seltenheitsstufen. Reihenfolge = aufsteigende Seltenheit. */
/** Seltenheit – 6 Stufen von Gewöhnlich bis Unmöglich (Reihenfolge = aufsteigend). */
export type Rarity = 'common' | 'rare' | 'epic' | 'exotic' | 'legendary' | 'impossible';

/** Karosserieform – steuert die Fahrzeug-Illustration (CarArt). */
export type BodyStyle = 'supercar' | 'hypercar' | 'coupe' | 'gt' | 'sedan' | 'suv';

/** Fahrzeugklasse – wird z. B. für das Badge "Supercar Hunter" verwendet. */
export type CarClass = 'standard' | 'sports' | 'supercar' | 'hypercar' | 'luxury' | 'suv';

export interface CarBrand {
  id: ID; // z. B. 'porsche'
  name: string; // 'Porsche'
  country: string;
  color: string; // Markenfarbe für UI-Akzente
  /** Marke erscheint als eigener Kartenfilter */
  featured?: boolean;
}

export interface CarModel {
  id: ID; // z. B. 'porsche-911-gt3-rs'
  brandId: ID;
  name: string; // '911 GT3 RS'
  rarity: Rarity;
  body: BodyStyle;
  carClass: CarClass;
  paint: string; // Standard-Lackfarbe für die Illustration
  years?: string; // '2022–'
  /** curated = gepflegt (Foto, Seltenheit) · catalog = offener Katalog · custom = von KI/Nutzer angelegt */
  source?: 'curated' | 'catalog' | 'custom';
  /** Leistung in PS (für Challenges wie „Finde ein Auto mit mehr als 500 PS“) */
  hp?: number;
  /**
   * Wer hat die Seltenheit bestimmt? Nutzer können sie NIE selbst wählen.
   *  - 'curated':  geprüfte Katalogdaten
   *  - 'ai':       von der KI klassifiziert (Foto-Erkennung oder Text-Klassifizierung)
   *  - 'estimate': vorläufige Schätzung, solange keine KI erreichbar ist
   */
  rarityBy?: 'curated' | 'ai' | 'estimate';
}

// ─── Nutzer ───────────────────────────────────────────────────────────────

export interface User {
  id: ID;
  username: string;
  displayName: string;
  avatarColor: string; // Fallback-Avatar (Gradient)
  avatarUrl?: string;
  bio?: string;
  homeArea: string; // öffentlicher, grober Heimatbereich
  isPro: boolean;
  joinedAt: string; // ISO
  /**
   * Gesamt-XP. Im echten Backend serverseitig berechnen (XP-Log / Trigger),
   * damit Clients keine XP manipulieren können.
   */
  xp: number;
  favoriteModelIds: ID[];
  savedSpotIds: ID[];
  followingIds: ID[];
}

// ─── Standort & Privatsphäre ──────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * - 'area'  (Standard): öffentlich nur ein ungefährer Bereich (~2 km Raster)
 * - 'exact': Nutzer teilt bewusst den genauen Punkt
 * - 'hidden': Spot erscheint gar nicht auf der Karte
 */
export type LocationVisibility = 'area' | 'exact' | 'hidden';

export interface SpotLocation {
  /** Exakter Punkt – verlässt im echten Backend NIE den Server, außer visibility === 'exact'. */
  exact: GeoPoint;
  visibility: LocationVisibility;
  /** Grober Ortsname (Stadt / Stadtteil), öffentlich */
  areaLabel: string;
  source: 'gps' | 'manual';
}

/** Was andere Nutzer von einem Standort sehen dürfen. */
export interface PublicLocation {
  point: GeoPoint | null; // null bei 'hidden'
  radiusM: number; // 0 = exakt
  areaLabel: string;
}

// ─── Spots ────────────────────────────────────────────────────────────────

export type MediaType = 'photo' | 'video';

export interface MediaCredit {
  author: string;
  license: string;
  sourceUrl: string;
}

export interface SpotMedia {
  type: MediaType;
  /** Foto-URL bzw. Video-URL (dataURL / objectURL / Storage-URL). Später: S3, Supabase Storage … */
  url?: string;
  /** Alternative Videoquelle (z. B. MP4 für Safari/iOS) */
  urlAlt?: string;
  /** Standbild für Videos (wird Free-Nutzern statt des Videos gezeigt) */
  posterUrl?: string;
  /** Urheber-/Lizenzangabe für fremde Medien (z. B. Wikimedia Commons) */
  credit?: MediaCredit;
  /** Keine echte Datei → Illustration aus dem Katalog anzeigen */
  placeholder?: boolean;
}

export interface Comment {
  id: ID;
  spotId: ID;
  userId: ID;
  text: string;
  createdAt: string;
}

export interface Spot {
  id: ID;
  userId: ID;
  modelId: ID;
  variant?: string; // Variante/Ausstattung, optional (kein Baujahr nötig)
  description?: string;
  media: SpotMedia;
  location: SpotLocation;
  createdAt: string;
  isPublic: boolean;
  likedBy: ID[];
  comments: Comment[];
  /** Beim Erstellen vergebene XP (für Anzeige & Nachvollziehbarkeit) */
  xpAwarded: number;
  wasNewModel: boolean;
}

// ─── XP / Level ───────────────────────────────────────────────────────────

export type XpReason =
  | 'car_spotted'
  | 'new_model'
  | 'new_brand'
  | 'rarity_bonus'
  | 'video'
  | 'challenge'
  | 'badge';

export interface XpEvent {
  reason: XpReason;
  amount: number;
  label: string;
}

export interface LevelInfo {
  level: number;
  title: string; // Beginner / Spotter / ...
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0..1
  totalXp: number;
}

// ─── Badges ───────────────────────────────────────────────────────────────

export interface BadgeDefinition {
  id: ID;
  name: string;
  description: string;
  icon: string; // Emoji oder Icon-Key
  target: number;
  xpReward: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface BadgeProgress {
  badge: BadgeDefinition;
  current: number;
  unlocked: boolean;
}

// ─── Challenges (SpotDrive Pro) ───────────────────────────────────────────

export type ChallengeScope = 'daily' | 'weekly' | 'personal' | 'community';
export type ChallengeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Welche Spots zählen? Alle Angaben optional und kombinierbar. */
export interface SpotFilter {
  brandIds?: ID[];
  /** Herkunftsland der Marke, z. B. 'IT' für italienische Autos */
  countries?: string[];
  carClasses?: CarClass[];
  minRarity?: Rarity;
  /** Modellname beginnt mit … (z. B. „M“ für BMW M-Modelle) */
  modelPrefix?: string;
  minHp?: number;
  /** nur Modelle, die der Nutzer vorher noch nie gesammelt hatte */
  newToCollection?: boolean;
  videoOnly?: boolean;
}

/**
 * Was gezählt wird:
 *  - spots:           jeder passende Spot
 *  - distinct_models: jedes Modell nur einmal (verhindert Doppelzählung)
 *  - distinct_brands: jede Marke nur einmal
 */
export type ChallengeMeasure = 'spots' | 'distinct_models' | 'distinct_brands';

export interface ChallengeRule {
  measure: ChallengeMeasure;
  count: number;
  filter?: SpotFilter;
}

/** Zusätzliche Belohnungen neben XP */
export interface ChallengeReward {
  xp: number;
  badge?: { id: ID; name: string; icon: string };
  decorationId?: ID;
  cardDesignId?: ID;
  title?: string;
}

export interface ChallengeDefinition {
  id: ID;
  scope: ChallengeScope;
  rarity: ChallengeRarity;
  icon: string;
  title: string;
  description: string;
  rule: ChallengeRule;
  reward: ChallengeReward;
}

/** Konkrete Challenge mit Zeitfenster (z. B. „Daily vom 26.09.“) */
export interface ActiveChallenge {
  def: ChallengeDefinition;
  /** eindeutig pro Zeitfenster – verhindert doppelte Belohnung */
  key: string;
  startsAt: string;
  endsAt: string;
}

export interface ChallengeProgress {
  active: ActiveChallenge;
  current: number;
  target: number;
  completed: boolean;
  completedAt?: string;
}

export interface PersonalChallenge {
  id: ID;
  title: string;
  description?: string;
  rule: ChallengeRule;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export interface ChallengeCompletion {
  key: string;
  challengeId: ID;
  title: string;
  scope: ChallengeScope;
  rarity: ChallengeRarity;
  xp: number;
  completedAt: string;
}

// ─── Garage ───────────────────────────────────────────────────────────────

export type GarageItemCategory = 'floor' | 'wall' | 'lighting' | 'background' | 'decoration';

/**
 * Ein Deko-/Design-Element. Neue Elemente einfach in src/data/garageItems.ts
 * ergänzen – die UI liest die Registry automatisch aus.
 */
export interface GarageItem {
  id: ID;
  category: GarageItemCategory;
  name: string;
  /** CSS-Werte, die die Showroom-Szene verwendet */
  style: Record<string, string>;
  unlockLevel: number;
  pro?: boolean;
  /** nur über Challenges erhältlich */
  challengeOnly?: boolean;
  /** nur für decoration: Emoji/Symbol als einfache erste Darstellung */
  glyph?: string;
}

export interface GarageTier {
  minLevel: number;
  name: string;
  slots: number;
}

export interface GarageConfig {
  userId: ID;
  floorId: ID;
  wallId: ID;
  lightingId: ID;
  backgroundId: ID;
  decorationIds: ID[];
  /** Reihenfolge = Fahrzeugposition; Index 0 = Hero-Platz auf der Drehbühne */
  slotModelIds: ID[];
}

// ─── Pro ──────────────────────────────────────────────────────────────────

export type ProFeatureKey =
  | 'video_record'
  | 'video_feed'
  | 'long_videos'
  | 'unlimited_recognition'
  | 'advanced_stats'
  | 'advanced_map_filters'
  | 'spot_alerts'
  | 'cloud_backup'
  | 'challenges'
  | 'custom_cards'
  | 'spot_calendar'
  | 'pro_badge'
  | 'garage_designs';

// ─── Custom Spot Cards (SpotDrive Pro) ────────────────────────────────────

export type CardFrameId = 'rarity' | 'clean' | 'double' | 'racing' | 'gold' | 'neon' | 'chrome';
export type CardEffectId = 'glow' | 'float' | 'particles' | 'shine' | 'carbon' | 'metallic';
export type CardTextStyle = 'modern' | 'racing' | 'elegant' | 'tech' | 'bold';

/** Ein komplettes Card-Design: Theme + Hintergrund + Farbe + Rahmen + Effekte + Schrift. */
export interface CardStyle {
  themeId: ID;
  backgroundId: ID;
  /** Hintergrundfarbe – nur aus der Palette des Themes wählbar */
  color: string;
  frameId: CardFrameId;
  effects: CardEffectId[];
  textStyle: CardTextStyle;
}

/**
 * Gespeicherte Standard-Designs.
 * Reihenfolge der Auflösung: einzelne Card → Seltenheit → „Alle“ → Standard.
 * TODO(backend): Tabelle `card_styles` (user_id, target, style jsonb).
 */
export interface CardStyleSettings {
  all?: CardStyle;
  byRarity: Partial<Record<Rarity, CardStyle>>;
  byModel: Record<ID, CardStyle>;
}

// ─── Dream Car Alerts (SpotDrive Pro) ─────────────────────────────────────

/** Gebiet, für das ein Nutzer Alerts erhalten möchte. TODO(backend): Tabelle `alert_areas` (PostGIS geography). */
export interface AlertArea {
  id: ID;
  label: string;
  center: GeoPoint;
  radiusKm: number;
  source: 'current' | 'city' | 'region' | 'map';
}

/** Ein Eintrag der Dream-Car-Wunschliste. TODO(backend): Tabelle `dream_cars` (unique user_id + model_id). */
export interface DreamCar {
  id: ID;
  modelId: ID;
  variant?: string;
  /** optionales eigenes Foto (dataURL / Storage-URL) */
  photoUrl?: string;
  addedAt: string;
  alertsOn: boolean;
  /** Gebiet für Alerts: eine Area-ID oder 'all' = alle eigenen Gebiete */
  areaId: ID | 'all';
  /** manuell als gespottet markiert (ohne eigenen Spot) */
  markedSpottedAt?: string;
  /** Dream-Car-Found-Bonus schon vergeben */
  foundRewardedAt?: string;
}

export type AlertFrequency = 'instant' | 'hourly' | 'daily';

export interface DreamAlertSettings {
  /** Hauptschalter – alle Alerts pausieren */
  enabled: boolean;
  push: boolean;
  inApp: boolean;
  frequency: AlertFrequency;
}

/**
 * Eine Benachrichtigung. Enthält NUR öffentliche Standortdaten (grober Bereich),
 * nie den exakten Punkt, außer der Spotter hat ihn ausdrücklich geteilt.
 */
export interface DreamAlert {
  id: ID;
  dreamCarId: ID;
  modelId: ID;
  /** erster Spot + zusammengefasste ähnliche Meldungen */
  spotIds: ID[];
  areaId: ID;
  areaLabel: string;
  publicPoint: GeoPoint;
  publicRadiusM: number;
  spottedAt: string;
  createdAt: string;
  /** Benachrichtigung gesendet (false = wegen Häufigkeits-Limit nur im Postfach) */
  notified: boolean;
  read: boolean;
}
