import { renderHook, act, waitFor } from "@testing-library/react";
import { useAnchorDeposit } from "./useAnchorDeposit";
import * as api from "@/lib/api";

jest.mock("@/lib/api");

const mockApiFetch = api.apiFetch as jest.MockedFunction<typeof api.apiFetch>;

describe("useAnchorDeposit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with correct default values", () => {
    const { result } = renderHook(() => useAnchorDeposit());

    expect(result.current.session).toBeNull();
    expect(result.current.depositStatus).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("successfully initiates a deposit", async () => {
    const mockSession = {
      deposit_id: "deposit-123",
      transaction_id: "tx-123",
      interactive_url: "https://anchor.example.com/sep24/interactive?tx=tx-123",
    };

    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSession,
    } as Response);

    const { result } = renderHook(() => useAnchorDeposit());

    await act(async () => {
      await result.current.initiateDeposit({
        assetCode: "USDC",
        account: "GTEST123",
      });
    });

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.depositStatus).toBe("interactive");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/savings/anchor/deposit",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ asset_code: "USDC", account: "GTEST123" }),
      }),
    );
  });

  it("handles deposit initiation error", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ message: "Invalid account" }),
    } as Response);

    const { result } = renderHook(() => useAnchorDeposit());

    await act(async () => {
      await result.current.initiateDeposit({
        assetCode: "USDC",
        account: "invalid",
      });
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain("Invalid account");
      expect(result.current.depositStatus).toBe("error");
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("handles network errors", async () => {
    const networkError = new Error("Network error");
    mockApiFetch.mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => useAnchorDeposit());

    await act(async () => {
      await result.current.initiateDeposit({
        assetCode: "USDC",
        account: "GTEST123",
      });
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(networkError);
      expect(result.current.depositStatus).toBe("error");
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("resets state correctly", async () => {
    const mockSession = {
      deposit_id: "deposit-123",
      transaction_id: "tx-123",
      interactive_url: "https://anchor.example.com/sep24/interactive",
    };

    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSession,
    } as Response);

    const { result } = renderHook(() => useAnchorDeposit());

    await act(async () => {
      await result.current.initiateDeposit({
        assetCode: "USDC",
        account: "GTEST123",
      });
    });

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSession);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.depositStatus).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
