import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppStore';
import { TopBar } from '../components/Layout';
import { CarCard } from '../components/CarCard';
import { CarPhoto } from '../components/CarPhoto';
import { SpotMedia } from '../components/SpotMedia';
import { Avatar, RarityTag } from '../components/ui';
import { Icon } from '../components/Icon';
import { profilePath } from '../components/SpotCard';
import { getBrand, getModel } from '../data/cars';
import { parseQuery, runQuery, SEARCH_EXAMPLES } from '../lib/smartSearch';

/** Smart Search: normale Sätze statt Filter-Menüs. */
export function SearchScreen() {
  const { state, me } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const query = params.get('q') ?? '';

  const result = useMemo(() => (query.trim() ? runQuery(parseQuery(query), state.spots, state.users, me.id) : null), [query, state.spots, state.users, me.id]);

  const ask = (q: string) => {
    setText(q);
    setParams(q ? { q } : {});
  };

  return (
    <div className="screen">
      <TopBar back title="Smart Search" />
      <form
        className="smart-search"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text.trim());
        }}
      >
        <Icon name="search" size={20} />
        <input id="smart-search-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Frag mich etwas über deine Autos…" autoFocus enterKeyHint="search" />
        {text && (
          <button type="button" className="icon-btn" onClick={() => ask('')} aria-label="Leeren">
            <Icon name="x" size={16} />
          </button>
        )}
      </form>

      {!result && (
        <>
          <p className="muted small">Du kannst ganz normal fragen, z. B.:</p>
          <div className="examples">
            {SEARCH_EXAMPLES.map((q) => (
              <button key={q} className="example" onClick={() => ask(q)}>
                <Icon name="sparkle" size={14} /> {q}
              </button>
            ))}
          </div>
        </>
      )}

      {result && (
        <div className="answer">
          <div className="answer__text">
            <Icon name="sparkle" size={18} /> {result.answer}
          </div>

          {result.kind === 'cards' && (
            <div className="card-grid">
              {result.cards.map((c) => (
                <CarCard key={c.model.id} card={c} onClick={() => c.lastSpot && navigate(`/spot/${c.lastSpot.id}`)} />
              ))}
            </div>
          )}

          {result.kind === 'spots' && (
            <div className="result-list">
              {result.spots.map((s) => {
                const m = getModel(s.modelId);
                return (
                  <Link key={s.id} to={`/spot/${s.id}`} className="result-row">
                    <div className="result-row__media">
                      <SpotMedia spot={s} showCredit={false} />
                    </div>
                    <div>
                      <b>
                        {getBrand(m.brandId).name} {m.name}
                      </b>
                      <div className="muted small">
                        {new Date(s.createdAt).toLocaleDateString('de-DE')} · {s.location.areaLabel} · +{s.xpAwarded} XP
                      </div>
                      <RarityTag rarity={m.rarity} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {result.kind === 'models' && (
            <div className="result-list">
              {result.models.slice(0, 80).map((m) => (
                <div key={m.id} className="result-row">
                  <div className="result-row__media">
                    <CarPhoto modelId={m.id} width={500} dim />
                  </div>
                  <div>
                    <div className="eyebrow">{getBrand(m.brandId).name}</div>
                    <b>{m.name}</b>
                    <div>
                      <RarityTag rarity={m.rarity} />
                    </div>
                  </div>
                </div>
              ))}
              {result.models.length > 80 && <p className="muted small">… und {result.models.length - 80} weitere</p>}
            </div>
          )}

          {result.kind === 'users' && (
            <div className="result-list">
              {result.users.map((u) => (
                <Link key={u.id} to={profilePath(u.id, me.id)} className="result-row">
                  <Avatar user={u} size={44} />
                  <div>
                    <b>@{u.username}</b>
                    <div className="muted small">{u.homeArea}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <p className="muted small mt">Die Suche versteht Marken, Seltenheiten (z. B. legendär, exotisch), Zeiträume (heute, diese Woche, diesen Monat) und Fragen wie „noch nicht gesammelt“ oder „wie viele“.</p>
        </div>
      )}
    </div>
  );
}
