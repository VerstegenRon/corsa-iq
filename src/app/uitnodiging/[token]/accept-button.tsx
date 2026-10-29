"use client";

import { useState, useTransition } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { primaryButtonClass } from "@/components/ui";

import { acceptInvite } from "../../dashboard/team-actions";

export function AcceptButton({ token }: { token: string }) {
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  return (
    <div className="mt-6 flex flex-col gap-4">
      <button type="button" disabled={isPending} onClick={() => startTransition(async () => setState(await acceptInvite(token)))} className={`${primaryButtonClass} self-start`}>
        {isPending ? "Bezig…" : "Lid worden"}
      </button>
      <FormMessage state={state} />
    </div>
  );
}
