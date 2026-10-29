"use client";

import { useState, useTransition } from "react";

import type { FormState } from "@/components/form-message";
import { secondaryButtonClass } from "@/components/ui";
import type { Corner } from "@/lib/telemetry";

import { saveCorners, setReferenceLap } from "../../../telemetry-actions";

function Status({ state }: { state: FormState }) {
  if (!state.error && !state.success) return null;
  return (
    <span role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-red-300" : "text-zinc-400"}`}>
      {state.error ?? state.success}
    </span>
  );
}

/** Pins the shown reference as this session's default, or lets it go again. */
export function ReferenceButton({ sessionId, lapId, pinned }: { sessionId: string; lapId: number; pinned: boolean }) {
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  return (
    <span className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => setState(await setReferenceLap(sessionId, pinned ? null : lapId)))}
        className={secondaryButtonClass}
      >
        {isPending ? "Bezig…" : pinned ? "Referentie loslaten" : "Vastzetten als referentie"}
      </button>
      <Status state={state} />
    </span>
  );
}

/** Keeps the corners found in the reference lap for this layout. */
export function SaveCornersButton({ sessionId, layoutId, layoutName, corners }: { sessionId: string; layoutId: string; layoutName: string; corners: Corner[] }) {
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  return (
    <span className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => setState(await saveCorners(sessionId, layoutId, corners)))}
        className={secondaryButtonClass}
      >
        {isPending ? "Bezig…" : `Bochten vastleggen voor ${layoutName}`}
      </button>
      <Status state={state} />
    </span>
  );
}
