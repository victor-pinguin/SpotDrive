import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppStore';
import { TopBar } from '../components/Layout';
import { Icon } from '../components/Icon';
import { ProBadge } from '../components/ui';
import { PRO_FEATURES } from '../data/proFeatures';
import { fetchEntitlement, nativePrices, openPortal, restorePurchases, startPurchase, useBillingMode, type BillingPlan } from '../services/billing';

/**
 * Paywall für SpotDrive Pro – Web (Stripe) und App (Apple/Google über RevenueCat) mit demselben Pro-Status.
 * Ohne eingerichtete Bezahlung bleibt die Demo-Freischaltung (klar als Demo gekennzeichnet).
 */
const PLANS: { id: BillingPlan; label: string; price: string; per: string; note: string }[] = [
  { id: 'yearly', label: 'Jährlich', price: '39,99 €', per: '/Jahr', note: '≈ 3,33 € / Monat · 2 Monate gratis' },
  { id: 'monthly', label: 'Monatlich', price: '4,99 €', per: '/Monat', note: 'Jederzeit kündbar' },
];

export function ProScreen() {
  const { me, setPro, showToast } = useApp();
  const mode = useBillingMode();
  const [params, setParams] = useSearchParams();
  const [plan, setPlan] = useState<BillingPlan>('yearly');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [prices, setPrices] = useState<Partial<Record<BillingPlan, string>>>({});
  const real = mode === 'stripe' || mode === 'native';

  useEffect(() => {
    if (mode === 'native') void nativePrices().then(setPrices);
  }, [mode]);

  // Rückkehr von Stripe: auf die Bestätigung (Webhook) warten
  useEffect(() => {
    const c = params.get('checkout');
    if (!c) return;
    setParams({}, { replace: true });
    if (c === 'cancel') return showToast('Kauf abgebrochen – es wurde nichts abgebucht');
    let alive = true;
    setChecking(true);
    (async () => {
      for (let i = 0; i < 15 && alive; i++) {
        const e = await fetchEntitlement();
        if (e?.active) {
          setPro(true);
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (alive) setChecking(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buy = async () => {
    setBusy(true);
    try {
      const r = await startPurchase(plan);
      if (r !== 'redirect') {
        if (r.active) setPro(true);
        else if (!r.cancelled) showToast('Kauf nicht abgeschlossen');
      }
    } catch (e) {
      showToast((e as Error).message || 'Kauf fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    setBusy(true);
    try {
      const ok = await restorePurchases();
      if (ok) setPro(true);
      else showToast('Kein aktives Abo gefunden');
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen pro">
      <TopBar back />
      <div className="pro-hero">
        <div className="pro-hero__glow" />
        <div className="pro-hero__icon">
          <Icon name="crown" size={34} fill strokeWidth={0} />
        </div>
        <h1>
          SpotDrive <span className="grad">Pro</span>
        </h1>
        <p className="muted">Mehr Tools für ernsthafte Spotter – Videos, KI ohne Limit, Alerts und exklusive Garage-Designs.</p>
        {me.isPro && (
          <div className="chip chip--new mt-s">
            <Icon name="check" size={14} /> Pro aktiv{mode === 'demo' ? ' (Demo)' : ''}
          </div>
        )}
        {checking && <div className="muted small mt-s">Zahlung wird bestätigt …</div>}
      </div>

      <div className="pro-list">
        {PRO_FEATURES.map((f) => (
          <div key={f.key} className="pro-feature">
            <span className="pro-feature__icon">{f.icon}</span>
            <div>
              <b>{f.title}</b>
              <div className="muted small">{f.text}</div>
            </div>
            <ProBadge small />
          </div>
        ))}
      </div>

      {!me.isPro ? (
        <>
          <div className="plans">
            {PLANS.map((p) => (
              <button key={p.id} className={`plan ${plan === p.id ? 'is-active' : ''}`} onClick={() => setPlan(p.id)}>
                {p.id === 'yearly' && <span className="plan__tag">Beliebt</span>}
                <span className="plan__label">{p.label}</span>
                <span className="plan__price">
                  {prices[p.id] ?? p.price}
                  <small>{p.per}</small>
                </span>
                <span className="muted small">{p.note}</span>
              </button>
            ))}
          </div>

          {mode === null && <p className="muted small center">Lädt …</p>}

          {real && (
            <>
              <button className="btn btn--primary btn--block btn--lg" disabled={busy || checking} onClick={buy}>
                {busy ? 'Einen Moment …' : 'Pro 7 Tage kostenlos testen'}
              </button>
              <p className="muted small center">
                Danach {plan === 'yearly' ? '39,99 € pro Jahr' : '4,99 € pro Monat'}. Verlängert sich automatisch, jederzeit kündbar
                {mode === 'native' ? ' in den Einstellungen deines App Store / Google Play-Kontos.' : ' im Kundenportal.'}
              </p>
              <button className="btn btn--ghost btn--block" disabled={busy} onClick={restore}>
                Kauf wiederherstellen
              </button>
            </>
          )}

          {mode === 'demo' && (
            <>
              <button
                className="btn btn--primary btn--block btn--lg"
                onClick={() => {
                  setPro(true, { demo: true });
                }}
              >
                Pro testen (Demo – keine Zahlung)
              </button>
              <p className="muted small center">Bezahlung ist auf diesem Gerät noch nicht eingerichtet. Preise: 4,99 €/Monat · 39,99 €/Jahr.</p>
            </>
          )}

          {mode === 'unavailable' && <p className="muted small center">Bezahlung ist gerade nicht verfügbar. Bitte später erneut versuchen.</p>}
        </>
      ) : mode === 'stripe' ? (
        <button
          className="btn btn--outline btn--block"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            openPortal().catch((e) => {
              setBusy(false);
              showToast((e as Error).message);
            });
          }}
        >
          Abo verwalten / kündigen
        </button>
      ) : mode === 'native' ? (
        <p className="muted small center">Dein Abo verwaltest du in den Einstellungen deines App Store- bzw. Google-Play-Kontos.</p>
      ) : (
        <button className="btn btn--outline btn--block" onClick={() => setPro(false)}>
          Demo-Pro beenden
        </button>
      )}
    </div>
  );
}
