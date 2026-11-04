import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TripMapDay } from '../services/geo';
import { dayTone } from './tripMapTones';

interface TripMapProps {
  days: TripMapDay[];
  /** The day to zoom to and keep at full strength; null shows the whole trip. */
  focusDayId: string | null;
  /** Accessible name for the map region. */
  label: string;
  /** "第 2 天" / "Day 2", for the pin popups. */
  dayLabel: (n: number) => string;
}

/** A theme token's value, so the lines take the theme's colour rather than a hex written here. */
const themeColor = (token: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
};

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Other days stay on the map while one is in focus, faded rather than gone. */
const FADED = 0.3;

interface DayLayer {
  markers: L.Marker[];
  line: L.Polyline | null;
  bounds: L.LatLngBounds;
}

/**
 * Every pinned stop of the trip on one OpenStreetMap. Each pin carries its
 * day's number, in that day's tone, and each day's stops are joined in order
 * by a dashed straight line — "then we go here", not "we go this way", the
 * same promise the day map makes.
 *
 * Loaded lazily like DayMap: Leaflet is ~40 kB gzipped that most sessions
 * never need.
 */
export const TripMap: React.FC<TripMapProps> = ({ days, focusDayId, label, dayLabel }) => {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Map<string, DayLayer>>(new Map());
  const allBoundsRef = useRef<L.LatLngBounds | null>(null);

  // The parent rebuilds `days` on every render, so depend on what is in it —
  // including the language, which the popups are written in.
  const signature =
    dayLabel(1) +
    days
      .map(
        ({ day, stops }) =>
          `${day.id}#${day.dayNumber}:` +
          stops.map(s => `${s.activity.id}:${s.lat},${s.lon}:${s.order}:${s.activity.title}`).join(';')
      )
      .join('|');

  useEffect(() => {
    const el = host.current;
    if (!el || days.length === 0) return;

    const map = L.map(el, {
      // A page that scrolls should keep scrolling when the wheel is over the
      // map; the +/- buttons and pinch still zoom.
      scrollWheelZoom: false
    });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);

    const layers = new Map<string, DayLayer>();
    const everything: L.LatLng[] = [];

    for (const { day, stops } of days) {
      const tone = dayTone(day.dayNumber);
      const points = stops.map(s => L.latLng(s.lat, s.lon));
      everything.push(...points);

      const line =
        points.length > 1
          ? L.polyline(points, {
              color: themeColor(tone.cssVar, '#3930DB'),
              weight: 3,
              opacity: 0.85,
              dashArray: '6 8'
            }).addTo(map)
          : null;

      const markers = stops.map(stop => {
        // The day number in the day's tone. The number is the meaning; the
        // tone only helps tell neighbouring days apart at a glance.
        const icon = L.divIcon({
          className: '',
          html: `<span class="flex items-center justify-center w-7 h-7 rounded-full ${tone.bg} text-white text-xs font-bold border-2 border-paper shadow-lift">${day.dayNumber}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14]
        });
        const marker = L.marker([stop.lat, stop.lon], { icon, title: stop.activity.title }).addTo(map);

        // Built as DOM nodes so an activity title is text, never markup
        const popup = document.createElement('div');
        popup.className = 'text-sm leading-snug';
        const dayLine = document.createElement('div');
        dayLine.className = 'text-[11px] font-semibold text-muted';
        dayLine.textContent = dayLabel(day.dayNumber);
        popup.appendChild(dayLine);
        const title = document.createElement('div');
        title.className = 'font-semibold text-ink';
        title.textContent = `${stop.order}. ${stop.activity.title}`;
        popup.appendChild(title);
        const detail = document.createElement('div');
        detail.className = 'text-xs text-muted mt-0.5';
        detail.textContent = [stop.activity.time, stop.activity.locationName].filter(Boolean).join(' · ');
        popup.appendChild(detail);
        marker.bindPopup(popup);
        return marker;
      });

      layers.set(day.id, { markers, line, bounds: L.latLngBounds(points) });
    }

    mapRef.current = map;
    layersRef.current = layers;
    allBoundsRef.current = L.latLngBounds(everything);

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = new Map();
      allBoundsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Zooming to a day, or back out to the whole trip, moves the view without
  // rebuilding the map, so the tiles already loaded stay on screen.
  useEffect(() => {
    const map = mapRef.current;
    const all = allBoundsRef.current;
    if (!map || !all) return;

    const focused = focusDayId ? layersRef.current.get(focusDayId) : undefined;
    for (const [id, layer] of layersRef.current) {
      const strength = !focused || id === focusDayId ? 1 : FADED;
      layer.markers.forEach(m => m.setOpacity(strength));
      layer.line?.setStyle({ opacity: strength === 1 ? 0.85 : FADED * 0.6 });
    }
    // maxZoom keeps a one-stop day from zooming down to a single building.
    // The extra room top-left is the zoom buttons', or they sit on a pin.
    map.fitBounds(focused ? focused.bounds : all, {
      paddingTopLeft: [52, 28],
      paddingBottomRight: [28, 28],
      maxZoom: 15
    });
  }, [focusDayId, signature]);

  return (
    <div
      ref={host}
      role="region"
      aria-label={label}
      // `isolate` keeps Leaflet's internal z-indexes (up to 1000) inside this
      // box; without it the zoom buttons float over the bottom tabs and modals.
      className="isolate h-72 sm:h-96 w-full rounded-control overflow-hidden border border-hairline bg-mist"
    />
  );
};

export default TripMap;
