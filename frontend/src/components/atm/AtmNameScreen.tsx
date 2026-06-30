import { FormEvent, useState } from "react";

export function AtmNameScreen({
  errorMessage,
  onSubmit,
}: {
  errorMessage: string;
  onSubmit: (fullName: string) => void;
}) {
  const [fullName, setFullName] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(fullName);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Hello. What is your full name?
        </h1>
        <p className="mt-3 text-lg leading-8 text-slate-700">
          Please write your first and last name.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-bold text-slate-700">Full name</span>
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Write your full name"
          className="mt-2 min-h-[56px] w-full rounded-lg border border-slate-300 px-4 text-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
      </label>

      {errorMessage && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        aria-label="Continue with full name"
        className="min-h-[56px] rounded-lg bg-teal-600 px-7 py-3 text-lg font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        Continue
      </button>
    </form>
  );
}
