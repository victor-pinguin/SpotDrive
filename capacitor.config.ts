/**
 * Capacitor-Konfiguration für die spätere Veröffentlichung als Android- und iOS-App.
 *
 * Aktivieren:
 *   npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
 *   npm i @capacitor/camera @capacitor/geolocation   (native Kamera/GPS)
 *   npm run build && npx cap add android && npx cap add ios && npx cap sync
 *
 * Die Datei ist bewusst ohne Import von '@capacitor/cli' geschrieben,
 * damit das Projekt auch ohne installiertes Capacitor baut.
 */
const config = {
  appId: 'app.spotdrive.mobile',
  appName: 'SpotDrive',
  webDir: 'dist',
  backgroundColor: '#0a0b0d',
};

export default config;
