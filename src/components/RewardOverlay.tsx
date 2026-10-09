import { useEffect, useMemo, useState } from 'react';
import { useApp, type Reward } from '../state/AppStore';
import { getBrand } from '../data/cars';
import { CarPhoto } from './CarPhoto';
import { CarCard } from './CarCard';
import { ShareCardButton } from './ShareCardButton';
import { CHALLENGE_RARITY } from '../data/challenges';
import { carCards } from '../lib/cards';
import { RARITY_META, rarityRank } from '../lib/rarity';
import { rankFor } from '../lib/xp';
import { RarityTag } from './ui';
import { Icon } from './Icon';

/** Zählt eine Zahl animiert hoch. */
function useCountUp(target: number, ms = 900, delay = 250) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / ms));
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay]);
  return v;
}

function Confetti({ colors }: { colors: string[] }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        x: Math.random() * 100,
        d: 0.6 + Math.random() * 1.4,
        delay: Math.random() * 0.4,
        r: Math.random() * 360,
        c: colors[i % colors.length],
        w: 5 + Math.random() * 6,
      })),
    [colors],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={{
            left: `${b.x}%`,
            background: b.c,
            width: b.w,
            height: b.w * 0.45,
            animationDuration: `${1.6 + b.d}s`,
            animationDelay: `${b.delay}s`,
            ['--rot' as string]: `${b.r}deg`,
          }}
        />
      ))}
    </div>
  );
}

function SpotReward({ r }: { r: Extract<Reward, { kind: 'spot' }> }) {
  const total = useCountUp(r.total);
  const brand = getBrand(r.model.brandId);
  const { state, me } = useApp();
  const card = r.isNew ? carCards(state.spots, me.id).find((c) => c.model.id === r.model.id) : undefined;
  return (
    <>
      {r.isNew && <Confetti colors={[brand.color, RARITY_META[r.model.rarity].color, '#ffffff', '#ffb020']} />}
      <div className="reward__kicker">{r.isNew ? 'NEW CAR CARD UNLOCKED!' : 'SPOT GESPEICHERT'}</div>
      {r.isNew && rarityRank(r.model.rarity) >= rarityRank('epic') && (
        <div className={`tier-banner tier-banner--${r.model.rarity}`}>
          {RARITY_META[r.model.rarity].emoji} {RARITY_META[r.model.rarity].label.toUpperCase()}ER FUND!
        </div>
      )}
      {card ? (
        <div className="reward__card">
          <div className="reward__card-back" aria-hidden="true">
            <span>SPOTDRIVE</span>
          </div>
          <div className="reward__card-front">
            <CarCard card={card} />
          </div>
        </div>
      ) : (
      <div className="reward__car" style={{ ['--brand' as string]: brand.color }}>
        {r.mediaUrl && r.mediaType === 'photo' ? (
          <img src={r.mediaUrl} alt="" />
        ) : r.mediaUrl && r.mediaType === 'video' ? (
          <video src={r.mediaUrl} muted autoPlay loop playsInline />
        ) : (
          <CarPhoto modelId={r.model.id} />
        )}
      </div>
      )}
      {!card && (
        <>
          <div className="eyebrow">{brand.name}</div>
          <h2 className="reward__title">{r.model.name}</h2>
          <RarityTag rarity={r.model.rarity} size="md" />
        </>
      )}
      {card && (
        <h2 className="reward__title">
          {brand.name} {r.model.name}
        </h2>
      )}
      {card && <ShareCardButton card={card} isNew className="btn btn--outline btn--block btn--sm" />}
      {!r.isNew && <p className="muted small">Dieses Modell ist schon in deiner Sammlung.</p>}
      <ul className="reward__events">
        {r.events.map((e, i) => (
          <li key={e.reason} style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
            <span>{e.label}</span>
            <b>+{e.amount} XP</b>
          </li>
        ))}
      </ul>
      <div className="reward__xp">+{total} XP</div>
    </>
  );
}

function LevelReward({ r }: { r: Extract<Reward, { kind: 'level' }> }) {
  return (
    <>
      <Confetti colors={['#ff5a1f', '#ffb020', '#ffffff', '#3aa0ff']} />
      <div className="reward__kicker">LEVEL UP</div>
      <div className="levelup">
        <div className="levelup__ring" />
        <div className="levelup__ring levelup__ring--2" />
        <div className="levelup__num">{r.level}</div>
      </div>
      <h2 className="reward__title">
        {rankFor(r.level).emoji} {r.title}
      </h2>
      {r.newRank && (
        <div className="reward__unlock reward__unlock--rank" style={{ ['--rank' as string]: rankFor(r.level).color }}>
          Neuer Rang: <b>{rankFor(r.level).emoji} {r.title}</b>
        </div>
      )}
      {r.garageTier && (
        <div className="reward__unlock">
          <Icon name="garage" size={18} /> Garage-Upgrade: <b>{r.garageTier}</b>
        </div>
      )}
      <p className="muted small">Neue Garage-Designs können jetzt freigeschaltet sein.</p>
    </>
  );
}

function BadgeReward({ r }: { r: Extract<Reward, { kind: 'badge' }> }) {
  return (
    <>
      <Confetti colors={['#ffb020', '#ffffff', '#b26bff']} />
      <div className="reward__kicker">BADGE FREIGESCHALTET</div>
      <div className={`badge-medal badge-medal--${r.badge.tier} badge-medal--xl`}>{r.badge.icon}</div>
      <h2 className="reward__title">{r.badge.name}</h2>
      <p className="muted">{r.badge.description}</p>
      <div className="reward__xp">+{r.badge.xpReward} XP</div>
    </>
  );
}

function ChallengeReward({ r }: { r: Extract<Reward, { kind: 'challenge' }> }) {
  const v = useCountUp(r.xp);
  const c = CHALLENGE_RARITY[r.rarity];
  return (
    <>
      <Confetti colors={[c.color, '#ff5a1f', '#ffffff', '#ffb020']} />
      <div className="reward__kicker">🎉 CHALLENGE COMPLETED!</div>
      <div className="ch-reward-medal" style={{ ['--cr' as string]: c.color }}>
        <span>{r.icon}</span>
      </div>
      <h2 className="reward__title">{r.title}</h2>
      <span className="ch-card__rarity" style={{ ['--cr' as string]: c.color }}>
        {c.icon} {r.rarity === 'legendary' ? 'Legendary Challenge' : c.label}
      </span>
      {r.extras.length > 0 && (
        <ul className="reward__events">
          {r.extras.map((e, i) => (
            <li key={e} style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
              <span>{e}</span>
              <b>NEU</b>
            </li>
          ))}
        </ul>
      )}
      <div className="reward__xp">+{v.toLocaleString('de-DE')} XP</div>
    </>
  );
}

function XpReward({ r }: { r: Extract<Reward, { kind: 'xp' }> }) {
  const v = useCountUp(r.amount);
  return (
    <>
      <div className="reward__kicker">BONUS!</div>
      <div className="xp-orb">
        <Icon name="bolt" size={44} fill strokeWidth={0} />
      </div>
      <p className="muted">{r.label}</p>
      <div className="reward__xp">+{v} XP</div>
    </>
  );
}

function DreamReward({ r }: { r: Extract<Reward, { kind: 'dream' }> }) {
  const v = useCountUp(r.xp);
  const brand = getBrand(r.model.brandId);
  return (
    <>
      <Confetti colors={['#ff3d7f', '#ff8fb1', '#ffffff', '#ffb020']} />
      <div className="reward__kicker">🎉 DREAM CAR FOUND!</div>
      <div className="dream-found__photo">
        <CarPhoto modelId={r.model.id} />
        <span className="dream-found__heart">❤️</span>
      </div>
      <div className="eyebrow">{brand.name}</div>
      <h2 className="reward__title">
        {r.model.name}
        {r.variant ? <span className="muted small"> · {r.variant}</span> : null}
      </h2>
      <p className="muted">❤️ Von deiner Dream-Car-Liste gespottet!</p>
      <div className="reward__xp">+{v} XP</div>
    </>
  );
}

export function RewardOverlay() {
  const { rewards, dismissReward } = useApp();
  const r = rewards[0];
  if (!r) return null;
  return (
    <div className="reward-backdrop" onClick={dismissReward}>
      <div key={r.id} className={`reward reward--${r.kind} ${r.kind === 'spot' && r.isNew ? `reward--tier-${r.model.rarity}` : ''}`} onClick={(e) => e.stopPropagation()}>
        {r.kind === 'spot' && <SpotReward r={r} />}
        {r.kind === 'level' && <LevelReward r={r} />}
        {r.kind === 'badge' && <BadgeReward r={r} />}
        {r.kind === 'xp' && <XpReward r={r} />}
        {r.kind === 'challenge' && <ChallengeReward r={r} />}
        {r.kind === 'dream' && <DreamReward r={r} />}
        <button className="btn btn--primary btn--block" onClick={dismissReward}>
          {rewards.length > 1 ? 'Weiter' : 'Nice!'}
        </button>
      </div>
    </div>
  );
}
