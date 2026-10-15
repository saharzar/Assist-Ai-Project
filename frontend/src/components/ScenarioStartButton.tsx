import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { computerVisionConsentTranslations } from "../lib/computerVisionConsentTranslations";
import { createCameraAvailabilityChecker, type CameraAvailabilityFailureReason } from "../services/cameraAvailabilityService";
import { stopAssistantSpeech, unlockAssistantAudioPlayback } from "../services/speechSynthesisService";
import { ComputerVisionDialog } from "./ComputerVisionDialog";

export function ScenarioStartButton({ to, className, children }: { to: string; className: string; children: ReactNode }) {
  const navigate = useNavigate();
  const { computerVisionConsent, token } = useAuth();
  const { language } = useTranslation();
  const text = computerVisionConsentTranslations[language];
  const checkerRef = useRef(createCameraAvailabilityChecker());
  const activeRef = useRef(true);
  const busyRef = useRef(false);
  const requestRef = useRef(0);
  const [checking, setChecking] = useState(false);
  const [failure, setFailure] = useState(0);
  const [failureReason, setFailureReason] = useState<CameraAvailabilityFailureReason | null>(null);

  useEffect(() => {
    activeRef.current = true;
    busyRef.current = false;
    checkerRef.current = createCameraAvailabilityChecker();
    const checker = checkerRef.current;
    setChecking(false);
    setFailure(0);
    setFailureReason(null);
    return () => { activeRef.current = false; requestRef.current += 1; checker.cancel(); };
  }, [token, computerVisionConsent, to]);

  const start = async () => {
    if (busyRef.current) return;
    void unlockAssistantAudioPlayback();
    stopAssistantSpeech();
    if (computerVisionConsent !== true) { navigate(to); return; }
    busyRef.current = true;
    setChecking(true);
    const request = ++requestRef.current;
    const result = await checkerRef.current.check();
    if (!activeRef.current || request !== requestRef.current) return;
    busyRef.current = false;
    setChecking(false);
    if (result.available) navigate(to);
    else { setFailureReason(result.reason); setFailure((value) => value + 1); }
  };

  const title = failureReason === "face-not-detected" ? text.faceNotDetected
    : failureReason === "face-check-failed" ? text.faceCheckUnavailable : text.cameraUnavailable;
  const message = failureReason === "face-not-detected" ? text.faceNotDetectedMessage
    : failureReason === "face-check-failed" ? text.faceCheckUnavailableMessage : text.cameraUnavailableMessage;

  return <>
    <button type="button" disabled={checking} aria-busy={checking} onClick={() => { void start(); }}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}>
      {checking ? <span role="status">{text.cameraChecking}</span> : children}
    </button>
    {failure > 0 && <ComputerVisionDialog key={failure} title={title} message={message}>
      <button type="button" disabled={checking} onClick={() => { void start(); }}
        className="min-h-14 w-full rounded-xl border-2 border-indigo-200 bg-indigo-50 px-5 py-3 text-base font-extrabold text-[#302992] hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
        {checking ? text.cameraChecking : text.cameraRetry}
      </button>
    </ComputerVisionDialog>}
  </>;
}
