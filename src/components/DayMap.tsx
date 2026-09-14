import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapStop } from '../services/geo';

interface DayMapProps {
  stops: MapStop[];
  /** Accessible name for the map region. */
  label: string;
}

/**
 * Read a Daylight token off the document so the map takes the theme's colour
 * rather than a hex written here. Tailwind v4 publishes every `@theme` value
 * as a custom property on :root, which is what makes this work.
 */
const themeColor = (token: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
};

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * The day's pinned stops on an OpenStreetMap, numbered in the day's order and
 * joined by a dashed line. The line is a straight line — it says "then we go
 * here", not "we go this way" — and the numbers match the list under the map.
 *
 * Loaded lazily: Leaflet is ~40 kB gzipped that most sessions never need.
 */
export const DayMap: React.FC<DayMapProps> = ({ stops, label }) => {
  const host = useRef<HTMLDivElement>(null);

  // The parent recomputes `stops` on every render, so depend on what is in
  // it rather than on the array — rebuilding the map on each expand/collapse
  // of an activity would flash the tiles.
  const signature = stops.map(s => `${s.activity.id}:${s.lat},${s.lon}:${s.order}`).join('|');

  useEffect(() => {
    const el = host.current;
    if (!el || stops.length === 0) return;

    const map = L.map(el, {
      // A page that scrolls should keep scrolling when the wheel is over the
      // map; the +/- buttons and pinch still zoom.
      scrollWheelZoom: false
    });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);

    const brand = themeColor('--color-brand', '#3930DB');
    const points = stops.map(s => L.latLng(s.lat, s.lon));

    if (points.length > 1) {
      L.polyline(points, { color: brand, weight: 3, opacity: 0.85, dashArray: '6 8' }).addTo(map);
    }

    for (const stop of stops) {
      // A numbered disc built from the theme's classes. Leaflet's default pin
      // is an image whose path breaks under a bundler, and a number says more.
      const icon = L.divIcon({
        className: '',
        html: `<span class="flex items-center justify-center w-7 h-7 rounded-full bg-brand text-white text-xs font-bold border-2 border-paper shadow-lift">${stop.order}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });
      const marker = L.marker([stop.lat, stop.lon], { icon, title: stop.activity.title }).addTo(map);

      // Built as DOM nodes so an activity title is text, never markup.
      const popup = document.createElement('div');
      popup.className = 'text-sm leading-snug';
      const title = document.createElement('div');
      title.className = 'font-semibold text-ink';
      title.textContent = `${stop.order}. ${stop.activity.title}`;
      popup.appendChild(title);
      const detail = document.createElement('div');
      detail.className = 'text-xs text-muted mt-0.5';
      detail.textContent = [stop.activity.time, stop.activity.locationName].filter(Boolean).join(' · ');
      popup.appendChild(detail);
      marker.bindPopup(popup);
    }

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
    }

    return () => {
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <div
      ref={host}
      role="region"
      aria-label={label}
      // `isolate` keeps Leaflet's internal z-indexes (up to 1000) inside this
      // box; without it the zoom buttons float over the bottom tabs and modals.
      className="isolate h-64 sm:h-80 w-full rounded-control overflow-hidden border border-hairline bg-mist"
    />
  );
};

export default DayMap;
