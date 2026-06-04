"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const steps = [
  { href: "/campaign/new/settings", label: "Settings" },
  { href: "/campaign/new/boats", label: "Boats" },
  { href: "/campaign/new/editor", label: "Editor" },
  { href: "/campaign/new/preview", label: "Preview" },
];

export function StepShell({
  children,
  description,
  selectedCount,
  title,
}: {
  children: ReactNode;
  description: string;
  selectedCount?: number;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-foam">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link className="text-sm font-semibold text-harbor hover:underline" href="/">
                Campaign builder
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-ink">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
            </div>
            {selectedCount !== undefined ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                {selectedCount}/10 selected
              </div>
            ) : null}
          </div>
          <nav className="flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <Link
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-harbor hover:text-harbor"
                href={step.href}
                key={step.href}
              >
                {index + 1}. {step.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </main>
  );
}
