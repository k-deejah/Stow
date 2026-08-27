import { renderHook, waitFor, act } from "@testing-library/react";
import { useGroupDetail } from "./useGroupDetail";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, apiFetch: jest.fn() };
});

const mockApiFetch = api.apiFetch as jest.MockedFunction<typeof api.apiFetch>;

describe("useGroupDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts in the loading state", () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useGroupDetail("group-1"));

    expect(result.current.status).toBe("loading");
    expect(result.current.group).toBeNull();
  });

  it("does not fetch when groupId is null", () => {
    const { result } = renderHook(() => useGroupDetail(null));

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.status).toBe("loading");
  });

  it("loads and exposes the group on success", async () => {
    const mockGroup = {
      on_chain_id: "group-1",
      name: "Rent Split",
      balance: "50000000",
      settled: false,
      members: [{ address: "GALICE", contributed: "25000000" }],
    };
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockGroup,
    } as Response);

    const { result } = renderHook(() => useGroupDetail("group-1"));

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(result.current.group).toEqual(mockGroup);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/savings/groups/group-1");
  });

  it("sets not-found status on a 404 response", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useGroupDetail("missing-group"));

    await waitFor(() => {
      expect(result.current.status).toBe("not-found");
    });
    expect(result.current.group).toBeNull();
  });

  it("sets error status on other failures", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useGroupDetail("group-1"));

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.error).not.toBeNull();
  });

  it("refetches when refetch is called", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        on_chain_id: "group-1",
        name: "Rent Split",
        balance: "0",
        settled: false,
        members: [],
      }),
    } as Response);

    const { result } = renderHook(() => useGroupDetail("group-1"));

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
  });
});
