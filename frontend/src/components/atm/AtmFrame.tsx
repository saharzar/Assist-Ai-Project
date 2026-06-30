import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export function AtmFrame({
  assistantMessage,
  soundControls,
  children,
}: {
  assistantMessage: ReactNode;
  soundControls: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5">
      <Link
        to="/scenarios"
        className="inline-flex min-h-[48px] w-fit items-center rounded-lg border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        Back to scenarios
      </Link>

      <div className="rounded-[2rem] border-8 border-slate-700 bg-slate-800 p-4 shadow-2xl sm:p-6">
        <div className="rounded-2xl border border-slate-600 bg-slate-700 p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-slate-300">ASSIST-AI ATM</p>
              <p className="text-xs font-semibold text-slate-400">Practice mode</p>
            </div>
            <div className="h-3 w-24 rounded-full bg-teal-300" aria-hidden="true" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-xl border-4 border-slate-950 bg-slate-950 p-3">
              <div className="min-h-[430px] rounded-lg bg-slate-100 p-5 text-slate-950 sm:p-7">
                {children}
              </div>
            </div>

            <aside className="flex flex-col gap-4 rounded-xl border border-slate-600 bg-slate-800 p-4">
              {soundControls}
              <div className="rounded-lg bg-slate-950 p-3">
                <div className="h-3 rounded-full bg-slate-600" aria-hidden="true" />
                <p className="mt-3 text-center text-xs font-bold uppercase tracking-wide text-slate-300">
                  Card slot
                </p>
              </div>
              {assistantMessage}
              <div className="mt-auto rounded-lg border border-slate-600 bg-slate-700 p-4 text-sm font-semibold leading-6 text-slate-100">
                This is practice only. Do not enter real bank information.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
