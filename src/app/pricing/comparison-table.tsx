"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";
import type { PlanKey, PlanValue } from "@/lib/pricing";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

type Plan = { key: PlanKey; name: string; price: string };
type Group = {
  key: string;
  label: string;
  /** `addon`: the price of the extra per plan, shown where that plan can buy it. */
  rows: { key: string; label: string; values: Record<PlanKey, PlanValue>; addon?: Partial<Record<PlanKey, string>> }[];
};

/**
 * Every feature against every plan. From md all four plans stand side by side; on a phone the
 * table shows one plan at a time, picked above it, so nothing scrolls sideways.
 */
export function ComparisonTable({
  plans,
  groups,
  featured,
  labels,
}: {
  plans: Plan[];
  groups: Group[];
  featured: PlanKey;
  labels: { feature: string; pickPlan: string; unlimited: string; included: string; notIncluded: string };
}) {
  const [picked, setPicked] = useState<PlanKey>(featured);

  // Hidden on a phone unless picked; always shown from md.
  const column = (key: PlanKey) => `${key === picked ? "" : "hidden md:table-cell"} ${key === featured ? "bg-brand-500/[0.06]" : ""}`;

  const cell = (value: PlanValue, addon?: string) => {
    if (value === "addon") return <span className="text-xs whitespace-nowrap text-zinc-300 tabular-nums">{addon}</span>;
    if (value === true)
      return (
        <>
          <Icon name="check" className="mx-auto size-4 text-brand-300" />
          <span className="sr-only">{labels.included}</span>
        </>
      );
    if (value === false)
      return (
        <>
          <span aria-hidden="true" className="text-zinc-600">
            —
          </span>
          <span className="sr-only">{labels.notIncluded}</span>
        </>
      );
    return <span className="font-medium text-zinc-100 tabular-nums">{value === "unlimited" ? labels.unlimited : value}</span>;
  };

  return (
    <div>
      <div role="group" aria-label={labels.pickPlan} className="mb-4 grid grid-cols-4 gap-1 rounded-2xl border border-zinc-800 p-1 md:hidden">
        {plans.map((plan) => (
          <button
            key={plan.key}
            type="button"
            aria-pressed={picked === plan.key}
            onClick={() => setPicked(plan.key)}
            className={`min-h-11 truncate rounded-xl px-1 text-sm font-medium transition-colors ${focusRing} ${
              picked === plan.key ? "bg-brand-500 text-on-brand" : "text-zinc-300 hover:text-white"
            }`}
          >
            {plan.name}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-800/80">
        <table className="w-full text-left text-sm md:table-fixed">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th scope="col" className="px-4 py-4 font-medium text-zinc-400 sm:px-6 md:w-[36%]">
                {labels.feature}
              </th>
              {plans.map((plan) => (
                <th key={plan.key} scope="col" className={`px-2 py-4 text-center ${column(plan.key)}`}>
                  <span className="block font-semibold text-zinc-50">{plan.name}</span>
                  <span className="mt-0.5 block text-xs font-normal whitespace-nowrap text-zinc-400 tabular-nums md:whitespace-normal">
                    {plan.price}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.key} className="divide-y divide-zinc-800/60">
              <tr className="bg-zinc-900/30">
                <th
                  scope="colgroup"
                  colSpan={plans.length + 1}
                  className="px-4 pt-6 pb-2 text-xs font-semibold tracking-wide text-brand-300 uppercase sm:px-6"
                >
                  {group.label}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="px-4 py-3 font-normal text-zinc-200 sm:px-6">
                    {row.label}
                  </th>
                  {plans.map((plan) => (
                    <td key={plan.key} className={`px-2 py-3 text-center ${column(plan.key)}`}>
                      {cell(row.values[plan.key], row.addon?.[plan.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
