"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Transactions" },
  { href: "/import", label: "Import" },
  { href: "/analysis", label: "Analysis" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="nav">
      <strong>Kassenbuch</strong>
      <nav>
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
