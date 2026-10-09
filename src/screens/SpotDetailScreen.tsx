import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../state/AppStore';
import { TopBar } from '../components/Layout';
import { SpotMedia } from '../components/SpotMedia';
import { profilePath } from '../components/SpotCard';
import { Avatar, EmptyState, ProBadge, RarityTag, fmt, timeAgo } from '../components/ui';
import { Icon } from '../components/Icon';
import { ShareCardButton } from '../components/ShareCardButton';
import { spotCard } from '../lib/cards';
import { getBrand, getModel } from '../data/cars';
import { visibleLocation } from '../lib/location';
import { RARITY_META } from '../lib/rarity';

export function SpotDetailScreen() {
  const { id } = useParams();
  const { state, me, userById, toggleLike, toggleSave, addComment, showToast, addDreamCar } = useApp();
  const [text, setText] = useState('');
  const spot = state.spots.find((s) => s.id === id);

  if (!spot || (!spot.isPublic && spot.userId !== me.id)) {
    return (
      <div className="screen">
        <TopBar back />
        <EmptyState icon="eyeOff" title="Spot nicht verfügbar" text="Der Spot wurde gelöscht oder ist privat." />
      </div>
    );
  }

  const author = userById(spot.userId)!;
  const model = getModel(spot.modelId);
  const brand = getBrand(model.brandId);
  const dream = state.dreamCars.find((d) => d.modelId === model.id);
  const ownSpotted = state.spots.some((s) => s.userId === me.id && s.modelId === model.id);
  const liked = spot.likedBy.includes(me.id);
  const saved = me.savedSpotIds.includes(spot.id);
  const loc = visibleLocation(spot, me.id);
  const isMine = spot.userId === me.id;

  const send = () => {
    const t = text.trim();
    if (!t) return;
    addComment(spot.id, t); // TODO(backend): POST /spots/:id/comments (+ Moderation/Spam-Filter)
    setText('');
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${brand.name} ${model.name} auf SpotDrive`, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('Link kopiert');
      }
    } catch {
      /* abgebrochen */
    }
  };

  return (
    <div className="screen screen--detail">
      <TopBar
        back
        title={`${brand.name} ${model.name}`}
        right={
          <button className="icon-btn" onClick={share} aria-label="Teilen">
            <Icon name="share" />
          </button>
        }
      />
      <div className="detail-media">
        <SpotMedia spot={spot} />
      </div>

      <div className="detail-body">
        <div className="detail-title">
          <div>
            <div className="eyebrow" style={{ color: brand.color }}>
              {brand.name}
            </div>
            <h1>{model.name}</h1>
            {spot.variant && <div className="muted">{spot.variant}</div>}
          </div>
          <RarityTag rarity={model.rarity} size="md" />
        </div>

        <div className="detail-facts">
          <div>
            <span className="muted small">Ort</span>
            <b>
              <Icon name="pin" size={14} /> {loc.areaLabel}
            </b>
            <span className="muted small">
              {isMine
                ? `Du siehst den exakten Punkt · öffentlich: ${spot.location.visibility === 'area' ? 'nur Bereich' : spot.location.visibility === 'exact' ? 'genau' : 'verborgen'}`
                : loc.radiusM > 0
                  ? 'Ungefährer Bereich (~2 km)'
                  : loc.point
                    ? 'Genauer Standort geteilt'
                    : 'Standort verborgen'}
            </span>
          </div>
          <div>
            <span className="muted small">Datum</span>
            <b>{new Date(spot.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</b>
            <span className="muted small">{timeAgo(spot.createdAt)}</span>
          </div>
          <div>
            <span className="muted small">Seltenheit</span>
            <b style={{ color: RARITY_META[model.rarity].color }}>{RARITY_META[model.rarity].label}</b>
            <span className="muted small">{model.years ?? ''}</span>
          </div>
          <div>
            <span className="muted small">XP</span>
            <b>+{spot.xpAwarded}</b>
            <span className="muted small">{spot.wasNewModel ? 'Neues Modell' : 'Wiederholter Spot'}</span>
          </div>
        </div>

        <Link to={profilePath(author.id, me.id)} className="detail-author">
          <Avatar user={author} size={40} />
          <div>
            <b>@{author.username}</b> {author.isPro && <ProBadge small />}
            <div className="muted small">{author.homeArea}</div>
          </div>
          <Icon name="chevronRight" />
        </Link>

        {spot.description && <p className="detail-desc">{spot.description}</p>}
        {!spot.isPublic && (
          <div className="chip chip--ghost">
            <Icon name="lock" size={12} /> Privat – nur du siehst diesen Spot
          </div>
        )}

        <div className="spot-card__actions detail-actions">
          <button className={`action ${liked ? 'action--liked' : ''}`} onClick={() => toggleLike(spot.id)}>
            <Icon name="heart" fill={liked} /> {fmt(spot.likedBy.length)}
          </button>
          <span className="action">
            <Icon name="comment" /> {spot.comments.length}
          </span>
          <span className="spacer" />
          <button className={`action ${saved ? 'action--saved' : ''}`} onClick={() => toggleSave(spot.id)}>
            <Icon name="bookmark" fill={saved} /> {saved ? 'Gespeichert' : 'Speichern'}
          </button>
        </div>

        {spot.userId !== me.id && (
          <div className={`dream-spot ${dream ? 'dream-spot--on' : ''}`}>
            {dream ? (
              <>
                <div>
                  <b>❤️ Dream Car von deiner Liste</b>
                  <div className="muted small">{ownSpotted ? '✅ Du hast es schon gespottet' : 'Selbst spotten → Sammlung, Car Card, XP & Challenges (+500 XP Dream-Bonus)'}</div>
                </div>
                {!ownSpotted && (
                  <Link className="btn btn--primary btn--sm" to={`/create?model=${encodeURIComponent(model.id)}`}>
                    📸 Selbst spotten
                  </Link>
                )}
              </>
            ) : (
              <>
                <span className="muted small">Traumauto?</span>
                <button
                  className="btn btn--outline btn--sm"
                  onClick={() => addDreamCar({ modelId: model.id }) && showToast(`❤️ ${model.name} ist auf deiner Dream-Car-Liste`)}
                >
                  ❤️ Zur Dream-Car-Liste
                </button>
              </>
            )}
          </div>
        )}

        {spot.userId === me.id && (
          <div className="row gap-s mt">
            <ShareCardButton card={spotCard(spot, state.spots, me.id)} className="btn btn--outline btn--block" />
          </div>
        )}

        <h3 className="mt">Kommentare</h3>
        <div className="comments">
          {spot.comments.map((c) => {
            const u = userById(c.userId);
            if (!u) return null;
            return (
              <div key={c.id} className="comment">
                <Link to={profilePath(u.id, me.id)}>
                  <Avatar user={u} size={30} />
                </Link>
                <div>
                  <div>
                    <Link to={profilePath(u.id, me.id)} className="comment__user">
                      {u.username}
                    </Link>{' '}
                    <span className="muted small">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div>{c.text}</div>
                </div>
              </div>
            );
          })}
          {!spot.comments.length && <p className="muted small">Noch keine Kommentare – sei die/der Erste.</p>}
        </div>
      </div>

      <form
        className="comment-bar"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Avatar user={me} size={30} />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Kommentieren…" maxLength={300} />
        <button className="icon-btn icon-btn--accent" disabled={!text.trim()} aria-label="Senden">
          <Icon name="send" size={20} />
        </button>
      </form>
    </div>
  );
}
