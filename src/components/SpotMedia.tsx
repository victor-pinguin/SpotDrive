import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MediaCredit, Spot } from '../types/models';
import { getBrand, getModel } from '../data/cars';
import { catalogPhoto } from '../data/carPhotos';
import { useApp } from '../state/AppStore';
import { CarArt } from './CarArt';
import { Icon } from './Icon';

export function CreditTag({ credit }: { credit?: MediaCredit }) {
  if (!credit) return null;
  return (
    <a className="credit" href={credit.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Bildquelle: Wikimedia Commons">
      © {credit.author} · {credit.license}
    </a>
  );
}

/**
 * Zeigt das echte Foto bzw. Video eines Spots.
 * Videos laufen nur für SpotDrive-Pro-Nutzer; Free-Nutzer sehen das Standbild
 * mit einem Pro-Hinweis. Fällt ein Bild aus (offline), erscheint die Illustration.
 */
export function SpotMedia({ spot, showCredit = true }: { spot: Spot; showCredit?: boolean }) {
  const { me } = useApp();
  const navigate = useNavigate();
  const model = getModel(spot.modelId);
  const brand = getBrand(model.brandId);
  const [broken, setBroken] = useState(false);

  const isVideo = spot.media.type === 'video' && !!spot.media.url && !spot.media.placeholder;
  const poster = spot.media.posterUrl ?? catalogPhoto(model.id)?.url;
  const photoUrl = spot.media.type === 'photo' ? spot.media.url : poster;
  const canPlay = isVideo && me.isPro && !broken;

  const art = (
    <div className="media__studio">
      <div className="media__studio-glow" />
      <span className="media__watermark">{brand.name.toUpperCase()}</span>
      <CarArt model={model} className="media__car" glow={brand.color} />
    </div>
  );

  let content;
  if (canPlay) {
    content = (
      <video className="media__img" poster={poster} muted loop playsInline autoPlay preload="metadata" onError={() => setBroken(true)}>
        <source src={spot.media.url} type="video/webm" />
        {spot.media.urlAlt && <source src={spot.media.urlAlt} type="video/mp4" />}
      </video>
    );
  } else if (photoUrl && !broken) {
    content = <img src={photoUrl} alt={`${brand.name} ${model.name}`} className="media__img" loading="lazy" onError={() => setBroken(true)} />;
  } else {
    content = art;
  }

  return (
    <div className="media" style={{ ['--brand' as string]: brand.color }}>
      {content}
      {spot.media.type === 'video' && (
        <span className="media__type">
          <Icon name="play" size={12} fill strokeWidth={0} /> Video
        </span>
      )}
      {isVideo && !me.isPro && (
        <button
          className="media__locked"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/pro');
          }}
        >
          <span className="media__play">
            <Icon name="play" size={26} fill strokeWidth={0} />
          </span>
          <span>
            Video ansehen mit <b>PRO</b>
          </span>
        </button>
      )}
      {showCredit && !broken && <CreditTag credit={spot.media.credit} />}
    </div>
  );
}
