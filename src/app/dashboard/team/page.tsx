import type { Metadata } from "next";
import { headers } from "next/headers";

import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { atLimit, LimitReached } from "@/components/plan-lock";
import { cardClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { formatDate } from "@/lib/karting";
import { format } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/server";

import { removeMember, revokeInvite } from "../team-actions";
import { GarageSwitch, InviteForm, RoleSelect } from "./team-controls";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).team.metaTitle };
}

/** Who works in this garage and with which role; the owner invites people by link. */
export default async function TeamPage() {
  const { supabase, user, garage, role, canManageTeam, garages } = await getCurrentGarage();
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const tt = t.team;
  const roleName = (key: string) => t.roles[key as keyof typeof t.roles]?.name ?? key;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const origin = `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${host}`;

  const [{ data: team }, { data: invites }] = await Promise.all([
    supabase.rpc("garage_team", { p_garage_id: garage.id }),
    canManageTeam
      ? supabase
          .from("garage_invites")
          .select("id, role, label, created_at, expires_at")
          .eq("garage_id", garage.id)
          .is("accepted_at", null)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const members = team ?? [];
  // Open invitations hold a seat: accepting one adds a member.
  const seats = members.length + (invites ?? []).length;

  return (
    <>
      <PageHeader icon="user" title={tt.title} subtitle={format(tt.youAre, { garage: garage.name, role: roleName(role).toLowerCase() })} />

      <section aria-labelledby="members-heading" className={cardClass}>
        <h2 id="members-heading" className="text-lg font-semibold">
          {tt.members}
        </h2>
        <ul className="mt-3 divide-y divide-zinc-800/70">
          {members.map((m) => {
            const name = m.display_name || m.email;
            const self = m.user_id === user.id;
            return (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-zinc-50">
                    {name}
                    {self && <span className="ml-2 text-xs font-normal text-zinc-500">{tt.you}</span>}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {m.display_name ? `${m.email} · ` : ""}
                    {format(tt.memberSince, { date: formatDate(m.joined_at, locale) })}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {canManageTeam && !self ? (
                    <>
                      <RoleSelect userId={m.user_id} role={m.role} name={name} />
                      <DeleteButton
                        action={removeMember.bind(null, m.user_id)}
                        confirmText={format(tt.removeConfirm, { name })}
                        label={format(tt.removeLabel, { name })}
                        iconOnly
                      />
                    </>
                  ) : (
                    <span className="border border-zinc-800 px-2.5 py-1.5 text-sm text-zinc-300">{roleName(m.role)}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        {!canManageTeam && (
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <DeleteButton action={removeMember.bind(null, user.id)} confirmText={format(tt.leaveConfirm, { garage: garage.name })} label={tt.leave} />
          </div>
        )}
      </section>

      {canManageTeam && (
        <section aria-labelledby="invite-heading" className={cardClass}>
          <h2 id="invite-heading" className="text-lg font-semibold">
            {tt.inviteTitle}
          </h2>
          <p className="mt-1 mb-5 text-sm text-zinc-400">{tt.inviteIntro}</p>
          {(await atLimit("members", seats)) ? <LimitReached counted="members" used={seats} /> : <InviteForm origin={origin} />}

          {(invites ?? []).length > 0 && (
            <div className="mt-6 border-t border-zinc-800 pt-4">
              <h3 className="channel-label mb-2">{tt.openInvites}</h3>
              <ul className="divide-y divide-zinc-800/70">
                {(invites ?? []).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-sm">
                      <span className="font-semibold text-zinc-100">{roleName(i.role)}</span>
                      {i.label && <span className="text-zinc-300"> · {i.label}</span>}
                      <span className="block text-xs text-zinc-500">{format(tt.validUntil, { date: formatDate(i.expires_at, locale) })}</span>
                    </span>
                    <DeleteButton action={revokeInvite.bind(null, i.id)} confirmText={tt.revokeConfirm} label={tt.revoke} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {garages.length > 1 && (
        <section aria-labelledby="garages-heading" className={cardClass}>
          <h2 id="garages-heading" className="text-lg font-semibold">
            {tt.garagesTitle}
          </h2>
          <p className="mt-1 mb-4 text-sm text-zinc-400">{tt.garagesIntro}</p>
          <GarageSwitch garages={garages.map((g) => ({ id: g.id, name: g.name, role: g.role }))} currentId={garage.id} />
        </section>
      )}
    </>
  );
}
