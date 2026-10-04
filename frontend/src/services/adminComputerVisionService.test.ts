import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "./api";
import { fetchComputerVisionSession, fetchComputerVisionSessions, fetchComputerVisionTimeline } from "./adminComputerVisionService";

vi.mock("./api", () => ({ apiRequest: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("admin computer vision reads", () => {
  it("loads the complete chart timeline across saved sample pages with cancellation support", async () => {
    const signal = new AbortController().signal;
    const samples = Array.from({ length: 501 }, (_, index) => ({ timestamp: index * 500 }));
    vi.mocked(apiRequest).mockResolvedValueOnce({ session: { sample_count: 501, duration_ms: 251000 }, page_size: 500, samples: samples.slice(0, 500) })
      .mockResolvedValueOnce({ samples: samples.slice(500) });
    await expect(fetchComputerVisionTimeline("record/id", signal)).resolves.toEqual({ samples, durationMs: 251000 });
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/admin/computer-vision-sessions/record%2Fid?page=1&page_size=500", { signal });
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/admin/computer-vision-sessions/record%2Fid?page=2&page_size=500", { signal });
  });

  it("handles an empty timeline and rejects incomplete chart data", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ session: { sample_count: 0, duration_ms: 0 }, page_size: 500, samples: [] });
    await expect(fetchComputerVisionTimeline("empty")).resolves.toEqual({ samples: [], durationMs: 0 });
    vi.mocked(apiRequest).mockResolvedValueOnce({ session: { sample_count: 2 }, page_size: 500, samples: [] });
    await expect(fetchComputerVisionTimeline("incomplete")).rejects.toThrow("Incomplete");
  });
  it("requests paginated sessions through the authenticated API helper", async () => {
    const response = { items: [], total: 0, page: 2, page_size: 10 };
    vi.mocked(apiRequest).mockResolvedValue(response);
    await expect(fetchComputerVisionSessions(2)).resolves.toEqual(response);
    expect(apiRequest).toHaveBeenCalledWith("/api/admin/computer-vision-sessions?page=2&page_size=10");
  });

  it("filters recordings by scenario while retaining the existing page size", async () => {
    const response = { items: [], total: 0, page: 2, page_size: 10 };
    vi.mocked(apiRequest).mockResolvedValue(response);
    await expect(fetchComputerVisionSessions(2, "atm-withdrawal")).resolves.toEqual(response);
    expect(apiRequest).toHaveBeenCalledWith("/api/admin/computer-vision-sessions?page=2&page_size=10&scenario_key=atm-withdrawal");
  });

  it("requests a bounded sample page and encodes the recording identifier", async () => {
    const response = { session: { sample_count: 300 }, samples: [], page: 3, page_size: 100 };
    vi.mocked(apiRequest).mockResolvedValue(response);
    await expect(fetchComputerVisionSession("record/id", 3)).resolves.toEqual(response);
    expect(apiRequest).toHaveBeenCalledWith("/api/admin/computer-vision-sessions/record%2Fid?page=3&page_size=100");
  });

  it("propagates authorization and loading failures to the page", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error("Access denied"));
    await expect(fetchComputerVisionSessions()).rejects.toThrow("Access denied");
    await expect(fetchComputerVisionSession("record")).rejects.toThrow("Access denied");
  });
});
