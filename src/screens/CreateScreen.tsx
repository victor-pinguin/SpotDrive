import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CarModel, GeoPoint, LocationVisibility, MediaType } from '../types/models';
import { useApp } from '../state/AppStore';
import { TopBar } from '../components/Layout';
import { Icon } from '../components/Icon';
import { ProBadge, RarityTag, Sheet, Toggle } from '../components/ui';
import { ModelPicker } from '../components/ModelPicker';
import { LocationPicker } from '../components/MapViews';
import { CarPhoto } from '../components/CarPhoto';
import { getBrand, getModel, needsAiRarity } from '../data/cars';
import { collectedBrandIds, collectedModelIds } from '../lib/collection';
import { sumXp, xpForSpot } from '../lib/xp';
import { areaLabelFor, KNOWN_AREAS } from '../lib/location';
import { downscaleImage, getCurrentPosition, videoDuration } from '../services/device';
import { classifyRarity, detectPrivacyRegions, getRecognitionProvider, resolveRecognized, type PrivacyRegion, type RecognitionResult, type RecognizedCar } from '../services/carRecognition';
import { PRO_VIDEO_SECONDS } from '../data/proFeatures';
import { applyPrivacyBlur } from '../services/privacyBlur';
import { PrivacyEditor } from '../components/PrivacyEditor';

const summarize = (r: PrivacyRegion[]) => {
  const plates = r.filter((x) => x.type === 'plate').length;
  const faces = r.filter((x) => x.type === 'face').length;
  const manual = r.length - plates - faces;
  return [plates && `${plates} Kennzeichen`, faces && `${faces} ${faces > 1 ? 'Gesichter' : 'Gesicht'}`, manual && `${manual} Bereich${manual > 1 ? 'e' : ''}`].filter(Boolean).join(' · ');
};

/** Pro Sitzung jedes Modell nur einmal an die KI schicken. */
const AI_RARITY_TRIED = new Set<string>();

const VISIBILITY: { v: LocationVisibility; label: string; hint: string; icon: 'eye' | 'target' | 'eyeOff' }[] = [
  { v: 'area', label: 'Ungefähr', hint: 'Andere sehen nur einen ~2 km Bereich (empfohlen).', icon: 'target' },
  { v: 'exact', label: 'Genau', hint: 'Der exakte Punkt ist öffentlich sichtbar. Nur teilen, wenn es unbedenklich ist.', icon: 'eye' },
  { v: 'hidden', label: 'Verbergen', hint: 'Spot erscheint nicht auf der Karte, nur der Ortsname.', icon: 'eyeOff' },
];

export function CreateScreen() {
  const { state, me, createSpot, addCustomModel, setAiRarity, consumeRecognition, recognitionsLeft, showToast } = useApp();
  const navigate = useNavigate();

  const [mediaType, setMediaType] = useState<MediaType>('photo');
  const [mediaUrl, setMediaUrl] = useState<string>();
  // 🛡️ Privatsphäre (für alle): Original nur im Speicher, gespeichert wird die verpixelte Version
  const [rawUrl, setRawUrl] = useState<string>();
  const [regions, setRegions] = useState<PrivacyRegion[]>([]);
  const [privacy, setPrivacy] = useState<'idle' | 'checking' | 'done' | 'unavailable'>('idle');
  const [privacySource, setPrivacySource] = useState('');
  const [privacyEdit, setPrivacyEdit] = useState(false);
  const [mediaFile, setMediaFile] = useState<File>();
  const [mediaBusy, setMediaBusy] = useState(false);

  // ?model=<id> → Auto vorauswählen (z. B. aus Dream Cars oder einem Alert)
  const [params] = useSearchParams();
  const [model, setModel] = useState<CarModel | null>(() => {
    const id = params.get('model');
    return id ? getModel(id) : null;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recog, setRecog] = useState<RecognitionResult | null>(null);
  const [recogBusy, setRecogBusy] = useState(false);
  const [recogError, setRecogError] = useState<string | null>(null);

  const [variant, setVariant] = useState('');
  const [description, setDescription] = useState('');

  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [locSource, setLocSource] = useState<'gps' | 'manual'>('gps');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<LocationVisibility>('area');
  const [isPublic, setIsPublic] = useState(true);

  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const videoCaptureInput = useRef<HTMLInputElement>(null);

  const collected = useMemo(() => collectedModelIds(state.spots, me.id), [state.spots, me.id]);
  const brands = useMemo(() => collectedBrandIds(state.spots, me.id), [state.spots, me.id]);

  const xpPreview = model
    ? sumXp(xpForSpot({ model, mediaType, isNewModel: !collected.has(model.id), isNewBrand: !brands.has(model.brandId) }))
    : 0;

  // ─── Privatsphäre: Kennzeichen & Gesichter automatisch verpixeln ─────
  const runPrivacyCheck = async (file: File) => {
    setPrivacy('checking');
    setRegions([]);
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), 15000));
    const res = await Promise.race([detectPrivacyRegions(file).catch(() => null), timeout]);
    if (res) {
      setRegions(res.regions);
      setPrivacySource(res.source);
      setPrivacy('done');
    } else setPrivacy('unavailable');
  };
  // Verpixelte Version neu berechnen, sobald sich die Bereiche ändern
  useEffect(() => {
    if (!rawUrl || mediaType !== 'photo') return;
    let alive = true;
    applyPrivacyBlur(rawUrl, regions).then((u) => alive && setMediaUrl(u));
    return () => {
      alive = false;
    };
  }, [rawUrl, regions, mediaType]);

  // ─── Medien ──────────────────────────────────────────────────────────
  const onPhoto = async (file?: File) => {
    if (!file) return;
    setMediaBusy(true);
    try {
      // TODO(backend): Datei in Storage hochladen (Original für Pro-Cloud-Backup)
      const url = await downscaleImage(file);
      setMediaType('photo');
      setRawUrl(url);
      setMediaUrl(url);
      setMediaFile(file);
      void runPrivacyCheck(file);
      setRecog(null);
      // Vorausgewähltes Auto (z. B. Dream Car) behalten – sonst automatisch erkennen
      if (!params.get('model')) {
        setModel(null);
        void runRecognition(file);
      }
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setMediaBusy(false);
    }
  };

  const onVideo = async (file?: File) => {
    if (!file) return;
    if (!me.isPro) {
      navigate('/pro'); // Videos sind ein Pro-Feature
      return;
    }
    const limit = PRO_VIDEO_SECONDS;
    const dur = await videoDuration(file);
    if (dur > limit + 0.5) {
      showToast(`Video ist ${Math.round(dur)} s lang – max. ${limit} s`);
      return;
    }
    setMediaType('video');
    setRawUrl(undefined);
    setRegions([]);
    setPrivacy('idle');
    // TODO(backend): Videos serverseitig verpixeln (Kennzeichen/Gesichter je Frame), bevor sie öffentlich werden
    setMediaUrl(URL.createObjectURL(file)); // TODO(backend): Upload → dauerhafte URL
    setMediaFile(file);
    setRecog(null);
  };

  /** KI erkennt Marke & Modell – jedes Auto, nicht nur den Katalog. */
  const runRecognition = async (file = mediaFile) => {
    if (!file) return;
    if (!consumeRecognition()) {
      showToast('Tageslimit der Auto-Erkennung erreicht – mit Pro unbegrenzt');
      return;
    }
    setRecogBusy(true);
    setRecogError(null);
    try {
      const provider = await getRecognitionProvider();
      setRecog(await provider.recognize(file));
    } catch (e) {
      const code = (e as { code?: string }).code;
      setRecogError(code === 'not_granted' ? 'KI-Erkennung wurde nicht erlaubt. Wähle das Auto manuell.' : 'Erkennung fehlgeschlagen. Versuch es nochmal oder wähle das Auto manuell.');
    } finally {
      setRecogBusy(false);
    }
  };

  const takeRecognized = (car: RecognizedCar) => {
    const { model: m, variant: v } = resolveRecognized(car, addCustomModel, setAiRarity);
    setModel(m);
    if (v && !variant) setVariant(v);
  };

  // ─── Seltenheit: bestimmt IMMER die KI, nie der Nutzer ────────────────
  const [rarityBusy, setRarityBusy] = useState(false);
  useEffect(() => {
    if (!model || !needsAiRarity(model) || AI_RARITY_TRIED.has(model.id)) return;
    AI_RARITY_TRIED.add(model.id);
    let cancelled = false;
    setRarityBusy(true);
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), 12000));
    Promise.race([classifyRarity(getBrand(model.brandId).name, model.name), timeout])
      .then((r) => {
        if (!r) return; // keine KI erreichbar → vorläufige Schätzung bleibt
        const m = setAiRarity(model.id, r);
        if (!cancelled) setModel({ ...m });
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setRarityBusy(false));
    return () => {
      cancelled = true;
      setRarityBusy(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id]);

  // ─── Standort ────────────────────────────────────────────────────────
  const locateByGps = async () => {
    setGpsBusy(true);
    setGpsError(null);
    try {
      setPoint(await getCurrentPosition());
      setLocSource('gps');
    } catch (e) {
      setGpsError((e as Error).message);
      setPoint((p) => p ?? KNOWN_AREAS[0].p);
      setLocSource('manual');
    } finally {
      setGpsBusy(false);
    }
  };

  const pickManually = () => {
    setPoint((p) => p ?? KNOWN_AREAS[0].p);
    setLocSource('manual');
  };

  // ─── Absenden ────────────────────────────────────────────────────────
  const missing = !mediaUrl
    ? 'Foto oder Video hinzufügen'
    : privacy === 'checking'
      ? '🛡️ Privatsphäre wird geprüft…'
    : !model
      ? 'Auto auswählen'
      : rarityBusy
        ? '🤖 KI bestimmt Seltenheit…'
        : !point
          ? 'Standort festlegen'
          : null;

  const submit = (publish: boolean) => {
    if (missing || !model || !point) return;
    const spot = createSpot({
      modelId: model.id,
      variant: variant.trim(),
      description: description.trim(),
      mediaType,
      mediaUrl,
      point,
      areaLabel: areaLabelFor(point),
      locationSource: locSource,
      visibility,
      isPublic: publish,
    });
    navigate(`/spot/${spot.id}`, { replace: true });
  };

  const brand = model ? getBrand(model.brandId) : null;

  return (
    <div className="screen screen--form">
      <TopBar title="Neuer Spot" />

      {/* 1 · Medien */}
      <section className="form-block">
        <div className="form-label">
          <span className="step">1</span> Foto {me.isPro ? 'oder Video' : ''}
        </div>
        {mediaUrl ? (
          <div className="media-preview">
            {mediaType === 'photo' ? <img src={mediaUrl} alt="Vorschau" /> : <video src={mediaUrl} controls muted playsInline />}
            <button className="icon-btn icon-btn--float" onClick={() => { setMediaUrl(undefined); setRawUrl(undefined); setRegions([]); setPrivacy('idle'); setMediaFile(undefined); setRecog(null); }} aria-label="Medium entfernen">
              <Icon name="x" />
            </button>
            {mediaType === 'photo' && privacy !== 'idle' && (
              <div className={`privacy-bar privacy-bar--${privacy === 'unavailable' ? 'warn' : regions.length ? 'ok' : 'clean'}`}>
                <span>
                  {privacy === 'checking'
                    ? '🛡️ Suche Kennzeichen & Gesichter…'
                    : privacy === 'unavailable'
                      ? regions.length
                        ? `🛡️ ${regions.length} Bereich${regions.length > 1 ? 'e' : ''} verpixelt`
                        : '⚠️ Automatische Erkennung nicht verfügbar – bitte Kennzeichen & Gesichter markieren'
                      : regions.length
                        ? `🛡️ ${summarize(regions)} verpixelt`
                        : '🛡️ Keine Kennzeichen oder Gesichter gefunden'}
                  {privacy === 'done' && <small> · {privacySource}</small>}
                </span>
                {privacy !== 'checking' && (
                  <button className="chip chip--btn" onClick={() => setPrivacyEdit(true)}>
                    ✏️ Bearbeiten
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="media-actions">
            <button className="media-btn" onClick={() => cameraInput.current?.click()} disabled={mediaBusy}>
              <Icon name="camera" size={26} />
              <span>Foto aufnehmen</span>
            </button>
            <button className="media-btn" onClick={() => photoInput.current?.click()} disabled={mediaBusy}>
              <Icon name="image" size={26} />
              <span>Aus Galerie</span>
            </button>
            <button className="media-btn" onClick={() => (me.isPro ? videoInput.current?.click() : navigate('/pro'))}>
              <Icon name="video" size={26} />
              <span>Video wählen</span>
              {me.isPro ? <small>max. {PRO_VIDEO_SECONDS} s</small> : <ProBadge small />}
            </button>
            <button className="media-btn" onClick={() => (me.isPro ? videoCaptureInput.current?.click() : navigate('/pro'))}>
              <Icon name="video" size={26} />
              <span>Video aufnehmen</span>
              <ProBadge small />
            </button>
          </div>
        )}
        {/* versteckte Datei-Inputs. capture=environment öffnet auf Handys direkt die Rückkamera */}
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        <input ref={photoInput} type="file" accept="image/*" hidden data-testid="photo-input" onChange={(e) => onPhoto(e.target.files?.[0])} />
        <input ref={videoInput} type="file" accept="video/*" hidden onChange={(e) => onVideo(e.target.files?.[0])} />
        <input ref={videoCaptureInput} type="file" accept="video/*" capture="environment" hidden onChange={(e) => onVideo(e.target.files?.[0])} />
      </section>

      {/* 2 · Auto */}
      <section className="form-block">
        <div className="form-label">
          <span className="step">2</span> Welches Auto?
        </div>

        {mediaType === 'photo' && mediaFile && !model && (
          <div className="ai-box">
            <div className="ai-box__head">
              <Icon name="sparkle" size={18} />
              <b>Auto-Erkennung</b>
              {recog && <span className="chip chip--ghost">{recog.provider}</span>}
              <span className="spacer" />
              <span className="muted small">{recognitionsLeft === Infinity ? 'unbegrenzt' : `${recognitionsLeft} heute übrig`}</span>
            </div>
            {recogBusy ? (
              <div className="ai-note">
                <span className="spinner" /> Analysiere Foto… (die KI kennt jedes Auto, das dauert ein paar Sekunden)
              </div>
            ) : recog?.best && recog.isCar ? (
              <div className="ai-box__results">
                <div className="ai-best">
                  <div className="eyebrow">{recog.best.brand}</div>
                  <div className="ai-best__name">{recog.best.model}</div>
                  <div className="row gap-s">
                    {recog.best.rarity && (
                      <RarityTag rarity={recog.best.rarity} />
                    )}
                    {recog.best.variant && <span className="chip chip--ghost">{recog.best.variant}</span>}
                    <span className="muted small">{Math.round(recog.best.confidence * 100)} % sicher</span>
                  </div>
                  <button className="btn btn--primary btn--block" onClick={() => takeRecognized(recog.best!)}>
                    <Icon name="check" size={16} /> Stimmt – übernehmen
                  </button>
                </div>
                {recog.alternatives.map((c) => (
                  <button key={c.brand + c.model} className="ai-cand" onClick={() => takeRecognized(c)}>
                    <span>
                      {c.brand} <b>{c.model}</b>
                    </span>
                    <span className="ai-cand__conf">{Math.round(c.confidence * 100)}%</span>
                  </button>
                ))}
                {recog.isDemo && (
                  <p className="ai-note">Demo-Modus: Hier rät die App nur. Echte Erkennung läuft in der claude.ai-Vorschau automatisch oder lokal mit dem KI-Server (siehe README).</p>
                )}
              </div>
            ) : recog && !recog.isCar ? (
              <p className="warn small">Auf dem Foto wurde kein Auto erkannt. Wähle es manuell oder nimm ein anderes Foto.</p>
            ) : (
              <>
                {recogError && <p className="warn small">{recogError}</p>}
                <button className="btn btn--ghost btn--block" onClick={() => runRecognition()}>
                  <Icon name="sparkle" size={16} /> Marke & Modell erkennen
                </button>
              </>
            )}
          </div>
        )}

        {model && brand ? (
          <button className="selected-model" onClick={() => setPickerOpen(true)} style={{ ['--brand' as string]: brand.color }}>
            <div className="selected-model__art">
              <CarPhoto modelId={model.id} width={500} />
            </div>
            <div className="selected-model__info">
              <div className="eyebrow">{brand.name}</div>
              <div className="selected-model__name">{model.name}</div>
              <div className="row gap-s">
                {rarityBusy ? <span className="chip chip--ghost">🤖 KI bestimmt Seltenheit…</span> : <RarityTag rarity={model.rarity} />}
                {!collected.has(model.id) ? <span className="chip chip--new">Neu für dich</span> : <span className="chip chip--ghost">In Sammlung</span>}
              </div>
            </div>
            <Icon name="edit" size={18} />
          </button>
        ) : (
          <button className="btn btn--outline btn--block" onClick={() => setPickerOpen(true)}>
            <Icon name="grid" size={18} /> Marke & Modell auswählen
          </button>
        )}

        <div className="field-row">
          <label className="field">
            <span>Variante (optional)</span>
            <input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="z. B. Weissach-Paket, Cabrio" maxLength={60} />
          </label>
        </div>
        <label className="field">
          <span>Beschreibung</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Wo, wie, welcher Sound…" maxLength={500} />
        </label>
      </section>

      {/* 3 · Standort */}
      <section className="form-block">
        <div className="form-label">
          <span className="step">3</span> Standort
        </div>
        <div className="row gap-s">
          <button className={`btn btn--outline grow ${point && locSource === 'gps' ? 'is-active' : ''}`} onClick={locateByGps} disabled={gpsBusy}>
            {gpsBusy ? <span className="spinner" /> : <Icon name="gps" size={18} />} Mein Standort
          </button>
          <button className={`btn btn--outline grow ${point && locSource === 'manual' ? 'is-active' : ''}`} onClick={pickManually}>
            <Icon name="map" size={18} /> Auf Karte
          </button>
        </div>
        {gpsError && <p className="warn small">{gpsError}</p>}
        {point && (
          <>
            <div className="picker-map">
              <LocationPicker value={point} onChange={(p) => { setPoint(p); setLocSource('manual'); }} showArea={visibility === 'area'} />
              <div className="picker-map__hint">Tippe oder ziehe den Pin</div>
            </div>
            <div className="loc-label">
              <Icon name="pin" size={16} /> {areaLabelFor(point)}
              <span className="muted small"> · {locSource === 'gps' ? 'per GPS' : 'manuell'}</span>
            </div>
          </>
        )}

        <div className="privacy">
          <div className="privacy__title">
            <Icon name="lock" size={16} /> Wer sieht den Standort?
          </div>
          <div className="segmented segmented--3">
            {VISIBILITY.map((o) => (
              <button key={o.v} className={visibility === o.v ? 'on' : ''} onClick={() => setVisibility(o.v)}>
                <Icon name={o.icon} size={15} /> {o.label}
              </button>
            ))}
          </div>
          <p className={`small ${visibility === 'exact' ? 'warn' : 'muted'}`}>{VISIBILITY.find((o) => o.v === visibility)!.hint}</p>
        </div>

        <div className="setting-row">
          <div>
            <b>Öffentlich posten</b>
            <div className="muted small">Aus = nur in deiner Sammlung & Garage</div>
          </div>
          <Toggle checked={isPublic} onChange={setIsPublic} label="Öffentlich posten" />
        </div>
      </section>

      <div className="submit-bar">
        {model && (
          <div className="submit-bar__xp">
            <Icon name="bolt" size={16} fill strokeWidth={0} /> +{xpPreview} XP
          </div>
        )}
        <button className="btn btn--primary grow" disabled={!!missing} onClick={() => submit(isPublic)}>
          {missing ?? (isPublic ? 'Spot veröffentlichen' : 'Privat speichern')}
        </button>
      </div>

      <Sheet open={privacyEdit} onClose={() => setPrivacyEdit(false)} title="🛡️ Verpixeln">
        {privacyEdit && rawUrl && <PrivacyEditor src={rawUrl} regions={regions} onChange={setRegions} onDone={() => setPrivacyEdit(false)} />}
      </Sheet>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Auto auswählen">
        <ModelPicker
          collected={collected}
          onCreate={addCustomModel}
          onPick={(m) => {
            setModel(m);
            setPickerOpen(false);
          }}
        />
      </Sheet>
    </div>
  );
}
