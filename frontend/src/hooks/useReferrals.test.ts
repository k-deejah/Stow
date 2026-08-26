import { renderHook, act, waitFor } from "@testing-library/react";
import { useReferrals } from "./useReferrals";
import * as api from "@/lib/api";

jest.mock("@/lib/api");

const mockApiFetch = api.apiFetch as jest.MockedFunction<typeof api.apiFetch>;

describe("useReferrals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches referrals on mount", async () => {
    const mockData = {
      referral_code: "user-abc-123",
      total: 2,
      pending: 1,
      qualified: 1,
      referrals: [
        {
          id: "r1",
          referred_id: "u1",
          referred_username: "alice",
          referred_stellar_address: "GALICE",
          status: "qualified" as const,
          created_at: "2026-01-01T00:00:00Z",
          qualified_at: "2026-01-02T00:00:00Z",
        },
      ],
    };

    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const { result } = renderHook(() => useReferrals());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/users/me/referrals",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("handles fetch errors", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ message: "Something went wrong" }),
    } as Response);

    const { result } = renderHook(() => useReferrals());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain("Something went wrong");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
    });
  });

  it("refetches when refetch is called", async () => {
    const mockData = {
      referral_code: "user-abc-123",
      total: 0,
      pending: 0,
      qualified: 0,
      referrals: [],
    };

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const { result } = renderHook(() => useReferrals());

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    mockApiFetch.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });
});
