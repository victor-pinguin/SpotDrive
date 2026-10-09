import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp, useUserStats } from '../state/AppStore';
import { SpotCard } from '../components/SpotCard';
import { ChallengeCard } from '../components/Progress';
import { dailyChallenges, progressOf, weeklyChallenges } from '../lib/challenges';
import { Avatar, EmptyState, ProBadge, SectionHeader } from '../components/ui';
import { Icon } from '../components/Icon';

type FeedTab = 'all' | 'following' | 'videos';

export function HomeScreen() {
  const { state, me } = useApp();
  const { level } = useUserStats(me.id);
  const [tab, setTab] = useState<FeedTab>('all');
  const navigate = useNavigate();

  // TODO(backend): GET /feed?cursor=… (paginiert, nur öffentliche Spots, Standort bereits vergröbert)
  const feed = useMemo(() => {
    let list = state.spots.filter((s) => s.isPublic);
    if (tab === 'following') list = list.filter((s) => me.followingIds.includes(s.userId) || s.userId === me.id);
    if (tab === 'videos') list = list.filter((s) => s.media.type === 'video');
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.spots, tab, me.followingIds, me.id]);

  const challenges = [...dailyChallenges(), ...weeklyChallenges()].map((a) => progressOf(a, state.spots, me.id, state.challengeCompletions)).filter((p) => !p.completed);

  const selectTab = (t: FeedTab) => (t === 'videos' && !me.isPro ? navigate('/pro') : setTab(t));

  return (
    <div className="screen">
      <header className="home-head">
        <div className="logo">
          <span className="logo__mark">
            <Icon name="bolt" size={16} fill strokeWidth={0} />
          </span>
          SPOT<b>DRIVE</b>
        </div>
        <Link to="/search" className="icon-btn home-head__search" aria-label="Smart Search">
          <Icon name="search" size={20} />
        </Link>
        <Link to="/profile" className="home-head__me">
          <div className="home-head__lv">
            <span>LV {level.level}</span>
            <div className="mini-bar">
              <div style={{ width: `${level.progress * 100}%` }} />
            </div>
          </div>
          <Avatar user={me} size={34} ring />
        </Link>
      </header>

      <SectionHeader title="Challenges" action={<Link to="/challenges" className="link">Alle</Link>} />
      <div className={`h-scroll ${me.isPro ? '' : 'h-scroll--locked'}`}>
        {challenges.slice(0, 4).map((c) => (
          <Link to="/challenges" key={c.active.key} className="h-scroll__item">
            <ChallengeCard p={c} compact />
          </Link>
        ))}
        {me.isPro && !challenges.length && <p className="muted">Alle Challenges erledigt – stark!</p>}
        {!me.isPro && (
          <Link to="/challenges" className="h-scroll__lock">
            <Icon name="lock" size={16} /> Challenges mit <ProBadge small /> freischalten
          </Link>
        )}
      </div>

      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => selectTab('all')}>
          Entdecken
        </button>
        <button role="tab" aria-selected={tab === 'following'} className={tab === 'following' ? 'on' : ''} onClick={() => selectTab('following')}>
          Folge ich
        </button>
        <button role="tab" aria-selected={tab === 'videos'} className={tab === 'videos' ? 'on' : ''} onClick={() => selectTab('videos')}>
          Videos {!me.isPro && <ProBadge small />}
        </button>
      </div>

      <div className="feed">
        {feed.map((s) => (
          <SpotCard key={s.id} spot={s} />
        ))}
        {!feed.length && <EmptyState icon="camera" title="Noch nichts hier" text="Folge mehr Spottern oder erstelle deinen ersten Spot." />}
      </div>
    </div>
  );
}
