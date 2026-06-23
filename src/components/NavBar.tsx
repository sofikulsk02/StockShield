"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { clearGuestSession } from "@/app/actions/auth";
import { LogOut, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Products", exact: true },
  { href: "/history", label: "History", exact: false },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check if the guest cookie exists on mount/status change
    if (typeof window !== "undefined") {
      setIsGuest(document.cookie.includes("stockshield_guest"));
    }
  }, [status]);

  const handleSignOut = async () => {
    await clearGuestSession();
    signOut({ callbackUrl: "/login" });
  };

  return (
    <nav className="flex items-center gap-6">
      {NAV_LINKS.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors relative pb-1 ${
              isActive
                ? "nav-active text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}

      <a
        href="/api/health"
        target="_blank"
        className="hidden md:inline-flex text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-colors font-medium"
      >
        API Status: Active
      </a>

      {/* User Session status */}
      {status === "loading" ? (
        <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse border border-white/10" />
      ) : session ? (
        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <div className="flex items-center gap-2 group cursor-default">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="w-7 h-7 rounded-full border border-white/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-semibold">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="hidden sm:inline text-xs font-medium text-zinc-300 max-w-[120px] truncate">
              {session.user?.name || "User"}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center justify-center p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-zinc-400 transition-all duration-200 active:scale-95 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : isGuest ? (
        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/50 text-zinc-400 font-semibold uppercase tracking-wider">
            Guest
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-indigo-500/15 hover:border-indigo-500/30 hover:text-indigo-400 text-zinc-400 transition-all duration-200 active:scale-95 cursor-pointer"
            title="Sign In / Exit Guest"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
