import { useEffect, useState, type ReactNode } from 'react';
import type { LevelInfo, Rarity, User } from '../types/models';
import { levelFromXp, rankFor } from '../lib/xp';
import { RARITY_META } from '../lib/rarity';
import { Icon } from './Icon';

/** Kleine, wiederverwendbare UI-Bausteine. */

/**
 * Profilbild mit Rang: Ringfarbe + Rang-Emoji richten sich nach dem Level
 * (🟢 Beginner · 🔵 Spotter · 🟣 Pro Spotter · 🔴 Elite Spotter · 👑 Master Spotter).
 */
export function Avatar({ user, size = 36 }: { user: Pick<User, 'displayName' | 'username' | 'avatarColor' | 'avatarUrl'> & { xp?: number }; size?: number; ring?: boolean }) {
  const rank = user.xp !== undefined ? rankFor(levelFromXp(user.xp).level) : null;
  const initials = (user.displayName === 'Du' ? user.username : user.displayName).replace(/[^a-zA-Z ]/g, ' ').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span
      className={`avatar-wrap ${rank ? 'avatar-wrap--rank' : ''} ${rank?.title === 'Master Spotter' ? 'avatar-wrap--master' : ''}`}
      style={{ width: size, height: size, ['--rank' as string]: rank?.color ?? 'transparent', ['--ring' as string]: `${Math.max(2, Math.round(size / 22))}px` }}
      title={rank ? rank.title : undefined}
    >
      <span className="avatar" style={{ fontSize: size * 0.38, ['--c' as string]: user.avatarColor }}>
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials || '?'}
      </span>
      {rank && size >= 30 && (
        <span className="avatar-rank" style={{ fontSize: Math.max(10, Math.round(size * 0.26)) }} aria-label={rank.title}>
          {rank.emoji}
        </span>
      )}
    </span>
  );
}

export function RarityTag({ rarity, size = 'sm' }: { rarity: Rarity; size?: 'sm' | 'md' }) {
  const m = RARITY_META[rarity];
  return (
    <span className={`rarity rarity--${rarity} rarity--${size}`} style={{ ['--r' as string]: m.color }}>
      <span className="rarity__emoji">{m.emoji}</span>
      {m.label}
    </span>
  );
}

export function ProBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`pro-badge ${small ? 'pro-badge--sm' : ''}`} title="SpotDrive Pro">
      <Icon name="crown" size={small ? 10 : 12} fill strokeWidth={0} /> PRO
    </span>
  );
}

export function XpBar({ level, compact = false }: { level: LevelInfo; compact?: boolean }) {
  // animiert von 0 auf den Wert (auch bei XP-Gewinn)
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setW(level.progress));
    return () => cancelAnimationFrame(t);
  }, [level.progress]);
  return (
    <div className={`xpbar ${compact ? 'xpbar--compact' : ''}`}>
      {!compact && (
        <div className="xpbar__meta">
          <span>
            <b>Level {level.level}</b> · {rankFor(level.level).emoji} {level.title}
          </span>
          <span className="muted">
            {level.xpIntoLevel.toLocaleString('de-DE')} / {level.xpForNext.toLocaleString('de-DE')} XP
          </span>
        </div>
      )}
      <div className="xpbar__track">
        <div className="xpbar__fill" style={{ width: `${Math.max(2, w * 100)}%` }} />
      </div>
    </div>
  );
}

export function LevelChip({ level }: { level: number }) {
  return <span className="level-chip">LV {level}</span>;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        {title && (
          <div className="sheet__head">
            <h3>{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Schließen">
              <Icon name="x" />
            </button>
          </div>
        )}
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: Parameters<typeof Icon>[0]['name']; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon name={icon} size={28} />
      </div>
      <h4>{title}</h4>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'gerade eben';
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  if (s < 86400 * 7) return `vor ${Math.floor(s / 86400)} T.`;
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
};

export const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : n.toLocaleString('de-DE'));
