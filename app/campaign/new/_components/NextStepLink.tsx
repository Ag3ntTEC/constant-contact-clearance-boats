"use client";

import Link from "next/link";

export function NextStepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-tide"
      href={href}
    >
      {label}
    </Link>
  );
}
