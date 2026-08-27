"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import GroupForm from "@/components/savings/GroupForm";

export default function NewGroupPage() {
  const router = useRouter();

  const handleCreated = (groupId: string) => {
    router.push(`/savings/groups/${groupId}`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-brand" />
            <h1 className="text-3xl font-semibold text-foreground">
              Create a Group
            </h1>
          </div>
          <p className="text-muted">
            Start a group savings pool that you and others can contribute to
            together.
          </p>
        </div>

        <GroupForm onCreated={handleCreated} />
      </div>
    </div>
  );
}
