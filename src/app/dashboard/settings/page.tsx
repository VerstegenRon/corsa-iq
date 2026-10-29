import type { Metadata } from "next";
import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";

import { AccountData } from "./account-data";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).settings.metaTitle };
}

export default async function SettingsPage() {
  const [{ supabase, user, garage }, t] = await Promise.all([getCurrentGarage(), getDictionary()]);
  const [{ data: profile }, { data: accountGarages }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.rpc("my_account_garages"),
  ]);

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">{t.settings.title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{t.settings.intro}</p>
      </section>

      <section aria-labelledby="display-heading" className={cardClass}>
        <h2 id="display-heading" className="text-lg font-semibold">
          {t.settings.display}
        </h2>
        <dl className="mt-4 divide-y divide-zinc-800/80">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <dt className="min-w-0 flex-1">
              <span className="block text-sm text-zinc-100">{t.settings.language}</span>
              <span className="block text-xs text-zinc-500">{t.settings.languageHelp}</span>
            </dt>
            <dd>
              <LanguageSwitcher />
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <dt className="min-w-0 flex-1">
              <span className="block text-sm text-zinc-100">{t.settings.theme}</span>
              <span className="block text-xs text-zinc-500">{t.settings.themeHelp}</span>
            </dt>
            <dd>
              <ThemeSwitcher />
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="profile-heading" className={cardClass}>
        <h2 id="profile-heading" className="mb-6 text-lg font-semibold">
          {t.settings.profile}
        </h2>
        <ProfileForm displayName={profile?.display_name ?? null} garageName={garage.name} />
        <p className="mt-4 text-xs text-zinc-500">
          {t.settings.driversHint}{" "}
          <Link href="/dashboard/drivers" className={linkClass}>
            {t.nav.drivers}
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="account-heading" className={cardClass}>
        <h2 id="account-heading" className="text-lg font-semibold">
          {t.settings.account}
        </h2>
        <dl className="mt-4">
          <dt className="text-xs tracking-wide text-zinc-500 uppercase">{t.settings.email}</dt>
          <dd className="mt-1 text-sm text-zinc-100">{user.email}</dd>
          <dd className="mt-1 text-xs text-zinc-500">{t.settings.emailHelp}</dd>
        </dl>
        <div className="mt-6 border-t border-zinc-800/80 pt-6">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">{t.settings.passwordHeading}</h3>
          <PasswordForm />
        </div>
      </section>

      <section aria-labelledby="data-heading" className={cardClass}>
        <h2 id="data-heading" className="text-lg font-semibold">
          Je gegevens en account
        </h2>
        <div className="mt-4">
          <AccountData garages={accountGarages ?? []} />
        </div>
      </section>
    </>
  );
}
