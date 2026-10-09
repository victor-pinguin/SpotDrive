import { useState } from 'react';
import type { ID, Spot } from '../types/models';
import { getBrand, getModel } from '../data/cars';
import { catalogPhoto } from '../data/carPhotos';
import { CarArt } from './CarArt';

/**
 * Bestes verfügbares Foto eines Modells:
 *   1. eigenes Foto des Nutzers (neuester Foto-Spot dieses Modells)
 *   2. Katalogfoto (Wikimedia Commons)
 *   3. Illustration (offline / kein Foto vorhanden)
 */
export function bestPhotoUrl(modelId: ID, spots?: Spot[], userId?: ID, width: 500 | 960 = 960): { url?: string; own: boolean } {
  if (spots && userId) {
    const own = spots
      .filter((s) => s.userId === userId && s.modelId === modelId && !s.media.placeholder)
      .map((s) => (s.media.type === 'photo' ? s.media.url : s.media.posterUrl))
      .find((u) => u && !u.startsWith('blob:'));
    if (own) return { url: own, own: true };
  }
  return { url: catalogPhoto(modelId, width)?.url, own: false };
}

export function CarPhoto({
  modelId,
  spots,
  userId,
  className = '',
  width = 960,
  dim = false,
}: {
  modelId: ID;
  spots?: Spot[];
  userId?: ID;
  className?: string;
  width?: 500 | 960;
  /** Noch nicht gesammelt → abgedunkelt/entsättigt */
  dim?: boolean;
}) {
  const model = getModel(modelId);
  const { url } = bestPhotoUrl(modelId, spots, userId, width);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = !url || failedUrl === url;

  return (
    <div className={`car-photo ${dim ? 'car-photo--dim' : ''} ${className}`} style={{ ['--brand' as string]: getBrand(model.brandId).color }}>
      {failed ? (
        <div className="car-photo__art">
          <CarArt model={model} glow={getBrand(model.brandId).color} paint={dim ? '#2a2d33' : undefined} />
        </div>
      ) : (
        <img src={url} alt={`${getBrand(model.brandId).name} ${model.name}`} loading="lazy" onError={() => setFailedUrl(url!)} />
      )}
    </div>
  );
}
