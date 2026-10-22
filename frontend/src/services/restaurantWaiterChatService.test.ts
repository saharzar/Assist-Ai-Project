import { beforeEach, describe, expect, it, vi } from "vitest";
import { chatWithRestaurantWaiter, restaurantWaiterSnapshot } from "./restaurantWaiterChatService";
import { apiRequest } from "./api";
import { initialRestaurantState } from "../lib/restaurantState";
import { initialRestaurantPayment } from "../lib/restaurantPayment";

vi.mock("./api", () => ({ apiRequest: vi.fn() }));

describe("Restaurant waiter chat API", () => {
  const state = restaurantWaiterSnapshot(initialRestaurantState, initialRestaurantPayment);
  beforeEach(() => vi.clearAllMocks());

  it("sends only text, language, and bounded history through the authenticated API helper", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ reply: "  Welcome.  ", actions: [], state });
    const payload = { message: "Hello", language: "en" as const, history: [{ role: "user" as const, content: "Hi" }], state };
    const signal = new AbortController().signal;
    expect(await chatWithRestaurantWaiter(payload, signal)).toEqual({ reply: "Welcome.", actions: [], state });
    expect(apiRequest).toHaveBeenCalledWith("/api/restaurant/waiter/chat", {
      method: "POST", body: JSON.stringify(payload), signal,
    });
  });

  it("rejects empty or malformed replies", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ reply: "  " });
    await expect(chatWithRestaurantWaiter({ message: "Hi", language: "en", history: [], state })).rejects.toThrow("invalid reply");
  });

  it("passes request failures to the waiter for its localized fallback", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error("temporarily unavailable"));
    await expect(chatWithRestaurantWaiter({ message: "Hi", language: "fr", history: [], state })).rejects.toThrow("temporarily unavailable");
  });
});
