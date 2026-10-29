// Shared Tailwind class strings for form controls and buttons. Square corners, 1px hairlines; the
// primary button is 56px high so it works with gloves, everything else you tap is at least 44px.

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export const inputClass = `h-12 w-full border border-zinc-800 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus-visible:border-brand-400 ${focusRing}`;

// justify-end keeps inputs side by side level when one label wraps onto two lines.
export const labelClass = "flex flex-col justify-end gap-2 text-sm text-zinc-300";

export const primaryButtonClass = `inline-flex min-h-14 items-center justify-center bg-brand-500 px-6 text-base font-bold text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-60 ${focusRing}`;

export const secondaryButtonClass = `inline-flex min-h-11 items-center justify-center border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500 disabled:opacity-60 ${focusRing}`;

/** A panel: hairline border on the panel surface, with the volt crop mark top left. */
export const cardClass = "crop border border-zinc-800 bg-zinc-900 p-5 sm:p-6";

export const linkClass = `text-brand-300 underline-offset-4 hover:underline ${focusRing}`;
