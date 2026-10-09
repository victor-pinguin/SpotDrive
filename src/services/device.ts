import type { GeoPoint } from '../types/models';

/**
 * Geräte-Funktionen (GPS, Medien).
 * Web-Implementierung mit Browser-APIs. In der nativen App (Capacitor) können
 * diese Funktionen gegen @capacitor/geolocation bzw. @capacitor/camera getauscht
 * werden – die Signaturen bleiben gleich, der Rest der App merkt nichts davon.
 */

export function getCurrentPosition(): Promise<GeoPoint> {
  // TODO(native): import { Geolocation } from '@capacitor/geolocation';
  //               const pos = await Geolocation.getCurrentPosition();
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('GPS wird von diesem Gerät nicht unterstützt.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Standortzugriff wurde verweigert. Wähle den Ort manuell auf der Karte.'
              : 'Standort konnte nicht ermittelt werden. Wähle ihn manuell.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/**
 * Verkleinert ein Foto auf max. `maxSize` px und gibt eine JPEG-DataURL zurück.
 * Spart Speicher (localStorage) und später Upload-Volumen.
 * TODO(backend): Original stattdessen in Cloud-Storage hochladen und nur die URL speichern.
 */
export function downscaleImage(file: File, maxSize = 1100, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Bild konnte nicht gelesen werden.'));
    };
    img.src = url;
  });
}

/** Videodauer in Sekunden auslesen (für das Free/Pro-Limit). */
export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration || 0);
    };
    v.onerror = () => resolve(0);
    v.src = url;
  });
}
