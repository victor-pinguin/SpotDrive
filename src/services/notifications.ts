import type { DreamAlert } from '../types/models';
import { fullName, getModel } from '../data/cars';

/**
 * BENACHRICHTIGUNGEN – austauschbare Transporte
 * ─────────────────────────────────────────────
 * Demo: In-App-Banner (im Store) + optional Browser-Notification (Web Notification API).
 * Später:
 *   - Push: Capacitor PushNotifications (FCM / APNs). Der Server sendet, sobald
 *     der Abgleich (lib/dreamAlerts.ts) einen Treffer liefert – die App muss dafür nicht offen sein.
 *   - Token-Registrierung: Tabelle `push_tokens` (user_id, token, platform).
 */
export interface PushTransport {
  isSupported(): boolean;
  permission(): NotificationPermission | 'unsupported';
  requestPermission(): Promise<boolean>;
  send(alert: DreamAlert, url: string): void;
}

export const alertTitle = () => '🔔 DREAM CAR SPOTTED!';
export const alertBody = (a: DreamAlert) => `${fullName(getModel(a.modelId))} wurde in deinem Gebiet gespottet · 📍 ${a.areaLabel}`;

class WebPushTransport implements PushTransport {
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }
  permission() {
    return this.isSupported() ? Notification.permission : 'unsupported';
  }
  async requestPermission() {
    if (!this.isSupported()) return false;
    try {
      return (await Notification.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  send(alert: DreamAlert, url: string) {
    if (this.permission() !== 'granted') return;
    try {
      const n = new Notification(alertTitle(), { body: alertBody(alert), tag: alert.id });
      n.onclick = () => {
        window.focus();
        location.hash = url;
      };
    } catch {
      /* z. B. in iframes / manchen Mobile-Browsern nicht erlaubt → In-App-Banner reicht */
    }
  }
}

export const push: PushTransport = new WebPushTransport();
