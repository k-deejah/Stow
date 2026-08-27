import { useState, useCallback } from "react";
import { apiFetch, ApiError } from "@/lib/api";

export type CreateGroupStatus = "idle" | "submitting" | "error";

export interface CreatedGroup {
  on_chain_id: string;
  name: string;
}

export interface UseCreateGroupReturn {
  status: CreateGroupStatus;
  error: Error | null;
  isLoading: boolean;
  createGroup: (name: string) => Promise<CreatedGroup | null>;
  reset: () => void;
}

export function useCreateGroup(): UseCreateGroupReturn {
  const [status, setStatus] = useState<CreateGroupStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const createGroup = useCallback(
    async (name: string): Promise<CreatedGroup | null> => {
      setStatus("submitting");
      setError(null);

      try {
        const response = await apiFetch("/api/savings/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });

        if (!response.ok) {
          let errorMessage = `Failed to create group: ${response.statusText}`;
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

        const data: CreatedGroup = await response.json();
        setStatus("idle");
        return data;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Unknown error occurred"),
        );
        setStatus("error");
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    status,
    error,
    isLoading: status === "submitting",
    createGroup,
    reset,
  };
}
