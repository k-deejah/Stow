import { useState, useCallback } from "react";
import { apiFetch, ApiError } from "@/lib/api";

export type DepositStatus =
  | "idle"
  | "requesting"
  | "interactive"
  | "error";

export interface DepositSession {
  deposit_id: string;
  transaction_id: string;
  interactive_url: string;
}

export interface InitiateDepositParams {
  assetCode: string;
  account: string;
}

export interface UseAnchorDepositReturn {
  session: DepositSession | null;
  depositStatus: DepositStatus;
  error: Error | null;
  isLoading: boolean;
  initiateDeposit: (params: InitiateDepositParams) => Promise<void>;
  reset: () => void;
}

export function useAnchorDeposit(): UseAnchorDepositReturn {
  const [session, setSession] = useState<DepositSession | null>(null);
  const [depositStatus, setDepositStatus] = useState<DepositStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const initiateDeposit = useCallback(
    async (params: InitiateDepositParams) => {
      setIsLoading(true);
      setError(null);
      setDepositStatus("requesting");

      try {
        const response = await apiFetch("/api/savings/anchor/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset_code: params.assetCode,
            account: params.account,
          }),
        });

        if (!response.ok) {
          let errorMessage = `Failed to initiate deposit: ${response.statusText}`;
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // Response body is not JSON, use default message
          }
          throw new ApiError(errorMessage, response.status);
        }

        const data: DepositSession = await response.json();
        setSession(data);
        setDepositStatus("interactive");
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Unknown error occurred"),
        );
        setDepositStatus("error");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setSession(null);
    setDepositStatus("idle");
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    session,
    depositStatus,
    error,
    isLoading,
    initiateDeposit,
    reset,
  };
}
