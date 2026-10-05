import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HeadPoseCharts, headPoseSegments } from "./HeadPoseCharts";
import { headPoseChartTranslations } from "../lib/headPoseChartTranslations";
import type { ComputerVisionSample } from "../services/adminComputerVisionService";

vi.mock("../i18n", () => ({ useTranslation: () => ({ language: "en" }) }));
const sample = (timestamp: number, yaw: number | null = 10, interacting = false): ComputerVisionSample => ({
  timestamp, yaw, pitch: yaw, roll: yaw, estimatedEyeDirection: null, isUserInteracting: interacting,
});
const render = (samples: ComputerVisionSample[]) => renderToStaticMarkup(<HeadPoseCharts samples={samples} durationMs={5000} />);

describe("saved head pose charts", () => {
  it("renders three angle series with labeled time and degree axes", () => {
    const html = render([sample(500, -10), sample(1000, 20)]);
    expect(html.match(/role="img"/g)).toHaveLength(3);
    for (const axis of ["yaw", "pitch", "roll"]) expect(html).toContain(`data-series="${axis}"`);
    expect(html).toContain("Session time (s)"); expect(html).toContain("Angle (°)");
    expect(html).not.toContain("NaN");
  });

  it("splits lines at nulls and long timestamp gaps instead of drawing across unavailable tracking", () => {
    const rows = [sample(500), sample(1000), sample(1500, null), sample(2000), sample(2500), sample(5000)];
    const segments = headPoseSegments(rows, "yaw");
    expect(segments.map((segment) => segment.map((point) => point.timestamp))).toEqual([[500, 1000], [2000, 2500], [5000]]);
    const html = render(rows);
    expect(html.match(/<path /g)).toHaveLength(6);
    expect(html.match(/<circle /g)).toHaveLength(3);
  });

  it("keeps interaction samples in lines and shows subtle bands even for missing values", () => {
    const rows = [sample(500), sample(1000, 20, true), sample(1500, null, true), sample(2000)];
    expect(headPoseSegments(rows, "yaw")[0]).toEqual([{ timestamp: 500, angle: 10 }, { timestamp: 1000, angle: 20 }]);
    const html = render(rows);
    expect(html.match(/data-interaction="true"/g)).toHaveLength(3); // Adjacent samples merge into one band per chart.
    expect(html).toContain('opacity="0.16"');
    expect(html).toContain("Amber areas: keyboard/mouse activity");
    expect(html).toContain("Left / right movement");
    expect(html).toContain("Up / down movement");
    expect(html).toContain("Head tilt");
  });

  it("does not bridge nonfinite values or nonincreasing timestamps", () => {
    expect(headPoseSegments([sample(500), sample(1000, NaN), sample(1500), sample(1500)], "yaw")).toHaveLength(3);
  });

  it("handles empty and fully missing sessions without invalid SVG coordinates", () => {
    for (const rows of [[], [sample(500, null)]]) {
      const html = render(rows);
      expect(html).toContain("No saved head movement data to display.");
      expect(html).not.toMatch(/NaN|Infinity/);
    }
  });

  it("keeps zero angles visible as a point rather than treating them as missing", () => {
    const html = render([sample(0, 0)]);
    expect(html.match(/<circle /g)).toHaveLength(3);
  });

  it("provides chart wording for every supported language", () => {
    expect(Object.keys(headPoseChartTranslations).sort()).toEqual(["de", "en", "es", "fr", "pt", "tr"]);
    for (const text of Object.values(headPoseChartTranslations)) expect(Object.values(text).every(Boolean)).toBe(true);
  });
});
