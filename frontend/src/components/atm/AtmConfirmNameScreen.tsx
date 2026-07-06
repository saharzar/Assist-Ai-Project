export function AtmConfirmNameScreen({
  fullName,
  labels,
}: {
  fullName: string;
  labels: {
    heard: string;
    hint: string;
  };
}) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          {labels.heard}
        </h1>
        <p className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-lg font-bold text-slate-950">
          {fullName}
        </p>
      </div>

      <p className="rounded-lg bg-teal-50 p-3 text-sm font-bold text-teal-900">
        {labels.hint}
      </p>
    </div>
  );
}
