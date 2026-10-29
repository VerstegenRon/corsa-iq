// The setup tree of a kart: every setup version it ran, linked to the one it was derived from
// (parent_setup_id), with the best lap it gave and the difference with its parent. The fastest line
// is the chain from the first setup to the one with the lowest dry lap time.

import type { SetupValues } from "@/lib/karting";
import { SETUP_FIELDS, diffSetups, formatSetupValue, getSetupValue, type SetupChange } from "@/lib/setup";

export type TreeSession = {
  id: string;
  type: string;
  startedAt: string;
  bestLapMs: number | null;
  wet: boolean;
  eventName: string;
  trackName: string | null;
};

export type TreeSetup = { id: string; parentId: string | null; createdAt: string; values: SetupValues };

export type Version = {
  id: string;
  /** v1, v2, … in the order they were made. */
  label: string;
  parent: Version | null;
  values: SetupValues;
  sessions: TreeSession[];
  bestMs: number | null;
  /** Best lap minus the parent's best lap; null when either has no time. */
  deltaMs: number | null;
  /** Only driven in the wet: a branch apart, never the fastest line. */
  wet: boolean;
  onFastestLine: boolean;
  isFastest: boolean;
  isCurrent: boolean;
  /** Has no versions derived from it. */
  isLeaf: boolean;
  changes: string[];
};

const PAIRS: [string, string, string][] = [
  ["pressure_fl", "pressure_fr", "Druk voor"],
  ["pressure_rl", "pressure_rr", "Druk achter"],
  ["hot_pressure_fl", "hot_pressure_fr", "Warme druk voor"],
  ["hot_pressure_rl", "hot_pressure_rr", "Warme druk achter"],
];

/** "Druk achter 0,62 → 0,58", "Achteras medium → hard": a wheel pair changed alike reads as one. */
export function describeChanges(changes: SetupChange[]): string[] {
  const byName = new Map(changes.map((c) => [c.field.name, c]));
  const done = new Set<string>();
  const out: string[] = [];
  const text = (c: SetupChange) => `${formatSetupValue(c.field, c.from)} → ${formatSetupValue(c.field, c.to)}`;
  for (const [left, right, label] of PAIRS) {
    const a = byName.get(left);
    const b = byName.get(right);
    if (a && b && a.from === b.from && a.to === b.to) {
      out.push(`${label} ${text(a)}`);
      done.add(left).add(right);
    }
  }
  for (const change of changes) {
    if (done.has(change.field.name)) continue;
    out.push(`${change.field.label.replace(/ \(.*\)$/, "")} ${text(change)}`);
  }
  return out;
}

export function buildTree(setups: TreeSetup[], sessions: (TreeSession & { setupId: string })[]): Version[] {
  const ordered = [...setups].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const versions = new Map<string, Version>();
  ordered.forEach((s, i) => {
    const own = sessions.filter((x) => x.setupId === s.id).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const times = own.map((x) => x.bestLapMs).filter((ms): ms is number => ms !== null);
    versions.set(s.id, {
      id: s.id,
      label: `v${i + 1}`,
      parent: null,
      values: s.values,
      sessions: own,
      bestMs: times.length > 0 ? Math.min(...times) : null,
      deltaMs: null,
      wet: own.length > 0 && own.every((x) => x.wet),
      onFastestLine: false,
      isFastest: false,
      isCurrent: i === ordered.length - 1,
      isLeaf: true,
      changes: [],
    });
  });

  for (const s of ordered) {
    const v = versions.get(s.id)!;
    const parent = s.parentId ? (versions.get(s.parentId) ?? null) : null;
    v.parent = parent;
    if (parent) {
      parent.isLeaf = false;
      v.deltaMs = v.bestMs !== null && parent.bestMs !== null ? v.bestMs - parent.bestMs : null;
      v.changes = describeChanges(diffSetups(parent.values, v.values));
    } else {
      v.changes = ["Startpunt"];
    }
  }

  // The fastest dry version, and the line from the start to it (and on to the setup on the kart now,
  // when that was derived from it).
  const dry = [...versions.values()].filter((v) => !v.wet && v.bestMs !== null);
  const fastest = dry.reduce<Version | null>((best, v) => (best === null || v.bestMs! < best.bestMs! ? v : best), null);
  if (fastest) {
    fastest.isFastest = true;
    for (let v: Version | null = fastest; v; v = v.parent) v.onFastestLine = true;
    const current = [...versions.values()].find((v) => v.isCurrent)!;
    const chain: Version[] = [];
    for (let v: Version | null = current; v && !v.onFastestLine; v = v.parent) chain.push(v);
    // The current setup continues the fast line only when it descends from the fastest version.
    if (chain.length > 0 && chain.at(-1)!.parent?.isFastest) chain.forEach((v) => (v.onFastestLine = true));
  }
  return ordered.map((s) => versions.get(s.id)!);
}

/** Fields that have a value in at least one of two versions, for the side-by-side comparison. */
export function compareRows(a: SetupValues, b: SetupValues) {
  return SETUP_FIELDS.flatMap((field) => {
    const from = formatSetupValue(field, getSetupValue(a, field));
    const to = formatSetupValue(field, getSetupValue(b, field));
    if (from === "—" && to === "—") return [];
    return [{ key: field.name, label: field.label.replace(/ \(.*\)$/, ""), a: from, b: to, changed: from !== to }];
  });
}

