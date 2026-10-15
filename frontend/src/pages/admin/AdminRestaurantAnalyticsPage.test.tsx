import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRestaurantAnalyticsPage } from "./AdminRestaurantAnalyticsPage";
const state = vi.hoisted(() => ({ authenticated: true, role: "admin", cursor: 0 }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useEffect: () => {},
  useState: () => [[1, { items: [{ session_id: "internal-id", display_name: "Test User", started_at: "2026-10-15T10:00:00Z", duration_seconds: 65,
    completion_status: "completed", final_step_reached: "success", selected_meal: "soup" }], total: 1, page_size: 10 }, false, false][state.cursor++], vi.fn()],
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { role: state.role }, isAuthenticated: state.authenticated, token: "test-token" }) }));
vi.mock("../../i18n", () => ({ useTranslation: () => ({ language: "en" }) }));
vi.mock("react-router-dom", () => ({ Navigate: () => <span>login redirect</span>, Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }));
beforeEach(() => { state.authenticated = true; state.role = "admin"; state.cursor = 0; });
describe("restaurant admin view", () => {
  it("shows human-readable attempt metadata, translated outcome and selected meal", () => {
    const html = renderToStaticMarkup(<AdminRestaurantAnalyticsPage />);
    expect(html).toContain("Test User"); expect(html).toContain("Soup"); expect(html).toContain("1 min 5 sec");
    expect(html).toContain("Order placed"); expect(html).not.toContain("internal-id");
  });
  it("denies normal users and redirects unauthenticated users", () => {
    state.role = "user"; expect(renderToStaticMarkup(<AdminRestaurantAnalyticsPage />)).toContain("Access denied");
    state.authenticated = false; state.cursor = 0;
    expect(renderToStaticMarkup(<AdminRestaurantAnalyticsPage />)).toContain("login redirect");
  });
});
