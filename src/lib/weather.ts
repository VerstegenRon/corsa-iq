// The weather at the circuit while a session ran, from Open-Meteo (free, no key): air temperature,
// humidity and rain per hour. Only the coordinates and the date go out. Track temperature is not in
// any weather model, so it stays a field the team fills in.

import type { WEATHER } from "@/lib/karting";

export type SessionConditions = {
  weather?: string;
  /** Set when the weather turned during the session: what it was at the end (`weather` is the start). */
  weather_to?: string;
  air_temp_c?: number;
  track_temp_c?: number;
  humidity_pct?: number;
  /** Rain during the session, in mm. */
  precipitation_mm?: number;
  /** Which of the fields above came from Open-Meteo rather than from the team. */
  auto?: string[];
};

export type FetchedWeather = {
  air_temp_c: number;
  humidity_pct: number;
  precipitation_mm: number;
  weather: keyof typeof WEATHER;
};

/** How each fetched field is named in "automatisch via Open-Meteo: …". */
export const AUTO_FIELD_LABELS: Record<string, string> = {
  weather: "weer",
  air_temp_c: "luchttemperatuur",
  humidity_pct: "luchtvochtigheid",
  precipitation_mm: "regen",
};

/** Fields the app can fill in; the rest of the conditions are always the team's. */
export const AUTO_FIELDS = ["weather", "air_temp_c", "humidity_pct", "precipitation_mm"] as const;

/** The forecast API also has the recent past; older days come from the reanalysis archive. */
const FORECAST_PAST_DAYS = 80;
const FORECAST_FUTURE_DAYS = 15;
/** Rain in the hours before the start that still leaves the track damp. */
const DRYING_HOURS = 3;

const day = (date: Date) => date.toISOString().slice(0, 10);

export async function fetchWeather(
  latitude: number,
  longitude: number,
  startedAt: string,
  durationS: number,
): Promise<FetchedWeather | null> {
  const start = new Date(startedAt);
  const end = new Date(start.getTime() + Math.max(durationS, 60) * 1000);
  const from = new Date(start.getTime() - DRYING_HOURS * 3600_000);
  const ageDays = (Date.now() - start.getTime()) / 86_400_000;
  if (ageDays < -FORECAST_FUTURE_DAYS) return null;

  const base = ageDays > FORECAST_PAST_DAYS ? "https://archive-api.open-meteo.com/v1/archive" : "https://api.open-meteo.com/v1/forecast";
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    hourly: "temperature_2m,relative_humidity_2m,precipitation",
    start_date: day(from),
    end_date: day(end),
    timezone: "GMT",
  });

  try {
    const response = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      hourly?: { time: string[]; temperature_2m: (number | null)[]; relative_humidity_2m: (number | null)[]; precipitation: (number | null)[] };
    };
    const hourly = data.hourly;
    if (!hourly) return null;

    // Hours are "YYYY-MM-DDTHH:00" in UTC; an hour counts when the session ran in it.
    const hourOf = (time: string) => new Date(`${time}:00Z`).getTime();
    const firstHour = Math.floor(start.getTime() / 3600_000) * 3600_000;
    const during: number[] = [];
    const before: number[] = [];
    hourly.time.forEach((time, i) => {
      const t = hourOf(time);
      if (t >= firstHour && t < end.getTime()) during.push(i);
      else if (t < firstHour && t >= firstHour - DRYING_HOURS * 3600_000) before.push(i);
    });
    const values = (series: (number | null)[], at: number[]) => at.map((i) => series[i]).filter((v): v is number => typeof v === "number");
    const temps = values(hourly.temperature_2m, during);
    const humidity = values(hourly.relative_humidity_2m, during);
    if (temps.length === 0 || humidity.length === 0) return null;

    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const rain = sum(values(hourly.precipitation, during));
    const rainBefore = sum(values(hourly.precipitation, before));
    const weather = rain >= 0.3 ? "wet" : rain > 0 || rainBefore >= 0.3 ? "damp" : "dry";

    return {
      air_temp_c: Math.round((sum(temps) / temps.length) * 10) / 10,
      humidity_pct: Math.round(sum(humidity) / humidity.length),
      precipitation_mm: Math.round(rain * 10) / 10,
      weather,
    };
  } catch (error) {
    console.error("Weer ophalen mislukt", error);
    return null;
  }
}

/**
 * The conditions to save: what the team filled in stays; the rest comes from Open-Meteo, or, when
 * that failed, from what was fetched before (if the session did not move in time).
 */
export function mergeConditions(
  form: SessionConditions,
  fetched: FetchedWeather | null,
  previous: SessionConditions | null,
  keepPrevious: boolean,
): SessionConditions {
  const result: SessionConditions = { ...form };
  const auto: string[] = [];
  for (const field of AUTO_FIELDS) {
    if (result[field] !== undefined) continue;
    const value = fetched?.[field] ?? (keepPrevious && previous?.auto?.includes(field) ? previous[field] : undefined);
    if (value === undefined) continue;
    (result as Record<string, unknown>)[field] = value;
    auto.push(field);
  }
  if (auto.length > 0) result.auto = auto;
  // "Turned to" the weather it already was is no change.
  if (result.weather_to && result.weather_to === result.weather) delete result.weather_to;
  return result;
}

/** The weather as text, with the change when it turned: "Droog → Nat". */
export function weatherText(conditions: Pick<SessionConditions, "weather" | "weather_to">, labels: Record<string, string>): string | null {
  if (!conditions.weather) return null;
  const label = (key: string) => labels[key] ?? key;
  return conditions.weather_to ? `${label(conditions.weather)} → ${label(conditions.weather_to)}` : label(conditions.weather);
}
