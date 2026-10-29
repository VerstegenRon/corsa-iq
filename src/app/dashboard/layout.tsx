import { getDictionary } from "@/lib/i18n/server";

import { signOut } from "../login/actions";
import { DashboardNav, HomeLink, MobileMenu, PitwallLink, SettingsLink } from "./nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const t = await getDictionary();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="relative border-b border-zinc-900">
        {/* From lg the grouped nav sits in the header row; below that it lives in the menu panel. */}
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
          <HomeLink />
          <div className="hidden min-w-0 flex-1 lg:block">
            <DashboardNav />
          </div>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <PitwallLink />
            <SettingsLink />
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-brand-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
              >
                {t.common.signOut}
              </button>
            </form>
          </div>
          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <PitwallLink />
            <MobileMenu signOut={signOut} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 pt-10 pb-20">
        {children}
      </main>
    </div>
  );
}
