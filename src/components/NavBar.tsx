"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Products", exact: true },
  { href: "/history", label: "History", exact: false },
];

export default function NavBar() {
  const pathname = usePathname();

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
        className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-colors font-medium"
      >
        API Status: Active
      </a>
    </nav>
  );
}
