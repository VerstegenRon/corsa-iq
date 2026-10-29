// Shared top of a dashboard page and the empty state of a list.

import { AddButton } from "@/components/add-section";
import { Icon, IconTile, type IconName } from "@/components/icons";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

/**
 * A short line as a channel label, then the title: upper case, ending on a volt full stop (or a volt
 * question mark when it asks one). An optional "+" opens the page's add form. The icon is kept for
 * screen-reader-free callers but no longer drawn: the design has none in headings.
 */
export function PageHeader({
  icon,
  title,
  subtitle,
  add,
  addId = "add",
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  /** Label of the "+" button, e.g. "Kart"; it links to the AddSection with id "add". */
  add?: string;
  /** Id of the AddSection the "+" opens, when a page has more than one. */
  addId?: string;
}) {
  void icon;
  const question = title.trim().endsWith("?");
  const text = question ? title.trim().slice(0, -1) : title;
  return (
    <section className="flex items-end gap-4">
      <div className="min-w-0 flex-1">
        {subtitle && <p className="channel-label mb-2 truncate">{subtitle}</p>}
        <h1 className="text-3xl break-words sm:text-4xl">
          {text}
          <span className="text-brand-400">{question ? "?" : "."}</span>
        </h1>
      </div>
      {add && (
        <AddButton
          targetId={addId}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 bg-brand-500 px-4 text-sm font-bold text-on-brand transition-colors hover:bg-brand-600 ${focusRing}`}
        >
          <Icon name="plus" className="size-4" />
          <span>{add}</span>
        </AddButton>
      )}
    </section>
  );
}

/** Shown instead of an empty list: an icon and one line, above the open add form. */
export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 px-6 py-10 text-center">
      <IconTile name={icon} size="lg" tone="neutral" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-zinc-400">{text}</p>
    </section>
  );
}
