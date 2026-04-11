import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { 
  BarChart2, Mic, Library, BrainCircuit, FileText, Settings, Zap, LogOut
} from "lucide-react";

import { auth, signOut } from "@/lib/auth";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: BarChart2 },
  { href: "/checkin", label: "Check-in", icon: Mic },
  { href: "/memories", label: "Memories", icon: Library },
  { href: "/patterns", label: "Patterns", icon: BrainCircuit },
  { href: "/review", label: "Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
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
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white pb-20">
      {/* Vercel Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-white">
                 <Zap className="h-3 w-3 text-black" fill="currentColor" />
              </div>
              <span className="text-sm font-bold tracking-widest text-white uppercase hidden sm:block">Kora</span>
            </Link>
            
            <nav className="hidden items-center gap-1 md:flex">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} className="group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100">
                  <item.icon className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                   {session.user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-xs font-medium text-zinc-300">{session.user.name?.split(' ')[0]}</span>
             </div>
             <form action={handleSignOut}>
               <button type="submit" className="flex items-center justify-center rounded-md border border-zinc-800 bg-[#050505] p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white" title="Sign Out">
                 <LogOut className="h-4 w-4" />
               </button>
             </form>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black/90 backdrop-blur-md px-4 pb-safe pt-2">
         <nav className="flex justify-between items-center overflow-x-auto gap-2 pb-2">
            {navigation.map((item) => (
               <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 p-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-900">
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] uppercase font-medium">{item.label}</span>
               </Link>
            ))}
         </nav>
      </div>

      <main className="mx-auto w-full max-w-6xl">{children}</main>
    </div>
  );
}
