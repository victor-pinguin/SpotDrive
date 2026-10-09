import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { CarCardData } from '../lib/cards';
import { cardLevel } from '../lib/cards';
import { getBrand } from '../data/cars';
import { RARITY_META } from '../lib/rarity';
import { visibleLocation } from '../lib/location';
import { CarPhoto } from './CarPhoto';
import { Icon } from './Icon';
import { useApp } from '../state/AppStore';
import type { CardStyle } from '../types/models';
import { accentOf, backgroundCss, resolveCardStyle } from '../lib/cardStyle';

const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

/**
 * Digitale Sammelkarte.
 *  - size="sm": Kachel im Karten-Album
 *  - size="xs": Mini-Vorschau (Card Editor)
 *  - size="lg": große Detailkarte mit 3D-Neigung und Holo-Effekt (ab Episch)
 * Das Design (Custom Spot Cards, Pro) kommt aus dem Store – siehe lib/cardStyle.ts.
 */
export function CarCard({
  card,
  size = 'sm',
  viewerId,
  onClick,
  styleOverride,
}: {
  card: CarCardData;
  size?: 'xs' | 'sm' | 'lg';
  viewerId?: string;
  onClick?: () => void;
  /** feste Vorschau (Card Editor) statt gespeichertem Design */
  styleOverride?: CardStyle;
}) {
  const { model, collected } = card;
  const brand = getBrand(model.brandId);
  const r = RARITY_META[model.rarity];
  const lvl = cardLevel(card.count);
  const ref = useRef<HTMLDivElement>(null);
  const { state, cardCtx, unlockedThemes } = useApp();
  const [broken, setBroken] = useState(false);

  // 3D-Neigung bei großer Karte
  const onMove = (e: PointerEvent) => {
    if (size !== 'lg' || !ref.current) return;
    const b = ref.current.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5;
    const y = (e.clientY - b.top) / b.height - 0.5;
    ref.current.style.setProperty('--rx', `${-y * 14}deg`);
    ref.current.style.setProperty('--ry', `${x * 16}deg`);
    ref.current.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty('--my', `${(y + 0.5) * 100}%`);
  };
  const reset = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };

  const place = card.sample ? card.sample.place : card.firstSpot ? (viewerId ? visibleLocation(card.firstSpot, viewerId).areaLabel : card.firstSpot.location.areaLabel) : '—';
  const date = card.sample ? card.sample.date : card.firstSpot?.createdAt;
  const media = card.photoSpot?.media;
  const ownPhoto = media && !media.placeholder ? (media.type === 'photo' ? media.url : media.posterUrl) : undefined;

  // Custom Spot Cards: Design auflösen (Vorschau im Editor → styleOverride)
  const style = styleOverride ?? resolveCardStyle(model.id, model.rarity, state.cardStyles, cardCtx, unlockedThemes);
  const custom = style.themeId !== 'standard';
  const fx = new Set(style.effects);
  const classes = [
    'car-card',
    `car-card--${size}`,
    `car-card--${model.rarity}`,
    `car-card--theme-${style.themeId}`,
    `car-card--frame-${style.frameId}`,
    `car-card--text-${style.textStyle}`,
    ...style.effects.map((e) => `car-card--fx-${e}`),
    collected ? '' : 'car-card--locked',
  ].join(' ');
  const showCorners = style.frameId === 'gold' || (style.frameId === 'rarity' && (model.rarity === 'legendary' || model.rarity === 'impossible'));

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={classes}
      style={{ ['--rc' as string]: r.color, ['--brand' as string]: brand.color, ['--lvl' as string]: lvl.current.color, ['--acc' as string]: accentOf(style), ['--card-bg' as string]: backgroundCss(style) } as CSSProperties}
      onClick={onClick}
    >
      <div ref={ref} className="car-card__inner" onPointerMove={onMove} onPointerLeave={reset}>
        <span className="car-card__bg" aria-hidden="true" />
        {fx.has('carbon') && <span className="car-card__tex car-card__tex--carbon" aria-hidden="true" />}
        {fx.has('metallic') && <span className="car-card__tex car-card__tex--metal" aria-hidden="true" />}
        {fx.has('particles') && <span className="car-card__particles" aria-hidden="true" />}

        <div className="car-card__content">
          <div className="car-card__top">
            <span className="car-card__brand">{brand.name}</span>
            <span className="car-card__gem" title={r.label}>
              {r.emoji}
            </span>
          </div>

          <div className="car-card__photo">
            {collected && ownPhoto && !broken ? <img src={ownPhoto} alt="" loading="lazy" onError={() => setBroken(true)} /> : <CarPhoto modelId={model.id} width={size === 'lg' ? 960 : 500} dim={!collected} />}
            {!collected && (
              <span className="car-card__lock">
                <Icon name="lock" size={size === 'lg' ? 26 : 18} />
              </span>
            )}
            {collected && size !== 'lg' && card.count > 1 && <span className="car-card__count">×{card.count}</span>}
          </div>

          <div className="car-card__info">
            <div className="car-card__name">
              <b>{model.name}</b>
              {card.variant && <span>{card.variant}</span>}
            </div>
            <div className="car-card__rarity">
              {r.emoji} {r.label.toUpperCase()}
            </div>

            {size === 'lg' && (
              <>
                <dl className="car-card__stats">
                  <div>
                    <dt>Spot-Nr.</dt>
                    <dd>{card.spotNumber ? `#${card.spotNumber}` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Datum</dt>
                    <dd>{fmtDate(date)}</dd>
                  </div>
                  <div className="car-card__stat--wide">
                    <dt>Ort (ungefähr)</dt>
                    <dd>{place}</dd>
                  </div>
                  <div>
                    <dt>XP</dt>
                    <dd>{collected && card.xp ? `+${card.xp.toLocaleString('de-DE')}` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Collector</dt>
                    <dd style={{ color: collected ? lvl.current.color : undefined }}>{collected ? `${lvl.current.name} · ${card.count}×` : '—'}</dd>
                  </div>
                </dl>
                <div className="car-card__progress">
                  <div className="car-card__progress-head">
                    <span>Collector-Status</span>
                    <span>{lvl.next ? `${card.count}/${lvl.next.min} bis ${lvl.next.name}` : 'Maximal!'}</span>
                  </div>
                  <div className="bar bar--thin">
                    <div style={{ width: `${collected ? Math.max(4, lvl.progress * 100) : 0}%`, background: lvl.next?.color ?? lvl.current.color }} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="car-card__foot">
            <span>{size === 'xs' ? (custom ? 'PRO' : 'SD') : custom ? 'SPOTDRIVE PRO' : 'SPOTDRIVE'}</span>
            <span>{collected ? [card.spotNumber ? `#${card.spotNumber}` : '', size === 'sm' && date ? fmtShort(date) : ''].filter(Boolean).join(' · ') : 'NICHT GESAMMELT'}</span>
          </div>
        </div>

        {showCorners && <span className="car-card__corners" aria-hidden="true" />}
        <span className="car-card__holo" aria-hidden="true" />
        {fx.has('shine') && <span className="car-card__shine" aria-hidden="true" />}
      </div>
    </Tag>
  );
}
