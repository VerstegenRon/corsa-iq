// Shared Tailwind class strings for form controls and buttons.

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export const inputClass = `h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-zinc-50 placeholder:text-zinc-600 focus-visible:border-brand-400/60 ${focusRing}`;

// justify-end keeps inputs side by side level when one label wraps onto two lines.
export const labelClass = "flex flex-col justify-end gap-2 text-sm text-zinc-300";

export const primaryButtonClass = `inline-flex h-11 items-center justify-center rounded-full bg-brand-500 px-6 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-60 ${focusRing}`;

export const secondaryButtonClass = `inline-flex h-9 items-center justify-center rounded-full border border-zinc-700 px-4 text-sm text-zinc-200 transition-colors hover:border-brand-400/40 hover:text-white disabled:opacity-60 ${focusRing}`;

export const cardClass = "rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 sm:p-6";

export const linkClass = `text-brand-300 underline-offset-4 hover:underline ${focusRing}`;
