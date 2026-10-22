import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DrinkIllustration, RestaurantStaff } from "./RestaurantArt";
import { getRestaurantFrameKey, restaurantFrames } from "./RestaurantStaff";
describe("restaurant waiter presentation", () => {
  it.each(["closed", "slight", "open", "wide"] as const)("blinks without changing the %s mouth state", (mouth) => {
    expect(getRestaurantFrameKey(mouth, true)).toBe(`${mouth}-closed`);
    expect(getRestaurantFrameKey(mouth, false)).toBe(`${mouth}-open`);
  });
  it("keeps the rounded mouth when a blink overlaps it", () => {
    expect(restaurantFrames["rounded-closed"]).toBe(restaurantFrames["rounded-open"]);
  });
  it.each(["water", "juice"] as const)("renders original %s artwork with the food illustration proportions", (drink) => {
    const html = renderToStaticMarkup(<DrinkIllustration drink={drink} />);
    expect(html).toContain(`data-drink-illustration="${drink}"`);
    expect(html).toContain('viewBox="0 0 180 120"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<image");
  });
  it.each(["idle", "listening", "success"] as const)("keeps the mouth still in %s", (state) => {
    const html = renderToStaticMarkup(<RestaurantStaff state={state} />);
    expect(html).toContain(`data-waiter-state="${state}"`);
    expect(html).toContain('data-mouth-state="closed"');
    expect(html.match(/<img /g)).toHaveLength(12);
    expect(html).not.toContain("<svg");
  });
  it("preloads every supplied frame inside the same fixed portrait and mouth viewport", () => {
    const html = renderToStaticMarkup(<RestaurantStaff state="speaking" className="restaurant-scene-waiter" />);
    expect(html).toContain('data-waiter-state="speaking"');
    expect(html).toContain("restaurant-waiter restaurant-scene-waiter");
    expect(html.match(/loading="eager"/g)).toHaveLength(12);
    expect(html.match(/alt=""/g)).toHaveLength(12);
    const expectedFrames = {
      "closed-open": "closed_openeyes.png", "slight-open": "slightopen_openeyes.png",
      "open-open": "open_openeyes.png", "wide-open": "wideopen_openeyes.png", "extra-open": "extraopen_openeyes.png",
      "rounded-open": "roundedvowel_openeyes.png", "closed-closed": "closed_blink.png",
      "slight-closed": "slightopen_blink.png", "open-closed": "open_openeyes.png",
      "wide-closed": "wideopen_openeyes.png", "extra-closed": "extraopen_openeyes.png", "rounded-closed": "roundedvowel_openeyes.png",
    };
    for (const [key, filename] of Object.entries(expectedFrames)) {
      expect(restaurantFrames[key as keyof typeof restaurantFrames]).toContain(filename);
      expect(html).toContain(`/${filename}`);
    }
    expect(html).toContain('aria-hidden="true"');
  });
});
