"use client";

// "Klaar voor Q1?": the pre-start checklist, made for the paddock with gloves on. Tap a tyre to enter
// its cold pressure, tap a row to tick it off; every result is saved straight away and the page
// recomputes the count. The band of a tolerance meter is the target, the line is your measurement.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useCanEdit } from "@/components/edit-access";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { TYRE_TOLERANCE_BAR, tally, tyreAdvice, type CheckStatus, type Corner } from "@/lib/prestart";

import { lockSetup, saveTyreReading, setCheck, unlockSetup, type PrestartContext } from "../prestart-actions";

export type BoardTyre = { corner: Corner; target: number | null; value: number | null; status: CheckStatus };
export type BoardRow = { key: string; name: string; spec: string; value: string; status: CheckStatus; kind: "confirm" | "measure" | "auto" };

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";
const bar = (v: number, digits = 3) => v.toFixed(digits).replace(".", ",");

const MARK: Record<CheckStatus, { sign: string; box: string; value: string; label: string }> = {
  ok: { sign: "✓", box: "border-brand-400 bg-brand-500 text-on-brand", value: "text-zinc-50", label: "in orde" },
  warn: { sign: "!", box: "border-amber-400 bg-amber-400 text-zinc-950", value: "text-amber-300", label: "let op" },
  fail: { sign: "!", box: "border-red-400 bg-red-400 text-zinc-950", value: "text-red-300", label: "buiten tolerantie" },
  open: { sign: "", box: "border-zinc-600", value: "text-zinc-500", label: "open" },
};

function ToleranceMeter({ value, target }: { value: number | null; target: number | null }) {
  if (target === null) return <div className="mt-1.5 h-[18px] text-[11px] text-zinc-500">geen doel in de setup</div>;
  const range = TYRE_TOLERANCE_BAR * 3;
  const pct = value === null ? null : Math.max(0, Math.min(99, ((value - (target - range)) / (range * 2)) * 100));
  const ok = value !== null && Math.abs(value - target) <= TYRE_TOLERANCE_BAR + 1e-9;
  return (
    <div aria-hidden="true" className="relative mt-1.5 h-[18px]">
      <div className="absolute inset-x-0 top-2 h-0.5 bg-zinc-800" />
      <div className="absolute top-[3px] h-3 border-x border-brand-400/60 bg-brand-500/15" style={{ left: "33.3%", width: "33.4%" }} />
      {pct !== null && <div className={`absolute top-0 h-[18px] w-0.5 ${ok ? "bg-zinc-50" : "bg-red-400"}`} style={{ left: `${pct}%` }} />}
    </div>
  );
}

export function PrestartBoard({
  ctx,
  label,
  eventName,
  upcoming,
  tyres,
  temperature,
  rows,
  locked,
  setupLabel,
  compare,
}: {
  ctx: PrestartContext;
  label: string;
  eventName: string;
  upcoming: boolean;
  tyres: BoardTyre[];
  temperature: string | null;
  rows: BoardRow[];
  locked: boolean;
  setupLabel: string | null;
  compare: { title: string; changes: string[] } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Corner | null>(null);
  const [draft, setDraft] = useState("");
  const [chainOpen, setChainOpen] = useState(false);
  const [chainDraft, setChainDraft] = useState("");
  const [confirmLock, setConfirmLock] = useState(false);
  // Viewers see the checklist and the measurements, but cannot measure, tick or lock.
  const canEdit = useCanEdit();

  const statuses = [...tyres.map((t) => t.status), ...rows.map((r) => r.status)];
  const count = tally(statuses);
  const todo = statuses.filter((s, i) => (s === "open" || s === "fail") && !(i === statuses.length - 1)).length;

  const run = (action: () => Promise<{ error?: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.error) setError(result.error);
      else {
        after?.();
        router.refresh();
      }
    });

  const startEdit = (tyre: BoardTyre) => {
    setEditing(tyre.corner);
    setDraft(bar(tyre.value ?? tyre.target ?? 0.6, 3));
  };
  const step = (delta: number) => {
    const v = Number(draft.replace(",", ".")) || 0;
    setDraft(bar(Math.max(0, Math.round((v + delta) * 1000) / 1000)));
  };
  const failed = tyres.filter((t) => t.status === "fail" && t.value !== null && t.target !== null);

  return (
    <>
      <section aria-labelledby="ready-heading">
        <div className="flex items-end justify-between gap-4">
          <h1 id="ready-heading" className="text-[34px] leading-[0.95] sm:text-5xl">
            Klaar
            <br />
            voor {label}
            <span className="text-brand-400">?</span>
          </h1>
          <p className="font-mono text-5xl leading-[0.85] font-bold sm:text-6xl" aria-label={`${count.ok} van ${count.total} in orde`}>
            {count.ok}
            <span className="text-zinc-600">/{count.total}</span>
          </p>
        </div>
        <div aria-hidden="true" className="mt-3.5 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${count.total}, minmax(0, 1fr))` }}>
          {[...Array(count.ok).fill("ok"), ...Array(count.fail).fill("fail"), ...Array(count.open).fill("open")].map((s, i) => (
            <span key={i} className={`h-2 ${s === "ok" ? "bg-brand-500" : s === "fail" ? "bg-red-400" : "bg-zinc-800"}`} />
          ))}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-3.5 text-xs text-zinc-500">
          <span>
            <span className="text-brand-400">■</span> {count.ok} in orde
          </span>
          <span>
            <span className="text-red-400">■</span> {count.fail} buiten tolerantie
          </span>
          <span>□ {count.open} open</span>
        </p>
        {upcoming && <p className="mt-2 text-sm text-zinc-400">Voor je volgende evenement: {eventName}.</p>}
      </section>

      <section aria-labelledby="tyres-heading" className="crop border border-zinc-800 p-3.5">
        <div className="channel-label flex justify-between">
          <h2 id="tyres-heading">Bandendruk · koud · bar</h2>
          {temperature && <span>{temperature}</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-px bg-zinc-800">
          {tyres.map((tyre) => {
            const mark = MARK[tyre.status];
            return (
              <button
                key={tyre.corner}
                type="button"
                onClick={() => startEdit(tyre)}
                disabled={!canEdit}
                aria-pressed={editing === tyre.corner}
                aria-label={`${tyre.corner}: ${tyre.value === null ? "nog niet gemeten" : `${bar(tyre.value)} bar, ${mark.label}`}. Meten.`}
                className={`bg-zinc-950 p-3 text-left transition-colors enabled:hover:bg-zinc-900 ${focusRing} ${editing === tyre.corner ? "outline-2 -outline-offset-2 outline-brand-400" : ""}`}
              >
                <span className="flex justify-between font-mono text-[11px] text-zinc-500">
                  <span>{tyre.corner}</span>
                  <span>{tyre.target !== null ? `${bar(tyre.target, 2)} ±${bar(TYRE_TOLERANCE_BAR, 2)}` : "—"}</span>
                </span>
                <span
                  className={`mt-1 block font-mono text-[26px] font-bold ${tyre.status === "fail" ? "text-red-300" : tyre.value === null ? "text-zinc-600" : "text-zinc-50"}`}
                >
                  {tyre.value === null ? "meet" : bar(tyre.value)}
                </span>
                <ToleranceMeter value={tyre.value} target={tyre.target} />
              </button>
            );
          })}
        </div>

        {editing && (
          <form
            className="mt-3 flex flex-col gap-2 border border-zinc-700 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const corner = editing;
              run(
                () => saveTyreReading(ctx, corner, Number(draft.replace(",", "."))),
                () => setEditing(null),
              );
            }}
          >
            <label className="channel-label" htmlFor="tyre-input">
              Meting {editing} · koud
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => step(-0.01)} aria-label="0,01 lager" className={`${secondaryButtonClass} min-h-14 w-14 text-xl`}>
                −
              </button>
              <input
                id="tyre-input"
                inputMode="decimal"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={`h-14 min-w-0 flex-1 border border-zinc-700 bg-zinc-950 text-center font-mono text-2xl font-bold text-zinc-50 ${focusRing}`}
              />
              <button type="button" onClick={() => step(0.01)} aria-label="0,01 hoger" className={`${secondaryButtonClass} min-h-14 w-14 text-xl`}>
                +
              </button>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className={`${primaryButtonClass} flex-1`}>
                {pending ? "Opslaan…" : "Bevestig meting"}
              </button>
              <button type="button" onClick={() => setEditing(null)} className={`${secondaryButtonClass} min-h-14`}>
                Annuleren
              </button>
            </div>
          </form>
        )}

        {failed.map((tyre) => (
          <p key={tyre.corner} className="mt-3 flex items-center gap-2.5 border border-red-400 bg-red-500/10 px-3 py-2.5 text-sm">
            <span className="font-mono text-xs font-bold text-red-300">{tyre.corner}</span>
            {tyreAdvice(tyre.value!, tyre.target!)}
          </p>
        ))}
      </section>

      <section aria-labelledby="engine-heading" className="border border-zinc-800">
        <h2 id="engine-heading" className="channel-label border-b border-zinc-800 px-3.5 py-3">
          Motor &amp; aandrijving
        </h2>
        <ul>
          {rows.map((row) => {
            const mark = MARK[row.status];
            const content = (
              <>
                <span aria-hidden="true" className={`flex size-[22px] shrink-0 items-center justify-center border text-[13px] font-bold ${mark.box}`}>
                  {mark.sign}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[15px] font-semibold">{row.name}</span>
                  <span className="block text-xs text-zinc-500">{row.spec}</span>
                </span>
                <span className={`font-mono text-[15px] font-bold ${mark.value}`}>{row.value}</span>
                <span className="sr-only">, {mark.label}</span>
              </>
            );
            const base = `flex min-h-14 w-full items-center gap-3 px-3.5`;
            return (
              <li key={row.key} className="border-b border-zinc-800/60 last:border-b-0">
                {!canEdit ? (
                  <div className={base}>{content}</div>
                ) : row.kind === "confirm" ? (
                  <button
                    type="button"
                    aria-pressed={row.status === "ok"}
                    disabled={pending}
                    onClick={() => run(() => setCheck(ctx, row.key, { value: row.value, done: row.status !== "ok" }))}
                    className={`${base} transition-colors hover:bg-zinc-900 ${focusRing}`}
                  >
                    {content}
                  </button>
                ) : row.kind === "measure" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setChainOpen((v) => !v)}
                      aria-expanded={chainOpen}
                      className={`${base} transition-colors hover:bg-zinc-900 ${focusRing}`}
                    >
                      {content}
                    </button>
                    {chainOpen && (
                      <form
                        className="flex gap-2 px-3.5 pb-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(
                            () => setCheck(ctx, "chain", { value: chainDraft }),
                            () => setChainOpen(false),
                          );
                        }}
                      >
                        <label className="sr-only" htmlFor="chain-input">
                          Speling in mm
                        </label>
                        <input
                          id="chain-input"
                          inputMode="decimal"
                          autoFocus
                          value={chainDraft}
                          onChange={(e) => setChainDraft(e.target.value)}
                          placeholder="12"
                          className={`h-14 min-w-0 flex-1 border border-zinc-700 bg-zinc-950 px-3 font-mono text-xl text-zinc-50 ${focusRing}`}
                        />
                        <button type="submit" disabled={pending} className={primaryButtonClass}>
                          Opslaan
                        </button>
                      </form>
                    )}
                  </>
                ) : (
                  <div className={base}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {compare && (
        <Link href="/dashboard/setups" className={`block border border-ref p-3.5 ${focusRing}`}>
          <span className="flex justify-between font-mono text-[11px] tracking-[0.08em] uppercase">
            <span className="text-ref">{compare.title}</span>
            <span className="text-zinc-500">Bekijk →</span>
          </span>
          {compare.changes.length > 0 && (
            <span className="mt-2.5 flex flex-wrap gap-1.5">
              {compare.changes.map((c) => (
                <span key={c} className="border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-xs">
                  {c}
                </span>
              ))}
            </span>
          )}
        </Link>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      {locked ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-brand-400 px-4 py-3">
          <span className="font-semibold">
            <span className="text-brand-300">✓</span> Setup {setupLabel} vergrendeld voor {label}
          </span>
          {canEdit && (
            <button type="button" disabled={pending} onClick={() => run(() => unlockSetup(ctx))} className={secondaryButtonClass}>
              Ontgrendel
            </button>
          )}
        </div>
      ) : !canEdit ? null : confirmLock ? (
        <div className="flex flex-col gap-2 border border-amber-400 p-3">
          <p className="text-sm">
            Nog {todo} te doen. Toch vergrendelen voor {label}?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => lockSetup(ctx),
                  () => setConfirmLock(false),
                )
              }
              className={`${primaryButtonClass} flex-1`}
            >
              Ja, vergrendelen
            </button>
            <button type="button" onClick={() => setConfirmLock(false)} className={`${secondaryButtonClass} min-h-14`}>
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending || !ctx.setupId}
          onClick={() => (todo > 0 ? setConfirmLock(true) : run(() => lockSetup(ctx)))}
          className={`${primaryButtonClass} min-h-[60px] justify-between text-[17px]`}
        >
          <span>{ctx.setupId ? `Vergrendel setup voor ${label}` : "Nog geen setup om te vergrendelen"}</span>
          {todo > 0 && <span className="font-mono text-[13px]">{todo} TE DOEN</span>}
        </button>
      )}
    </>
  );
}
