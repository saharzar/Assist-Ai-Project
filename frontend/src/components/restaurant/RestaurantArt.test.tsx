import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RestaurantStaff } from "./RestaurantArt";
describe("restaurant waiter presentation", () => {
  it.each(["idle", "listening", "success"] as const)("keeps the mouth still in %s", (state) => {
    const html = renderToStaticMarkup(<RestaurantStaff state={state} />);
    expect(html).toContain(`data-waiter-state="${state}"`);
    expect(html).not.toContain("restaurant-waiter-mouth");
  });
  it("renders the animated mouth only while speaking", () => {
    expect(renderToStaticMarkup(<RestaurantStaff state="speaking" />)).toContain("restaurant-waiter-mouth");
  });
});
