// The labels on a driver's feedback as chips: the tapped debrief tags and handling first (the accent),
// then corners, phases, topics and, when it is not neutral, the mood.

import { Chip } from "@/components/meter";
import { CORNER_PHASES, FEEDBACK_MOODS, FEEDBACK_TOPICS, HANDLING, QUICK_TAGS, cornerLabel, type FeedbackTags as Tags } from "@/lib/feedback";

export function FeedbackTags({ tags, className = "" }: { tags: Tags | null; className?: string }) {
  if (!tags) return null;
  const chips = [
    ...tags.quick.map((key) => ({ key: `q-${key}`, label: QUICK_TAGS[key], tone: "brand" as const })),
    ...tags.handling.map((key) => ({ key: `h-${key}`, label: HANDLING[key], tone: "brand" as const })),
    ...tags.corners.map((corner) => ({ key: `c-${corner}`, label: cornerLabel(corner), tone: "neutral" as const })),
    ...tags.phases.map((key) => ({ key: `p-${key}`, label: CORNER_PHASES[key], tone: "neutral" as const })),
    // "Remmen" can be both a phase and a topic; show it once.
    ...tags.topics
      .filter((key) => !(key === "brakes" && tags.phases.includes("braking")))
      .map((key) => ({ key: `t-${key}`, label: FEEDBACK_TOPICS[key], tone: "neutral" as const })),
    ...(tags.mood === "neutral" ? [] : [{ key: "mood", label: FEEDBACK_MOODS[tags.mood], tone: "neutral" as const }]),
  ];
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Labels bij de feedback" className={`flex flex-wrap gap-1.5 ${className}`}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </li>
      ))}
    </ul>
  );
}
