// One finding per row: the sentence, what it rests on and how sure it is.

import { formatLapTime } from "@/lib/karting";
import { CONFIDENCE, insightSentence, type Confidence, type Insight } from "@/lib/setup-advisor";

const BADGE: Record<Confidence, string> = {
  strong: "border-zinc-500 text-zinc-100",
  fair: "border-zinc-700 text-zinc-300",
  weak: "border-dashed border-zinc-700 text-zinc-500",
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span title={CONFIDENCE[confidence].hint} className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs ${BADGE[confidence]}`}>
      {CONFIDENCE[confidence].label}
    </span>
  );
}

export function InsightList({ insights, showTrack = true, showKart = true }: { insights: Insight[]; showTrack?: boolean; showKart?: boolean }) {
  return (
    <ul className="divide-y divide-zinc-800/80">
      {insights.map((insight) => (
        <li key={insight.id} className="flex flex-col gap-1.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-zinc-100">{insightSentence(insight, { track: showTrack, kart: showKart })}</p>
            <ConfidenceBadge confidence={insight.confidence} />
          </div>
          <p className="text-xs text-zinc-500 tabular-nums">
            {insight.best.text}: {insight.best.sessions} sessies, snelste {formatLapTime(insight.best.bestMs)} · {insight.other.text}:{" "}
            {insight.other.sessions} sessies, snelste {formatLapTime(insight.other.bestMs)}
          </p>
          {insight.alsoChanged.length > 0 && (
            <p className="text-xs text-amber-200">
              Let op: in dezelfde sessies was ook anders: {insight.alsoChanged.join(", ").toLowerCase()}. Welke het verschil maakte, is niet te
              zeggen.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Shown while there is nothing to compare yet. */
export function NoInsights() {
  return (
    <p className="text-sm text-zinc-400">
      Nog te weinig om te vergelijken. De adviseur zoekt een instelling die je minstens twee sessies reed, tegen een andere die je ook
      minstens twee keer reed: op hetzelfde circuit, met dezelfde kart en bij hetzelfde weer. Vul bij je sessies het weer en de
      afstelling in, dan verschijnen hier vanzelf de eerste verbanden.
    </p>
  );
}
