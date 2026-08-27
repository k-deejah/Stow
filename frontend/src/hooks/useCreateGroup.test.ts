import { renderHook, act, waitFor } from "@testing-library/react";
import { useCreateGroup } from "./useCreateGroup";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, apiFetch: jest.fn() };
});

const mockApiFetch = api.apiFetch as jest.MockedFunction<typeof api.apiFetch>;

describe("useCreateGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with correct default values", () => {
    const { result } = renderHook(() => useCreateGroup());

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("successfully creates a group", async () => {
    const mockGroup = { on_chain_id: "group-123", name: "Rent Split" };
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGroup,
    } as Response);

    const { result } = renderHook(() => useCreateGroup());

    let created: Awaited<ReturnType<typeof result.current.createGroup>> = null;
    await act(async () => {
      created = await result.current.createGroup("Rent Split");
    });

    expect(created).toEqual(mockGroup);
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/savings/groups",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Rent Split" }),
      }),
    );
  });

  it("handles a failed creation", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ message: "Name already in use" }),
    } as Response);

    const { result } = renderHook(() => useCreateGroup());

    let created: Awaited<ReturnType<typeof result.current.createGroup>> = null;
    await act(async () => {
      created = await result.current.createGroup("Rent Split");
    });

    expect(created).toBeNull();
    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.error?.message).toBe("Name already in use");
  });

  it("resets state", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useCreateGroup());

    await act(async () => {
      await result.current.createGroup("Rent Split");
    });
    expect(result.current.status).toBe("error");

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });
});
