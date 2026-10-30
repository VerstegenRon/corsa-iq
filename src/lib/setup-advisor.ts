// The setup advisor: looks through your own sessions for settings that went with faster laps. Plain
// statistics, no guessing: sessions are compared only on the same circuit, with the same kart and in
// the same weather, a setting needs at least two sessions, and every finding says how many sessions
// it rests on and whether something else changed at the same time.

import { nl } from "@/lib/i18n/dictionaries/nl";
import { WEATHER, type SetupValues } from "@/lib/karting";
import { SETUP_FIELDS, formatSetupValue, getSetupValue, type SetupField, type SetupGroup } from "@/lib/setup";

export type AdvisorSession = {
  id: string;
  trackId: string;
  trackName: string;
  kart: { id: string; name: string } | null;
  bestLapMs: number;
  conditions: { weather?: string; weather_to?: string; track_temp_c?: number };
  setup: SetupValues;
};

/** Track temperature where tyre pressures are split into "cooler" and "warmer" sessions. */
export const WARM_TRACK_C = 30;
/** A difference smaller than this is noise in a best lap, not a finding. */
const MIN_GAP_MS = 20;
/** Floor for the spread of a group of best laps, so two identical laps do not look like certainty. */
const MIN_SPREAD_MS = 60;

export type Confidence = "strong" | "fair" | "weak";

export const CONFIDENCE: Record<Confidence, { label: string; hint: string }> = {
  strong: { label: "Sterk", hint: "Genoeg sessies en het verschil is groter dan de gewone spreiding." },
  fair: { label: "Redelijk", hint: "Een duidelijk verschil, maar nog op weinig sessies." },
  weak: { label: "Voorzichtig", hint: "Weinig sessies of veel spreiding: kan nog toeval zijn." },
};

type Knob = {
  key: string;
  label: string;
  group: SetupGroup;
  /** Splits the sessions on track temperature as well, for tyre pressures. */
  byTemperature?: boolean;
  /** The setting as a comparable key and as text; undefined when the setup does not have it. */
  read: (setup: SetupValues) => { key: string; text: string } | undefined;
};

const field = (name: string) => SETUP_FIELDS.find((f) => f.name === name)!;
const pressureFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Average cold pressure of one axle, to the nearest 0.05 bar: finer steps are measuring noise. */
function axlePressure(left: SetupField, right: SetupField): Knob["read"] {
  return (setup) => {
    const values = [getSetupValue(setup, left), getSetupValue(setup, right)].filter((v): v is number => typeof v === "number");
    if (values.length === 0) return undefined;
    const bar = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 20) / 20;
    return { key: bar.toFixed(2), text: `${pressureFormat.format(bar)} bar` };
  };
}

function plainField(f: SetupField): Knob {
  return {
    key: f.name,
    // Dutch, like the rest of the advice, until the advice screens are translated.
    label: nl.setup.fields[f.name].name,
    group: f.group,
    read: (setup) => {
      const value = getSetupValue(setup, f);
      if (value === undefined) return undefined;
      const text = `${formatSetupValue(f, value)}${f.unit && f.unit !== "bar" ? ` ${f.unit}` : ""}`;
      return { key: typeof value === "string" ? value.trim().toLowerCase() : String(value), text };
    },
  };
}

export const KNOBS: Knob[] = [
  {
    key: "gearing",
    label: "Overbrenging",
    group: "gearing",
    read: ({ gearing }) =>
      gearing?.front_teeth && gearing.rear_teeth
        ? { key: `${gearing.front_teeth}/${gearing.rear_teeth}`, text: `${gearing.front_teeth}/${gearing.rear_teeth}` }
        : undefined,
  },
  { key: "pressure_front", label: "Koude druk voor", group: "tyres", byTemperature: true, read: axlePressure(field("pressure_fl"), field("pressure_fr")) },
  { key: "pressure_rear", label: "Koude druk achter", group: "tyres", byTemperature: true, read: axlePressure(field("pressure_rl"), field("pressure_rr")) },
  ...SETUP_FIELDS.filter((f) => f.group === "chassis" || f.group === "engine").map(plainField),
];

export type SettingResult = { text: string; sessions: number; meanMs: number; bestMs: number; sessionIds: string[] };

export type Insight = {
  id: string;
  trackId: string;
  trackName: string;
  kartName: string | null;
  weather: string | null;
  /** Only for tyre pressures split on track temperature. */
  temperature: "warm" | "cool" | null;
  knob: string;
  label: string;
  group: SetupGroup;
  best: SettingResult;
  other: SettingResult;
  gapMs: number;
  confidence: Confidence;
  /** Other settings that were different in exactly the same sessions, so they may explain the gap. */
  alsoChanged: string[];
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const spread = (xs: number[]) => {
  const m = mean(xs);
  return Math.max(MIN_SPREAD_MS, Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, xs.length - 1)));
};

function confidenceOf(a: number[], b: number[], gapMs: number): Confidence {
  // How many times the gap is bigger than the uncertainty in the two averages (a Welch t-value).
  const t = gapMs / Math.sqrt(spread(a) ** 2 / a.length + spread(b) ** 2 / b.length);
  const fewest = Math.min(a.length, b.length);
  if (fewest >= 4 && t >= 2.5) return "strong";
  if (fewest >= 3 && t >= 1.5) return "fair";
  return "weak";
}

/** Names of the other settings that were one value in all `a` sessions and another in all `b` sessions. */
function changedAlongside(knob: Knob, a: AdvisorSession[], b: AdvisorSession[]): string[] {
  const single = (sessions: AdvisorSession[], other: Knob) => {
    const keys = sessions.map((s) => other.read(s.setup)?.key);
    return keys.every((k) => k !== undefined && k === keys[0]) ? keys[0] : undefined;
  };
  return KNOBS.filter((other) => {
    if (other.key === knob.key) return false;
    const x = single(a, other);
    const y = single(b, other);
    return x !== undefined && y !== undefined && x !== y;
  }).map((other) => other.label);
}

function compare(knob: Knob, sessions: AdvisorSession[]): Omit<Insight, "id" | "trackId" | "trackName" | "kartName" | "weather" | "temperature"> | null {
  const groups = new Map<string, { text: string; sessions: AdvisorSession[] }>();
  for (const session of sessions) {
    const value = knob.read(session.setup);
    if (!value) continue;
    const group = groups.get(value.key) ?? { text: value.text, sessions: [] };
    group.sessions.push(session);
    groups.set(value.key, group);
  }
  const ranked = [...groups.values()]
    .filter((g) => g.sessions.length >= 2)
    .map((g) => ({ ...g, laps: g.sessions.map((s) => s.bestLapMs) }))
    .map((g) => ({ ...g, meanMs: mean(g.laps) }))
    .sort((a, b) => a.meanMs - b.meanMs);
  if (ranked.length < 2) return null;

  const [best, other] = ranked;
  const gapMs = other.meanMs - best.meanMs;
  if (gapMs < MIN_GAP_MS) return null;

  const result = (g: (typeof ranked)[number]): SettingResult => ({
    text: g.text,
    sessions: g.sessions.length,
    meanMs: Math.round(g.meanMs),
    bestMs: Math.min(...g.laps),
    sessionIds: g.sessions.map((s) => s.id),
  });
  return {
    knob: knob.key,
    label: knob.label,
    group: knob.group,
    best: result(best),
    other: result(other),
    gapMs: Math.round(gapMs),
    confidence: confidenceOf(best.laps, other.laps, gapMs),
    alsoChanged: changedAlongside(knob, best.sessions, other.sessions),
  };
}

const CONFIDENCE_ORDER: Record<Confidence, number> = { strong: 0, fair: 1, weak: 2 };

/** All findings, the most trustworthy and the biggest gaps first. */
export function findInsights(sessions: AdvisorSession[]): Insight[] {
  // Only like with like: one circuit, one kart, one kind of weather. A session in which the weather
  // turned is like no other, so it is left out.
  const contexts = new Map<string, AdvisorSession[]>();
  for (const session of sessions) {
    if (session.conditions.weather_to) continue;
    const key = [session.trackId, session.kart?.id ?? "", session.conditions.weather ?? ""].join("|");
    contexts.set(key, [...(contexts.get(key) ?? []), session]);
  }

  const insights: Insight[] = [];
  for (const [key, group] of contexts) {
    const [first] = group;
    const context = {
      trackId: first.trackId,
      trackName: first.trackName,
      kartName: first.kart?.name ?? null,
      weather: first.conditions.weather ?? null,
    };
    for (const knob of KNOBS) {
      const found = compare(knob, group);
      if (found) insights.push({ id: `${key}|${knob.key}`, ...context, temperature: null, ...found });
      if (!knob.byTemperature) continue;
      // Pressures also per temperature band, but only when the sessions were on both sides of it.
      const warm = group.filter((s) => s.conditions.track_temp_c !== undefined && s.conditions.track_temp_c > WARM_TRACK_C);
      const cool = group.filter((s) => s.conditions.track_temp_c !== undefined && s.conditions.track_temp_c <= WARM_TRACK_C);
      if (warm.length < 2 || cool.length < 2) continue;
      for (const [temperature, part] of [["warm", warm], ["cool", cool]] as const) {
        const split = compare(knob, part);
        if (split) insights.push({ id: `${key}|${knob.key}|${temperature}`, ...context, temperature, ...split });
      }
    }
  }
  return insights.sort((a, b) => CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence] || b.gapMs - a.gapMs);
}

const WEATHER_PHRASE: Record<keyof typeof WEATHER, string> = {
  dry: "bij droog weer",
  damp: "op een opdrogende baan",
  wet: "bij nat weer",
};

const secondsFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatGap(ms: number): string {
  return `${secondsFormat.format(ms / 1000)} s`;
}

/** Where a finding holds, e.g. "Op Karting Genk bij droog weer met Kart A". */
export function insightContext(insight: Insight, { track = true, kart = true } = {}): string {
  const parts = [
    track ? `Op ${insight.trackName}` : null,
    insight.weather && insight.weather in WEATHER_PHRASE ? WEATHER_PHRASE[insight.weather as keyof typeof WEATHER] : null,
    insight.temperature === "warm" ? `bij een baan boven ${WARM_TRACK_C} °C` : null,
    insight.temperature === "cool" ? `bij een baan tot ${WARM_TRACK_C} °C` : null,
    kart && insight.kartName ? `met ${insight.kartName}` : null,
  ].filter(Boolean);
  const text = parts.join(" ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/** The finding as one sentence, e.g. "… was je met 11/80 gemiddeld 0,18 s sneller dan met 11/82." */
export function insightSentence(insight: Insight, options?: { track?: boolean; kart?: boolean }): string {
  const context = insightContext(insight, options);
  const subject = `${insight.label.toLowerCase()} ${insight.best.text}`;
  const claim = `was je met ${subject} gemiddeld ${formatGap(insight.gapMs)} sneller dan met ${insight.other.text}.`;
  return context ? `${context} ${claim}` : claim.charAt(0).toUpperCase() + claim.slice(1);
}
