import type { BodyStyle, CarBrand, CarClass, CarModel, Rarity } from '../types/models';
import CATALOG from './carCatalog.json';
import { normalizeRarity } from '../lib/rarity';

/**
 * AUTO-KATALOG
 * ────────────
 * 1. Kuratierte Modelle (unten, mit Seltenheit, Foto, Illustration)
 * 2. Offener Katalog aller Marken & Modelle (carCatalog.json: 359 Marken, ~1.950 Modelle,
 *    Quelle: npm-Paket „car-brands-models“, MIT-Lizenz)
 * 3. Eigene Modelle: Alles, was nicht im Katalog steht, legt die KI-Erkennung oder der
 *    Nutzer selbst an → so kann JEDES Auto gespottet werden.
 *
 * Ursprünglich: Auto-Katalog (Testdaten).
 * TODO(backend): Aus Tabelle `car_brands` / `car_models` laden. Der Katalog ist
 * auch die Label-Liste, auf die eine KI-Erkennung (src/services/carRecognition.ts) mappt.
 */

export const BRANDS: CarBrand[] = [
  { id: 'lamborghini', name: 'Lamborghini', country: 'IT', color: '#f5b800', featured: true },
  { id: 'ferrari', name: 'Ferrari', country: 'IT', color: '#e3120b', featured: true },
  { id: 'porsche', name: 'Porsche', country: 'DE', color: '#c9a45c', featured: true },
  { id: 'mclaren', name: 'McLaren', country: 'UK', color: '#ff7a00', featured: true },
  { id: 'bugatti', name: 'Bugatti', country: 'FR', color: '#3a6df0', featured: true },
  { id: 'koenigsegg', name: 'Koenigsegg', country: 'SE', color: '#9aa7b8', featured: true },
  { id: 'pagani', name: 'Pagani', country: 'IT', color: '#b8c4d6' },
  { id: 'aston-martin', name: 'Aston Martin', country: 'UK', color: '#1f7a5a' },
  { id: 'mercedes-amg', name: 'Mercedes-AMG', country: 'DE', color: '#a8b0ba' },
  { id: 'bmw', name: 'BMW', country: 'DE', color: '#2a7de1' },
  { id: 'audi', name: 'Audi', country: 'DE', color: '#d4d4d8' },
  { id: 'rolls-royce', name: 'Rolls-Royce', country: 'UK', color: '#6d5bd0' },
  { id: 'bentley', name: 'Bentley', country: 'UK', color: '#2e6b4f' },
  { id: 'rimac', name: 'Rimac', country: 'HR', color: '#22c3c3' },
  { id: 'ford', name: 'Ford', country: 'US', color: '#1f4fd1' },
  { id: 'nissan', name: 'Nissan', country: 'JP', color: '#c7c7c7' },
];

type Row = [name: string, rarity: Rarity, body: BodyStyle, cls: CarClass, paint: string, years?: string];

const RAW: Record<string, Row[]> = {
  lamborghini: [
    ['Huracán EVO', 'rare', 'supercar', 'supercar', '#9bd32c', '2019–2023'],
    ['Huracán STO', 'epic', 'supercar', 'supercar', '#2f8fe0', '2021–2024'],
    ['Huracán Sterrato', 'epic', 'supercar', 'supercar', '#d8a640', '2023–2024'],
    ['Temerario', 'rare', 'supercar', 'supercar', '#f06a1b', '2025–'],
    ['Aventador S', 'rare', 'supercar', 'supercar', '#f5b800', '2017–2022'],
    ['Aventador SVJ', 'epic', 'hypercar', 'supercar', '#7a2cd6', '2018–2022'],
    ['Revuelto', 'epic', 'supercar', 'supercar', '#e8e8e8', '2023–'],
    ['Urus S', 'common', 'suv', 'suv', '#d9d9d9', '2022–'],
    ['Urus Performante', 'rare', 'suv', 'suv', '#e0421b', '2022–'],
    ['Countach LPI 800-4', 'legendary', 'hypercar', 'hypercar', '#e8e2d0', '2022'],
    ['Sián FKP 37', 'impossible', 'hypercar', 'hypercar', '#3fb5a6', '2020'],
    ['Miura (Klassiker)', 'legendary', 'coupe', 'supercar', '#f06a1b', '1966–1973'],
  ],
  ferrari: [
    ['Roma', 'common', 'gt', 'sports', '#c9ccd1', '2020–'],
    ['296 GTB', 'rare', 'supercar', 'supercar', '#e3120b', '2022–'],
    ['F8 Tributo', 'rare', 'supercar', 'supercar', '#e3120b', '2019–2023'],
    ['SF90 Stradale', 'epic', 'supercar', 'supercar', '#e3120b', '2019–'],
    ['812 Superfast', 'epic', 'gt', 'supercar', '#1b2a4a', '2017–2023'],
    ['Purosangue', 'rare', 'suv', 'suv', '#4a4f57', '2023–'],
    ['12Cilindri', 'epic', 'gt', 'supercar', '#e8c32a', '2024–'],
    ['F40', 'legendary', 'supercar', 'hypercar', '#e3120b', '1987–1992'],
    ['LaFerrari', 'legendary', 'hypercar', 'hypercar', '#e3120b', '2013–2016'],
    ['Daytona SP3', 'legendary', 'hypercar', 'hypercar', '#e3120b', '2022–'],
    ['F80', 'exotic', 'hypercar', 'hypercar', '#e3120b', '2025–'],
  ],
  porsche: [
    ['911 Carrera', 'common', 'coupe', 'sports', '#c9ccd1', '2019–'],
    ['911 Carrera S', 'common', 'coupe', 'sports', '#1d4ed8', '2019–'],
    ['911 Turbo S', 'rare', 'coupe', 'sports', '#8f969e', '2020–'],
    ['911 GT3', 'rare', 'coupe', 'sports', '#2fa84f', '2021–'],
    ['911 GT3 RS', 'epic', 'coupe', 'supercar', '#9bd32c', '2022–'],
    ['911 GT2 RS', 'epic', 'coupe', 'supercar', '#f06a1b', '2017–2019'],
    ['911 S/T', 'epic', 'coupe', 'sports', '#c8a978', '2023–'],
    ['911 Dakar', 'epic', 'coupe', 'sports', '#e8e2d0', '2023–'],
    ['718 Cayman GT4 RS', 'rare', 'coupe', 'sports', '#e3120b', '2021–'],
    ['718 Spyder RS', 'rare', 'coupe', 'sports', '#7a8a3a', '2023–'],
    ['Taycan Turbo GT', 'rare', 'sedan', 'sports', '#5a6b7a', '2024–'],
    ['Panamera Turbo E-Hybrid', 'common', 'sedan', 'luxury', '#2b2f36', '2024–'],
    ['Cayenne Turbo GT', 'common', 'suv', 'suv', '#8f969e', '2021–'],
    ['Carrera GT', 'exotic', 'supercar', 'hypercar', '#c9ccd1', '2004–2007'],
    ['918 Spyder', 'exotic', 'hypercar', 'hypercar', '#e8e8e8', '2013–2015'],
  ],
  mclaren: [
    ['Artura', 'rare', 'supercar', 'supercar', '#ff7a00', '2022–'],
    ['750S', 'rare', 'supercar', 'supercar', '#ff7a00', '2023–'],
    ['720S', 'rare', 'supercar', 'supercar', '#2f8fe0', '2017–2023'],
    ['765LT', 'epic', 'supercar', 'supercar', '#9bd32c', '2020–2023'],
    ['GT', 'common', 'gt', 'sports', '#5a6b7a', '2019–2023'],
    ['Senna', 'exotic', 'hypercar', 'hypercar', '#f5b800', '2018–2019'],
    ['Elva', 'legendary', 'hypercar', 'hypercar', '#e8e8e8', '2020–2022'],
    ['W1', 'exotic', 'hypercar', 'hypercar', '#ff7a00', '2025–'],
    ['P1', 'exotic', 'hypercar', 'hypercar', '#e3120b', '2013–2015'],
  ],
  bugatti: [
    ['Chiron', 'exotic', 'hypercar', 'hypercar', '#3a6df0', '2016–2022'],
    ['Chiron Super Sport', 'exotic', 'hypercar', 'hypercar', '#2b2f36', '2021–2023'],
    ['Veyron', 'exotic', 'hypercar', 'hypercar', '#1b2a4a', '2005–2015'],
    ['Divo', 'impossible', 'hypercar', 'hypercar', '#5a6b7a', '2019–2021'],
    ['Tourbillon', 'legendary', 'hypercar', 'hypercar', '#c9ccd1', '2026–'],
  ],
  koenigsegg: [
    ['Jesko', 'legendary', 'hypercar', 'hypercar', '#e8e8e8', '2022–'],
    ['Regera', 'exotic', 'hypercar', 'hypercar', '#1d4ed8', '2016–2022'],
    ['Gemera', 'legendary', 'gt', 'hypercar', '#8f969e', '2025–'],
    ['CC850', 'impossible', 'hypercar', 'hypercar', '#c8a978', '2024–'],
    ['Agera RS', 'impossible', 'hypercar', 'hypercar', '#f06a1b', '2015–2018'],
  ],
  pagani: [
    ['Huayra', 'exotic', 'hypercar', 'hypercar', '#5a6b7a', '2012–2022'],
    ['Zonda', 'legendary', 'hypercar', 'hypercar', '#b8c4d6', '1999–2019'],
    ['Utopia', 'legendary', 'hypercar', 'hypercar', '#1f7a5a', '2023–'],
  ],
  'aston-martin': [
    ['Vantage', 'common', 'coupe', 'sports', '#1f7a5a', '2024–'],
    ['DB12', 'rare', 'gt', 'luxury', '#c9ccd1', '2023–'],
    ['DBS 770 Ultimate', 'epic', 'gt', 'supercar', '#1b2a4a', '2023'],
    ['Valkyrie', 'legendary', 'hypercar', 'hypercar', '#1f7a5a', '2021–'],
    ['DBX707', 'common', 'suv', 'suv', '#2b2f36', '2022–'],
  ],
  'mercedes-amg': [
    ['AMG GT 63', 'common', 'gt', 'sports', '#8f969e', '2023–'],
    ['AMG GT Black Series', 'epic', 'gt', 'supercar', '#f06a1b', '2020–2022'],
    ['SLS AMG', 'rare', 'gt', 'sports', '#c9ccd1', '2010–2014'],
    ['AMG ONE', 'legendary', 'hypercar', 'hypercar', '#c9ccd1', '2022–'],
    ['G 63', 'common', 'suv', 'suv', '#2b2f36', '2018–'],
  ],
  bmw: [
    ['M2', 'common', 'coupe', 'sports', '#2a7de1', '2023–'],
    ['M4 CSL', 'rare', 'coupe', 'sports', '#c9ccd1', '2022–2023'],
    ['M5', 'common', 'sedan', 'sports', '#1b2a4a', '2024–'],
    ['M8 Competition', 'common', 'gt', 'sports', '#5a6b7a', '2019–'],
    ['3.0 CSL', 'epic', 'coupe', 'sports', '#e8e2d0', '2023'],
  ],
  audi: [
    ['R8 V10 performance', 'rare', 'supercar', 'supercar', '#d4d4d8', '2019–2024'],
    ['RS 6 Avant', 'common', 'sedan', 'sports', '#8f969e', '2019–'],
    ['RS e-tron GT', 'common', 'sedan', 'sports', '#5a6b7a', '2021–'],
    ['RS Q8', 'common', 'suv', 'suv', '#2b2f36', '2020–'],
  ],
  'rolls-royce': [
    ['Cullinan', 'rare', 'suv', 'luxury', '#1b1b1f', '2018–'],
    ['Spectre', 'rare', 'gt', 'luxury', '#6d5bd0', '2023–'],
    ['Phantom', 'rare', 'sedan', 'luxury', '#1b1b1f', '2017–'],
    ['Ghost', 'common', 'sedan', 'luxury', '#c9ccd1', '2020–'],
  ],
  bentley: [
    ['Continental GT Speed', 'common', 'gt', 'luxury', '#2e6b4f', '2021–'],
    ['Bentayga', 'common', 'suv', 'luxury', '#8f969e', '2016–'],
    ['Batur', 'impossible', 'gt', 'luxury', '#c8a978', '2023–'],
  ],
  rimac: [['Nevera', 'legendary', 'hypercar', 'hypercar', '#22c3c3', '2021–']],
  ford: [
    ['GT (2017)', 'exotic', 'supercar', 'supercar', '#1f4fd1', '2017–2022'],
    ['Mustang Dark Horse', 'common', 'coupe', 'sports', '#1b2a4a', '2024–'],
  ],
  nissan: [
    ['GT-R Nismo', 'rare', 'coupe', 'sports', '#c7c7c7', '2014–2025'],
    ['Skyline GT-R R34', 'epic', 'coupe', 'sports', '#2a7de1', '1999–2002'],
  ],
};

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Vergleichsform für Namen („Huracán EVO“ ≈ „huracan evo“) */
export const norm = (s: string) => slug(s).replace(/-/g, '');

export const MODELS: CarModel[] = Object.entries(RAW).flatMap(([brandId, rows]) =>
  rows.map(([name, rarity, body, carClass, paint, years]) => ({
    id: `${brandId}-${slug(name)}`,
    brandId,
    name,
    rarity,
    body,
    carClass,
    paint,
    years,
    source: 'curated' as const,
    rarityBy: 'curated' as const,
  })),
);


/** Leistung (PS, gerundet) der kuratierten Modelle – für PS-Challenges. */
const HP: Record<string, number> = {
  'lamborghini-huracan-evo': 640, 'lamborghini-huracan-sto': 640, 'lamborghini-huracan-sterrato': 610, 'lamborghini-temerario': 920,
  'lamborghini-aventador-s': 740, 'lamborghini-aventador-svj': 770, 'lamborghini-revuelto': 1015, 'lamborghini-urus-s': 666,
  'lamborghini-urus-performante': 666, 'lamborghini-countach-lpi-800-4': 814, 'lamborghini-sian-fkp-37': 819, 'lamborghini-miura-klassiker': 385,
  'ferrari-roma': 620, 'ferrari-296-gtb': 830, 'ferrari-f8-tributo': 720, 'ferrari-sf90-stradale': 1000, 'ferrari-812-superfast': 800,
  'ferrari-purosangue': 725, 'ferrari-12cilindri': 830, 'ferrari-f40': 478, 'ferrari-laferrari': 963, 'ferrari-daytona-sp3': 840, 'ferrari-f80': 1200,
  'porsche-911-carrera': 394, 'porsche-911-carrera-s': 480, 'porsche-911-turbo-s': 650, 'porsche-911-gt3': 510, 'porsche-911-gt3-rs': 525,
  'porsche-911-gt2-rs': 700, 'porsche-911-s-t': 525, 'porsche-911-dakar': 480, 'porsche-718-cayman-gt4-rs': 500, 'porsche-718-spyder-rs': 500,
  'porsche-taycan-turbo-gt': 1034, 'porsche-panamera-turbo-e-hybrid': 680, 'porsche-cayenne-turbo-gt': 659, 'porsche-carrera-gt': 612, 'porsche-918-spyder': 887,
  'mclaren-artura': 680, 'mclaren-750s': 750, 'mclaren-720s': 720, 'mclaren-765lt': 765, 'mclaren-gt': 620, 'mclaren-senna': 800,
  'mclaren-elva': 815, 'mclaren-w1': 1275, 'mclaren-p1': 916,
  'bugatti-chiron': 1500, 'bugatti-chiron-super-sport': 1600, 'bugatti-veyron': 1001, 'bugatti-divo': 1500, 'bugatti-tourbillon': 1800,
  'koenigsegg-jesko': 1600, 'koenigsegg-regera': 1500, 'koenigsegg-gemera': 2300, 'koenigsegg-cc850': 1385, 'koenigsegg-agera-rs': 1360,
  'pagani-huayra': 730, 'pagani-zonda': 600, 'pagani-utopia': 864,
  'aston-martin-vantage': 665, 'aston-martin-db12': 680, 'aston-martin-dbs-770-ultimate': 770, 'aston-martin-valkyrie': 1160, 'aston-martin-dbx707': 707,
  'mercedes-amg-amg-gt-63': 585, 'mercedes-amg-amg-gt-black-series': 730, 'mercedes-amg-sls-amg': 571, 'mercedes-amg-amg-one': 1063, 'mercedes-amg-g-63': 585,
  'bmw-m2': 460, 'bmw-m4-csl': 550, 'bmw-m5': 727, 'bmw-m8-competition': 625, 'bmw-3-0-csl': 560,
  'audi-r8-v10-performance': 620, 'audi-rs-6-avant': 600, 'audi-rs-e-tron-gt': 646, 'audi-rs-q8': 600,
  'rolls-royce-cullinan': 571, 'rolls-royce-spectre': 585, 'rolls-royce-phantom': 571, 'rolls-royce-ghost': 571,
  'bentley-continental-gt-speed': 659, 'bentley-bentayga': 550, 'bentley-batur': 750, 'rimac-nevera': 1914,
  'ford-gt-2017': 660, 'ford-mustang-dark-horse': 500, 'nissan-gt-r-nismo': 600, 'nissan-skyline-gt-r-r34': 280,
};
MODELS.forEach((m) => {
  if (HP[m.id]) m.hp = HP[m.id];
});
export const HP_KEYS = Object.keys(HP);

export const brandById = new Map(BRANDS.map((b) => [b.id, b]));
export const modelById = new Map(MODELS.map((m) => [m.id, m]));

// ─── Offener Katalog einmischen ──────────────────────────────────────────

const BRAND_ALIASES: Record<string, string> = { vw: 'volkswagen', 'mercedes-amg': 'mercedes-amg' };
const BRAND_DISPLAY: Record<string, string> = { volkswagen: 'Volkswagen', mclaren: 'McLaren', ssangyong: 'SsangYong', 'mev-hummer': 'MEV Hummer' };

/** Marken, deren Modelle grundsätzlich selten sind (für Seltenheit & Supercar-Badge). */
const EXOTIC = new Set(['lamborghini', 'ferrari', 'mclaren', 'bugatti', 'koenigsegg', 'pagani', 'rimac', 'spyker', 'gumpert', 'mosler', 'saleen', 'rossion', 'de-tomaso', 'bizzarrini', 'sbarro', 'wiesmann', 'ruf', 'zenvo', 'hennessey', 'ssc', 'apollo', 'vector', 'pininfarina']);
const LUXURY = new Set(['rolls-royce', 'bentley', 'aston-martin', 'maserati', 'lotus', 'bmw-alpina', 'lagonda', 'maybach', 'morgan', 'caterham', 'donkervoort', 'alpine', 'tvr', 'brabham', 'lola', 'radical', 'artega', 'venturi', 'monteverdi', 'facel-vega', 'iso', 'jensen', 'bristol', 'lamborghini']);

const PALETTE = ['#9aa7b8', '#c9ccd1', '#3a6df0', '#e3120b', '#2fa84f', '#f5b800', '#8f969e', '#1f7a5a', '#b26bff', '#ff7a00'];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function ensureBrand(name: string, id = slug(name)): CarBrand {
  const existing = brandById.get(id);
  if (existing) return existing;
  const b: CarBrand = { id, name: BRAND_DISPLAY[id] ?? name, country: '', color: PALETTE[hash(id) % PALETTE.length] };
  BRANDS.push(b);
  brandById.set(id, b);
  return b;
}

function defaultsFor(brandId: string): Pick<CarModel, 'rarity' | 'body' | 'carClass'> {
  if (EXOTIC.has(brandId)) return { rarity: 'epic', body: 'supercar', carClass: 'supercar' };
  if (LUXURY.has(brandId)) return { rarity: 'rare', body: 'gt', carClass: 'luxury' };
  return { rarity: 'common', body: 'sedan', carClass: 'standard' };
}

function addModel(m: CarModel) {
  if (modelById.has(m.id)) return modelById.get(m.id)!;
  MODELS.push(m);
  modelById.set(m.id, m);
  return m;
}

for (const [brandName, models] of CATALOG as [string, string[]][]) {
  const id = BRAND_ALIASES[slug(brandName)] ?? slug(brandName);
  const brand = ensureBrand(brandName, id);
  const taken = new Set(MODELS.filter((m) => m.brandId === brand.id).map((m) => norm(m.name)));
  for (const name of models) {
    if (taken.has(norm(name))) continue;
    taken.add(norm(name));
    addModel({
      id: `${brand.id}-${slug(name)}`,
      brandId: brand.id,
      name,
      paint: PALETTE[hash(brand.id + name) % PALETTE.length],
      source: 'catalog',
      rarityBy: 'estimate',
      ...defaultsFor(brand.id),
    });
  }
}

// ─── Eigene Modelle (KI-Erkennung oder manuell) ──────────────────────────

export interface CustomModelInput {
  brandName: string;
  modelName: string;
  rarity?: Rarity;
  body?: BodyStyle;
  carClass?: CarClass;
  years?: string;
}

/** Findet eine Marke per Name (tolerant) – oder undefined. */
export function findBrand(name: string): CarBrand | undefined {
  const n = norm(name);
  const id = BRAND_ALIASES[slug(name)] ?? slug(name);
  return brandById.get(id) ?? BRANDS.find((b) => norm(b.name) === n);
}

/** Findet ein Modell einer Marke per Name: exakt, sonst längster passender Katalogname. */
export function findModel(brandId: string, modelName: string): CarModel | undefined {
  const n = norm(modelName);
  const list = MODELS.filter((m) => m.brandId === brandId);
  return (
    list.find((m) => norm(m.name) === n) ??
    list
      .filter((m) => norm(m.name).length >= 3 && (n.startsWith(norm(m.name)) || norm(m.name).startsWith(n)))
      .sort((a, b) => norm(b.name).length - norm(a.name).length)[0]
  );
}

/**
 * Legt ein neues Modell an (oder gibt das vorhandene zurück).
 * TODO(backend): In Tabelle `car_models` speichern (mit Status „ungeprüft“),
 * damit alle Nutzer davon profitieren und Moderatoren die Seltenheit prüfen können.
 */
export function registerCustomModel(input: CustomModelInput): CarModel {
  const brand = findBrand(input.brandName) ?? ensureBrand(input.brandName.trim());
  const exact = MODELS.find((m) => m.brandId === brand.id && norm(m.name) === norm(input.modelName));
  if (exact) return exact;
  const d = defaultsFor(brand.id);
  return addModel({
    id: `${brand.id}-${slug(input.modelName)}`,
    brandId: brand.id,
    name: input.modelName.trim(),
    rarity: input.rarity ?? d.rarity,
    body: input.body ?? d.body,
    carClass: input.carClass ?? d.carClass,
    paint: PALETTE[hash(brand.id + input.modelName) % PALETTE.length],
    years: input.years,
    source: 'custom',
    rarityBy: input.rarity ? 'ai' : 'estimate',
  });
}

/**
 * Seltenheit durch die KI festlegen. Geprüfte (curated) Modelle bleiben unverändert.
 * Menschen können die Seltenheit nicht wählen – nur die KI (oder geprüfte Daten).
 * TODO(backend): serverseitig speichern, damit das Ergebnis für alle Nutzer gilt.
 */
export function applyAiRarity(modelId: string, rarity: Rarity): boolean {
  const m = modelById.get(modelId);
  if (!m || m.source === 'curated') return false;
  m.rarity = normalizeRarity(rarity);
  m.rarityBy = 'ai';
  return true;
}

/** Beim App-Start gespeicherte KI-Seltenheiten wieder anwenden. */
export function restoreAiRarity(map: Record<string, Rarity>) {
  for (const [id, r] of Object.entries(map)) applyAiRarity(id, r);
}

/** Braucht dieses Modell noch eine KI-Klassifizierung? */
export const needsAiRarity = (m: CarModel) => m.source !== 'curated' && m.rarityBy !== 'ai';

/** Beim App-Start gespeicherte eigene Modelle wieder registrieren. */
export function restoreCustomModels(models: CarModel[]) {
  for (const raw of models) {
    const m = { ...raw, rarity: normalizeRarity(raw.rarity) };
    if (!brandById.has(m.brandId)) ensureBrand(m.brandId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), m.brandId);
    addModel(m);
  }
}

export const customModels = () => MODELS.filter((m) => m.source === 'custom');

const UNKNOWN_BRAND: CarBrand = { id: 'unknown', name: 'Unbekannt', country: '', color: '#8a929b' };
export const getBrand = (id: string) => brandById.get(id) ?? UNKNOWN_BRAND;
export const getModel = (id: string): CarModel =>
  modelById.get(id) ?? { id, brandId: 'unknown', name: id, rarity: 'common', body: 'sedan', carClass: 'standard', paint: '#8a929b' };
export const modelsOfBrand = (brandId: string) => MODELS.filter((m) => m.brandId === brandId);
export const fullName = (m: CarModel) => `${getBrand(m.brandId).name} ${m.name}`;

/** Beliebte Marken für die Schnellauswahl (Rest über „Alle Marken A–Z“ / Suche). */
export const POPULAR_BRAND_IDS = [
  'porsche', 'ferrari', 'lamborghini', 'mclaren', 'bugatti', 'koenigsegg', 'mercedes-amg', 'mercedes-benz', 'bmw', 'audi',
  'volkswagen', 'tesla', 'toyota', 'ford', 'opel', 'skoda', 'seat', 'cupra', 'renault', 'peugeot', 'fiat', 'hyundai', 'kia',
  'volvo', 'mazda', 'honda', 'nissan', 'mini', 'land-rover', 'jaguar', 'maserati', 'alfa-romeo', 'aston-martin', 'bentley',
  'rolls-royce', 'pagani', 'rimac', 'lotus', 'dacia', 'lexus', 'chevrolet', 'dodge', 'jeep', 'polestar',
].filter((id) => brandById.has(id));
