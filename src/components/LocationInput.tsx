import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { searchPlaces, type PlaceSuggestion } from '../services/placeSearch';
import { useI18n } from '../utils/i18n';
import { input } from './ui';

interface LocationInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Fired when a suggestion is picked, so the caller can fill address + map link. */
  onPick: (place: PlaceSuggestion) => void;
  /** Trip destination, used to bias results to the right city. */
  near?: string;
}

// Photon is a shared free service; typing "Grand Palace" should not fire nine
// requests on the way there.
const DEBOUNCE_MS = 450;

export const LocationInput: React.FC<LocationInputProps> = ({
  id,
  value,
  onChange,
  onPick,
  near
}) => {
  const { t } = useI18n();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  // Set while applying a pick, so the resulting value change does not
  // immediately re-open the dropdown with a fresh search.
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (value.trim().length < 3) {
      setSuggestions([]);
      setSearched(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        const found = await searchPlaces(value, near, controller.signal);
        setSuggestions(found);
        setSearched(true);
        setOpen(true);
        setHighlight(-1);
      } catch {
        // Offline, rate-limited or aborted — typing by hand still works,
        // so this stays silent rather than throwing an error at the user.
        setSuggestions([]);
      } finally {
        setBusy(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, near]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const choose = (place: PlaceSuggestion) => {
    skipNextSearch.current = true;
    onPick(place);
    setOpen(false);
    setSuggestions([]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      choose(suggestions[highlight]);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={`${input} ${busy ? 'pr-10' : ''}`}
      />

      {busy && (
        <Loader2 className="w-4 h-4 text-faint animate-spin absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      )}

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1.5 bg-paper border border-hairline rounded-card shadow-lift overflow-hidden animate-riseIn max-h-64 overflow-y-auto"
        >
          {suggestions.map((place, idx) => (
            <li key={place.id}>
              <button
                type="button"
                role="option"
                aria-selected={idx === highlight}
                onClick={() => choose(place)}
                onMouseEnter={() => setHighlight(idx)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition ${
                  idx === highlight ? 'bg-mist' : 'bg-paper'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-faint shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-sm text-ink truncate">{place.name}</span>
                  {place.address && (
                    <span className="block text-xs text-muted truncate">{place.address}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && searched && !busy && suggestions.length === 0 && (
        <p className="absolute z-30 left-0 right-0 mt-1.5 bg-paper border border-hairline rounded-card shadow-lift px-3 py-2.5 text-xs text-muted">
          {t('noPlacesFound')}
        </p>
      )}
    </div>
  );
};
