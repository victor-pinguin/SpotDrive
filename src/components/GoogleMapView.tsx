import { useEffect, useRef } from 'react';
import type { GeoPoint } from '../types/models';
import type { MapStyle } from './MapViews';
import { Icon } from './Icon';

/**
 * Gemeinsame Google-Karte für alle SpotDrive-Karten (Spots, Standort wählen, Dream-Gebiete).
 * Wird nur gerendert, wenn useGoogleMaps() === 'ready' (siehe MapViews.tsx).
 */
export interface GMarker {
  id: string;
  point: GeoPoint;
  color: string;
  rare?: boolean;
  selected?: boolean;
  onClick?: () => void;
}
export interface GCircle {
  id: string;
  center: GeoPoint;
  radiusM: number;
  color: string;
  fill: number;
  weight?: number;
  onClick?: () => void;
}

const DARK: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1b1e23' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9aa2ab' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e1013' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#343a43' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2b3038' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4a4034' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1b26' }] },
];

const typeFor = (s: MapStyle) => (s === 'satellite' ? 'hybrid' : 'roadmap');

export function GoogleMapView({
  center,
  zoom,
  style,
  markers = [],
  circles = [],
  fit,
  pin,
  onPick,
  className = '',
}: {
  center: GeoPoint;
  zoom: number;
  style: MapStyle;
  markers?: GMarker[];
  circles?: GCircle[];
  /** Karte auf alle Kreise zoomen */
  fit?: boolean;
  /** verschiebbarer Standort-Pin (Standort wählen) */
  pin?: { point: GeoPoint; onDrag: (p: GeoPoint) => void };
  onPick?: (p: GeoPoint) => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const overlays = useRef<{ setMap(m: google.maps.Map | null): void }[]>([]);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  // Karte einmal anlegen
  useEffect(() => {
    if (!host.current) return;
    const m = new google.maps.Map(host.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom,
      disableDefaultUI: true,
      gestureHandling: 'greedy',
      clickableIcons: false,
      mapTypeId: typeFor(style),
      styles: style === 'dark' ? DARK : undefined,
      minZoom: 2,
      backgroundColor: '#0f1b26',
    });
    m.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && pickRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
    map.current = m;
    return () => {
      overlays.current.forEach((o) => o.setMap(null));
      overlays.current = [];
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stil
  useEffect(() => {
    map.current?.setMapTypeId(typeFor(style));
    map.current?.setOptions({ styles: style === 'dark' ? DARK : undefined });
  }, [style]);

  // Mittelpunkt
  useEffect(() => {
    if (fit) return;
    map.current?.panTo({ lat: center.lat, lng: center.lng });
    map.current?.setZoom(zoom);
  }, [center.lat, center.lng, zoom, fit]);

  // Kreise, Marker, Pin
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];
    const bounds = new google.maps.LatLngBounds();

    circles.forEach((c) => {
      const circle = new google.maps.Circle({
        map: m,
        center: { lat: c.center.lat, lng: c.center.lng },
        radius: c.radiusM,
        strokeColor: c.color,
        strokeWeight: c.weight ?? 1.5,
        strokeOpacity: 0.8,
        fillColor: c.color,
        fillOpacity: c.fill,
        clickable: !!c.onClick,
      });
      if (c.onClick) circle.addListener('click', c.onClick);
      overlays.current.push(circle);
      const b = circle.getBounds();
      if (b) bounds.union(b);
    });

    markers.forEach((k) => {
      const marker = new google.maps.Marker({
        map: m,
        position: { lat: k.point.lat, lng: k.point.lng },
        zIndex: k.selected ? 20 : k.rare ? 10 : 1,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: k.selected ? 11 : 8,
          fillColor: k.color,
          fillOpacity: 1,
          strokeColor: k.rare || k.selected ? '#ffffff' : '#0a0b0d',
          strokeWeight: k.selected ? 3 : 2.5,
        },
      });
      if (k.onClick) marker.addListener('click', k.onClick);
      overlays.current.push(marker);
    });

    if (pin) {
      const marker = new google.maps.Marker({
        map: m,
        position: { lat: pin.point.lat, lng: pin.point.lng },
        draggable: true,
        zIndex: 30,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 11, fillColor: '#ff5a1f', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 },
      });
      marker.addListener('dragend', () => {
        const p = marker.getPosition();
        if (p) pin.onDrag({ lat: p.lat(), lng: p.lng() });
      });
      overlays.current.push(marker);
    }

    if (fit && !bounds.isEmpty()) m.fitBounds(bounds, 32);
    // Daten per JSON-Schlüssel vergleichen (Callbacks ändern sich bei jedem Render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fit,
    JSON.stringify(circles.map((c) => [c.id, c.center, c.radiusM, c.color, c.fill])),
    JSON.stringify(markers.map((k) => [k.id, k.point, k.color, k.rare, k.selected])),
    pin?.point.lat,
    pin?.point.lng,
  ]);

  return (
    <div className={`gmap-host ${className}`}>
      <div ref={host} className="gmap-canvas" />
      <div className="map-zoom">
        <button onClick={() => map.current?.setZoom((map.current.getZoom() ?? 5) + 1)} aria-label="Hineinzoomen">
          <Icon name="plus" size={18} />
        </button>
        <button onClick={() => map.current?.setZoom((map.current.getZoom() ?? 5) - 1)} aria-label="Herauszoomen">
          <span className="map-zoom__minus" />
        </button>
      </div>
    </div>
  );
}
