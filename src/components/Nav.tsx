"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2, LayoutGrid, LogOut } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/candidates/new", label: "Add CVs", icon: FilePlus2 },
];

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="iridescent grain relative inline-block shrink-0 rounded-[12px]"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

async function signOut() {
  await fetch("/api/login", { method: "DELETE" });
  window.location.href = "/login";
}

export default function Nav({ authEnabled }: { authEnabled: boolean }) {
  const path = usePathname();
  if (path === "/login") return null;
  const active = (href: string) => (href === "/" ? path === "/" || (path.startsWith("/candidates/") && path !== "/candidates/new") : path === href);

  return (
    <>
      {/* Desktop rail */}
      <nav className="card sticky top-5 hidden h-[calc(100vh-40px)] w-[68px] shrink-0 flex-col items-center gap-3 py-4 md:flex">
        <Link href="/" title="Kargo Hiring" className="mb-3">
          <Logo />
        </Link>
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={`grid h-10 w-10 place-items-center rounded-xl transition ${
              active(href) ? "bg-yellow text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon size={19} strokeWidth={1.7} />
          </Link>
        ))}
        {authEnabled && (
        <button onClick={signOut} title="Sign out" className="mt-auto grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink">
          <LogOut size={18} strokeWidth={1.7} />
        </button>
        )}
        <div className={`${authEnabled ? "" : "mt-auto "}grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-semibold text-white`} title="Arjun Mehta">
          AM
        </div>
      </nav>

      {/* Mobile bar */}
      <nav className="card fixed inset-x-3 bottom-3 z-50 flex items-center justify-around py-2 md:hidden">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${active(href) ? "bg-yellow" : "text-muted"}`}
          >
            <Icon size={18} strokeWidth={1.7} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
