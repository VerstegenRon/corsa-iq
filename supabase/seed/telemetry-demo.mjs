// Writes two TEST telemetry exports in the AiM CSV layout, for the design's Analyse example:
// a reference lap of 48,871 (teammate) and your best lap of 48,903, braking 9 m too early into T4.
//
//   node supabase/seed/telemetry-demo.mjs <out-dir>
//
// Import "TEST-jij.csv" at the qualifying of TEST Race Eurocircuit and "TEST-teamgenoot.csv" at the
// teammate's session. Synthetic data: a simple speed model per corner, sampled at 20 Hz.

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? ".";
const LENGTH = 1000;
const HZ = 20;
const VMAX = 112;
const BRAKE = 11.5; // m/s²
const ACCEL = 4.2;
const CORNERS = [
  { apex: 120, vmin: 58 },
  { apex: 260, vmin: 72 },
  { apex: 380, vmin: 50 },
  { apex: 520, vmin: 45 },
  { apex: 640, vmin: 78 },
  { apex: 760, vmin: 55 },
  { apex: 880, vmin: 62 },
];

/** Speed (km/h) at distance x for a driving style. */
function speedAt(x, style) {
  let v = VMAX;
  for (const [k, corner] of CORNERS.entries()) {
    const vmin = corner.vmin + (style.vmin?.[k] ?? 0);
    const early = style.brakeEarly?.[k] ?? 0;
    const vm = vmin / 3.6;
    for (const shift of [-LENGTH, 0, LENGTH]) {
      const apex = corner.apex + shift;
      const brakeAt = apex - early;
      // Braking early: at corner speed too soon, then rolling to the apex.
      const vc = early > 0 ? vm + 0.3 : vm;
      let env;
      if (x < brakeAt) env = Math.sqrt(vc * vc + 2 * BRAKE * (brakeAt - x));
      else if (x <= apex) env = vc + ((vm - vc) * (x - brakeAt)) / Math.max(1, early);
      else env = Math.sqrt(vm * vm + 2 * ACCEL * (x - apex));
      v = Math.min(v, env * 3.6);
    }
  }
  return v;
}

function lapTime(style, scale) {
  let t = 0;
  for (let x = 0; x < LENGTH; x += 0.5) t += 0.5 / ((speedAt(x, style) * scale) / 3.6);
  return t;
}

/** Scale so the lap takes `target` seconds (bisection; speeds scale, the shape stays). */
function scaleFor(style, target) {
  let lo = 0.5;
  let hi = 1.5;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (lapTime(style, mid) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function nearestCorner(x) {
  let best = { d: Infinity, k: 0 };
  for (const [k, c] of CORNERS.entries()) {
    for (const shift of [-LENGTH, 0, LENGTH]) {
      const d = Math.abs(x - (c.apex + shift));
      if (d < best.d) best = { d, k };
    }
  }
  return best;
}

let seed = 7;
const noise = (amp) => {
  seed = (seed * 16807) % 2147483647;
  return ((seed / 2147483647) * 2 - 1) * amp;
};

function session(laps) {
  const rows = [];
  const markers = [];
  let t = 0;
  let total = 0;
  for (const lap of laps) {
    const scale = scaleFor(lap.style, lap.time);
    let x = 0;
    let prevV = speedAt(0, lap.style) * scale;
    while (x < LENGTH) {
      const v = speedAt(x, lap.style) * scale;
      const ms = v / 3.6;
      const { d, k } = nearestCorner(x);
      const radius = d < 45 ? 14 + d * 0.9 + k : Infinity;
      const lat = (ms * ms) / (9.81 * radius) * (k % 2 ? -1 : 1);
      const lon = ((v - prevV) / 3.6) * HZ / 9.81;
      rows.push([
        t.toFixed(3),
        (total + x).toFixed(1),
        (v + noise(0.3)).toFixed(1),
        Math.round(v * 128 + 1500 + noise(60)),
        (Math.abs(lat) < 0.02 ? noise(0.03) : lat + noise(0.03)).toFixed(2),
        Math.max(-1.6, Math.min(0.8, lon + noise(0.02))).toFixed(2),
      ]);
      prevV = v;
      x += ms / HZ;
      t += 1 / HZ;
    }
    // The line is crossed between two samples: the exact lap time comes from the beacon.
    const end = (markers.at(-1) ?? 0) + lap.time;
    t = end; // the next lap starts at the beacon
    markers.push(Math.round(end * 1000) / 1000);
    total += LENGTH;
  }
  return { rows, markers };
}

function csv({ rows, markers }, racer) {
  const q = (cells) => cells.map((c) => `"${c}"`).join(",");
  return [
    q(["Format", "AiM CSV File"]),
    q(["Venue", "Eurocircuit"]),
    q(["Vehicle", "TEST Kart A"]),
    q(["Racer", racer]),
    q(["Championship", "TEST"]),
    q(["Sample Rate", HZ]),
    q(["Beacon Markers", ...markers.map((m) => m.toFixed(3))]),
    "",
    q(["Time", "Distance", "GPS Speed", "RPM", "GPS LatAcc", "GPS LonAcc"]),
    q(["s", "m", "km/h", "rpm", "g", "g"]),
    "",
    ...rows.map((r) => r.join(",")),
  ].join("\r\n");
}

const you = { vmin: [0, 2, 0, 0, 0, 1.5, 0], brakeEarly: [0, 0, 0, 9, 0, 0, 0] };
const ref = {};
const slow = { vmin: [-6, -6, -6, -6, -6, -6, -6] };

writeFileSync(
  join(out, "TEST-jij.csv"),
  csv(
    session([
      { style: slow, time: 58.42 },
      { style: you, time: 49.312 },
      { style: you, time: 49.105 },
      { style: you, time: 48.998 },
      { style: you, time: 48.903 },
      { style: you, time: 49.05 },
      { style: slow, time: 56.88 },
    ]),
    "TEST",
  ),
);
writeFileSync(
  join(out, "TEST-teamgenoot.csv"),
  csv(
    session([
      { style: slow, time: 57.9 },
      { style: ref, time: 49.204 },
      { style: ref, time: 48.99 },
      { style: ref, time: 48.871 },
      { style: ref, time: 49.032 },
    ]),
    "TEST Teamgenoot",
  ),
);
console.log("written to", out);
