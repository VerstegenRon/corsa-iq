import { formatDate } from "@/lib/karting";
import type { GearValidity } from "@/lib/gear";

const toneClass = { ok: "text-zinc-300", soon: "text-amber-300", expired: "text-red-300" } as const;

/** "geldig tot 1 mrt 2027", with a warning from two months before it runs out. */
export function Validity({ validUntil, validity }: { validUntil: string | null; validity: GearValidity }) {
  if (!validity || !validUntil) return <span className="text-zinc-500">—</span>;
  return (
    <span className={toneClass[validity.tone]}>
      {validity.tone === "expired" ? "verlopen op " : "geldig tot "}
      {formatDate(validUntil)}
      {validity.tone !== "ok" && (
        <span className="ml-2 text-xs font-medium">
          <span aria-hidden="true">{validity.tone === "expired" ? "● " : "▲ "}</span>
          {validity.tone === "expired" ? "niet meer geldig" : `nog ${validity.daysLeft} ${validity.daysLeft === 1 ? "dag" : "dagen"}`}
        </span>
      )}
    </span>
  );
}
