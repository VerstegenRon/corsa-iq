import { signOut } from "../login/actions";
import { BottomNav, DashboardNav, HomeLink, MoreMenu } from "./nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="relative border-b border-zinc-800">
        {/* From md the destinations sit in the header; on a phone they are the bar at the bottom. */}
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
          <HomeLink />
          <div className="hidden min-w-0 flex-1 md:block">
            <DashboardNav />
          </div>
          <div className="ml-auto">
            <MoreMenu signOut={signOut} />
          </div>
        </div>
      </header>

      {/* Room at the bottom on a phone for the fixed bar. */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-8 pb-28 sm:px-6 md:pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
