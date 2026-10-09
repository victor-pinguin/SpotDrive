import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Spot } from '../types/models';
import { getBrand, getModel } from '../data/cars';
import { useApp } from '../state/AppStore';
import { visibleLocation } from '../lib/location';
import { levelFromXp } from '../lib/xp';
import { Avatar, LevelChip, ProBadge, RarityTag, fmt, timeAgo } from './ui';
import { SpotMedia } from './SpotMedia';
import { Icon } from './Icon';

export const profilePath = (userId: string, meId: string) => (userId === meId ? '/profile' : `/user/${userId}`);

export function SpotCard({ spot }: { spot: Spot }) {
  const { me, userById, toggleLike, toggleSave } = useApp();
  const navigate = useNavigate();
  const author = userById(spot.userId)!;
  const model = getModel(spot.modelId);
  const brand = getBrand(model.brandId);
  const liked = spot.likedBy.includes(me.id);
  const saved = me.savedSpotIds.includes(spot.id);
  const loc = visibleLocation(spot, me.id);
  const [burst, setBurst] = useState(0);

  const like = () => {
    if (!liked) setBurst((b) => b + 1);
    toggleLike(spot.id);
  };

  return (
    <article className={`spot-card spot-card--${model.rarity}`}>
      <header className="spot-card__head">
        <Link to={profilePath(author.id, me.id)} className="spot-card__author">
          <Avatar user={author} size={36} />
          <div>
            <div className="spot-card__name">
              {author.username} {author.isPro && <ProBadge small />}
            </div>
            <div className="spot-card__sub">
              <LevelChip level={levelFromXp(author.xp).level} /> · {timeAgo(spot.createdAt)}
            </div>
          </div>
        </Link>
        <RarityTag rarity={model.rarity} />
      </header>

      <div
        className="spot-card__media"
        onDoubleClick={() => !liked && like()}
        onClick={() => navigate(`/spot/${spot.id}`)}
        role="button"
        tabIndex={0}
        aria-label={`${brand.name} ${model.name} öffnen`}
      >
        <SpotMedia spot={spot} />
        {burst > 0 && (
          <span key={burst} className="heart-burst">
            <Icon name="heart" size={96} fill strokeWidth={0} />
          </span>
        )}
      </div>

      <div className="spot-card__body">
        <div className="spot-card__title">
          <span className="brand-dot" style={{ background: brand.color }} />
          <div>
            <div className="eyebrow">{brand.name}</div>
            <h3>
              {model.name}
              {spot.variant && <span className="muted"> · {spot.variant}</span>}
            </h3>
          </div>
        </div>
        <div className="spot-card__loc">
          <Icon name="pin" size={15} />
          {loc.areaLabel}
          {loc.radiusM > 0 && <span className="chip chip--ghost">≈ Bereich</span>}
        </div>
        {spot.description && <p className="spot-card__desc">{spot.description}</p>}

        <div className="spot-card__actions">
          <button className={`action ${liked ? 'action--liked' : ''}`} onClick={like} aria-pressed={liked}>
            <Icon name="heart" fill={liked} /> {fmt(spot.likedBy.length)}
          </button>
          <button className="action" onClick={() => navigate(`/spot/${spot.id}`)}>
            <Icon name="comment" /> {spot.comments.length}
          </button>
          <span className="spacer" />
          <button className={`action ${saved ? 'action--saved' : ''}`} onClick={() => toggleSave(spot.id)} aria-pressed={saved} aria-label="Speichern">
            <Icon name="bookmark" fill={saved} />
          </button>
        </div>
      </div>
    </article>
  );
}
