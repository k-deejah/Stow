import { useState, useCallback, useEffect } from "react";
import { apiFetch, ApiError } from "@/lib/api";

export type ReferralStatus = "pending" | "qualified";

export interface ReferralItem {
  id: string;
  referred_id: string;
  referred_username: string | null;
  referred_stellar_address: string;
  status: ReferralStatus;
  created_at: string;
  qualified_at: string | null;
}

export interface MyReferrals {
  referral_code: string;
  total: number;
  pending: number;
  qualified: number;
  referrals: ReferralItem[];
}

export interface UseReferralsReturn {
  data: MyReferrals | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useReferrals(): UseReferralsReturn {
  const [data, setData] = useState<MyReferrals | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReferrals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/users/me/referrals", {
        method: "GET",
      });

      if (!response.ok) {
        let errorMessage = `Failed to load referrals: ${response.statusText}`;
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

      const result: MyReferrals = await response.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred"),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  return {
    data,
    error,
    isLoading,
    refetch: fetchReferrals,
  };
}
