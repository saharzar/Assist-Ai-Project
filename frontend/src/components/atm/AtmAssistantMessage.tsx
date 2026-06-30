export function AtmAssistantMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-base font-semibold leading-7 text-slate-900">
      {message}
    </div>
  );
}
