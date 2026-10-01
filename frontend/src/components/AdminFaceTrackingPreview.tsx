import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { readComputerVisionConsent } from "../lib/computerVisionConsent";
import { adminComputerVisionTranslations } from "../lib/adminComputerVisionTranslations";
import { adminFaceTrackingPreviewTranslations } from "../lib/adminFaceTrackingPreviewTranslations";
import { authorizeAdminPreview, createAdminFaceTrackingPreview, type PreviewSummary } from "../services/adminFaceTrackingPreview";
import type { FaceTrackingPreviewFrame } from "../services/faceTrackingService";
import type { ComputerVisionScenario } from "../services/computerVisionSessionService";

type Props = { active: boolean; scenario: ComputerVisionScenario; getFrame: () => FaceTrackingPreviewFrame | null };

export function AdminFaceTrackingPreview(props: Props) {
  const { isAuthenticated, isLoading, user, token } = useAuth();
  if (!props.active || isLoading || !isAuthenticated || user?.role !== "admin" || !token) return null;
  return <AuthorizedPreview key={token} {...props} token={token} />;
}

function AuthorizedPreview({ scenario, getFrame, token }: Props & { token: string }) {
  const { language } = useTranslation();
  const text = adminFaceTrackingPreviewTranslations[language];
  const labels = adminComputerVisionTranslations[language];
  const [authorized, setAuthorized] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const consent = readComputerVisionConsent(scenario) === true;

  useEffect(() => {
    let active = true;
    void authorizeAdminPreview(token).then((allowed) => { if (active) setAuthorized(allowed); }).catch(() => {});
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!authorized || !enabled || !consent || !canvas.current) return;
    setSummary(null);
    setUnavailable(false);
    // The drawing service independently verifies the token; toggling React state cannot bypass the server check.
    const preview = createAdminFaceTrackingPreview({ token, canvas: canvas.current, getFrame,
      onUpdate: setSummary, onUnavailable: () => setUnavailable(true) });
    void preview.start();
    window.addEventListener("pagehide", preview.stop);
    return () => { window.removeEventListener("pagehide", preview.stop); preview.stop(); };
  }, [authorized, enabled, consent, token, getFrame]);

  if (!authorized) return null;
  const yesNo = (value: boolean | undefined) => value ? labels.yes : labels.no;
  const angle = (value: number | undefined) => value === undefined ? labels.missing : `${value.toFixed(1)}°`;
  return <section className="mx-auto my-4 max-w-xl rounded-xl border border-indigo-200 bg-white p-4 text-[#1d1a3d]">
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-bold">{text.title}</h2>
      <button type="button" role="switch" aria-checked={enabled && consent} aria-label={text.title}
        disabled={!consent} onClick={() => setEnabled((value) => !value)}
        className="rounded-full border border-indigo-200 px-4 py-2 font-bold focus:ring-2 focus:ring-cyan-400 disabled:opacity-40">
        {enabled && consent ? text.on : text.off}
      </button>
    </div>
    {!consent && <p className="mt-2 text-sm text-slate-600">{text.consentRequired}</p>}
    {enabled && consent && <>
      <p className="mt-2 text-xs text-slate-600">{text.localOnly}</p>
      <canvas ref={canvas} width={640} height={480} aria-label={text.title} className="mt-3 w-full rounded-lg bg-slate-950" />
      {unavailable ? <p role="status" className="mt-2 text-sm text-amber-800">{text.unavailable}</p> : <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {[[text.camera, yesNo(summary?.cameraTrackingActive)], [text.face, yesNo(summary?.faceDetected)],
          [text.landmarks, summary?.landmarkCount ?? 0], [labels.yaw, angle(summary?.headPose?.yaw)],
          [labels.pitch, angle(summary?.headPose?.pitch)], [labels.roll, angle(summary?.headPose?.roll)],
          [labels.eyeDirection, summary?.estimatedEyeDirection ? labels[summary.estimatedEyeDirection] : labels.missing],
          [labels.interaction, yesNo(summary?.isUserInteracting)],
        ].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-bold">{value}</dd></div>)}
      </dl>}
    </>}
  </section>;
}
