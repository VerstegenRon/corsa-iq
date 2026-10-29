// Labels for the driver's feedback, as Claude derives them from the text (see feedback-tagger.ts).
// Fixed keys, so chips stay the same across languages and feedback can be filtered later.

export const HANDLING = {
  understeer: "Onderstuur",
  oversteer: "Overstuur",
  balanced: "Goede balans",
} as const;

export const CORNER_PHASES = {
  braking: "Remmen",
  entry: "Insturen",
  apex: "Apex",
  exit: "Uitkomen",
  straight: "Rechte stuk",
} as const;

export const FEEDBACK_TOPICS = {
  grip: "Grip",
  tyres: "Banden",
  engine: "Motor",
  brakes: "Remmen",
  steering: "Stuur",
  chassis: "Chassis",
  seat: "Stoel",
  driving: "Rijstijl",
  other: "Overig",
} as const;

export const FEEDBACK_MOODS = {
  positive: "Positief",
  neutral: "Neutraal",
  negative: "Ontevreden",
} as const;

export type Handling = keyof typeof HANDLING;
export type CornerPhase = keyof typeof CORNER_PHASES;
export type FeedbackTopic = keyof typeof FEEDBACK_TOPICS;
export type FeedbackMood = keyof typeof FEEDBACK_MOODS;

export type FeedbackTags = {
  handling: Handling[];
  /** Corners as the driver names them: a number ("3") or a name ("haarspeld"). */
  corners: string[];
  phases: CornerPhase[];
  topics: FeedbackTopic[];
  mood: FeedbackMood;
};

function keysOf<T extends Record<string, string>>(values: unknown, labels: T): (keyof T & string)[] {
  return Array.isArray(values) ? [...new Set(values.filter((v): v is keyof T & string => typeof v === "string" && v in labels))] : [];
}

/** Reads stored (or model) output defensively: unknown keys are dropped, never shown. */
export function parseFeedbackTags(value: unknown): FeedbackTags | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const corners = Array.isArray(raw.corners)
    ? [...new Set(raw.corners.filter((c): c is string => typeof c === "string").map((c) => c.trim().slice(0, 30)).filter(Boolean))].slice(0, 6)
    : [];
  return {
    handling: keysOf(raw.handling, HANDLING),
    corners,
    phases: keysOf(raw.phases, CORNER_PHASES),
    topics: keysOf(raw.topics, FEEDBACK_TOPICS),
    mood: typeof raw.mood === "string" && raw.mood in FEEDBACK_MOODS ? (raw.mood as FeedbackMood) : "neutral",
  };
}

/** "3" → "Bocht 3"; a name stays as it is, with a capital. */
export function cornerLabel(corner: string) {
  return /^\d+$/.test(corner) ? `Bocht ${corner}` : corner.charAt(0).toUpperCase() + corner.slice(1);
}
