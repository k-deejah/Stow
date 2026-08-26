import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReferralsPage from "./page";
import * as useReferralsHook from "@/hooks/useReferrals";

jest.mock("@/hooks/useReferrals");

const mockUseReferrals = useReferralsHook.useReferrals as jest.MockedFunction<
  typeof useReferralsHook.useReferrals
>;

const defaultHookReturn = {
  data: null,
  error: null,
  isLoading: true,
  refetch: jest.fn(),
};

Object.defineProperty(navigator, "clipboard", {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  configurable: true,
});

describe("ReferralsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReferrals.mockReturnValue(defaultHookReturn);
  });

  it("shows skeletons while loading", () => {
    render(<ReferralsPage />);

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("shows error state with retry", () => {
    const refetch = jest.fn();
    mockUseReferrals.mockReturnValue({
      ...defaultHookReturn,
      isLoading: false,
      error: new Error("Failed to load"),
      refetch,
    });

    render(<ReferralsPage />);

    expect(screen.getByText(/retry/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/retry/i));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders referral code, counts, and referral list", () => {
    mockUseReferrals.mockReturnValue({
      ...defaultHookReturn,
      isLoading: false,
      data: {
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
            status: "qualified",
            created_at: "2026-01-01T00:00:00Z",
            qualified_at: "2026-01-02T00:00:00Z",
          },
          {
            id: "r2",
            referred_id: "u2",
            referred_username: null,
            referred_stellar_address: "GBOB",
            status: "pending",
            created_at: "2026-01-03T00:00:00Z",
            qualified_at: null,
          },
        ],
      },
    });

    render(<ReferralsPage />);

    expect(screen.getByLabelText(/Your referral link/i)).toHaveValue(
      expect.stringContaining("user-abc-123"),
    );
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("GBOB")).toBeInTheDocument();
    expect(screen.getByText("qualified")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("shows an empty state when there are no referrals", () => {
    mockUseReferrals.mockReturnValue({
      ...defaultHookReturn,
      isLoading: false,
      data: {
        referral_code: "user-abc-123",
        total: 0,
        pending: 0,
        qualified: 0,
        referrals: [],
      },
    });

    render(<ReferralsPage />);

    expect(screen.getByText(/No referrals yet/i)).toBeInTheDocument();
  });

  it("copies the referral link to the clipboard", async () => {
    mockUseReferrals.mockReturnValue({
      ...defaultHookReturn,
      isLoading: false,
      data: {
        referral_code: "user-abc-123",
        total: 0,
        pending: 0,
        qualified: 0,
        referrals: [],
      },
    });

    render(<ReferralsPage />);

    fireEvent.click(screen.getByLabelText(/Copy referral link/i));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("user-abc-123"),
      );
    });
  });
});
