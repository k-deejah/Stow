import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DepositPage from "./page";
import * as useAnchorDepositHook from "@/hooks/useAnchorDeposit";

jest.mock("@/hooks/useAnchorDeposit");

const mockUseAnchorDeposit =
  useAnchorDepositHook.useAnchorDeposit as jest.MockedFunction<
    typeof useAnchorDepositHook.useAnchorDeposit
  >;

const defaultHookReturn = {
  session: null,
  depositStatus: "idle" as const,
  error: null,
  isLoading: false,
  initiateDeposit: jest.fn(),
  reset: jest.fn(),
};

describe("DepositPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnchorDeposit.mockReturnValue(defaultHookReturn);
    window.open = jest.fn();
  });

  it("renders the deposit form in idle state", () => {
    render(<DepositPage />);

    expect(screen.getByText("Deposit Local Currency")).toBeInTheDocument();
    expect(screen.getByLabelText(/Asset/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Stellar Account/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Start Deposit/i }),
    ).toBeInTheDocument();
  });

  it("calls initiateDeposit on form submission", async () => {
    const initiateDeposit = jest.fn();
    mockUseAnchorDeposit.mockReturnValue({
      ...defaultHookReturn,
      initiateDeposit,
    });

    render(<DepositPage />);

    const accountInput = screen.getByLabelText(/Stellar Account/i);
    const assetSelect = screen.getByLabelText(/Asset/i);
    const submitButton = screen.getByRole("button", { name: /Start Deposit/i });

    fireEvent.change(assetSelect, { target: { value: "USDC" } });
    fireEvent.change(accountInput, { target: { value: "GTEST123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(initiateDeposit).toHaveBeenCalledWith({
        assetCode: "USDC",
        account: "GTEST123",
      });
    });
  });

  it("disables submit button when account is empty", () => {
    render(<DepositPage />);

    const submitButton = screen.getByRole("button", { name: /Start Deposit/i });

    expect(submitButton).toBeDisabled();
  });

  it("opens the interactive window when a session is returned", () => {
    mockUseAnchorDeposit.mockReturnValue({
      ...defaultHookReturn,
      depositStatus: "interactive",
      session: {
        deposit_id: "deposit-123",
        transaction_id: "tx-123",
        interactive_url: "https://anchor.example.com/sep24/interactive",
      },
    });

    render(<DepositPage />);

    expect(window.open).toHaveBeenCalledWith(
      "https://anchor.example.com/sep24/interactive",
      "sep24_deposit",
      expect.stringContaining("noopener"),
    );
    expect(
      screen.getByText(/Complete your deposit in the window/i),
    ).toBeInTheDocument();
    expect(screen.getByText("tx-123")).toBeInTheDocument();
  });

  it("allows reopening the interactive window", () => {
    mockUseAnchorDeposit.mockReturnValue({
      ...defaultHookReturn,
      depositStatus: "interactive",
      session: {
        deposit_id: "deposit-123",
        transaction_id: "tx-123",
        interactive_url: "https://anchor.example.com/sep24/interactive",
      },
    });

    render(<DepositPage />);
    (window.open as jest.Mock).mockClear();

    fireEvent.click(
      screen.getByRole("button", { name: /Reopen deposit window/i }),
    );

    expect(window.open).toHaveBeenCalledWith(
      "https://anchor.example.com/sep24/interactive",
      "sep24_deposit",
      expect.stringContaining("noopener"),
    );
  });

  it("shows error state when deposit fails", () => {
    const error = new Error("Deposit failed");
    mockUseAnchorDeposit.mockReturnValue({
      ...defaultHookReturn,
      depositStatus: "error",
      error,
    });

    render(<DepositPage />);

    expect(screen.getByText(/retry/i)).toBeInTheDocument();
  });

  it("calls reset when starting a new deposit", () => {
    const reset = jest.fn();
    mockUseAnchorDeposit.mockReturnValue({
      ...defaultHookReturn,
      depositStatus: "interactive",
      session: {
        deposit_id: "deposit-123",
        transaction_id: "tx-123",
        interactive_url: "https://anchor.example.com/sep24/interactive",
      },
      reset,
    });

    render(<DepositPage />);

    fireEvent.click(screen.getByRole("button", { name: /Start New Deposit/i }));

    expect(reset).toHaveBeenCalled();
  });
});
