import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { LoginForm } from "@/components/admin/auth-forms";
import { dbHealth } from "@/server/db/connect";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/admin");
  const sp = await searchParams;
  const health = await dbHealth();
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500">areniX business dashboard</p>
      {!health.ok && (
        <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs">
          Database unreachable. {health.error}. Make sure the MongoDB service is running and MONGODB_URI is correct.
        </p>
      )}
      <div className="mt-6">
        <LoginForm next={sp.next} />
      </div>
    </>
  );
}
