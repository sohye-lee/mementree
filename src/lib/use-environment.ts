'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LOCATION,
  LOCATION_STORAGE_KEY,
  fetchWeather,
  resolvePhase,
  resolveSeason,
  type FieldLocation,
  type Phase,
  type Season,
  type Weather,
} from './environment';

export interface Environment {
  // null until mounted, to keep the server/client first paint identical
  season: Season | null;
  phase: Phase | null;
  weather: Weather;
  location: FieldLocation;
  locating: boolean;
  // opens the browser geolocation prompt; on grant, switches to real coords
  requestLocation: () => void;
}

export function useEnvironment(): Environment {
  const [mounted, setMounted] = useState(false);
  const [location, setLocation] = useState<FieldLocation>(DEFAULT_LOCATION);
  const [weather, setWeather] = useState<Weather>('clear');
  const [locating, setLocating] = useState(false);
  // a minute-resolution clock — phase only shifts on that scale
  const [minuteTick, setMinuteTick] = useState(0);

  // mount: restore any saved location, start the minute clock
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) setLocation(JSON.parse(saved) as FieldLocation);
    } catch {
      /* ignore malformed storage */
    }
    const id = window.setInterval(() => setMinuteTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // (re)fetch weather whenever the location changes; refresh every 15 min
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchWeather(location.lat, location.lng)
        .then((w) => {
          if (!cancelled) setWeather(w);
        })
        .catch(() => {
          /* keep last known weather */
        });
    };
    load();
    const id = window.setInterval(load, 15 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [location]);

  const season = useMemo<Season | null>(
    () => (mounted ? resolveSeason(new Date(), location.lat) : null),
    // minuteTick keeps this fresh as real time advances
    [mounted, location.lat, minuteTick],
  );

  const phase = useMemo<Phase | null>(
    () =>
      mounted
        ? resolvePhase(new Date(), location.lat, location.lng)
        : null,
    [mounted, location.lat, location.lng, minuteTick],
  );

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: FieldLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'your sky',
        };
        setLocation(loc);
        try {
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
        } catch {
          /* ignore */
        }
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }, []);

  return { season, phase, weather, location, locating, requestLocation };
}
