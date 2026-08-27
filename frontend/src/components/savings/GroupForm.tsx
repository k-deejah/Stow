"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useCreateGroup } from "@/hooks/useCreateGroup";

export interface GroupFormProps {
  /** Called with the newly created group's on-chain id once creation succeeds. */
  onCreated: (groupId: string) => void;
}

export default function GroupForm({ onCreated }: GroupFormProps) {
  const [name, setName] = useState("");
  const { status, error, isLoading, createGroup } = useCreateGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const group = await createGroup(trimmed);
    if (group) {
      onCreated(group.on_chain_id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <label
          htmlFor="group-name"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Group name
        </label>
        <input
          id="group-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rent Split"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
          disabled={isLoading}
          required
        />
      </div>

      {status === "error" && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error?.message ?? "Failed to create group. Please try again."}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !name.trim()}
        className="w-full rounded-xl bg-brand/20 hover:bg-brand/30 border border-brand/40 px-6 py-3 text-sm font-medium text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand/50"
      >
        {isLoading ? "Creating..." : "Create group"}
      </button>
    </form>
  );
}
