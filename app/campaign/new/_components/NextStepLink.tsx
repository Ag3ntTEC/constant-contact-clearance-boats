"use client";

import Link from "next/link";

export function NextStepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex rounded-md bg-harbor px-4 py-2 text-sm font-semibold text-white hover:bg-[#15566d]"
      href={href}
    >
      {label}
    </Link>
  );
}
