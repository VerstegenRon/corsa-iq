import { getDictionary } from "@/lib/i18n/server";

import { signOut } from "../login/actions";
import { DashboardNav, HomeLink, SettingsLink } from "./nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const t = await getDictionary();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-900">
        {/* On phones the nav gets its own row under the logo and sign-out button; it wraps when needed. */}
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
          <div className="order-1">
            <HomeLink />
          </div>
          <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1">
            <DashboardNav />
          </div>
          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
            <SettingsLink />
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-cyan-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 pt-10 pb-20">
        {children}
      </main>
    </div>
  );
}
