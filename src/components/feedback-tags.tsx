// The labels on a driver's feedback as chips: the tapped debrief tags and handling first (the accent),
// then corners, phases, topics and, when it is not neutral, the mood.

import { Chip } from "@/components/meter";
import type { FeedbackTags as Tags } from "@/lib/feedback";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format } from "@/lib/i18n/locales";

/** A corner as the driver named it: a number becomes "Bocht 3", a name keeps its own words. */
function cornerLabel(corner: string, tf: Dictionary["feedback"]) {
  return /^d+$/.test(corner) ? format(tf.corner, { n: corner }) : corner.charAt(0).toUpperCase() + corner.slice(1);
}

export function FeedbackTags({ tags, t, className = "" }: { tags: Tags | null; t: Dictionary; className?: string }) {
  if (!tags) return null;
  const tf = t.feedback;
  const chips = [
    ...tags.quick.map((key) => ({ key: `q-${key}`, label: tf.quick[key], tone: "brand" as const })),
    ...tags.handling.map((key) => ({ key: `h-${key}`, label: tf.handling[key], tone: "brand" as const })),
    ...tags.corners.map((corner) => ({ key: `c-${corner}`, label: cornerLabel(corner, tf), tone: "neutral" as const })),
    ...tags.phases.map((key) => ({ key: `p-${key}`, label: tf.phases[key], tone: "neutral" as const })),
    // "Remmen" can be both a phase and a topic; show it once.
    ...tags.topics
      .filter((key) => !(key === "brakes" && tags.phases.includes("braking")))
      .map((key) => ({ key: `t-${key}`, label: tf.topics[key], tone: "neutral" as const })),
    ...(tags.mood === "neutral" ? [] : [{ key: "mood", label: tf.moods[tags.mood], tone: "neutral" as const }]),
  ];
  if (chips.length === 0) return null;
  return (
    <ul aria-label={tf.chipsLabel} className={`flex flex-wrap gap-1.5 ${className}`}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </li>
      ))}
    </ul>
  );
}
