/**
 * SpotDrive Pro – Bezahlung im Client
 * ───────────────────────────────────
 * Ein Pro-Status für Web und App; der Server (server/billing.mjs) ist die Quelle der Wahrheit.
 *   • Web:         Stripe Checkout (Weiterleitung) + Kundenportal
 *   • iOS/Android: In-App-Abo über RevenueCat (Apple/Google schreiben ihr eigenes Bezahlsystem vor).
 *                  Das Capacitor-Plugin wird einmal per `registerNativePurchases()` angemeldet,
 *                  siehe src/services/purchases.native.example.ts.
 *   • Demo:        solange nichts eingerichtet ist, bleibt die Demo-Freischaltung (ohne Zahlung) – im Release
 *                  mit VITE_DISABLE_DEMO_PRO=1 abschalten.
 * Es liegen KEINE Geheimnisse im Client (Stripe/RevenueCat-Schlüssel nur auf dem Server bzw. öffentliche SDK-Keys).
 */
import { useEffect, useState } from 'react';

export type BillingPlan = 'monthly' | 'yearly';
export type BillingMode = 'stripe' | 'native' | 'demo' | 'unavailable';

export interface Entitlement {
  active: boolean;
  until: number | null;
  source: 'stripe' | 'revenuecat' | null;
  willRenew?: boolean;
}

/** Schnittstelle zum nativen Kauf-Plugin (RevenueCat). */
export interface NativePurchases {
  /** Nutzer bei RevenueCat anmelden (app_user_id = unsere Billing-ID). */
  logIn(appUserId: string): Promise<void>;
  /** Preise aus den Stores, z. B. { monthly: '4,99 €', yearly: '39,99 €' } */
  prices(): Promise<Partial<Record<BillingPlan, string>>>;
  purchase(plan: BillingPlan): Promise<{ active: boolean; cancelled?: boolean }>;
  restore(): Promise<{ active: boolean }>;
}

let native: NativePurchases | null = null;
export const registerNativePurchases = (impl: NativePurchases) => {
  native = impl;
};

const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
const DEMO_OFF = import.meta.env.VITE_DISABLE_DEMO_PRO === '1';

export const isNativeApp = () => !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

/** Stabile, anonyme Billing-ID dieser Installation (später: Konto-ID nach Anmeldung). */
export function billingUserId(): string {
  const K = 'spotdrive:billingId';
  try {
    let id = localStorage.getItem(K);
    if (!id) {
      id = `sd_${crypto.randomUUID().replace(/-/g, '')}`;
      localStorage.setItem(K, id);
    }
    return id;
  } catch {
    return 'sd_session';
  }
}

async function api<T>(path: string, init?: RequestInit, timeoutMs = 6000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`${API}${path}`, { ...init, signal: ctl.signal, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((json as { error?: string }).error || `Fehler ${r.status}`);
    return json as T;
  } finally {
    clearTimeout(t);
  }
}

let modePromise: Promise<BillingMode> | null = null;
export function detectBillingMode(force = false): Promise<BillingMode> {
  if (force) modePromise = null;
  return (modePromise ??= (async () => {
    if (isNativeApp()) return native ? 'native' : DEMO_OFF ? 'unavailable' : 'demo';
    try {
      const c = await api<{ stripe: boolean }>('/api/billing/config', undefined, 3000);
      if (c.stripe) return 'stripe';
    } catch {
      /* kein Server erreichbar */
    }
    return DEMO_OFF ? 'unavailable' : 'demo';
  })());
}

export async function fetchEntitlement(): Promise<Entitlement | null> {
  try {
    return await api<Entitlement>(`/api/billing/status?userId=${encodeURIComponent(billingUserId())}`);
  } catch {
    return null;
  }
}

/** Startet den Kauf. Web: leitet zu Stripe weiter (Funktion kehrt dann nicht zurück). */
export async function startPurchase(plan: BillingPlan): Promise<{ active: boolean; cancelled?: boolean } | 'redirect'> {
  const mode = await detectBillingMode();
  if (mode === 'native' && native) {
    await native.logIn(billingUserId());
    return native.purchase(plan);
  }
  if (mode === 'stripe') {
    const returnUrl = `${location.origin}${location.pathname}#/pro`;
    const { url } = await api<{ url: string }>('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ userId: billingUserId(), plan, returnUrl }) }, 15000);
    location.href = url;
    return 'redirect';
  }
  throw new Error('Bezahlung ist noch nicht eingerichtet');
}

export async function restorePurchases(): Promise<boolean> {
  if (native) {
    await native.logIn(billingUserId());
    return (await native.restore()).active;
  }
  return !!(await fetchEntitlement())?.active;
}

export async function openPortal(): Promise<void> {
  const returnUrl = `${location.origin}${location.pathname}#/pro`;
  const { url } = await api<{ url: string }>('/api/billing/portal', { method: 'POST', body: JSON.stringify({ userId: billingUserId(), returnUrl }) }, 15000);
  location.href = url;
}

export async function nativePrices() {
  return native ? native.prices().catch(() => ({})) : {};
}

export function useBillingMode(): BillingMode | null {
  const [m, setM] = useState<BillingMode | null>(null);
  useEffect(() => {
    let alive = true;
    void detectBillingMode().then((x) => alive && setM(x));
    return () => {
      alive = false;
    };
  }, []);
  return m;
}
