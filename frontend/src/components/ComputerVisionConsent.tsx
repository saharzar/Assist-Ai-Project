import { useTranslation } from "../i18n";
import { computerVisionConsentTranslations } from "../lib/computerVisionConsentTranslations";

type Props = {
  value: boolean | null;
  onChange: (allowed: boolean) => void;
  showError?: boolean;
};

export function ComputerVisionConsent({ value, onChange, showError = false }: Props) {
  const { language } = useTranslation();
  const text = computerVisionConsentTranslations[language];

  return (
    <fieldset className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
      <legend className="px-1 text-base font-extrabold text-slate-800">{text.legend}</legend>
      <p className="mt-1 text-sm text-slate-600">{text.description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={text.legend}>
        {[{ allowed: true, label: text.yes }, { allowed: false, label: text.no }].map((choice) => (
          <label key={String(choice.allowed)} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${value === choice.allowed ? "border-[#302992] bg-indigo-50 text-[#302992]" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200"}`}>
            <input
              type="radio"
              name="computer-vision-consent"
              value={String(choice.allowed)}
              checked={value === choice.allowed}
              onChange={() => onChange(choice.allowed)}
              className="h-4 w-4 accent-[#302992]"
            />
            {choice.label}
          </label>
        ))}
      </div>
      {showError && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{text.validation}</p>}
      <p className="mt-3 text-xs leading-5 text-slate-500">{text.dataNote}</p>
    </fieldset>
  );
}
