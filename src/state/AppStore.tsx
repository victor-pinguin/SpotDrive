import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AlertArea, BadgeDefinition, CardStyle, DreamAlert, DreamAlertSettings, DreamCar, CarModel, ChallengeRarity, ChallengeScope, GarageConfig, GeoPoint, ID, LocationVisibility, MediaType, PersonalChallenge, Rarity, Spot, User, XpEvent } from '../types/models';
import { clearState, initialState, loadState, saveState, type PersistedState } from '../services/repository';
import { applyAiRarity, fullName, getModel, registerCustomModel, type CustomModelInput } from '../data/cars';
import { collectedBrandIds, collectedModelIds } from '../lib/collection';
import { garageTier, levelFromXp, levelTitle, sumXp, xpForSpot } from '../lib/xp';
import { badgeProgress } from '../lib/badges';
import { challengeStreak, dayKey, newlyCompleted } from '../lib/challenges';
import { STREAK_REWARDS } from '../data/challenges';
import { CARD_DESIGNS } from '../data/cardDesigns';
import { sanitizeStyle, unlockedThemeIds, type UnlockContext } from '../lib/cardStyle';
import { garageItem } from '../data/garageItems';
import { FREE_RECOGNITIONS_PER_DAY } from '../data/proFeatures';
import { DREAM_FOUND_XP } from '../data/dreamCars';
import { areasFor, processSpots, randomPointIn } from '../lib/dreamAlerts';
import { areaLabelFor } from '../lib/location';
import { push } from '../services/notifications';

// ─── Belohnungs-Events für die Animationen ────────────────────────────────

export type Reward =
  | { id: string; kind: 'spot'; model: CarModel; isNew: boolean; events: XpEvent[]; total: number; mediaType: MediaType; mediaUrl?: string }
  | { id: string; kind: 'badge'; badge: BadgeDefinition }
  | { id: string; kind: 'level'; level: number; title: string; garageTier?: string; newRank?: boolean }
  | { id: string; kind: 'xp'; label: string; amount: number }
  | { id: string; kind: 'dream'; model: CarModel; xp: number; variant?: string }
  | { id: string; kind: 'challenge'; title: string; icon: string; scope: ChallengeScope; rarity: ChallengeRarity; xp: number; extras: string[] };

export interface NewSpotInput {
  modelId: ID;
  variant?: string;
  description?: string;
  mediaType: MediaType;
  mediaUrl?: string;
  point: GeoPoint;
  areaLabel: string;
  locationSource: 'gps' | 'manual';
  visibility: LocationVisibility;
  isPublic: boolean;
}

interface AppContextValue {
  state: PersistedState;
  me: User;
  userById: (id: ID) => User | undefined;
  rewards: Reward[];
  dismissReward: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
  // Aktionen
  createSpot: (input: NewSpotInput) => Spot;
  /** Neues Modell anlegen (KI-Erkennung oder manuelle Eingabe), das nicht im Katalog steht */
  addCustomModel: (input: CustomModelInput) => CarModel;
  /** Nur für KI-Ergebnisse – Nutzer können die Seltenheit nicht selbst setzen. */
  setAiRarity: (modelId: ID, rarity: Rarity) => CarModel;
  toggleLike: (spotId: ID) => void;
  addComment: (spotId: ID, text: string) => void;
  toggleSave: (spotId: ID) => void;
  toggleFavorite: (modelId: ID) => void;
  toggleFollow: (userId: ID) => void;
  updateGarage: (patch: Partial<GarageConfig>) => void;
  // Challenges (Pro)
  addPersonalChallenge: (p: Omit<PersonalChallenge, 'id' | 'createdAt'>) => void;
  removePersonalChallenge: (id: ID) => void;
  joinCommunity: (id: ID) => void;
  setActiveTitle: (title?: string) => void;
  /** Custom Spot Cards (Pro): Design speichern – für eine Seltenheit, alle Cards oder eine einzelne Card */
  saveCardStyle: (target: CardStyleTarget, style: CardStyle) => void;
  resetCardStyle: (target: CardStyleTarget) => void;
  /** Freischalt-Kontext für Card-Designs (Level, Spots, Pro, Challenge-Belohnungen) */
  cardCtx: UnlockContext;
  // Dream Car Alerts
  addDreamCar: (input: { modelId: ID; variant?: string; photoUrl?: string }) => boolean;
  updateDreamCar: (id: ID, patch: Partial<DreamCar>) => void;
  removeDreamCar: (id: ID) => void;
  saveAlertArea: (area: AlertArea) => void;
  removeAlertArea: (id: ID) => void;
  updateDreamSettings: (patch: Partial<DreamAlertSettings>) => void;
  markDreamAlertsRead: () => void;
  /** Testmodus: simuliert einen Spot eines anderen Nutzers */
  simulateDreamSpot: (mode: 'match' | 'duplicate' | 'hidden') => string;
  dreamBanner: DreamAlert | null;
  dismissDreamBanner: () => void;
  unlockedThemes: Set<ID>;
  setPro: (isPro: boolean, opts?: { demo?: boolean; silent?: boolean }) => void;
  updateProfile: (patch: Pick<Partial<User>, 'username' | 'bio' | 'avatarUrl'>) => void;
  consumeRecognition: () => boolean;
  recognitionsLeft: number;
  resetDemo: () => void;
}

export type CardStyleTarget = { kind: 'all' } | { kind: 'rarity'; rarity: Rarity } | { kind: 'model'; modelId: ID };

const AppContext = createContext<AppContextValue | null>(null);

let rid = 0;
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${(rid++).toString(36)}`;
const today = () => new Date().toISOString().slice(0, 10);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadState);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [banners, setBanners] = useState<DreamAlert[]>([]);
  const dismissDreamBanner = useCallback(() => setBanners((q) => q.slice(1)), []);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => saveState(state), [state]);

  const commit = (next: PersistedState) => {
    ref.current = next;
    setState(next);
  };

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  const me = state.users.find((u) => u.id === state.currentUserId)!;

  const patchMe = (s: PersistedState, patch: Partial<User>): User[] =>
    s.users.map((u) => (u.id === s.currentUserId ? { ...u, ...patch } : u));

  /**
   * Gemeinsame Nachbearbeitung nach XP-relevanten Aktionen:
   * neue Badges prüfen (+XP) und Level-Up erkennen.
   * TODO(backend): serverseitig in derselben Transaktion wie der Spot-Insert.
   */
  const applyProgress = (s: PersistedState, xpGain: number, extra: Reward[]): { next: PersistedState; rewards: Reward[] } => {
    const out = [...extra];
    const before = levelFromXp(s.users.find((u) => u.id === s.currentUserId)!.xp);
    let gain = xpGain;
    const newlyUnlocked = badgeProgress(s.spots, s.currentUserId).filter(
      (b) => b.unlocked && !s.rewardedBadgeIds.includes(b.badge.id),
    );
    newlyUnlocked.forEach((b) => {
      gain += b.badge.xpReward;
      out.push({ id: nextId('r'), kind: 'badge', badge: b.badge });
    });
    const meNow = s.users.find((u) => u.id === s.currentUserId)!;
    const after = levelFromXp(meNow.xp + gain);
    if (after.level > before.level) {
      const tierBefore = garageTier(before.level);
      const tierAfter = garageTier(after.level);
      out.push({
        id: nextId('r'),
        kind: 'level',
        level: after.level,
        title: after.title,
        garageTier: tierAfter.name !== tierBefore.name ? tierAfter.name : undefined,
        newRank: levelTitle(after.level) !== levelTitle(before.level),
      });
    }
    return {
      next: {
        ...s,
        users: patchMe(s, { xp: meNow.xp + gain }),
        rewardedBadgeIds: [...s.rewardedBadgeIds, ...newlyUnlocked.map((b) => b.badge.id)],
      },
      rewards: out,
    };
  };

  /**
   * CHALLENGE-AUSWERTUNG (Free: 1 Gratis-Daily · Pro: alles)
   * Wird nach jedem Spot und nach Challenge-Aktionen aufgerufen:
   * neu erfüllte Challenges → Abschluss speichern, XP + Extras vergeben, Streak-Boni.
   */
  const applyChallenges = (s: PersistedState): { next: PersistedState; xp: number; rewards: Reward[] } => {
    const meNow = s.users.find((u) => u.id === s.currentUserId)!;
    // Free: nur die Gratis-Daily · Pro: alle Challenges + Streak-Boni
    const done = newlyCompleted(s.spots, s.currentUserId, s.personalChallenges, s.challengeCompletions, s.communityJoined, new Date(), meNow.isPro);
    if (!done.length) return { next: s, xp: 0, rewards: [] };
    const now = new Date().toISOString();
    let xp = 0;
    const out: Reward[] = [];
    const unlocks = structuredClone(s.unlocks);
    const completions = [...s.challengeCompletions];
    for (const a of done) {
      const r = a.def.reward;
      const extras: string[] = [];
      xp += r.xp;
      if (r.badge && !unlocks.badges.some((b) => b.id === r.badge!.id)) {
        unlocks.badges.push({ ...r.badge, earnedAt: now });
        extras.push(`${r.badge.icon} Badge „${r.badge.name}“`);
      }
      if (r.decorationId && !unlocks.decorations.includes(r.decorationId)) {
        unlocks.decorations.push(r.decorationId);
        extras.push(`🏠 Garage-Deko „${garageItem(r.decorationId)?.name ?? r.decorationId}“`);
      }
      if (r.cardDesignId && !unlocks.cardDesigns.includes(r.cardDesignId)) {
        unlocks.cardDesigns.push(r.cardDesignId);
        extras.push(`🃏 Car-Card-Design „${CARD_DESIGNS[r.cardDesignId]?.name ?? r.cardDesignId}“`);
      }
      if (r.title && !unlocks.titles.includes(r.title)) {
        unlocks.titles.push(r.title);
        extras.push(`🏷️ Titel „${r.title}“`);
      }
      completions.push({ key: a.key, challengeId: a.def.id, title: a.def.title, scope: a.def.scope, rarity: a.def.rarity, xp: r.xp, completedAt: now });
      out.push({ id: nextId('r'), kind: 'challenge', title: a.def.title, icon: a.def.icon, scope: a.def.scope, rarity: a.def.rarity, xp: r.xp, extras });
    }
    if (!meNow.isPro) return { next: { ...s, challengeCompletions: completions, unlocks }, xp, rewards: out };
    // Streak-Boni (einmal pro Serie und Stufe, Pro)
    const streak = challengeStreak(completions);
    const streakStart = dayKey(new Date(Date.now() - (streak - 1) * 86400000));
    const streakRewards = [...s.streakRewards];
    for (const sr of STREAK_REWARDS) {
      const key = `streak-${sr.days}@${streakStart}`;
      if (streak >= sr.days && !streakRewards.includes(key)) {
        streakRewards.push(key);
        xp += sr.xp;
        if (sr.badge && !unlocks.badges.some((b) => b.id === sr.badge!.id)) unlocks.badges.push({ ...sr.badge, earnedAt: now });
        out.push({ id: nextId('r'), kind: 'xp', label: `🔥 ${sr.days}-Tage-Challenge-Streak!${sr.badge ? ` + Badge „${sr.badge.name}“` : ''}`, amount: sr.xp });
      }
    }
    return { next: { ...s, challengeCompletions: completions, unlocks, streakRewards }, xp, rewards: out };
  };

  /** Challenges prüfen, ohne dass ein Spot entstanden ist (z. B. nach „Teilnehmen“). */
  const runChallengeCheck = (s: PersistedState) => {
    const c = applyChallenges(s);
    if (!c.rewards.length) return commit(s);
    const { next, rewards: r } = applyProgress(c.next, c.xp, c.rewards);
    commit(next);
    setRewards((q) => [...q, ...r]);
  };

  const createSpot = (input: NewSpotInput): Spot => {
    const s = ref.current;
    const model = getModel(input.modelId);
    // Dasselbe Modell zählt pro Nutzer nur EINMAL als neues Sammelauto.
    const isNewModel = !collectedModelIds(s.spots, s.currentUserId).has(model.id);
    const isNewBrand = !collectedBrandIds(s.spots, s.currentUserId).has(model.brandId);
    const events = xpForSpot({ model, mediaType: input.mediaType, isNewModel, isNewBrand });
    const total = sumXp(events);

    const spot: Spot = {
      id: nextId('s'),
      userId: s.currentUserId,
      modelId: model.id,
      variant: input.variant || undefined,
      description: input.description || undefined,
      media: { type: input.mediaType, url: input.mediaUrl, placeholder: !input.mediaUrl },
      location: { exact: input.point, visibility: input.visibility, areaLabel: input.areaLabel, source: input.locationSource },
      createdAt: new Date().toISOString(),
      isPublic: input.isPublic,
      likedBy: [],
      comments: [],
      xpAwarded: total,
      wasNewModel: isNewModel,
    };

    const withSpot: PersistedState = { ...s, spots: [spot, ...s.spots] };
    // Neues Modell automatisch in einen freien Garagenplatz stellen
    if (isNewModel && !withSpot.garage.slotModelIds.includes(model.id)) {
      withSpot.garage = { ...withSpot.garage, slotModelIds: [...withSpot.garage.slotModelIds, model.id] };
    }
    // Dream Car gefunden? (einmaliger Bonus, Status wird automatisch „Gespottet“)
    const dream = withSpot.dreamCars.find((d) => d.modelId === model.id && !d.foundRewardedAt);
    const dreamRewards: Reward[] = [];
    if (dream) {
      withSpot.dreamCars = withSpot.dreamCars.map((d) => (d.id === dream.id ? { ...d, foundRewardedAt: spot.createdAt } : d));
      dreamRewards.push({ id: nextId('r'), kind: 'dream', model, xp: DREAM_FOUND_XP, variant: dream.variant });
    }
    // Pipeline: Spot → Sammlung/Car Card → XP → Dream Car → Challenges → Badges → Level
    const ch = applyChallenges(withSpot);
    const { next, rewards: r } = applyProgress(ch.next, total + ch.xp + (dream ? DREAM_FOUND_XP : 0), [
      { id: nextId('r'), kind: 'spot', model, isNew: isNewModel, events, total, mediaType: input.mediaType, mediaUrl: input.mediaUrl },
      ...dreamRewards,
      ...ch.rewards,
    ]);
    commit(next);
    setRewards((q) => [...q, ...r]);
    return spot;
  };

  // ─── Dream Car Alerts ──────────────────────────────────────────────────
  /**
   * Prüft neue Spots anderer Nutzer gegen die eigene Dream-Car-Liste.
   * Im echten Backend passiert das serverseitig direkt nach dem Spot-Insert
   * (für ALLE Pro-Nutzer) – hier im Demo-Modus für den eingeloggten Nutzer.
   */
  const dreamPass = (s: PersistedState): { next: PersistedState; notes: DreamAlert[] } => {
    const meNow = s.users.find((u) => u.id === s.currentUserId)!;
    if (!meNow.isPro) return { next: s, notes: [] };
    const processed = new Set(s.dreamProcessed);
    const cutoff = Date.now() - 48 * 3600_000;
    const fresh = s.spots.filter((sp) => sp.userId !== s.currentUserId && !processed.has(sp.id));
    if (!fresh.length) return { next: s, notes: [] };
    const old = fresh.filter((sp) => new Date(sp.createdAt).getTime() < cutoff).map((sp) => sp.id);
    const recent = fresh.filter((sp) => new Date(sp.createdAt).getTime() >= cutoff);
    const r = processSpots(recent, { userId: s.currentUserId, isPro: true, dreamCars: s.dreamCars, areas: s.alertAreas, settings: s.dreamSettings, alerts: s.dreamAlerts }, processed, () => nextId('da'));
    return {
      next: { ...s, dreamAlerts: r.alerts.slice(0, 200), dreamProcessed: [...s.dreamProcessed, ...old, ...r.processedIds].slice(-3000) },
      notes: r.notifications,
    };
  };

  const deliver = (s: PersistedState, notes: DreamAlert[]) => {
    if (!notes.length) return;
    // neueste zuerst anzeigen
    if (s.dreamSettings.inApp) setBanners((q) => [...[...notes].reverse(), ...q]);
    if (s.dreamSettings.push) notes.forEach((a) => push.send(a, `#/spot/${a.spotIds[0]}`));
  };

  const commitDream = (s: PersistedState) => {
    const { next, notes } = dreamPass(s);
    commit(next);
    deliver(next, notes);
    return notes;
  };

  // Beim Start und nach dem Pro-Upgrade neue Spots prüfen
  useEffect(() => {
    const { next, notes } = dreamPass(ref.current);
    if (next !== ref.current) {
      commit(next);
      deliver(next, notes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.isPro]);

  const addDreamCar: AppContextValue['addDreamCar'] = ({ modelId, variant, photoUrl }) => {
    const s = ref.current;
    if (s.dreamCars.some((d) => d.modelId === modelId)) return false; // keine Duplikate
    const dc: DreamCar = {
      id: nextId('dc'),
      modelId,
      variant: variant?.trim() || undefined,
      photoUrl,
      addedAt: new Date().toISOString(),
      alertsOn: me.isPro && s.alertAreas.length > 0,
      areaId: 'all',
      // schon selbst gespottet → kein Bonus, Status sofort „Gespottet“
      foundRewardedAt: s.spots.some((sp) => sp.userId === s.currentUserId && sp.modelId === modelId) ? new Date().toISOString() : undefined,
    };
    commit({ ...s, dreamCars: [dc, ...s.dreamCars] });
    return true;
  };

  const updateDreamCar = (id: ID, patch: Partial<DreamCar>) => {
    const s = ref.current;
    commit({ ...s, dreamCars: s.dreamCars.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  };

  const removeDreamCar = (id: ID) => {
    const s = ref.current;
    commit({ ...s, dreamCars: s.dreamCars.filter((d) => d.id !== id), dreamAlerts: s.dreamAlerts.filter((a) => a.dreamCarId !== id) });
  };

  const saveAlertArea = (area: AlertArea) => {
    const s = ref.current;
    const exists = s.alertAreas.some((a) => a.id === area.id);
    commit({ ...s, alertAreas: exists ? s.alertAreas.map((a) => (a.id === area.id ? area : a)) : [...s.alertAreas, area] });
  };

  const removeAlertArea = (id: ID) => {
    const s = ref.current;
    commit({
      ...s,
      alertAreas: s.alertAreas.filter((a) => a.id !== id),
      dreamCars: s.dreamCars.map((d) => (d.areaId === id ? { ...d, areaId: 'all' } : d)),
    });
  };

  const updateDreamSettings = (patch: Partial<DreamAlertSettings>) => {
    const s = ref.current;
    commit({ ...s, dreamSettings: { ...s.dreamSettings, ...patch } });
  };

  const markDreamAlertsRead = () => {
    const s = ref.current;
    if (s.dreamAlerts.some((a) => !a.read)) commit({ ...s, dreamAlerts: s.dreamAlerts.map((a) => ({ ...a, read: true })) });
  };

  const simulateDreamSpot: AppContextValue['simulateDreamSpot'] = (mode) => {
    const s = ref.current;
    const others = s.users.filter((u) => u.id !== s.currentUserId);
    const spotter = others[Math.floor(Math.random() * others.length)];
    let modelId: ID;
    let point: GeoPoint;
    if (mode === 'duplicate') {
      const last = s.dreamAlerts[0];
      const base = last && s.spots.find((sp) => sp.id === last.spotIds[0]);
      if (!last || !base) return 'Noch kein Alert vorhanden – zuerst „Test-Spot“ simulieren.';
      modelId = last.modelId;
      point = { lat: base.location.exact.lat + 0.002, lng: base.location.exact.lng - 0.002 };
    } else {
      const candidates = s.dreamCars.filter((d) => d.alertsOn && areasFor(d, s.alertAreas).length);
      if (!candidates.length) return 'Kein Dream Car mit aktivem Alert und Gebiet.';
      const dc = candidates[Math.floor(Math.random() * candidates.length)];
      const areas = areasFor(dc, s.alertAreas);
      modelId = dc.modelId;
      point = randomPointIn(areas[Math.floor(Math.random() * areas.length)]);
    }
    const model = getModel(modelId);
    const spot: Spot = {
      id: nextId('s'),
      userId: spotter.id,
      modelId,
      description: mode === 'duplicate' ? 'Hab ihn auch gerade gesehen!' : 'Test-Spot (Demo-Modus)',
      media: { type: 'photo', placeholder: true },
      location: { exact: point, visibility: mode === 'hidden' ? 'hidden' : 'area', areaLabel: areaLabelFor(point).replace(/^Nähe /, ''), source: 'gps' },
      createdAt: new Date().toISOString(),
      isPublic: true,
      likedBy: [],
      comments: [],
      xpAwarded: sumXp(xpForSpot({ model, mediaType: 'photo', isNewModel: false, isNewBrand: false })),
      wasNewModel: false,
    };
    const before = ref.current.dreamAlerts;
    const notes = commitDream({ ...s, spots: [spot, ...s.spots] });
    const after = ref.current.dreamAlerts;
    if (notes.length) return `🔔 Alert ausgelöst: ${fullName(model)}`;
    if (after.length > before.length) return '🔕 Alert nur im Postfach (Häufigkeits-Limit oder Benachrichtigungen aus)';
    if (after.some((a) => a.spotIds.includes(spot.id))) return '🧩 Ähnliche Meldung erkannt – zusammengefasst, keine zweite Benachrichtigung';
    if (mode === 'hidden') return '🙈 Standort verborgen → kein Alert (Privatsphäre)';
    return 'Kein Alert (Alerts pausiert oder außerhalb des Gebiets)';
  };

  const addCustomModel = (input: CustomModelInput): CarModel => {
    const m = registerCustomModel(input);
    const s = ref.current;
    if (m.source === 'custom' && !s.customModels.some((c) => c.id === m.id)) {
      commit({ ...s, customModels: [...s.customModels, m] });
    }
    return m;
  };

  const setAiRarity = (modelId: ID, rarity: Rarity): CarModel => {
    const s = ref.current;
    if (applyAiRarity(modelId, rarity)) {
      const m = getModel(modelId);
      commit({
        ...s,
        aiRarity: { ...(s.aiRarity ?? {}), [modelId]: m.rarity },
        customModels: s.customModels.map((c) => (c.id === modelId ? { ...m } : c)),
      });
    }
    return getModel(modelId);
  };

  const updateSpot = (spotId: ID, fn: (s: Spot) => Spot) => {
    const s = ref.current;
    commit({ ...s, spots: s.spots.map((x) => (x.id === spotId ? fn(x) : x)) });
  };

  const toggleLike = (spotId: ID) =>
    updateSpot(spotId, (sp) => {
      const uid = ref.current.currentUserId;
      return { ...sp, likedBy: sp.likedBy.includes(uid) ? sp.likedBy.filter((i) => i !== uid) : [...sp.likedBy, uid] };
    });

  const addComment = (spotId: ID, text: string) =>
    updateSpot(spotId, (sp) => ({
      ...sp,
      comments: [...sp.comments, { id: nextId('c'), spotId, userId: ref.current.currentUserId, text, createdAt: new Date().toISOString() }],
    }));

  const toggleIn = (list: ID[], id: ID) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const toggleSave = (spotId: ID) => {
    const s = ref.current;
    const m = s.users.find((u) => u.id === s.currentUserId)!;
    const saved = !m.savedSpotIds.includes(spotId);
    commit({ ...s, users: patchMe(s, { savedSpotIds: toggleIn(m.savedSpotIds, spotId) }) });
    showToast(saved ? 'Spot gespeichert' : 'Aus Gespeichert entfernt');
  };

  const toggleFavorite = (modelId: ID) => {
    const s = ref.current;
    const m = s.users.find((u) => u.id === s.currentUserId)!;
    commit({ ...s, users: patchMe(s, { favoriteModelIds: toggleIn(m.favoriteModelIds, modelId) }) });
  };

  const toggleFollow = (userId: ID) => {
    const s = ref.current;
    const m = s.users.find((u) => u.id === s.currentUserId)!;
    commit({ ...s, users: patchMe(s, { followingIds: toggleIn(m.followingIds, userId) }) });
  };

  const updateGarage = (patch: Partial<GarageConfig>) => {
    const s = ref.current;
    commit({ ...s, garage: { ...s.garage, ...patch } });
  };

  const addPersonalChallenge: AppContextValue['addPersonalChallenge'] = (p) => {
    const s = ref.current;
    const pc: PersonalChallenge = { ...p, id: nextId('pc'), createdAt: new Date().toISOString() };
    runChallengeCheck({ ...s, personalChallenges: [pc, ...s.personalChallenges] });
    showToast('Challenge erstellt – Fortschritt wird automatisch gezählt');
  };

  const removePersonalChallenge = (id: ID) => {
    const s = ref.current;
    commit({ ...s, personalChallenges: s.personalChallenges.filter((p) => p.id !== id) });
  };

  const joinCommunity = (id: ID) => {
    const s = ref.current;
    if (s.communityJoined.includes(id)) return;
    runChallengeCheck({ ...s, communityJoined: [...s.communityJoined, id] });
    showToast('Du nimmst teil – deine Spots zählen ab jetzt mit');
  };

  const setActiveTitle = (title?: string) => {
    const s = ref.current;
    commit({ ...s, activeTitle: title });
  };

  const saveCardStyle = (target: CardStyleTarget, style: CardStyle) => {
    const s = ref.current;
    const clean = sanitizeStyle(style);
    const cs = { ...s.cardStyles, byRarity: { ...s.cardStyles.byRarity }, byModel: { ...s.cardStyles.byModel } };
    if (target.kind === 'all') {
      // „Alle“ überschreibt die einzelnen Seltenheits-Standards
      cs.all = clean;
      cs.byRarity = {};
    } else if (target.kind === 'rarity') cs.byRarity[target.rarity] = clean;
    else cs.byModel[target.modelId] = clean;
    commit({ ...s, cardStyles: cs });
  };

  const resetCardStyle = (target: CardStyleTarget) => {
    const s = ref.current;
    const cs = { ...s.cardStyles, byRarity: { ...s.cardStyles.byRarity }, byModel: { ...s.cardStyles.byModel } };
    if (target.kind === 'all') cs.all = undefined;
    else if (target.kind === 'rarity') delete cs.byRarity[target.rarity];
    else delete cs.byModel[target.modelId];
    commit({ ...s, cardStyles: cs });
  };

  const cardCtx: UnlockContext = useMemo(
    () => ({ isPro: me.isPro, level: levelFromXp(me.xp).level, spots: state.spots, userId: me.id, challengeUnlocks: state.unlocks.cardDesigns }),
    [me.isPro, me.xp, me.id, state.spots, state.unlocks.cardDesigns],
  );
  const unlockedThemes = useMemo(() => unlockedThemeIds(cardCtx), [cardCtx]);

  const setPro = (isPro: boolean, opts?: { demo?: boolean; silent?: boolean }) => {
    const s = ref.current;
    if (s.users.find((u) => u.id === s.currentUserId)!.isPro === isPro) return;
    const next = { ...s, users: patchMe(s, { isPro }) };
    if (isPro) runChallengeCheck(next);
    else commit(next);
    if (!opts?.silent) showToast(isPro ? (opts?.demo ? 'SpotDrive Pro aktiviert (Demo)' : 'SpotDrive Pro aktiv – danke! 🎉') : 'Pro beendet');
  };

  const updateProfile: AppContextValue['updateProfile'] = (patch) => {
    const s = ref.current;
    commit({ ...s, users: patchMe(s, patch) });
  };

  const recognitionsUsed = state.recognitions.date === today() ? state.recognitions.count : 0;
  const recognitionsLeft = me.isPro ? Infinity : Math.max(0, FREE_RECOGNITIONS_PER_DAY - recognitionsUsed);

  /** Zählt eine KI-Erkennung. false = Tageslimit erreicht (Free). */
  const consumeRecognition = () => {
    if (recognitionsLeft <= 0) return false;
    const s = ref.current;
    commit({ ...s, recognitions: { date: today(), count: recognitionsUsed + 1 } });
    return true;
  };

  const resetDemo = () => {
    clearState();
    commit(initialState());
    setRewards([]);
    showToast('Demo-Daten zurückgesetzt');
  };

  const userById = useCallback((id: ID) => state.users.find((u) => u.id === id), [state.users]);

  const value: AppContextValue = {
    state,
    me,
    userById,
    rewards,
    dismissReward: () => setRewards((q) => q.slice(1)),
    toast,
    showToast,
    createSpot,
    addCustomModel,
    setAiRarity,
    toggleLike,
    addComment,
    toggleSave,
    toggleFavorite,
    toggleFollow,
    updateGarage,
    addPersonalChallenge,
    removePersonalChallenge,
    joinCommunity,
    setActiveTitle,
    saveCardStyle,
    resetCardStyle,
    cardCtx,
    unlockedThemes,
    addDreamCar,
    updateDreamCar,
    removeDreamCar,
    saveAlertArea,
    removeAlertArea,
    updateDreamSettings,
    markDreamAlertsRead,
    simulateDreamSpot,
    dreamBanner: banners[0] ?? null,
    dismissDreamBanner,
    setPro,
    updateProfile,
    consumeRecognition,
    recognitionsLeft,
    resetDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp muss innerhalb von <AppProvider> verwendet werden');
  return ctx;
}

/** Abgeleitete Werte für einen Nutzer (Level, Sammlung …) – memoisiert. */
export function useUserStats(userId: ID) {
  const { state, userById } = useApp();
  const user = userById(userId);
  return useMemo(() => {
    const spots = state.spots.filter((s) => s.userId === userId);
    const models = collectedModelIds(state.spots, userId);
    return {
      user,
      spots,
      level: levelFromXp(user?.xp ?? 0),
      modelCount: models.size,
      brandCount: collectedBrandIds(state.spots, userId).size,
    };
  }, [state.spots, user, userId]);
}
