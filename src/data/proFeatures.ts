import type { ProFeatureKey } from '../types/models';

/**
 * SpotDrive Pro – Feature-Liste für die Paywall-UI.
 * TODO(payments): Echte Abos über RevenueCat (iOS/Android In-App-Purchase)
 * oder Stripe (Web) anbinden. `user.isPro` kommt dann aus dem Entitlement-Status.
 */
export const PRO_FEATURES: { key: ProFeatureKey; title: string; text: string; icon: string }[] = [
  { key: 'video_record', title: 'Video-Spots', text: 'Videos aufnehmen oder hochladen – Sound & Fly-bys statt nur Fotos', icon: '🎥' },
  { key: 'video_feed', title: 'Videos abspielen', text: 'Video-Spots der Community ansehen + eigener Video-Feed', icon: '📺' },
  { key: 'long_videos', title: 'Längere Videos', text: 'Bis zu 60 Sekunden pro Video', icon: '⏱️' },
  { key: 'unlimited_recognition', title: 'Unbegrenzte Auto-Erkennung', text: 'KI erkennt Marke & Modell ohne Tageslimit', icon: '🤖' },
  { key: 'advanced_stats', title: 'Erweiterte Statistiken', text: 'Heatmaps, Seltenheits-Verteilung, Streaks', icon: '📊' },
  { key: 'advanced_map_filters', title: 'Erweiterte Kartenfilter', text: 'Nach Modell, Zeitraum und Seltenheit filtern', icon: '🗺️' },
  { key: 'spot_alerts', title: 'Dream Car Alerts', text: 'Wunschliste + Benachrichtigung, wenn dein Dream Car in deinem Gebiet (Stadt, Region, Radius) gespottet wird – mit Dream-Car-Map', icon: '🔔' },
  { key: 'cloud_backup', title: 'Cloud-Backup', text: 'Originalfotos & Videos in voller Qualität sichern', icon: '☁️' },
  { key: 'challenges', title: 'Spotting Challenges', text: 'Alle Dailys, Weekly, eigene & Community-Challenges, legendäre Challenges, Streaks, exklusive Belohnungen (1 Daily pro Tag ist für alle gratis)', icon: '🏁' },
  { key: 'custom_cards', title: 'Custom Spot Cards', text: '12 Card-Designs, Hintergründe, Rahmen, Effekte & Schriften – eigene Standards je Seltenheit', icon: '🎨' },
  { key: 'spot_calendar', title: 'Personal Spotting Calendar', text: 'Alle eigenen Spots im Monatskalender – mit Monatsübersicht, Serien und Tagesdetails', icon: '📅' },
  { key: 'pro_badge', title: 'Pro-Badge', text: 'Sichtbar im Profil und bei jedem Post', icon: '💠' },
  { key: 'garage_designs', title: 'Zusätzliche Garage-Designs', text: 'Marmor, Glasfront, RGB-Licht und mehr', icon: '🏛️' },
];

export const FREE_RECOGNITIONS_PER_DAY = 5;
export const FREE_VIDEO_SECONDS = 15;
export const PRO_VIDEO_SECONDS = 60;
