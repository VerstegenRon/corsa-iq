// Run time, components and maintenance log, shared by the part page (engines and other parts) and
// the kart page (chassis).

import { DeleteButton } from "@/components/delete-button";
import { EditOnly } from "@/components/edit-access";
import { PlanLock } from "@/components/plan-lock";
import { cardClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format, type Locale } from "@/lib/i18n/locales";
import { formatCents, formatDate, formatMinutes, labelFor, sortedEntries } from "@/lib/karting";
import { limitState, type ComponentLimits, type LimitTone, type Usage } from "@/lib/part-usage";

import { deleteMaintenance, type MaintenanceTarget } from "../actions";
import { LimitsForm } from "./limits-form";
import { MaintenanceForm } from "./maintenance-form";

export type ComponentSet = "engine" | "chassis";

export function componentLabels(t: Dictionary, set: ComponentSet) {
  return set === "engine" ? t.options.engineComponents : t.options.chassisComponents;
}

const barClass: Record<LimitTone, string> = { ok: "bg-zinc-300", soon: "bg-amber-400", due: "bg-red-400" };
const statusClass: Record<LimitTone, string> = { ok: "", soon: "text-amber-300", due: "text-red-300" };

function Meter({ share, tone, label }: { share: number; tone: LimitTone; label: string }) {
  const percent = Math.min(share, 1) * 100;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
    >
      <div className={`h-full rounded-full ${barClass[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Total run time (never resets) and run time since the last resetting job, against its limit. */
export function UsageCards({ kind, usage, limit, t }: { kind: MaintenanceTarget["kind"]; usage: Usage; limit: number | null; t: Dictionary }) {
  const state = limitState(usage.sinceResetMinutes, limit);
  const te = t.equipment;
  const text = te.maintenanceCopy[kind];
  const hour = t.common.hourUnit;

  return (
    <section aria-label={te.runTime} className="grid gap-4 sm:grid-cols-2">
      <div className={cardClass}>
        <p className="text-sm text-zinc-400">{te.totalRunTime}</p>
        <p className="mt-2 text-3xl font-semibold">{formatMinutes(usage.totalMinutes, hour)}</p>
        <p className="mt-1 text-xs text-zinc-500">{te.totalHint}</p>
      </div>
      <div className={cardClass}>
        <p className="text-sm text-zinc-400">{text.since}</p>
        <p className="mt-2 text-3xl font-semibold">
          {formatMinutes(usage.sinceResetMinutes, hour)}
          {limit !== null && <span className="text-base font-normal text-zinc-500"> / {formatMinutes(limit, hour)}</span>}
        </p>
        {state ? (
          <>
            <div className="mt-3">
              <Meter share={state.share} tone={state.tone} label={format(te.limitShare, { limit: text.limitName })} />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {state.tone === "due"
                ? text.due
                : format(te.remaining, { time: formatMinutes(limit! - usage.sinceResetMinutes, hour), limit: text.limitName })}
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">{format(te.setLimit, { limit: text.limitName })}</p>
        )}
      </div>
    </section>
  );
}

/** Per component: last job, run time since, and its own limit with a meter. */
export function ComponentsSection({
  target,
  componentSet,
  usage,
  limits,
  canSetLimits,
  t,
  locale,
}: {
  target: MaintenanceTarget;
  componentSet: ComponentSet;
  usage: Usage;
  limits: ComponentLimits;
  /** Limits per component come with Driver; without it the form gives way to the lock card. */
  canSetLimits: boolean;
  t: Dictionary;
  locale: Locale;
}) {
  const te = t.equipment;
  const text = te.maintenanceCopy[target.kind];
  const hour = t.common.hourUnit;
  const statusText: Record<LimitTone, string> = { ok: "", soon: te.soon, due: te.dueNow };

  return (
    <section aria-labelledby="components-heading" className={cardClass}>
      <h2 id="components-heading" className="text-lg font-semibold">
        {te.components}
      </h2>
      <p className="mt-1 text-sm text-zinc-400">{text.componentsIntro}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-xs text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th scope="col" className="py-2 pr-4 font-medium">
                {te.colComponent}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {te.colLast}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {te.colSince}
              </th>
              <th scope="col" className="w-40 py-2 font-medium">
                {te.colLimit}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {sortedEntries(componentLabels(t, componentSet)).map(([key, label]) => {
              const component = usage.components[key];
              const limit = limits[key];
              const state = limitState(component.minutes, limit);
              return (
                <tr key={key}>
                  <td className="py-2 pr-4 text-zinc-200">{label}</td>
                  <td className="py-2 pr-4 text-zinc-400">{component.lastOn ? formatDate(component.lastOn, locale) : te.notYet}</td>
                  <td className="py-2 pr-4 text-right text-zinc-200 tabular-nums">{formatMinutes(component.minutes, hour)}</td>
                  <td className="py-2">
                    {state ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-400 tabular-nums">
                          {formatMinutes(limit, hour)}
                          {state.tone !== "ok" && (
                            <span className={`ml-2 font-medium ${statusClass[state.tone]}`}>
                              <span aria-hidden="true">{state.tone === "due" ? "● " : "▲ "}</span>
                              {statusText[state.tone]}
                            </span>
                          )}
                        </span>
                        <Meter share={state.share} tone={state.tone} label={format(te.componentMeter, { component: label.toLowerCase() })} />
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <EditOnly>
        <details className="group mt-6 border-t border-zinc-800/80 pt-6">
          <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              {te.setLimits}
              <span aria-hidden="true" className="text-zinc-500 transition-transform group-open:rotate-90">
                ›
              </span>
            </span>
          </summary>
          <p className="mt-2 mb-4 text-xs text-zinc-500">{text.limitsIntro}</p>
          {canSetLimits ? <LimitsForm target={target} componentSet={componentSet} limits={limits} /> : <PlanLock feature="limits" compact />}
        </details>
      </EditOnly>
    </section>
  );
}

type MaintenanceRecord = {
  id: string;
  performed_on: string;
  type: string;
  performed_by: string | null;
  description: string | null;
  resets_usage: boolean;
  components: string[];
  expenses: { amount_cents: number }[];
};

/** The maintenance log, newest first, with the form to add a job. */
export function MaintenanceSection({
  target,
  componentSet,
  records,
  today,
  t,
  locale,
}: {
  target: MaintenanceTarget;
  componentSet: ComponentSet | null;
  records: MaintenanceRecord[];
  today: string;
  t: Dictionary;
  locale: Locale;
}) {
  const te = t.equipment;
  const allComponents = { ...t.options.engineComponents, ...t.options.chassisComponents };

  return (
    <section aria-labelledby="maintenance-heading" className={cardClass}>
      <h2 id="maintenance-heading" className="text-lg font-semibold">
        {te.maintenance}
      </h2>
      {records.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">{te.noMaintenance}</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800/80">
          {records.map((record) => {
            const cost = record.expenses.reduce((sum, e) => sum + e.amount_cents, 0);
            const title = format(te.recordTitle, { type: labelFor(t.options.maintenanceTypes, record.type), date: formatDate(record.performed_on, locale) });
            return (
              <li key={record.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100">
                    {labelFor(t.options.maintenanceTypes, record.type)}
                    <span className="font-normal text-zinc-500">
                      {" "}
                      · {formatDate(record.performed_on, locale)}
                      {record.performed_by && ` · ${record.performed_by}`}
                      {record.resets_usage && ` · ${te.counterReset}`}
                    </span>
                  </p>
                  {record.components.length > 0 && (
                    <p className="mt-1 text-xs text-zinc-400">{record.components.map((c) => labelFor(allComponents, c)).join(" · ")}</p>
                  )}
                  {record.description && <p className="mt-1 text-xs text-zinc-500">{record.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {cost > 0 && <span className="text-sm tabular-nums">{formatCents(cost)}</span>}
                  <DeleteButton
                    compact
                    action={deleteMaintenance.bind(null, record.id)}
                    label={format(te.deleteRecord, { title })}
                    confirmText={[format(te.deleteRecordConfirm, { title }), cost > 0 ? te.deleteRecordCost : null, te.deleteRecordCounters]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <EditOnly>
        <details open={records.length === 0 || undefined} className="group mt-6 border-t border-zinc-800/80 pt-6">
          <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-flex size-5 items-center justify-center rounded-full bg-brand-400/15 text-brand-300 transition-transform group-open:rotate-45"
              >
                +
              </span>
              {te.logMaintenance}
            </span>
          </summary>
          <div className="mt-4">
            <MaintenanceForm target={target} componentSet={componentSet} today={today} />
            <p className="mt-3 text-xs text-zinc-500">{te.sameDayNote}</p>
          </div>
        </details>
      </EditOnly>
    </section>
  );
}
