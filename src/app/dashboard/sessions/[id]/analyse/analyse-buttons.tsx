"use client";

import { useState, useTransition } from "react";

import { useCanEdit } from "@/components/edit-access";
import type { FormState } from "@/components/form-message";
import { secondaryButtonClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/locales";
import type { Corner } from "@/lib/telemetry";

import { sendPitMessage } from "../../../live-actions";
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
  const t = useT();
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  if (!useCanEdit()) return null;
  return (
    <span className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => setState(await setReferenceLap(sessionId, pinned ? null : lapId)))}
        className={secondaryButtonClass}
      >
        {isPending ? t.common.busy : pinned ? t.telemetry.unpin : t.telemetry.pin}
      </button>
      <Status state={state} />
    </span>
  );
}

/** Puts the advice on the pit board, for the kart's live session when one runs. */
export function PitboardButton({ liveId, text }: { liveId: string | null; text: string }) {
  const t = useT();
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  if (!useCanEdit()) return null;
  return (
    <span className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => setState(await sendPitMessage(liveId, text)))}
        className="inline-flex min-h-11 items-center border border-current px-4 text-sm font-bold hover:bg-zinc-950/10 disabled:opacity-60"
      >
        {isPending ? t.common.busy : t.telemetry.toPitboard}
      </button>
      {(state.error || state.success) && (
        <span role={state.error ? "alert" : "status"} className="text-sm font-semibold">
          {state.error ?? state.success}
        </span>
      )}
    </span>
  );
}

/** Keeps the corners found in the reference lap for this layout. */
export function SaveCornersButton({
  sessionId,
  layoutId,
  layoutName,
  corners,
}: {
  sessionId: string;
  layoutId: string;
  layoutName: string;
  corners: Corner[];
}) {
  const t = useT();
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  if (!useCanEdit()) return null;
  return (
    <span className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => setState(await saveCorners(sessionId, layoutId, corners)))}
        className={secondaryButtonClass}
      >
        {isPending ? t.common.busy : format(t.telemetry.saveCorners, { layout: layoutName })}
      </button>
      <Status state={state} />
    </span>
  );
}
