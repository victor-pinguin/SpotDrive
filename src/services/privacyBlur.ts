import type { PrivacyRegion } from './carRecognition';

/**
 * VERPIXELN – für alle Nutzer, automatisch vor dem Speichern.
 * Das Original wird NICHT gespeichert/hochgeladen – nur das verpixelte Bild.
 * TODO(backend): serverseitig erneut prüfen (z. B. vor dem Veröffentlichen) und Videos
 * per FFmpeg-Pipeline verpixeln.
 */
const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Bild konnte nicht geladen werden'));
    img.src = src;
  });

export async function applyPrivacyBlur(dataUrl: string, regions: PrivacyRegion[], quality = 0.85): Promise<string> {
  if (!regions.length) return dataUrl;
  const img = await loadImg(dataUrl);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const tmp = document.createElement('canvas');
  const tctx = tmp.getContext('2d')!;
  for (const r of regions) {
    // etwas Rand, damit nichts durchschimmert
    const pad = 0.12;
    const x = Math.max(0, Math.floor((r.box[0] - r.box[2] * pad) * W));
    const y = Math.max(0, Math.floor((r.box[1] - r.box[3] * pad) * H));
    const w = Math.min(W - x, Math.ceil(r.box[2] * (1 + 2 * pad) * W));
    const h = Math.min(H - y, Math.ceil(r.box[3] * (1 + 2 * pad) * H));
    if (w < 2 || h < 2) continue;
    // Mosaik: stark verkleinern und ohne Glättung wieder vergrößern → nicht rekonstruierbar
    const block = Math.max(6, Math.round(Math.max(w, h) / 9));
    tmp.width = Math.max(1, Math.round(w / block));
    tmp.height = Math.max(1, Math.round(h / block));
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(canvas, x, y, w, h, 0, 0, tmp.width, tmp.height);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect?.(x, y, w, h, Math.min(w, h) * 0.18);
    if (!ctx.roundRect) ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
    ctx.restore();
  }
  return canvas.toDataURL('image/jpeg', quality);
}

export const dataUrlToBlob = async (u: string) => (await fetch(u)).blob();
