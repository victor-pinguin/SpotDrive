import type { CarCardData } from '../lib/cards';
import { getBrand } from '../data/cars';
import { catalogPhoto } from '../data/carPhotos';
import { RARITY_META } from '../lib/rarity';

/**
 * TEILEN – für alle Nutzer kostenlos (= Werbung für SpotDrive).
 * Erzeugt ein Story-Bild (1080×1920, Instagram/TikTok/WhatsApp-Status) der Car Card
 * und teilt es über das System-Teilen-Menü (Handy) bzw. lädt es herunter (Desktop).
 * Nur der grobe Ort wird gezeigt. Das eigene Foto ist bereits verpixelt.
 */
const W = 1080;
const H = 1920;

const loadImg = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
    setTimeout(() => res(null), 8000);
  });

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number, size: number, weight = 800, family = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif') {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    s -= 2;
  } while (ctx.measureText(text).width > max && s > 24);
}

export async function renderStory(card: CarCardData, opts: { username: string; place?: string; isNew?: boolean }): Promise<Blob> {
  const { model } = card;
  const brand = getBrand(model.brandId);
  const r = RARITY_META[model.rarity];
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Hintergrund
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0b0d');
  bg.addColorStop(0.45, r.color + '55');
  bg.addColorStop(1, '#050506');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 760, 50, W / 2, 760, 900);
  glow.addColorStop(0, r.color + '55');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Kopf
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a1f';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.fillText('SPOTDRIVE', W / 2, 140);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText(opts.isNew ? 'NEW CAR CARD UNLOCKED!' : 'CAR CARD', W / 2, 200);

  // Karte
  const cx = 110;
  const cy = 270;
  const cw = W - 220;
  const ch = 1330;
  ctx.save();
  ctx.shadowColor = r.color;
  ctx.shadowBlur = 60;
  rr(ctx, cx, cy, cw, ch, 48);
  const cardBg = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
  cardBg.addColorStop(0, '#1a1c21');
  cardBg.addColorStop(0.55, '#0d0e11');
  cardBg.addColorStop(1, '#16181d');
  ctx.fillStyle = cardBg;
  ctx.fill();
  ctx.restore();
  rr(ctx, cx, cy, cw, ch, 48);
  ctx.lineWidth = 10;
  ctx.strokeStyle = r.color;
  ctx.stroke();

  // Marke + Seltenheit
  ctx.textAlign = 'left';
  ctx.fillStyle = brand.color === '#000000' ? '#fff' : '#e8e8ea';
  ctx.font = '800 38px system-ui, sans-serif';
  ctx.fillText(brand.name.toUpperCase().split('').join(' '), cx + 50, cy + 82);
  ctx.textAlign = 'right';
  ctx.font = '56px system-ui, sans-serif';
  ctx.fillText(r.emoji, cx + cw - 46, cy + 92);

  // Foto (eigenes, sonst Katalogfoto mit Credit)
  const px = cx + 40;
  const py = cy + 130;
  const pw = cw - 80;
  const ph = Math.round(pw * 0.72);
  const own = card.photoSpot?.media;
  const ownUrl = own && !own.placeholder ? (own.type === 'photo' ? own.url : own.posterUrl) : undefined;
  const cat = catalogPhoto(model.id);
  const img = (ownUrl && (await loadImg(ownUrl))) || (cat && (await loadImg(cat.url)));
  ctx.save();
  rr(ctx, px, py, pw, ph, 30);
  ctx.clip();
  ctx.fillStyle = '#0b0c0e';
  ctx.fillRect(px, py, pw, ph);
  if (img) {
    const s = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    ctx.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = r.color + '33';
    ctx.fillRect(px, py, pw, ph);
    ctx.textAlign = 'center';
    ctx.font = '160px system-ui';
    ctx.fillText('🏎️', W / 2, py + ph / 2 + 55);
  }
  ctx.restore();
  const usedCatalog = !!img && !(ownUrl && img.src === ownUrl) && cat;

  // Modell
  let y = py + ph + 110;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  fitText(ctx, model.name, pw, 92);
  ctx.fillText(model.name, px, y);
  if (card.variant) {
    y += 56;
    ctx.fillStyle = '#b4bac2';
    ctx.font = '500 40px system-ui, sans-serif';
    ctx.fillText(card.variant, px, y);
  }

  // Seltenheit-Pill
  y += 50;
  const label = `${r.emoji}  ${r.label.toUpperCase()}`;
  ctx.font = '800 38px system-ui, sans-serif';
  const lw = ctx.measureText(label).width + 56;
  rr(ctx, px, y, lw, 74, 20);
  ctx.fillStyle = r.color + '33';
  ctx.fill();
  ctx.fillStyle = r.color;
  ctx.fillText(label, px + 28, y + 50);

  // Infos
  y += 150;
  const date = (card.sample?.date ?? card.firstSpot?.createdAt) ? new Date(card.sample?.date ?? card.firstSpot!.createdAt).toLocaleDateString('de-DE') : '';
  const stats: [string, string][] = [
    ['SPOT', card.spotNumber ? `#${card.spotNumber}` : '—'],
    ['DATUM', date || '—'],
    ['XP', card.xp ? `+${card.xp}` : '—'],
  ];
  const cols = [0, 0.3, 0.72];
  stats.forEach(([k, v], i) => {
    ctx.fillStyle = '#8a929b';
    ctx.font = '700 28px system-ui, sans-serif';
    ctx.fillText(k, px + cols[i] * pw, y);
    ctx.fillStyle = '#ffffff';
    fitText(ctx, v, ((cols[i + 1] ?? 1) - cols[i]) * pw - 24, 46);
    ctx.fillText(v, px + cols[i] * pw, y + 56);
  });
  if (opts.place) {
    ctx.fillStyle = '#c9ced5';
    fitText(ctx, `📍 ${opts.place}`, pw, 40, 600);
    ctx.fillText(`📍 ${opts.place}`, px, y + 140);
  }

  // Fuß
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px system-ui, sans-serif';
  ctx.fillText(`gespottet von @${opts.username}`, W / 2, cy + ch + 120);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '600 36px system-ui, sans-serif';
  ctx.fillText('Sammle jedes Auto mit SpotDrive 🏎️', W / 2, cy + ch + 180);
  if (usedCatalog) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText(`Foto: ${cat!.author} · ${cat!.license} · Wikimedia Commons`, W / 2, H - 40);
  }

  return new Promise<Blob>((res, rej) => {
    try {
      c.toBlob((b) => (b ? res(b) : rej(new Error('Bild konnte nicht erstellt werden'))), 'image/png');
    } catch (e) {
      rej(e as Error);
    }
  });
}

/** Teilen (Handy) oder Herunterladen (Desktop). Gibt zurück, was passiert ist. */
export async function shareStory(blob: Blob, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], `spotdrive-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: `${title} auf SpotDrive`, text: `Neu in meiner Sammlung: ${title} 🏎️ #SpotDrive #carspotting` });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}
