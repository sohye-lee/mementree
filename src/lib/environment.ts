// environment logic — location, season, sun phase, weather.
// pure functions + types; the react glue lives in use-environment.ts.
//
// see project memory "Mementree environment system": the field should feel
// timed to the keeper's place + sky. phase is a simple local-clock split
// (night runs 19:00–05:00) rather than computed sunrise/sunset.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Phase = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog';

export interface FieldLocation {
  lat: number;
  lng: number;
  label: string;
}

// default — US east coast (charlottesville, va), matching the design's
// stand-in. used until the keeper opts into geolocation.
export const DEFAULT_LOCATION: FieldLocation = {
  lat: 38.03,
  lng: -78.48,
  label: 'us east',
};

export const LOCATION_STORAGE_KEY = 'mementree:location';

// ── season ───────────────────────────────────────────────────────────────────

export function resolveSeason(date: Date, lat: number): Season {
  const m = date.getMonth(); // 0-11
  let s: Season;
  if (m >= 2 && m <= 4) s = 'spring';
  else if (m >= 5 && m <= 7) s = 'summer';
  else if (m >= 8 && m <= 10) s = 'autumn';
  else s = 'winter';

  if (lat >= 0) return s;
  // southern hemisphere — flip
  const flip: Record<Season, Season> = {
    spring: 'autumn',
    summer: 'winter',
    autumn: 'spring',
    winter: 'summer',
  };
  return flip[s];
}

// ── sun phase ─────────────────────────────────────────────────────────────────

// phase by the viewer's local clock. night runs 19:00–05:00.
export function resolvePhase(date: Date): Phase {
  const h = date.getHours();
  if (h >= 19 || h < 5) return 'night';
  if (h < 7) return 'dawn';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'dusk';
}

// ── weather ───────────────────────────────────────────────────────────────────

// WMO weather interpretation codes → our coarse buckets.
export function wmoToWeather(code: number | null | undefined): Weather {
  if (code == null) return 'clear';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code >= 95
  ) {
    return 'rain';
  }
  if (code === 45 || code === 48) return 'fog';
  if (code >= 1 && code <= 3) return 'cloudy';
  return 'clear';
}

// open-meteo: free, no key, no signup.
export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
    `&longitude=${lng}&current=weather_code`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const data = (await res.json()) as {
    current?: { weather_code?: number };
  };
  return wmoToWeather(data.current?.weather_code);
}
