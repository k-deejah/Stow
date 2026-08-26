"use client";

import React, { useState } from "react";
import { useAnchorDeposit } from "@/hooks/useAnchorDeposit";
import ErrorRetry from "@/components/ui/ErrorRetry";
import {
  ArrowUpToLine,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";

function openInteractiveWindow(url: string) {
  window.open(
    url,
    "sep24_deposit",
    "width=460,height=720,noopener,noreferrer",
  );
}

export default function DepositPage() {
  const [assetCode, setAssetCode] = useState("USDC");
  const [account, setAccount] = useState("");

  const { session, depositStatus, error, isLoading, initiateDeposit, reset } =
    useAnchorDeposit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.trim()) return;

    await initiateDeposit({ assetCode, account: account.trim() });
  };

  const handleReopen = () => {
    if (session) openInteractiveWindow(session.interactive_url);
  };

  React.useEffect(() => {
    if (depositStatus === "interactive" && session) {
      openInteractiveWindow(session.interactive_url);
    }
  }, [depositStatus, session]);

  const renderStatusIcon = () => {
    switch (depositStatus) {
      case "error":
        return <AlertCircle className="h-12 w-12 text-red-400" />;
      case "requesting":
        return <Loader2 className="h-12 w-12 text-brand animate-spin" />;
      default:
        return <ExternalLink className="h-12 w-12 text-brand" />;
    }
  };

  const getStatusMessage = () => {
    switch (depositStatus) {
      case "requesting":
        return "Requesting deposit session...";
      case "interactive":
        return "Complete your deposit in the window that opened.";
      case "error":
        return "Deposit failed. Please try again.";
      default:
        return "";
    }
  };

  if (error && depositStatus === "error") {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-2xl">
          <ErrorRetry error={error} onRetry={reset} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpToLine className="h-8 w-8 text-brand" />
            <h1 className="text-3xl font-semibold text-foreground">
              Deposit Local Currency
            </h1>
          </div>
          <p className="text-muted">
            Deposit local currency via an anchor service and receive assets
            in your Stellar account.
          </p>
        </div>

        {depositStatus === "idle" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="asset"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Asset
                  </label>
                  <select
                    id="asset"
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
                    disabled={isLoading}
                  >
                    <option value="USDC">USDC</option>
                    <option value="XLM">XLM</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="account"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Stellar Account
                  </label>
                  <input
                    id="account"
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="G..."
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted font-mono focus:outline-none focus:ring-2 focus:ring-brand/50"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !account.trim()}
              className="w-full rounded-xl bg-brand/20 hover:bg-brand/30 border border-brand/40 px-6 py-3 text-sm font-medium text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              {isLoading ? "Processing..." : "Start Deposit"}
            </button>
          </form>
        )}

        {depositStatus !== "idle" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">{renderStatusIcon()}</div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {getStatusMessage()}
                </h2>

                {session && (
                  <div className="mt-4 w-full space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-t border-border">
                      <span className="text-muted">Transaction ID</span>
                      <span className="text-foreground font-mono">
                        {session.transaction_id}
                      </span>
                    </div>
                  </div>
                )}

                {session && depositStatus === "interactive" && (
                  <button
                    onClick={handleReopen}
                    className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-background-elevated hover:bg-background-elevated/70 px-5 py-2.5 text-sm font-medium text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Reopen deposit window
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full rounded-xl border border-border bg-card hover:bg-card/70 px-6 py-3 text-sm font-medium text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              Start New Deposit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
