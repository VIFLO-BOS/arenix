"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToLeadsAction, type AddToLeadsState } from "@/app/admin/(dashboard)/leads/research-actions";
import { Submit } from "@/components/admin/action-form";
import { btnSecondary } from "@/components/admin/ui";

/**
 * Add to Leads with the duplicate check. When the business is already in Leads it offers
 * to open that lead or to link this research to it. No second lead is ever created.
 */
export function AddToLeadsButton({ prospectId, leadId, compact }: { prospectId: string; leadId?: string; compact?: boolean }) {
  const [state, action] = useActionState<AddToLeadsState, FormData>(addToLeadsAction, { ok: false });
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  const linked = leadId ?? state.leadId;
  if (linked) {
    return (
      <Link href={`/admin/leads/${linked}`} className={compact ? "text-xs font-medium text-accent-deep hover:underline" : btnSecondary}>
        {compact ? "In Leads" : "Open lead"}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form action={action} className="inline-flex">
        <input type="hidden" name="id" value={prospectId} />
        <input type="hidden" name="mode" value="create" />
        <Submit variant={compact ? "secondary" : "accent"} pendingLabel="Checking" className={compact ? "min-h-8 px-2.5 text-xs" : undefined}>
          Add to Leads
        </Submit>
      </form>
      {state.duplicate ? (
        <div role="alert" className="max-w-xs rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          <p>
            Already in Leads as <strong>{state.duplicate.title}</strong>. {state.duplicate.reason}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={`/admin/leads/${state.duplicate.leadId}`} className="font-medium underline">
              Open existing lead
            </Link>
            <form action={action}>
              <input type="hidden" name="id" value={prospectId} />
              <input type="hidden" name="mode" value="update" />
              <button type="submit" className="font-medium underline">
                Update research on existing lead
              </button>
            </form>
          </div>
        </div>
      ) : (
        state.message &&
        !state.ok && (
          <span role="alert" className="max-w-xs text-[0.7rem] text-danger">
            {state.message}
          </span>
        )
      )}
    </div>
  );
}
