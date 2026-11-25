"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/screening", label: "Skin Screening" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/consent", label: "Consent" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || (href === "/screening" && pathname === "/results");

  return (
    <header onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} className="site-nav sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="min-w-0" aria-label="DermaScreen AI home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active(l.href) ? "page" : undefined}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active(l.href) ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-300 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      <ul id="mobile-navigation" hidden={!open} className="mobile-nav-panel space-y-1 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={active(l.href) ? "page" : undefined}
                className={`flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-medium ${
                  active(l.href) ? "bg-teal-50 text-teal-800" : "text-slate-700"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
    </header>
  );
}
