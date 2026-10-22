import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { readComputerVisionConsent } from "../lib/computerVisionConsent";
import { adminComputerVisionTranslations } from "../lib/adminComputerVisionTranslations";
import { adminFaceTrackingPreviewTranslations } from "../lib/adminFaceTrackingPreviewTranslations";
import { authorizeAdminPreview, createAdminFaceTrackingPreview, type PreviewSummary } from "../services/adminFaceTrackingPreview";
import type { FaceTrackingPreviewFrame } from "../services/faceTrackingService";
import type { ComputerVisionScenario } from "../services/computerVisionSessionService";

type Props = { active: boolean; scenario: ComputerVisionScenario; getFrame: () => FaceTrackingPreviewFrame | null; compactPopup?: boolean };

export function AdminFaceTrackingPreview(props: Props) {
  const { isAuthenticated, isLoading, user, token } = useAuth();
  if (!props.active || isLoading || !isAuthenticated || user?.role !== "admin" || !token) return null;
  return <AuthorizedPreview key={token} {...props} token={token} />;
}

function AuthorizedPreview({ scenario, getFrame, token, compactPopup = false }: Props & { token: string }) {
  const { language } = useTranslation();
  const text = adminFaceTrackingPreviewTranslations[language];
  const labels = adminComputerVisionTranslations[language];
  const [authorized, setAuthorized] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
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
  const title = compactPopup ? text.popupTitle : text.title;
  const yesNo = (value: boolean | undefined) => value ? labels.yes : labels.no;
  const angle = (value: number | undefined) => value === undefined ? labels.missing : `${value.toFixed(1)}°`;
  const panel = <section id={compactPopup ? "restaurant-camera-popup" : undefined} className="w-full min-w-0 rounded-xl border border-indigo-200 bg-white p-3 text-[#1d1a3d] shadow-lg sm:p-4">
    <div className="flex items-center justify-between gap-4">
      <h2 className="min-w-0 text-sm font-bold leading-tight">{title}</h2>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" role="switch" aria-checked={enabled && consent} aria-label={title}
          data-atm-button-sound="true" disabled={!consent}
          onClick={() => setEnabled((value) => { const next = !value; if (next) setCollapsed(false); return next; })}
          className="rounded-full border border-indigo-200 px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-cyan-400 disabled:opacity-40">
          {enabled && consent ? text.on : text.off}
        </button>
        <button type="button" aria-label={collapsed ? text.expand : text.collapse}
          aria-expanded={!collapsed} data-atm-button-sound="true"
          onClick={() => { if (enabled) setEnabled(false); setCollapsed((value) => !value); }}
          className="rounded-full p-1.5 text-[#2a2586] hover:bg-indigo-50 focus:ring-2 focus:ring-cyan-400">
          {collapsed ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronUp className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
    {!collapsed && !consent && <p className="mt-2 text-xs text-slate-600">{text.consentRequired}</p>}
    {!collapsed && enabled && consent && <>
      <p className="mt-2 text-[11px] leading-4 text-slate-600">{text.localOnly}</p>
      <canvas ref={canvas} width={640} height={480} aria-label={title} className="mt-2 max-h-44 w-full rounded-lg bg-slate-950 object-contain sm:max-h-48" />
      {unavailable ? <p role="status" className="mt-2 text-sm text-amber-800">{text.unavailable}</p> : <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {[[text.camera, yesNo(summary?.cameraTrackingActive)], [text.face, yesNo(summary?.faceDetected)],
          [text.detectedFaces, summary?.detectedFaceCount ?? 0],
          [text.primaryFace, summary?.primaryFaceIndex == null ? labels.missing : summary.primaryFaceIndex + 1],
          [text.landmarks, summary?.landmarkCount ?? 0], [labels.yaw, angle(summary?.headPose?.yaw)],
          [labels.pitch, angle(summary?.headPose?.pitch)], [labels.roll, angle(summary?.headPose?.roll)],
          [labels.eyeDirection, summary?.estimatedEyeDirection ? labels[summary.estimatedEyeDirection] : labels.missing],
          [labels.interaction, yesNo(summary?.isUserInteracting)],
        ].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-bold">{value}</dd></div>)}
      </dl>}
    </>}
  </section>;
  if (!compactPopup) return panel;
  return <div className="fixed bottom-[76px] right-4 z-30 flex flex-col items-end gap-2">
    {popupOpen && <div className="w-[min(320px,calc(100vw-2rem))] max-h-[min(70vh,560px)] overflow-y-auto">{panel}</div>}
    <button type="button" aria-expanded={popupOpen} aria-controls="restaurant-camera-popup"
      onClick={() => { if (popupOpen) setEnabled(false); setPopupOpen((open) => !open); }}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-500 bg-slate-950/95 px-4 py-2 text-sm font-bold text-white shadow-xl transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-950">
      <Camera className="h-4 w-4" aria-hidden="true" />{title}
    </button>
  </div>;
}
