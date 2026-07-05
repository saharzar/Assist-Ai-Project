export function AtmConfirmNameScreen({
  fullName,
}: {
  fullName: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          I heard:
        </h1>
        <p className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-lg font-bold text-slate-950">
          {fullName}
        </p>
      </div>

      <p className="rounded-lg bg-teal-50 p-3 text-sm font-bold text-teal-900">
        Press ENTER to continue. Press Cancel, Clear, or Back to write again.
      </p>
    </div>
  );
}
