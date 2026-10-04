import { describe, expect, it } from "vitest";
import { formatComputerVisionDuration } from "./computerVisionDuration";

describe("human-readable computer vision duration", () => {
  it("uses whole duration units and carries rounded seconds into minutes", () => {
    expect(formatComputerVisionDuration(127313, "en")).toBe("2 min 7 sec");
    expect(formatComputerVisionDuration(59999, "en")).toBe("1 min");
    expect(formatComputerVisionDuration(3727000, "en")).toBe("1 hr 2 min 7 sec");
    expect(formatComputerVisionDuration(0, "en")).toBe("0 sec");
    expect(formatComputerVisionDuration(60000, "en")).toBe("1 min");
  });

  it("uses translated units in all six supported languages", () => {
    expect(formatComputerVisionDuration(127313, "tr")).toBe("2 dk 7 sn");
    expect(formatComputerVisionDuration(127313, "de")).toBe("2 Min. 7 Sek.");
    for (const language of ["es", "pt", "fr"] as const) {
      expect(formatComputerVisionDuration(127313, language)).toBe("2 min 7 s");
    }
  });
});
