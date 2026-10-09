import type { CSSProperties } from 'react';
import type { BadgeProgress, ChallengeProgress, ChallengeReward } from '../types/models';
import { CHALLENGE_RARITY, CARD_DESIGNS } from '../data/challenges';
import { garageItem } from '../data/garageItems';
import { timeLeft, type CommunityProgress } from '../lib/challenges';
import { useApp } from '../state/AppStore';
import { Icon } from './Icon';

const SCOPE_LABEL = { daily: '🏁 Daily Challenge', weekly: '🔥 Weekly Challenge', personal: '🎯 Meine Challenge', community: '🌍 Community Challenge' } as const;

export function RewardLine({ reward }: { reward: ChallengeReward }) {
  return (
    <div className="ch-reward">
      <span className="ch-reward__xp">+{reward.xp.toLocaleString('de-DE')} XP</span>
      {reward.badge && (
        <span className="ch-reward__extra">
          {reward.badge.icon} {reward.badge.name}
        </span>
      )}
      {reward.title && <span className="ch-reward__extra">🏷️ Titel „{reward.title}“</span>}
      {reward.decorationId && <span className="ch-reward__extra">🏠 {garageItem(reward.decorationId)?.name}</span>}
      {reward.cardDesignId && <span className="ch-reward__extra">🃏 {CARD_DESIGNS[reward.cardDesignId]?.name}</span>}
    </div>
  );
}

/** Moderne Challenge-Karte für Daily / Weekly / Personal. */
export function ChallengeCard({ p, compact = false, onDelete }: { p: ChallengeProgress; compact?: boolean; onDelete?: () => void }) {
  const { def } = p.active;
  const r = CHALLENGE_RARITY[def.rarity];
  const pct = Math.round((p.current / p.target) * 100);
  return (
    <div className={`ch-card ch-card--${def.rarity} ${p.completed ? 'ch-card--done' : ''} ${compact ? 'ch-card--compact' : ''}`} style={{ ['--cr' as string]: r.color } as CSSProperties}>
      <div className="ch-card__top">
        <span className="ch-card__scope">{def.rarity === 'legendary' ? '👑 Legendary Challenge' : SCOPE_LABEL[def.scope]}</span>
        <span className="ch-card__rarity">
          {r.icon} {r.label}
        </span>
      </div>
      <div className="ch-card__main">
        <span className="ch-card__icon">{def.icon}</span>
        <div>
          <div className="ch-card__title">{def.title}</div>
          <div className="ch-card__desc">{def.description}</div>
        </div>
      </div>
      <div className="ch-card__progress">
        <div className="ch-bar">
          <div style={{ width: `${Math.max(p.current ? 4 : 0, pct)}%` }} />
        </div>
        <span className="ch-card__count">
          <b>{p.current}</b> / {p.target} · {pct}%
        </span>
      </div>
      {!compact && (
        <div className="ch-card__foot">
          <RewardLine reward={def.reward} />
          <span className="ch-card__time">
            {p.completed ? (
              <b className="ch-done">✅ Geschafft</b>
            ) : (
              <>
                <Icon name="history" size={12} /> {timeLeft(p.active.endsAt)}
              </>
            )}
          </span>
        </div>
      )}
      {compact && <div className="ch-card__mini">{p.completed ? '✅ Geschafft' : `+${def.reward.xp} XP · ${timeLeft(p.active.endsAt)}`}</div>}
      {onDelete && !compact && (
        <button className="ch-card__delete" onClick={onDelete} aria-label="Challenge löschen">
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

/** Community-Challenge: gemeinsamer Fortschritt aller Spotter. */
export function CommunityCard({ c, joined }: { c: CommunityProgress; joined: boolean }) {
  const { joinCommunity } = useApp();
  const r = CHALLENGE_RARITY[c.def.rarity];
  const pct = Math.min(100, (c.total / c.goal) * 100);
  return (
    <div className={`ch-card ch-card--community ch-card--${c.def.rarity} ${c.completed ? 'ch-card--done' : ''}`} style={{ ['--cr' as string]: r.color } as CSSProperties}>
      <div className="ch-card__top">
        <span className="ch-card__scope">🌍 Community Challenge</span>
        <span className="ch-card__rarity">
          {r.icon} {r.label}
        </span>
      </div>
      <div className="ch-card__main">
        <span className="ch-card__icon">{c.def.icon}</span>
        <div>
          <div className="ch-card__title">{c.def.title}</div>
          <div className="ch-card__desc">{c.def.description}</div>
        </div>
      </div>
      <div className="ch-community">
        <div className="ch-community__nums">
          <b>{c.total.toLocaleString('de-DE')}</b> / {c.goal.toLocaleString('de-DE')}
        </div>
        <div className="ch-bar ch-bar--big">
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="ch-community__meta">
          <span>👥 {c.def.participants.toLocaleString('de-DE')} Spotter</span>
          <span>{joined ? `Dein Beitrag: ${c.mine} ${c.mine === 1 ? 'Spot' : 'Spots'}` : 'Du nimmst noch nicht teil'}</span>
        </div>
      </div>
      <div className="ch-card__foot">
        <RewardLine reward={c.def.reward} />
        <span className="ch-card__time">
          <Icon name="history" size={12} /> {timeLeft(c.def.endsAt)}
        </span>
      </div>
      {!joined && (
        <button className="btn btn--primary btn--block btn--sm" onClick={() => joinCommunity(c.def.id)}>
          Teilnehmen
        </button>
      )}
    </div>
  );
}

export function BadgeTile({ p }: { p: BadgeProgress }) {
  return (
    <div className={`badge-tile ${p.unlocked ? '' : 'badge-tile--locked'}`} title={p.badge.description}>
      <div className={`badge-medal badge-medal--${p.badge.tier}`}>{p.unlocked ? p.badge.icon : <Icon name="lock" size={18} />}</div>
      <div className="badge-tile__name">{p.badge.name}</div>
      <div className="badge-tile__desc">{p.badge.description}</div>
      {!p.unlocked && (
        <div className="bar bar--thin">
          <div style={{ width: `${(p.current / p.badge.target) * 100}%` }} />
        </div>
      )}
      <div className="badge-tile__count">{p.unlocked ? `+${p.badge.xpReward} XP` : `${p.current}/${p.badge.target}`}</div>
    </div>
  );
}
