import { MODELS, findBrand, findModel, getBrand, type CustomModelInput } from '../data/cars';
import type { BodyStyle, CarClass, CarModel, Rarity } from '../types/models';
// Rarity: 6 Stufen, siehe lib/rarity.ts
import { normalizeRarity } from '../lib/rarity';

/**
 * AUTO-ERKENNUNG – erkennt JEDES Auto (nicht nur den Katalog)
 * ──────────────────────────────────────────────────────────────
 * Die KI liefert Marke + Modell (+ Variante, Seltenheit).
 * Danach wird das Ergebnis dem Katalog zugeordnet; unbekannte Modelle werden
 * automatisch neu angelegt (registerCustomModel) → jedes Auto kann gesammelt werden.
 *
 * Anbieter (der erste verfügbare wird benutzt):
 *  1. Claude in der claude.ai-Vorschau (Artifact-Capability „sample“) – keine Einrichtung nötig
 *  2. Eigener KI-Server:  `npm run server` (server/recognize.mjs, braucht ANTHROPIC_API_KEY)
 *     → Endpunkt POST /api/recognize  (oder VITE_RECOGNITION_URL)
 *  3. Demo – rät nur, damit die App ohne KI bedienbar bleibt
 *
 * WICHTIG: API-Keys nie in den Client. In der echten App läuft Variante 2 im Backend.
 */

export interface RecognizedCar {
  brand: string;
  model: string;
  variant?: string;
  year?: string;
  rarity?: Rarity;
  carClass?: CarClass;
  body?: BodyStyle;
  confidence: number;
}

export interface RecognitionResult {
  isCar: boolean;
  best?: RecognizedCar;
  alternatives: RecognizedCar[];
  provider: string;
  isDemo: boolean;
}

export interface CarRecognitionProvider {
  name: string;
  isDemo: boolean;
  recognize(image: Blob): Promise<RecognitionResult>;
}

/** Derselbe Prompt für Server und Artifact – so sind die Antworten identisch aufgebaut. */
export const RECOGNITION_PROMPT = `You identify cars in photos for a car-spotting app. Any car worldwide can appear: everyday cars, classics, supercars, trucks.
Reply with ONLY a JSON object, no prose:
{"isCar": true, "best": {"brand": "", "model": "", "variant": "", "year": "", "rarity": "common", "carClass": "standard", "body": "sedan", "confidence": 0.0}, "alternatives": []}
Rules:
- brand: official manufacturer name (e.g. "Volkswagen", "Mercedes-Benz", "Mercedes-AMG", "Porsche"). model: without the brand (e.g. "Golf GTI", "911 GT3 RS").
- variant: trim/edition if visible, else "". year: approximate model years like "2019–2023", else "".
- rarity (6 tiers): "common" = everyday cars; "rare" = premium sports/luxury cars (e.g. Porsche 911 Carrera, Ferrari Roma, Rolls-Royce Ghost); "epic" = top supercars or special editions (e.g. 911 GT3 RS, Ferrari SF90, McLaren 765LT, Lamborghini Revuelto); "exotic" = small-series hypercars (e.g. Bugatti Chiron, Bugatti Chiron Super Sport, Bugatti Veyron, McLaren Senna, Porsche 918 Spyder, Pagani Huayra); "legendary" = icons and strictly limited hypercars (e.g. Ferrari F40, LaFerrari, Koenigsegg Jesko, Aston Martin Valkyrie, Lamborghini Miura); "impossible" = one-offs or fewer than ~100 built (e.g. Bugatti Divo, Lamborghini Sián, Koenigsegg CC850, Bentley Batur).
- carClass: one of standard, sports, supercar, hypercar, luxury, suv. body: one of supercar, hypercar, coupe, gt, sedan, suv.
- confidence 0..1. alternatives: up to 2 other plausible cars in the same shape.
- If there is no car in the image: {"isCar": false, "alternatives": []}.
- Rarity is decided ONLY by you, based on production numbers and real-world sightings – never by the user.`;

/**
 * Text-Klassifizierung der Seltenheit (für manuell gewählte / eingegebene Autos).
 * {CAR} wird durch „Marke Modell“ ersetzt. Gleiche Stufen wie oben.
 */
export const RARITY_PROMPT = `You classify how rare a car is for a car-spotting app, based on production numbers and how often it is seen on the street.
Car: {CAR}
Reply with ONLY a JSON object: {"rarity": "common", "carClass": "standard", "body": "sedan"}
- rarity (6 tiers): "common" = everyday cars; "rare" = premium sports/luxury cars (e.g. Porsche 911 Carrera, Ferrari Roma, Rolls-Royce Ghost); "epic" = top supercars or special editions (e.g. 911 GT3 RS, Ferrari SF90, McLaren 765LT, Lamborghini Revuelto); "exotic" = small-series hypercars (e.g. Bugatti Chiron, Bugatti Chiron Super Sport, Bugatti Veyron, McLaren Senna, Porsche 918 Spyder, Pagani Huayra); "legendary" = icons and strictly limited hypercars (e.g. Ferrari F40, LaFerrari, Koenigsegg Jesko, Aston Martin Valkyrie, Lamborghini Miura); "impossible" = one-offs or fewer than ~100 built (e.g. Bugatti Divo, Lamborghini Sián, Koenigsegg CC850, Bentley Batur).
- carClass: one of standard, sports, supercar, hypercar, luxury, suv. body: one of supercar, hypercar, coupe, gt, sedan, suv.
- If the name is not a real car, still pick the most plausible tier.`;

const CLASSES: CarClass[] = ['standard', 'sports', 'supercar', 'hypercar', 'luxury', 'suv'];
const BODIES: BodyStyle[] = ['supercar', 'hypercar', 'coupe', 'gt', 'sedan', 'suv'];

function clean(c: Partial<RecognizedCar> | undefined): RecognizedCar | undefined {
  if (!c?.brand || !c?.model) return undefined;
  return {
    brand: String(c.brand).trim(),
    model: String(c.model).trim(),
    variant: c.variant ? String(c.variant).trim() : undefined,
    year: c.year ? String(c.year).trim() : undefined,
    rarity: c.rarity ? normalizeRarity(String(c.rarity)) : undefined,
    carClass: CLASSES.includes(c.carClass as CarClass) ? (c.carClass as CarClass) : undefined,
    body: BODIES.includes(c.body as BodyStyle) ? (c.body as BodyStyle) : undefined,
    confidence: Math.max(0, Math.min(1, Number(c.confidence) || 0.5)),
  };
}

export function parseRecognition(raw: unknown, provider: string): RecognitionResult {
  const r = (raw ?? {}) as { isCar?: boolean; best?: Partial<RecognizedCar>; alternatives?: Partial<RecognizedCar>[] };
  const best = clean(r.best);
  return {
    isCar: r.isCar !== false && !!best,
    best,
    alternatives: (r.alternatives ?? []).map(clean).filter((x): x is RecognizedCar => !!x).slice(0, 2),
    provider,
    isDemo: false,
  };
}

/** Foto für die KI verkleinern (spart Zeit & Kosten). */
export async function toJpegBlob(image: Blob, max = 1024): Promise<Blob> {
  const bmp = await createImageBitmap(image);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Bild konnte nicht umgewandelt werden'))), 'image/jpeg', 0.85));
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(b);
  });

// ─── 1. Claude in der claude.ai-Vorschau ────────────────────────────────

type SampleFn = { json: (input: string, opts?: { images?: Blob; modelTier?: string }) => Promise<unknown>; limits: () => Promise<{ images?: unknown }> };

async function claudeSample(): Promise<SampleFn | null> {
  const c = (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude;
  if (!c?.use) return null;
  try {
    const sample = (await c.use('sample')) as SampleFn | null;
    if (!sample) return null;
    const lim = await sample.limits().catch(() => null);
    return lim?.images ? sample : null;
  } catch {
    return null;
  }
}

/** „sample“ ohne Bild-Voraussetzung – für die reine Text-Klassifizierung. */
async function claudeTextSample(): Promise<SampleFn | null> {
  const c = (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude;
  if (!c?.use) return null;
  try {
    return ((await c.use('sample')) as SampleFn | null) ?? null;
  } catch {
    return null;
  }
}

class ClaudeArtifactProvider implements CarRecognitionProvider {
  name = 'Claude KI';
  isDemo = false;
  constructor(private sample: SampleFn) {}
  async recognize(image: Blob) {
    const raw = await this.sample.json(RECOGNITION_PROMPT, { images: await toJpegBlob(image), modelTier: 'default' });
    return parseRecognition(raw, this.name);
  }
}

// ─── 2. Eigener KI-Server ────────────────────────────────────────────────

const SERVER_URL = (import.meta.env.VITE_RECOGNITION_URL as string | undefined) ?? '/api/recognize';

async function serverAvailable(): Promise<boolean> {
  if (!location.protocol.startsWith('http')) return false;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1500);
    const res = await fetch(SERVER_URL.replace(/recognize$/, 'health'), { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return false;
    return (await res.json())?.ok === true;
  } catch {
    return false;
  }
}

class ServerProvider implements CarRecognitionProvider {
  name = 'KI-Server';
  isDemo = false;
  async recognize(image: Blob) {
    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: await blobToDataUrl(await toJpegBlob(image)) }),
    });
    if (!res.ok) throw new Error((await res.text()) || 'KI-Server nicht erreichbar');
    return parseRecognition(await res.json(), this.name);
  }
}

// ─── 3. Demo ─────────────────────────────────────────────────────────────

class DemoRecognitionProvider implements CarRecognitionProvider {
  name = 'Demo';
  isDemo = true;
  async recognize(image: Blob): Promise<RecognitionResult> {
    const buf = new Uint8Array(await image.slice(0, 4096).arrayBuffer());
    let h = image.size;
    for (let i = 0; i < buf.length; i += 7) h = (h * 31 + buf[i]) >>> 0;
    await new Promise((r) => setTimeout(r, 900));
    const curated = MODELS.filter((m) => m.source === 'curated');
    const pick = (k: number): RecognizedCar => {
      const m = curated[(h + k * 7919) % curated.length];
      return { brand: getBrand(m.brandId).name, model: m.name, confidence: [0.55, 0.2, 0.1][k] };
    };
    return { isCar: true, best: pick(0), alternatives: [pick(1), pick(2)], provider: this.name, isDemo: true };
  }
}

let chosen: Promise<CarRecognitionProvider> | null = null;

/** Wählt einmalig den besten verfügbaren Anbieter. */
export function getRecognitionProvider(): Promise<CarRecognitionProvider> {
  return (chosen ??= (async () => {
    const sample = await claudeSample();
    if (sample) return new ClaudeArtifactProvider(sample);
    if (await serverAvailable()) return new ServerProvider();
    return new DemoRecognitionProvider();
  })());
}

/**
 * Ordnet ein KI-Ergebnis dem Katalog zu. Gibt es das Modell noch nicht,
 * wird es über `create` neu angelegt – so kann wirklich jedes Auto gespottet werden.
 */
export function resolveRecognized(
  car: RecognizedCar,
  create: (i: CustomModelInput) => CarModel,
  setAiRarity?: (modelId: string, r: Rarity) => CarModel,
): { model: CarModel; variant?: string } {
  const brand = findBrand(car.brand);
  let found = brand ? findModel(brand.id, car.model) : undefined;
  // Baujahr wird bewusst NICHT übernommen – Nutzer müssen es nicht wissen
  const variantParts = [car.variant].filter(Boolean);
  if (found) {
    // Seltenheit bestimmt die KI – für nicht geprüfte Katalogmodelle übernehmen
    if (car.rarity && found.source !== 'curated' && norm(found.name) === norm(car.model) && setAiRarity) found = setAiRarity(found.id, car.rarity);
    // z. B. KI „Golf GTI“ → Katalog „Golf“: Rest als Variante übernehmen
    const extra = car.model.toLowerCase().startsWith(found.name.toLowerCase()) ? car.model.slice(found.name.length).trim() : '';
    return { model: found, variant: [extra, ...variantParts].filter(Boolean).join(' · ') || undefined };
  }
  const model = create({ brandName: brand?.name ?? car.brand, modelName: car.model, rarity: car.rarity, body: car.body, carClass: car.carClass, years: car.year });
  return { model, variant: variantParts.join(' · ') || undefined };
}

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');

// ─── KI-Seltenheit für manuell gewählte Autos ───────────────────────────

const RARITY_URL = SERVER_URL.replace(/recognize$/, 'rarity');

/**
 * Lässt die KI die Seltenheit eines Autos bestimmen (Text, ohne Foto).
 * Reihenfolge: Claude (Vorschau) → eigener KI-Server (/api/rarity) → null (= Schätzung bleibt vorläufig).
 */
export async function classifyRarity(brand: string, model: string): Promise<Rarity | null> {
  const prompt = RARITY_PROMPT.replace('{CAR}', `${brand} ${model}`);
  const pick = (raw: unknown): Rarity | null => {
    const obj = typeof raw === 'string' ? JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) : raw;
    const r = (obj as { rarity?: string } | null)?.rarity;
    return r ? normalizeRarity(String(r)) : null;
  };
  try {
    const sample = await claudeTextSample();
    if (sample) return pick(await sample.json(prompt, { modelTier: 'default' }));
  } catch {
    /* weiter zum Server */
  }
  try {
    if (await serverAvailable()) {
      const res = await fetch(RARITY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ car: `${brand} ${model}` }) });
      if (res.ok) return pick(await res.json());
    }
  } catch {
    /* keine KI erreichbar */
  }
  return null;
}

// ─── Privatsphäre: Kennzeichen & Gesichter finden ───────────────────────

/** Gleicher Prompt für Server und Vorschau. Koordinaten normiert (0..1) relativ zum Bild. */
export const PRIVACY_PROMPT = `Find every vehicle license plate and every human face in this photo, so they can be blurred for privacy (GDPR).
Reply with ONLY JSON: {"regions": [{"type": "plate", "box": [x, y, w, h]}]}
- type: "plate" or "face". box: left, top, width, height as fractions of the image (0..1).
- Make boxes slightly generous (about 10% larger than the object). Include partly visible or small plates and faces, also people inside cars.
- If there are none: {"regions": []}.`;

export interface PrivacyRegion {
  type: 'plate' | 'face' | 'manual';
  box: [number, number, number, number];
}

function parseRegions(raw: unknown): PrivacyRegion[] {
  const obj = typeof raw === 'string' ? JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) : raw;
  const list = (obj as { regions?: unknown[] } | null)?.regions ?? [];
  const clamp = (v: number) => Math.max(0, Math.min(1, Number(v) || 0));
  return list
    .map((r) => r as { type?: string; box?: number[] })
    .filter((r) => Array.isArray(r.box) && r.box.length === 4)
    .map((r) => {
      const [x, y, w, h] = r.box!.map(clamp);
      return { type: r.type === 'face' ? 'face' : 'plate', box: [x, y, Math.min(w, 1 - x), Math.min(h, 1 - y)] } as PrivacyRegion;
    })
    .filter((r) => r.box[2] > 0.005 && r.box[3] > 0.005);
}

/** Gesichter über die Browser-API (Shape Detection), falls vorhanden – z. B. Chrome auf Android. */
async function browserFaces(image: Blob): Promise<PrivacyRegion[] | null> {
  const FD = (window as unknown as { FaceDetector?: new () => { detect: (b: ImageBitmap) => Promise<{ boundingBox: DOMRectReadOnly }[]> } }).FaceDetector;
  if (!FD) return null;
  try {
    const bmp = await createImageBitmap(image);
    const faces = await new FD().detect(bmp);
    return faces.map((f) => ({ type: 'face', box: [f.boundingBox.x / bmp.width, f.boundingBox.y / bmp.height, f.boundingBox.width / bmp.width, f.boundingBox.height / bmp.height] }));
  } catch {
    return null;
  }
}

/**
 * Sucht Kennzeichen und Gesichter.
 * Reihenfolge: Claude (Vorschau) → KI-Server (/api/privacy) → Browser-Gesichtserkennung → null (= nicht verfügbar,
 * der Nutzer markiert selbst). TODO(backend): zusätzlich serverseitig vor dem Veröffentlichen prüfen.
 */
export async function detectPrivacyRegions(image: Blob): Promise<{ regions: PrivacyRegion[]; source: string } | null> {
  try {
    const sample = await claudeSample();
    if (sample) return { regions: parseRegions(await sample.json(PRIVACY_PROMPT, { images: await toJpegBlob(image), modelTier: 'default' })), source: 'Claude KI' };
  } catch {
    /* weiter */
  }
  try {
    if (await serverAvailable()) {
      const res = await fetch(SERVER_URL.replace(/recognize$/, 'privacy'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: await blobToDataUrl(await toJpegBlob(image)) }),
      });
      if (res.ok) return { regions: parseRegions(await res.json()), source: 'KI-Server' };
    }
  } catch {
    /* weiter */
  }
  const faces = await browserFaces(image);
  if (faces) return { regions: faces, source: 'Gerät (nur Gesichter)' };
  return null;
}
