import type { GearValidity } from "@/lib/gear";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format, plural, type Locale } from "@/lib/i18n/locales";
import { formatDate } from "@/lib/karting";

const toneClass = { ok: "text-zinc-300", soon: "text-amber-300", expired: "text-red-300" } as const;

/** "geldig tot 1 mrt 2027", with a warning from two months before it runs out. */
export function Validity({
  validUntil,
  validity,
  t,
  locale,
}: {
  validUntil: string | null;
  validity: GearValidity;
  t: Dictionary;
  locale: Locale;
}) {
  if (!validity || !validUntil) return <span className="text-zinc-500">—</span>;
  const tg = t.gear;
  return (
    <span className={toneClass[validity.tone]}>
      {format(validity.tone === "expired" ? tg.expiredOn : tg.validTo, { date: formatDate(validUntil, locale) })}
      {validity.tone !== "ok" && (
        <span className="ml-2 text-xs font-medium">
          <span aria-hidden="true">{validity.tone === "expired" ? "● " : "▲ "}</span>
          {validity.tone === "expired" ? tg.notValid : plural(validity.daysLeft, tg.daysLeft)}
        </span>
      )}
    </span>
  );
}
