import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-foam">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-harbor">
          Internal campaign tool
        </p>
        <h1 className="mt-3 text-4xl font-bold text-ink">
          Clearance Boat Campaign Builder
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Build a Constant Contact-ready clearance boat email in focused steps:
          settings, boat selection, copy editing, and final preview.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="rounded-md bg-harbor px-5 py-3 text-sm font-semibold text-white hover:bg-[#15566d]"
            href="/campaign/new/settings"
          >
            Start new campaign
          </Link>
          <Link
            className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-harbor hover:text-harbor"
            href="/campaign/new/boats"
          >
            Browse boats
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {["Settings", "Boats", "Editor", "Preview"].map((step, index) => (
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={step}>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Step {index + 1}
              </p>
              <p className="mt-2 font-semibold text-ink">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
