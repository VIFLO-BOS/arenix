import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/session";
import { adminGetContentById, adminGetContentBySlug } from "@/server/services/cms";
import { toPlain } from "@/lib/utils";
import { PageHeader, Card } from "@/components/admin/ui";
import { ArticleForm, CareerForm, FaqForm, ServiceForm, SolutionForm, TechnologyForm, TestimonialForm } from "@/components/admin/content-forms";

const SLUG_KINDS = ["service", "solution", "technology", "article", "career"] as const;
const ID_KINDS = ["testimonial", "faq"] as const;

export default async function EditContentPage({ params }: { params: Promise<{ kind: string; slug: string }> }) {
  await requirePermission("cms:write");
  const { kind, slug } = await params;
  const isSlugKind = (SLUG_KINDS as readonly string[]).includes(kind);
  const isIdKind = (ID_KINDS as readonly string[]).includes(kind);
  if (!isSlugKind && !isIdKind) notFound();

  const raw = isSlugKind ? await adminGetContentBySlug(kind as (typeof SLUG_KINDS)[number], slug) : await adminGetContentById(kind as (typeof ID_KINDS)[number], slug);
  if (!raw) notFound();
  const item = toPlain(raw) as unknown as Record<string, unknown> & { _id: string; title?: string; name?: string; question?: string; author?: string };
  const title = item.title ?? item.name ?? item.question ?? item.author ?? slug;

  return (
    <>
      <PageHeader eyebrow={`Edit ${kind}`} title={String(title)} actions={<Link href={`/admin/content?tab=${kind}`} className="text-xs text-slate-500 hover:text-slate-900">Content</Link>} />
      <Card className="max-w-4xl">
        {kind === "service" && <ServiceForm item={item as never} />}
        {kind === "solution" && <SolutionForm item={item as never} />}
        {kind === "technology" && <TechnologyForm item={item as never} />}
        {kind === "article" && <ArticleForm item={item as never} />}
        {kind === "career" && <CareerForm item={item as never} />}
        {kind === "testimonial" && <TestimonialForm item={item as never} />}
        {kind === "faq" && <FaqForm item={item as never} />}
      </Card>
    </>
  );
}
