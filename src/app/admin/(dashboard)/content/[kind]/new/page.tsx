import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/session";
import { PageHeader, Card } from "@/components/admin/ui";
import { ArticleForm, CareerForm, ServiceForm, SolutionForm, TechnologyForm } from "@/components/admin/content-forms";

const KINDS = { service: "service", solution: "solution", technology: "technology", article: "article", career: "career opening" } as const;

export default async function NewContentPage({ params }: { params: Promise<{ kind: string }> }) {
  await requirePermission("cms:write");
  const { kind } = await params;
  if (!(kind in KINDS)) notFound();
  const k = kind as keyof typeof KINDS;
  return (
    <>
      <PageHeader title={`New ${KINDS[k]}`} actions={<Link href={`/admin/content?tab=${k}`} className="text-xs text-muted hover:text-on-dark">Content</Link>} />
      <Card className="max-w-4xl">
        {k === "service" && <ServiceForm />}
        {k === "solution" && <SolutionForm />}
        {k === "technology" && <TechnologyForm />}
        {k === "article" && <ArticleForm />}
        {k === "career" && <CareerForm />}
      </Card>
    </>
  );
}
