import type { ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { RewardOverlay } from './RewardOverlay';
import { DreamAlertBanner } from './DreamAlertBanner';
import { useApp } from '../state/AppStore';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/map', label: 'Karte', icon: 'map' },
  { to: '/challenges', label: 'Challenges', icon: 'trophy' },
  { to: '/create', label: 'Spot', icon: 'plus' },
  { to: '/garage', label: 'Garage', icon: 'garage' },
  { to: '/search', label: 'Suche', icon: 'search' },
  { to: '/profile', label: 'Profil', icon: 'user' },
];

export function AppLayout() {
  const { toast } = useApp();
  const { pathname } = useLocation();
  const fullBleed = pathname === '/map';
  return (
    <div className="app">
      <main className={`app__main ${fullBleed ? 'app__main--bleed' : ''}`}>
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Hauptnavigation">
        {TABS.map((t) =>
          t.to === '/create' ? (
            <NavLink key={t.to} to={t.to} className="tabbar__create" aria-label="Spot erstellen">
              <Icon name="plus" size={26} strokeWidth={2.4} />
            </NavLink>
          ) : (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className="tabbar__item">
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </NavLink>
          ),
        )}
      </nav>
      <DreamAlertBanner />
      <RewardOverlay />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/** Kopfzeile für Unterseiten (mit Zurück-Button) und Tab-Seiten. */
export function TopBar({ title, back = false, right, transparent = false }: { title?: ReactNode; back?: boolean; right?: ReactNode; transparent?: boolean }) {
  const navigate = useNavigate();
  return (
    <header className={`topbar ${transparent ? 'topbar--transparent' : ''}`}>
      <div className="topbar__left">
        {back && (
          <button className="icon-btn" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="Zurück">
            <Icon name="chevronLeft" />
          </button>
        )}
        {title && <div className="topbar__title">{title}</div>}
      </div>
      <div className="topbar__right">{right}</div>
    </header>
  );
}
