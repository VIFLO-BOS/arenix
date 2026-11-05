import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { CODE_MINUTES, MAX_SENDS, getPendingChallenge, maskEmail, resendWaitSeconds, twoStepMode } from "@/server/auth/two-step";
import { VerifyCodeForm } from "@/components/admin/auth-forms";

export const metadata: Metadata = { title: "Enter your code" };

export default async function VerifyCodePage() {
  if (await getCurrentUser()) redirect("/admin");
  const pending = await getPendingChallenge();
  if (!pending) redirect("/admin/login?notice=expired");
  const { challenge, user } = pending;
  const consoleMode = twoStepMode() === "console";

  return (
    <>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Step 2 of 2</p>
      <h1 className="font-display text-2xl font-semibold">Check your email</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        We sent a six digit code to <strong className="font-semibold text-slate-800">{maskEmail(user.email)}</strong>. Enter it below to finish signing in. It expires in {CODE_MINUTES} minutes.
      </p>
      {consoleMode && (
        <p role="note" className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
          Development mode. Email sending is not configured, so the code is printed in the terminal running <code className="font-mono">npm run dev</code>. Live sites always email it.
        </p>
      )}
      <div className="mt-6">
        <VerifyCodeForm resendWait={resendWaitSeconds(challenge)} canResend={challenge.sends < MAX_SENDS} />
      </div>
    </>
  );
}
