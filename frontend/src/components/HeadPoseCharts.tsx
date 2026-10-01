import { useEffect, useState } from "react";
import { useTranslation } from "../i18n";
import { adminAnalyticsTranslations } from "../lib/adminAnalyticsTranslations";
import { adminComputerVisionTranslations } from "../lib/adminComputerVisionTranslations";
import { headPoseChartTranslations } from "../lib/headPoseChartTranslations";
import { fetchComputerVisionTimeline, type ComputerVisionSample } from "../services/adminComputerVisionService";

export const HEAD_POSE_CHART_MAX_GAP_MS = 1500;
const HALF_SAMPLE_MS = 250; // Existing recorder samples every 500 ms.
type Axis = "yaw" | "pitch" | "roll";
type Point = { timestamp: number; angle: number };

/** Preserve missing data and long gaps rather than interpolating through them. */
export function headPoseSegments(samples: ComputerVisionSample[], axis: Axis): Point[][] {
  const segments: Point[][] = [];
  let current: Point[] = [];
  for (const sample of samples) {
    const value = sample[axis];
    if (value === null || !Number.isFinite(value)) { current = []; continue; }
    const previous = current[current.length - 1];
    if (!previous || sample.timestamp - previous.timestamp > HEAD_POSE_CHART_MAX_GAP_MS || sample.timestamp <= previous.timestamp) {
      current = []; segments.push(current);
    }
    current.push({ timestamp: sample.timestamp, angle: value });
  }
  return segments;
}

function interactionBands(samples: ComputerVisionSample[], end: number) {
  const bands: Array<{ start: number; end: number }> = [];
  for (const sample of samples) {
    if (!sample.isUserInteracting) continue;
    const start = Math.max(0, sample.timestamp - HALF_SAMPLE_MS);
    const stop = Math.min(end, sample.timestamp + HALF_SAMPLE_MS);
    const last = bands[bands.length - 1];
    if (last && start <= last.end) last.end = Math.max(last.end, stop);
    else bands.push({ start, end: stop });
  }
  return bands;
}

export function SavedHeadPoseCharts({ sessionId }: { sessionId: string }) {
  const { language } = useTranslation();
  const common = adminAnalyticsTranslations[language];
  const text = headPoseChartTranslations[language];
  const [timeline, setTimeline] = useState<{ samples: ComputerVisionSample[]; durationMs: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false); setTimeline(null);
    void fetchComputerVisionTimeline(sessionId, controller.signal)
      .then((rows) => { if (!controller.signal.aborted) setTimeline(rows); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sessionId]);
  if (loading || error) return <section className="mt-6 rounded-xl border border-indigo-950/10 bg-white p-5">
    <h2 className="text-xl font-bold">{text.title}</h2>
    <p role={error ? "alert" : "status"} className="mt-2 text-sm text-slate-600">{error ? common.loadError : common.loading}</p>
  </section>;
  return <HeadPoseCharts samples={timeline?.samples ?? []} durationMs={timeline?.durationMs ?? 0} />;
}

/** Dependency-free SVG charts; receives saved values only. */
export function HeadPoseCharts({ samples, durationMs }: { samples: ComputerVisionSample[]; durationMs: number }) {
  const { language } = useTranslation();
  const text = headPoseChartTranslations[language];
  const labels = adminComputerVisionTranslations[language];
  const locale = adminAnalyticsTranslations[language].locale;
  const axes: Axis[] = ["yaw", "pitch", "roll"];
  const series = axes.map((axis) => ({ axis, segments: headPoseSegments(samples, axis) }));
  let bound = 10;
  for (const item of series) for (const segment of item.segments) for (const point of segment) bound = Math.max(bound, Math.ceil(Math.abs(point.angle) / 10) * 10);
  const end = Math.max(1000, durationMs, samples[samples.length - 1]?.timestamp ?? 0);
  const bands = interactionBands(samples, end);
  const x = (ms: number) => 55 + ms / end * 320;
  const y = (angle: number) => 30 + (bound - angle) / (2 * bound) * 170;
  const format = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 1 });
  return <section className="mt-6 rounded-xl border border-indigo-950/10 bg-white p-5" aria-labelledby="head-pose-charts-title">
    <h2 id="head-pose-charts-title" className="text-xl font-bold">{text.title}</h2>
    <p className="mt-2 text-xs text-slate-600"><span className="mr-2 inline-block h-3 w-3 bg-amber-200" aria-hidden="true" />{text.interaction}</p>
    <p className="mt-1 text-xs text-slate-600">{text.gaps}</p>
    {series.every((item) => item.segments.length === 0) ? <p className="mt-4 text-sm text-slate-600">{text.empty}</p> :
      <div className="mt-4 grid gap-4 xl:grid-cols-3">{series.map(({ axis, segments }, index) => <figure key={axis} className="min-w-0 rounded-lg border border-indigo-950/10 p-3">
        <figcaption className="font-bold text-[#2a2586]">{labels[axis]}</figcaption>
        <svg viewBox="0 0 400 260" role="img" aria-label={`${labels[axis]} — ${text.time}`} className="mt-2 w-full">
          <title>{labels[axis]} — {text.title}</title><desc>{text.interaction}. {text.gaps}</desc>
          {bands.map((band, i) => <rect key={i} data-interaction="true" x={x(band.start)} y={30} width={Math.max(1, x(band.end) - x(band.start))} height={170} fill="#fbbf24" opacity={0.16}><title>{labels.interaction}: {format(band.start / 1000)}–{format(band.end / 1000)} s</title></rect>)}
          {[-bound, 0, bound].map((tick) => <g key={tick}><line x1={55} x2={375} y1={y(tick)} y2={y(tick)} stroke="#e2e8f0" /><text x={48} y={y(tick) + 4} textAnchor="end" fontSize={14} fill="#64748b">{format(tick)}</text></g>)}
          <line x1={55} x2={55} y1={30} y2={200} stroke="#94a3b8" /><line x1={55} x2={375} y1={200} y2={200} stroke="#94a3b8" />
          {[0, 0.5, 1].map((fraction) => <text key={fraction} x={x(end * fraction)} y={220} textAnchor="middle" fontSize={14} fill="#64748b">{format(end * fraction / 1000)}</text>)}
          <text x={215} y={247} textAnchor="middle" fontSize={14} fill="#64748b">{text.time}</text>
          <text x={12} y={115} textAnchor="middle" transform="rotate(-90 12 115)" fontSize={14} fill="#64748b">{text.angle}</text>
          {segments.map((segment, i) => segment.length === 1 ? <circle key={i} data-series={axis} cx={x(segment[0].timestamp)} cy={y(segment[0].angle)} r={3} fill={["#3730a3", "#0891b2", "#7c3aed"][index]} /> :
            <path key={i} data-series={axis} d={segment.map((point, p) => `${p === 0 ? "M" : "L"}${x(point.timestamp).toFixed(2)},${y(point.angle).toFixed(2)}`).join(" ")} fill="none" stroke={["#3730a3", "#0891b2", "#7c3aed"][index]} strokeWidth={2} strokeLinejoin="round" />)}
        </svg>
      </figure>)}</div>}
  </section>;
}
