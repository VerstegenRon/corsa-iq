// Helpers for reading FormData in Server Actions.

export function text(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

/** Parses an optional non-negative number; returns undefined when the input is not a valid number. */
export function optionalNumber(formData: FormData, key: string): number | null | undefined {
  const raw = text(formData, key);
  if (raw === null) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Like optionalNumber, but allows negative values (temperatures). */
export function optionalSignedNumber(formData: FormData, key: string): number | null | undefined {
  const raw = text(formData, key);
  if (raw === null) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}
