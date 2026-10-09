/**
 * SpotDrive KI-Server – erkennt jedes Auto auf einem Foto mit Claude (Vision).
 *
 * Start:   ANTHROPIC_API_KEY=sk-ant-...  npm run server
 * (Windows PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-..."; npm run server)
 *
 * Endpunkte:
 *   GET  /api/health     → { ok: true }
 *   POST /api/recognize  → Body { image: "data:image/jpeg;base64,..." }
 *                          Antwort { isCar, best: { brand, model, variant, year, rarity, carClass, body, confidence }, alternatives }
 *   POST /api/privacy    → Body { image } · Antwort { regions: [{ type: "plate"|"face", box: [x,y,w,h] }] } (zum Verpixeln)
 *   /api/billing/*       → Pro-Abo (Stripe + RevenueCat), siehe server/billing.mjs
 *   POST /api/rarity     → Body { car: "Bugatti Chiron Super Sport" }
 *                          Antwort { rarity, carClass, body }  – die KI bestimmt die Seltenheit
 *
 * Der API-Key bleibt auf dem Server – niemals in die App einbauen.
 * Keine Abhängigkeiten nötig (Node 18+ hat fetch eingebaut).
 */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { handleBilling } from './billing.mjs';

const PORT = Number(process.env.PORT || 8787);
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

// Prompt aus der App übernehmen, damit Server und App dasselbe Format nutzen
const src = readFileSync(new URL('../src/services/carRecognition.ts', import.meta.url), 'utf8');
const PROMPT = src.match(/RECOGNITION_PROMPT = `([\s\S]*?)`;/)[1];
const RARITY_PROMPT = src.match(/RARITY_PROMPT = `([\s\S]*?)`;/)[1];
const PRIVACY_PROMPT = src.match(/PRIVACY_PROMPT = `([\s\S]*?)`;/)[1];

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

async function askClaude(content, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
  });
  if (!r.ok) throw new Error(`Claude API ${r.status}: ${await r.text()}`);
  const json = await r.json();
  const text = json.content?.map((c) => c.text || '').join('') || '';
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

async function rarity(car) {
  if (!car || typeof car !== 'string' || car.length > 120) throw new Error('Feld "car" fehlt');
  return askClaude([{ type: 'text', text: RARITY_PROMPT.replace('{CAR}', car) }], 150);
}

async function privacy(dataUrl) {
  const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Kein Bild (data:image/...;base64) übergeben');
  return askClaude([{ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }, { type: 'text', text: PRIVACY_PROMPT }], 500);
}

async function recognize(dataUrl) {
  const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Kein Bild (data:image/...;base64) übergeben');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Claude API ${r.status}: ${await r.text()}`);
  const json = await r.json();
  const text = json.content?.map((c) => c.text || '').join('') || '';
  const start = text.indexOf('{');
  return JSON.parse(text.slice(start, text.lastIndexOf('}') + 1));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => resolve(b));
    req.on('error', reject);
  });
}

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (handleBilling(req, res, send, readBody)) return;
    if (req.url === '/api/health') return send(res, KEY ? 200 : 503, { ok: !!KEY });
    if (['/api/recognize', '/api/rarity', '/api/privacy'].includes(req.url) && req.method === 'POST') {
      if (!KEY) return send(res, 503, { error: 'ANTHROPIC_API_KEY fehlt' });
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          send(res, 200, req.url === '/api/rarity' ? await rarity(data.car) : req.url === '/api/privacy' ? await privacy(data.image) : await recognize(data.image));
        } catch (e) {
          send(res, 500, { error: String(e.message || e) });
        }
      });
      return;
    }
    send(res, 404, { error: 'not found' });
  })
  .listen(PORT, () => console.log(`SpotDrive KI-Server läuft auf http://localhost:${PORT} (Modell ${MODEL})${KEY ? '' : ' – ACHTUNG: ANTHROPIC_API_KEY fehlt'}`));
