import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Spot } from '../types/models';
import { dreamStatus } from '../lib/dreamAlerts';
import { useApp, useUserStats } from '../state/AppStore';
import { TopBar } from '../components/Layout';
import { Avatar, EmptyState, ProBadge, RarityTag, SectionHeader, Sheet, Stat, Toggle, XpBar } from '../components/ui';
import { BadgeTile } from '../components/Progress';
import { SpotMedia } from '../components/SpotMedia';
import { GarageScene } from '../components/GarageScene';
import { CarPhoto } from '../components/CarPhoto';
import { Icon } from '../components/Icon';
import { badgeProgress } from '../lib/badges';
import { useBillingMode } from '../services/billing';
import { MapsKeyField } from '../components/MapsKeyField';
import { rarestModel, collectedModelIds } from '../lib/collection';
import { RANKS, garageTier, nextMilestone, rankFor } from '../lib/xp';
import { downscaleImage } from '../services/device';
import { defaultGarage } from '../data/garageItems';
import { fullName, getBrand, getModel } from '../data/cars';
import { ALL_CATALOG_PHOTOS, DEMO_VIDEOS } from '../data/carPhotos';

function SpotGrid({ spots, showPrivate }: { spots: Spot[]; showPrivate: boolean }) {
  if (!spots.length) return <EmptyState icon="camera" title="Keine Spots" />;
  return (
    <div className="spot-grid">
      {spots.map((s) => (
        <Link key={s.id} to={`/spot/${s.id}`} className="spot-grid__item">
          <SpotMedia spot={s} />
          <span className="spot-grid__label">{getModel(s.modelId).name}</span>
          {showPrivate && !s.isPublic && (
            <span className="spot-grid__lock">
              <Icon name="lock" size={12} />
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export function ProfileScreen() {
  const { id } = useParams();
  const { state, me, setActiveTitle, toggleFollow, setPro, updateProfile, resetDemo } = useApp();
  const billingMode = useBillingMode();
  const userId = id ?? me.id;
  const isMe = userId === me.id;
  const { user, spots, level, modelCount } = useUserStats(userId);
  const navigate = useNavigate();
  const [tab, setTab] = useState<'spots' | 'saved'>('spots');
  const [allBadges, setAllBadges] = useState(false);
  const [settings, setSettings] = useState(false);
  const [draftName, setDraftName] = useState(me.username);
  const [draftBio, setDraftBio] = useState(me.bio ?? '');

  const badges = useMemo(() => badgeProgress(state.spots, userId), [state.spots, userId]);
  const unlocked = badges.filter((b) => b.unlocked);
  const rarest = rarestModel(state.spots, userId);
  const tier = garageTier(level.level);

  // Fremde Garage: im Backend aus Tabelle `garages` laden. Demo: Standard-Garage mit deren Sammlung.
  const garage = useMemo(
    () => {
      const all = [...collectedModelIds(state.spots, userId)];
      if (!isMe) return defaultGarage(userId, all);
      const kept = state.garage.slotModelIds.filter((id) => all.includes(id));
      return { ...state.garage, slotModelIds: [...new Set([...kept, ...all])] };
    },
    [isMe, state.garage, state.spots, userId],
  );

  if (!user) return <EmptyState icon="user" title="Nutzer nicht gefunden" />;

  const visibleSpots = spots.filter((s) => isMe || s.isPublic).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const savedSpots = state.spots.filter((s) => me.savedSpotIds.includes(s.id));
  const following = me.followingIds.includes(userId);

  return (
    <div className="screen">
      <TopBar
        back={!isMe}
        transparent
        right={
          isMe && (
            <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Einstellungen">
              <Icon name="settings" />
            </button>
          )
        }
      />
      <div className="profile-cover" style={{ ['--c' as string]: user.avatarColor }} />
      <div className="profile-head">
        <Avatar user={user} size={88} ring />
        <h1 className="profile-head__name">
          @{user.username} {user.isPro && <ProBadge />}
        </h1>
        <div className="profile-head__title">
          <span className="level-chip level-chip--lg">LV {level.level}</span>
          <span className="rank-title" style={{ ['--rank' as string]: rankFor(level.level).color }}>
            {rankFor(level.level).emoji} {level.title}
          </span>
        </div>
        {isMe && state.activeTitle && <div className="profile-title-badge">🏷️ {state.activeTitle}</div>}
        {isMe && state.unlocks.badges.length > 0 && (
          <div className="profile-trophies">
            {state.unlocks.badges.map((b) => (
              <span key={b.id} title={b.name}>
                {b.icon}
              </span>
            ))}
          </div>
        )}
        {user.bio && <p className="profile-head__bio">{user.bio}</p>}
        <div className="muted small">
          <Icon name="pin" size={12} /> {user.homeArea}
        </div>
        {!isMe && (
          <button className={`btn ${following ? 'btn--outline' : 'btn--primary'} mt`} onClick={() => toggleFollow(userId)}>
            {following ? 'Folge ich' : 'Folgen'}
          </button>
        )}
      </div>

      {isMe && (
        <div className="quick-links">
          <Link to="/history" className="quick-link">
            <Icon name="history" size={20} />
            <span>Spotting-History</span>
          </Link>
          <Link to="/garage" className="quick-link">
            <Icon name="cards" size={20} />
            <span>Car Cards</span>
          </Link>
          <Link to="/search" className="quick-link">
            <Icon name="search" size={20} />
            <span>Smart Search</span>
          </Link>
          <Link to="/calendar" className="quick-link">
            <Icon name="calendar" size={20} />
            <span>Kalender {!me.isPro && <ProBadge small />}</span>
          </Link>
        </div>
      )}

      <div className="card">
        <XpBar level={level} />
        <div className="muted small mt-s">{user.xp.toLocaleString('de-DE')} XP gesamt</div>
      </div>

      <SectionHeader title="Rang" />
      <div className="rank-ladder">
        {RANKS.map((r) => {
          const current = rankFor(level.level).title === r.title;
          const reached = level.level >= r.min;
          return (
            <div key={r.title} className={`rank-step ${current ? 'is-current' : ''} ${reached ? 'is-reached' : ''}`} style={{ ['--rank' as string]: r.color }}>
              <span className="rank-step__emoji">{r.emoji}</span>
              <span className="rank-step__title">{r.title}</span>
              <span className="rank-step__range">{r.max ? `Level ${r.min}–${r.max}` : `Level ${r.min}–∞`}</span>
            </div>
          );
        })}
      </div>
      <p className="muted small">
        Noch {nextMilestone(level.level).level - level.level} Level bis {nextMilestone(level.level).emoji} <b>{nextMilestone(level.level).label}</b> · Level ohne Obergrenze ∞
      </p>

      <div className="stats-grid">
        <Stat value={visibleSpots.length} label="Spots" />
        <Stat value={modelCount} label="Autos" />
        <Stat value={unlocked.length} label="Badges" />
        <Stat value={tier.name.split(' ')[0]} label="Garage" />
      </div>

      {rarest && (
        <div className="rarest" style={{ ['--brand' as string]: getBrand(rarest.brandId).color }}>
          <div className="rarest__label">
            <Icon name="trophy" size={16} /> Seltenstes Auto
          </div>
          <div className="rarest__row">
            <CarPhoto modelId={rarest.id} spots={state.spots} userId={userId} className="rarest__art" width={500} />
            <div>
              <div className="eyebrow">{getBrand(rarest.brandId).name}</div>
              <b>{rarest.name}</b>
              <div>
                <RarityTag rarity={rarest.rarity} />
              </div>
            </div>
          </div>
        </div>
      )}

      <SectionHeader
        title={`Badges · ${unlocked.length}/${badges.length}`}
        action={
          <button className="link" onClick={() => setAllBadges((v) => !v)}>
            {allBadges ? 'Weniger' : 'Alle'}
          </button>
        }
      />
      <div className="badge-grid">
        {(allBadges ? badges : [...unlocked, ...badges.filter((b) => !b.unlocked)].slice(0, 6)).map((b) => (
          <BadgeTile key={b.badge.id} p={b} />
        ))}
      </div>

      {isMe && <DreamCarsSection />}

      <SectionHeader title={isMe ? 'Meine Garage' : 'Garage'} action={isMe ? <Link to="/garage" className="link">Öffnen</Link> : undefined} />
      <div className="garage-preview" onClick={() => isMe && navigate('/garage')}>
        <GarageScene config={garage} slots={Math.max(1, garage.slotModelIds.length)} spots={state.spots} userId={userId} />
      </div>

      {isMe ? (
        <div className="segmented mt">
          <button className={tab === 'spots' ? 'on' : ''} onClick={() => setTab('spots')}>
            <Icon name="grid" size={15} /> Meine Spots
          </button>
          <button className={tab === 'saved' ? 'on' : ''} onClick={() => setTab('saved')}>
            <Icon name="bookmark" size={15} /> Gespeichert
          </button>
        </div>
      ) : (
        <SectionHeader title="Spots" />
      )}
      <SpotGrid spots={tab === 'saved' && isMe ? savedSpots : visibleSpots} showPrivate={isMe} />

      {isMe && (
        <Sheet open={settings} onClose={() => setSettings(false)} title="Profil & Einstellungen">
          <div className="avatar-edit">
            <Avatar user={me} size={64} />
            <label className="btn btn--outline btn--sm">
              <Icon name="camera" size={16} /> Profilbild ändern
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  // TODO(backend): in Storage hochladen und URL am Nutzer speichern
                  updateProfile({ avatarUrl: await downscaleImage(f, 320, 0.85) });
                }}
              />
            </label>
            {me.avatarUrl && (
              <button className="btn btn--ghost btn--sm" onClick={() => updateProfile({ avatarUrl: undefined })}>
                Entfernen
              </button>
            )}
          </div>
          <label className="field">
            <span>Username</span>
            <input value={draftName} onChange={(e) => setDraftName(e.target.value.replace(/\s/g, '').slice(0, 24))} />
          </label>
          <label className="field">
            <span>Bio</span>
            <textarea rows={2} value={draftBio} onChange={(e) => setDraftBio(e.target.value.slice(0, 140))} />
          </label>
          <button
            className="btn btn--primary btn--block"
            disabled={!draftName}
            onClick={() => {
              updateProfile({ username: draftName, bio: draftBio });
              setSettings(false);
            }}
          >
            Speichern
          </button>

          <label className="field mt">
            <span>Titel (aus Challenges)</span>
            <select id="set-title" value={state.activeTitle ?? ''} onChange={(e) => setActiveTitle(e.target.value || undefined)} disabled={!state.unlocks.titles.length}>
              <option value="">{state.unlocks.titles.length ? 'Kein Titel' : 'Noch keine Titel freigeschaltet'}</option>
              {state.unlocks.titles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn--outline btn--block mt-s" onClick={() => { setSettings(false); navigate('/cards/editor'); }}>
            🎨 Custom Spot Cards gestalten <ProBadge small />
          </button>

          <MapsKeyField />

          {billingMode === 'demo' && (
            <div className="setting-row mt">
              <div>
                <b>SpotDrive Pro (Demo)</b>
                <div className="muted small">Schaltet Pro-Funktionen zum Testen frei – keine Zahlung.</div>
              </div>
              <Toggle checked={me.isPro} onChange={(v) => setPro(v, { demo: true })} label="Pro Demo" />
            </div>
          )}
          <button className="btn btn--outline btn--block mt-s" onClick={() => { setSettings(false); navigate('/pro'); }}>
            <Icon name="crown" size={16} /> Pro-Vorteile ansehen
          </button>
          <button className="btn btn--ghost btn--block mt-s" onClick={() => { resetDemo(); setSettings(false); }}>
            <Icon name="refresh" size={16} /> Demo-Daten zurücksetzen
          </button>
          <p className="muted small mt-s">
            {/* TODO(auth): Login/Logout, Konto löschen (DSGVO), Datenexport */}
            Anmeldung & Konto folgen mit der Backend-Anbindung.
          </p>
          <details className="credits-list mt">
            <summary>Bildnachweise (Wikimedia Commons)</summary>
            <ul>
              {ALL_CATALOG_PHOTOS().map((p) => (
                <li key={p.modelId}>
                  <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                    {fullName(getModel(p.modelId))}
                  </a>{' '}
                  – {p.author}, {p.license}
                </li>
              ))}
              {Object.entries(DEMO_VIDEOS).map(([k, v]) => (
                <li key={k}>
                  <a href={v.sourceUrl} target="_blank" rel="noreferrer">
                    Video {k.toUpperCase()}
                  </a>{' '}
                  – {v.author}, {v.license}
                </li>
              ))}
              <li>Karte: © OpenStreetMap-Mitwirkende, CARTO, Esri · Natural Earth (gemeinfrei)</li>
            </ul>
          </details>
        </Sheet>
      )}
    </div>
  );
}

/** ❤️ Meine Dream Cars – Kurzübersicht im Profil */
function DreamCarsSection() {
  const { state, me } = useApp();
  const navigate = useNavigate();
  const rows = state.dreamCars.map((d) => ({ d, st: dreamStatus(d, state.spots, me.id) }));
  const spotted = rows.filter((r) => r.st.spotted).length;
  const unread = me.isPro ? state.dreamAlerts.filter((a) => !a.read).length : 0;
  return (
    <>
      <SectionHeader title="❤️ Meine Dream Cars" action={<Link to="/dream" className="link">Alle</Link>} />
      <button className="dream-profile" onClick={() => navigate('/dream')}>
        <div className="dream-profile__stats">
          <span>❤️ <b>{rows.length}</b> Dream Cars</span>
          <span>✅ <b>{spotted}</b> gespottet</span>
          <span>🔒 <b>{rows.length - spotted}</b> offen</span>
        </div>
        <div className="dream-profile__list">
          {rows
            .sort((a, b) => Number(a.st.spotted) - Number(b.st.spotted))
            .slice(0, 3)
            .map(({ d, st }) => (
              <div key={d.id} className="dream-profile__row">
                <span>❤️ {fullName(getModel(d.modelId))}</span>
                <span className={`dream-status ${st.spotted ? 'dream-status--done' : ''}`}>{st.spotted ? '✅ Gespottet' : '🔒 Offen'}</span>
              </div>
            ))}
        </div>
        <div className="dream-profile__foot">
          <span>👑 Dream Car Alerts {!me.isPro && <ProBadge small />}</span>
          {unread > 0 ? <span className="chip chip--on">🔔 {unread} neu</span> : <Icon name="chevronRight" size={16} />}
        </div>
      </button>
    </>
  );
}
