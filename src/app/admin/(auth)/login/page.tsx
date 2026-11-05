import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { twoStepMode } from "@/server/auth/two-step";
import { LoginForm } from "@/components/admin/auth-forms";
import { dbHealth } from "@/server/db/connect";

/** Fixed messages only. The query carries a reason code, never text, so links cannot inject wording. */
const NOTICES: Record<string, string> = {
  expired: "Your sign in expired before the code was entered. Please sign in again.",
  blocked: "That sign in was cancelled after too many incorrect codes. The account owner has been alerted by email.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/admin");
  const sp = await searchParams;
  const health = await dbHealth();
  const twoStep = twoStepMode() !== "off";
  const notice = sp.notice ? NOTICES[sp.notice] : undefined;
  return (
    <>
      {twoStep && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Step 1 of 2</p>}
      <h1 className="font-display text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500">areniX business dashboard</p>
      {notice && (
        <p role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {notice}
        </p>
      )}
      {!health.ok && (
        <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs">
          Database unreachable. {health.error}. Make sure the MongoDB service is running and MONGODB_URI is correct.
        </p>
      )}
      <div className="mt-6">
        <LoginForm next={sp.next} />
      </div>
      {twoStep && (
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-px size-4 shrink-0 text-slate-400" fill="currentColor">
            <path fillRule="evenodd" d="M10 1.5 3 4.5v4.8c0 4.3 2.9 8.2 7 9.2 4.1-1 7-4.9 7-9.2V4.5l-7-3Zm3.2 6.3a.75.75 0 1 0-1.1-1l-3.1 3.4-1.2-1.2a.75.75 0 0 0-1.1 1l1.8 1.8c.3.3.8.3 1.1 0l3.6-4Z" clipRule="evenodd" />
          </svg>
          <span>After your password we email a six digit code to confirm it is you. Codes expire after 10 minutes.</span>
        </p>
      )}
    </>
  );
}
