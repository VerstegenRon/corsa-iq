// The session's full setup, and what changed compared with another session (by default the kart's
// previous session) together with the difference in fastest lap and conditions.

import { cardClass, secondaryButtonClass, inputClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format, type Locale } from "@/lib/i18n/locales";
import { richFormat } from "@/lib/i18n/rich";
import { formatDate, formatLapTime, formatTime, labelFor, type SetupValues } from "@/lib/karting";
import { formatDelta } from "@/lib/lap-analysis";
import { weatherText, type SessionConditions } from "@/lib/weather";
import { SETUP_FIELDS, SETUP_GROUPS, diffSetups, formatSetupValue, gearRatio, getSetupValue } from "@/lib/setup";

type Conditions = SessionConditions;

export type SetupSessionInfo = {
  id: string;
  type: string;
  startsOn: string;
  startedAt: string;
  kartName: string | null;
  bestLapMs: number | null;
  conditions: Conditions;
  setup: SetupValues;
};

export function sessionLabel(s: SetupSessionInfo, t: Dictionary, locale: Locale) {
  return [
    `${formatDate(s.startsOn, locale)} ${formatTime(s.startedAt)}`,
    labelFor(t.options.sessionTypes, s.type),
    s.kartName,
    s.bestLapMs !== null ? formatLapTime(s.bestLapMs) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function conditionChanges(from: Conditions, to: Conditions, t: Dictionary) {
  const ts = t.session;
  const rows: { label: string; from: string; to: string }[] = [];
  const fromWeather = weatherText(from, t.options.weather);
  const toWeather = weatherText(to, t.options.weather);
  if (fromWeather !== toWeather) rows.push({ label: ts.weather, from: fromWeather ?? "—", to: toWeather ?? "—" });
  const temp = (value: number | undefined) => (value === undefined ? "—" : `${value}°C`);
  if (from.air_temp_c !== to.air_temp_c) rows.push({ label: ts.airTemp, from: temp(from.air_temp_c), to: temp(to.air_temp_c) });
  if (from.track_temp_c !== to.track_temp_c) rows.push({ label: ts.trackTemp, from: temp(from.track_temp_c), to: temp(to.track_temp_c) });
  return rows;
}

export function SetupSection({
  session,
  candidates,
  compareWith,
  t,
  locale,
  showPicker = true,
}: {
  session: SetupSessionInfo;
  /** Other sessions to compare with: the same kart, or the same circuit. Newest first. */
  candidates: SetupSessionInfo[];
  compareWith: SetupSessionInfo | null;
  t: Dictionary;
  locale: Locale;
  /** False when the lap comparison above already offers the session picker. */
  showPicker?: boolean;
}) {
  const ts = t.session;
  const ratioFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const groups = SETUP_GROUPS.map((group) => ({
      group,
      fields: SETUP_FIELDS.filter((f) => f.group === group && getSetupValue(session.setup, f) !== undefined),
    })).filter((g) => g.fields.length > 0);
  const ratio = gearRatio(session.setup);

  const changes = compareWith ? diffSetups(compareWith.setup, session.setup) : [];
  const conditions = compareWith ? conditionChanges(compareWith.conditions, session.conditions, t) : [];
  const lapDelta = compareWith && compareWith.bestLapMs !== null && session.bestLapMs !== null ? session.bestLapMs - compareWith.bestLapMs : null;

  return (
    <section aria-labelledby="setup-heading" className={cardClass}>
      <h2 id="setup-heading" className="text-lg font-semibold">
        {ts.setup}
      </h2>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">{ts.noSetup}</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {groups.map(({ group, fields }) => (
            <div key={group}>
              <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{t.setup.groups[group]}</h3>
              <dl className="mt-2 divide-y divide-zinc-800/60 text-sm">
                {fields.map((field) => (
                  <div key={field.name} className="flex justify-between gap-4 py-1.5">
                    <dt className="text-zinc-400">{t.setup.fields[field.name].label}</dt>
                    <dd className="text-zinc-100 tabular-nums">{formatSetupValue(field, getSetupValue(session.setup, field))}</dd>
                  </div>
                ))}
                {group === "gearing" && ratio !== null && (
                  <div className="flex justify-between gap-4 py-1.5">
                    <dt className="text-zinc-400">{ts.ratio}</dt>
                    <dd className="text-zinc-100 tabular-nums">{ratioFormat.format(ratio)}</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}
      {session.setup.notes && <p className="mt-4 text-sm text-zinc-300">{session.setup.notes}</p>}

      {candidates.length > 0 && (
        <div className="mt-8 border-t border-zinc-800/80 pt-6">
          <h3 className="text-sm font-semibold text-zinc-200">{ts.changed}</h3>
          {!showPicker && compareWith && (
            <p className="mt-1 text-xs text-zinc-500">{format(ts.against, { label: sessionLabel(compareWith, t, locale) })}</p>
          )}
          {showPicker && (
            <form method="get" className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="flex-1">
                <span className="sr-only">{ts.compareWith}</span>
                <select name="vs" defaultValue={compareWith?.id} className={inputClass}>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {sessionLabel(c, t, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={`${secondaryButtonClass} h-11`}>
                {ts.compare}
              </button>
            </form>
          )}

          {compareWith && (
            <div className="mt-5 flex flex-col gap-5">
              {lapDelta !== null && (
                <p className="text-sm text-zinc-300">
                  {richFormat(ts.lapDelta, {
                    mine: <span className="font-semibold text-zinc-100 tabular-nums">{formatLapTime(session.bestLapMs)}</span>,
                    theirs: <span className="tabular-nums">{formatLapTime(compareWith.bestLapMs)}</span>,
                    delta: <span className="font-semibold text-zinc-100 tabular-nums">{formatDelta(lapDelta)}</span>,
                    verdict: lapDelta < 0 ? ts.faster : lapDelta > 0 ? ts.slower : ts.same,
                  })}
                </p>
              )}

              {changes.length === 0 ? (
                <p className="text-sm text-zinc-400">{ts.sameSetup}</p>
              ) : (
                <ChangeTable
                  title={ts.setup}
                  t={t}
                  rows={changes.map((c) => ({
                    label: t.setup.fields[c.field.name].label,
                    from: formatSetupValue(c.field, c.from),
                    to: formatSetupValue(c.field, c.to),
                  }))}
                />
              )}
              {conditions.length > 0 && <ChangeTable title={ts.conditions} t={t} rows={conditions} />}
              {compareWith.kartName !== session.kartName && (
                <p className="text-xs text-zinc-500">{format(ts.otherKart, { kart: compareWith.kartName ?? "—" })}</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ChangeTable({ title, t, rows }: { title: string; t: Dictionary; rows: { label: string; from: string; to: string }[] }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="mb-1 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">{title}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{t.session.setting}</th>
          <th scope="col">{t.session.then}</th>
          <th scope="col">{t.session.now}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-800/60">
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row" className="py-1.5 pr-4 font-normal text-zinc-400">
              {row.label}
            </th>
            <td className="py-1.5 pr-2 text-right text-zinc-500 tabular-nums line-through decoration-zinc-600">{row.from}</td>
            <td className="py-1.5 font-semibold text-zinc-100 tabular-nums">
              <span aria-hidden="true" className="mr-2 font-normal text-zinc-600">
                →
              </span>
              {row.to}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
