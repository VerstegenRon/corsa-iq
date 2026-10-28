"use client";

// Form controls that need less typing: choices as chips or tiles (radio buttons underneath, so they
// submit like any field), a number with − and + buttons, and a fold-out for the less used fields.

import { useId, useRef, type ReactNode } from "react";

import { Icon, type IconName } from "@/components/icons";
import { inputClass } from "@/components/ui";

const focusWithin = "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-400";

export type Choice = { value: string; label: string; icon?: IconName };

/**
 * One choice from a few options. "chips" is a row of pills; "tiles" a grid of icon tiles for longer
 * lists such as categories.
 */
export function ChoiceChips({
  name,
  legend,
  options,
  defaultValue,
  required = false,
  variant = "chips",
  className = "col-span-full",
}: {
  name: string;
  legend: string;
  options: Choice[];
  defaultValue?: string | null;
  required?: boolean;
  variant?: "chips" | "tiles";
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm text-zinc-300">
        {legend}
        {required && " *"}
      </legend>
      <div className={variant === "tiles" ? "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" : "flex flex-wrap gap-2"}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`cursor-pointer border text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white has-[:checked]:border-brand-400 has-[:checked]:bg-brand-500/15 has-[:checked]:font-medium has-[:checked]:text-white has-[:checked]:ring-1 has-[:checked]:ring-brand-400 [&:has(:checked)>svg]:text-brand-300 ${focusWithin} ${
              variant === "tiles"
                ? "flex flex-col items-center justify-center gap-1.5 rounded-2xl border-zinc-800 px-1 py-3 text-center text-xs"
                : "inline-flex h-10 items-center gap-1.5 rounded-full border-zinc-800 px-3.5 text-sm"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              required={required}
              className="sr-only"
            />
            {option.icon && <Icon name={option.icon} className={variant === "tiles" ? "size-6" : "size-4"} />}
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A number with − and + buttons, e.g. tyre pressure in steps of 0,01 or teeth in steps of 1. */
export function Stepper({
  name,
  label,
  defaultValue,
  placeholder,
  step = 1,
  decimals = 0,
  min = 0,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  step?: number;
  decimals?: number;
  min?: number;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);

  function bump(direction: 1 | -1) {
    const input = ref.current;
    if (!input) return;
    // Start from the typed value, else from the placeholder (the usual value).
    const current = Number((input.value || input.placeholder || "0").replace(",", "."));
    const next = Math.max(min, (Number.isFinite(current) ? current : 0) + direction * step);
    input.value = next.toFixed(decimals).replace(".", ",");
  }

  const buttonClass =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

  return (
    <div className="flex flex-col justify-end gap-2 text-sm text-zinc-300">
      <label htmlFor={id}>{label}</label>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => bump(-1)} aria-label={`${label}: lager`} className={buttonClass}>
          <Icon name="minus" className="size-4" />
        </button>
        <input
          ref={ref}
          id={id}
          name={name}
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={`${inputClass} min-w-0 px-2 text-center tabular-nums`}
        />
        <button type="button" onClick={() => bump(1)} aria-label={`${label}: hoger`} className={buttonClass}>
          <Icon name="plus" className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Fold-out for the fields you rarely need; they still submit when it is closed. */
export function MoreDetails({
  title = "Meer details",
  defaultOpen = false,
  children,
  className = "col-span-full",
  columns = "lg:grid-cols-3",
}: {
  title?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  /** Columns from lg, e.g. "lg:grid-cols-4" for the four wheels in one row. */
  columns?: string;
}) {
  return (
    <details open={defaultOpen || undefined} className={`group rounded-2xl border border-zinc-800/80 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 [&::-webkit-details-marker]:hidden">
        {title}
        <Icon name="chevron" className="size-4 text-zinc-500 transition-transform group-open:rotate-90" />
      </summary>
      <div className={`grid grid-cols-2 gap-x-3 gap-y-4 border-t border-zinc-800/80 p-4 ${columns}`}>{children}</div>
    </details>
  );
}
