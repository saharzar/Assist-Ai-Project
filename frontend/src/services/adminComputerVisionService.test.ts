import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "./api";
import { fetchComputerVisionSession, fetchComputerVisionSessions } from "./adminComputerVisionService";

vi.mock("./api", () => ({ apiRequest: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("admin computer vision reads", () => {
  it("requests paginated sessions through the authenticated API helper", async () => {
    const response = { items: [], total: 0, page: 2, page_size: 10 };
    vi.mocked(apiRequest).mockResolvedValue(response);
    await expect(fetchComputerVisionSessions(2)).resolves.toEqual(response);
    expect(apiRequest).toHaveBeenCalledWith("/api/admin/computer-vision-sessions?page=2&page_size=10");
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
