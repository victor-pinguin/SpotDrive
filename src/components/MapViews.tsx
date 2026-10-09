import { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint, PublicLocation, Spot } from '../types/models';
import { getBrand, getModel } from '../data/cars';
import { AREA_RADIUS_M, snapToGrid } from '../lib/location';
import { rarityRank } from '../lib/rarity';
import { Icon } from './Icon';
import { useGoogleMaps } from '../services/googleMaps';
import { GoogleMapView, type GCircle, type GMarker } from './GoogleMapView';

/**
 * ECHTE WELTKARTE
 * ───────────────
 * Zwei Ebenen übereinander:
 *  1. Vektor-Weltkarte (Natural Earth, gemeinfrei) – Länder, Küsten, Seen, Flüsse,
 *     Autobahnen (Europa/Nordamerika) und Städtenamen. Liegt im App-Bundle →
 *     funktioniert auch offline bzw. wenn Kartenkacheln blockiert sind.
 *  2. Kartenkacheln (Straßenkarte, Dunkel oder Satellit) mit allen Straßen bis
 *     Hausnummern-Ebene – brauchen Internet.
 * Für die native App funktioniert das 1:1 in der WebView. Alternativ später
 * Mapbox GL / Google Maps SDK – dann nur diese Datei austauschen.
 */

export type MapStyle = 'dark' | 'streets' | 'satellite';

const STYLES: Record<MapStyle, { label: string; url: string; attribution: string; maxZoom: number }> = {
  dark: {
    label: 'Dunkel',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap-Mitwirkende &copy; CARTO',
    maxZoom: 19,
  },
  streets: {
    label: 'Straße',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap-Mitwirkende',
    maxZoom: 19,
  },
  satellite: {
    label: 'Satellit',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Bilder &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
};

const STYLE_KEY = 'spotdrive:mapStyle';
function loadStyle(): MapStyle {
  try {
    const v = localStorage.getItem(STYLE_KEY);
    if (v === 'dark' || v === 'streets' || v === 'satellite') return v;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function useMapStyle() {
  const [style, setStyle] = useState<MapStyle>(loadStyle);
  const update = (s: MapStyle) => {
    setStyle(s);
    try {
      localStorage.setItem(STYLE_KEY, s);
    } catch {
      /* ignore */
    }
  };
  return [style, update] as const;
}

export function MapStyleSwitch({ value, onChange }: { value: MapStyle; onChange: (s: MapStyle) => void }) {
  return (
    <div className="map-style" role="radiogroup" aria-label="Kartenstil">
      {(Object.keys(STYLES) as MapStyle[]).map((k) => (
        <button key={k} role="radio" aria-checked={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          {STYLES[k].label}
        </button>
      ))}
    </div>
  );
}

// ─── Vektor-Weltkarte (Natural Earth) ─────────────────────────────────────

interface WorldData {
  countries: number[][][][]; // [polygon][ring][point][lng,lat]
  lakes: number[][][][];
  rivers: number[][][];
  roads: [number[][], 1 | 2][];
  places: [name: string, lat: number, lng: number, rank: number, pop: number][];
}

let worldPromise: Promise<WorldData> | null = null;
const loadWorld = () => (worldPromise ??= import('../assets/world.json').then((m) => m.default as unknown as WorldData));

const ll = (ring: number[][]) => ring.map(([x, y]) => [y, x] as [number, number]);

function WorldBase({ style }: { style: MapStyle }) {
  const map = useMap();
  useEffect(() => {
    let cancelled = false;
    // Eigene Panes UNTER den Kartenkacheln (tilePane = 200): sobald Kacheln laden, decken sie die Vektorkarte ab.
    if (!map.getPane('worldBase')) map.createPane('worldBase').style.zIndex = '150';
    if (!map.getPane('worldLabels')) map.createPane('worldLabels').style.zIndex = '190';
    const renderer = L.canvas({ padding: 0.5, pane: 'worldBase' });
    const group = L.layerGroup().addTo(map);
    const roadsLayer = L.layerGroup();
    const labels = L.layerGroup().addTo(map);
    let data: WorldData | null = null;
    const light = style === 'streets';
    const land = light ? '#e9e5dc' : '#1b1e23';
    const border = light ? '#b9b2a4' : '#343a43';
    const water = light ? '#aad3df' : '#0f1b26';

    const updateLabels = () => {
      if (!data) return;
      labels.clearLayers();
      const z = map.getZoom();
      if (z <= 2) {
        if (map.hasLayer(roadsLayer)) map.removeLayer(roadsLayer);
        return; // Weltansicht: keine Beschriftung, sonst zu voll
      }
      const maxRank = z <= 3 ? 1 : z <= 4 ? 2 : z <= 5 ? 4 : z <= 6 ? 6 : z <= 8 ? 8 : 10;
      const b = map.getBounds().pad(0.1);
      let n = 0;
      for (const [name, lat, lng, rank] of data.places) {
        if (rank > maxRank || !b.contains([lat, lng])) continue;
        if (++n > 160) break;
        labels.addLayer(
          L.marker([lat, lng], {
            pane: 'worldLabels',
            interactive: false,
            keyboard: false,
            icon: L.divIcon({ className: `map-label ${light ? 'map-label--light' : ''} ${rank <= 2 ? 'map-label--big' : ''}`, html: `<span>${name}</span>`, iconSize: [0, 0] }),
          }),
        );
      }
      if (z >= 5 && !map.hasLayer(roadsLayer)) roadsLayer.addTo(map);
      if (z < 5 && map.hasLayer(roadsLayer)) map.removeLayer(roadsLayer);
    };

    loadWorld().then((d) => {
      if (cancelled) return;
      data = d;
      d.countries.forEach((poly) =>
        group.addLayer(L.polygon(poly.map(ll), { renderer, color: border, weight: 0.8, fillColor: land, fillOpacity: 1, interactive: false })),
      );
      d.lakes.forEach((poly) => group.addLayer(L.polygon(poly.map(ll), { renderer, stroke: false, fillColor: water, fillOpacity: 1, interactive: false })));
      d.rivers.forEach((line) => group.addLayer(L.polyline(ll(line), { renderer, color: water, weight: 1, interactive: false })));
      d.roads.forEach(([line, kind]) =>
        roadsLayer.addLayer(
          L.polyline(ll(line), { renderer, color: light ? '#f7b267' : kind === 1 ? '#4a4034' : '#3a3530', weight: kind === 1 ? 1.6 : 1, interactive: false }),
        ),
      );
      updateLabels();
    });

    map.on('zoomend moveend', updateLabels);
    return () => {
      cancelled = true;
      map.off('zoomend moveend', updateLabels);
      group.remove();
      roadsLayer.remove();
      labels.remove();
    };
  }, [map, style]);
  return null;
}

// ─── Gemeinsame Bausteine ─────────────────────────────────────────────────

function pinIcon(color: string, rare: boolean, selected: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin ${rare ? 'map-pin--rare' : ''} ${selected ? 'map-pin--sel' : ''}" style="--c:${color}"><span></span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function Recenter({ center, zoom }: { center: GeoPoint; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], zoom ?? map.getZoom(), { duration: 0.8 });
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

function BaseLayers({ style }: { style: MapStyle }) {
  const s = STYLES[style];
  return (
    <>
      <WorldBase style={style} />
      {/* key erzwingt einen frischen Layer beim Stilwechsel */}
      <TileLayer key={style} url={s.url} attribution={`${s.attribution} · Natural Earth`} maxZoom={s.maxZoom} />
    </>
  );
}

const mapProps = {
  zoomControl: false,
  worldCopyJump: true,
  minZoom: 1,
  maxBounds: [
    [-85, -400],
    [85, 400],
  ] as L.LatLngBoundsExpression,
};

export interface MapSpot {
  spot: Spot;
  loc: PublicLocation;
}

function LeafletSpotMap({
  items,
  center,
  zoom = 5,
  selectedId,
  style,
  onSelect,
}: {
  items: MapSpot[];
  center: GeoPoint;
  zoom?: number;
  selectedId?: string;
  style: MapStyle;
  onSelect: (spot: Spot) => void;
}) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} className={`leaflet-host leaflet-host--${style}`} {...mapProps}>
      <BaseLayers style={style} />
      <Recenter center={center} zoom={zoom} />
      <ZoomButtons />
      {items.map(({ spot, loc }) => {
        if (!loc.point) return null;
        const model = getModel(spot.modelId);
        const color = getBrand(model.brandId).color;
        const rare = rarityRank(model.rarity) >= rarityRank('epic');
        return <SpotMarker key={spot.id} loc={loc} color={color} rare={rare} selected={selectedId === spot.id} onClick={() => onSelect(spot)} />;
      })}
    </MapContainer>
  );
}

function ZoomButtons() {
  const map = useMap();
  return (
    <div className="map-zoom">
      <button onClick={() => map.zoomIn()} aria-label="Hineinzoomen">
        <Icon name="plus" size={18} />
      </button>
      <button onClick={() => map.zoomOut()} aria-label="Herauszoomen">
        <span className="map-zoom__minus" />
      </button>
    </div>
  );
}

function SpotMarker({ loc, color, rare, selected, onClick }: { loc: PublicLocation; color: string; rare: boolean; selected: boolean; onClick: () => void }) {
  const icon = useMemo(() => pinIcon(color, rare, selected), [color, rare, selected]);
  const p: [number, number] = [loc.point!.lat, loc.point!.lng];
  return (
    <>
      {loc.radiusM > 0 && (
        <Circle center={p} radius={loc.radiusM} pathOptions={{ color, weight: 1, opacity: 0.7, fillOpacity: 0.1, dashArray: '4 4' }} eventHandlers={{ click: onClick }} />
      )}
      <Marker position={p} icon={icon} eventHandlers={{ click: onClick }} />
    </>
  );
}

function ClickToPick({ onPick }: { onPick: (p: GeoPoint) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Standort manuell wählen – zeigt zusätzlich, was andere später sehen. */
function LeafletLocationPicker({ value, onChange, showArea }: { value: GeoPoint; onChange: (p: GeoPoint) => void; showArea: boolean }) {
  const icon = useMemo(() => pinIcon('#ff5a1f', false, true), []);
  const [style, setStyle] = useMapStyle();
  const area = snapToGrid(value);
  return (
    <>
      <MapContainer center={[value.lat, value.lng]} zoom={13} className={`leaflet-host leaflet-host--picker leaflet-host--${style}`} {...mapProps}>
        <BaseLayers style={style} />
        <Recenter center={value} />
        <ZoomButtons />
        <ClickToPick onPick={onChange} />
        {showArea && (
          <Circle center={[area.lat, area.lng]} radius={AREA_RADIUS_M} pathOptions={{ color: '#3aa0ff', weight: 1, fillOpacity: 0.12, dashArray: '4 4' }} />
        )}
        <Marker
          position={[value.lat, value.lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              onChange({ lat: p.lat, lng: p.lng });
            },
          }}
        />
      </MapContainer>
      <div className="picker-map__style">
        <MapStyleSwitch value={style} onChange={setStyle} />
      </div>
    </>
  );
}

// ─── Dream Car Alerts ─────────────────────────────────────────────────────

/** Zoomt so, dass alle Kreise sichtbar sind. */
function FitCircles({ circles }: { circles: { center: GeoPoint; radiusKm: number }[] }) {
  const map = useMap();
  const key = circles.map((c) => `${c.center.lat.toFixed(3)},${c.center.lng.toFixed(3)},${c.radiusKm}`).join('|');
  useEffect(() => {
    if (!circles.length) return;
    const b = circles
      .map((c) => L.latLng(c.center.lat, c.center.lng).toBounds(c.radiusKm * 2000))
      .reduce((acc, x) => acc.extend(x), L.latLng(circles[0].center.lat, circles[0].center.lng).toBounds(circles[0].radiusKm * 2000));
    map.fitBounds(b, { padding: [24, 24], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

/** Vorschau eines Alert-Gebiets (Kreis). Tippen auf die Karte verschiebt den Mittelpunkt. */
function LeafletAreaMap({ center, radiusKm, onPick }: { center: GeoPoint; radiusKm: number; onPick?: (p: GeoPoint) => void }) {
  const [style] = useMapStyle();
  const icon = useMemo(() => pinIcon('#ff3d7f', false, true), []);
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={9} className={`leaflet-host leaflet-host--picker leaflet-host--${style}`} {...mapProps}>
      <BaseLayers style={style} />
      <FitCircles circles={[{ center, radiusKm }]} />
      <ZoomButtons />
      {onPick && <ClickToPick onPick={onPick} />}
      <Circle center={[center.lat, center.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#ff3d7f', weight: 2, fillOpacity: 0.12, dashArray: '6 6' }} />
      <Marker position={[center.lat, center.lng]} icon={icon} />
    </MapContainer>
  );
}

export interface DreamMapItem {
  id: string;
  point: GeoPoint;
  radiusM: number;
  color: string;
}

/** Dream-Car-Map: eigene Gebiete + passende öffentliche Spots (nur öffentlicher Bereich). */
function LeafletDreamMap({ areas, items, selectedId, onSelect }: { areas: { id: string; center: GeoPoint; radiusKm: number }[]; items: DreamMapItem[]; selectedId?: string; onSelect: (id: string) => void }) {
  const [style] = useMapStyle();
  const center = areas[0]?.center ?? { lat: 48.4, lng: 10 };
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={6} className={`leaflet-host leaflet-host--picker leaflet-host--${style}`} {...mapProps}>
      <BaseLayers style={style} />
      <FitCircles circles={areas} />
      <ZoomButtons />
      {areas.map((a) => (
        <Circle key={a.id} center={[a.center.lat, a.center.lng]} radius={a.radiusKm * 1000} pathOptions={{ color: '#ff3d7f', weight: 2, fillOpacity: 0.06, dashArray: '6 6' }} />
      ))}
      {items.map((it) => (
        <SpotMarker key={it.id} loc={{ point: it.point, radiusM: it.radiusM, areaLabel: '' }} color={it.color} rare selected={selectedId === it.id} onClick={() => onSelect(it.id)} />
      ))}
    </MapContainer>
  );
}

// ─── Auswahl: Google Maps (wenn Schlüssel vorhanden und gültig), sonst kostenlose Leaflet-Karte ───

type SpotMapProps = { items: MapSpot[]; center: GeoPoint; zoom?: number; selectedId?: string; style: MapStyle; onSelect: (spot: Spot) => void };

function Loading() {
  return <div className="gmap-host" aria-busy="true" />;
}

export function SpotMap(props: SpotMapProps) {
  const g = useGoogleMaps();
  if (g === 'loading') return <Loading />;
  if (g !== 'ready') return <LeafletSpotMap {...props} />;
  const markers: GMarker[] = [];
  const circles: GCircle[] = [];
  for (const { spot, loc } of props.items) {
    if (!loc.point) continue;
    const model = getModel(spot.modelId);
    const color = getBrand(model.brandId).color;
    const onClick = () => props.onSelect(spot);
    if (loc.radiusM > 0) circles.push({ id: `c${spot.id}`, center: loc.point, radiusM: loc.radiusM, color, fill: 0.1, onClick });
    markers.push({ id: spot.id, point: loc.point, color, rare: rarityRank(model.rarity) >= rarityRank('epic'), selected: props.selectedId === spot.id, onClick });
  }
  return <GoogleMapView center={props.center} zoom={props.zoom ?? 5} style={props.style} markers={markers} circles={circles} />;
}

export function LocationPicker(props: { value: GeoPoint; onChange: (p: GeoPoint) => void; showArea: boolean }) {
  const g = useGoogleMaps();
  const [style, setStyle] = useMapStyle();
  if (g === 'loading') return <Loading />;
  if (g !== 'ready') return <LeafletLocationPicker {...props} />;
  const area = snapToGrid(props.value);
  const circles: GCircle[] = props.showArea ? [{ id: 'area', center: area, radiusM: AREA_RADIUS_M, color: '#3aa0ff', fill: 0.12 }] : [];
  return (
    <>
      <GoogleMapView center={props.value} zoom={13} style={style} circles={circles} pin={{ point: props.value, onDrag: props.onChange }} onPick={props.onChange} />
      <div className="picker-map__style">
        <MapStyleSwitch value={style} onChange={setStyle} />
      </div>
    </>
  );
}

export function AreaMap(props: { center: GeoPoint; radiusKm: number; onPick?: (p: GeoPoint) => void }) {
  const g = useGoogleMaps();
  const [style] = useMapStyle();
  if (g === 'loading') return <Loading />;
  if (g !== 'ready') return <LeafletAreaMap {...props} />;
  return (
    <GoogleMapView
      center={props.center}
      zoom={9}
      style={style}
      fit
      circles={[{ id: 'a', center: props.center, radiusM: props.radiusKm * 1000, color: '#ff3d7f', fill: 0.12, weight: 2 }]}
      markers={[{ id: 'm', point: props.center, color: '#ff3d7f', selected: true }]}
      onPick={props.onPick}
    />
  );
}

export function DreamMap(props: { areas: { id: string; center: GeoPoint; radiusKm: number }[]; items: DreamMapItem[]; selectedId?: string; onSelect: (id: string) => void }) {
  const g = useGoogleMaps();
  const [style] = useMapStyle();
  if (g === 'loading') return <Loading />;
  if (g !== 'ready') return <LeafletDreamMap {...props} />;
  const center = props.areas[0]?.center ?? { lat: 48.4, lng: 10 };
  return (
    <GoogleMapView
      center={center}
      zoom={6}
      style={style}
      fit={props.areas.length > 0}
      circles={props.areas.map((a) => ({ id: a.id, center: a.center, radiusM: a.radiusKm * 1000, color: '#ff3d7f', fill: 0.06, weight: 2 }))}
      markers={props.items.map((it) => ({ id: it.id, point: it.point, color: it.color, rare: true, selected: props.selectedId === it.id, onClick: () => props.onSelect(it.id) }))}
    />
  );
}
