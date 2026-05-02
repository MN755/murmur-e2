"use client";

import Link from "next/link";
import type { ReactElement } from "react";

type WorkbenchNavProps = {
  active: "lab" | "docs" | "graph";
};

const LINKS: { id: WorkbenchNavProps["active"]; href: string; label: string }[] = [
  { id: "lab", href: "/", label: "LAB" },
  { id: "docs", href: "/docs", label: "DOC" },
  { id: "graph", href: "/graph", label: "GRF" },
];

export function WorkbenchNav({ active }: WorkbenchNavProps): ReactElement {
  return (
    <nav className="flex h-full w-12 shrink-0 flex-col items-center border-r border-[var(--border-subtle)] bg-[var(--bg-canvas)] py-2 font-mono text-[10px]">
      {LINKS.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className="mb-1 flex h-10 w-10 items-center justify-center rounded border transition-colors duration-200"
          style={{
            borderColor: active === link.id ? "var(--accent-glow)" : "transparent",
            background: active === link.id ? "rgba(124,248,255,0.08)" : "transparent",
            color: active === link.id ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
