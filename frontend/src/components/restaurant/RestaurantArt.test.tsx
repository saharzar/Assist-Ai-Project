import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DrinkIllustration, RestaurantStaff } from "./RestaurantArt";
describe("restaurant waiter presentation", () => {
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
    expect(html).not.toContain("restaurant-waiter-mouth");
  });
  it("renders the animated mouth only while speaking", () => {
    expect(renderToStaticMarkup(<RestaurantStaff state="speaking" />)).toContain("restaurant-waiter-mouth");
  });
});
