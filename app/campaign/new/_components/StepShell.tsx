"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/app/_components/LogoutButton";

const steps = [
  {
    description: "Campaign basics",
    href: "/campaign/new/settings",
    label: "Settings",
  },
  {
    description: "Pick inventory",
    href: "/campaign/new/boats",
    label: "Boats",
  },
  {
    description: "Tune content",
    href: "/campaign/new/editor",
    label: "Editor",
  },
  {
    description: "Check and draft",
    href: "/campaign/new/preview",
    label: "Preview",
  },
];

export function StepShell({
  children,
  description,
  footer,
  selectedCount,
  title,
}: {
  children: ReactNode;
  description: string;
  footer?: ReactNode;
  selectedCount?: number;
  title: string;
}) {
  const pathname = usePathname();
  const selectedBoats = selectedCount ?? 0;

  return (
    <main className="min-h-screen bg-foam pb-24">
      <header className="border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                className="inline-flex items-center gap-2 text-sm font-semibold text-harbor hover:text-tide"
                href="/"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-harbor text-xs text-white">
                  WM
                </span>
                Campaign Studio
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-ink">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {selectedCount !== undefined ? (
                <div className="rounded-md border border-harbor/20 bg-mist px-4 py-3 text-sm font-semibold text-tide">
                  {selectedCount} selected
                </div>
              ) : null}
              <Link
                className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-harbor hover:text-harbor"
                href="/history"
              >
                Draft History
              </Link>
              <LogoutButton />
            </div>
          </div>
          <nav className="grid gap-3 md:grid-cols-4">
            {steps.map((step, index) => (
              <Link
                className={`rounded-md border px-4 py-3 shadow-sm ${
                  pathname === step.href
                    ? "border-harbor bg-harbor text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-harbor hover:text-harbor"
                }`}
                href={step.href}
                key={step.href}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
                      Step {index + 1}
                    </span>
                    <span className="mt-1 block text-sm font-bold">{step.label}</span>
                    <span className="mt-1 block text-xs opacity-75">{step.description}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                      pathname === step.href
                        ? "bg-white/20 text-white"
                        : getStepStatusClass(step.href, selectedBoats)
                    }`}
                  >
                    {pathname === step.href ? "Current" : getStepStatus(step.href, selectedBoats)}
                  </span>
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-6">{children}</div>
      {footer ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-5 py-3 shadow-[0_-16px_40px_rgba(23,32,42,0.08)] backdrop-blur">
          <div className="mx-auto max-w-[1440px]">{footer}</div>
        </div>
      ) : null}
    </main>
  );
}

export function ActionFooter({
  backHref,
  backLabel = "Back",
  children,
  nextDescription,
  nextDisabled,
  nextHref,
  nextLabel,
}: {
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
  nextDescription?: string;
  nextDisabled?: boolean;
  nextHref?: string;
  nextLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-h-5 text-sm text-slate-500">{nextDescription}</div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {backHref ? (
          <Link
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-harbor hover:text-harbor"
            href={backHref}
          >
            {backLabel}
          </Link>
        ) : null}
        {children}
        {nextHref && nextLabel ? (
          nextDisabled ? (
            <button
              className="rounded-md bg-slate-300 px-5 py-2 text-sm font-semibold text-white"
              disabled
              type="button"
            >
              {nextLabel}
            </button>
          ) : (
            <Link
              className="rounded-md bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-tide"
              href={nextHref}
            >
              {nextLabel}
            </Link>
          )
        ) : null}
      </div>
    </div>
  );
}

function getStepStatus(href: string, selectedCount: number) {
  if (href === "/campaign/new/settings") {
    return "Ready";
  }

  if (href === "/campaign/new/boats") {
    return selectedCount > 0 ? "Complete" : "Needs boats";
  }

  if (href === "/campaign/new/editor") {
    return selectedCount > 0 ? "Ready" : "Locked";
  }

  if (href === "/campaign/new/preview") {
    return selectedCount > 0 ? "Ready" : "Locked";
  }

  return "Ready";
}

function getStepStatusClass(href: string, selectedCount: number) {
  const status = getStepStatus(href, selectedCount);

  if (status === "Complete" || status === "Ready") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Needs boats") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-500";
}
