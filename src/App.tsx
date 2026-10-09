import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider, useApp } from './state/AppStore';
import { detectBillingMode, fetchEntitlement } from './services/billing';
import { AppLayout } from './components/Layout';
import { HomeScreen } from './screens/HomeScreen';
import { MapScreen } from './screens/MapScreen';
import { CreateScreen } from './screens/CreateScreen';
import { GarageScreen } from './screens/GarageScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SpotDetailScreen } from './screens/SpotDetailScreen';
import { ChallengesScreen } from './screens/ChallengesScreen';
import { ProScreen } from './screens/ProScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SearchScreen } from './screens/SearchScreen';
import { CardEditorScreen } from './screens/CardEditorScreen';
import { DreamCarsScreen } from './screens/DreamCarsScreen';
import { CalendarScreen } from './screens/CalendarScreen';

/** Holt den Pro-Status vom Server (Stripe/RevenueCat) – nur wenn echte Bezahlung eingerichtet ist. */
function BillingSync() {
  const { setPro } = useApp();
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const mode = await detectBillingMode();
      if (mode !== 'stripe' && mode !== 'native') return;
      const e = await fetchEntitlement();
      if (alive && e) setPro(e.active, { silent: true });
    };
    void sync();
    const on = () => document.visibilityState === 'visible' && void sync();
    document.addEventListener('visibilitychange', on);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/**
 * HashRouter funktioniert ohne Server-Konfiguration – auch in Capacitor (file://)
 * und als statischer Build. Für eine Web-Version mit schönen URLs → BrowserRouter.
 */
export default function App() {
  return (
    <AppProvider>
      <BillingSync />
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomeScreen />} />
            <Route path="map" element={<MapScreen />} />
            <Route path="create" element={<CreateScreen />} />
            <Route path="garage" element={<GarageScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
            <Route path="user/:id" element={<ProfileScreen />} />
            <Route path="spot/:id" element={<SpotDetailScreen />} />
            <Route path="challenges" element={<ChallengesScreen />} />
            <Route path="pro" element={<ProScreen />} />
            <Route path="history" element={<HistoryScreen />} />
            <Route path="search" element={<SearchScreen />} />
            <Route path="cards/editor" element={<CardEditorScreen />} />
            <Route path="dream" element={<DreamCarsScreen />} />
            <Route path="calendar" element={<CalendarScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
