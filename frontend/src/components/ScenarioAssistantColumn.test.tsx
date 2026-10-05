import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScenarioAssistantColumn } from "./ScenarioAssistantColumn";

describe("scenario assistant and preview column", () => {
  it("places the preview directly below the assistant in the same sticky column", () => {
    const html = renderToStaticMarkup(<ScenarioAssistantColumn assistant={<aside>ASSIST-AI</aside>}>
      <section>Computer Vision Preview</section>
    </ScenarioAssistantColumn>);
    expect(html.indexOf("ASSIST-AI")).toBeLessThan(html.indexOf("Computer Vision Preview"));
    expect(html).toContain('data-scenario-assistant-column="true"');
    expect(html).toContain("xl:sticky");
    expect(html).toContain("xl:overflow-y-auto");
    expect(html).not.toContain("fixed");
  });

  it("keeps an assistant column responsive while stacking its children on smaller screens", () => {
    const html = renderToStaticMarkup(<ScenarioAssistantColumn assistant={<aside>ASSIST-AI</aside>}>
      <section>Computer Vision Preview</section>
    </ScenarioAssistantColumn>);
    expect(html).toContain("flex-col");
    expect(html).toContain("gap-4");
    expect(html).toContain("ASSIST-AI");
    expect(html).toContain("Computer Vision Preview");
  });
});
