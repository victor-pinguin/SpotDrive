/**
 * SpotDrive Pro – Bezahlung & Pro-Status (Server)
 * ───────────────────────────────────────────────
 * Ein Pro-Status für Web UND App:
 *   • Web:      Stripe Checkout (Abo, 7 Tage Test) + Stripe-Kundenportal (kündigen/Karte ändern)
 *   • iOS/Android: Apple/Google In-App-Abo über RevenueCat (Store-Pflicht für digitale Abos)
 * Beide melden Käufe per Webhook an diesen Server. Die App fragt nur noch GET /api/billing/status.
 *
 * Umgebungsvariablen (nur auf dem Server, nie in die App!):
 *   STRIPE_SECRET_KEY        sk_live_… / sk_test_…
 *   STRIPE_PRICE_MONTHLY     price_… (4,99 €/Monat)
 *   STRIPE_PRICE_YEARLY      price_… (39,99 €/Jahr)
 *   STRIPE_WEBHOOK_SECRET    whsec_… (Endpoint: POST /api/billing/webhook/stripe)
 *   REVENUECAT_WEBHOOK_AUTH  beliebiges langes Geheimnis, in RevenueCat als „Authorization header" eintragen
 *                            (Endpoint: POST /api/billing/webhook/revenuecat)
 *   APP_URL                  z. B. https://spotdrive.app – nur dorthin leitet Stripe zurück
 *   TRIAL_DAYS               Standard 7
 *
 * Speicher: server/data/entitlements.json (einfache Datei). TODO(prod): Datenbank + echte Nutzer-Anmeldung;
 * heute identifiziert die App den Nutzer über seine lokale ID.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const PRICES = { monthly: process.env.STRIPE_PRICE_MONTHLY, yearly: process.env.STRIPE_PRICE_YEARLY };
const WH_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const RC_AUTH = process.env.REVENUECAT_WEBHOOK_AUTH;
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 7);

const FILE = new URL('./data/entitlements.json', import.meta.url);
let db = { users: {}, customers: {} };
try {
  if (existsSync(FILE)) db = JSON.parse(readFileSync(FILE, 'utf8'));
} catch {
  /* leer starten */
}
const save = () => {
  mkdirSync(new URL('./data/', import.meta.url), { recursive: true });
  writeFileSync(FILE, JSON.stringify(db, null, 2));
};
const user = (id) => (db.users[id] ??= {});

export function entitlement(userId) {
  const u = db.users[userId] || {};
  const now = Date.now();
  const stripeOn = !!u.stripe?.active && (!u.stripe.until || u.stripe.until > now - 3 * 86400000); // 3 Tage Kulanz
  const rcOn = !!u.rc?.until && u.rc.until > now;
  return { active: stripeOn || rcOn, until: Math.max(u.stripe?.until || 0, u.rc?.until || 0) || null, source: stripeOn ? 'stripe' : rcOn ? 'revenuecat' : null, willRenew: u.rc ? u.rc.willRenew !== false : u.stripe?.willRenew !== false };
}

const validId = (s) => typeof s === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(s);
const okReturn = (u) => typeof u === 'string' && u.startsWith(APP_URL);

function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v && typeof v === 'object') form(v, key, out);
    else if (v !== undefined && v !== null) out.append(key, String(v));
  }
  return out;
}

async function stripe(path, body) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form(body),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`Stripe: ${json.error?.message || r.status}`);
  return json;
}

function verifyStripe(raw, header) {
  if (!WH_SECRET || !header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', WH_SECRET).update(`${t}.${raw}`).digest('hex');
  const given = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  return given.some((g) => g.length === expected.length && timingSafeEqual(Buffer.from(g), Buffer.from(expected)));
}

function onStripeEvent(ev) {
  const o = ev.data?.object || {};
  if (ev.type === 'checkout.session.completed') {
    const id = o.client_reference_id;
    if (!validId(id)) return;
    if (o.customer) db.customers[o.customer] = id;
    Object.assign((user(id).stripe ??= {}), { active: true, customer: o.customer, subscription: o.subscription });
  } else if (ev.type.startsWith('customer.subscription.')) {
    const id = o.metadata?.userId || db.customers[o.customer];
    if (!validId(id)) return;
    if (o.customer) db.customers[o.customer] = id;
    const end = (o.current_period_end ?? o.items?.data?.[0]?.current_period_end ?? 0) * 1000;
    const on = ev.type !== 'customer.subscription.deleted' && ['active', 'trialing', 'past_due'].includes(o.status);
    Object.assign((user(id).stripe ??= {}), { active: on, until: end || null, customer: o.customer, subscription: o.id, willRenew: !o.cancel_at_period_end });
  } else return;
  save();
}

function onRevenueCat(ev) {
  const id = ev.app_user_id;
  if (!validId(id)) return;
  const u = (user(id).rc ??= {});
  if (['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED'].includes(ev.type)) {
    u.until = ev.expiration_at_ms || null;
    u.willRenew = true;
  } else if (ev.type === 'CANCELLATION') u.willRenew = false;
  else if (ev.type === 'EXPIRATION') u.until = 0;
  else return;
  save();
}

/** Gibt true zurück, wenn die Anfrage hier behandelt wurde. */
export function handleBilling(req, res, send, readBody) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  if (!p.startsWith('/api/billing/')) return false;
  (async () => {
    try {
      if (p === '/api/billing/config' && req.method === 'GET')
        return send(res, 200, { stripe: !!(STRIPE_KEY && PRICES.monthly && PRICES.yearly), revenuecat: !!RC_AUTH, trialDays: TRIAL_DAYS });

      if (p === '/api/billing/status' && req.method === 'GET') {
        const id = url.searchParams.get('userId');
        if (!validId(id)) return send(res, 400, { error: 'userId ungültig' });
        return send(res, 200, entitlement(id));
      }

      if (p === '/api/billing/checkout' && req.method === 'POST') {
        if (!STRIPE_KEY) return send(res, 503, { error: 'Stripe nicht eingerichtet' });
        const b = JSON.parse(await readBody(req));
        const price = PRICES[b.plan];
        if (!validId(b.userId) || !price) return send(res, 400, { error: 'userId oder plan ungültig' });
        const back = okReturn(b.returnUrl) ? b.returnUrl : `${APP_URL}/#/pro`;
        const sep = back.includes('?') ? '&' : '?';
        const s = await stripe('checkout/sessions', {
          mode: 'subscription',
          line_items: { 0: { price, quantity: 1 } },
          client_reference_id: b.userId,
          allow_promotion_codes: 'true',
          subscription_data: { trial_period_days: TRIAL_DAYS, metadata: { userId: b.userId } },
          metadata: { userId: b.userId },
          success_url: `${back}${sep}checkout=success`,
          cancel_url: `${back}${sep}checkout=cancel`,
        });
        return send(res, 200, { url: s.url });
      }

      if (p === '/api/billing/portal' && req.method === 'POST') {
        if (!STRIPE_KEY) return send(res, 503, { error: 'Stripe nicht eingerichtet' });
        const b = JSON.parse(await readBody(req));
        const customer = db.users[b.userId]?.stripe?.customer;
        if (!validId(b.userId) || !customer) return send(res, 404, { error: 'Kein Web-Abo gefunden (App-Abos verwaltest du im App Store / Google Play)' });
        const s = await stripe('billing_portal/sessions', { customer, return_url: okReturn(b.returnUrl) ? b.returnUrl : `${APP_URL}/#/pro` });
        return send(res, 200, { url: s.url });
      }

      if (p === '/api/billing/webhook/stripe' && req.method === 'POST') {
        const raw = await readBody(req);
        if (!verifyStripe(raw, req.headers['stripe-signature'])) return send(res, 400, { error: 'Signatur ungültig' });
        onStripeEvent(JSON.parse(raw));
        return send(res, 200, { received: true });
      }

      if (p === '/api/billing/webhook/revenuecat' && req.method === 'POST') {
        if (!RC_AUTH || req.headers.authorization !== RC_AUTH) return send(res, 401, { error: 'nicht erlaubt' });
        onRevenueCat(JSON.parse(await readBody(req)).event || {});
        return send(res, 200, { received: true });
      }
      send(res, 404, { error: 'not found' });
    } catch (e) {
      send(res, 500, { error: String(e.message || e) });
    }
  })();
  return true;
}
