import type { ReactNode } from "react";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { computerVisionConsentTranslations } from "../lib/computerVisionConsentTranslations";
import { stopAssistantSpeech } from "../services/speechSynthesisService";
import { ComputerVisionDialog } from "./ComputerVisionDialog";

export function ComputerVisionConsentGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, computerVisionConsent, chooseComputerVisionConsent } = useAuth();
  if (isAuthenticated && isLoading) return null;
  if (isAuthenticated && computerVisionConsent === null) {
    return <SessionConsentDialog onChoose={chooseComputerVisionConsent} />;
  }
  return children;
}

function SessionConsentDialog({ onChoose }: { onChoose: (allowed: boolean) => void }) {
  const { language } = useTranslation();
  const text = computerVisionConsentTranslations[language];
  return <ComputerVisionDialog title={text.legend} message={text.description}>
    <div className="grid gap-3">
      {[{ allowed: true, label: text.yes }, { allowed: false, label: text.no }].map((choice) =>
        <button key={String(choice.allowed)} type="button" onClick={() => { stopAssistantSpeech(); onChoose(choice.allowed); }}
          className="min-h-14 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-5 py-3 text-base font-extrabold text-[#302992] hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2">
          {choice.label}
        </button>)}
    </div>
  </ComputerVisionDialog>;
}
