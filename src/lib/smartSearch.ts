import { BRANDS, MODELS, getBrand, getModel, modelsOfBrand, norm } from '../data/cars';
import type { CarBrand, CarModel, ID, Rarity, Spot, User } from '../types/models';
import { RARITY_META, RARITY_ORDER, atLeast, rarityRank } from './rarity';
import { carCards, periodStartDate, type CarCardData } from './cards';
import { historyStats, mySpots } from './history';

/**
 * SMART SEARCH
 * ────────────
 * Versteht normale Sätze (Deutsch & Englisch) – komplett lokal, ohne KI, damit es
 * offline und sofort funktioniert. Aufbau:
 *   1. parseQuery()   Satz → strukturierte Absicht (Marke, Seltenheit, Zeitraum, …)
 *   2. runQuery()     Absicht → Antwortsatz + Ergebnisse (Car Cards, Spots, Modelle, Nutzer)
 * Erweiterbar: neue Muster unten ergänzen. Für freiere Fragen kann später ein
 * LLM die Absicht als JSON liefern (gleiche ParsedQuery-Struktur).
 */

export type Period = 'today' | 'yesterday' | 'week' | 'month' | 'year';

export interface ParsedQuery {
  raw: string;
  brands: CarBrand[];
  models: CarModel[];
  rarity?: Rarity;
  minRarity?: Rarity;
  period?: Period;
  missing: boolean;
  count: boolean;
  rarest: boolean;
  first: boolean;
  topBrand: boolean;
  streak: boolean;
  wantsSpots: boolean;
  userQuery?: string;
}

const n = (s: string) =>
  ` ${s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9@ ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const has = (t: string, ...words: string[]) => words.some((w) => t.includes(` ${w} `) || t.includes(` ${w}`));

const BRAND_ALIASES: Record<string, string[]> = {
  lamborghini: ['lambo', 'lambos'],
  volkswagen: ['vw'],
  'mercedes-benz': ['mercedes', 'benz', 'merc'],
  'mercedes-amg': ['amg'],
  bmw: ['bimmer'],
  'rolls-royce': ['rolls', 'rolls royce'],
  'aston-martin': ['aston'],
  'alfa-romeo': ['alfa'],
  'land-rover': ['range rover'],
};

const AMBIGUOUS = new Set(['standard', 'smart', 'rally', 'think', 'smile', 'mega', 'micro', 'mia', 'sam', 'march', 'martin', 'jordan', 'puma', 'spire', 'destiny', 'spectre', 'singer', 'swallow', 'reliant', 'vale', 'croco', 'clement', 'mini', 'seres', 'legends car', 'classic plus', 'seventy seven', 'buggy', 'boattail', 'kougar', 'rinspeed']);

const RARITY_WORDS: [Rarity, string[]][] = [
  ['impossible', ['unmoglich', 'unmogliche', 'unmoglichen', 'impossible']],
  ['legendary', ['legendar', 'legendare', 'legendaren', 'legendary', 'legend', 'legendaries']],
  ['exotic', ['exotisch', 'exotische', 'exotischen', 'exotic', 'exoten']],
  ['epic', ['episch', 'epische', 'epischen', 'epic']],
  ['common', ['gewohnlich', 'gewohnliche', 'gewohnlichen', 'common', 'normale']],
];

export function parseQuery(raw: string): ParsedQuery {
  const t = n(raw);

  // Marken (inkl. Spitznamen); kurze Namen nur als ganzes Wort
  const brands = BRANDS.filter((b) => {
    const name = n(b.name).trim();
    // Markennamen, die auch normale Wörter sind („Smart“, „Standard“, „Man“ …), nur bei Großschreibung
    if (name.length <= 3 || AMBIGUOUS.has(name)) {
      const exact = new RegExp(`(^|[^\\w])${b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w]|$)`);
      if (exact.test(raw)) return true;
      return (BRAND_ALIASES[b.id] ?? []).some((w) => t.includes(` ${w} `));
    }
    const words = [name, ...(BRAND_ALIASES[b.id] ?? [])];
    return words.some((w) => (w.length >= 4 ? t.includes(` ${w}`) : t.includes(` ${w} `)));
  });
  // Doppelte Treffer vermeiden (z. B. „Mercedes-AMG“ enthält „AMG“)
  const uniqueBrands = brands.filter((b) => !brands.some((o) => o !== b && n(o.name).includes(n(b.name).trim()) && o.name.length > b.name.length));

  // Modelle der genannten Marken, die im Satz vorkommen (längster Name gewinnt)
  const models = uniqueBrands
    .flatMap((b) => modelsOfBrand(b.id))
    .filter((m) => norm(m.name).length >= 2 && n(raw).replace(/ /g, '').includes(norm(m.name)))
    .sort((a, b) => b.name.length - a.name.length)
    .slice(0, 1);

  let rarity: Rarity | undefined;
  for (const [r, words] of RARITY_WORDS) if (has(t, ...words)) rarity = rarity ?? r;
  const rarest = has(t, 'seltenste', 'seltensten', 'seltenstes', 'rarest', 'top');
  // „seltene Autos“ = mindestens Selten
  const minRarity: Rarity | undefined = !rarity && !rarest && has(t, 'selten', 'seltene', 'seltenen', 'rare') ? 'rare' : undefined;

  let period: Period | undefined;
  if (has(t, 'heute', 'today')) period = 'today';
  else if (has(t, 'gestern', 'yesterday')) period = 'yesterday';
  else if (/ (diese|dieser|diesen|this|letzte|last) (woche|week) /.test(t) || has(t, 'wochenende')) period = 'week';
  else if (/ (diesen|dieser|diesem|this|letzten|last) (monat|month) /.test(t)) period = 'month';
  else if (/ (dieses|diesem|this|letztes|last) (jahr|year) /.test(t) || has(t, '2026')) period = 'year';

  const userMatch = raw.match(/@([\w.]+)/) ?? (has(t, 'nutzer', 'user', 'spotter', 'profil') ? raw.match(/(?:nutzer|user|spotter|profil)\s+([\w.]+)/i) : null);

  return {
    raw,
    brands: uniqueBrands,
    models,
    rarity,
    minRarity,
    period,
    missing: has(t, 'noch nicht', 'nicht gesammelt', 'fehlen', 'fehlt', 'fehlende', 'missing', 'not collected', 'havent', 'haven t'),
    count: has(t, 'wie viele', 'wieviele', 'how many', 'anzahl'),
    rarest,
    first: has(t, 'erstes', 'erster', 'ersten spot', 'first'),
    topBrand: has(t, 'meistgespottet', 'meisten', 'most spotted', 'lieblingsmarke', 'haufigste'),
    streak: has(t, 'serie', 'streak', 'am stuck'),
    wantsSpots: !!period || has(t, 'gespottet', 'spots', 'spot', 'spotted', 'gesehen', 'wann', 'history', 'verlauf'),
    userQuery: userMatch?.[1],
  };
}

export type SearchResult =
  | { kind: 'cards'; answer: string; cards: CarCardData[] }
  | { kind: 'spots'; answer: string; spots: Spot[] }
  | { kind: 'models'; answer: string; models: CarModel[] }
  | { kind: 'users'; answer: string; users: User[] }
  | { kind: 'text'; answer: string };

function inPeriod(iso: string, p?: Period) {
  if (!p) return true;
  const d = new Date(iso);
  if (p === 'yesterday') {
    const start = periodStartDate('today')!;
    const y = new Date(start);
    y.setDate(y.getDate() - 1);
    return d >= y && d < start;
  }
  return d >= periodStartDate(p)!;
}

const PERIOD_TEXT: Record<Period, string> = { today: 'heute', yesterday: 'gestern', week: 'diese Woche', month: 'diesen Monat', year: 'dieses Jahr' };
const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

export function runQuery(q: ParsedQuery, allSpots: Spot[], users: User[], meId: ID): SearchResult {
  const brandIds = new Set(q.brands.map((b) => b.id));
  const brandText = q.brands.map((b) => b.name).join(' / ');
  const rarityOk = (r: Rarity) => (q.rarity ? r === q.rarity : q.minRarity ? atLeast(r, q.minRarity) : true);
  const rarityText = q.rarity ? `${RARITY_META[q.rarity].emoji} ${RARITY_META[q.rarity].label}` : q.minRarity ? 'seltene' : '';

  // Nutzer suchen
  if (q.userQuery) {
    const u = users.filter((x) => x.username.toLowerCase().includes(q.userQuery!.toLowerCase()) || x.displayName.toLowerCase().includes(q.userQuery!.toLowerCase()));
    return { kind: 'users', answer: u.length ? `${plural(u.length, 'Spotter', 'Spotter')} gefunden` : `Kein Spotter „${q.userQuery}“ gefunden`, users: u };
  }

  const mine = mySpots(allSpots, meId);
  const cards = carCards(allSpots, meId);

  // Statistik-Fragen
  if (q.streak) {
    const s = historyStats(mine);
    return { kind: 'text', answer: `🔥 Deine längste Spotting-Serie: ${plural(s.longestStreak, 'Tag', 'Tage')} am Stück. Aktuelle Serie: ${plural(s.currentStreak, 'Tag', 'Tage')}.` };
  }
  if (q.topBrand && !q.brands.length) {
    const s = historyStats(mine);
    if (!s.topBrand) return { kind: 'text', answer: 'Du hast noch keine Spots.' };
    const list = mine.filter((x) => getModel(x.modelId).brandId === s.topBrand!.brandId);
    return { kind: 'spots', answer: `Deine meistgespottete Marke ist ${getBrand(s.topBrand.brandId).name} mit ${plural(s.topBrand.count, 'Spot', 'Spots')}.`, spots: list };
  }
  if (q.first) {
    const first = [...mine].reverse()[0];
    return first
      ? { kind: 'spots', answer: `Dein erster Spot: ${getBrand(getModel(first.modelId).brandId).name} ${getModel(first.modelId).name} am ${new Date(first.createdAt).toLocaleDateString('de-DE')}.`, spots: [first] }
      : { kind: 'text', answer: 'Du hast noch keine Spots.' };
  }

  // Noch nicht gesammelt
  if (q.missing) {
    const have = new Set(cards.map((c) => c.model.id));
    const pool = q.brands.length ? q.brands.flatMap((b) => modelsOfBrand(b.id)) : MODELS.filter((m) => m.source === 'curated');
    const miss = pool.filter((m) => !have.has(m.id) && rarityOk(m.rarity)).sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity));
    return {
      kind: 'models',
      answer: miss.length
        ? `Dir fehlen noch ${plural(miss.length, 'Modell', 'Modelle')}${brandText ? ` von ${brandText}` : ''}${q.brands.length ? '' : ' aus den Top-Supercars'}.`
        : `Du hast alle ${brandText || ''} Modelle gesammelt! 🏆`,
      models: miss,
    };
  }

  // Spots (Zeitraum / „gespottet“)
  if (q.wantsSpots) {
    const list = mine.filter(
      (s) =>
        inPeriod(s.createdAt, q.period) &&
        (!brandIds.size || brandIds.has(getModel(s.modelId).brandId)) &&
        (!q.models.length || s.modelId === q.models[0].id) &&
        rarityOk(getModel(s.modelId).rarity),
    );
    const sorted = q.rarest ? [...list].sort((a, b) => rarityRank(getModel(b.modelId).rarity) - rarityRank(getModel(a.modelId).rarity)) : list;
    const what = [rarityText, q.models[0] ? `${brandText} ${q.models[0].name}` : brandText].filter(Boolean).join(' ');
    const answer = q.count
      ? `Du hast ${q.period ? PERIOD_TEXT[q.period] + ' ' : ''}${plural(list.length, 'Spot', 'Spots')}${what ? ` (${what})` : ''}.`
      : list.length
        ? `${plural(list.length, 'Spot', 'Spots')}${what ? ` · ${what}` : ''}${q.period ? ` · ${PERIOD_TEXT[q.period]}` : ''}`
        : `Keine Spots${what ? ` (${what})` : ''}${q.period ? ` ${PERIOD_TEXT[q.period]}` : ''} gefunden.`;
    return { kind: 'spots', answer, spots: sorted };
  }

  // Car Cards (Standard)
  let list = cards.filter((c) => (!brandIds.size || brandIds.has(c.model.brandId)) && (!q.models.length || c.model.id === q.models[0].id) && rarityOk(c.model.rarity));
  if (q.rarest) list = [...list].sort((a, b) => rarityRank(b.model.rarity) - rarityRank(a.model.rarity)).slice(0, 10);
  else list = [...list].sort((a, b) => (b.firstSpot?.createdAt ?? '').localeCompare(a.firstSpot?.createdAt ?? ''));

  const hasFilter = brandIds.size || q.rarity || q.minRarity || q.rarest || q.models.length;
  if (!hasFilter && !q.count) {
    // Freitext: Modelle im Katalog + eigene Karten
    const term = norm(q.raw);
    const models = term.length >= 2 ? MODELS.filter((m) => norm(`${getBrand(m.brandId).name}${m.name}`).includes(term)).slice(0, 40) : [];
    if (models.length) return { kind: 'models', answer: `${plural(models.length, 'Modell', 'Modelle')} im Katalog gefunden`, models };
    return { kind: 'text', answer: 'Das habe ich nicht verstanden. Probier z. B. „Welche Lamborghini habe ich noch nicht gesammelt?“' };
  }
  const what = [rarityText, brandText].filter(Boolean).join(' ');
  if (!list.length && !q.count && q.brands.length && !q.rarest) {
    const models = q.brands.flatMap((b) => modelsOfBrand(b.id)).filter((m) => rarityOk(m.rarity));
    return { kind: 'models', answer: `Noch keine ${what} Car Card – diese Modelle kannst du jagen:`, models };
  }
  const answer = q.count
    ? `Du hast ${plural(list.length, 'Car Card', 'Car Cards')}${what ? ` (${what})` : ''} – insgesamt ${plural(list.reduce((a, c) => a + c.count, 0), 'Spot', 'Spots')}.`
    : q.rarest
      ? `Deine ${plural(list.length, 'seltenste Karte', 'seltensten Karten')}${brandText ? ` von ${brandText}` : ''}`
      : list.length
        ? `${plural(list.length, 'Car Card', 'Car Cards')}${what ? ` · ${what}` : ''}`
        : `Noch keine ${what || 'passenden'} Car Cards – ab auf die Jagd!`;
  return { kind: 'cards', answer, cards: list };
}

export const SEARCH_EXAMPLES = [
  'Welche Lamborghini habe ich noch nicht gesammelt?',
  'Zeige mir meine seltensten Autos',
  'Welche Porsche habe ich diesen Monat gespottet?',
  'Wie viele Ferrari habe ich?',
  'Zeige mir meine legendären Spots',
  'Was habe ich diese Woche gespottet?',
  'Meine längste Serie',
  'Meistgespottete Marke',
];

export const ALL_RARITIES = RARITY_ORDER;
