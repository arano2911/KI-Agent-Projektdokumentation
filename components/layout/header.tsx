"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/topics", label: "Themen" },
  { href: "/tasks", label: "Aufgaben" },
  { href: "/agenda", label: "Meeting-Agenda" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
            K
          </div>
          <div>
            <div className="text-base font-bold leading-tight text-slate-100">
              KI-Agent
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              Fachliche Projektdokumentation
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="flex gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                    isActive
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="ml-4 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-red-400"
            title="Abmelden"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
}
