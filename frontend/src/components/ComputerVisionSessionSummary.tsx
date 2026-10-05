import type { ReactNode } from "react";
import { useTranslation } from "../i18n";
import { adminAnalyticsTranslations } from "../lib/adminAnalyticsTranslations";
import { adminComputerVisionTranslations } from "../lib/adminComputerVisionTranslations";
import { computerVisionSummaryTranslations } from "../lib/computerVisionSummaryTranslations";
import { formatComputerVisionDuration } from "../lib/computerVisionDuration";
import type { ComputerVisionMetrics, ComputerVisionSessionSummary as Summary } from "../services/adminComputerVisionService";

export function ComputerVisionSessionSummary({ summary, durationMs, children }: { summary: Summary; durationMs: number; children?: ReactNode }) {
  const { language } = useTranslation();
  const text = computerVisionSummaryTranslations[language];
  const labels = adminComputerVisionTranslations[language];
  const common = adminAnalyticsTranslations[language];
  const values = summary.all_samples;
  const number = (value: number) => value.toLocaleString(common.locale, { maximumFractionDigits: 1 });
  const range = (axis: "yaw" | "pitch" | "roll") => values.head_pose[axis].range === null ? labels.missing : `${number(values.head_pose[axis].range!)}°`;
  const directions = ["left", "center", "right", "unknown"] as const;
  const highestCount = Math.max(...directions.map((direction) => values.eye_direction[direction].count));
  const mostCommon = highestCount === 0 ? text.unknown : directions
    .filter((direction) => values.eye_direction[direction].count === highestCount)
    .map((direction) => direction === "unknown" ? text.unknown : labels[direction]).join(" / ");
  const cards = [
    [common.duration, formatComputerVisionDuration(durationMs, language)],
    [text.trackingAvailable, values.total_samples > 0 ? `${number(values.valid_samples / values.total_samples * 100)}%` : labels.missing],
    [text.interactionPercentage, values.total_samples > 0 ? `${number(values.interacting_percentage)}%` : labels.missing],
    [text.mostCommonEyeDirection, mostCommon],
    [text.eyeChanges, number(values.eye_direction_changes)],
    [text.leftRightRange, range("yaw")], [text.upDownRange, range("pitch")], [text.tiltRange, range("roll")],
  ];
  return <section className="mt-6 rounded-xl border border-indigo-950/10 bg-white p-6" aria-labelledby="cv-summary-title">
    <h2 id="cv-summary-title" className="text-xl font-bold">{text.title}</h2>
    <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => <div key={label} className="rounded-xl bg-[#f7f7fc] p-4">
        <dt className="text-sm text-slate-600">{label}</dt><dd className="mt-2 text-xl font-bold text-[#2a2586]">{value}</dd>
      </div>)}
    </dl>
    <details className="mt-6 border-t border-indigo-950/10 pt-4">
      <summary className="cursor-pointer font-semibold text-[#2a2586]">{text.technicalDetails}</summary>
      {children}
      <p className="mt-4 text-xs leading-5 text-slate-600">{text.definitions}</p>
      <div className="mt-4 grid gap-6 xl:grid-cols-2">
        <Metrics title={text.all} values={summary.all_samples} />
        <Metrics title={text.excluding} values={summary.excluding_interaction} />
      </div>
    </details>
  </section>;
}

function Metrics({ title, values }: { title: string; values: ComputerVisionMetrics }) {
  const { language } = useTranslation();
  const text = computerVisionSummaryTranslations[language];
  const labels = adminComputerVisionTranslations[language];
  const locale = adminAnalyticsTranslations[language].locale;
  const number = (value: number | null) => value === null ? labels.missing : value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const headings = [text.minimum, text.maximum, text.mean, text.standardDeviation, text.range];
  return <div className="min-w-0">
    <h3 className="font-bold text-[#2a2586]">{title}</h3>
    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
      {[[text.total, values.total_samples], [text.valid, values.valid_samples], [text.missing, values.missing_samples],
        [text.interacting, values.interacting_samples], [text.interactionPercentage, `${number(values.interacting_percentage)}%`],
        [text.eyeChanges, values.eye_direction_changes],
      ].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="font-semibold">{value}</dd></div>)}
    </dl>
    <div className="mt-4 overflow-x-auto rounded-lg border border-indigo-950/10">
      <table className="min-w-full text-left text-xs"><caption className="p-2 text-left font-bold">{[labels.yaw, labels.pitch, labels.roll].join(" / ")}</caption>
        <thead className="bg-[#f3f3fb]"><tr><th scope="col" className="p-2">°</th>{headings.map((heading) => <th key={heading} scope="col" className="p-2">{heading}</th>)}</tr></thead>
        <tbody>{(["yaw", "pitch", "roll"] as const).map((axis) => {
          const stats = values.head_pose[axis];
          return <tr key={axis} className="border-t border-indigo-950/10"><th scope="row" className="p-2">{labels[axis]}</th>
            {[stats.minimum, stats.maximum, stats.mean, stats.standard_deviation, stats.range].map((value, index) => <td key={index} className="p-2">{number(value)}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
    <div className="mt-3 overflow-x-auto rounded-lg border border-indigo-950/10">
      <table className="min-w-full text-left text-xs"><caption className="p-2 text-left font-bold">{labels.eyeDirection}</caption>
        <thead className="bg-[#f3f3fb]"><tr>{[labels.eyeDirection, text.count, text.percentage].map((heading) => <th key={heading} scope="col" className="p-2">{heading}</th>)}</tr></thead>
        <tbody>{(["left", "center", "right", "unknown"] as const).map((direction) => <tr key={direction} className="border-t border-indigo-950/10">
          <th scope="row" className="p-2">{direction === "unknown" ? text.unknown : labels[direction]}</th>
          <td className="p-2">{values.eye_direction[direction].count}</td><td className="p-2">{number(values.eye_direction[direction].percentage)}%</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
