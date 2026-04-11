import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth, signOut } from "@/lib/auth";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/checkin", label: "Check-in" },
  { href: "/memories", label: "Memories" },
  { href: "/patterns", label: "Patterns" },
  { href: "/review", label: "Review" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wide text-indigo-300">
            KORA
          </Link>
          <nav className="hidden gap-4 text-sm text-slate-300 md:flex">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-slate-100">
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-6">{children}</main>
    </div>
  );
}
