// One stroke icon set for the whole app (24×24, currentColor), plus the icon for each category of
// part, gear, expense, weather and session. Icons are decorative: the text next to them carries the
// meaning, so they are hidden from screen readers.

import type { SVGProps } from "react";

const PATHS = {
  // Navigation and actions
  home: "M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7",
  chevron: "M9 6l6 6-6 6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  // Racing
  kart: "M3 15h18M6 15l2-5h6l3 5M14 10l1-3h3M6.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  pin: "M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  stopwatch: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2.5M10 2h4M12 2v3",
  gauge: "M4 17a8 8 0 1 1 16 0M12 17l4-5M12 17h.01",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  compare: "M4 8h13M13 4l4 4-4 4M20 16H7M11 12l-4 4 4 4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6",
  // Costs
  receipt: "M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h3",
  euro: "M17 6.5A6 6 0 0 0 8 12a6 6 0 0 0 9 5.5M5 10h8M5 14h8",
  fuel: "M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M8 8h4M15 9l3 2v7a1.5 1.5 0 0 0 3 0V9l-3-3",
  ticket: "M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3zM14 4v16",
  bed: "M3 19V7M3 13h18v6M21 13a3 3 0 0 0-3-3h-7v3M7 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  car: "M5 16h14M6 16v2M18 16v2M5 16l1.5-5h11l1.5 5M8 11l1-3h6l1 3",
  badge: "M4 5h16v14H4zM8 10h4M8 14h8M15 9.5a1.5 1.5 0 1 0 0 .01",
  // Parts
  engine: "M4 10h3l2-3h6v3h3v6h-3v2H9l-2-2H4zM1 12h3M2 10v4M18 12h2",
  carburettor: "M8 3h8v5H8zM6 8h12v5H6zM10 13v8M14 13v4M4 10.5h2M18 10.5h2",
  exhaust: "M3 15h6a4 4 0 0 0 4-4V8a3 3 0 0 1 3-3h5M16 5v6M21 3v4",
  tyre: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 3v2M12 19v2M3 12h2M19 12h2",
  rim: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 10V3M13.9 12.6l6.5 2.4M10.1 12.6l-6.5 2.4",
  axle: "M2 12h20M5 8v8M19 8v8M9 10v4M15 10v4",
  sprocket: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  chain: "M9 15l6-6M8 11l-2 2a3 3 0 0 0 4.2 4.2l2-2M16 13l2-2a3 3 0 0 0-4.2-4.2l-2 2",
  seat: "M7 3h5a2 2 0 0 1 2 2v8h4a2 2 0 0 1 2 2v2H9a2 2 0 0 1-2-2zM9 17v4M17 17v4",
  brake: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 6.5A8.5 8.5 0 0 1 12 4",
  steering: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM3.5 10.5l6.5 1M20.5 10.5l-6.5 1M12 14v7",
  hub: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12 2v5M12 17v5",
  bodywork: "M3 17h18l-2-6H5zM7 11l2-4h6l2 4",
  logger: "M4 5h16v12H4zM8 21h8M12 17v4M7 13l3-3 2 2 4-4",
  part: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  // Gear
  helmet: "M3 15a9 9 0 0 1 18 0v2H11l-2 3H5a2 2 0 0 1-2-2zM12 10h9",
  suit: "M8 3h8l4 5-3 2v11H7V10L4 8zM12 3v8",
  gloves: "M7 21v-7L4 10V7l3 2V4a1 1 0 0 1 2 0v5V3a1 1 0 0 1 2 0v6V3.5a1 1 0 0 1 2 0V9V5a1 1 0 0 1 2 0v9l-2 7z",
  boots: "M6 3h5v9l7 3a3 3 0 0 1 3 3v2H6z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  neck: "M4 12a8 4 0 0 0 16 0M4 12a8 4 0 0 1 16 0M8 12v4M16 12v4",
  rain: "M7 16a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 0 1 17 16M8 19l-1 2M12 19l-1 2M16 19l-1 2",
  // Weather
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  cloud: "M7 18a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 11 3.5 3.5 0 0 1 17 18z",
  drizzle: "M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 8 3.5 3.5 0 0 1 17 15M9 18v1M13 18v2M17 18v1",
  other: "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM6 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-5", ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** A rounded tile with an icon, the visual anchor of a card or list row. */
export function IconTile({ name, tone = "brand", size = "md" }: { name: IconName; tone?: "brand" | "neutral" | "amber" | "red"; size?: "sm" | "md" | "lg" }) {
  const tones = {
    brand: "bg-brand-400/10 text-brand-300",
    neutral: "bg-zinc-800 text-zinc-300",
    amber: "bg-amber-400/10 text-amber-300",
    red: "bg-red-400/10 text-red-300",
  };
  const sizes = { sm: "size-8 rounded-lg [&>svg]:size-4", md: "size-10 rounded-xl [&>svg]:size-5", lg: "size-12 rounded-2xl [&>svg]:size-6" };
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center ${tones[tone]} ${sizes[size]}`}>
      <Icon name={name} />
    </span>
  );
}

export const PART_ICONS: Record<string, IconName> = {
  engine: "engine",
  carburettor: "carburettor",
  exhaust: "exhaust",
  tyre_set: "tyre",
  rim_set: "rim",
  rear_axle: "axle",
  sprocket: "sprocket",
  chain: "chain",
  seat: "seat",
  brake_disc: "brake",
  brake_pads: "brake",
  steering_wheel: "steering",
  front_hubs: "hub",
  spindle: "hub",
  bumper_bodywork: "bodywork",
  data_logger: "logger",
  other: "part",
};

export const GEAR_ICONS: Record<string, IconName> = {
  helmet: "helmet",
  suit: "suit",
  gloves: "gloves",
  boots: "boots",
  rib_protector: "shield",
  neck_brace: "neck",
  rain_suit: "rain",
  other: "other",
};

export const EXPENSE_ICONS: Record<string, IconName> = {
  entry_fee: "ticket",
  tyres: "tyre",
  fuel_oil: "fuel",
  parts: "part",
  engine_revision: "engine",
  track_rental: "flag",
  travel: "car",
  accommodation: "bed",
  licence: "badge",
  gear: "helmet",
  other: "other",
};

export const WEATHER_ICONS: Record<string, IconName> = { dry: "sun", damp: "drizzle", wet: "rain" };

export function iconFor(map: Record<string, IconName>, key: string): IconName {
  return map[key] ?? "other";
}
