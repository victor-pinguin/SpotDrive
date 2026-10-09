import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { AlertArea, AlertFrequency, CarModel, DreamCar, GeoPoint, ID } from '../types/models';
import { useApp } from '../state/AppStore';
import { TopBar } from '../components/Layout';
import { CarPhoto } from '../components/CarPhoto';
import { ModelPicker } from '../components/ModelPicker';
import { AreaMap, DreamMap } from '../components/MapViews';
import { Icon } from '../components/Icon';
import { EmptyState, ProBadge, RarityTag, Sheet, Toggle, timeAgo } from '../components/ui';
import { fullName, getBrand, getModel } from '../data/cars';
import { RADIUS_STEPS, REGIONS } from '../data/dreamCars';
import { collectedModelIds } from '../lib/collection';
import { dreamStatus, FREQUENCY_LABEL, recentDreamSpots } from '../lib/dreamAlerts';
import { KNOWN_AREAS, searchCities } from '../lib/location';
import { downscaleImage, getCurrentPosition } from '../services/device';
import { push } from '../services/notifications';

type Tab = 'list' | 'alerts' | 'map' | 'settings';
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const areaText = (dc: DreamCar, areas: AlertArea[]) => {
  if (dc.areaId === 'all') return areas.length ? `Alle Gebiete (${areas.length})` : 'Kein Gebiet';
  const a = areas.find((x) => x.id === dc.areaId);
  return a ? `${a.label}, ${a.radiusKm} km` : 'Kein Gebiet';
};

/**
 * ❤️ DREAM CARS + 🔔 DREAM CAR ALERTS (SpotDrive Pro)
 *  - Wunschliste: für alle Nutzer (Dream-Car-Found-Bonus inklusive)
 *  - Alerts, Gebiete, Dream-Car-Map, Einstellungen: nur Pro (Free sieht eine Vorschau)
 */
export function DreamCarsScreen() {
  const { state, me, markDreamAlertsRead } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'list';
  const setTab = (t: Tab) => setParams(t === 'list' ? {} : { tab: t }, { replace: true });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ID | null>(null);

  const statuses = useMemo(() => new Map(state.dreamCars.map((d) => [d.id, dreamStatus(d, state.spots, me.id)])), [state.dreamCars, state.spots, me.id]);
  const spotted = [...statuses.values()].filter((s) => s.spotted).length;
  const total = state.dreamCars.length;
  const unread = state.dreamAlerts.filter((a) => !a.read).length;

  useEffect(() => {
    if (tab === 'alerts' && me.isPro) markDreamAlertsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, me.isPro, state.dreamAlerts.length]);

  // offene zuerst, dann gespottete
  const list = [...state.dreamCars].sort((a, b) => Number(statuses.get(a.id)?.spotted) - Number(statuses.get(b.id)?.spotted) || b.addedAt.localeCompare(a.addedAt));

  return (
    <div className="screen dream">
      <TopBar back title="❤️ Meine Dream Cars" />

      <div className="dream-pro">
        <span className="dream-pro__crown">👑</span>
        <div>
          <div className="dream-pro__kicker">SPOTDRIVE PRO</div>
          <b>Dream Car Alerts</b>
        </div>
        <span className="spacer" />
        {me.isPro ? (
          <span className={`chip ${state.dreamSettings.enabled ? 'chip--on' : 'chip--ghost'}`}>{state.dreamSettings.enabled ? '🔔 Aktiv' : '🔕 Pausiert'}</span>
        ) : (
          <Link to="/pro" className="chip chip--btn">
            Freischalten
          </Link>
        )}
      </div>

      {/* 📊 Fortschritt */}
      <div className="dream-stats">
        <div>
          <b>❤️ {total}</b>
          <span>Dream Cars</span>
        </div>
        <div>
          <b>✅ {spotted}</b>
          <span>Gespottet</span>
        </div>
        <div>
          <b>🔒 {total - spotted}</b>
          <span>Noch offen</span>
        </div>
      </div>
      <div className="bar bar--thin dream-stats__bar">
        <div style={{ width: `${total ? (spotted / total) * 100 : 0}%` }} />
      </div>

      <div className="segmented dream-tabs" role="tablist">
        {(
          [
            ['list', 'Liste'],
            ['alerts', `Alerts${unread && me.isPro ? ` (${unread})` : ''}`],
            ['map', 'Karte'],
            ['settings', 'Einstellungen'],
          ] as [Tab, string][]
        ).map(([v, label]) => (
          <button key={v} role="tab" aria-selected={tab === v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <>
          <button className="btn btn--primary btn--block" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} /> Dream Car hinzufügen
          </button>
          <div className="dream-list">
            {list.map((dc) => (
              <DreamRow key={dc.id} dc={dc} status={statuses.get(dc.id)!} onOpen={() => setEditing(dc.id)} />
            ))}
          </div>
          {!total && <EmptyState icon="star" title="Noch keine Dream Cars" text="Füge deine Traumautos hinzu – wir sagen dir, wenn eins in deiner Nähe gespottet wird." />}
        </>
      )}

      {tab !== 'list' && !me.isPro && <ProPreview tab={tab} />}
      {tab === 'alerts' && me.isPro && <AlertsTab />}
      {tab === 'map' && me.isPro && <MapTab />}
      {tab === 'settings' && me.isPro && <SettingsTab onEditCar={setEditing} />}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Dream Car hinzufügen">
        {adding && <AddDreamCar onDone={() => setAdding(false)} />}
      </Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Dream Car">
        {editing && <EditDreamCar id={editing} onClose={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

// ─── Liste ────────────────────────────────────────────────────────────────

function DreamRow({ dc, status, onOpen }: { dc: DreamCar; status: ReturnType<typeof dreamStatus>; onOpen: () => void }) {
  const { state, me, updateDreamCar, showToast } = useApp();
  const m = getModel(dc.modelId);
  const brand = getBrand(m.brandId);
  return (
    <div className={`dream-row ${status.spotted ? 'dream-row--done' : ''}`}>
      <button className="dream-row__main" onClick={onOpen}>
        <div className="dream-row__photo">{dc.photoUrl ? <img src={dc.photoUrl} alt="" /> : <CarPhoto modelId={m.id} width={500} />}</div>
        <div className="dream-row__info">
          <span className="eyebrow">{brand.name}</span>
          <b>❤️ {m.name}</b>
          {dc.variant && <span className="muted small">{dc.variant}</span>}
          <span className={`dream-status ${status.spotted ? 'dream-status--done' : ''}`}>{status.spotted ? '✅ Gespottet' : '🔒 Noch nicht gespottet'}</span>
          <span className="muted small">Hinzugefügt am {fmtDate(dc.addedAt)}</span>
        </div>
      </button>
      <div className="dream-row__alert">
        <span className="small">
          {me.isPro ? (dc.alertsOn ? `🔔 AN · 📍 ${areaText(dc, state.alertAreas)}` : '🔕 Alerts AUS') : '🔔 Alerts'}
        </span>
        {me.isPro ? (
          <Toggle
            checked={dc.alertsOn}
            label={`Alerts für ${m.name}`}
            onChange={(v) => {
              if (v && !state.alertAreas.length) showToast('Lege zuerst ein Alert-Gebiet an (Einstellungen)');
              updateDreamCar(dc.id, { alertsOn: v });
            }}
          />
        ) : (
          <ProBadge small />
        )}
      </div>
    </div>
  );
}

function AddDreamCar({ onDone }: { onDone: () => void }) {
  const { state, me, addDreamCar, addCustomModel, showToast } = useApp();
  const [model, setModel] = useState<CarModel | null>(null);
  const [variant, setVariant] = useState('');
  const collected = useMemo(() => collectedModelIds(state.spots, me.id), [state.spots, me.id]);
  const onList = model ? state.dreamCars.some((d) => d.modelId === model.id) : false;

  if (!model) {
    return (
      <>
        <p className="muted small">Suche z. B. „Ferrari 12Cilindri“, „Porsche GT3 RS“ oder „Bugatti Chiron“.</p>
        <ModelPicker collected={collected} onCreate={addCustomModel} onPick={setModel} />
      </>
    );
  }
  return (
    <div className="stack">
      <div className="dream-add__preview">
        <CarPhoto modelId={model.id} width={500} />
      </div>
      <div>
        <div className="eyebrow">{getBrand(model.brandId).name}</div>
        <h3>{model.name}</h3>
        <RarityTag rarity={model.rarity} />
      </div>
      <label className="field">
        <span>Variante (optional)</span>
        <input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="z. B. Weissach-Paket, Super Sport" maxLength={60} />
      </label>
      {onList && <div className="dream-dup">❤️ Schon auf deiner Dream-Car-Liste</div>}
      <button
        className="btn btn--primary btn--block btn--lg"
        disabled={onList}
        onClick={() => {
          if (addDreamCar({ modelId: model.id, variant })) {
            showToast(`❤️ ${fullName(model)} ist jetzt auf deiner Dream-Car-Liste`);
            onDone();
          }
        }}
      >
        ❤️ Zur Dream-Car-Liste hinzufügen
      </button>
      <button className="btn btn--ghost btn--block" onClick={() => setModel(null)}>
        Anderes Auto suchen
      </button>
    </div>
  );
}

function EditDreamCar({ id, onClose }: { id: ID; onClose: () => void }) {
  const { state, me, updateDreamCar, removeDreamCar, showToast } = useApp();
  const navigate = useNavigate();
  const file = useRef<HTMLInputElement>(null);
  const dc = state.dreamCars.find((d) => d.id === id);
  if (!dc) return null;
  const m = getModel(dc.modelId);
  const st = dreamStatus(dc, state.spots, me.id);
  const ownSpot = state.spots.some((s) => s.userId === me.id && s.modelId === dc.modelId);

  return (
    <div className="stack">
      <div className="dream-add__preview">
        {dc.photoUrl ? <img src={dc.photoUrl} alt="" /> : <CarPhoto modelId={m.id} width={500} />}
        <button className="chip chip--btn dream-add__photo-btn" onClick={() => file.current?.click()}>
          📷 {dc.photoUrl ? 'Foto ändern' : 'Eigenes Foto'}
        </button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) updateDreamCar(dc.id, { photoUrl: await downscaleImage(f, 800) });
          }}
        />
      </div>
      <div>
        <div className="eyebrow">{getBrand(m.brandId).name}</div>
        <h3>❤️ {m.name}</h3>
        <div className="row gap-s mt-s">
          <RarityTag rarity={m.rarity} />
          <span className={`dream-status ${st.spotted ? 'dream-status--done' : ''}`}>{st.spotted ? `✅ Gespottet${st.at ? ` am ${fmtDate(st.at)}` : ''}` : '🔒 Noch nicht gespottet'}</span>
        </div>
        <div className="muted small mt-s">Hinzugefügt am {fmtDate(dc.addedAt)}</div>
      </div>
      <label className="field">
        <span>Variante (optional)</span>
        <input value={dc.variant ?? ''} onChange={(e) => updateDreamCar(dc.id, { variant: e.target.value || undefined })} placeholder="z. B. Weissach-Paket" maxLength={60} />
      </label>

      <div className="dream-box">
        <div className="setting-row">
          <div>
            <b>🔔 Alerts für dieses Auto</b> {!me.isPro && <ProBadge small />}
            <div className="muted small">Benachrichtigung bei öffentlichen Spots in deinem Gebiet</div>
          </div>
          {me.isPro ? <Toggle checked={dc.alertsOn} onChange={(v) => updateDreamCar(dc.id, { alertsOn: v })} label="Alerts" /> : <Link className="chip chip--btn" to="/pro">Pro</Link>}
        </div>
        {me.isPro && (
          <div className="dream-area-pick">
            <span className="eyebrow">📍 Gebiet</span>
            <div className="chip-row">
              <button className={`chip chip--btn ${dc.areaId === 'all' ? 'chip--on' : ''}`} onClick={() => updateDreamCar(dc.id, { areaId: 'all' })}>
                Alle Gebiete
              </button>
              {state.alertAreas.map((a) => (
                <button key={a.id} className={`chip chip--btn ${dc.areaId === a.id ? 'chip--on' : ''}`} onClick={() => updateDreamCar(dc.id, { areaId: a.id })}>
                  {a.label} · {a.radiusKm} km
                </button>
              ))}
            </div>
            {!state.alertAreas.length && <span className="muted small">Noch kein Gebiet – unter „Einstellungen“ anlegen.</span>}
          </div>
        )}
      </div>

      <div className="row gap-s">
        {!st.spotted && (
          <button className="btn btn--primary grow" onClick={() => navigate(`/create?model=${encodeURIComponent(m.id)}`)}>
            📸 Jetzt spotten
          </button>
        )}
        {!ownSpot && (
          <button
            className="btn btn--outline grow"
            onClick={() => {
              updateDreamCar(dc.id, { markedSpottedAt: dc.markedSpottedAt ? undefined : new Date().toISOString() });
              showToast(dc.markedSpottedAt ? 'Markierung entfernt' : '✅ Als gespottet markiert');
            }}
          >
            {dc.markedSpottedAt ? 'Markierung entfernen' : '✅ Als gespottet markieren'}
          </button>
        )}
      </div>
      {!ownSpot && !st.spotted && <p className="muted small">Tipp: Wenn du das Auto selbst spottest, wird es automatisch als gespottet erkannt und du bekommst +500 XP.</p>}
      <button
        className="btn btn--ghost btn--block danger"
        onClick={() => {
          removeDreamCar(dc.id);
          showToast(`${m.name} entfernt`);
          onClose();
        }}
      >
        Von der Liste entfernen
      </button>
    </div>
  );
}

// ─── Alerts (Postfach) ────────────────────────────────────────────────────

function AlertsTab() {
  const { state } = useApp();
  const alerts = state.dreamAlerts;
  if (!alerts.length)
    return <EmptyState icon="bell" title="Noch keine Alerts" text="Sobald eines deiner Dream Cars in deinem Gebiet öffentlich gespottet wird, erscheint es hier. Im Testmodus (Einstellungen) kannst du einen Spot simulieren." />;
  return (
    <div className="dream-alerts">
      {alerts.map((a) => {
        const m = getModel(a.modelId);
        return (
          <Link key={a.id} to={`/spot/${a.spotIds[0]}`} className={`dream-alert ${a.read ? '' : 'dream-alert--new'}`}>
            <div className="dream-alert__photo">
              <CarPhoto modelId={m.id} width={500} />
            </div>
            <div className="dream-alert__body">
              <span className="dream-alert__kicker">🔔 DREAM CAR SPOTTED!</span>
              <b>{fullName(m)}</b>
              <span className="small">
                📍 {a.areaLabel} · 🕐 {timeAgo(a.spottedAt)}
              </span>
              <span className="muted small">
                {a.spotIds.length > 1 ? `🧩 ${a.spotIds.length} ähnliche Meldungen zusammengefasst · ` : ''}
                {a.notified ? 'Benachrichtigt' : '🔕 Nur im Postfach (Limit)'}
              </span>
            </div>
            <Icon name="chevronRight" size={18} />
          </Link>
        );
      })}
    </div>
  );
}

// ─── Dream-Car-Map ────────────────────────────────────────────────────────

function MapTab() {
  const { state, me } = useApp();
  const items = useMemo(() => recentDreamSpots(state.spots, state.dreamCars, state.alertAreas, me.id), [state.spots, state.dreamCars, state.alertAreas, me.id]);
  const [sel, setSel] = useState<string | undefined>();
  if (!state.alertAreas.length) return <EmptyState icon="map" title="Kein Alert-Gebiet" text="Lege unter „Einstellungen“ ein Gebiet an." />;
  return (
    <div className="stack">
      <div className="picker-map dream-map">
        <DreamMap
          areas={state.alertAreas}
          items={items.map((i) => ({ id: i.spot.id, point: i.point, radiusM: i.radiusM, color: getBrand(getModel(i.spot.modelId).brandId).color }))}
          selectedId={sel}
          onSelect={setSel}
        />
      </div>
      <p className="muted small">
        <Icon name="lock" size={12} /> Gezeigt werden nur öffentliche Spots der letzten 7 Tage und nur ihr ungefährer Bereich – nie private oder exakte Standorte.
      </p>
      <div className="dream-alerts">
        {items.map((i) => {
          const m = getModel(i.spot.modelId);
          return (
            <Link key={i.spot.id} to={`/spot/${i.spot.id}`} className={`dream-alert ${sel === i.spot.id ? 'dream-alert--new' : ''}`} onMouseEnter={() => setSel(i.spot.id)}>
              <div className="dream-alert__photo">
                <CarPhoto modelId={m.id} width={500} />
              </div>
              <div className="dream-alert__body">
                <b>❤️ {fullName(m)}</b>
                <span className="small">📍 {i.spot.location.areaLabel.replace(/^Nähe /, '')}</span>
                <span className="muted small">
                  🕐 {timeAgo(i.spot.createdAt)} · Gebiet {i.area.label}
                  {!i.dream.alertsOn ? ' · 🔕 Alerts aus' : ''}
                </span>
              </div>
              <Icon name="chevronRight" size={18} />
            </Link>
          );
        })}
        {!items.length && <EmptyState icon="map" title="Keine passenden Spots" text="In deinen Gebieten wurde in den letzten 7 Tagen keines deiner Dream Cars gespottet." />}
      </div>
    </div>
  );
}

// ─── Einstellungen ────────────────────────────────────────────────────────

function SettingsTab({ onEditCar }: { onEditCar: (id: ID) => void }) {
  const { state, updateDreamSettings, updateDreamCar, removeAlertArea, simulateDreamSpot, showToast } = useApp();
  const st = state.dreamSettings;
  const [areaEdit, setAreaEdit] = useState<AlertArea | 'new' | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const togglePush = async (v: boolean) => {
    if (v && push.isSupported() && push.permission() !== 'granted') {
      const ok = await push.requestPermission();
      if (!ok) showToast('Push-Berechtigung nicht erteilt – In-App-Benachrichtigungen bleiben aktiv');
    }
    if (v && !push.isSupported()) showToast('Push wird in der nativen App aktiviert – hier gibt es In-App-Benachrichtigungen');
    updateDreamSettings({ push: v });
  };

  const sim = (mode: 'match' | 'duplicate' | 'hidden') => {
    const r = simulateDreamSpot(mode);
    setLastResult(r);
  };

  return (
    <div className="stack">
      <div className="dream-box">
        <div className="setting-row">
          <div>
            <b>Dream Car Alerts</b>
            <div className="muted small">Alle Alerts jederzeit pausieren</div>
          </div>
          <Toggle checked={st.enabled} onChange={(v) => updateDreamSettings({ enabled: v })} label="Alerts aktiv" />
        </div>
        <div className="setting-row">
          <div>
            <b>📲 Push-Benachrichtigungen</b>
            <div className="muted small">Auch wenn die App geschlossen ist</div>
          </div>
          <Toggle checked={st.push} onChange={togglePush} label="Push" />
        </div>
        <div className="setting-row">
          <div>
            <b>🔔 In der App</b>
            <div className="muted small">Banner „DREAM CAR SPOTTED!“</div>
          </div>
          <Toggle checked={st.inApp} onChange={(v) => updateDreamSettings({ inApp: v })} label="In-App" />
        </div>
        <div className="field">
          <span>Häufigkeit</span>
          <div className="dream-freq">
            {(Object.keys(FREQUENCY_LABEL) as AlertFrequency[]).map((f) => (
              <button key={f} className={`chip chip--btn ${st.frequency === f ? 'chip--on' : ''}`} onClick={() => updateDreamSettings({ frequency: f })}>
                {FREQUENCY_LABEL[f]}
              </button>
            ))}
          </div>
          <span className="muted small">Ähnliche Meldungen (gleiches Auto, gleicher Ort, ≤ 2 Std.) werden immer zusammengefasst.</span>
        </div>
      </div>

      <h3 className="dream-h">📍 Gebiete</h3>
      <div className="dream-areas">
        {state.alertAreas.map((a) => (
          <div key={a.id} className="dream-area">
            <div>
              <b>📍 {a.label}</b>
              <div className="muted small">
                Radius {a.radiusKm} km · {a.source === 'current' ? 'Aktueller Bereich' : a.source === 'city' ? 'Stadt' : a.source === 'region' ? 'Region' : 'Auf der Karte'}
              </div>
            </div>
            <button className="chip chip--btn" onClick={() => setAreaEdit(a)}>
              Bearbeiten
            </button>
            <button className="icon-btn" aria-label={`${a.label} löschen`} onClick={() => removeAlertArea(a.id)}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
        <button className="btn btn--outline btn--block" onClick={() => setAreaEdit('new')}>
          <Icon name="plus" size={16} /> Gebiet hinzufügen
        </button>
      </div>

      <h3 className="dream-h">🎯 Einzelne Dream Cars</h3>
      <div className="dream-box">
        {state.dreamCars.map((dc) => {
          const m = getModel(dc.modelId);
          return (
            <div key={dc.id} className="setting-row">
              <button className="dream-car-set" onClick={() => onEditCar(dc.id)}>
                <b>{fullName(m)}</b>
                <span className="muted small">{dc.alertsOn ? `🔔 AN · 📍 ${areaText(dc, state.alertAreas)}` : '🔕 AUS'}</span>
              </button>
              <Toggle checked={dc.alertsOn} onChange={(v) => updateDreamCar(dc.id, { alertsOn: v })} label={`Alerts ${m.name}`} />
            </div>
          );
        })}
      </div>

      <h3 className="dream-h">🧪 Testmodus</h3>
      <div className="dream-box dream-test">
        <p className="muted small">Solange es noch kein Backend gibt, simulierst du hier Spots anderer Nutzer. Sie laufen durch denselben Abgleich wie später auf dem Server.</p>
        <button className="btn btn--primary btn--block" onClick={() => sim('match')}>
          🔔 Test-Spot in meinem Gebiet
        </button>
        <div className="row gap-s">
          <button className="btn btn--outline grow" onClick={() => sim('duplicate')}>
            🧩 Doppelte Meldung
          </button>
          <button className="btn btn--outline grow" onClick={() => sim('hidden')}>
            🙈 Verborgener Ort
          </button>
        </div>
        {lastResult && <div className="dream-test__result">{lastResult}</div>}
      </div>

      <p className="muted small">
        <Icon name="lock" size={12} /> Nur öffentliche Spots lösen Alerts aus. Du siehst immer nur den ungefähren Bereich – nie den exakten oder privaten Standort anderer Nutzer.
      </p>

      <Sheet open={!!areaEdit} onClose={() => setAreaEdit(null)} title={areaEdit === 'new' ? 'Gebiet hinzufügen' : 'Gebiet bearbeiten'}>
        {areaEdit && <AreaEditor initial={areaEdit === 'new' ? undefined : areaEdit} onDone={() => setAreaEdit(null)} />}
      </Sheet>
    </div>
  );
}

function AreaEditor({ initial, onDone }: { initial?: AlertArea; onDone: () => void }) {
  const { saveAlertArea, showToast } = useApp();
  const [source, setSource] = useState<AlertArea['source']>(initial?.source ?? 'city');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [center, setCenter] = useState<GeoPoint>(initial?.center ?? KNOWN_AREAS[0].p);
  const [radius, setRadius] = useState(initial?.radiusKm ?? 10);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const results = useMemo(() => searchCities(q), [q]);

  const locate = async () => {
    setBusy(true);
    try {
      const p = await getCurrentPosition();
      setCenter(p);
      setLabel((l) => l || 'Mein Bereich');
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="segmented segmented--tight">
        {(
          [
            ['current', '📍 Aktuell'],
            ['city', '🏙️ Stadt'],
            ['region', '🗺️ Region'],
            ['map', '📌 Karte'],
          ] as [AlertArea['source'], string][]
        ).map(([v, l]) => (
          <button key={v} className={source === v ? 'on' : ''} onClick={() => setSource(v)}>
            {l}
          </button>
        ))}
      </div>

      {source === 'current' && (
        <button className="btn btn--outline btn--block" onClick={locate} disabled={busy}>
          {busy ? 'Standort wird ermittelt…' : '📍 Aktuellen Bereich verwenden'}
        </button>
      )}
      {source === 'city' && (
        <div className="field">
          <span>Stadt suchen</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="z. B. Zürich, München, Dubai" autoFocus />
          {results.length > 0 && (
            <div className="dream-results">
              {results.map((r) => (
                <button
                  key={r.name}
                  onClick={() => {
                    setCenter(r.p);
                    setLabel(r.name);
                    setQ('');
                  }}
                >
                  📍 {r.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {source === 'region' && (
        <div className="chip-row chip-row--wrap">
          {REGIONS.map((r) => (
            <button
              key={r.name}
              className={`chip chip--btn ${label === r.name ? 'chip--on' : ''}`}
              onClick={() => {
                setCenter(r.center);
                setLabel(r.name);
                setRadius(r.radiusKm);
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
      {source === 'map' && <p className="muted small">Tippe auf die Karte, um den Mittelpunkt zu setzen.</p>}

      <div className="picker-map dream-area-map">
        <AreaMap
          center={center}
          radiusKm={radius}
          onPick={(p) => {
            setCenter(p);
            setSource('map');
          }}
        />
      </div>

      <div className="field">
        <span>Radius: {radius} km</span>
        <input type="range" min={1} max={200} value={radius} onChange={(e) => setRadius(+e.target.value)} />
        <div className="chip-row">
          {RADIUS_STEPS.map((r) => (
            <button key={r} className={`chip chip--btn ${radius === r ? 'chip--on' : ''}`} onClick={() => setRadius(r)}>
              {r} km
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Name</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Zürich" maxLength={40} />
      </label>
      <button
        className="btn btn--primary btn--block btn--lg"
        disabled={!label.trim()}
        onClick={() => {
          saveAlertArea({ id: initial?.id ?? `area-${Date.now().toString(36)}`, label: label.trim(), center, radiusKm: radius, source });
          showToast(`📍 ${label.trim()} · ${radius} km gespeichert`);
          onDone();
        }}
      >
        Gebiet speichern
      </button>
    </div>
  );
}

// ─── Vorschau für Free-Nutzer ─────────────────────────────────────────────

function ProPreview({ tab }: { tab: Tab }) {
  const navigate = useNavigate();
  const demo = [
    { m: 'porsche-911-gt3-rs', area: 'Zürich', t: 'vor 8 Min.' },
    { m: 'bugatti-chiron', area: 'München', t: 'vor 2 Std.' },
    { m: 'ferrari-12cilindri', area: 'Monaco', t: 'gestern' },
  ];
  return (
    <div className="ch-paywall">
      <div className="ch-paywall__preview" aria-hidden="true">
        <div className="dream-alerts">
          {demo.map((d) => (
            <div key={d.m} className="dream-alert dream-alert--new">
              <div className="dream-alert__photo">
                <CarPhoto modelId={d.m} width={500} />
              </div>
              <div className="dream-alert__body">
                <span className="dream-alert__kicker">🔔 DREAM CAR SPOTTED!</span>
                <b>{fullName(getModel(d.m))}</b>
                <span className="small">
                  📍 {d.area} · 🕐 {d.t}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="ch-paywall__cta">
        <div className="ch-paywall__icon">🔔</div>
        <div className="dream-pro__kicker">👑 SPOTDRIVE PRO</div>
        <h2>Dream Car Alerts</h2>
        <p className="muted">
          {tab === 'map'
            ? 'Sieh auf der Karte, wo deine Dream Cars zuletzt in deinen Gebieten gespottet wurden.'
            : tab === 'settings'
              ? 'Wähle Gebiete (Stadt, Region, Radius), Push- und In-App-Benachrichtigungen und die Häufigkeit.'
              : 'Werde benachrichtigt, sobald eines deiner Dream Cars in deinem Gebiet öffentlich gespottet wird.'}
        </p>
        <button className="btn btn--primary btn--block btn--lg" onClick={() => navigate('/pro')}>
          <Icon name="crown" size={18} fill strokeWidth={0} /> SpotDrive Pro freischalten
        </button>
        <span className="muted small">Deine Dream-Car-Liste kannst du auch ohne Pro führen.</span>
      </div>
    </div>
  );
}
